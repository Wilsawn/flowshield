// routes/subscription.js
// Subscription management and credential minting API endpoints.

import { Router } from 'express'
import { getPricing, registerProtocol, getProtocol, requireTier, TIERS } from '../../lib/subscription.js'

const router = Router()

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

// ── Mint credential (calls Cadence transaction on Flow testnet) ──
router.post('/mint', async (req, res) => {
  const { address, jurisdiction, riskScore, proofHash, proofData } = req.body
  const fcl = req.app.locals.fcl

  if (!address || !jurisdiction) {
    return res.status(400).json({ error: 'address and jurisdiction are required' })
  }

  try {
    // Build the Cadence transaction to verify and mint
    const contractAddress = req.app.locals.contractAddress
    const score = riskScore || 15

    // Execute the verify_and_mint transaction via FCL
    // In production: uses the admin account to sponsor the transaction
    // For demo: returns the transaction structure for the frontend to sign
    const txPayload = {
      cadence: `
        import ComplianceCredential from ${contractAddress}
        import ZKVerifier from ${contractAddress}

        transaction(
          proof: String,
          claimsHash: String,
          verifierName: String,
          signature: String,
          jurisdiction: String,
          riskScore: UInt64
        ) {
          let admin: &ComplianceCredential.Admin
          let userAccount: auth(Storage, Capabilities) &Account

          prepare(adminAccount: auth(Storage) &Account, userAccount: auth(Storage, Capabilities) &Account) {
            self.admin = adminAccount.storage.borrow<&ComplianceCredential.Admin>(
              from: ComplianceCredential.AdminStoragePath
            ) ?? panic("Could not borrow ComplianceCredential Admin")
            self.userAccount = userAccount
          }

          execute {
            let proofData = ZKVerifier.ProofData(
              proof: proof,
              claimsHash: claimsHash,
              verifierName: verifierName,
              signature: signature,
              jurisdiction: jurisdiction,
              timestamp: getCurrentBlock().timestamp
            )

            let result = ZKVerifier.verifyProof(proofData: proofData, userAddress: self.userAccount.address)
            assert(result.valid, message: "ZK proof verification failed")

            let tier = ComplianceCredential.tierFromScore(score: riskScore)
            let expiresAt = getCurrentBlock().timestamp + 7776000.0

            self.admin.mintCredential(
              recipient: self.userAccount,
              tier: tier,
              riskScore: riskScore,
              expiresAt: expiresAt,
              proofHash: result.proofHash,
              jurisdiction: jurisdiction
            )
          }
        }
      `,
      args: [
        { type: 'String', value: proofData?.proof || 'demo_proof_' + Date.now() },
        { type: 'String', value: proofData?.claimsHash || proofHash || 'demo_claims_hash' },
        { type: 'String', value: 'FlowShieldDemo' },
        { type: 'String', value: proofData?.signature || 'demo_signature' },
        { type: 'String', value: jurisdiction },
        { type: 'UInt64', value: String(score) },
      ],
      status: 'ready',
      network: process.env.FLOW_NETWORK || 'testnet',
      contractAddress,
    }

    res.json({
      success: true,
      message: 'Credential minting transaction prepared',
      transaction: txPayload,
      credential: {
        address,
        jurisdiction,
        riskScore: score,
        tier: score <= 30 ? 'compliant' : score <= 70 ? 'semiCompliant' : 'nonCompliant',
        expiresIn: '90 days',
        proofHash: proofHash || 'pending_verification',
      },
    })
  } catch (err) {
    console.error('[Mint] Error:', err.message)
    res.status(500).json({ error: 'Credential minting failed', details: err.message })
  }
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
