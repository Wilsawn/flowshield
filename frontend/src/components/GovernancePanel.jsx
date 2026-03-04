import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Vote, Plus, Clock, CheckCircle2, XCircle, Users, Shield, Coins, FileText, AlertTriangle, ChevronDown, Loader2 } from 'lucide-react'
import { API } from '@/lib/api'

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
  executed: { label: 'Executed', color: 'emerald', icon: CheckCircle2 },
  expired: { label: 'Expired', color: 'white', icon: XCircle },
  rejected: { label: 'Rejected', color: 'red', icon: XCircle },
}

export default function GovernancePanel() {
  const [proposals, setProposals] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [newAction, setNewAction] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [creating, setCreating] = useState(false)
  const [approving, setApproving] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState(null)
  const [stats, setStats] = useState({
    totalSigners: 0,
    requiredApprovals: 1,
  })

  // Fetch real governance data from chain on mount
  useEffect(() => {
    async function fetchGovernance() {
      try {
        const [statsRes, proposalsRes] = await Promise.allSettled([
          fetch(`${API}/api/governance/stats`).then(r => r.json()),
          fetch(`${API}/api/governance/proposals`).then(r => r.json()),
        ])
        if (statsRes.status === 'fulfilled' && statsRes.value.source === 'flow-testnet') {
          setStats({
            totalSigners: statsRes.value.totalSigners || 0,
            requiredApprovals: statsRes.value.requiredApprovals || 1,
          })
        }
        if (proposalsRes.status === 'fulfilled' && proposalsRes.value.proposals) {
          // Convert timestamps from UFix64 (seconds) to ISO strings for display
          const mapped = proposalsRes.value.proposals.map(p => ({
            ...p,
            createdAt: p.createdAt > 1e9 ? new Date(p.createdAt * 1000).toISOString() : new Date(p.createdAt).toISOString(),
            expiresAt: p.expiresAt > 1e9 ? new Date(p.expiresAt * 1000).toISOString() : new Date(p.expiresAt).toISOString(),
            approvals: (p.approvals || []).map(a => `${a.slice(0, 6)}...${a.slice(-4)}`),
            proposer: p.proposer ? `${p.proposer.slice(0, 6)}...${p.proposer.slice(-4)}` : '—',
          }))
          setProposals(mapped)
        }
      } catch {
        // API unavailable — show empty state
      }
      setLoading(false)
    }
    fetchGovernance()
  }, [])

  const refetchProposals = async () => {
    try {
      const [statsRes, proposalsRes] = await Promise.allSettled([
        fetch(`${API}/api/governance/stats`).then(r => r.json()),
        fetch(`${API}/api/governance/proposals`).then(r => r.json()),
      ])
      if (statsRes.status === 'fulfilled' && statsRes.value.source === 'flow-testnet') {
        setStats({ totalSigners: statsRes.value.totalSigners || 0, requiredApprovals: statsRes.value.requiredApprovals || 1 })
      }
      if (proposalsRes.status === 'fulfilled' && proposalsRes.value.proposals) {
        const mapped = proposalsRes.value.proposals.map(p => ({
          ...p,
          createdAt: p.createdAt > 1e9 ? new Date(p.createdAt * 1000).toISOString() : new Date(p.createdAt).toISOString(),
          expiresAt: p.expiresAt > 1e9 ? new Date(p.expiresAt * 1000).toISOString() : new Date(p.expiresAt).toISOString(),
          approvals: (p.approvals || []).map(a => `${a.slice(0, 6)}...${a.slice(-4)}`),
          proposer: p.proposer ? `${p.proposer.slice(0, 6)}...${p.proposer.slice(-4)}` : '—',
        }))
        setProposals(mapped)
      }
    } catch { /* ignore */ }
  }

  const handleCreate = async () => {
    if (!newAction || !newDescription) return
    setCreating(true)
    try {
      // Ensure deployer is set up as a signer first
      await fetch(`${API}/api/governance/setup`, { method: 'POST' })

      const res = await fetch(`${API}/api/governance/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: newAction, description: newDescription, data: {} }),
      })
      const result = await res.json()

      if (result.success) {
        setNotice(`Proposal created on-chain. Tx: ${result.txId.slice(0, 16)}...`)
        await refetchProposals()
      } else {
        setNotice(`Failed: ${result.error}`)
      }
    } catch (err) {
      setNotice(`Network error: ${err.message}`)
    }
    setCreating(false)
    setShowCreate(false)
    setNewAction('')
    setNewDescription('')
    setTimeout(() => setNotice(null), 8000)
  }

  const handleApprove = async (id) => {
    setApproving(id)
    try {
      const res = await fetch(`${API}/api/governance/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposalId: id }),
      })
      const result = await res.json()

      if (result.success) {
        setNotice(`Proposal #${id} approved on-chain. Tx: ${result.txId.slice(0, 16)}...`)
        await refetchProposals()
      } else {
        setNotice(`Failed: ${result.error}`)
      }
    } catch (err) {
      setNotice(`Network error: ${err.message}`)
    }
    setApproving(null)
    setTimeout(() => setNotice(null), 8000)
  }

  const pending = proposals.filter(p => p.status === 'pending')
  const executed = proposals.filter(p => p.status === 'executed')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Vote className="w-5 h-5 text-emerald-400" />
            Governance
          </h3>
          <p className="text-[12px] text-white/30 mt-0.5">Multi-sig proposals for admin operations</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-emerald-500/30 bg-emerald-500/[0.06] text-[12px] font-medium text-emerald-400 hover:bg-emerald-500/[0.1] transition-all"
        >
          <Plus className="w-3.5 h-3.5" /> New Proposal
        </button>
      </div>

      {/* Notice banner */}
      <AnimatePresence>
        {notice && (
          <motion.div
            className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/20 bg-amber-500/[0.04]"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-white/50 leading-relaxed flex-1">{notice}</p>
            <button onClick={() => setNotice(null)} className="text-white/20 hover:text-white/40 transition-colors shrink-0">
              <XCircle className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Signers', value: stats.totalSigners, icon: Users, color: 'emerald' },
          { label: 'Quorum', value: `${stats.requiredApprovals}-of-${stats.totalSigners}`, icon: Shield, color: 'emerald' },
          { label: 'Proposals', value: proposals.length, icon: FileText, color: 'emerald' },
        ].map((stat, i) => (
          <div
            key={i}
            className="rounded-lg border border-emerald-500/[0.08] bg-white/[0.02] p-3 flex items-center gap-3"
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
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] p-4 space-y-4">
              <p className="text-[12px] font-semibold text-emerald-400">Create Proposal</p>

              {/* Action type */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PROPOSAL_TYPES.map(type => (
                  <button
                    key={type.id}
                    onClick={() => setNewAction(type.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all ${
                      newAction === type.id
                        ? 'border-emerald-500/30 bg-emerald-500/[0.08]'
                        : 'border-emerald-500/[0.08] bg-white/[0.02] hover:border-emerald-500/[0.12]'
                    }`}
                  >
                    <type.icon className={`w-3.5 h-3.5 ${newAction === type.id ? 'text-emerald-400' : 'text-white/30'}`} />
                    <div>
                      <p className={`text-[11px] font-medium ${newAction === type.id ? 'text-emerald-400' : 'text-white/50'}`}>
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
                className="w-full h-10 bg-white/[0.03] border border-emerald-500/[0.08] rounded-lg px-3 text-[13px] text-white placeholder:text-white/20 focus:outline-none focus:border-emerald-500/30 transition-colors"
              />

              <div className="flex gap-2">
                <button
                  onClick={handleCreate}
                  disabled={!newAction || !newDescription || creating}
                  className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-[12px] font-medium hover:bg-emerald-600 transition-colors disabled:opacity-30"
                >
                  {creating ? (
                    <span className="flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating...</span>
                  ) : 'Submit Proposal'}
                </button>
                <button
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 rounded-lg border border-emerald-500/[0.08] text-white/40 text-[12px] hover:text-white/60 transition-colors"
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
              className="rounded-lg border border-emerald-500/[0.08] bg-white/[0.02] overflow-hidden"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : p.id)}
                className="w-full flex items-center gap-3 p-3.5 hover:bg-white/[0.02] transition-colors text-left"
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-500/[0.04] border border-emerald-500/[0.08] flex items-center justify-center shrink-0">
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
                    <div className="px-3.5 pb-3.5 pt-0 space-y-3 border-t border-emerald-500/[0.06]">
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
                          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/[0.08] text-[11px] text-white/30 hover:text-white/50 transition-colors">
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
