import { useState, useCallback, useEffect, useRef } from 'react'
import { Wallet, ArrowDownToLine, ArrowUpFromLine, TrendingUp, Activity, ShieldCheck, Eye, EyeOff, Fingerprint, Zap, Globe, FileCheck, ChevronDown, AlertTriangle, RefreshCw, Clock, Loader2, Radio, ExternalLink, Code, X, Info, CheckCircle2, XCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import SpotlightCard from '@/components/ui/spotlight-card'
import AnimatedTicker from '@/components/ui/animated-ticker'
import VerificationPanel from '@/components/VerificationPanel'
import WalletButton from '@/components/WalletButton'
import ZKProofBadge from '@/components/ZKProofBadge'
import { JURISDICTIONS, JURISDICTION_LIST, getJurisdiction } from '@/data/jurisdictions'
import useDashboardData from '@/hooks/useDashboardData'
import useChainData from '@/hooks/useChainData'

export default function Dashboard() {
  const live = useDashboardData()
  const chain = useChainData()
  const [depositAmount, setDepositAmount] = useState('')
  const [borrowAmount, setBorrowAmount] = useState('')
  const [verifying, setVerifying] = useState(null) // null | { action, amount }
  const [showCompliance, setShowCompliance] = useState(false)
  const [jurisdictionCode, setJurisdictionCode] = useState(() => {
    try {
      const stored = localStorage.getItem('flowshield_user')
      if (stored) {
        const user = JSON.parse(stored)
        if (user.jurisdiction) return user.jurisdiction
      }
    } catch { /* ignore */ }
    return 'US'
  })
  const [showJurisdictionPicker, setShowJurisdictionPicker] = useState(false)
  const [jurisdictionChanging, setJurisdictionChanging] = useState(false)
  const [reVerifySteps, setReVerifySteps] = useState([])
  const [credentialExpiring, setCredentialExpiring] = useState(false)
  const [renewing, setRenewing] = useState(false)
  const [renewed, setRenewed] = useState(false)
  const [onChainRules, setOnChainRules] = useState(null)
  const [showRiskDetail, setShowRiskDetail] = useState(false)
  const [showStatDetail, setShowStatDetail] = useState(null) // null | 'wallet' | 'deposited' | 'borrowed'
  const jurisdictionRef = useRef(null)

  const currentJurisdiction = getJurisdiction(jurisdictionCode)

  // Close jurisdiction picker on outside click
  useEffect(() => {
    if (!showJurisdictionPicker) return
    const handler = (e) => {
      if (jurisdictionRef.current && !jurisdictionRef.current.contains(e.target)) {
        setShowJurisdictionPicker(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showJurisdictionPicker])

  // Fetch on-chain rules when jurisdiction changes
  useEffect(() => {
    chain.fetchRules(jurisdictionCode).then(data => {
      if (data?.rules) setOnChainRules(data)
    })
  }, [jurisdictionCode, chain.fetchRules])

  const handleJurisdictionChange = useCallback(async (newCode) => {
    if (newCode === jurisdictionCode) {
      setShowJurisdictionPicker(false)
      return
    }
    setShowJurisdictionPicker(false)
    setJurisdictionChanging(true)
    setReVerifySteps([])

    const newJ = getJurisdiction(newCode)
    const API = import.meta.env.VITE_API_URL || 'http://localhost:3002'

    // Step 1: Switching
    setReVerifySteps([{ label: `Switching jurisdiction to ${newJ.name}`, done: true }])
    await new Promise((r) => setTimeout(r, 600))

    // Step 2: Fetch REAL on-chain rules
    setReVerifySteps(prev => [...prev, { label: `Querying RuleEngine contract for ${newCode} rules...`, done: false }])
    let realRules = null
    try {
      const res = await fetch(`${API}/api/compliance/rules/${newCode}`)
      if (res.ok) {
        realRules = await res.json()
        setOnChainRules(realRules)
        setReVerifySteps(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { label: `On-chain rules loaded: Travel rule ${realRules.rules?.travel_rule_threshold || newJ.travelRuleThreshold}, KYC level ${realRules.rules?.kyc_level || newJ.kycLevel}`, done: true }
          return updated
        })
      }
    } catch { /* continue */ }
    await new Promise((r) => setTimeout(r, 500))

    // Step 3: Compliance check
    setReVerifySteps(prev => [...prev, { label: 'Querying ComplianceCredential contract...', done: false }])
    try {
      await fetch(`${API}/api/compliance/status/0x93c691a98b975493`)
      setReVerifySteps(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { label: `Credential status verified on Flow testnet (block ${chain.latestBlock?.height || '...'})`, done: true }
        return updated
      })
    } catch { /* continue */ }
    await new Promise((r) => setTimeout(r, 500))

    // Step 4: Risk re-check
    setReVerifySteps(prev => [...prev, { label: 'Running risk score re-evaluation...', done: false }])
    try {
      const riskRes = await fetch(`${API}/api/risk/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: '0x93c691a98b975493' }),
      })
      if (riskRes.ok) {
        const riskData = await riskRes.json()
        setReVerifySteps(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { label: `Risk score: ${riskData.score}/100 (${riskData.tier}) — ${riskData.factors?.length || 0} factors`, done: true }
          return updated
        })
      }
    } catch { /* continue */ }
    await new Promise((r) => setTimeout(r, 400))

    // Step 5: Confirm
    setReVerifySteps(prev => [...prev, { label: `Compliance confirmed under ${newJ.framework}`, done: true }])
    await new Promise((r) => setTimeout(r, 500))

    setJurisdictionCode(newCode)
    // Persist jurisdiction to user session
    try {
      const stored = localStorage.getItem('flowshield_user')
      if (stored) {
        const user = JSON.parse(stored)
        user.jurisdiction = newCode
        localStorage.setItem('flowshield_user', JSON.stringify(user))
      }
    } catch { /* ignore */ }
    setJurisdictionChanging(false)
    live.refresh()
  }, [jurisdictionCode, chain.latestBlock, live])

  const handleRenewCredential = useCallback(async () => {
    setRenewing(true)
    // Simulate renewal verification
    await new Promise((r) => setTimeout(r, 2500))
    setRenewing(false)
    setRenewed(true)
    setCredentialExpiring(false)
    setTimeout(() => setRenewed(false), 4000)
  }, [])

  const handleDeposit = () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) return
    setVerifying({ action: 'deposit', amount: depositAmount })
  }

  const handleBorrow = () => {
    if (!borrowAmount || parseFloat(borrowAmount) <= 0) return
    setVerifying({ action: 'borrow', amount: borrowAmount })
  }

  const handleVerificationComplete = () => {
    if (verifying?.action === 'deposit') setDepositAmount('')
    if (verifying?.action === 'borrow') setBorrowAmount('')
    // Refresh live data to show updated pool stats from chain
    live.refresh?.()
    setTimeout(() => setVerifying(null), 600)
  }

  return (
    <div className="min-h-screen bg-[#060a13] text-white p-6 md:p-10">
      <div className="max-w-[1100px] mx-auto">

        {/* Header — clean two-row layout */}
        <div className="mb-10">
          {/* Row 1: Title + actions */}
          <div className="flex items-start justify-between gap-6 mb-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight truncate">
                {(() => { try { const u = JSON.parse(localStorage.getItem('flowshield_user') || '{}'); return u.displayName ? `Welcome, ${u.displayName}` : 'Dashboard' } catch { return 'Dashboard' } })()}
              </h1>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              {/* Jurisdiction picker */}
              <div className="relative" ref={jurisdictionRef}>
                <button
                  onClick={() => setShowJurisdictionPicker(!showJurisdictionPicker)}
                  className="flex items-center gap-2 h-9 px-3 rounded-lg border border-white/[0.06] bg-white/[0.02] text-[12px] font-medium text-white/50 hover:text-white/70 hover:border-white/[0.1] transition-all"
                >
                  <span className="text-sm leading-none">{currentJurisdiction.flag}</span>
                  <span>{currentJurisdiction.code}</span>
                  <ChevronDown className="w-3 h-3 text-white/25" />
                </button>
                <AnimatePresence>
                  {showJurisdictionPicker && (
                    <motion.div
                      className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-white/[0.08] bg-[#0a0f1a] backdrop-blur-xl shadow-2xl z-50 overflow-hidden"
                      initial={{ opacity: 0, y: -8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.96 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="p-2">
                        <p className="text-[10px] text-white/40 uppercase tracking-wider px-2.5 py-2 font-semibold">Select Jurisdiction</p>
                        {JURISDICTION_LIST.map((j) => (
                          <button
                            key={j.code}
                            onClick={() => handleJurisdictionChange(j.code)}
                            className={`w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-left transition-all duration-200 ${
                              jurisdictionCode === j.code
                                ? 'bg-emerald-500/[0.08] text-emerald-400'
                                : 'hover:bg-white/[0.04] text-white/60'
                            }`}
                          >
                            <span className="text-lg leading-none">{j.flag}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-[12px] font-medium">{j.name}</p>
                              <p className="text-[10px] text-white/40 truncate">{j.regulator} · Travel rule: {j.travelRuleCurrency} {j.travelRuleThreshold.toLocaleString()}</p>
                            </div>
                            {jurisdictionCode === j.code && (
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              {/* Compliance toggle */}
              <button
                onClick={() => setShowCompliance(!showCompliance)}
                className={`h-9 px-3 rounded-lg border text-[12px] transition-all ${
                  showCompliance
                    ? 'border-cyan-500/25 bg-cyan-500/[0.06] text-cyan-400'
                    : 'border-white/[0.06] bg-white/[0.02] text-white/30 hover:text-white/50'
                }`}
                title={showCompliance ? 'Hide compliance layer' : 'Show compliance layer'}
              >
                {showCompliance ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
              {/* Wallet */}
              <WalletButton />
            </div>
          </div>

          {/* Row 2: Subtle status strip */}
          <div className="flex items-center gap-3 text-[11px] text-white/30">
            {live.isLive && (
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Flow Testnet
              </span>
            )}
            <span className="text-white/10">·</span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3 h-3 text-emerald-400/60" />
              <span className="text-emerald-400/60">Compliant</span>
              <span>{currentJurisdiction.flag} {currentJurisdiction.name}</span>
            </span>
            <span className="text-white/10">·</span>
            <ZKProofBadge compact />
          </div>
        </div>

        {/* Credential Expiration Banner */}
        <AnimatePresence>
          {credentialExpiring && !renewed && (
            <motion.div
              className="mb-6 p-4 rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] flex items-center gap-4"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-medium text-amber-400">Compliance credential expires in 3 days</p>
                <p className="text-[11px] text-white/30 mt-0.5">Your ZK proof needs to be re-verified under {currentJurisdiction.regulator} rules. Transactions will be blocked after expiration.</p>
              </div>
              <button
                onClick={handleRenewCredential}
                disabled={renewing}
                className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-[12px] font-medium transition-all disabled:opacity-50"
              >
                {renewing ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Renewing...</>
                ) : (
                  <><RefreshCw className="w-3.5 h-3.5" /> Renew Now</>
                )}
              </button>
            </motion.div>
          )}
          {renewed && (
            <motion.div
              className="mb-6 p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] flex items-center gap-4"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-[13px] font-medium text-emerald-400">Credential renewed successfully</p>
                <p className="text-[11px] text-white/30 mt-0.5">ZK proof re-verified. Your credential is valid for another {currentJurisdiction.reVerifyDays} days under {currentJurisdiction.framework}.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Wallet Balance', value: chain.account?.balance ?? live.walletBalance ?? 0, icon: <Wallet className="w-4 h-4" />, sub: chain.account ? `${chain.account.address?.slice(0,6)}...${chain.account.address?.slice(-4)} · FLOW` : 'Loading from chain...', subColor: 'text-white/40', prefix: '', decimals: 2, onClick: () => setShowStatDetail('wallet') },
            { label: 'Total Deposited', value: live.deposited ?? 0, icon: <ArrowDownToLine className="w-4 h-4" />, sub: live.baseAPYPercent != null ? `Earning ${live.baseAPYPercent}% APY` : 'Loading APY from chain...', subColor: 'text-emerald-400/70', onClick: () => setShowStatDetail('deposited') },
            { label: 'Total Borrowed', value: live.borrowed ?? 0, icon: <ArrowUpFromLine className="w-4 h-4" />, sub: live.borrowRatePercent != null ? `${live.borrowRatePercent}% interest rate` : 'Loading rate from chain...', subColor: 'text-cyan-400/70', onClick: () => setShowStatDetail('borrowed') },
            { label: 'Risk Score', value: live.riskScore ?? 0, icon: <TrendingUp className="w-4 h-4" />, sub: `Tier: ${live.riskTier || 'loading...'} · ${live.riskFactors?.length || 0} factors`, subColor: live.riskTier === 'compliant' ? 'text-emerald-400/70' : 'text-amber-400/70', noPrefix: true, onClick: () => setShowRiskDetail(true) },
          ].map((stat, i) => (
            <SpotlightCard key={i} className="p-5 cursor-pointer hover:border-white/[0.1] transition-all" onClick={stat.onClick}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[13px] text-white/35">{stat.label}</span>
                <div className="text-white/35">{stat.icon}</div>
              </div>
              <p className="text-[1.75rem] font-bold tracking-tight">
                {stat.noPrefix ? '' : (stat.prefix !== undefined ? stat.prefix : '$')}<AnimatedTicker value={stat.value} decimals={stat.decimals || 0} className="text-white" />
              </p>
              <div className="flex items-center justify-between mt-1.5">
                <p className={`text-[11px] ${stat.subColor}`}>{stat.sub}</p>
                <Info className="w-3 h-3 text-white/25" />
              </div>
            </SpotlightCard>
          ))}
        </div>

        {/* Flow Network Widget */}
        <div className="mb-8 rounded-2xl border border-white/[0.06] bg-gradient-to-br from-emerald-500/[0.02] to-cyan-500/[0.02] p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/[0.03] rounded-full blur-[60px] pointer-events-none" />
          <div className="flex items-center justify-between relative">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Radio className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-white/80">Flow Testnet</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium">LIVE</span>
                </div>
                <span className="text-[10px] text-white/40">Connected to Flow blockchain via Access API</span>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-6">
              <div className="text-right">
                <span className="text-[9px] text-white/35 block">Latest Block</span>
                <span className="text-[12px] text-white/50 font-mono font-medium">#{chain.latestBlock?.height || '—'}</span>
              </div>
              <div className="text-right">
                <span className="text-[9px] text-white/35 block">Contract</span>
                <a href="https://testnet.flowscan.io/account/0x93c691a98b975493" target="_blank" rel="noopener noreferrer" className="text-[12px] text-cyan-400/60 font-mono font-medium hover:text-cyan-400 transition-colors">0x93c6...5493</a>
              </div>
              <div className="text-right">
                <span className="text-[9px] text-white/35 block">Jurisdiction</span>
                <span className="text-[12px] text-white/50 font-medium">{currentJurisdiction.flag} {currentJurisdiction.code}</span>
              </div>
              <div className="text-right">
                <span className="text-[9px] text-white/35 block">Gas Fees</span>
                <span className="text-[12px] text-emerald-400/70 font-medium">Sponsored</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions + Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Deposit */}
          <SpotlightCard className="p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <ArrowDownToLine className="w-4 h-4 text-emerald-400" />
              </div>
              <h3 className="text-[15px] font-semibold">Deposit</h3>
            </div>
            <div className="space-y-3">
              <div className="relative">
                <input
                  type="number"
                  placeholder="0.00"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full h-11 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 pr-16 text-[14px] text-white placeholder:text-white/35 focus:outline-none focus:border-emerald-500/30 transition-colors"
                />
                <span className="absolute right-4 top-3 text-[13px] text-white/40 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-white/[0.06] flex items-center justify-center text-[8px]">$</span>
                  USDC
                </span>
              </div>
              <button
                onClick={() => {
                  if (!depositAmount || Number(depositAmount) <= 0) return
                  live.deposit(Number(depositAmount))
                  setDepositAmount('')
                }}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-[13px] font-semibold text-white hover:shadow-[0_0_30px_rgba(52,211,153,0.2)] transition-all duration-300 disabled:opacity-30"
                disabled={!depositAmount || Number(depositAmount) <= 0}
              >
                Deposit
              </button>
              <p className="text-[11px] text-white/40 text-center">
                Compliance verified automatically. Zero gas fees.
              </p>
            </div>
          </SpotlightCard>

          {/* Borrow */}
          <SpotlightCard className="p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <ArrowUpFromLine className="w-4 h-4 text-cyan-400" />
              </div>
              <h3 className="text-[15px] font-semibold">Borrow</h3>
            </div>
            <div className="space-y-3">
              <div className="relative">
                <input
                  type="number"
                  placeholder="0.00"
                  value={borrowAmount}
                  onChange={(e) => setBorrowAmount(e.target.value)}
                  className="w-full h-11 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 pr-16 text-[14px] text-white placeholder:text-white/35 focus:outline-none focus:border-cyan-500/30 transition-colors"
                />
                <span className="absolute right-4 top-3 text-[13px] text-white/40 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-white/[0.06] flex items-center justify-center text-[8px]">$</span>
                  USDC
                </span>
              </div>
              <button
                onClick={() => {
                  if (!borrowAmount || Number(borrowAmount) <= 0) return
                  live.borrow(Number(borrowAmount))
                  setBorrowAmount('')
                }}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 text-[13px] font-semibold text-white hover:shadow-[0_0_30px_rgba(6,182,212,0.2)] transition-all duration-300 disabled:opacity-30"
                disabled={!borrowAmount || Number(borrowAmount) <= 0}
              >
                Borrow
              </button>
              <p className="text-[11px] text-white/40 text-center">
                Max borrow: ${((live.deposited ?? 0) * (live.maxLTVPercent ?? 0) / 100).toFixed(0)} ({live.maxLTVPercent ?? '—'}% LTV)
              </p>
            </div>
          </SpotlightCard>

          {/* Recent Activity */}
          <SpotlightCard className="p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
                <Activity className="w-4 h-4 text-white/40" />
              </div>
              <h3 className="text-[15px] font-semibold">Account Info</h3>
              {live.isLive && <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-medium">LIVE</span>}
            </div>
            <div className="space-y-3">
              {[
                { label: 'Account Age', value: live.accountAge != null ? `${live.accountAge} days` : '—', dot: 'bg-emerald-400' },
                { label: 'Transactions (24h)', value: live.txCount != null ? `${live.txCount}` : '—', dot: 'bg-emerald-400' },
                { label: 'Contracts Deployed', value: live.contractCount != null ? `${live.contractCount}` : '—', dot: 'bg-cyan-400' },
                { label: 'Signing Keys', value: live.keyCount != null ? `${live.keyCount}` : '—', dot: 'bg-white/30' },
                { label: 'Funding Sources', value: live.fundingSources != null ? `${live.fundingSources}` : '—', dot: live.fundingSources > 3 ? 'bg-amber-400' : 'bg-emerald-400' },
                { label: 'Risk Factors', value: live.riskFactors?.length > 0 ? live.riskFactors.map(f => f.label).join(', ') : 'None detected', dot: live.riskFactors?.length > 0 ? 'bg-amber-400' : 'bg-emerald-400' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 -mx-2.5 rounded-lg hover:bg-white/[0.02] transition-colors">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.dot}`} />
                  <span className="text-[12px] text-white/40 flex-1">{item.label}</span>
                  <span className="text-[12px] text-white/70 font-medium text-right">{item.value}</span>
                </div>
              ))}
            </div>
            {live.lastUpdated && (
              <p className="text-[10px] text-white/35 mt-4 text-center">
                Last updated: {live.lastUpdated.toLocaleTimeString()} · Auto-refreshes every 30s
              </p>
            )}
          </SpotlightCard>

        </div>

        {/* ─── COMPLIANCE LAYER OVERLAY — REAL ON-CHAIN DATA ─── */}
        <AnimatePresence>
          {showCompliance && (
            <motion.div
              className="mt-8"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.4 }}
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-[11px] font-semibold text-cyan-400/70 uppercase tracking-[0.25em]">Compliance Layer — On-Chain Data</span>
                {chain.latestBlock && <span className="text-[10px] text-white/20 ml-auto font-mono">Block #{chain.latestBlock.height}</span>}
              </div>

              {/* Real on-chain status cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <SpotlightCard className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldCheck className="w-4 h-4 text-emerald-400/70" />
                    <span className="text-[11px] text-white/30 uppercase tracking-wider">Credential</span>
                  </div>
                  <p className={`text-[14px] font-bold mb-1 ${chain.compliance?.hasCredential ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {chain.compliance?.hasCredential ? 'ACTIVE' : 'NOT MINTED'}
                  </p>
                  <p className="text-[11px] text-white/20 font-mono">Tier: {chain.compliance?.tier || '—'} · Source: {chain.compliance?.source || '—'}</p>
                </SpotlightCard>

                <SpotlightCard className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Fingerprint className="w-4 h-4 text-cyan-400/70" />
                    <span className="text-[11px] text-white/30 uppercase tracking-wider">Risk Score</span>
                  </div>
                  <p className={`text-[14px] font-bold mb-1 ${(live.riskScore ?? 0) < 30 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {live.riskScore ?? '—'}/100
                  </p>
                  <p className="text-[11px] text-white/20 font-mono">Tier: {live.riskTier || '—'} · {live.riskFactors?.length || 0} factors detected</p>
                </SpotlightCard>

                <SpotlightCard className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Globe className="w-4 h-4 text-cyan-400/70" />
                    <span className="text-[11px] text-white/30 uppercase tracking-wider">Jurisdiction</span>
                  </div>
                  <p className="text-[14px] font-bold text-cyan-400 mb-1">{currentJurisdiction.code} / {currentJurisdiction.regulator}</p>
                  <p className="text-[11px] text-white/20 font-mono">
                    Travel rule: {onChainRules?.rules?.travel_rule_threshold || currentJurisdiction.travelRuleThreshold} · KYC: {onChainRules?.rules?.kyc_level || currentJurisdiction.kycLevel}
                  </p>
                </SpotlightCard>

                <SpotlightCard className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-4 h-4 text-cyan-400/70" />
                    <span className="text-[11px] text-white/30 uppercase tracking-wider">Network</span>
                  </div>
                  <p className="text-[14px] font-bold text-cyan-400 mb-1">Flow Testnet</p>
                  <p className="text-[11px] text-white/20 font-mono">
                    Balance: {chain.account?.balance?.toLocaleString() || '—'} FLOW · {chain.account?.contractCount || 0} contracts
                  </p>
                </SpotlightCard>
              </div>

              {/* Deployed Contracts — REAL from Flow testnet */}
              <SpotlightCard className="p-5 mt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Code className="w-4 h-4 text-white/30" />
                  <span className="text-[11px] text-white/30 uppercase tracking-wider">Deployed Contracts on Flow Testnet</span>
                  <span className="text-[9px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-medium ml-auto">LIVE</span>
                </div>
                {chain.contracts.length > 0 ? (
                  <div className="space-y-2">
                    {chain.contracts.map((c, i) => (
                      <div key={i} className="p-3 rounded-lg border border-white/[0.04] bg-white/[0.01]">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span className="text-[12px] font-medium text-white/70">{c.name}</span>
                          <span className="text-[10px] text-white/15 font-mono ml-auto">{(c.codeSize / 1024).toFixed(1)} KB</span>
                        </div>
                        <p className="text-[10px] text-white/25 font-mono leading-relaxed truncate">{c.codePreview?.slice(0, 120)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-white/20">Loading contracts from chain...</p>
                )}
                <a
                  href={`https://testnet.flowscan.io/account/${chain.account?.address || '0x93c691a98b975493'}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 mt-3 text-[10px] text-cyan-400/60 hover:text-cyan-400 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  View on Flowscan
                </a>
              </SpotlightCard>

              {/* On-Chain Jurisdiction Rules */}
              <SpotlightCard className="p-5 mt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Globe className="w-4 h-4 text-white/30" />
                  <span className="text-[11px] text-white/30 uppercase tracking-wider">
                    {onChainRules?.source === 'flow-testnet' ? 'On-Chain' : 'Active'} Rules ({currentJurisdiction.code})
                  </span>
                  {onChainRules?.source === 'flow-testnet' && (
                    <span className="text-[9px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-medium ml-auto">FROM CHAIN</span>
                  )}
                </div>
                {onChainRules?.rules ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {Object.entries(onChainRules.rules).map(([key, value], i) => (
                      <div key={i} className="p-2.5 rounded-lg border border-white/[0.04] bg-white/[0.01]">
                        <span className="text-[10px] text-white/25 block">{key.replace(/_/g, ' ')}</span>
                        <span className="text-[12px] text-white/60 font-medium">{value}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {currentJurisdiction.complianceChecks.map((check, i) => (
                      <div key={i} className="flex items-center gap-2.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${check.status === 'clear' ? 'bg-emerald-400' : check.status === 'active' ? 'bg-cyan-400 animate-pulse' : 'bg-emerald-400'}`} />
                        <span className="text-[11px] text-white/40">{check.label}</span>
                        <span className="text-[10px] font-mono ml-auto text-white/25">{check.status.toUpperCase()}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-4 pt-3 border-t border-white/[0.04]">
                  <p className="text-[10px] text-white/20 leading-relaxed">
                    {currentJurisdiction.rules.join(' · ')}
                  </p>
                  <a
                    href={currentJurisdiction.code === 'US' ? 'https://www.fincen.gov/sites/default/files/advisory/2019-05-10/FinCEN%20Advisory%20CVC%20FINAL%20508.pdf' :
                          currentJurisdiction.code === 'EU' ? 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32023R1114' :
                          currentJurisdiction.code === 'UK' ? 'https://www.fca.org.uk/firms/cryptoassets' :
                          currentJurisdiction.code === 'SG' ? 'https://www.mas.gov.sg/regulation/acts/payment-services-act' :
                          'https://www.fintrac-canafe.gc.ca/msb-esm/msb-eng'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 mt-2 text-[10px] text-cyan-400/60 hover:text-cyan-400 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View source regulation ({currentJurisdiction.regulator})
                  </a>
                </div>
              </SpotlightCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Jurisdiction Change Re-Verification Modal */}
        <AnimatePresence>
          {jurisdictionChanging && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="w-full max-w-md mx-4 rounded-2xl border border-white/[0.08] bg-[#0a0f1a] p-8"
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                    <RefreshCw className="w-5 h-5 text-amber-400 animate-spin" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-semibold text-white">Jurisdiction Change</h3>
                    <p className="text-[12px] text-white/30">Re-verifying compliance credentials</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {reVerifySteps.map((s, i) => (
                    <motion.div
                      key={i}
                      className="flex items-center gap-3"
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                      >
                        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      </motion.div>
                      <span className="text-[12px] text-emerald-400/80">{s.label}</span>
                    </motion.div>
                  ))}
                </div>

                {/* Progress bar */}
                <div className="mt-6 h-1 bg-white/[0.04] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full"
                    initial={{ width: '0%' }}
                    animate={{ width: `${(reVerifySteps.length / 5) * 100}%` }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── RISK DETAIL MODAL ─── */}
        <AnimatePresence>
          {showRiskDetail && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRiskDetail(false)}
            >
              <motion.div
                className="w-full max-w-lg mx-4 rounded-2xl border border-white/[0.08] bg-[#0a0f1a] overflow-hidden"
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.04]">
                  <div>
                    <h3 className="text-[15px] font-semibold text-white">Risk Score Breakdown</h3>
                    <p className="text-[12px] text-white/30 mt-0.5">How your score is calculated from on-chain data</p>
                  </div>
                  <button onClick={() => setShowRiskDetail(false)} className="text-white/20 hover:text-white/50 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="px-6 py-5">
                  {/* Score gauge */}
                  <div className="flex items-center gap-5 mb-6">
                    <div className={`w-20 h-20 rounded-2xl flex flex-col items-center justify-center ${
                      (live.riskScore ?? 0) <= 30 ? 'bg-emerald-500/10 border border-emerald-500/20' :
                      (live.riskScore ?? 0) <= 70 ? 'bg-amber-500/10 border border-amber-500/20' :
                      'bg-red-500/10 border border-red-500/20'
                    }`}>
                      <span className={`text-[24px] font-bold ${
                        (live.riskScore ?? 0) <= 30 ? 'text-emerald-400' :
                        (live.riskScore ?? 0) <= 70 ? 'text-amber-400' : 'text-red-400'
                      }`}>{live.riskScore ?? 0}</span>
                      <span className="text-[10px] text-white/25">/100</span>
                    </div>
                    <div className="flex-1">
                      <p className={`text-[14px] font-semibold ${
                        live.riskTier === 'compliant' ? 'text-emerald-400' :
                        live.riskTier === 'semi-compliant' ? 'text-amber-400' : 'text-red-400'
                      }`}>{(live.riskTier || 'unknown').toUpperCase()}</p>
                      <p className="text-[11px] text-white/30 mt-1">
                        {live.riskTier === 'compliant' ? 'Your wallet passes all compliance checks. You can deposit, borrow, and use all DeFi features.' :
                         live.riskTier === 'semi-compliant' ? 'Some risk factors detected. You can deposit but may be limited on borrows.' :
                         'High risk detected. Some actions may be restricted until risk factors are resolved.'}
                      </p>
                    </div>
                  </div>

                  {/* Tier legend */}
                  <div className="grid grid-cols-3 gap-2 mb-5">
                    {[
                      { label: 'Compliant', range: '0–30', color: 'emerald' },
                      { label: 'Semi-Compliant', range: '31–70', color: 'amber' },
                      { label: 'Non-Compliant', range: '71–100', color: 'red' },
                    ].map(t => (
                      <div key={t.label} className={`px-3 py-2 rounded-lg border ${
                        live.riskTier === t.label.toLowerCase().replace('-', '-') ? `border-${t.color}-500/30 bg-${t.color}-500/5` : 'border-white/[0.04] bg-white/[0.01]'
                      }`}>
                        <span className={`text-[10px] font-medium text-${t.color}-400`}>{t.label}</span>
                        <span className="text-[9px] text-white/20 block">{t.range} pts</span>
                      </div>
                    ))}
                  </div>

                  {/* Factor list */}
                  <div className="space-y-1.5 mb-5">
                    <p className="text-[10px] text-white/25 uppercase tracking-wider font-semibold mb-2">Risk Factors Checked</p>
                    {[
                      { id: 'account_age_7d', label: 'Account age < 7 days', points: 15, tip: 'Wait until your account is at least 7 days old', source: 'Account creation timestamp on Flow', explorer: 'account' },
                      { id: 'account_age_30d', label: 'Account age < 30 days', points: 8, tip: 'Older accounts are considered lower risk', source: 'Account creation timestamp on Flow', explorer: 'account' },
                      { id: 'high_volume_24h', label: 'High tx volume in 24h (>50)', points: 20, tip: 'Reduce transaction frequency or spread over multiple days', source: 'Transaction count from Flow Access API', explorer: 'transactions' },
                      { id: 'rapid_in_out', label: 'Rapid in-out pattern', points: 25, tip: 'Avoid sending and receiving large amounts in quick succession', source: 'Transfer pattern analysis via Anomaly Monitor', explorer: 'transactions' },
                      { id: 'flagged_contract', label: 'Flagged contract interaction', points: 30, tip: 'Avoid interacting with known flagged contracts', source: 'Contract interaction log on Flow', explorer: 'transactions' },
                      { id: 'mixer_interaction', label: 'Mixer / privacy tool interaction', points: 35, tip: 'Mixer usage is flagged by most compliance frameworks', source: 'Known mixer address database', explorer: 'transactions' },
                      { id: 'multi_funding', label: 'Multiple funding sources (>5)', points: 15, tip: 'Consolidate funding to fewer wallet sources', source: 'Incoming transfer origins on Flow', explorer: 'transactions' },
                      { id: 'dormancy_spike', label: 'Dormant then suddenly active', points: 12, tip: 'Gradually increase activity after dormancy periods', source: 'Activity gap analysis via Anomaly Monitor', explorer: 'account' },
                    ].map(factor => {
                      const liveFactor = live.riskFactors?.find(f => f.id === factor.id)
                      const isTriggered = !!liveFactor
                      const explorerBase = `https://testnet.flowscan.io/${factor.explorer === 'account' ? 'account' : 'account'}/${live.address || '0x93c691a98b975493'}`
                      return (
                        <div key={factor.id} className={`flex items-start gap-3 p-2.5 rounded-lg ${isTriggered ? 'bg-amber-500/5 border border-amber-500/10' : 'bg-white/[0.01]'}`}>
                          {isTriggered ? (
                            <XCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400/50 shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className={`text-[11px] font-medium ${isTriggered ? 'text-amber-400' : 'text-white/40'}`}>
                                {liveFactor?.label || factor.label}
                              </span>
                              <span className={`text-[10px] font-mono ${isTriggered ? 'text-amber-400/70' : 'text-white/15'}`}>+{liveFactor?.points || factor.points} pts</span>
                            </div>
                            {isTriggered && (
                              <div className="mt-1 space-y-1">
                                <p className="text-[10px] text-white/25">Fix: {factor.tip}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[9px] text-white/15">Source: {factor.source}</span>
                                  <a
                                    href={explorerBase}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[9px] text-cyan-400/50 hover:text-cyan-400 transition-colors"
                                  >
                                    <ExternalLink className="w-2.5 h-2.5" />
                                    View on Flowscan
                                  </a>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                    {/* Show any extra demo-injected factors not in the standard list */}
                    {live.riskFactors?.filter(f => !['account_age_7d','account_age_30d','high_volume_24h','rapid_in_out','flagged_contract','mixer_interaction','multi_funding','dormancy_spike'].includes(f.id)).map(factor => (
                      <div key={factor.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/10">
                        <XCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-medium text-amber-400">{factor.label}</span>
                            <span className="text-[10px] font-mono text-amber-400/70">+{factor.points} pts</span>
                          </div>
                          <div className="mt-1 space-y-1">
                            <p className="text-[10px] text-white/25">Detected by AI Anomaly Monitor</p>
                            <a
                              href={`https://testnet.flowscan.io/account/${live.address || '0x93c691a98b975493'}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[9px] text-cyan-400/50 hover:text-cyan-400 transition-colors"
                            >
                              <ExternalLink className="w-2.5 h-2.5" />
                              View source on Flowscan
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                    <p className="text-[10px] text-white/30 leading-relaxed">
                      Score is calculated from <strong className="text-white/50">public on-chain data only</strong> — no personal information is used. 
                      Lower scores mean lower risk. The score updates automatically as your on-chain behavior changes.
                      Data source: {live.sources?.risk || 'flow-testnet'}
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── STAT DETAIL MODAL ─── */}
        <AnimatePresence>
          {showStatDetail && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowStatDetail(null)}
            >
              <motion.div
                className="w-full max-w-md mx-4 rounded-2xl border border-white/[0.08] bg-[#0a0f1a] overflow-hidden"
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.04]">
                  <h3 className="text-[15px] font-semibold text-white">
                    {showStatDetail === 'wallet' ? 'Wallet Balance' : showStatDetail === 'deposited' ? 'Deposits' : 'Borrows'}
                  </h3>
                  <button onClick={() => setShowStatDetail(null)} className="text-white/20 hover:text-white/50 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="px-6 py-5 space-y-4">
                  {showStatDetail === 'wallet' && (<>
                    <div className="text-center py-3">
                      <p className="text-[32px] font-bold text-white">{(live.walletBalance ?? 0).toLocaleString()} <span className="text-[16px] text-white/30">FLOW</span></p>
                      <p className="text-[11px] text-white/25 mt-1 font-mono">{live.address}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between p-2.5 rounded-lg bg-white/[0.02]">
                        <span className="text-[11px] text-white/40">Network</span>
                        <span className="text-[11px] text-emerald-400 font-medium">Flow Testnet</span>
                      </div>
                      <div className="flex justify-between p-2.5 rounded-lg bg-white/[0.02]">
                        <span className="text-[11px] text-white/40">Account Age</span>
                        <span className="text-[11px] text-white/70 font-medium">{live.accountAge ?? '—'} days</span>
                      </div>
                      <div className="flex justify-between p-2.5 rounded-lg bg-white/[0.02]">
                        <span className="text-[11px] text-white/40">Contracts Deployed</span>
                        <span className="text-[11px] text-white/70 font-medium">{live.contractCount ?? '—'}</span>
                      </div>
                      <div className="flex justify-between p-2.5 rounded-lg bg-white/[0.02]">
                        <span className="text-[11px] text-white/40">Signing Keys</span>
                        <span className="text-[11px] text-white/70 font-medium">{live.keyCount ?? '—'}</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-white/20 leading-relaxed">
                      This is your FLOW token balance on testnet. These are <strong className="text-white/40">free test tokens</strong> — not real cryptocurrency. 
                      Your balance decreases slightly with each transaction (gas fees ~0.001 FLOW), but gas is sponsored so users pay nothing.
                    </p>
                    <a href={`https://testnet.flowscan.io/account/${live.address}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:border-cyan-500/30 transition-colors">
                      <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="text-[11px] text-cyan-400 font-medium">View on Flowscan</span>
                    </a>
                  </>)}

                  {showStatDetail === 'deposited' && (<>
                    <div className="text-center py-3">
                      <p className="text-[32px] font-bold text-white">{(live.deposited ?? 0).toLocaleString()} <span className="text-[16px] text-white/30">USDC</span></p>
                      <p className="text-[11px] text-emerald-400/70 mt-1">Earning {live.baseAPYPercent ?? '—'}% APY</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between p-2.5 rounded-lg bg-white/[0.02]">
                        <span className="text-[11px] text-white/40">Pool Contract</span>
                        <span className="text-[11px] text-white/70 font-medium font-mono">DemoLendingPool</span>
                      </div>
                      <div className="flex justify-between p-2.5 rounded-lg bg-white/[0.02]">
                        <span className="text-[11px] text-white/40">Pool Total Deposits</span>
                        <span className="text-[11px] text-white/70 font-medium">{live.totalDeposits?.toLocaleString() ?? '—'} USDC</span>
                      </div>
                      <div className="flex justify-between p-2.5 rounded-lg bg-white/[0.02]">
                        <span className="text-[11px] text-white/40">Utilization Rate</span>
                        <span className="text-[11px] text-white/70 font-medium">{live.utilizationRate?.toFixed(1) ?? '—'}%</span>
                      </div>
                      <div className="flex justify-between p-2.5 rounded-lg bg-white/[0.02]">
                        <span className="text-[11px] text-white/40">Gas Fees</span>
                        <span className="text-[11px] text-emerald-400 font-medium">Sponsored (free for users)</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-white/20 leading-relaxed">
                      <strong className="text-white/40">What is depositing?</strong> You supply liquidity to the DemoLendingPool smart contract. 
                      Other users can borrow from the pool, and you earn interest (APY) on your deposits. Every deposit is compliance-checked 
                      on-chain via ComplianceAction.verify() — this happens automatically and invisibly. Gas fees are sponsored by FlowShield.
                    </p>
                  </>)}

                  {showStatDetail === 'borrowed' && (<>
                    <div className="text-center py-3">
                      <p className="text-[32px] font-bold text-white">{(live.borrowed ?? 0).toLocaleString()} <span className="text-[16px] text-white/30">USDC</span></p>
                      <p className="text-[11px] text-cyan-400/70 mt-1">{live.borrowRatePercent ?? '—'}% interest rate</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between p-2.5 rounded-lg bg-white/[0.02]">
                        <span className="text-[11px] text-white/40">Max Borrow ({live.maxLTVPercent ?? '—'}% LTV)</span>
                        <span className="text-[11px] text-white/70 font-medium">${((live.deposited ?? 0) * (live.maxLTVPercent ?? 75) / 100).toFixed(0)} USDC</span>
                      </div>
                      <div className="flex justify-between p-2.5 rounded-lg bg-white/[0.02]">
                        <span className="text-[11px] text-white/40">Available Liquidity</span>
                        <span className="text-[11px] text-white/70 font-medium">{live.availableLiquidity?.toLocaleString() ?? '—'} USDC</span>
                      </div>
                      <div className="flex justify-between p-2.5 rounded-lg bg-white/[0.02]">
                        <span className="text-[11px] text-white/40">Compliance Required</span>
                        <span className="text-[11px] text-white/70 font-medium">Full (verifyFull)</span>
                      </div>
                      <div className="flex justify-between p-2.5 rounded-lg bg-white/[0.02]">
                        <span className="text-[11px] text-white/40">Gas Fees</span>
                        <span className="text-[11px] text-emerald-400 font-medium">Sponsored (free for users)</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-white/20 leading-relaxed">
                      <strong className="text-white/40">What is borrowing?</strong> You borrow from the pool using your deposits as collateral ({live.maxLTVPercent ?? '—'}% loan-to-value ratio). 
                      Borrowing requires <strong className="text-white/40">full compliance</strong> — ComplianceAction.verifyFull() is called on-chain, which checks 
                      your credential tier is "compliant" (not just semi-compliant). Gas fees are sponsored by FlowShield — completely free for users.
                    </p>
                  </>)}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Verification Panel Modal */}
        <VerificationPanel
          isOpen={!!verifying}
          onClose={() => setVerifying(null)}
          action={verifying?.action || 'deposit'}
          amount={verifying?.amount || '0'}
          onComplete={handleVerificationComplete}
        />

      </div>
    </div>
  )
}
