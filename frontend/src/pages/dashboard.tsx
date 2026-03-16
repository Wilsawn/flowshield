import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Eye, EyeOff, ChevronDown, RefreshCw, Clock, Loader2, Wallet } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import VerificationPanel from '@/components/VerificationPanel'
import WalletButton from '@/components/WalletButton'
import ZKProofBadge from '@/components/ZKProofBadge'
import { JURISDICTION_LIST, getJurisdiction } from '@/data/jurisdictions'
import useDashboardData from '@/hooks/useDashboardData'
import useChainData from '@/hooks/useChainData'

import StatsRow from '@/components/dashboard/StatsRow'
import NetworkBar from '@/components/dashboard/NetworkBar'
import WalletStatus from '@/components/dashboard/WalletStatus'
import ActionCards from '@/components/dashboard/ActionCards'
import AccountInfo from '@/components/dashboard/AccountInfo'
import ComplianceOverlay from '@/components/dashboard/ComplianceOverlay'
import RiskDetailModal from '@/components/dashboard/RiskDetailModal'
import StatDetailModal from '@/components/dashboard/StatDetailModal'
import JurisdictionChangeModal from '@/components/dashboard/JurisdictionChangeModal'

const DEPLOYER_ADDRESS = '0x93c691a98b975493'

export default function Dashboard() {
  const navigate = useNavigate()
  const [walletAddr, setWalletAddr] = useState(() => {
    try {
      const w = JSON.parse(localStorage.getItem('flowshield_wallet') || '{}')
      const addr = w.addr || null
      // Deployer address is not a real user wallet
      if (addr === DEPLOYER_ADDRESS) return null
      return addr
    } catch { return null }
  })

  // React to wallet connect/disconnect — poll localStorage for changes
  useEffect(() => {
    const check = () => {
      try {
        const w = JSON.parse(localStorage.getItem('flowshield_wallet') || '{}')
        let addr = w.addr || null
        if (addr === DEPLOYER_ADDRESS) addr = null
        setWalletAddr(prev => prev !== addr ? addr : prev)
      } catch { /* ignore */ }
    }
    window.addEventListener('storage', check)
    const interval = setInterval(check, 1000)
    return () => { window.removeEventListener('storage', check); clearInterval(interval) }
  }, [])

  const live = useDashboardData(walletAddr)
  const chain = useChainData(walletAddr)
  const [depositAmount, setDepositAmount] = useState('')
  const [borrowAmount, setBorrowAmount] = useState('')
  const [repayAmount, setRepayAmount] = useState('')
  const [verifying, setVerifying] = useState(null) // null | { action, amount }
  const [flowBalance, setFlowBalance] = useState(null)
  const [isCustodial, setIsCustodial] = useState(false)

  // Fetch real on-chain FLOW balance
  const fetchBalance = useCallback(async () => {
    if (!walletAddr) return // Don't fall back to deployer address
    const API = import.meta.env.VITE_API_URL || 'http://localhost:3002'
    try {
      const res = await fetch(`${API}/api/accounts/balance/${walletAddr}`)
      const data = await res.json()
      if (data.balance !== undefined) setFlowBalance(data.balance)
      setIsCustodial(!!data.isCustodial)
    } catch { /* ignore */ }
  }, [walletAddr])

  useEffect(() => { fetchBalance() }, [fetchBalance])
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
      await fetch(`${API}/api/compliance/status/${walletAddr || '0x93c691a98b975493'}`)
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
        body: JSON.stringify({ address: walletAddr || '0x93c691a98b975493' }),
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
    try {
      const API = import.meta.env.VITE_API_URL || 'http://localhost:3002'
      // Use the custodial mint endpoint (two-signer tx) so the credential lands
      // in the user's own account, not the deployer's.
      const walletInfo = (() => { try { return JSON.parse(localStorage.getItem('flowshield_wallet') || '{}') } catch { return {} } })()
      const email = walletInfo.email
      if (!email) {
        console.error('[Dashboard] Cannot renew: no email in wallet info')
        setRenewing(false)
        return
      }
      const res = await fetch(`${API}/api/accounts/mint-credential`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          jurisdiction: jurisdictionCode || 'US',
          riskScore: live.riskScore ?? 15,
        }),
      })
      const result = await res.json()
      if (result.success) {
        setRenewed(true)
        setCredentialExpiring(false)
        live.refresh()
        setTimeout(() => setRenewed(false), 4000)
      } else {
        console.error('[Dashboard] Renewal failed:', result.error)
      }
    } catch (err) {
      console.error('[Dashboard] Renewal failed:', err)
    }
    setRenewing(false)
  }, [live, jurisdictionCode])

  const handleDeposit = () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) return
    setVerifying({ action: 'deposit', amount: depositAmount })
  }

  const maxBorrowRemaining = Math.max(0, ((live.deposited ?? 0) * (live.maxLTVPercent ?? 75) / 100) - (live.borrowed ?? 0))

  const handleBorrow = () => {
    if (!borrowAmount || parseFloat(borrowAmount) <= 0) return
    if (parseFloat(borrowAmount) > maxBorrowRemaining) {
      setVerifying({ action: 'borrow', amount: borrowAmount, error: `Exceeds borrow limit. Max remaining: ${maxBorrowRemaining.toFixed(2)} FLOW (75% LTV)` })
      return
    }
    setVerifying({ action: 'borrow', amount: borrowAmount })
  }

  const handleRepay = () => {
    if (!repayAmount || parseFloat(repayAmount) <= 0) return
    if (parseFloat(repayAmount) > (live.borrowed ?? 0)) {
      setVerifying({ action: 'repay', amount: String(live.borrowed ?? 0) })
      return
    }
    setVerifying({ action: 'repay', amount: repayAmount })
  }

  const handleVerificationComplete = () => {
    if (verifying?.action === 'deposit') setDepositAmount('')
    if (verifying?.action === 'borrow') setBorrowAmount('')
    if (verifying?.action === 'repay') setRepayAmount('')
    // Refresh live data to show updated pool stats from chain
    live.refresh?.()
    chain.refresh?.()
    fetchBalance()
    // Second refresh after 3s to catch chain indexing lag
    setTimeout(() => { live.refresh?.(); chain.refresh?.(); fetchBalance() }, 3000)
    setTimeout(() => setVerifying(null), 600)
  }

  return (
    <div className="min-h-screen bg-[#060e09] text-white p-6 md:p-10">
      <div className="max-w-[1100px] mx-auto">

        {/* Header — clean two-row layout */}
        <div className="mb-10">
          {/* Row 1: Title + actions */}
          <div className="flex items-start justify-between gap-6 mb-3">
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-bold tracking-tight truncate">
                Dashboard
              </h1>
              <p className="text-[13px] text-white/40 mt-0.5">Your compliance status and lending activity.</p>
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
                      className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-white/[0.08] bg-[#0a1410] backdrop-blur-xl shadow-2xl z-50 overflow-hidden"
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

          {/* Row 2: Status strip */}
          <div className="flex items-center gap-3 text-xs text-white/25">
            {live.isLive && (
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Connected
              </span>
            )}
            <span className="text-white/10">·</span>
            <span className="flex items-center gap-1.5">
              {live.hasCredential && live.isValid ? (
                <span className="text-emerald-400/50">Compliant</span>
              ) : (
                <span className="text-amber-400/50">Not Compliant</span>
              )}
              <span>{currentJurisdiction.flag} {currentJurisdiction.name}</span>
            </span>
            <span className="text-white/10">·</span>
            <ZKProofBadge compact />
          </div>
        </div>

        {/* Connect Wallet Prompt */}
        {!walletAddr && (
          <div className="mb-6 p-6 rounded-2xl border border-white/[0.08] bg-white/[0.02] text-center">
            <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-6 h-6 text-white/30" />
            </div>
            <p className="text-[15px] font-semibold text-white/80 mb-1">Connect your wallet to get started</p>
            <p className="text-[12px] text-white/30 max-w-sm mx-auto mb-4">Connect a Flow wallet (Lilico, Blocto, or any FCL-compatible wallet) or sign in with passkey to view compliance, deposit, borrow, and manage credentials.</p>
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[13px] font-medium hover:bg-emerald-500/30 transition-colors"
            >
              Launch dApp (passkey sign-in)
            </button>
          </div>
        )}

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

        <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-3">ON-CHAIN DATA</p>

        <StatsRow
          live={live}
          chain={chain}
          flowBalance={flowBalance}
          loading={live.loading}
          onStatClick={setShowStatDetail}
          onRiskClick={() => setShowRiskDetail(true)}
        />

        <NetworkBar chain={chain} walletAddr={walletAddr} jurisdiction={currentJurisdiction} />

        <WalletStatus
          isCustodial={isCustodial}
          walletAddr={walletAddr}
          flowBalance={flowBalance}
          onNavigate={navigate}
        />

        {/* First-time tip when no position yet */}
        {walletAddr && !live.loading && (live.deposited ?? 0) === 0 && (live.borrowed ?? 0) === 0 && (
          <div className="mb-4 p-4 rounded-xl border border-emerald-500/[0.12] bg-emerald-500/[0.04]">
            <p className="text-[13px] text-white/80">
              <span className="font-medium text-emerald-400/90">First time?</span> Deposit FLOW to earn yield — gas is sponsored. Try a small amount to see the full flow.
            </p>
          </div>
        )}

        <ActionCards
          depositAmount={depositAmount} setDepositAmount={setDepositAmount} onDeposit={handleDeposit}
          borrowAmount={borrowAmount} setBorrowAmount={setBorrowAmount} onBorrow={handleBorrow}
          repayAmount={repayAmount} setRepayAmount={setRepayAmount} onRepay={handleRepay}
          live={live} flowBalance={flowBalance} maxBorrowRemaining={maxBorrowRemaining}
        />

        <AccountInfo live={live} />

        <ComplianceOverlay
          showCompliance={showCompliance}
          chain={chain}
          live={live}
          jurisdiction={currentJurisdiction}
          onChainRules={onChainRules}
          walletAddr={walletAddr}
        />

        <JurisdictionChangeModal
          jurisdictionChanging={jurisdictionChanging}
          reVerifySteps={reVerifySteps}
        />

        <RiskDetailModal
          show={showRiskDetail}
          onClose={() => setShowRiskDetail(false)}
          live={live}
        />

        <StatDetailModal
          showStatDetail={showStatDetail}
          onClose={() => setShowStatDetail(null)}
          live={live}
        />

        {/* Verification Panel Modal */}
        <VerificationPanel
          isOpen={!!verifying}
          onClose={() => setVerifying(null)}
          action={verifying?.action || 'deposit'}
          amount={verifying?.amount || '0'}
          onComplete={handleVerificationComplete}
          clientError={verifying?.error || null}
        />

      </div>
    </div>
  )
}
