// agents/orchestrator.js
// Core agent routing and chaining for A2A protocol.
// Maps agent capabilities to actual executor functions and supports multi-agent chains.
// Production-grade: per-task timeouts, step logging, input validation, concurrency limits.

import { createTask, updateTask, getTask } from './a2a-task-manager.js'
import { chat, scanCode } from './builder-copilot.js'
import { assessRisk } from './risk-scoring.js'
import { monitorAddress } from './anomaly-monitor.js'
import { scanForGaps, parseRegulation } from './regulatory-radar.js'
import { agentLog } from './agent-runner.js'

// ── Configuration ────────────────────────────────────────────────────────────
const TASK_TIMEOUT_MS = 60_000 // 60s per individual task
const CHAIN_TIMEOUT_MS = 300_000 // 5 min max per chain
const MAX_CONCURRENT_TASKS = 5 // Prevent API overload
let activeTasks = 0

/**
 * Dispatch table: maps agentId + capability to executor functions.
 * Each executor receives (input, appContext) and returns a result object.
 */
const AGENT_EXECUTORS = {
  'builder-copilot': {
    'chat': async (input, ctx) => {
      const result = await chat(input.message, input.history || [], input.context || null, ctx)
      return { response: result.response }
    },
    'code-scan': async (input) => {
      return await scanCode(input.code, input.language || 'cadence', input.context || '')
    },
  },
  'risk-scoring': {
    'assess-risk': async (input, ctx) => {
      return await assessRisk(input.address, ctx.fcl)
    },
  },
  'anomaly-monitor': {
    'monitor-address': async (input, ctx) => {
      return await monitorAddress(input.address, ctx.fcl)
    },
  },
  'regulatory-radar': {
    'scan-gaps': async (input, ctx) => {
      return await scanForGaps(ctx.fcl, ctx.contractAddress)
    },
    'parse-regulation': async (input) => {
      return await parseRegulation(input.text, input.jurisdiction)
    },
  },
}

/**
 * Run a function with a timeout.
 */
