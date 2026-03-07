// routes/governance.js
// Governance API routes — reads AND writes real proposal data on-chain.
// Uses server-side signing with the deployer's private key.

import { Router } from 'express'
import { serverAuthorization, hasPrivateKey } from '../../lib/flow-signer.js'
import { logAudit } from '../../lib/supabase.js'
import { safeError } from '../../lib/middleware.js'

const router = Router()
const PRIVATE_KEY = hasPrivateKey()

// GET /api/governance/stats — Get governance stats from chain
router.get('/stats', async (req, res) => {
  const fcl = req.app.locals.fcl
  const address = req.app.locals.contractAddress

  try {
    const [stats, signers] = await Promise.all([
      fcl.query({
        cadence: `
          import Governance from 0x${fcl.sansPrefix(address)}
          access(all) fun main(): {String: UInt64} {
            return Governance.getStats()
          }
        `,
      }),
      fcl.query({
        cadence: `
          import Governance from 0x${fcl.sansPrefix(address)}
          access(all) fun main(): [Address] {
            return Governance.authorizedSigners
          }
        `,
      }),
    ])

    res.json({
      totalProposals: parseInt(stats.totalProposals || '0'),
      totalSigners: parseInt(stats.totalSigners || '0'),
      requiredApprovals: parseInt(stats.requiredApprovals || '1'),
      signers: signers || [],
      source: 'flow-testnet',
    })
  } catch (err) {
    res.status(500).json({ error: safeError(err, 'Governance status unavailable'), source: 'error' })
  }
})

// GET /api/governance/proposals — Get all proposals from chain
router.get('/proposals', async (req, res) => {
  const fcl = req.app.locals.fcl
  const address = req.app.locals.contractAddress

  try {
    const result = await fcl.query({
      cadence: `
        import Governance from 0x${fcl.sansPrefix(address)}
        access(all) fun main(): [Governance.Proposal] {
          let ids = Governance.proposals.keys
          var list: [Governance.Proposal] = []
          for id in ids {
            if let p = Governance.getProposal(id: id) {
              list.append(p)
            }
          }
          return list
        }
      `,
    })

    // Map on-chain status enum to string
    const STATUS_MAP = { '0': 'pending', '1': 'approved', '2': 'executed', '3': 'expired', '4': 'rejected' }

    const proposals = (result || []).map(p => ({
      id: parseInt(p.id),
      proposer: p.proposer,
      action: p.action,
      description: p.description,
      data: p.data || {},
      approvals: p.approvals || [],
      status: STATUS_MAP[String(p.status?.rawValue ?? p.status)] || 'pending',
      createdAt: parseFloat(p.createdAt),
      expiresAt: parseFloat(p.expiresAt),
    }))

    res.json({ proposals, source: 'flow-testnet' })
  } catch (err) {
    res.status(500).json({ error: safeError(err, 'Failed to fetch proposals'), source: 'error' })
  }
})

// GET /api/governance/proposals/:id — Get a single proposal
router.get('/proposals/:id', async (req, res) => {
  const fcl = req.app.locals.fcl
  const address = req.app.locals.contractAddress
  const id = req.params.id

  try {
    const result = await fcl.query({
      cadence: `
        import Governance from 0x${fcl.sansPrefix(address)}
        access(all) fun main(id: UInt64): Governance.Proposal? {
          return Governance.getProposal(id: id)
        }
      `,
      args: (arg, t) => [arg(String(id), t.UInt64)],
    })

    if (!result) {
      return res.status(404).json({ error: 'Proposal not found' })
    }

    const STATUS_MAP = { '0': 'pending', '1': 'approved', '2': 'executed', '3': 'expired', '4': 'rejected' }

    res.json({
      id: parseInt(result.id),
      proposer: result.proposer,
      action: result.action,
      description: result.description,
      data: result.data || {},
      approvals: result.approvals || [],
      status: STATUS_MAP[String(result.status?.rawValue ?? result.status)] || 'pending',
      createdAt: parseFloat(result.createdAt),
      expiresAt: parseFloat(result.expiresAt),
      source: 'flow-testnet',
    })
  } catch (err) {
    res.status(500).json({ error: safeError(err, 'Failed to fetch proposal'), source: 'error' })
  }
})

// POST /api/governance/setup — One-time: make the deployer an authorized signer
// Creates a Governance.Signer resource and stores it in the deployer's account
router.post('/setup', async (req, res) => {
  const fcl = req.app.locals.fcl
  const address = req.app.locals.contractAddress

  if (!PRIVATE_KEY) {
    return res.status(500).json({ error: 'Private key not available — cannot sign transactions' })
  }

  try {
    // Check if already a signer
    const isSigner = await fcl.query({
      cadence: `
        import Governance from 0x${fcl.sansPrefix(address)}
        access(all) fun main(addr: Address): Bool {
          return Governance.isAuthorizedSigner(addr)
        }
      `,
      args: (arg, t) => [arg(address, t.Address)],
    })

    if (isSigner) {
      return res.json({ success: true, message: 'Already an authorized signer', alreadySetup: true })
    }

    // Add deployer as signer via Admin resource
    const txId = await fcl.mutate({
      cadence: `
        import Governance from 0x${fcl.sansPrefix(address)}

        transaction {
          prepare(signer: auth(Storage, BorrowValue, SaveValue) &Account) {
            let admin = signer.storage.borrow<&Governance.Admin>(from: Governance.AdminStoragePath)
              ?? panic("No Governance Admin resource found")

            let signerResource <- admin.addSigner(address: signer.address)
            signer.storage.save(<- signerResource, to: /storage/FlowShieldGovernanceSigner)
          }
        }
      `,
      proposer: serverAuthorization(fcl, address),
      payer: serverAuthorization(fcl, address),
      authorizations: [serverAuthorization(fcl, address)],
      limit: 100,
    })

    const result = await fcl.tx(txId).onceSealed()
    console.log(`[Governance] Setup complete — deployer is now an authorized signer. Tx: ${txId}`)

    res.json({
      success: true,
      txId,
      blockHeight: result.blockHeight,
      message: 'Deployer added as authorized signer',
    })
  } catch (err) {
    console.error('[Governance] Setup failed:', err.message)
    res.status(500).json({ error: safeError(err, 'Governance setup failed') })
  }
})

