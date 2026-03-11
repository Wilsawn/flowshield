import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Vote, Plus, Clock, CheckCircle2, XCircle, Users, Shield, Coins, FileText, AlertTriangle, ChevronDown, Loader2, ExternalLink, Activity, Play, Ban } from 'lucide-react'
import { API } from '@/lib/api'
import { authFetch } from '@/lib/utils'

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

const FLOWSCAN_BASE = 'https://testnet.flowscan.io/tx'

// ── ExpiryCountdown: uses real on-chain block timestamp ──
function ExpiryCountdown({ expiresAtSeconds }) {
  const [remaining, setRemaining] = useState(null)
  const [blockInfo, setBlockInfo] = useState(null)

  const fetchBlockTime = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/chain/blocks/latest`)
      const data = await res.json()
      const blockTimestamp = parseFloat(data.timestamp || data.block?.timestamp || '0')
      const blockHeight = data.height || data.block?.height || '?'
      if (blockTimestamp > 0) {
        setBlockInfo({ height: blockHeight })
        setRemaining(expiresAtSeconds - blockTimestamp)
      }
    } catch { /* ignore */ }
  }, [expiresAtSeconds])

  useEffect(() => {
    fetchBlockTime()
    const interval = setInterval(fetchBlockTime, 60000) // Re-sync every 60s
    return () => clearInterval(interval)
  }, [fetchBlockTime])

  // Local tick every second between block fetches
  useEffect(() => {
    if (remaining === null) return
    const tick = setInterval(() => setRemaining(r => r - 1), 1000)
    return () => clearInterval(tick)
  }, [remaining !== null]) // eslint-disable-line react-hooks/exhaustive-deps

  if (remaining === null) return null

  if (remaining <= 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-red-400 font-medium">
        <Clock className="w-2.5 h-2.5" /> Expired
      </span>
    )
  }

  const days = Math.floor(remaining / 86400)
  const hours = Math.floor((remaining % 86400) / 3600)
  const mins = Math.floor((remaining % 3600) / 60)

  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-amber-400/70 font-mono" title={blockInfo ? `Block #${blockInfo.height}` : ''}>
      <Clock className="w-2.5 h-2.5" />
      {days > 0 ? `${days}d ` : ''}{hours}h {mins}m
      {blockInfo && <span className="text-white/15 ml-1">B#{String(blockInfo.height).slice(-5)}</span>}
    </span>
  )
}

// ── Linkify tx hashes in notice text ──
function NoticeText({ text }) {
  const txMatch = text.match(/Tx:\s*([a-f0-9]{16,64})/i)
  if (!txMatch) return <span>{text}</span>
  const txId = txMatch[1]
  const parts = text.split(txMatch[0])
  return (
    <span>
      {parts[0]}
      Tx: <a href={`${FLOWSCAN_BASE}/${txId}`} target="_blank" rel="noopener noreferrer" className="text-emerald-400 underline underline-offset-2 hover:text-emerald-300">{txId.slice(0, 16)}...</a>
      {parts[1] || ''}
    </span>
  )
}