function withTimeout(fn, ms, label) {
  return Promise.race([
    fn(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ])
}

/**
 * Execute a single agent task by ID.
 * Transitions task: submitted → working → completed/failed
 * @param {string} taskId
 * @param {{ fcl: object, contractAddress: string }} appContext
 * @returns {object} The completed/failed task
 */
export async function executeTask(taskId, appContext) {
  const task = getTask(taskId)
  if (!task) throw new Error(`Task ${taskId} not found`)

  // Validate appContext
  if (!appContext || !appContext.fcl) {
    agentLog('warn', 'Orchestrator', 'Missing appContext.fcl — on-chain operations will fail', { taskId })
  }

  const executor = AGENT_EXECUTORS[task.agentId]?.[task.capability]
  if (!executor) {
    const error = `No executor for ${task.agentId}/${task.capability}`
    agentLog('error', 'Orchestrator', error, { taskId, agentId: task.agentId, capability: task.capability })
    updateTask(taskId, { status: 'failed', error })
    return getTask(taskId)
  }

  // Concurrency check
  if (activeTasks >= MAX_CONCURRENT_TASKS) {
    const error = `Concurrency limit reached (${MAX_CONCURRENT_TASKS} tasks active)`
    agentLog('warn', 'Orchestrator', error, { taskId, activeTasks })
    updateTask(taskId, { status: 'failed', error })
    return getTask(taskId)
  }

  updateTask(taskId, { status: 'working' })
  activeTasks++
  const startTime = Date.now()

  agentLog('info', 'Orchestrator', 'Task started', {
    taskId, agentId: task.agentId, capability: task.capability,
  })

  try {
    const output = await withTimeout(
      () => executor(task.input, appContext),
      TASK_TIMEOUT_MS,
      `${task.agentId}/${task.capability}`
    )
    const durationMs = Date.now() - startTime
    updateTask(taskId, { status: 'completed', output })
    agentLog('info', 'Orchestrator', 'Task completed', {
      taskId, agentId: task.agentId, capability: task.capability, durationMs,
    })
  } catch (err) {
    const durationMs = Date.now() - startTime
    updateTask(taskId, { status: 'failed', error: err.message })
    agentLog('error', 'Orchestrator', 'Task failed', {
      taskId, agentId: task.agentId, capability: task.capability,
      error: err.message, durationMs,
    })
  } finally {
    activeTasks--
  }

  return getTask(taskId)
}

/**
 * Execute a sequential chain of agent tasks.
 * Each step's output is merged into the next step's input.
 * @param {Array<{ agentId: string, capability: string, inputMapping?: function }>} steps
 * @param {object} initialInput - Starting input for the first step
 * @param {{ fcl: object, contractAddress: string }} appContext
 * @returns {{ tasks: object[], finalOutput: any }}
 */
export async function executeChain(steps, initialInput, appContext) {
  if (!Array.isArray(steps) || steps.length === 0) {
    return { tasks: [], finalOutput: null, error: 'No steps provided' }
  }

  const chainDeadline = Date.now() + CHAIN_TIMEOUT_MS
  const completedTasks = []
  let currentInput = { ...initialInput }

  agentLog('info', 'Orchestrator', 'Chain started', {
    stepCount: steps.length,
    steps: steps.map(s => `${s.agentId}/${s.capability}`),
  })

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]

    // Check chain deadline
    if (Date.now() > chainDeadline) {
      const error = `Chain deadline exceeded at step ${i + 1}/${steps.length} (${step.agentId}/${step.capability})`
      agentLog('warn', 'Orchestrator', error, { completedSteps: i })
      return { tasks: completedTasks, finalOutput: null, error }
    }

    // Map input from previous output
    let stepInput
    try {
      stepInput = step.inputMapping ? step.inputMapping(currentInput) : currentInput
    } catch (err) {
      const error = `Input mapping failed at step ${i + 1}: ${err.message}`
      agentLog('error', 'Orchestrator', error, { step: `${step.agentId}/${step.capability}` })
      return { tasks: completedTasks, finalOutput: null, error }
    }

    const task = createTask({
      agentId: step.agentId,
      capability: step.capability,
      input: stepInput,
      parentTaskId: completedTasks.length > 0 ? completedTasks[completedTasks.length - 1].id : null,
    })

    agentLog('info', 'Orchestrator', `Chain step ${i + 1}/${steps.length}`, {
      agentId: step.agentId, capability: step.capability, taskId: task.id,
    })

    const result = await executeTask(task.id, appContext)
    completedTasks.push(result)

    if (result.status === 'failed') {
      const error = `Chain failed at step ${i + 1}/${steps.length}: ${step.agentId}/${step.capability} — ${result.error}`
      agentLog('error', 'Orchestrator', error)
      return { tasks: completedTasks, finalOutput: null, error }
    }

    // Merge output into current input for next step
    currentInput = { ...currentInput, ...result.output, _previousStep: step.capability }
  }

  agentLog('info', 'Orchestrator', 'Chain completed', {
    stepCount: steps.length, completedSteps: completedTasks.length,
  })

  return {
    tasks: completedTasks,
    finalOutput: completedTasks[completedTasks.length - 1]?.output || null,
  }
}

/**
 * Predefined multi-agent chains.
 */
