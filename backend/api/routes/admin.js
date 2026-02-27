// routes/admin.js
// Admin API routes — audit log, scan history, monitored addresses, webhooks, API keys.
// All endpoints gracefully degrade when Supabase is not configured.

import { Router } from 'express'
import {
  getAuditLog,
  getScanHistory,
  getMonitoredAddresses,
  addMonitoredAddress,
  removeMonitoredAddress,
  getWebhooks,
  registerWebhook,
  getRegulatoryRequirements,
  upsertRequirement,
  getSupabase,
} from '../../lib/supabase.js'

const router = Router()

// ── Status ────────────────────────────────────────────────────────────────────

// GET /api/admin/status — Check Supabase connection and feature availability
router.get('/status', (req, res) => {
  const sb = getSupabase()
  res.json({
    supabase: !!sb,
    features: {
      auditLog: !!sb,
      scanHistory: !!sb,
      monitoredAddresses: !!sb,
      webhooks: !!sb,
      regulatoryDb: !!sb,
      apiKeyAuth: !!sb,
    },
    message: sb
      ? 'Supabase connected — all MVP features active'
      : 'Supabase not configured — running in local mode (no persistence)',
  })
})

// ── Audit Log ─────────────────────────────────────────────────────────────────

// GET /api/admin/audit — Get recent audit log entries
router.get('/audit', async (req, res) => {
  const { limit, agent, operator } = req.query
  const entries = await getAuditLog({
    limit: parseInt(limit) || 50,
    agent: agent || undefined,
    operatorAddress: operator || undefined,
  })
  res.json({ entries, count: entries.length })
})

// ── Scan History ──────────────────────────────────────────────────────────────

// GET /api/admin/scans — Get recent scan history
router.get('/scans', async (req, res) => {
  const { limit, type } = req.query
  const scans = await getScanHistory({
    limit: parseInt(limit) || 20,
    scanType: type || undefined,
  })
  res.json({ scans, count: scans.length })
})

// ── Monitored Addresses ───────────────────────────────────────────────────────

// GET /api/admin/addresses — Get monitored addresses
router.get('/addresses', async (req, res) => {
  const { operator } = req.query
  const addresses = await getMonitoredAddresses(operator || undefined)
  if (addresses === null) {
    return res.json({
      addresses: [{ address: '0x93c691a98b975493', label: 'FlowShield Contract', source: 'default' }],
      count: 1,
      message: 'Supabase not configured — showing default address only',
    })
  }
  res.json({ addresses, count: addresses.length })
})

// POST /api/admin/addresses — Add an address to monitor
router.post('/addresses', async (req, res) => {
  const { address, label, operator } = req.body
  if (!address) {
    return res.status(400).json({ error: 'address is required' })
  }

  const result = await addMonitoredAddress({
    address,
    label: label || null,
    operatorAddress: operator || null,
  })

  if (!result) {
    return res.status(500).json({ error: 'Failed to add address — Supabase may not be configured' })
  }

  res.json({ ok: true, address: result })
})

// DELETE /api/admin/addresses/:address — Remove a monitored address
router.delete('/addresses/:address', async (req, res) => {
  const success = await removeMonitoredAddress(req.params.address)
  if (!success) {
    return res.status(500).json({ error: 'Failed to remove address' })
  }
  res.json({ ok: true })
})

// ── Webhooks ──────────────────────────────────────────────────────────────────

// GET /api/admin/webhooks — Get registered webhooks
router.get('/webhooks', async (req, res) => {
  const { operator } = req.query
  const webhooks = await getWebhooks(operator || undefined)
  res.json({ webhooks, count: webhooks.length })
})

// POST /api/admin/webhooks — Register a webhook
router.post('/webhooks', async (req, res) => {
  const { url, events, operator, secret } = req.body
  if (!url) {
    return res.status(400).json({ error: 'url is required' })
  }

  const result = await registerWebhook({
    url,
    events: events || ['anomaly', 'gap', 'scan'],
    operatorAddress: operator || null,
    secret: secret || null,
  })

  if (!result) {
    return res.status(500).json({ error: 'Failed to register webhook — Supabase may not be configured' })
  }

  res.json({ ok: true, webhook: result })
})

// ── Regulatory Requirements ───────────────────────────────────────────────────

// GET /api/admin/requirements — Get all regulatory requirements
router.get('/requirements', async (req, res) => {
  const { jurisdiction } = req.query
  const requirements = await getRegulatoryRequirements(jurisdiction || undefined)
  if (requirements === null) {
    return res.json({
      requirements: [],
      count: 0,
      message: 'Supabase not configured — using hardcoded COMPLIANCE_CHECKLIST',
    })
  }
  res.json({ requirements, count: requirements.length })
})

// PUT /api/admin/requirements — Upsert a regulatory requirement
router.put('/requirements', async (req, res) => {
  const { jurisdiction, ruleKey, requiredValue, label, regulatoryBasis, framework, regulator } = req.body
  if (!jurisdiction || !ruleKey || requiredValue === undefined) {
    return res.status(400).json({ error: 'jurisdiction, ruleKey, and requiredValue are required' })
  }

  const result = await upsertRequirement({
    jurisdiction,
    ruleKey,
    requiredValue: String(requiredValue),
    label,
    regulatoryBasis,
    framework,
    regulator,
  })

  if (!result) {
    return res.status(500).json({ error: 'Failed to upsert requirement — Supabase may not be configured' })
  }

  res.json({ ok: true, requirement: result })
})

export default router
