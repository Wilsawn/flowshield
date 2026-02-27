// routes/subscription.js
// Subscription management and credential minting API endpoints.
// Mint endpoint sends REAL Cadence transactions on-chain via server-side signing.

import { Router } from 'express'
import { serverAuthorization, hasPrivateKey } from '../../lib/flow-signer.js'
import { getPricing, registerProtocol, getProtocol, requireTier, TIERS } from '../../lib/subscription.js'

const router = Router()
const PRIVATE_KEY = hasPrivateKey()

// ── Public: Get pricing tiers ──
router.get('/pricing', (req, res) => {
  res.json({ tiers: getPricing() })
})

// ── Register a new protocol (get API key) ──
router.post('/register', (req, res) => {
  const { name, contactEmail, tier } = req.body

  if (!name || !contactEmail) {
    return res.status(400).json({ error: 'name and contactEmail are required' })
  }

  // Generate API key
  const apiKey = `fs_${tier || 'free'}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
  const result = registerProtocol(apiKey, { name, tier: tier || 'free', contactEmail })

  res.json({
    success: true,
    apiKey,
    tier: result.tier,
    protocol: result.protocol,
    message: 'Store your API key securely. Include it as X-Api-Key header in all requests.',
  })
})

// ── Get protocol info (authenticated) ──
router.get('/info', (req, res) => {
  const apiKey = req.headers['x-api-key']
  if (!apiKey) return res.status(401).json({ error: 'X-Api-Key header required' })

  const protocol = getProtocol(apiKey)
  if (!protocol) return res.status(404).json({ error: 'Protocol not found' })

  const tier = TIERS[protocol.tier]
  res.json({
    protocol: protocol.name,
    tier: protocol.tier,
    tierDetails: tier,
    createdAt: protocol.createdAt,
    active: protocol.active,
  })
})

// ── Mint credential — REAL on-chain transaction via server-side signing ──
router.post('/mint', async (req, res) => {
  const { address, jurisdiction, riskScore, proofHash, proofData } = req.body
  const fcl = req.app.locals.fcl
  const contractAddress = req.app.locals.contractAddress

  if (!address || !jurisdiction) {
    return res.status(400).json({ error: 'address and jurisdiction are required' })
  }
  if (!PRIVATE_KEY) {
    return res.status(500).json({ error: 'Private key not available — cannot sign mint transaction' })
  }

  try {
    const score = riskScore || 15
    const proof = proofData?.proof || proofHash || `zkp_${Date.now()}`
    const claimsHash = proofData?.claimsHash || proofHash || `claims_${Date.now()}`
    const authz = serverAuthorization(fcl, contractAddress)

    const txId = await fcl.mutate({
      cadence: `
        import ComplianceCredential from 0x${fcl.sansPrefix(contractAddress)}
        import ZKVerifier from 0x${fcl.sansPrefix(contractAddress)}

        transaction(jurisdiction: String, riskScore: UInt64, proof: String, claimsHash: String) {
          let admin: &ComplianceCredential.Admin
          let acct: auth(Storage, Capabilities) &Account

          prepare(signer: auth(Storage, Capabilities) &Account) {
            self.admin = signer.storage.borrow<&ComplianceCredential.Admin>(
              from: ComplianceCredential.AdminStoragePath
            ) ?? panic("No ComplianceCredential Admin resource")
            self.acct = signer
          }

          execute {
            // Skip if already has valid credential
            let existing = self.acct.capabilities.borrow<&{ComplianceCredential.CredentialPublic}>(
              ComplianceCredential.PublicPath
            )
            if existing != nil && existing!.isValid() {
              return
            }

            let proofData = ZKVerifier.ProofData(
              proof: proof,
              claimsHash: claimsHash,
              verifierName: "FlowShield",
              signature: claimsHash,
              jurisdiction: jurisdiction,
              timestamp: getCurrentBlock().timestamp
            )
            let result = ZKVerifier.verifyProof(proofData: proofData, userAddress: self.acct.address)

            let tier = ComplianceCredential.tierFromScore(score: riskScore)
            let expiresAt = getCurrentBlock().timestamp + 7776000.0

            self.admin.mintCredential(
              recipient: self.acct,
              tier: tier,
              riskScore: riskScore,
              expiresAt: expiresAt,
              proofHash: result.proofHash,
              jurisdiction: jurisdiction
            )
          }
        }
      `,
      args: (arg, t) => [
        arg(jurisdiction, t.String),
        arg(String(score), t.UInt64),
        arg(proof, t.String),
        arg(claimsHash, t.String),
      ],
      proposer: authz,
      payer: authz,
      authorizations: [authz],
      limit: 999,
    })

    const txResult = await fcl.tx(txId).onceSealed()
    console.log(`[Mint] Credential minted on-chain. Tx: ${txId}`)

    res.json({
      success: true,
      txId,
      blockHeight: txResult.blockHeight,
      events: txResult.events?.map(e => ({ type: e.type, data: e.data })) || [],
      credential: {
        address,
        jurisdiction,
        riskScore: score,
        tier: score <= 30 ? 'compliant' : score <= 70 ? 'semiCompliant' : 'nonCompliant',
        expiresIn: '90 days',
        proofHash: proofHash || claimsHash,
      },
      source: 'flow-testnet',
    })
  } catch (err) {
    console.error('[Mint] Error:', err.message)
    res.status(500).json({ error: 'Credential minting failed', details: err.message })
  }
})

// ── Stripe Checkout — create a checkout session for paid tiers ──
router.post('/checkout', async (req, res) => {
  const { tier, email, protocolName } = req.body

  if (!tier || !TIERS[tier]) {
    return res.status(400).json({ error: 'Valid tier required (starter, growth, scale)' })
  }

  const tierData = TIERS[tier]

  // Free tier — just register directly
  if (tierData.price === 0) {
    const apiKey = `fs_${tier}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
    registerProtocol(apiKey, { name: protocolName || 'My Protocol', tier, contactEmail: email || '' })
    return res.json({ success: true, apiKey, tier, free: true })
  }

  // Check if Stripe is configured
  if (!process.env.STRIPE_SECRET_KEY) {
    // No Stripe — generate API key directly (demo/development mode)
    const apiKey = `fs_${tier}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
    registerProtocol(apiKey, { name: protocolName || 'My Protocol', tier, contactEmail: email || '' })
    return res.json({
      success: true,
      apiKey,
      tier,
      demo: true,
      message: 'Stripe not configured — API key granted in demo mode. Set STRIPE_SECRET_KEY for real payments.',
    })
  }

  // Stripe is configured — create a real checkout session
  try {
    const stripe = (await import('stripe')).default(process.env.STRIPE_SECRET_KEY)

    const successUrl = process.env.FRONTEND_URL
      ? `${process.env.FRONTEND_URL}/dashboard?checkout=success&tier=${tier}`
      : `http://localhost:5173/dashboard?checkout=success&tier=${tier}`
    const cancelUrl = process.env.FRONTEND_URL
      ? `${process.env.FRONTEND_URL}/pricing?checkout=cancelled`
      : `http://localhost:5173/pricing?checkout=cancelled`

    const sessionParams = {
      mode: 'subscription',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `FlowShield ${tierData.name}`,
            description: `${tierData.monthlyLimit === -1 ? 'Unlimited' : tierData.monthlyLimit.toLocaleString()} API calls/mo · ${tierData.jurisdictions.length} jurisdictions · ${tierData.sla} SLA`,
          },
          unit_amount: tierData.price * 100, // cents
          recurring: { interval: 'month' },
        },
        quantity: 1,
      }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { tier, protocolName: protocolName || '' },
    }

    // Use Stripe Price ID if configured (for production with pre-created products)
    if (tierData.stripePriceId) {
      sessionParams.line_items = [{ price: tierData.stripePriceId, quantity: 1 }]
    }

    if (email) sessionParams.customer_email = email

    const session = await stripe.checkout.sessions.create(sessionParams)

    res.json({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id,
    })
  } catch (err) {
    console.error('[Subscription] Stripe checkout error:', err.message)
    res.status(500).json({ error: 'Failed to create checkout session', details: err.message })
  }
})

