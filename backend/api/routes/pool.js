// routes/pool.js
// Sends REAL Flow transactions to DemoLendingPool on testnet.
// Uses server-side signing with the deployer's private key.

import { Router } from 'express'
import { serverAuthorization, hasPrivateKey } from '../../lib/flow-signer.js'
import { logAudit } from '../../lib/supabase.js'

const router = Router()
const PRIVATE_KEY = hasPrivateKey()

// POST /api/pool/mint-credential — Mint a compliance credential to the address
router.post('/mint-credential', async (req, res) => {
  const fcl = req.app.locals.fcl
  const address = req.app.locals.contractAddress

  if (!PRIVATE_KEY) {
    return res.status(500).json({ error: 'Private key not available', source: 'error' })
  }

  try {
    const authz = serverAuthorization(fcl, address)
    const txId = await fcl.mutate({
      cadence: `
        import ComplianceCredential from 0x${fcl.sansPrefix(address)}
        import ZKVerifier from 0x${fcl.sansPrefix(address)}

        transaction(jurisdiction: String, riskScore: UInt64, proof: String, claimsHash: String) {
          let admin: &ComplianceCredential.Admin
          let acct: auth(Storage, Capabilities) &Account

          prepare(signer: auth(Storage, Capabilities) &Account) {
            self.admin = signer.storage.borrow<&ComplianceCredential.Admin>(
              from: ComplianceCredential.AdminStoragePath
            ) ?? panic("No admin resource")
            self.acct = signer
          }

          execute {
            // Check if credential already exists
            let existing = self.acct.capabilities.borrow<&{ComplianceCredential.CredentialPublic}>(
              ComplianceCredential.PublicPath
            )
            if existing != nil && existing!.isValid() {
              // Already has valid credential — skip
              return
            }

            let tier = ComplianceCredential.tierFromScore(score: riskScore)
            let expiresAt = getCurrentBlock().timestamp + 7776000.0

            let proofData = ZKVerifier.ProofData(
              proof: proof,
              claimsHash: claimsHash,
              verifierName: "FlowShield",
              signature: claimsHash,
              jurisdiction: jurisdiction,
              timestamp: getCurrentBlock().timestamp
            )
            let result = ZKVerifier.verifyProof(proofData: proofData, userAddress: self.acct.address)

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
      args: (arg, t) => {
        const jurisdiction = req.body.jurisdiction || 'US'
        const proofId = req.body.proofHash || `zkp_${Date.now()}_${jurisdiction}`
        const claimsId = req.body.claimsHash || `claims_${Date.now()}`
        return [
          arg(jurisdiction, t.String),
          arg(String(req.body.riskScore || 15), t.UInt64),
          arg(proofId, t.String),
          arg(claimsId, t.String),
        ]
      },
      proposer: authz,
      payer: authz,
      authorizations: [authz],
      limit: 999,
    })

    // Wait for transaction to be sealed
    const txResult = await fcl.tx(txId).onceSealed()

    logAudit({ action: 'credential_mint', agent: 'pool', detail: { transactionId: txId, blockHeight: txResult.blockHeight }, severity: 'info' })

    res.json({
      success: true,
      transactionId: txId,
      status: txResult.status,
      events: txResult.events?.map(e => ({
        type: e.type,
        data: e.data,
      })) || [],
      blockHeight: txResult.blockHeight,
      source: 'flow-testnet',
    })
  } catch (err) {
    res.status(500).json({ error: err.message, source: 'error' })
  }
})

// GET /api/pool/position/:userAddress — Get a specific user's deposit/borrow from chain
router.get('/position/:userAddress', async (req, res) => {
  const fcl = req.app.locals.fcl
  const contractAddress = req.app.locals.contractAddress
  const userAddress = req.params.userAddress

  if (!userAddress || !userAddress.startsWith('0x')) {
    return res.status(400).json({ error: 'Valid Flow address required' })
  }

  try {
    const [userDeposit, userBorrow, maxBorrow] = await Promise.all([
      fcl.query({
        cadence: `
          import DemoLendingPool from 0x${fcl.sansPrefix(contractAddress)}
          access(all) fun main(addr: Address): UFix64 {
            return DemoLendingPool.getDeposit(address: addr)
          }
        `,
        args: (arg, t) => [arg(userAddress, t.Address)],
      }),
      fcl.query({
        cadence: `
          import DemoLendingPool from 0x${fcl.sansPrefix(contractAddress)}
          access(all) fun main(addr: Address): UFix64 {
            return DemoLendingPool.getBorrow(address: addr)
          }
        `,
        args: (arg, t) => [arg(userAddress, t.Address)],
      }),
      fcl.query({
        cadence: `
          import DemoLendingPool from 0x${fcl.sansPrefix(contractAddress)}
          access(all) fun main(addr: Address): UFix64 {
            return DemoLendingPool.getMaxBorrow(address: addr)
          }
        `,
        args: (arg, t) => [arg(userAddress, t.Address)],
      }),
    ])

    res.json({
      address: userAddress,
      deposited: parseFloat(userDeposit),
      borrowed: parseFloat(userBorrow),
      maxBorrowRemaining: parseFloat(maxBorrow),
      source: 'flow-testnet',
    })
  } catch (err) {
    res.status(500).json({ error: err.message, source: 'error' })
  }
})

// POST /api/pool/deposit — Real deposit into DemoLendingPool
// Accepts userAddress in body — deposits for THAT user (server sponsors the tx)
router.post('/deposit', async (req, res) => {
  const fcl = req.app.locals.fcl
  const contractAddress = req.app.locals.contractAddress
  const amount = parseFloat(req.body.amount) || 0
  const userAddress = req.body.userAddress || contractAddress

  if (!PRIVATE_KEY) {
    return res.status(500).json({ error: 'Private key not available', source: 'error' })
  }
  if (amount <= 0) {
    return res.status(400).json({ error: 'Amount must be greater than 0', source: 'error' })
  }

  try {
    const authz = serverAuthorization(fcl, contractAddress)

    const txId = await fcl.mutate({
      cadence: `
        import DemoLendingPool from 0x${fcl.sansPrefix(contractAddress)}

        transaction(amount: UFix64, depositor: Address) {
          prepare(signer: auth(Storage) &Account) {}
          execute {
            DemoLendingPool.deposit(depositor: depositor, amount: amount)
          }
        }
      `,
      args: (arg, t) => [
        arg(amount.toFixed(8), t.UFix64),
        arg(userAddress, t.Address),
      ],
      proposer: authz,
      payer: authz,
      authorizations: [authz],
      limit: 999,
    })

    const txResult = await fcl.tx(txId).onceSealed()

    logAudit({ action: 'pool_deposit', agent: 'pool', detail: { transactionId: txId, amount, userAddress, blockHeight: txResult.blockHeight }, severity: 'info', operatorAddress: userAddress })

    res.json({
      success: txResult.status === 4,
      transactionId: txId,
      action: 'deposit',
      amount: amount,
      userAddress,
      status: txResult.status,
      statusText: txResult.status === 4 ? 'SEALED' : 'FAILED',
      events: txResult.events?.map(e => ({
        type: e.type.split('.').pop(),
        data: e.data,
      })) || [],
      blockHeight: txResult.blockHeight,
      explorerUrl: `https://testnet.flowscan.io/tx/${txId}`,
      source: 'flow-testnet',
    })
  } catch (err) {
    res.status(500).json({ error: err.message, action: 'deposit', source: 'error' })
  }
})

