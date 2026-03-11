// routes/governance.js
// Governance API routes — reads AND writes real proposal data on-chain.
// Uses server-side signing with the deployer's private key.
// GET routes are public (guests can view); write routes require auth.

import { Router } from 'express'
import { serverAuthorization, hasPrivateKey } from '../../lib/flow-signer.js'
import { logAudit } from '../../lib/supabase.js'
import { safeError, requireAuth } from '../../lib/middleware.js'

const router = Router()
const PRIVATE_KEY = hasPrivateKey()

// ── Off-chain rejection tracking (survives until Railway redeploy) ──
const rejectedProposals = new Map() // id -> { rejectedAt, reason }

const STATUS_MAP = { '0': 'pending', '1': 'approved', '2': 'executed', '3': 'expired', '4': 'rejected' }

// ── Helper: parse proposal from on-chain data ──
function parseProposal(p) {
  const id = parseInt(p.id)
  const status = STATUS_MAP[String(p.status?.rawValue ?? p.status)] || 'pending'
  const rejection = rejectedProposals.get(id)
  return {
    id,
    proposer: p.proposer,
    action: p.action,
    description: p.description,
    data: p.data || {},
    approvals: p.approvals || [],
    status: rejection && status === 'pending' ? 'rejected' : status,
    createdAt: parseFloat(p.createdAt),
    expiresAt: parseFloat(p.expiresAt),
    rejectedAt: rejection?.rejectedAt || null,
    rejectionReason: rejection?.reason || null,
  }
}

// ── Helper: execute a proposal's action on-chain ──
async function executeProposalAction(fcl, address, proposalId, action, data) {
  const results = { executed: false, actionTxId: null, markTxId: null }

  // Step 1: Execute the actual admin action based on proposal type
  switch (action) {
    case 'setRule': {
      const jurisdiction = data?.jurisdiction || 'US'
      const ruleType = data?.ruleType || 'kycRequired'
      const value = data?.value || 'true'
      try {
        results.actionTxId = await fcl.mutate({
          cadence: `
            import RuleEngine from 0x${fcl.sansPrefix(address)}
            transaction(jurisdiction: String, ruleType: String, value: String) {
              prepare(signer: auth(Storage, BorrowValue) &Account) {
                let admin = signer.storage.borrow<&RuleEngine.Admin>(from: RuleEngine.AdminStoragePath)
                  ?? panic("No RuleEngine Admin resource")
                admin.setRule(jurisdiction: jurisdiction, ruleType: ruleType, value: value)
              }
            }
          `,
          args: (arg, t) => [arg(jurisdiction, t.String), arg(ruleType, t.String), arg(value, t.String)],
          proposer: serverAuthorization(fcl, address),
          payer: serverAuthorization(fcl, address),
          authorizations: [serverAuthorization(fcl, address)],
          limit: 100,
        })
        await fcl.tx(results.actionTxId).onceSealed()
      } catch (err) {
        console.warn(`[Governance] setRule action failed: ${err.message}`)
      }
      break
    }
    case 'setFee': {
      const fee = data?.fee || '1.0'
      try {
        results.actionTxId = await fcl.mutate({
          cadence: `
            import ComplianceAction from 0x${fcl.sansPrefix(address)}
            transaction(fee: UFix64) {
              prepare(signer: auth(Storage, BorrowValue) &Account) {
                let admin = signer.storage.borrow<&ComplianceAction.Admin>(from: ComplianceAction.AdminStoragePath)
                  ?? panic("No ComplianceAction Admin resource")
                admin.setVerificationFee(fee: fee)
              }
            }
          `,
          args: (arg, t) => [arg(fee, t.UFix64)],
          proposer: serverAuthorization(fcl, address),
          payer: serverAuthorization(fcl, address),
          authorizations: [serverAuthorization(fcl, address)],
          limit: 100,
        })
        await fcl.tx(results.actionTxId).onceSealed()
      } catch (err) {
        console.warn(`[Governance] setFee action failed: ${err.message}`)
      }
      break
    }
    case 'revoke': {
      const credentialId = data?.credentialId || '0'
      try {
        results.actionTxId = await fcl.mutate({
          cadence: `
            import ComplianceCredential from 0x${fcl.sansPrefix(address)}
            transaction(credentialId: UInt64) {
              prepare(signer: auth(Storage, BorrowValue) &Account) {
                let admin = signer.storage.borrow<&ComplianceCredential.Admin>(from: ComplianceCredential.AdminStoragePath)
                  ?? panic("No ComplianceCredential Admin resource")
                admin.revokeCredential(id: credentialId)
              }
            }
          `,
          args: (arg, t) => [arg(String(credentialId), t.UInt64)],
          proposer: serverAuthorization(fcl, address),
          payer: serverAuthorization(fcl, address),
          authorizations: [serverAuthorization(fcl, address)],
          limit: 100,
        })
        await fcl.tx(results.actionTxId).onceSealed()
      } catch (err) {
        console.warn(`[Governance] revoke action failed: ${err.message}`)
      }
      break
    }
    default:
      // For withdraw, addVerifier, etc. — mark executed as demo placeholder
      console.log(`[Governance] Action "${action}" executed as placeholder (no on-chain handler)`)
      break
  }

  // Step 2: Mark the proposal as executed on-chain via Governance.Admin
  try {
    results.markTxId = await fcl.mutate({
      cadence: `
        import Governance from 0x${fcl.sansPrefix(address)}
        transaction(proposalId: UInt64) {
          prepare(signer: auth(Storage, BorrowValue) &Account) {
            let admin = signer.storage.borrow<&Governance.Admin>(from: Governance.AdminStoragePath)
              ?? panic("No Governance Admin resource")
            admin.markExecuted(id: proposalId)
          }
        }
      `,
      args: (arg, t) => [arg(String(proposalId), t.UInt64)],
      proposer: serverAuthorization(fcl, address),
      payer: serverAuthorization(fcl, address),
      authorizations: [serverAuthorization(fcl, address)],
      limit: 100,
    })
    await fcl.tx(results.markTxId).onceSealed()
    results.executed = true
  } catch (err) {
    console.warn(`[Governance] markExecuted failed: ${err.message}`)
  }

  return results
}

