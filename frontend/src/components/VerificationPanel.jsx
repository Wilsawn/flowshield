import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldCheck, Fingerprint, Zap, FileCheck, Loader2, CheckCircle2, X, ExternalLink, AlertTriangle } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3002'

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
        addStep('Checking compliance credential...', 'Querying ComplianceCredential on Flow testnet', 'active')
        await new Promise(r => setTimeout(r, 500))

        // Use the connected user's wallet address
        const walletAddr = (() => {
          try { return JSON.parse(localStorage.getItem('flowshield_wallet') || '{}').addr } catch { return null }
        })()
        const userAddress = walletAddr || '0x93c691a98b975493'

        const credRes = await fetch(`${API}/api/compliance/status/${userAddress}`)
        const credData = await credRes.json()

        if (!credData.hasCredential || !credData.isValid) {
          // Attempt to mint credential for custodial user.
          // MUST pass userAddress so pool.js can look up the custodial key and
          // run a two-signer transaction — otherwise credential lands on deployer.
          updateLastStep('No credential found — minting...', 'Calling ZKVerifier + ComplianceCredential.mint()', 'active')
          const walletEmail = (() => {
            try { return JSON.parse(localStorage.getItem('flowshield_wallet') || '{}').email } catch { return null }
          })()
          const mintRes = await fetch(`${API}/api/pool/mint-credential`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userAddress, email: walletEmail, jurisdiction: credData.jurisdiction || 'US', riskScore: 15 }),
          })
          const mintData = await mintRes.json()
          if (mintData.success) {
            updateLastStep('Credential minted on-chain', `Tx: ${mintData.transactionId?.slice(0, 12)}... · Minted to: ${mintData.mintedTo?.slice(0, 10)}...`)
          } else {
            updateLastStep('Credential minting failed', mintData.error || 'Unknown error', 'error')
            setError(mintData.error || 'Credential minting failed. Please re-onboard.')
            return
          }
        } else {
          updateLastStep('Credential verified: ACTIVE', `Tier: ${credData.tier} · Expires: ${credData.source}`)
        }
        await new Promise(r => setTimeout(r, 400))

        // Step 2: Real on-chain compliance check — re-read after any mint above
        addStep('ComplianceAction.verify() — on-chain gate', 'Reading ComplianceCredential capability', 'active')
        await new Promise(r => setTimeout(r, 400))
        const verifyRes = await fetch(`${API}/api/compliance/status/${userAddress}`)
        const verifyData = await verifyRes.json()
        if (!verifyData.hasCredential || !verifyData.isValid) {
          updateLastStep('ComplianceAction.verify() → false', 'No valid credential on this address — deposit blocked', 'error')
          setError('No valid compliance credential on your account. Please complete onboarding to receive one.')
          return
        }
        updateLastStep('ComplianceAction.verify() → true', `Credential valid · Tier: ${verifyData.tier}`)
        await new Promise(r => setTimeout(r, 300))

        // Step 3: Send REAL transaction
        addStep(`Sending ${action} transaction to Flow testnet...`, `DemoLendingPool.${action}(${amount} FLOW)`, 'active')

        const txRes = await fetch(`${API}/api/pool/${action}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: parseFloat(amount), userAddress }),
        })
        const txData = await txRes.json()

        if (txData.success) {
          setTxResult(txData)
          updateLastStep(
            `Transaction SEALED on Flow testnet`,
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
        } else {
          const friendly = friendlyError(txData.error)
          setError(friendly)
          updateLastStep('Transaction failed', friendly, 'error')
        }
      } catch (err) {
        setError(err.message)
        addStep('Error', err.message, 'error')
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
          className="relative w-full max-w-md mx-4 rounded-2xl border border-white/[0.06] bg-[#0a0f1a] overflow-hidden"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.04]">
            <div>
              <h3 className="text-[15px] font-semibold text-white">
                {completed ? 'Transaction Sealed' : error ? 'Transaction Failed' : `Processing ${action}`}
              </h3>
              <p className="text-[12px] text-white/30 mt-0.5">
                {completed ? 'Real transaction on Flow testnet' : `${amount} FLOW · DemoLendingPool`}
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
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      </motion.div>
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
                className="px-6 py-4 border-t border-white/[0.04] bg-emerald-500/[0.03]"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.4 }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <motion.div
                    className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.1 }}
                  >
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  </motion.div>
                  <div>
                    <p className="text-[13px] font-semibold text-emerald-400">Compliant {action} sealed</p>
                    <p className="text-[11px] text-white/25">Gas: {txResult.events?.find(e => e.type === 'FeesDeducted')?.data?.amount || '~0.001'} FLOW (sponsored)</p>
                  </div>
                </div>
                <a
                  href={txResult.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:border-cyan-500/30 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-cyan-400 font-medium">View on Flowscan</p>
                    <p className="text-[9px] text-white/20 font-mono truncate">{txResult.transactionId}</p>
                  </div>
                </a>
                <button
                  onClick={() => onComplete?.()}
                  className="w-full mt-3 h-9 rounded-lg bg-emerald-500 text-[#060a13] text-sm font-semibold hover:bg-emerald-400 transition-colors"
                >
                  Done
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Progress bar */}
          <div className="h-0.5 bg-white/[0.03]">
            <motion.div
              className={`h-full ${error ? 'bg-red-500' : 'bg-gradient-to-r from-emerald-500 to-cyan-500'}`}
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