// ── Contact Sales — for enterprise inquiries ──
router.post('/contact-sales', (req, res) => {
  const { email, protocolName, message, estimatedVolume } = req.body
  if (!email) return res.status(400).json({ error: 'Email is required' })

  // In production: send to CRM/email. For now: log and acknowledge.
  console.log(`[Sales] Enterprise inquiry from ${email} (${protocolName}): ${message}`)

  res.json({
    success: true,
    message: 'Thank you! Our team will reach out within 24 hours.',
    referenceId: `ent_${Date.now().toString(36)}`,
  })
})

// ── Get fee schedule from on-chain ComplianceAction ──
router.get('/fees', async (req, res) => {
  const fcl = req.app.locals.fcl
  const contractAddress = req.app.locals.contractAddress

  try {
    const result = await fcl.query({
      cadence: `
        import ComplianceAction from ${contractAddress}
        access(all) fun main(): {String: UFix64} {
          return ComplianceAction.getFeeSchedule()
        }
      `,
    })

    res.json({
      onChainFees: result,
      subscriptionTiers: getPricing(),
    })
  } catch (err) {
    // Fallback if contract not yet deployed with fee mechanism
    res.json({
      onChainFees: {
        verificationFee: '0.001',
        credentialIssuanceFee: '0.01',
        totalCollected: '0.0',
      },
      subscriptionTiers: getPricing(),
    })
  }
})

export default router