// ════════════════════════════════════════════════════════════════
// PUBLIC READ ENDPOINTS (no auth required — guests can view)
// ════════════════════════════════════════════════════════════════

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

    const proposals = (result || []).map(parseProposal)
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

    res.json({ ...parseProposal(result), source: 'flow-testnet' })
  } catch (err) {
    res.status(500).json({ error: safeError(err, 'Failed to fetch proposal'), source: 'error' })
  }
})

// GET /api/governance/activity — Fetch governance events from Flow REST API
router.get('/activity', async (req, res) => {
  const address = req.app.locals.contractAddress
  const FLOW_ACCESS = 'https://rest-testnet.onflow.org'

  try {
    // Query recent events for Governance contract
    const eventTypes = [
      `A.${address.replace('0x', '')}.Governance.ProposalCreated`,
      `A.${address.replace('0x', '')}.Governance.ProposalApproved`,
      `A.${address.replace('0x', '')}.Governance.ProposalExecuted`,
    ]

    const activities = []

    for (const eventType of eventTypes) {
      try {
        const resp = await fetch(
          `${FLOW_ACCESS}/v1/events?type=${encodeURIComponent(eventType)}&start_height=sealed&end_height=sealed`
        )
        if (resp.ok) {
          const data = await resp.json()
          for (const block of (data.results || data || [])) {
            for (const evt of (block.events || [])) {
              activities.push({
                type: eventType.split('.').pop(),
                blockHeight: block.block_height || evt.block_height,
                blockId: block.block_id || evt.block_id,
                transactionId: evt.transaction_id,
                payload: evt.payload,
                flowscanUrl: `https://testnet.flowscan.io/tx/${evt.transaction_id}`,
                timestamp: block.block_timestamp || null,
              })
            }
          }
        }
      } catch {
        // Individual event type fetch failed — continue with others
      }
    }

    // Sort newest first
    activities.sort((a, b) => (b.blockHeight || 0) - (a.blockHeight || 0))

    res.json({ activities: activities.slice(0, 50), source: 'flow-testnet' })
  } catch (err) {
    res.status(500).json({ error: safeError(err, 'Failed to fetch activity'), activities: [] })
  }
})

// ════════════════════════════════════════════════════════════════
// WRITE ENDPOINTS (require auth)
// ════════════════════════════════════════════════════════════════

