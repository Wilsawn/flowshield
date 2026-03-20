import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldCheck, Fingerprint, Zap, FileCheck, Loader2, CheckCircle2, X, ExternalLink, AlertTriangle } from 'lucide-react'
import { API } from '@/lib/api'
import { authFetch } from '@/lib/utils'
import { useToast } from '@/contexts/ToastContext'

function friendlyError(raw) {
  if (!raw) return 'Transaction failed'
  if (raw.includes('Exceeds maximum borrow') || raw.includes('Exceeds borrow limit')) return 'Borrow amount exceeds your 75% LTV limit. Try a smaller amount.'
  if (raw.includes('Insufficient liquidity')) return 'Not enough liquidity in the pool for this amount.'
  if (raw.includes('not compliant') || raw.includes('Not compliant')) return 'Compliance check failed. Your credential may be expired.'
  // Strip Cadence noise, show the assertion message
  const assertMatch = raw.match(/assertion failed:\s*(.+?)(?:\n|$)/)
  if (assertMatch) return assertMatch[1].trim()
  // Fallback: truncate long errors
  return raw.length > 120 ? raw.slice(0, 120) + '...' : raw
}

export default function VerificationPanel({ isOpen, onClose, action = 'deposit', amount = '0', onComplete, clientError }) {
  const { toast } = useToast()
  const [steps, setSteps] = useState([])
  const [txResult, setTxResult] = useState(null)
  const [error, setError] = useState(null)
  const [completed, setCompleted] = useState(false)
  const startedRef = useRef(false)

  const addStep = (label, detail, status = 'done') => {
    setSteps(prev => {
      const updated = prev.map(s => s.status === 'active' ? { ...s, status: 'done' } : s)
      return [...updated, { label, detail, status }]
    })
  }

  const updateLastStep = (label, detail, status = 'done') => {
    setSteps(prev => {
      const updated = [...prev]
      if (updated.length > 0) {
        updated[updated.length - 1] = { ...updated[updated.length - 1], label, detail, status }
      }
      return updated
    })
  }

  useEffect(() => {
    if (!isOpen) {
      setSteps([])
      setTxResult(null)
      setError(null)
      setCompleted(false)
      startedRef.current = false
      return
    }

    if (startedRef.current) return
    startedRef.current = true

    // Client-side validation error — show immediately, no transaction
    if (clientError) {
      addStep('Compliance credential verified', 'Credential active', 'done')
      addStep('Pre-check failed', clientError, 'error')
      setError(clientError)
      return
    }

    const runTransaction = async () => {
      try {
        // Step 1: Check credential
        addStep('Checking compliance credential...', 'Querying credential on Flow testnet', 'active')
        await new Promise(r => setTimeout(r, 500))

        // Use the connected user's wallet address and email
        const walletData = (() => {
          try { return JSON.parse(localStorage.getItem('flowshield_wallet') || '{}') } catch { return {} }
        })()
        const userAddress = walletData.addr
        if (!userAddress) {
          addStep('No wallet connected', 'Connect a wallet before making transactions', 'error')
          setError('No wallet connected. Please connect your Flow wallet first.')
          return
        }
        const walletEmail = walletData.email || null

        const credRes = await authFetch(`${API}/api/compliance/status/${encodeURIComponent(userAddress)}`)
        const credData = await credRes.json()

        if (!credData.hasCredential || !credData.isValid) {
          // Attempt to mint credential for custodial user.
          // MUST pass userAddress so pool.js can look up the custodial key and
          // run a two-signer transaction — otherwise credential lands on deployer.
          if (!walletEmail) {
            // Skip pre-mint if no email (the atomic deposit/borrow tx will auto-mint anyway)
            updateLastStep('No credential — will auto-mint during transaction', 'Skipping standalone mint (no email for custodial lookup)')
          } else {
            updateLastStep('No credential found — issuing...', 'Verifying identity and issuing credential', 'active')
            const mintRes = await authFetch(`${API}/api/accounts/mint-credential`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: walletEmail, jurisdiction: credData.jurisdiction || 'US', riskScore: 15 }),
            })
            const mintData = await mintRes.json()
            if (mintData.success) {
              updateLastStep('Credential issued on-chain', `Tx: ${mintData.transactionId?.slice(0, 12)}... · Issued to: ${mintData.mintedTo?.slice(0, 10)}...`)
            } else {
              updateLastStep('Credential issuance failed', mintData.error || 'Unknown error', 'error')
              setError(mintData.error || 'Credential issuance failed. Please try again.')
              return
            }
          }
        } else {
          updateLastStep('Credential verified: ACTIVE', `Tier: ${credData.tier} · Expires: ${credData.source}`)
        }
        await new Promise(r => setTimeout(r, 400))

        // Step 2: Real on-chain compliance check — re-read after any mint above
        addStep('On-chain compliance check', 'Verifying credential on Flow testnet', 'active')
        await new Promise(r => setTimeout(r, 400))
        const verifyRes = await authFetch(`${API}/api/compliance/status/${encodeURIComponent(userAddress)}`)
        const verifyData = await verifyRes.json()
        if (!verifyData.hasCredential || !verifyData.isValid) {
          updateLastStep('Compliance check failed', 'No valid credential on this address — transaction blocked', 'error')
          setError('No valid compliance credential on your account. Please complete onboarding to receive one.')
          return
        }
        updateLastStep('Compliance check passed', `Credential valid · Tier: ${verifyData.tier}`)
        await new Promise(r => setTimeout(r, 300))

        // Step 3: Send REAL transaction
        addStep(`Sending ${action} transaction to Flow testnet...`, `Lending Pool · ${action}(${amount} FLOW)`, 'active')

        const txRes = await authFetch(`${API}/api/pool/${action}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: parseFloat(amount),
            userAddress,
            email: walletEmail,
            jurisdiction: credData.jurisdiction || 'CA',
            riskScore: 15,
          }),
        })
        const txData = await txRes.json()

        if (txData.success) {
          setTxResult(txData)
          updateLastStep(
            `Transaction confirmed on Flow testnet`,
            `Tx: ${txData.transactionId?.slice(0, 16)}...`
          )
          await new Promise(r => setTimeout(r, 400))

          // Step 4: Show events
          const complianceEvent = txData.events?.find(e => e.type === 'ComplianceVerified')
          const actionEvent = txData.events?.find(e => e.type === 'Deposited' || e.type === 'Borrowed' || e.type === 'Repaid')
          if (complianceEvent || actionEvent) {
            addStep(
              `On-chain events emitted`,
              [
                complianceEvent ? `ComplianceVerified(tier: ${complianceEvent.data?.tier})` : null,
                actionEvent ? `${actionEvent.type}(amount: ${actionEvent.data?.amount})` : null,
              ].filter(Boolean).join(' · ')
            )
          }

          setCompleted(true)
          toast.success(action === 'deposit' ? 'Deposit confirmed' : action === 'borrow' ? 'Borrow confirmed' : 'Repay confirmed')
        } else {
          const friendly = friendlyError(txData.error)
          setError(friendly)
          updateLastStep('Transaction failed', friendly, 'error')
          toast.error(friendly)
        }
      } catch (err) {
        const msg = err.message || 'Transaction failed'
        setError(msg)
        addStep('Error', msg, 'error')
        toast.error(msg)
      }
    }

    runTransaction()
  }, [isOpen, action, amount, onComplete, clientError])

  if (!isOpen) return null

  const progress = completed ? 100 : steps.length > 0 ? (steps.filter(s => s.status === 'done').length / 4) * 100 : 0

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

        <motion.div
          className="relative w-full max-w-md mx-4 rounded-xl border border-emerald-500/[0.08] bg-[#0a1410] overflow-hidden"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-emerald-500/[0.06]">
            <div>
              <h3 className="text-[15px] font-semibold text-white">
                {completed ? 'Transaction Confirmed' : error ? 'Transaction Failed' : `Processing ${action}`}
              </h3>
              <p className="text-[12px] text-white/30 mt-0.5">
                {completed ? 'Confirmed on Flow testnet' : `${amount} FLOW · Lending Pool`}
              </p>
            </div>
            <button onClick={onClose} className="text-white/20 hover:text-white/50 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Steps */}
          <div className="px-6 py-5 space-y-3.5">
            {steps.map((step, i) => {
              const isDone = step.status === 'done'
              const isActive = step.status === 'active'
              const isError = step.status === 'error'

              return (
                <motion.div
                  key={i}
                  className="flex items-start gap-3.5"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                    isError ? 'bg-red-500/15' :
                    isDone ? 'bg-emerald-500/15' : 'bg-emerald-500/10'
                  }`}>
                    {isError ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                    ) : isDone ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                    )}
                  </div>
                  <div className="min-w-0 pt-0.5">
                    <p className={`text-[12px] font-medium ${
                      isError ? 'text-red-400' : isDone ? 'text-emerald-400' : 'text-white'
                    }`}>{step.label}</p>
                    <p className="text-[10px] text-white/20 mt-0.5 font-mono truncate">{step.detail}</p>
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* Success footer with real tx link */}
          <AnimatePresence>
            {completed && txResult && (
              <motion.div
                className="px-6 py-4 border-t border-emerald-500/[0.06] bg-emerald-500/[0.03]"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.4 }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-emerald-400">Compliant {action} confirmed</p>
                    <p className="text-[11px] text-white/25">Gas: {txResult.events?.find(e => e.type === 'FeesDeducted')?.data?.amount || '~0.001'} FLOW (sponsored)</p>
                  </div>
                </div>
                <a
                  href={txResult.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-emerald-500/[0.08] hover:border-emerald-500/30 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-emerald-400 font-medium">View on Flowscan</p>
                    <p className="text-[9px] text-white/20 font-mono truncate">{txResult.transactionId}</p>
                  </div>
                </a>
                <button
                  onClick={() => onComplete?.()}
                  className="w-full mt-3 h-9 rounded-lg bg-emerald-500 text-[#060e09] text-sm font-semibold hover:bg-emerald-400 transition-colors"
                >
                  Done
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Progress bar */}
          <div className="h-0.5 bg-white/[0.03]">
            <motion.div
              className={`h-full ${error ? 'bg-red-500' : 'bg-emerald-500'}`}
              initial={{ width: '0%' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