// POST /api/pool/borrow — Real borrow from DemoLendingPool
// Accepts userAddress in body — borrows for THAT user (server sponsors the tx)
router.post('/borrow', async (req, res) => {
  const fcl = req.app.locals.fcl
  const contractAddress = req.app.locals.contractAddress
  const amount = parseFloat(req.body.amount) || 0
  const userAddress = req.body.userAddress || contractAddress

  if (!PRIVATE_KEY) {
    return res.status(500).json({ error: 'Private key not available', source: 'error' })
  }
  if (amount <= 0) {
    return res.status(400).json({ error: 'Amount must be greater than 0', source: 'error' })
  }

  try {
    const authz = serverAuthorization(fcl, contractAddress)

    const txId = await fcl.mutate({
      cadence: `
        import DemoLendingPool from 0x${fcl.sansPrefix(contractAddress)}

        transaction(amount: UFix64, borrower: Address) {
          prepare(signer: auth(Storage) &Account) {}
          execute {
            DemoLendingPool.borrow(borrower: borrower, amount: amount)
          }
        }
      `,
      args: (arg, t) => [
        arg(amount.toFixed(8), t.UFix64),
        arg(userAddress, t.Address),
      ],
      proposer: authz,
      payer: authz,
      authorizations: [authz],
      limit: 999,
    })

    const txResult = await fcl.tx(txId).onceSealed()

    logAudit({ action: 'pool_borrow', agent: 'pool', detail: { transactionId: txId, amount, userAddress, blockHeight: txResult.blockHeight }, severity: 'info', operatorAddress: userAddress })

    res.json({
      success: txResult.status === 4,
      transactionId: txId,
      action: 'borrow',
      amount: amount,
      userAddress,
      status: txResult.status,
      statusText: txResult.status === 4 ? 'SEALED' : 'FAILED',
      events: txResult.events?.map(e => ({
        type: e.type.split('.').pop(),
        data: e.data,
      })) || [],
      blockHeight: txResult.blockHeight,
      explorerUrl: `https://testnet.flowscan.io/tx/${txId}`,
      source: 'flow-testnet',
    })
  } catch (err) {
    res.status(500).json({ error: err.message, action: 'borrow', source: 'error' })
  }
})