export default function GovernancePanel() {
  const [proposals, setProposals] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [newAction, setNewAction] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [creating, setCreating] = useState(false)
  const [approving, setApproving] = useState(null)
  const [rejecting, setRejecting] = useState(null)
  const [executing, setExecuting] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState(null)
  const [stats, setStats] = useState({
    totalSigners: 0,
    requiredApprovals: 1,
  })
  const [activities, setActivities] = useState([])
  const [showActivity, setShowActivity] = useState(false)

  // ── Map proposals from API response ──
  const mapProposals = (raw) =>
    (raw || []).map(p => ({
      ...p,
      rawExpiresAt: p.expiresAt, // keep raw UFix64 seconds for countdown
      createdAt: p.createdAt > 1e9 ? new Date(p.createdAt * 1000).toISOString() : new Date(p.createdAt).toISOString(),
      expiresAt: p.expiresAt > 1e9 ? new Date(p.expiresAt * 1000).toISOString() : new Date(p.expiresAt).toISOString(),
      approvals: (p.approvals || []).map(a => `${a.slice(0, 6)}...${a.slice(-4)}`),
      proposer: p.proposer ? `${p.proposer.slice(0, 6)}...${p.proposer.slice(-4)}` : '\u2014',
    }))

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
          setProposals(mapProposals(proposalsRes.value.proposals))
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
        setProposals(mapProposals(proposalsRes.value.proposals))
      }
    } catch { /* ignore */ }
  }

  const fetchActivity = async () => {
    try {
      const res = await fetch(`${API}/api/governance/activity`)
      const data = await res.json()
      setActivities(data.activities || [])
    } catch { /* ignore */ }
  }

  const handleCreate = async () => {
    if (!newAction || !newDescription) return
    setCreating(true)
    try {
      // Ensure deployer is set up as a signer first
      await authFetch(`${API}/api/governance/setup`, { method: 'POST' })

      const res = await authFetch(`${API}/api/governance/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: newAction, description: newDescription, data: {} }),
      })
      const result = await res.json()

      if (result.success) {
        setNotice(`Proposal created on-chain. Tx: ${result.txId}`)
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
    setTimeout(() => setNotice(null), 10000)
  }

  const handleApprove = async (id) => {
    setApproving(id)
    try {
      const res = await authFetch(`${API}/api/governance/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposalId: id }),
      })
      const result = await res.json()

      if (result.success) {
        if (result.autoExecuted) {
          setNotice(`Proposal #${id} approved & auto-executed on-chain! Tx: ${result.executionTxId || result.txId}`)
        } else {
          setNotice(`Proposal #${id} approved on-chain. Tx: ${result.txId}`)
        }
        await refetchProposals()
      } else {
        setNotice(`Failed: ${result.error}`)
      }
    } catch (err) {
      setNotice(`Network error: ${err.message}`)
    }
    setApproving(null)
    setTimeout(() => setNotice(null), 10000)
  }

  const handleReject = async (id) => {
    setRejecting(id)
    try {
      const res = await authFetch(`${API}/api/governance/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposalId: id, reason: 'Rejected by governance signer' }),
      })
      const result = await res.json()

      if (result.success) {
        setNotice(`Proposal #${id} rejected.`)
        await refetchProposals()
      } else {
        setNotice(`Failed: ${result.error}`)
      }
    } catch (err) {
      setNotice(`Network error: ${err.message}`)
    }
    setRejecting(null)
    setTimeout(() => setNotice(null), 8000)
  }

  const handleExecute = async (id) => {
    setExecuting(id)
    try {
      const res = await authFetch(`${API}/api/governance/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposalId: id }),
      })
      const result = await res.json()

      if (result.success) {
        setNotice(`Proposal #${id} executed on-chain! Tx: ${result.markTxId}`)
        await refetchProposals()
      } else {
        setNotice(`Failed: ${result.error}`)
      }
    } catch (err) {
      setNotice(`Network error: ${err.message}`)
    }
    setExecuting(null)
    setTimeout(() => setNotice(null), 10000)
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
        <div className="flex gap-2">
          <button
            onClick={() => { setShowActivity(!showActivity); if (!showActivity) fetchActivity() }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-emerald-500/[0.15] bg-white/[0.02] text-[12px] font-medium text-white/40 hover:text-white/60 hover:bg-white/[0.04] transition-all"
          >
            <Activity className="w-3.5 h-3.5" /> Activity
          </button>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-emerald-500/30 bg-emerald-500/[0.06] text-[12px] font-medium text-emerald-400 hover:bg-emerald-500/[0.1] transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> New Proposal
          </button>
        </div>
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
            <p className="text-xs text-white/50 leading-relaxed flex-1">
              <NoticeText text={notice} />
            </p>
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

      {/* Activity feed */}
      <AnimatePresence>
        {showActivity && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-emerald-500/[0.08] bg-white/[0.02] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-semibold text-emerald-400 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" /> On-Chain Activity
                </p>
                <button onClick={() => setShowActivity(false)} className="text-white/20 hover:text-white/40">
                  <XCircle className="w-3.5 h-3.5" />
                </button>
              </div>

              {activities.length === 0 ? (
                <p className="text-[11px] text-white/25 py-2">No recent governance events found on-chain.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {activities.map((evt, i) => (
                    <div key={i} className="flex items-center gap-3 py-1.5 border-b border-white/[0.03] last:border-0">
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        evt.type === 'ProposalCreated' ? 'bg-blue-500/10 text-blue-400' :
                        evt.type === 'ProposalApproved' ? 'bg-amber-500/10 text-amber-400' :
                        'bg-emerald-500/10 text-emerald-400'
                      }`}>
                        {evt.type.replace('Proposal', '')}
                      </span>
                      <span className="text-[10px] text-white/30 font-mono">
                        Block {evt.blockHeight}
                      </span>
                      <a
                        href={evt.flowscanUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto flex items-center gap-1 text-[10px] text-emerald-400/60 hover:text-emerald-400 transition-colors"
                      >
                        <ExternalLink className="w-2.5 h-2.5" /> Flowscan
                      </a>
                    </div>
                  ))}
                </div>
              )}
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
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-[10px] text-white/25">
                      by {p.proposer} · {p.approvals.length} approval{p.approvals.length !== 1 ? 's' : ''}
                    </p>
                    {p.status === 'pending' && p.rawExpiresAt && (
                      <ExpiryCountdown expiresAtSeconds={p.rawExpiresAt} />
                    )}
                  </div>
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

                      {/* Rejection reason */}
                      {p.status === 'rejected' && p.rejectionReason && (
                        <div className="rounded-lg bg-red-500/[0.05] border border-red-500/15 p-2.5">
                          <p className="text-[10px] text-red-400/70">{p.rejectionReason}</p>
                        </div>
                      )}

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

                      {/* Actions for pending proposals */}
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
                          <button
                            onClick={() => handleReject(p.id)}
                            disabled={rejecting === p.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/20 bg-red-500/[0.05] text-[11px] text-red-400/70 hover:text-red-400 hover:bg-red-500/[0.1] transition-all disabled:opacity-50"
                          >
                            {rejecting === p.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Ban className="w-3 h-3" />
                            )}
                            Reject
                          </button>
                        </div>
                      )}

                      {/* Execute button for approved proposals */}
                      {p.status === 'approved' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleExecute(p.id)}
                            disabled={executing === p.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/[0.12] border border-emerald-500/25 text-[11px] font-medium text-emerald-400 hover:bg-emerald-500/[0.2] transition-all disabled:opacity-50"
                          >
                            {executing === p.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Play className="w-3 h-3" />
                            )}
                            Execute
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
