// routes/copilot.js
// Builder Copilot + Regulatory Radar API routes.

import { Router } from 'express'
import { chat, scanCode } from '../../agents/builder-copilot.js'
import { scanForGaps, parseRegulation } from '../../agents/regulatory-radar.js'
import { logAudit, storeScanResult, fireWebhooks, getSupabase } from '../../lib/supabase.js'
import { getDemoThreats, getDemoRadarGaps, isDemoActive, resolveDemoGap, resolveAllDemoGaps } from '../../lib/demo-state.js'
import { serverAuthorization, hasPrivateKey } from '../../lib/flow-signer.js'
import { safeError } from '../../lib/middleware.js'

const PRIVATE_KEY = hasPrivateKey()

const router = Router()

// In-memory session fallback
const sessionsMemory = new Map()

// ── Supabase-backed copilot session store ──
async function getSession(sessionId) {
  const sb = getSupabase()
  if (sb) {
    try {
      const { data } = await sb.from('copilot_sessions').select('messages').eq('id', sessionId).single()
      if (data) return data.messages || []
    } catch { /* fall through */ }
  }
  return sessionsMemory.get(sessionId) || []
}

async function saveSession(sessionId, messages) {
  sessionsMemory.set(sessionId, messages)
  const sb = getSupabase()
  if (sb) {
    try {
      await sb.from('copilot_sessions').upsert({
        id: sessionId,
        messages,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })
    } catch (err) {
      console.warn('[Copilot] Supabase session save failed:', err.message)
    }
  }
}

// POST /api/copilot/chat — Send message to Builder Copilot
// Accepts optional `context` for personalized responses based on user's on-chain state.
router.post('/chat', async (req, res) => {
  const { message, sessionId = 'default', context = null } = req.body
  if (!message) {
    return res.status(400).json({ error: 'message is required' })
  }

  try {
    const history = await getSession(sessionId)
    const result = await chat(message, history, context)
    await saveSession(sessionId, result.conversationHistory)

    res.json({
      response: result.response,
      sessionId,
      messageCount: result.conversationHistory.length,
    })
  } catch (err) {
    res.status(500).json({ error: safeError(err, 'Chat request failed') })
  }
})

// POST /api/copilot/scan-code — Analyze code for compliance issues
router.post('/scan-code', async (req, res) => {
  const { code, language = 'cadence', context = '' } = req.body
  if (!code) {
    return res.status(400).json({ error: 'code is required' })
  }

  try {
    const result = await scanCode(code, language, context)
    logAudit({
      action: 'scan-code',
      agent: 'copilot',
      detail: { language, codeLength: code.length, source: result.source },
      severity: 'info',
    })
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: safeError(err, 'Code scan failed') })
  }
})

// POST /api/radar/scan — AI scans real on-chain rules and compares against real regulations
// Reads current RuleEngine state, sends to Claude, returns compliance gaps.
// When demo mode is active, injects simulated regulatory gaps on top of real results.
router.post('/radar/scan', async (req, res) => {
  try {
    const fcl = req.app.locals.fcl
    const contractAddress = req.app.locals.contractAddress
    const result = await scanForGaps(fcl, contractAddress)

    // Inject demo radar gaps when demo mode is active
    // Transform demo gap format to match the real gap structure the frontend expects
    const demoGaps = getDemoRadarGaps()
    if (demoGaps && demoGaps.length > 0) {
      const normalizedDemoGaps = demoGaps.map(g => ({
        jurisdiction: g.jurisdiction,
        title: `${g.jurisdiction} — ${g.label}`,
        severity: g.severity,
        summary: g.summary,
        regulatoryBasis: g.regulatoryBasis,
        ruleKey: g.ruleKey,
        currentOnChain: { [g.ruleKey]: g.currentValue },
        requiredRules: { [g.ruleKey]: g.requiredValue },
        effectiveDate: 'now',
        demoGap: true,
      }))
      result.gaps = [...(result.gaps || []), ...normalizedDemoGaps]
      // Remove affected jurisdictions from compliant list
      const affectedJurisdictions = [...new Set(demoGaps.map(g => g.jurisdiction))]
      result.compliantJurisdictions = (result.compliantJurisdictions || []).filter(
        j => !affectedJurisdictions.includes(j)
      )
      result.overallAssessment = `${result.gaps.length} compliance gap(s) detected across ${affectedJurisdictions.join(', ')} — triggered by anomaly patterns requiring regulatory review.`
      result.demoMode = true
    }

    // Log to Supabase (non-blocking)
    logAudit({
      action: 'scan',
      agent: 'radar',
      detail: { gapsCount: result.gaps?.length || 0, compliant: result.compliantJurisdictions, demoMode: !!demoGaps?.length },
      severity: result.gaps?.length > 0 ? 'warning' : 'info',
    })
    storeScanResult({
      scanType: 'radar',
      result,
      gapsCount: result.gaps?.length || 0,
      source: result.source || 'compliance-checklist+ai',
    })
    if (result.gaps?.length > 0) {
      fireWebhooks('gap', { gaps: result.gaps, compliant: result.compliantJurisdictions })
    }

    res.json(result)
  } catch (err) {
    console.error('[Radar] Scan failed:', err.message)
    res.status(500).json({ error: safeError(err, 'Regulatory scan failed') })
  }
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
    res.status(500).json({ error: safeError(err, 'Regulation parsing failed') })
  }
})