// POST /api/governance/setup — One-time: make the deployer an authorized signer
router.post('/setup', requireAuth, async (req, res) => {
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
router.post('/create', requireAuth, async (req, res) => {
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

// POST /api/governance/approve — Approve a proposal on-chain, then auto-execute
router.post('/approve', requireAuth, async (req, res) => {
  const fcl = req.app.locals.fcl
  const address = req.app.locals.contractAddress
  const { proposalId } = req.body

  if (proposalId === undefined) {
    return res.status(400).json({ error: 'proposalId is required' })
  }
  if (!PRIVATE_KEY) {
    return res.status(500).json({ error: 'Private key not available — cannot sign transactions' })
  }

  // Block approval on rejected proposals
  if (rejectedProposals.has(parseInt(proposalId))) {
    return res.status(400).json({ error: 'Proposal has been rejected and cannot be approved' })
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

    // ── Auto-execute: check if proposal is now approved and execute immediately ──
    let autoExecuted = false
    let executionResult = null
    try {
      const proposal = await fcl.query({
        cadence: `
          import Governance from 0x${fcl.sansPrefix(address)}
          access(all) fun main(id: UInt64): Governance.Proposal? {
            return Governance.getProposal(id: id)
          }
        `,
        args: (arg, t) => [arg(String(proposalId), t.UInt64)],
      })

      const status = STATUS_MAP[String(proposal?.status?.rawValue ?? proposal?.status)] || 'pending'
      if (status === 'approved') {
        console.log(`[Governance] Proposal ${proposalId} reached quorum — auto-executing...`)
        executionResult = await executeProposalAction(fcl, address, proposalId, proposal.action, proposal.data)
        autoExecuted = executionResult.executed
        if (autoExecuted) {
          logAudit({ action: 'governance_auto_execute', agent: 'governance', detail: { proposalId, actionTxId: executionResult.actionTxId, markTxId: executionResult.markTxId }, severity: 'info' })
        }
      }
    } catch (err) {
      console.warn(`[Governance] Auto-execute failed for proposal ${proposalId}: ${err.message}`)
    }

    res.json({
      success: true,
      txId,
      proposalId,
      blockHeight: result.blockHeight,
      autoExecuted,
      executionTxId: executionResult?.markTxId || null,
      actionTxId: executionResult?.actionTxId || null,
      source: 'flow-testnet',
    })
  } catch (err) {
    console.error('[Governance] Approve failed:', err.message)
    res.status(500).json({ error: safeError(err, 'Proposal approval failed') })
  }
})

// POST /api/governance/reject — Reject a proposal (off-chain overlay)
router.post('/reject', requireAuth, async (req, res) => {
  const fcl = req.app.locals.fcl
  const address = req.app.locals.contractAddress
  const { proposalId, reason } = req.body

  if (proposalId === undefined) {
    return res.status(400).json({ error: 'proposalId is required' })
  }

  const pid = parseInt(proposalId)

  // Verify proposal exists and is pending on-chain
  try {
    const proposal = await fcl.query({
      cadence: `
        import Governance from 0x${fcl.sansPrefix(address)}
        access(all) fun main(id: UInt64): Governance.Proposal? {
          return Governance.getProposal(id: id)
        }
      `,
      args: (arg, t) => [arg(String(pid), t.UInt64)],
    })

    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' })
    }

    const status = STATUS_MAP[String(proposal.status?.rawValue ?? proposal.status)] || 'pending'
    if (status !== 'pending') {
      return res.status(400).json({ error: `Cannot reject a proposal with status "${status}"` })
    }

    if (rejectedProposals.has(pid)) {
      return res.status(400).json({ error: 'Proposal already rejected' })
    }

    rejectedProposals.set(pid, {
      rejectedAt: new Date().toISOString(),
      reason: reason || 'Rejected by governance signer',
    })

    console.log(`[Governance] Proposal ${pid} rejected (off-chain). Reason: ${reason || 'none'}`)
    logAudit({ action: 'governance_reject', agent: 'governance', detail: { proposalId: pid, reason }, severity: 'warning' })

    res.json({
      success: true,
      proposalId: pid,
      status: 'rejected',
      message: 'Proposal rejected',
    })
  } catch (err) {
    console.error('[Governance] Reject failed:', err.message)
    res.status(500).json({ error: safeError(err, 'Proposal rejection failed') })
  }
})

// POST /api/governance/execute — Manually execute an approved proposal
router.post('/execute', requireAuth, async (req, res) => {
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
    // Fetch proposal and verify it's approved
    const proposal = await fcl.query({
      cadence: `
        import Governance from 0x${fcl.sansPrefix(address)}
        access(all) fun main(id: UInt64): Governance.Proposal? {
          return Governance.getProposal(id: id)
        }
      `,
      args: (arg, t) => [arg(String(proposalId), t.UInt64)],
    })

    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' })
    }

    const status = STATUS_MAP[String(proposal.status?.rawValue ?? proposal.status)] || 'pending'
    if (status !== 'approved') {
      return res.status(400).json({ error: `Cannot execute a proposal with status "${status}". Must be "approved".` })
    }

    console.log(`[Governance] Executing proposal ${proposalId} (action: ${proposal.action})...`)
    const result = await executeProposalAction(fcl, address, proposalId, proposal.action, proposal.data)

    if (!result.executed) {
      return res.status(500).json({ error: 'Failed to mark proposal as executed on-chain' })
    }

    logAudit({ action: 'governance_execute', agent: 'governance', detail: { proposalId, action: proposal.action, actionTxId: result.actionTxId, markTxId: result.markTxId }, severity: 'info' })

    res.json({
      success: true,
      proposalId: parseInt(proposalId),
      action: proposal.action,
      actionTxId: result.actionTxId,
      markTxId: result.markTxId,
      source: 'flow-testnet',
    })
  } catch (err) {
    console.error('[Governance] Execute failed:', err.message)
    res.status(500).json({ error: safeError(err, 'Proposal execution failed') })
  }
})

export default router
