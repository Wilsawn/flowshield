// routes/pool.js
// Sends REAL Flow transactions to DemoLendingPool on testnet.
// Uses server-side signing with the deployer's private key.

import { Router } from 'express'
import elliptic from 'elliptic'
import pkg from 'js-sha3'
const { sha3_256 } = pkg
const EC = elliptic.ec
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const router = Router()
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ec = new EC('p256')

// ── Load private key ──
let PRIVATE_KEY = null
try {
  const pkeyPath = path.resolve(__dirname, '../../../flowshield-testnet2.pkey')
  let raw = fs.readFileSync(pkeyPath, 'utf8').trim()
  if (raw.startsWith('0x')) raw = raw.slice(2)
  PRIVATE_KEY = raw
} catch {
  // pkey not available — transactions will fail gracefully
}

// ── ECDSA_P256 + SHA3_256 signing (Flow's signature scheme) ──
function signWithKey(privateKey, message) {
  const key = ec.keyFromPrivate(Buffer.from(privateKey, 'hex'))
  const digest = sha3_256(Buffer.from(message, 'hex'))
  const sig = key.sign(Buffer.from(digest, 'hex'))
  const n = 32
  const r = sig.r.toArrayLike(Buffer, 'be', n)
  const s = sig.s.toArrayLike(Buffer, 'be', n)
  return Buffer.concat([r, s]).toString('hex')
}

// ── FCL server-side authorization ──
function serverAuthorization(fcl, address, keyIndex = 0) {
  return (account) => ({
    ...account,
    tempId: `${address}-${keyIndex}`,
    addr: fcl.sansPrefix(address),
    keyId: Number(keyIndex),
    signingFunction: async (signable) => ({
      addr: fcl.withPrefix(address),
      keyId: Number(keyIndex),
      signature: signWithKey(PRIVATE_KEY, signable.message),
    }),
  })
}

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

        transaction(jurisdiction: String, riskScore: UInt64) {
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
              proof: "server-side-demo",
              claimsHash: "0xdemo",
              verifierName: "FlowShield",
              signature: "0xdemo",
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
      args: (arg, t) => [
        arg(req.body.jurisdiction || 'US', t.String),
        arg(String(req.body.riskScore || 15), t.UInt64),
      ],
      proposer: authz,
      payer: authz,
      authorizations: [authz],
      limit: 999,
    })

    // Wait for transaction to be sealed
    const txResult = await fcl.tx(txId).onceSealed()

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

// POST /api/pool/deposit — Real deposit into DemoLendingPool
router.post('/deposit', async (req, res) => {
  const fcl = req.app.locals.fcl
  const address = req.app.locals.contractAddress
  const amount = parseFloat(req.body.amount) || 0

  if (!PRIVATE_KEY) {
    return res.status(500).json({ error: 'Private key not available', source: 'error' })
  }
  if (amount <= 0) {
    return res.status(400).json({ error: 'Amount must be greater than 0', source: 'error' })
  }

  try {
    const authz = serverAuthorization(fcl, address)

    // Send real deposit transaction
    const txId = await fcl.mutate({
      cadence: `
        import DemoLendingPool from 0x${fcl.sansPrefix(address)}

        transaction(amount: UFix64) {
          prepare(signer: auth(Storage) &Account) {}
          execute {
            DemoLendingPool.deposit(depositor: ${address}, amount: amount)
          }
        }
      `,
      args: (arg, t) => [
        arg(amount.toFixed(8), t.UFix64),
      ],
      proposer: authz,
      payer: authz,
      authorizations: [authz],
      limit: 999,
    })

    const txResult = await fcl.tx(txId).onceSealed()

    res.json({
      success: txResult.status === 4,
      transactionId: txId,
      action: 'deposit',
      amount: amount,
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
router.post('/borrow', async (req, res) => {
  const fcl = req.app.locals.fcl
  const address = req.app.locals.contractAddress
  const amount = parseFloat(req.body.amount) || 0

  if (!PRIVATE_KEY) {
    return res.status(500).json({ error: 'Private key not available', source: 'error' })
  }
  if (amount <= 0) {
    return res.status(400).json({ error: 'Amount must be greater than 0', source: 'error' })
  }

  try {
    const authz = serverAuthorization(fcl, address)

    const txId = await fcl.mutate({
      cadence: `
        import DemoLendingPool from 0x${fcl.sansPrefix(address)}

        transaction(amount: UFix64) {
          prepare(signer: auth(Storage) &Account) {}
          execute {
            DemoLendingPool.borrow(borrower: ${address}, amount: amount)
          }
        }
      `,
      args: (arg, t) => [
        arg(amount.toFixed(8), t.UFix64),
      ],
      proposer: authz,
      payer: authz,
      authorizations: [authz],
      limit: 999,
    })

    const txResult = await fcl.tx(txId).onceSealed()

    res.json({
      success: txResult.status === 4,
      transactionId: txId,
      action: 'borrow',
      amount: amount,
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
