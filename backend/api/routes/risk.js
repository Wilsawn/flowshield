// routes/risk.js
// Risk scoring API routes — connects to risk-scoring agent + Flow testnet.

import { Router } from 'express'
import { assessRisk, RISK_FACTORS } from '../../agents/risk-scoring.js'
import { monitorAddress } from '../../agents/anomaly-monitor.js'
import { logAudit, storeScanResult, fireWebhooks } from '../../lib/supabase.js'
import { getDemoThreats, isDemoActive, activateDemo, clearDemo } from '../../lib/demo-state.js'
import { safeError } from '../../lib/middleware.js'

const router = Router()

// POST /api/risk/score — Calculate risk score for a wallet address
// When demo mode is active, overlays demo risk factors on top of the real score.
router.post('/score', async (req, res) => {
  const { address } = req.body
  if (!address) {
    return res.status(400).json({ error: 'address is required' })
  }

  try {
    const fcl = req.app.locals.fcl
    const result = await assessRisk(address, fcl)

    // Overlay demo risk factors when demo mode is active
    const demoThreats = getDemoThreats()
    if (demoThreats && demoThreats.length > 0) {
      const DEMO_RISK_MAP = {
        whale_transfer: { id: 'rapid_in_out', label: 'Rapid in-out pattern — whale transfer of 2.4M FLOW from unverified wallet', points: 25 },
        rapid_movement: { id: 'rapid_in_out_layering', label: 'Fund layering — moved through 4 wallets in 12 minutes', points: 20 },
        automated_pattern: { id: 'high_volume_24h', label: 'High tx volume in 24h — 847 transactions from single account (bot)', points: 20 },
        gas_manipulation: { id: 'flagged_contract', label: 'MEV extraction pattern — escalating gas bids detected', points: 30 },
        dormant_activation: { id: 'dormancy_spike', label: 'Dormant then suddenly active — 340-day dormant wallet moved 45K FLOW', points: 12 },
      }
      const demoFactors = demoThreats
        .map(t => DEMO_RISK_MAP[t.id])
        .filter(Boolean)
      const allFactors = [...(result.factors || []), ...demoFactors]
      const demoScore = Math.min(100, (result.score || 0) + demoFactors.reduce((sum, f) => sum + f.points, 0))
      const demoTier = demoScore <= 30 ? 'compliant' : demoScore <= 70 ? 'semi-compliant' : 'non-compliant'

      return res.json({
        ...result,
        score: demoScore,
        tier: demoTier,
        factors: allFactors,
        demoMode: true,
      })
    }

    res.json(result)
  } catch (err) {
    res.status(500).json({ error: safeError(err, 'Risk scoring failed') })
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

    // Log to Supabase (non-blocking)
    logAudit({
      action: 'monitor',
      agent: 'anomaly-monitor',
      detail: { address, anomalyCount: result.anomalyCount, severity: result.highestSeverity },
      severity: result.anomalyCount > 0 ? 'warning' : 'info',
    })
    storeScanResult({
      scanType: 'monitor',
      result,
      anomalyCount: result.anomalyCount,
      source: result.analysisSource,
    })
    if (result.anomalyCount > 0) {
      fireWebhooks('anomaly', { address, anomalies: result.anomalies, severity: result.highestSeverity })
    }

    res.json(result)
  } catch (err) {
    res.status(500).json({ error: safeError(err, 'Anomaly monitoring failed') })
  }
})

// ── Demo Threat Simulation ──────────────────────────────────────────────────
// Uses shared demo-state so both anomaly monitor AND regulatory radar respond.

// POST /api/risk/monitor/simulate — Inject demo anomalies + radar gaps
// BLOCKED in production to prevent fake data injection
router.post('/monitor/simulate', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' })
  }
  const { scenario } = req.body
  const result = activateDemo(scenario)

  logAudit({
    action: 'demo-simulate',
    agent: 'demo',
    detail: { scenario: scenario || 'mixed', threats: result.threats.length, radarGaps: result.radarGaps.length },
    severity: 'info',
  })

  res.json({
    ok: true,
    scenario: scenario || 'mixed',
    injectedCount: result.threats.length,
    radarGapsCount: result.radarGaps.length,
    anomalies: result.threats,
    radarGaps: result.radarGaps,
  })
})

// POST /api/risk/monitor/clear — Clear all demo state
router.post('/monitor/clear', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' })
  }
  clearDemo()
  logAudit({ action: 'demo-clear', agent: 'demo', detail: { message: 'All demo threats and radar gaps cleared' }, severity: 'info' })
  res.json({ ok: true, message: 'Demo threats cleared' })
})

// GET /api/risk/monitor/demo-status — Check demo state
router.get('/monitor/demo-status', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' })
  }
  const threats = getDemoThreats()
  res.json({ active: isDemoActive(), threatCount: threats?.length || 0 })
})

// Override: make the monitor endpoint return demo threats if active (dev only)
if (process.env.NODE_ENV !== 'production') {
const originalMonitorHandler = router.stack.find(
  r => r.route?.path === '/monitor' && r.route?.methods?.post
)
if (originalMonitorHandler) {
  const origHandler = originalMonitorHandler.route.stack[0].handle
  originalMonitorHandler.route.stack[0].handle = async (req, res) => {
    const demoThreats = getDemoThreats()
    if (demoThreats) {
      try {
        const fcl = req.app.locals.fcl
        if (!req.body.address) {
          return res.status(400).json({ error: 'address is required' })
        }
        const real = await monitorAddress(req.body.address, fcl)
        const allAnomalies = [...demoThreats, ...real.anomalies]
        let highestSeverity = 'none'
        const SEV = { low: 1, medium: 2, high: 3 }
        for (const a of allAnomalies) {
          if (SEV[a.severity] > (SEV[highestSeverity] || 0)) highestSeverity = a.severity
        }
        return res.json({
          ...real,
          anomalies: allAnomalies,
          anomalyCount: allAnomalies.length,
          highestSeverity,
          summary: `${allAnomalies.length} anomaly pattern(s) detected that require immediate attention.`,
          recommendedAction: 'flag-and-review',
          demoMode: true,
        })
      } catch (err) {
        return res.json({
          anomalyCount: demoThreats.length,
          highestSeverity: 'high',
          recommendedAction: 'flag-and-review',
          summary: `${demoThreats.length} threat(s) detected — demo simulation active`,
          anomalies: demoThreats,
          activity: {},
          analysisSource: 'demo-simulation',
          demoMode: true,
        })
      }
    }
    return origHandler(req, res)
  }
}
} // end NODE_ENV !== 'production' guard

export default router
