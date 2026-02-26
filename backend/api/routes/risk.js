// routes/risk.js
// Risk scoring API routes — connects to risk-scoring agent + Flow testnet.

import { Router } from 'express'
import { assessRisk, RISK_FACTORS } from '../../agents/risk-scoring.js'
import { monitorAddress } from '../../agents/anomaly-monitor.js'

const router = Router()

// POST /api/risk/score — Calculate risk score for a wallet address
router.post('/score', async (req, res) => {
  const { address } = req.body
  if (!address) {
    return res.status(400).json({ error: 'address is required' })
  }

  try {
    const fcl = req.app.locals.fcl
    const result = await assessRisk(address, fcl)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/risk/factors — Return all risk factors and weights
router.get('/factors', (req, res) => {
  res.json({
    factors: RISK_FACTORS.map(({ id, label, points }) => ({ id, label, points })),
    tiers: [
      { name: 'compliant', range: '0-30', description: 'Low risk, full access' },
      { name: 'semi-compliant', range: '31-70', description: 'Medium risk, restricted access' },
      { name: 'non-compliant', range: '71-100', description: 'High risk, blocked' },
    ],
  })
})

// POST /api/risk/monitor — Run anomaly detection on an address
router.post('/monitor', async (req, res) => {
  const { address } = req.body
  if (!address) {
    return res.status(400).json({ error: 'address is required' })
  }

  try {
    const fcl = req.app.locals.fcl
    const result = await monitorAddress(address, fcl)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
