// routes/copilot.js
// Builder Copilot + Regulatory Radar API routes.

import { Router } from 'express'
import { chat } from '../../agents/builder-copilot.js'
import { simulateRegulatoryChange, getScenarios, parseRegulation } from '../../agents/regulatory-radar.js'

const router = Router()

// In-memory session store (production: use Redis)
const sessions = new Map()

// POST /api/copilot/chat — Send message to Builder Copilot
router.post('/chat', async (req, res) => {
  const { message, sessionId = 'default' } = req.body
  if (!message) {
    return res.status(400).json({ error: 'message is required' })
  }

  try {
    const history = sessions.get(sessionId) || []
    const result = await chat(message, history)
    sessions.set(sessionId, result.conversationHistory)

    res.json({
      response: result.response,
      sessionId,
      messageCount: result.conversationHistory.length,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/radar/simulate — Trigger a regulatory change demo scenario
router.post('/radar/simulate', (req, res) => {
  const { scenario } = req.body
  if (!scenario) {
    return res.status(400).json({
      error: 'scenario is required',
      availableScenarios: getScenarios(),
    })
  }

  const result = simulateRegulatoryChange(scenario)
  if (result.error) {
    return res.status(400).json(result)
  }

  res.json(result)
})

// GET /api/radar/scenarios — List available demo scenarios
router.get('/radar/scenarios', (req, res) => {
  res.json({ scenarios: getScenarios() })
})

// POST /api/radar/parse — Parse custom regulatory text (uses Claude if available)
router.post('/radar/parse', async (req, res) => {
  const { text, jurisdiction } = req.body
  if (!text || !jurisdiction) {
    return res.status(400).json({ error: 'text and jurisdiction are required' })
  }

  try {
    const result = await parseRegulation(text, jurisdiction)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
