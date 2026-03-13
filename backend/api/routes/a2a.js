/**
 * @file A2A Protocol Routes
 * @module routes/a2a
 * @description Agent-to-Agent protocol REST endpoints.
 *              Handles discovery (/.well-known/agent.json), agent card listing,
 *              task submission, and multi-agent chain execution.
 */

import { Router } from 'express'
import { getAllAgentCards, getAgentCard, buildDiscoveryDocument } from '../../agents/agent-cards.js'
import { createTask, getTask } from '../../agents/a2a-task-manager.js'
import { executeTask, executeChain, PREDEFINED_CHAINS, getAvailableChains } from '../../agents/orchestrator.js'
import { safeError } from '../../lib/middleware.js'

const router = Router()

/**
 * Well-known A2A discovery endpoint handler.
 * Mounted at /.well-known/agent.json in server.js (outside /api prefix).
 */
export function wellKnownHandler(req, res) {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https'
  const host = req.headers['x-forwarded-host'] || req.headers.host
  const baseUrl = `${protocol}://${host}`
  res.json(buildDiscoveryDocument(baseUrl))
}

// GET /api/a2a/agents — list all agent cards
router.get('/agents', (_req, res) => {
  res.json({ agents: getAllAgentCards() })
})

// GET /api/a2a/agents/:id — get single agent card
router.get('/agents/:id', (req, res) => {
  const card = getAgentCard(req.params.id)
  if (!card) return res.status(404).json({ error: `Agent '${req.params.id}' not found` })
  res.json(card)
})

// POST /api/a2a/tasks — submit a task to a specific agent
router.post('/tasks', async (req, res) => {
  const { agentId, capability, input } = req.body

  if (!agentId || !capability) {
    return res.status(400).json({ error: 'agentId and capability are required' })
  }

  // Validate agent exists and supports the capability
  const card = getAgentCard(agentId)
  if (!card) {
    return res.status(404).json({ error: `Agent '${agentId}' not found` })
  }
  if (!card.capabilities.includes(capability)) {
    return res.status(400).json({
      error: `Agent '${agentId}' does not support capability '${capability}'`,
      supportedCapabilities: card.capabilities,
    })
  }

  try {
    const task = createTask({ agentId, capability, input: input || {} })

    // Execute task asynchronously but wait for result
    const appContext = {
      fcl: req.app.locals.fcl,
      contractAddress: req.app.locals.contractAddress,
    }
    const result = await executeTask(task.id, appContext)

    res.json({
      task: {
        id: result.id,
        agentId: result.agentId,
        capability: result.capability,
        status: result.status,
        output: result.output,
        error: result.error,
        createdAt: result.createdAt,
        completedAt: result.completedAt,
      },
    })
  } catch (err) {
    res.status(500).json({ error: safeError(err, 'Task execution failed') })
  }
})

// GET /api/a2a/tasks/:id — get task status/result
router.get('/tasks/:id', (req, res) => {
  const task = getTask(req.params.id)
  if (!task) return res.status(404).json({ error: 'Task not found' })
  res.json({
    task: {
      id: task.id,
      agentId: task.agentId,
      capability: task.capability,
      status: task.status,
      output: task.output,
      error: task.error,
      createdAt: task.createdAt,
      completedAt: task.completedAt,
    },
  })
})

// GET /api/a2a/chains — list available predefined chains
router.get('/chains', (_req, res) => {
  res.json({ chains: getAvailableChains() })
})

// POST /api/a2a/chains — execute a predefined or custom chain
router.post('/chains', async (req, res) => {
  const { chainId, params, steps: customSteps } = req.body

  const appContext = {
    fcl: req.app.locals.fcl,
    contractAddress: req.app.locals.contractAddress,
  }

  try {
    let steps, initialInput

    if (chainId) {
      // Predefined chain
      const chain = PREDEFINED_CHAINS[chainId]
      if (!chain) {
        return res.status(404).json({ error: `Chain '${chainId}' not found`, available: Object.keys(PREDEFINED_CHAINS) })
      }

      // Validate required params
      for (const param of chain.requiredParams) {
        if (!params?.[param]) {
          return res.status(400).json({ error: `Missing required parameter: ${param}`, requiredParams: chain.requiredParams })
        }
      }

      steps = chain.steps
      initialInput = params || {}
    } else if (customSteps && Array.isArray(customSteps)) {
      // Custom chain: validate each step
      for (const step of customSteps) {
        if (!step.agentId || !step.capability) {
          return res.status(400).json({ error: 'Each step requires agentId and capability' })
        }
        const card = getAgentCard(step.agentId)
        if (!card) {
          return res.status(400).json({ error: `Agent '${step.agentId}' not found` })
        }
        if (!card.capabilities.includes(step.capability)) {
          return res.status(400).json({ error: `Agent '${step.agentId}' does not support '${step.capability}'` })
        }
      }
      steps = customSteps
      initialInput = params || {}
    } else {
      return res.status(400).json({ error: 'Either chainId or steps[] is required' })
    }

    const result = await executeChain(steps, initialInput, appContext)

    res.json({
      chainId: chainId || 'custom',
      status: result.error ? 'failed' : 'completed',
      error: result.error || null,
      steps: result.tasks.map(t => ({
        id: t.id,
        agentId: t.agentId,
        capability: t.capability,
        status: t.status,
        output: t.output,
        error: t.error,
      })),
      finalOutput: result.finalOutput,
    })
  } catch (err) {
    res.status(500).json({ error: safeError(err, 'Chain execution failed') })
  }
})

export default router