export const PREDEFINED_CHAINS = {
  'full-risk-review': {
    id: 'full-risk-review',
    name: 'Full Risk Review',
    description: 'Comprehensive risk assessment: risk scoring -> anomaly monitoring -> copilot summary. Provides a complete risk picture for any Flow address.',
    requiredParams: ['address'],
    steps: [
      {
        agentId: 'risk-scoring',
        capability: 'assess-risk',
        inputMapping: (input) => ({ address: input.address }),
      },
      {
        agentId: 'anomaly-monitor',
        capability: 'monitor-address',
        inputMapping: (input) => ({ address: input.address }),
      },
      {
        agentId: 'builder-copilot',
        capability: 'chat',
        inputMapping: (input) => ({
          message: `Summarize the risk assessment for address ${input.address}:\n\nRisk Score: ${input.score}/100 (${input.tier})\nActive factors: ${(input.factors || []).map(f => f.label).join(', ') || 'none'}\nAnomalies: ${input.anomalyCount || 0} (${input.summary || 'none detected'})\nAnalysis source: ${input.analysisSource || 'deterministic'}\n${input.agentReasoning ? `Agent reasoning: ${input.agentReasoning}` : ''}\n\nProvide a concise risk summary and recommendations.`,
        }),
      },
    ],
  },

  'compliance-review': {
    id: 'compliance-review',
    name: 'Compliance Review',
    description: 'Regulatory compliance scan -> copilot remediation advice. Identifies compliance gaps across all jurisdictions and provides actionable remediation steps.',
    requiredParams: [],
    steps: [
      {
        agentId: 'regulatory-radar',
        capability: 'scan-gaps',
        inputMapping: () => ({}),
      },
      {
        agentId: 'builder-copilot',
        capability: 'chat',
        inputMapping: (input) => ({
          message: `Based on the regulatory scan results:\n\nCompliant jurisdictions: ${(input.compliantJurisdictions || []).join(', ') || 'none'}\nGaps found: ${(input.gaps || []).length}\n${(input.gaps || []).map(g => `- [${g.severity}] ${g.title}: ${g.summary}`).join('\n')}\nSource: ${input.source || 'checklist'}\n\nProvide specific remediation steps for each gap, prioritized by severity.`,
        }),
      },
    ],
  },

  'full-compliance-review': {
    id: 'full-compliance-review',
    name: 'Full Compliance Review',
    description: 'Complete review: risk scoring -> anomaly monitoring -> regulatory scan -> copilot synthesis. Chains all agents for a comprehensive compliance report on a wallet.',
    requiredParams: ['address'],
    steps: [
      {
        agentId: 'risk-scoring',
        capability: 'assess-risk',
        inputMapping: (input) => ({ address: input.address }),
      },
      {
        agentId: 'anomaly-monitor',
        capability: 'monitor-address',
        inputMapping: (input) => ({ address: input.address }),
      },
      {
        agentId: 'regulatory-radar',
        capability: 'scan-gaps',
        inputMapping: () => ({}),
      },
      {
        agentId: 'builder-copilot',
        capability: 'chat',
        inputMapping: (input) => ({
          message: `Provide a comprehensive compliance report for address ${input.address}:\n\n**Risk Assessment:**\nScore: ${input.score}/100 (${input.tier})\nFactors: ${(input.factors || []).map(f => f.label).join(', ') || 'none'}\n${input.agentReasoning ? `Analysis: ${input.agentReasoning}` : ''}\n\n**Anomaly Detection:**\nAnomalies: ${input.anomalyCount || 0} (severity: ${input.highestSeverity || 'none'})\nAction: ${input.recommendedAction || 'none'}\n${input.summary || ''}\n\n**Regulatory Compliance:**\nCompliant: ${(input.compliantJurisdictions || []).join(', ') || 'none'}\nGaps: ${(input.gaps || []).length}\n${(input.gaps || []).map(g => `- [${g.severity}] ${g.title}`).join('\n')}\n\nSynthesize all findings into a clear executive summary with prioritized action items.`,
        }),
      },
    ],
  },
}

/**
 * Get all available predefined chains.
 */
export function getAvailableChains() {
  return Object.values(PREDEFINED_CHAINS).map(c => ({
    id: c.id,
    name: c.name,
    description: c.description,
    requiredParams: c.requiredParams,
  }))
}

export { AGENT_EXECUTORS }