// POST /api/pool/repay — Repay a borrow in DemoLendingPool
router.post('/repay', async (req, res) => {
  const fcl = req.app.locals.fcl
  const contractAddress = req.app.locals.contractAddress
  const amount = parseFloat(req.body.amount) || 0
  const userAddress = req.body.userAddress || contractAddress

  if (!PRIVATE_KEY) {
    return res.status(500).json({ error: 'Private key not available', source: 'error' })
  }
  if (amount <= 0) {
    return res.status(400).json({ error: 'Amount must be greater than 0', source: 'error' })
  }

  try {
    const authz = serverAuthorization(fcl, contractAddress)

    const txId = await fcl.mutate({
      cadence: `
        import DemoLendingPool from 0x${fcl.sansPrefix(contractAddress)}

        transaction(amount: UFix64, borrower: Address) {
          prepare(signer: auth(Storage) &Account) {}
          execute {
            DemoLendingPool.repay(borrower: borrower, amount: amount)
          }
        }
      `,
      args: (arg, t) => [
        arg(amount.toFixed(8), t.UFix64),
        arg(userAddress, t.Address),
      ],
      proposer: authz,
      payer: authz,
      authorizations: [authz],
      limit: 999,
    })

    const txResult = await fcl.tx(txId).onceSealed()

    logAudit({ action: 'pool_repay', agent: 'pool', detail: { transactionId: txId, amount, userAddress, blockHeight: txResult.blockHeight }, severity: 'info', operatorAddress: userAddress })

    res.json({
      success: txResult.status === 4,
      transactionId: txId,
      action: 'repay',
      amount: amount,
      userAddress,
      status: txResult.status,
      statusText: txResult.status === 4 ? 'SEALED' : 'FAILED',
      events: txResult.events?.map(e => ({
        type: e.type.split('.').pop(),
        data: e.data,
      })) || [],
      blockHeight: txResult.blockHeight,
      explorerUrl: `https://testnet.flowscan.io/tx/${txId}`,
      source: 'flow-testnet',
    })
  } catch (err) {
    res.status(500).json({ error: err.message, action: 'repay', source: 'error' })
  }
})

// GET /api/pool/status — Get pool stats from chain
router.get('/status', async (req, res) => {
  const fcl = req.app.locals.fcl
  const address = req.app.locals.contractAddress

  try {
    const [deposits, borrowed, txCount, liquidity, baseAPY, maxLTV, utilRate] = await Promise.all([
      fcl.query({
        cadence: `import DemoLendingPool from 0x${fcl.sansPrefix(address)}\naccess(all) fun main(): UFix64 { return DemoLendingPool.totalDeposits }`,
      }),
      fcl.query({
        cadence: `import DemoLendingPool from 0x${fcl.sansPrefix(address)}\naccess(all) fun main(): UFix64 { return DemoLendingPool.totalBorrowed }`,
      }),
      fcl.query({
        cadence: `import DemoLendingPool from 0x${fcl.sansPrefix(address)}\naccess(all) fun main(): UInt64 { return DemoLendingPool.totalTransactions }`,
      }),
      fcl.query({
        cadence: `import DemoLendingPool from 0x${fcl.sansPrefix(address)}\naccess(all) fun main(): UFix64 { return DemoLendingPool.availableLiquidity() }`,
      }),
      fcl.query({
        cadence: `import DemoLendingPool from 0x${fcl.sansPrefix(address)}\naccess(all) fun main(): UFix64 { return DemoLendingPool.baseAPY }`,
      }),
      fcl.query({
        cadence: `import DemoLendingPool from 0x${fcl.sansPrefix(address)}\naccess(all) fun main(): UFix64 { return DemoLendingPool.maxLTV }`,
      }),
      fcl.query({
        cadence: `import DemoLendingPool from 0x${fcl.sansPrefix(address)}\naccess(all) fun main(): UFix64 { return DemoLendingPool.utilizationRate() }`,
      }),
    ])

    const apyPct = parseFloat(baseAPY) * 100
    const ltvPct = parseFloat(maxLTV) * 100
    const util = parseFloat(utilRate)
    // Simple interest model: borrow rate = baseAPY + utilization spread
    const borrowRate = parseFloat(baseAPY) + util * 0.02

    res.json({
      totalDeposits: parseFloat(deposits),
      totalBorrowed: parseFloat(borrowed),
      totalTransactions: parseInt(txCount),
      availableLiquidity: parseFloat(liquidity),
      baseAPY: parseFloat(baseAPY),
      baseAPYPercent: apyPct,
      maxLTV: parseFloat(maxLTV),
      maxLTVPercent: ltvPct,
      utilizationRate: util,
      borrowRatePercent: +(borrowRate * 100).toFixed(2),
      source: 'flow-testnet',
    })
  } catch (err) {
    res.status(500).json({ error: err.message, source: 'error' })
  }
})

export default router
