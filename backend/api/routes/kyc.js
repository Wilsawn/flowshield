// routes/kyc.js
// Veriff KYC integration routes.
// Creates verification sessions and handles webhook callbacks.
// Docs: https://devdocs.veriff.com/apidocs/v1sessions

import { Router } from 'express'
import crypto from 'crypto'

const router = Router()

const VERIFF_API = 'https://stationapi.veriff.com/v1'

// In-memory session store (production: use database)
const kycSessions = new Map()

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
      kycSessions.set(transactionId, {
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
      console.log('[KYC] Veriff API error, falling back to demo mode:', err.message)
    }
  }

  // Demo mode — no Veriff credentials configured
  kycSessions.set(transactionId, {
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

  // Optionally verify HMAC signature
  const sharedSecret = process.env.VERIFF_SHARED_SECRET
  const signature = req.headers['x-hmac-signature']
  if (sharedSecret && signature) {
    const expectedSig = crypto
      .createHmac('sha256', sharedSecret)
      .update(JSON.stringify(payload))
      .digest('hex')
    if (signature !== expectedSig) {
      console.log('[KYC Webhook] HMAC signature mismatch — rejecting')
      return res.status(401).json({ error: 'Invalid signature' })
    }
  }

  // Find session by Veriff session ID
  let transactionId = null
  let session = null
  for (const [txnId, s] of kycSessions.entries()) {
    if (s.veriffSessionId === veriffSessionId) {
      transactionId = txnId
      session = s
      break
    }
  }

  if (!session) {
    // Try vendorData lookup
    transactionId = payload?.verification?.vendorData
    session = kycSessions.get(transactionId)
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

  kycSessions.set(transactionId, session)

  res.json({ status: 'received' })
})

/**
 * POST /api/kyc/demo-complete — Simulate KYC completion (demo mode)
 * Used when Veriff credentials aren't configured
 */
router.post('/demo-complete', (req, res) => {
  const { transactionId } = req.body
  if (!transactionId) {
    return res.status(400).json({ error: 'transactionId is required' })
  }

  const session = kycSessions.get(transactionId)
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

  kycSessions.set(transactionId, session)

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
router.get('/status/:transactionId', (req, res) => {
  const session = kycSessions.get(req.params.transactionId)
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
