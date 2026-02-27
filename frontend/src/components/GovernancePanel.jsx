import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Vote, Plus, Clock, CheckCircle2, XCircle, Users, Shield, Coins, FileText, AlertTriangle, ChevronDown, Loader2 } from 'lucide-react'

const PROPOSAL_TYPES = [
  { id: 'setFee', label: 'Update Fee', icon: Coins, description: 'Change verification or issuance fee' },
  { id: 'withdraw', label: 'Treasury Withdrawal', icon: Coins, description: 'Withdraw FLOW from treasury' },
  { id: 'addVerifier', label: 'Add Verifier', icon: Shield, description: 'Add trusted KYC verifier' },
  { id: 'setRule', label: 'Update Rule', icon: FileText, description: 'Change jurisdiction rule' },
  { id: 'revoke', label: 'Emergency Revoke', icon: AlertTriangle, description: 'Revoke a credential' },
]

const STATUS_STYLES = {
  pending: { label: 'Pending', color: 'amber', icon: Clock },
  approved: { label: 'Approved', color: 'emerald', icon: CheckCircle2 },
  executed: { label: 'Executed', color: 'cyan', icon: CheckCircle2 },
  expired: { label: 'Expired', color: 'white', icon: XCircle },
  rejected: { label: 'Rejected', color: 'red', icon: XCircle },
}

// Demo proposals for display
const DEMO_PROPOSALS = [
  {
    id: 0,
    proposer: '0x93c6...5493',
    action: 'setFee',
    description: 'Increase verification fee to 0.002 FLOW',
    data: { newFee: '0.002' },
    approvals: ['0x93c6...5493'],
    status: 'pending',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    expiresAt: new Date(Date.now() + 518400000).toISOString(),
  },
  {
    id: 1,
    proposer: '0x93c6...5493',
    action: 'addVerifier',
    description: 'Add Veriff as trusted KYC verifier',
    data: { verifierName: 'Veriff', publicKey: '0xabc...' },
    approvals: ['0x93c6...5493', '0xdef0...1234'],
    status: 'executed',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    expiresAt: new Date(Date.now() + 432000000).toISOString(),
  },
  {
    id: 2,
    proposer: '0xdef0...1234',
    action: 'withdraw',
    description: 'Withdraw 5.0 FLOW from treasury for operations',
    data: { amount: '5.0' },
    approvals: ['0xdef0...1234'],
    status: 'pending',
    createdAt: new Date(Date.now() - 43200000).toISOString(),
    expiresAt: new Date(Date.now() + 561600000).toISOString(),
  },
]

