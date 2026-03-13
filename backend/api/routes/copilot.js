/**
 * @file Copilot API Routes
 * @module routes/copilot
 * @description Builder Copilot AI assistant and Regulatory Radar API endpoints.
 *              Includes prompt injection protection, per-user rate limiting,
 *              saved conversation history, and code scanning capabilities.
 */

import { Router } from 'express'
import { chat, scanCode } from '../../agents/builder-copilot.js'
import { scanForGaps, parseRegulation } from '../../agents/regulatory-radar.js'
import { logAudit, storeScanResult, fireWebhooks, getSupabase } from '../../lib/supabase.js'
import { getDemoThreats, getDemoRadarGaps, isDemoActive, resolveDemoGap, resolveAllDemoGaps } from '../../lib/demo-state.js'
import { serverAuthorization, hasPrivateKey } from '../../lib/flow-signer.js'
import { safeError, rateLimit } from '../../lib/middleware.js'
import { sanitizeMessage, sanitizeHistory, detectInjectionAttempt, logInjectionAttempt } from '../../lib/prompt-guard.js'

const PRIVATE_KEY = hasPrivateKey()

const router = Router()

// ── Copilot-specific rate limiter: 20 req/min per user on /chat ──
const copilotRateLimit = rateLimit({ windowMs: 60000, max: 20 })

// ── In-memory conversation fallback (dev mode) ──
const conversationsMemory = new Map() // key: `${email}:${id}`

// ── Conversation store (Supabase-backed with in-memory fallback) ──

async function ensureConversationsTable() {
  const sb = getSupabase()
  if (!sb) return
  try {
    // Attempt to create table if it doesn't exist (idempotent via IF NOT EXISTS)
    await sb.rpc('exec_sql', {
      sql: `CREATE TABLE IF NOT EXISTS copilot_conversations (
        id TEXT PRIMARY KEY,
        user_email TEXT NOT NULL,
        title TEXT NOT NULL DEFAULT 'New conversation',
        messages JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_copilot_conversations_user ON copilot_conversations(user_email);`
    })
  } catch {
    // Table creation via RPC may not be available — that's OK, table should be pre-created
  }
}
ensureConversationsTable()

async function listConversations(userEmail) {
  const sb = getSupabase()
  if (sb) {
    try {
      const { data, error } = await sb
        .from('copilot_conversations')
        .select('id, title, created_at, updated_at')
        .eq('user_email', userEmail)
        .order('updated_at', { ascending: false })
        .limit(100)
      if (!error && data) return data
    } catch { /* fall through */ }
  }
  // In-memory fallback
  const results = []
  for (const [key, convo] of conversationsMemory) {
    if (key.startsWith(`${userEmail}:`)) {
      results.push({ id: convo.id, title: convo.title, created_at: convo.created_at, updated_at: convo.updated_at })
    }
  }
  return results.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
}

async function getConversation(userEmail, convoId) {
  const sb = getSupabase()
  if (sb) {
    try {
      const { data, error } = await sb
        .from('copilot_conversations')
        .select('*')
        .eq('id', convoId)
        .eq('user_email', userEmail)
        .single()
      if (!error && data) return data
    } catch { /* fall through */ }
  }
  return conversationsMemory.get(`${userEmail}:${convoId}`) || null
}

async function saveConversation(userEmail, { id, title, messages }) {
  const now = new Date().toISOString()
  const sb = getSupabase()
  if (sb) {
    try {
      await sb.from('copilot_conversations').upsert({
        id,
        user_email: userEmail,
        title: title || 'New conversation',
        messages: messages || [],
        updated_at: now,
      }, { onConflict: 'id' })
    } catch (err) {
      console.warn('[Copilot] Supabase conversation save failed:', err.message)
    }
  }
  // Always keep in-memory copy as fallback
  conversationsMemory.set(`${userEmail}:${id}`, {
    id,
    user_email: userEmail,
    title: title || 'New conversation',
    messages: messages || [],
    created_at: conversationsMemory.get(`${userEmail}:${id}`)?.created_at || now,
    updated_at: now,
  })
}

