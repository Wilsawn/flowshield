// agents/orchestrator.js
// Core agent routing and chaining for A2A protocol.
// Maps agent capabilities to actual executor functions and supports multi-agent chains.

import { createTask, updateTask, getTask } from './a2a-task-manager.js'
import { chat, scanCode } from './builder-copilot.js'
import { assessRisk } from './risk-scoring.js'
import { monitorAddress } from './anomaly-monitor.js'
import { scanForGaps, parseRegulation } from './regulatory-radar.js'

/**
 * Dispatch table: maps agentId + capability to executor functions.
 * Each executor receives (input, appContext) and returns a result object.
 */
const AGENT_EXECUTORS = {
  'builder-copilot': {
    'chat': async (input, ctx) => {
      const result = await chat(input.message, input.history || [], input.context || null)
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
 * Execute a single agent task by ID.
 * Transitions task: submitted → working → completed/failed
 * @param {string} taskId
 * @param {{ fcl: object, contractAddress: string }} appContext
 * @returns {object} The completed/failed task
 */
export async function executeTask(taskId, appContext) {
  const task = getTask(taskId)
  if (!task) throw new Error(`Task ${taskId} not found`)

  const executor = AGENT_EXECUTORS[task.agentId]?.[task.capability]
  if (!executor) {
    updateTask(taskId, { status: 'failed', error: `No executor for ${task.agentId}/${task.capability}` })
    return getTask(taskId)
  }

  updateTask(taskId, { status: 'working' })

  try {
    const output = await executor(task.input, appContext)
    updateTask(taskId, { status: 'completed', output })
  } catch (err) {
    updateTask(taskId, { status: 'failed', error: err.message })
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
  const completedTasks = []
  let currentInput = { ...initialInput }

  for (const step of steps) {
    // Map input from previous output if a mapping function is provided
    const stepInput = step.inputMapping
      ? step.inputMapping(currentInput)
      : currentInput

    const task = createTask({
      agentId: step.agentId,
      capability: step.capability,
      input: stepInput,
      parentTaskId: completedTasks.length > 0 ? completedTasks[completedTasks.length - 1].id : null,
    })

    const result = await executeTask(task.id, appContext)
    completedTasks.push(result)

    if (result.status === 'failed') {
      return { tasks: completedTasks, finalOutput: null, error: `Chain failed at step: ${step.agentId}/${step.capability} — ${result.error}` }
    }

    // Merge output into current input for next step
    currentInput = { ...currentInput, ...result.output, _previousStep: step.capability }
  }

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
    description: 'Comprehensive risk assessment: risk scoring → anomaly monitoring → copilot summary. Provides a complete risk picture for any Flow address.',
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
          message: `Summarize the risk assessment for address ${input.address}:\n\nRisk Score: ${input.score}/100 (${input.tier})\nActive factors: ${(input.factors || []).map(f => f.label).join(', ') || 'none'}\nAnomalies: ${input.anomalyCount || 0} (${input.summary || 'none detected'})\n\nProvide a concise risk summary and recommendations.`,
        }),
      },
    ],
  },

  'compliance-review': {
    id: 'compliance-review',
    name: 'Compliance Review',
    description: 'Regulatory compliance scan → copilot remediation advice. Identifies compliance gaps across all jurisdictions and provides actionable remediation steps.',
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
          message: `Based on the regulatory scan results:\n\nCompliant jurisdictions: ${(input.compliantJurisdictions || []).join(', ') || 'none'}\nGaps found: ${(input.gaps || []).length}\n${(input.gaps || []).map(g => `- ${g.title}: ${g.summary}`).join('\n')}\n\nProvide specific remediation steps for each gap, prioritized by severity.`,
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