// POST /api/radar/approve — Approve drafted rules and push on-chain (REAL transaction)
// Demo gaps are resolved IN-MEMORY only (no on-chain push) to avoid creating real compliance issues.
// Real gaps (from actual scans) push to RuleEngine.setRule() on-chain as before.
router.post('/radar/approve', async (req, res) => {
  const { jurisdiction, rules } = req.body
  if (!jurisdiction || !rules) {
    return res.status(400).json({ error: 'jurisdiction and rules are required' })
  }

  // ── Check if this is a demo gap — resolve in-memory only ────────────────
  const ruleKeys = Object.keys(rules)
  const demoResolved = ruleKeys.map(key => resolveDemoGap(jurisdiction, key)).filter(Boolean)

  if (demoResolved.length > 0) {
    const txHash = Array.from({ length: 64 }, () =>
      '0123456789abcdef'[Math.floor(Math.random() * 16)]
    ).join('')
    const last = demoResolved[demoResolved.length - 1]
    console.log(`[Radar] Demo gap resolved in-memory: ${jurisdiction} (${ruleKeys.join(', ')}) — ${last.remainingGaps} gaps, ${last.remainingThreats} anomalies left`)
    return res.json({
      success: true,
      simulated: true,
      txHash,
      rulesApplied: Object.entries(rules).map(([key, value]) => ({ jurisdiction, key, value: String(value) })),
      jurisdiction,
      timestamp: new Date().toISOString(),
      message: `Demo gap resolved — ${last.remainingGaps} gap(s) remaining`,
      demoState: { remainingGaps: last.remainingGaps, remainingThreats: last.remainingThreats },
    })
  }

  // ── Real gap — push on-chain ────────────────────────────────────────────
  const fcl = req.app.locals.fcl
  const address = req.app.locals.contractAddress

  if (!PRIVATE_KEY || !fcl) {
    return res.status(500).json({
      success: false,
      error: 'Private key not available — cannot sign on-chain transactions. Ensure flowshield-testnet2.pkey exists.',
    })
  }

  try {
    const authz = serverAuthorization(fcl, address)
    const ruleEntries = Object.entries(rules)

    // Send one transaction per rule update (RuleEngine.setRule)
    const results = []
    for (const [key, value] of ruleEntries) {
      const txId = await fcl.mutate({
        cadence: `
          import RuleEngine from 0x${fcl.sansPrefix(address)}

          transaction(jurisdiction: String, key: String, value: String) {
            let admin: &RuleEngine.Admin
            prepare(signer: auth(Storage) &Account) {
              self.admin = signer.storage.borrow<&RuleEngine.Admin>(
                from: RuleEngine.AdminStoragePath
              ) ?? panic("Could not borrow RuleEngine Admin")
            }
            execute {
              self.admin.setRule(jurisdiction: jurisdiction, key: key, value: value)
            }
          }
        `,
        args: (arg, t) => [
          arg(jurisdiction, t.String),
          arg(key, t.String),
          arg(String(value), t.String),
        ],
        proposer: authz,
        payer: authz,
        authorizations: [authz],
        limit: 999,
      })

      const txResult = await fcl.tx(txId).onceSealed()
      results.push({
        jurisdiction,
        key,
        value: String(value),
        txId,
        status: txResult.status,
        blockHeight: txResult.blockHeight,
      })
      console.log(`[Radar] Rule updated on-chain: ${jurisdiction}.${key} = ${value} (tx: ${txId})`)
    }

    const lastResult = results[results.length - 1]

    res.json({
      success: true,
      simulated: false,
      txHash: lastResult.txId,
      blockHeight: lastResult.blockHeight,
      rulesApplied: results.map(r => ({ jurisdiction: r.jurisdiction, key: r.key, value: r.value, txId: r.txId })),
      jurisdiction,
      timestamp: new Date().toISOString(),
      explorerUrl: `https://testnet.flowscan.io/tx/${lastResult.txId}`,
      message: `${results.length} rule(s) updated for ${jurisdiction} on-chain via RuleEngine.setRule`,
    })
  } catch (err) {
    console.error('[Radar] On-chain push failed:', err.message)
    res.status(500).json({ error: safeError(err, 'On-chain rule update failed'), source: 'flow-testnet' })
  }
})

// POST /api/radar/approve-all — Resolve ALL remaining demo gaps at once (in-memory only)
// Demo gaps are never pushed on-chain — they only exist in the demo simulation state.
router.post('/radar/approve-all', async (req, res) => {
  const demoGaps = getDemoRadarGaps()
  if (!demoGaps || demoGaps.length === 0) {
    return res.json({ success: true, message: 'No demo gaps to resolve', resolvedGaps: 0, resolvedThreats: 0 })
  }

  const gapSummary = demoGaps.map(g => ({ jurisdiction: g.jurisdiction, key: g.ruleKey, value: g.requiredValue }))

  // Clear all demo state (gaps + linked anomalies)
  const cleared = resolveAllDemoGaps()

  logAudit({
    action: 'approve-all',
    agent: 'radar',
    detail: { rulesApplied: gapSummary.length, ...cleared },
    severity: 'info',
  })

  res.json({
    success: true,
    simulated: true,
    rulesApplied: gapSummary,
    ...cleared,
    message: `Applied ${gapSummary.length} fix(es) — all gaps and anomalies resolved`,
  })
})

export default router
