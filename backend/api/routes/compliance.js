// routes/compliance.js
// Compliance-related API routes — reads real data from Flow blockchain.

import { Router } from 'express'

const router = Router()

// GET /api/compliance/status/:address — Check compliance on Flow testnet
router.get('/status/:address', async (req, res) => {
  const { address } = req.params
  const fcl = req.app.locals.fcl
  const contractAddress = req.app.locals.contractAddress

  try {
    const result = await fcl.query({
      cadence: `
        import ComplianceCredential from ${contractAddress}

        access(all) fun main(address: Address): {String: AnyStruct} {
          let account = getAccount(address)
          let credRef = account.capabilities.borrow<&{ComplianceCredential.CredentialPublic}>(
            ComplianceCredential.PublicPath
          )

          if let cred = credRef {
            return {
              "hasCredential": true,
              "isValid": cred.isValid(),
              "isExpired": cred.isExpired(),
              "tier": cred.getTier().rawValue,
              "riskScore": cred.getRiskScore(),
              "expiresAt": cred.getExpiresAt(),
              "jurisdiction": cred.getJurisdiction(),
              "proofHash": cred.getProofHash(),
              "issuedAt": cred.getIssuedAt()
            }
          }

          return {
            "hasCredential": false,
            "isValid": false,
            "isExpired": false,
            "tier": UInt8(2),
            "riskScore": UInt64(0),
            "expiresAt": 0.0,
            "jurisdiction": "",
            "proofHash": "",
            "issuedAt": 0.0
          }
        }
      `,
      args: (arg, t) => [arg(address, t.Address)],
    })

    res.json({ address, ...result, source: 'flow-testnet' })
  } catch (err) {
    // If contracts aren't deployed yet, return mock data
    const hash = address.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
    res.json({
      address,
      hasCredential: false,
      isValid: false,
      isExpired: false,
      tier: 0,
      riskScore: hash % 35,
      expiresAt: 0,
      jurisdiction: 'US',
      proofHash: '',
      issuedAt: 0,
      source: 'mock-fallback',
      error: err.message,
    })
  }
})

// GET /api/compliance/rules/:jurisdiction — Get jurisdiction rules from on-chain RuleEngine
router.get('/rules/:jurisdiction', async (req, res) => {
  const { jurisdiction } = req.params
  const fcl = req.app.locals.fcl
  const contractAddress = req.app.locals.contractAddress

  try {
    const result = await fcl.query({
      cadence: `
        import RuleEngine from ${contractAddress}
        access(all) fun main(jurisdiction: String): {String: String}? {
          return RuleEngine.getRules(jurisdiction: jurisdiction)
        }
      `,
      args: (arg, t) => [arg(jurisdiction, t.String)],
    })

    if (result) {
      res.json({ jurisdiction, rules: result, source: 'flow-testnet' })
    } else {
      res.status(404).json({ error: `Jurisdiction ${jurisdiction} not found` })
    }
  } catch (err) {
    res.status(500).json({ error: err.message, source: 'error' })
  }
})

// GET /api/compliance/pool — Get DemoLendingPool stats from on-chain
router.get('/pool', async (req, res) => {
  const fcl = req.app.locals.fcl
  const contractAddress = req.app.locals.contractAddress

  try {
    const result = await fcl.query({
      cadence: `
        import DemoLendingPool from ${contractAddress}
        access(all) fun main(): {String: UFix64} {
          return {
            "totalDeposits": DemoLendingPool.totalDeposits,
            "totalBorrowed": DemoLendingPool.totalBorrowed,
            "availableLiquidity": DemoLendingPool.availableLiquidity(),
            "utilizationRate": DemoLendingPool.utilizationRate()
          }
        }
      `,
    })

    res.json({ ...result, source: 'flow-testnet' })
  } catch (err) {
    res.json({
      totalDeposits: 0,
      totalBorrowed: 0,
      availableLiquidity: 0,
      utilizationRate: 0,
      source: 'mock-fallback',
    })
  }
})

export default router
