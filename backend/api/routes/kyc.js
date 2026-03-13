/**
 * @file KYC API Routes
 * @module routes/kyc
 * @description Veriff KYC integration for identity verification.
 *              Creates verification sessions and handles webhook callbacks.
 * @see https://devdocs.veriff.com/apidocs/v1sessions
 */

import { Router } from 'express'
import crypto from 'crypto'
import { getSupabase } from '../../lib/supabase.js'
import { safeError } from '../../lib/middleware.js'

const router = Router()

const VERIFF_API = 'https://stationapi.veriff.com/v1'

// In-memory session store (fallback when Supabase is not configured)
const kycSessionsMemory = new Map()

// ── Supabase-backed KYC session store ──
const kycSessions = {
  async get(transactionId) {
    const sb = getSupabase()
    if (sb) {
      try {
        const { data } = await sb.from('kyc_sessions').select('*').eq('id', transactionId).single()
        if (data) return {
          email: data.email,
          jurisdiction: data.jurisdiction,
          walletAddress: data.wallet_address,
          veriffSessionId: data.veriff_id,
          sessionToken: data.session_token,
          status: data.status,
          createdAt: data.created_at,
          completedAt: data.completed_at,
          mode: data.mode,
          veriffDecision: data.veriff_decision,
          veriffCode: data.veriff_code,
          proofHash: data.proof_hash,
          riskScore: data.risk_score,
        }
        return null
      } catch { return kycSessionsMemory.get(transactionId) || null }
    }
    return kycSessionsMemory.get(transactionId) || null
  },
  async set(transactionId, session) {
    kycSessionsMemory.set(transactionId, session)
    const sb = getSupabase()
    if (sb) {
      try {
        await sb.from('kyc_sessions').upsert({
          id: transactionId,
          email: session.email,
          jurisdiction: session.jurisdiction,
          wallet_address: session.walletAddress,
          veriff_id: session.veriffSessionId || null,
          session_token: session.sessionToken || null,
          status: session.status,
          mode: session.mode || 'demo',
          veriff_decision: session.veriffDecision || null,
          veriff_code: session.veriffCode || null,
          proof_hash: session.proofHash || null,
          risk_score: session.riskScore || null,
          completed_at: session.completedAt || null,
        }, { onConflict: 'id' })
      } catch (err) {
        console.warn('[KYC] Supabase session save failed:', err.message)
      }
    }
  },
  async findByVeriffId(veriffSessionId) {
    const sb = getSupabase()
    if (sb) {
      try {
        const { data } = await sb.from('kyc_sessions').select('*').eq('veriff_id', veriffSessionId).single()
        if (data) return { transactionId: data.id, session: await kycSessions.get(data.id) }
      } catch { /* fall through */ }
    }
    for (const [txnId, s] of kycSessionsMemory.entries()) {
      if (s.veriffSessionId === veriffSessionId) return { transactionId: txnId, session: s }
    }
    return null
  },
}

/**
 * POST /api/kyc/start — Start a Veriff KYC session
 * Body: { email, jurisdiction, walletAddress }
 * Returns: { sessionId, verificationUrl } or demo mode fallback
 */