// POST /api/governance/create — Create a proposal on-chain
// Body: { action, description, data }
router.post('/create', async (req, res) => {
  const fcl = req.app.locals.fcl
  const address = req.app.locals.contractAddress
  const { action, description, data } = req.body

  if (!action || typeof action !== 'string' || action.length > 100) {
    return res.status(400).json({ error: 'action is required (max 100 chars)' })
  }
  if (!description || typeof description !== 'string' || description.length > 2000) {
    return res.status(400).json({ error: 'description is required (max 2000 chars)' })
  }
  if (!PRIVATE_KEY) {
    return res.status(500).json({ error: 'Private key not available — cannot sign transactions' })
  }

  try {
    // Build data dict entries for Cadence — sanitize to prevent injection
    const SAFE_CADENCE_STRING = /^[a-zA-Z0-9 _\-.,/:]+$/
    const sanitizedData = Object.entries(data || {})
    for (const [k, v] of sanitizedData) {
      if (!SAFE_CADENCE_STRING.test(k) || !SAFE_CADENCE_STRING.test(String(v))) {
        return res.status(400).json({ error: `Invalid characters in data key/value: "${k}"` })
      }
    }
    const dataEntries = sanitizedData
      .map(([k, v]) => `"${k}": "${v}"`)
      .join(', ')

    const txId = await fcl.mutate({
      cadence: `
        import Governance from 0x${fcl.sansPrefix(address)}

        transaction(action: String, description: String) {
          prepare(signer: auth(Storage, BorrowValue) &Account) {
            let signerRef = signer.storage.borrow<&Governance.Signer>(from: /storage/FlowShieldGovernanceSigner)
              ?? panic("No Governance Signer resource — run /api/governance/setup first")

            let data: {String: String} = {${dataEntries}}
            signerRef.createProposal(action: action, description: description, data: data)
          }
        }
      `,
      args: (arg, t) => [
        arg(action, t.String),
        arg(description, t.String),
      ],
      proposer: serverAuthorization(fcl, address),
      payer: serverAuthorization(fcl, address),
      authorizations: [serverAuthorization(fcl, address)],
      limit: 100,
    })

    const result = await fcl.tx(txId).onceSealed()
    console.log(`[Governance] Proposal created on-chain. Tx: ${txId}`)
    logAudit({ action: 'governance_create', agent: 'governance', detail: { transactionId: txId, proposalAction: action, blockHeight: result.blockHeight }, severity: 'info' })

    res.json({
      success: true,
      txId,
      blockHeight: result.blockHeight,
      source: 'flow-testnet',
    })
  } catch (err) {
    console.error('[Governance] Create proposal failed:', err.message)
    res.status(500).json({ error: safeError(err, 'Proposal creation failed') })
  }
})

// POST /api/governance/approve — Approve a proposal on-chain
// Body: { proposalId }
router.post('/approve', async (req, res) => {
  const fcl = req.app.locals.fcl
  const address = req.app.locals.contractAddress
  const { proposalId } = req.body

  if (proposalId === undefined) {
    return res.status(400).json({ error: 'proposalId is required' })
  }
  if (!PRIVATE_KEY) {
    return res.status(500).json({ error: 'Private key not available — cannot sign transactions' })
  }

  try {
    const txId = await fcl.mutate({
      cadence: `
        import Governance from 0x${fcl.sansPrefix(address)}

        transaction(proposalId: UInt64) {
          prepare(signer: auth(Storage, BorrowValue) &Account) {
            let signerRef = signer.storage.borrow<&Governance.Signer>(from: /storage/FlowShieldGovernanceSigner)
              ?? panic("No Governance Signer resource — run /api/governance/setup first")

            signerRef.approveProposal(id: proposalId)
          }
        }
      `,
      args: (arg, t) => [
        arg(String(proposalId), t.UInt64),
      ],
      proposer: serverAuthorization(fcl, address),
      payer: serverAuthorization(fcl, address),
      authorizations: [serverAuthorization(fcl, address)],
      limit: 100,
    })

    const result = await fcl.tx(txId).onceSealed()
    console.log(`[Governance] Proposal ${proposalId} approved on-chain. Tx: ${txId}`)
    logAudit({ action: 'governance_approve', agent: 'governance', detail: { transactionId: txId, proposalId, blockHeight: result.blockHeight }, severity: 'info' })

    res.json({
      success: true,
      txId,
      proposalId,
      blockHeight: result.blockHeight,
      source: 'flow-testnet',
    })
  } catch (err) {
    console.error('[Governance] Approve failed:', err.message)
    res.status(500).json({ error: safeError(err, 'Proposal approval failed') })
  }
})

export default router
