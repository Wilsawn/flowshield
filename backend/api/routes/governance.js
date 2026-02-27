// routes/governance.js
// Governance API routes — reads real proposal data from on-chain Governance contract.

import { Router } from 'express'

const router = Router()

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
    res.status(500).json({ error: err.message, source: 'error' })
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
    res.status(500).json({ error: err.message, source: 'error' })
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
    res.status(500).json({ error: err.message, source: 'error' })
  }
})

export default router