export default function GovernancePanel() {
  const [proposals, setProposals] = useState(DEMO_PROPOSALS)
  const [showCreate, setShowCreate] = useState(false)
  const [newAction, setNewAction] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [creating, setCreating] = useState(false)
  const [approving, setApproving] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [stats, setStats] = useState({
    totalSigners: 3,
    requiredApprovals: 2,
    treasuryBalance: '12.450',
  })

  const handleCreate = async () => {
    if (!newAction || !newDescription) return
    setCreating(true)
    await new Promise(r => setTimeout(r, 800))

    const proposal = {
      id: proposals.length,
      proposer: '0x93c6...5493',
      action: newAction,
      description: newDescription,
      data: {},
      approvals: ['0x93c6...5493'],
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 604800000).toISOString(),
    }
    setProposals(prev => [proposal, ...prev])
    setNewAction('')
    setNewDescription('')
    setShowCreate(false)
    setCreating(false)
  }

  const handleApprove = async (id) => {
    setApproving(id)
    await new Promise(r => setTimeout(r, 600))

    setProposals(prev => prev.map(p => {
      if (p.id === id && p.status === 'pending') {
        const updated = { ...p, approvals: [...p.approvals, '0xYOUR...ADDR'] }
        if (updated.approvals.length >= stats.requiredApprovals) {
          updated.status = 'approved'
        }
        return updated
      }
      return p
    }))
    setApproving(null)
  }

  const pending = proposals.filter(p => p.status === 'pending')
  const executed = proposals.filter(p => p.status === 'executed')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Vote className="w-5 h-5 text-violet-400" />
            Governance
          </h3>
          <p className="text-[12px] text-white/30 mt-0.5">Multi-sig proposals for admin operations</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-violet-500/30 bg-violet-500/[0.06] text-[12px] font-medium text-violet-400 hover:bg-violet-500/[0.1] transition-all"
        >
          <Plus className="w-3.5 h-3.5" /> New Proposal
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Signers', value: stats.totalSigners, icon: Users, color: 'violet' },
          { label: 'Quorum', value: `${stats.requiredApprovals}-of-${stats.totalSigners}`, icon: Shield, color: 'emerald' },
          { label: 'Treasury', value: `${stats.treasuryBalance} FLOW`, icon: Coins, color: 'cyan' },
        ].map((stat, i) => (
          <div
            key={i}
            className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 flex items-center gap-3"
          >
            <stat.icon className={`w-4 h-4 text-${stat.color}-400/60`} />
            <div>
              <p className="text-[14px] font-bold text-white">{stat.value}</p>
              <p className="text-[10px] text-white/25">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Create proposal form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-violet-500/20 bg-violet-500/[0.03] p-4 space-y-4">
              <p className="text-[12px] font-semibold text-violet-400">Create Proposal</p>

              {/* Action type */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PROPOSAL_TYPES.map(type => (
                  <button
                    key={type.id}
                    onClick={() => setNewAction(type.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all ${
                      newAction === type.id
                        ? 'border-violet-500/30 bg-violet-500/[0.08]'
                        : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1]'
                    }`}
                  >
                    <type.icon className={`w-3.5 h-3.5 ${newAction === type.id ? 'text-violet-400' : 'text-white/30'}`} />
                    <div>
                      <p className={`text-[11px] font-medium ${newAction === type.id ? 'text-violet-400' : 'text-white/50'}`}>
                        {type.label}
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Description */}
              <input
                type="text"
                placeholder="Describe this proposal..."
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                className="w-full h-10 bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 text-[13px] text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/30 transition-colors"
              />

              <div className="flex gap-2">
                <button
                  onClick={handleCreate}
                  disabled={!newAction || !newDescription || creating}
                  className="px-4 py-2 rounded-lg bg-violet-500 text-white text-[12px] font-medium hover:bg-violet-600 transition-colors disabled:opacity-30"
                >
                  {creating ? (
                    <span className="flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating...</span>
                  ) : 'Submit Proposal'}
                </button>
                <button
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 rounded-lg border border-white/[0.06] text-white/40 text-[12px] hover:text-white/60 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Proposals list */}
      <div className="space-y-2">
        <p className="text-[10px] text-white/25 uppercase tracking-wider font-semibold px-1">
          Proposals ({proposals.length})
        </p>
        {proposals.map((p, i) => {
          const statusStyle = STATUS_STYLES[p.status] || STATUS_STYLES.pending
          const StatusIcon = statusStyle.icon
          const proposalType = PROPOSAL_TYPES.find(t => t.id === p.action)
          const ActionIcon = proposalType?.icon || FileText
          const isExpanded = expandedId === p.id

          return (
            <motion.div
              key={p.id}
              className="rounded-lg border border-white/[0.06] bg-white/[0.02] overflow-hidden"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : p.id)}
                className="w-full flex items-center gap-3 p-3.5 hover:bg-white/[0.02] transition-colors text-left"
              >
                <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0">
                  <ActionIcon className="w-3.5 h-3.5 text-white/40" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-white/70 truncate">{p.description}</p>
                  <p className="text-[10px] text-white/25">
                    by {p.proposer} · {p.approvals.length} approval{p.approvals.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-semibold tracking-wide uppercase bg-${statusStyle.color}-500/10 text-${statusStyle.color}-400 border border-${statusStyle.color}-500/20`}>
                  <StatusIcon className="w-2.5 h-2.5" />
                  {statusStyle.label}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-white/20 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3.5 pb-3.5 pt-0 space-y-3 border-t border-white/[0.04]">
                      <div className="grid grid-cols-2 gap-3 pt-3">
                        <div>
                          <p className="text-[10px] text-white/25 mb-0.5">Action</p>
                          <p className="text-[12px] text-white/60">{proposalType?.label || p.action}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-white/25 mb-0.5">Approvals</p>
                          <p className="text-[12px] text-white/60">{p.approvals.length} / {stats.requiredApprovals} required</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-white/25 mb-0.5">Created</p>
                          <p className="text-[12px] text-white/60">{new Date(p.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-white/25 mb-0.5">Expires</p>
                          <p className="text-[12px] text-white/60">{new Date(p.expiresAt).toLocaleDateString()}</p>
                        </div>
                      </div>

                      {/* Approvers */}
                      <div>
                        <p className="text-[10px] text-white/25 mb-1">Approvers</p>
                        <div className="flex flex-wrap gap-1.5">
                          {p.approvals.map((addr, j) => (
                            <span key={j} className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/[0.06] text-emerald-400/60 border border-emerald-500/15">
                              {addr}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      {p.status === 'pending' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(p.id)}
                            disabled={approving === p.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/[0.08] border border-emerald-500/20 text-[11px] font-medium text-emerald-400 hover:bg-emerald-500/[0.15] transition-all disabled:opacity-50"
                          >
                            {approving === p.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3 h-3" />
                            )}
                            Approve
                          </button>
                          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.06] text-[11px] text-white/30 hover:text-white/50 transition-colors">
                            <XCircle className="w-3 h-3" /> Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