async function deleteConversation(userEmail, convoId) {
  conversationsMemory.delete(`${userEmail}:${convoId}`)
  const sb = getSupabase()
  if (sb) {
    try {
      await sb.from('copilot_conversations').delete().eq('id', convoId).eq('user_email', userEmail)
    } catch (err) {
      console.warn('[Copilot] Supabase conversation delete failed:', err.message)
    }
  }
}

// ── Conversation CRUD endpoints ──

// GET /api/copilot/conversations — list user's conversations
router.get('/conversations', async (req, res) => {
  try {
    const conversations = await listConversations(req.userEmail)
    res.json({ conversations })
  } catch (err) {
    res.status(500).json({ error: safeError(err, 'Failed to list conversations') })
  }
})

// GET /api/copilot/conversations/:id — get full conversation with messages
router.get('/conversations/:id', async (req, res) => {
  try {
    const convo = await getConversation(req.userEmail, req.params.id)
    if (!convo) return res.status(404).json({ error: 'Conversation not found' })
    res.json(convo)
  } catch (err) {
    res.status(500).json({ error: safeError(err, 'Failed to get conversation') })
  }
})

// PATCH /api/copilot/conversations/:id — rename conversation
router.patch('/conversations/:id', async (req, res) => {
  const { title } = req.body
  if (!title || typeof title !== 'string') {
    return res.status(400).json({ error: 'title is required' })
  }
  try {
    const convo = await getConversation(req.userEmail, req.params.id)
    if (!convo) return res.status(404).json({ error: 'Conversation not found' })
    await saveConversation(req.userEmail, { ...convo, title: title.slice(0, 200) })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: safeError(err, 'Failed to rename conversation') })
  }
})

// DELETE /api/copilot/conversations/:id — delete conversation
router.delete('/conversations/:id', async (req, res) => {
  try {
    await deleteConversation(req.userEmail, req.params.id)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: safeError(err, 'Failed to delete conversation') })
  }
})

// ── POST /api/copilot/chat — Send message to Builder Copilot ──
// Rate limited to 20 req/min, with prompt injection detection.
router.post('/chat', copilotRateLimit, async (req, res) => {
  const { message, sessionId = 'default', context = null } = req.body
  if (!message) {
    return res.status(400).json({ error: 'message is required' })
  }

  // Sanitize input
  const { clean: cleanMessage, truncated } = sanitizeMessage(message)
  if (!cleanMessage) {
    return res.status(400).json({ error: 'message is empty after sanitization' })
  }

  // Detect injection attempts (flag, don't block)
  const injection = detectInjectionAttempt(cleanMessage)
  if (injection.detected) {
    logInjectionAttempt(req.userEmail, injection.patterns, cleanMessage)
  }

  try {
    // Load conversation history from store
    const userEmail = req.userEmail || 'anonymous'
    const convo = await getConversation(userEmail, sessionId)
    const rawHistory = convo?.messages?.map(m => ({ role: m.role, content: m.content })) || []
    const history = sanitizeHistory(rawHistory)

    const result = await chat(cleanMessage, history, context, {
      fcl: req.app.locals.fcl,
      contractAddress: req.app.locals.contractAddress,
    })

    // Generate title from first message
    const isFirst = history.length === 0
    const title = isFirst ? (cleanMessage.length > 50 ? cleanMessage.slice(0, 50) + '...' : cleanMessage) : (convo?.title || 'New conversation')

    // Build full messages array for storage
    const storedMessages = [
      ...(convo?.messages || []),
      { role: 'user', content: cleanMessage, timestamp: Date.now() },
      { role: 'assistant', content: result.response, timestamp: Date.now() },
    ]

    await saveConversation(userEmail, { id: sessionId, title, messages: storedMessages })

    res.json({
      response: result.response,
      sessionId,
      messageCount: storedMessages.length,
      ...(truncated ? { warning: 'Message was truncated to 10,000 characters' } : {}),
      ...(injection.detected ? { injectionWarning: true } : {}),
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

  // Sanitize code input (use same limits)
  const { clean: cleanCode } = sanitizeMessage(code)

  try {
    const result = await scanCode(cleanCode, language, context)
    logAudit({
      action: 'scan-code',
      agent: 'copilot',
      detail: { language, codeLength: cleanCode.length, source: result.source },
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