router.post('/start', async (req, res) => {
  const { email, jurisdiction, walletAddress } = req.body
  if (!email) {
    return res.status(400).json({ error: 'email is required' })
  }

  const transactionId = `fs_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`

  const apiKey = process.env.VERIFF_API_KEY
  const sharedSecret = process.env.VERIFF_SHARED_SECRET

  // If Veriff credentials are configured, create a real session
  if (apiKey) {
    try {
      // Veriff requires HTTPS callback URLs — only use FRONTEND_URL if it's HTTPS
      const frontendUrl = process.env.FRONTEND_URL || ''
      const callbackUrl = process.env.VERIFF_CALLBACK_URL
        || (frontendUrl.startsWith('https') ? frontendUrl : null)
        || 'https://flowshield.xyz/onboarding'

      const sessionRes = await fetch(`${VERIFF_API}/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-AUTH-CLIENT': apiKey,
        },
        body: JSON.stringify({
          verification: {
            callback: `${callbackUrl}?kyc=complete&txn=${transactionId}`,
            person: {
              email,
            },
            vendorData: transactionId,
          },
        }),
      })

      if (!sessionRes.ok) {
        const errText = await sessionRes.text()
        throw new Error(`Veriff API ${sessionRes.status}: ${errText}`)
      }

      const sessionData = await sessionRes.json()
      const veriffSession = sessionData.verification

      // Store session
      await kycSessions.set(transactionId, {
        email,
        jurisdiction,
        walletAddress,
        veriffSessionId: veriffSession.id,
        sessionToken: veriffSession.sessionToken,
        status: 'pending',
        createdAt: new Date().toISOString(),
        mode: 'veriff',
      })

      console.log(`[KYC] Veriff session created: ${veriffSession.id}`)

      return res.json({
        transactionId,
        sessionId: veriffSession.id,
        verificationUrl: veriffSession.url,
        mode: 'veriff',
      })
    } catch (err) {
      console.error('[KYC] Veriff API error:', err.message)
      if (process.env.NODE_ENV === 'production') {
        return res.status(502).json({ error: 'KYC provider unavailable', details: safeError(err, 'Service unavailable') })
      }
      // Fall through to demo mode in dev only
    }
  }

  // Demo mode — no Veriff credentials configured (dev only)
  if (process.env.NODE_ENV === 'production') {
    return res.status(503).json({ error: 'KYC not configured — set VERIFF_API_KEY' })
  }

  await kycSessions.set(transactionId, {
    email,
    jurisdiction,
    walletAddress,
    status: 'pending',
    createdAt: new Date().toISOString(),
    mode: 'demo',
  })

  res.json({
    transactionId,
    mode: 'demo',
    message: 'Demo mode — set VERIFF_API_KEY and VERIFF_SHARED_SECRET in .env for real KYC',
  })
})

/**
 * POST /api/kyc/webhook — Veriff decision webhook
 * Veriff sends this when verification is complete.
 * Decision codes: 9001=approved, 9102=declined, 9103=resubmit, 9104=expired
 */
router.post('/webhook', async (req, res) => {
  const payload = req.body
  const veriffSessionId = payload?.verification?.id
  const decision = payload?.verification?.status
  const code = payload?.verification?.code

  console.log(`[KYC Webhook] Veriff session ${veriffSessionId}: ${decision} (code: ${code})`)

  // Verify HMAC signature — mandatory in production
  const sharedSecret = process.env.VERIFF_SHARED_SECRET
  const signature = req.headers['x-hmac-signature']
  if (process.env.NODE_ENV === 'production' && !sharedSecret) {
    console.error('[KYC Webhook] VERIFF_SHARED_SECRET not set — rejecting webhook in production')
    return res.status(500).json({ error: 'Webhook verification not configured' })
  }
  if (sharedSecret) {
    if (!signature) {
      console.log('[KYC Webhook] Missing HMAC signature — rejecting')
      return res.status(401).json({ error: 'Missing signature' })
    }
    const expectedSig = crypto
      .createHmac('sha256', sharedSecret)
      .update(JSON.stringify(payload))
      .digest('hex')
    const sigBuf = Buffer.from(signature, 'hex')
    const expectedBuf = Buffer.from(expectedSig, 'hex')
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      console.log('[KYC Webhook] HMAC signature mismatch — rejecting')
      return res.status(401).json({ error: 'Invalid signature' })
    }
  }

  // Find session by Veriff session ID
  let transactionId = null
  let session = null
  const found = await kycSessions.findByVeriffId(veriffSessionId)
  if (found) {
    transactionId = found.transactionId
    session = found.session
  }

  if (!session) {
    // Try vendorData lookup
    transactionId = payload?.verification?.vendorData
    session = await kycSessions.get(transactionId)
  }

  if (!session) {
    return res.status(404).json({ error: 'Session not found' })
  }

  // Update session with Veriff decision
  session.status = code === 9001 ? 'approved' : 'rejected'
  session.veriffDecision = decision
  session.veriffCode = code
  session.completedAt = new Date().toISOString()

  // Generate proof hash from the verification result
  if (session.status === 'approved') {
    const proofData = JSON.stringify({
      transactionId,
      veriffSessionId,
      email: session.email,
      jurisdiction: session.jurisdiction,
      timestamp: session.completedAt,
      verifier: 'veriff',
    })
    session.proofHash = crypto.createHash('sha256').update(proofData).digest('hex')
    session.riskScore = 10 // Low risk if Veriff approved
  }

  await kycSessions.set(transactionId, session)

  res.json({ status: 'received' })
})

/**
 * POST /api/kyc/demo-complete — Simulate KYC completion (demo mode)
 * Used when Veriff credentials aren't configured
 */
router.post('/demo-complete', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' })
  }

  const { transactionId } = req.body
  if (!transactionId) {
    return res.status(400).json({ error: 'transactionId is required' })
  }

  const session = await kycSessions.get(transactionId)
  if (!session) {
    return res.status(404).json({ error: 'Session not found' })
  }

  // Simulate approval
  session.status = 'approved'
  session.completedAt = new Date().toISOString()

  const proofData = JSON.stringify({
    transactionId,
    email: session.email,
    jurisdiction: session.jurisdiction,
    timestamp: session.completedAt,
    verifier: 'demo',
  })
  session.proofHash = crypto.createHash('sha256').update(proofData).digest('hex')
  session.riskScore = 12 // Low risk for demo

  await kycSessions.set(transactionId, session)

  res.json({
    status: 'approved',
    proofHash: session.proofHash,
    riskScore: session.riskScore,
    jurisdiction: session.jurisdiction,
  })
})

/**
 * GET /api/kyc/status/:transactionId — Check KYC session status
 */
router.get('/status/:transactionId', async (req, res) => {
  const session = await kycSessions.get(req.params.transactionId)
  if (!session) {
    return res.status(404).json({ error: 'Session not found' })
  }

  res.json({
    transactionId: req.params.transactionId,
    status: session.status,
    mode: session.mode,
    jurisdiction: session.jurisdiction,
    ...(session.status === 'approved' && {
      proofHash: session.proofHash,
      riskScore: session.riskScore,
    }),
  })
})

export default router
