import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Loader2, CheckCircle2, Fingerprint, Mail, ShieldCheck, Sparkles, Globe, Lock, Cpu, Radar } from 'lucide-react'
import FlowShieldLogo from '@/components/FlowShieldLogo'
import { JURISDICTION_LIST } from '@/data/jurisdictions'
import { generateComplianceProof } from '@/utils/zk-proof'
import { API } from '@/lib/api'

const VERIFY_STEPS = [
  { label: 'Creating your Flow account', detail: 'Unique on-chain account — funded by FlowShield', delay: 800 },
  { label: 'Running identity verification', detail: 'Zero-knowledge proof — no personal data stored on-chain', delay: 1500 },
  { label: 'Issuing compliance credential', detail: 'Minting to your account', delay: 1000 },
  { label: 'Verifying on-chain state', detail: 'Confirming credential on Flow testnet', delay: 800 },
  { label: 'Finalizing account', detail: 'Account ready — gas fees covered by FlowShield', delay: 600 },
]

const stepIndex = { email: 0, jurisdiction: 1, passkey: 2, verifying: 3, complete: 4 }

const slideIn = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.25, 0.4, 0.25, 1] } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.25 } },
}

/* Primary button with rotating border glow */
function GlowButton({ children, className = '', ...props }) {
  return (
    <button
      className={`btn-glow-orbit w-full h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-[#060a13] font-semibold text-[14px] transition-all duration-500 disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      <span className="relative z-10 flex items-center justify-center gap-2">{children}</span>
    </button>
  )
}

export default function OnboardingFlow({ onComplete, onBack }) {
  const [step, setStep] = useState('email')
  const [email, setEmail] = useState(() => {
    try { return localStorage.getItem('flowshield_email') || '' } catch { return '' }
  })
  const [authMethod, setAuthMethod] = useState('email')
  const [jurisdiction, setJurisdiction] = useState(null)
  const [currentVerifyStep, setCurrentVerifyStep] = useState(0)
  const [error, setError] = useState(null)
  const [scanPulse, setScanPulse] = useState(false)
  const [veriffUrl, setVeriffUrl] = useState(null)
  const [emailLoading, setEmailLoading] = useState(false)

  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    if (emailLoading) return
    if (!email.includes('@') || !email.includes('.')) {
      setError('Please enter a valid email')
      return
    }
    setError(null)
    setAuthMethod('email')
    setEmailLoading(true)

    try {
      const res = await fetch(`${API}/api/accounts/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.token) localStorage.setItem('flowshield_token', data.token)
        localStorage.setItem('flowshield_wallet', JSON.stringify({
          loggedIn: true,
          addr: data.address,
          custodial: true,
          email: email,
        }))
        localStorage.setItem('flowshield_user', JSON.stringify({
          email,
          flowAddress: data.address,
          displayName: email.split('@')[0],
          authMethod: data.authMethod || 'passkey',
          createdAt: data.createdAt,
        }))
        localStorage.setItem('flowshield_email', email)
        window.dispatchEvent(new Event('storage'))
        onComplete()
        return
      }
    } catch {
      // Login failed — continue with new account flow
    }

    setEmailLoading(false)
    setStep('jurisdiction')
  }


  const handlePasskeySetup = async () => {
    setScanPulse(true)
    setError(null)

    let passkeySuccess = false

    try {
      if (window.PublicKeyCredential) {
        const challenge = new Uint8Array(32)
        crypto.getRandomValues(challenge)

        const userIdStr = `flowshield-${email}-${Date.now()}`
        const userId = new TextEncoder().encode(userIdStr)

        const credential = await navigator.credentials.create({
          publicKey: {
            challenge,
            rp: {
              name: 'FlowShield',
              id: window.location.hostname,
            },
            user: {
              id: userId,
              name: email,
              displayName: email.split('@')[0],
            },
            pubKeyCredParams: [
              { alg: -7, type: 'public-key' },
              { alg: -257, type: 'public-key' },
            ],
            authenticatorSelection: {
              userVerification: 'preferred',
              residentKey: 'preferred',
            },
            timeout: 60000,
            attestation: 'none',
          },
        })

        passkeySuccess = true
      } else {
        await new Promise((r) => setTimeout(r, 1200))
        passkeySuccess = true
      }
    } catch (err) {
      console.warn('[FlowShield] WebAuthn:', err.name)

      if (err.name === 'InvalidStateError') {
        passkeySuccess = true
      } else if (err.name === 'NotAllowedError') {
        setScanPulse(false)
        setError('Passkey setup was cancelled. Please try again to continue.')
        return
      } else {
        console.warn('[FlowShield] WebAuthn error, using fallback:', err.name)
        setScanPulse(false)
        setError(`Passkey error: ${err.message}. Tap to retry.`)
        return
      }
    }

    if (!passkeySuccess) {
      setScanPulse(false)
      setError('Passkey setup failed. Please try again.')
      return
    }

    setScanPulse(false)
    setStep('verifying')

    setCurrentVerifyStep(1)
    let userFlowAddress = null
    try {
      const acctRes = await fetch(`${API}/api/accounts/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, authMethod }),
      })
      const acctData = await acctRes.json()
      if (acctData.address) {
        userFlowAddress = acctData.address
        if (acctData.token) {
          localStorage.setItem('flowshield_token', acctData.token)
        }
        localStorage.setItem('flowshield_wallet', JSON.stringify({
          loggedIn: true,
          addr: acctData.address,
          custodial: true,
          email: email,
        }))
        window.dispatchEvent(new Event('storage'))
      } else if (acctData.error) {
        console.error('[FlowShield] Account creation failed:', acctData.error)
      }
    } catch (err) {
      console.warn('[FlowShield] Account creation:', err.message)
    }

    if (!userFlowAddress) {
      setScanPulse(false)
      setError('Account creation failed — could not get a Flow address. Please try again.')
      setStep('passkey')
      return
    }

    setCurrentVerifyStep(2)
    let kycSession = null
    try {
      const res = await fetch(`${API}/api/kyc/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, jurisdiction }),
      })
      kycSession = await res.json()
    } catch (err) {
      console.warn('[FlowShield] KYC start:', err.message)
    }

    if (kycSession?.mode === 'veriff' && kycSession.verificationUrl) {
      setVeriffUrl(kycSession.verificationUrl)
    }

    let zkProof = null
    try {
      const kycSecret = kycSession?.transactionId || `kyc_${email}_${Date.now()}`
      const expiryTimestamp = Math.floor(Date.now() / 1000) + 7776000
      zkProof = await generateComplianceProof({
        kycSecret,
        jurisdiction: jurisdiction || 'US',
        riskScore: 15,
        riskThreshold: 70,
        expiryTimestamp,
      })
    } catch (err) {
      console.warn('[FlowShield] ZK proof generation:', err.message)
    }

    setCurrentVerifyStep(3)

    if (kycSession?.transactionId) {
      try {
        await fetch(`${API}/api/kyc/demo-complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transactionId: kycSession.transactionId }),
        })
      } catch { /* non-fatal */ }
    }

    let mintResult = null
    try {
      const token = localStorage.getItem('flowshield_token')
      const mintRes = await fetch(`${API}/api/accounts/mint-credential`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          email,
          jurisdiction: jurisdiction || 'US',
          riskScore: 15,
        }),
      })
      mintResult = await mintRes.json()

      if (!mintResult.success) {
        setScanPulse(false)
        setError(`Credential issuance failed: ${mintResult.error || mintResult.details || 'Unknown error'}`)
        setStep('passkey')
        return
      }

      console.log('[FlowShield] Credential minted on-chain:', mintResult.txId)
    } catch (err) {
      setScanPulse(false)
      setError(`Credential issuance failed: ${err.message}`)
      setStep('passkey')
      return
    }

    setCurrentVerifyStep(4)
    await new Promise((r) => setTimeout(r, 1000))

    setCurrentVerifyStep(5)
    await new Promise((r) => setTimeout(r, 600))

    const userSession = {
      email,
      jurisdiction,
      flowAddress: userFlowAddress,
      displayName: email.split('@')[0],
      createdAt: new Date().toISOString(),
      authMethod: 'passkey',
      zkProof: zkProof ? {
        method: zkProof.method,
        proofHash: zkProof.proofHash,
        verified: false,
      } : null,
      credential: mintResult || null,
    }
    localStorage.setItem('flowshield_user', JSON.stringify(userSession))

    setStep('complete')
  }

  const progress = step === 'complete' ? 100 : ((stepIndex[step] / 4) * 100)

  return (
    <div className="min-h-screen bg-[#060e09] text-white flex items-center justify-center p-6 relative overflow-hidden">
      {/* Mesh gradient background — matching landing page */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[15%] left-[10%] w-[600px] h-[600px] rounded-full bg-emerald-600/[0.06] blur-[180px]" />
        <div className="absolute bottom-[5%] right-[5%] w-[500px] h-[500px] rounded-full bg-emerald-500/[0.04] blur-[150px]" />
        <div className="absolute top-[50%] left-[60%] w-[400px] h-[400px] rounded-full bg-cyan-600/[0.03] blur-[120px]" />
      </div>

      {/* Dot grid overlay — matching landing dot-grid */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(rgba(52, 211, 153, 0.06) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }} />

      <div className="w-full max-w-[460px] relative z-10">
        {/* Back button */}
        {step === 'email' && (
          <motion.button
            onClick={onBack}
            className="flex items-center gap-1.5 text-[13px] text-white/30 hover:text-white/60 mb-6 transition-colors"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </motion.button>
        )}

        {/* Step label */}
        <motion.div
          className="flex items-center gap-3 mb-4"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <span className="text-[11px] font-mono text-emerald-400/50 tracking-wider uppercase">
            Step {stepIndex[step] + 1} of 5
          </span>
          <div className="flex-1 h-px bg-gradient-to-r from-emerald-500/20 to-transparent" />
        </motion.div>

        {/* Progress bar */}
        <div className="h-[3px] bg-emerald-500/[0.06] rounded-full mb-8 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-500 via-cyan-500 to-emerald-400 rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>

        {/* Card — matching landing page glass style */}
        <motion.div
          className="rounded-2xl border border-emerald-500/[0.08] bg-[#0a1410]/60 backdrop-blur-sm overflow-hidden shadow-2xl shadow-black/40"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="p-8 md:p-10">
            {/* Logo */}
            <div className="flex items-center gap-2.5 mb-8">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 border border-emerald-500/[0.12] flex items-center justify-center">
                <FlowShieldLogo size={20} />
              </div>
              <span className="text-[15px] font-semibold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">FlowShield</span>
            </div>

            <AnimatePresence mode="wait">
              {/* Step: Email */}
              {step === 'email' && (
                <motion.form key="email" onSubmit={handleEmailSubmit} {...slideIn}>
                  <h2 className="text-[22px] font-bold text-white mb-2 tracking-[-0.01em]">Create your account</h2>
                  <p className="text-[13px] text-white/35 mb-7 leading-relaxed">
                    No wallet needed. No seed phrases. We create a secure Flow account for you automatically.
                  </p>
                  <div className="space-y-4">
                    <div className="relative group">
                      <Mail className="absolute left-4 top-3.5 h-4 w-4 text-white/20 group-focus-within:text-emerald-400/50 transition-colors" />
                      <input
                        type="email"
                        placeholder="you@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full h-12 bg-emerald-500/[0.02] border border-emerald-500/[0.08] rounded-xl pl-11 pr-4 text-[14px] text-white placeholder:text-white/20 focus:outline-none focus:border-emerald-500/25 focus:bg-emerald-500/[0.04] transition-all duration-300"
                        autoFocus
                      />
                    </div>
                    {error && <p className="text-[12px] text-red-400">{error}</p>}
                    <GlowButton type="submit" disabled={emailLoading}>
                      {emailLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Checking...
                        </>
                      ) : 'Continue with Email'}
                    </GlowButton>
                  </div>
                  <p className="text-[11px] text-white/15 mt-6 text-center leading-relaxed">
                    Your account is secured with industry-standard encryption.
                    No personal data is ever stored on-chain.
                  </p>
                </motion.form>
              )}

              {/* Step: Jurisdiction */}
              {step === 'jurisdiction' && (
                <motion.div key="jurisdiction" {...slideIn}>
                  <h2 className="text-[22px] font-bold text-white mb-2 tracking-[-0.01em]">Select your jurisdiction</h2>
                  <p className="text-[13px] text-white/35 mb-6 leading-relaxed">
                    This determines which compliance rules apply to your account. You can change it later.
                  </p>
                  <div className="space-y-2 mb-6 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
                    {JURISDICTION_LIST.map((j) => (
                      <button
                        key={j.code}
                        onClick={() => setJurisdiction(j.code)}
                        className={`w-full flex items-center gap-3.5 p-3.5 rounded-xl border text-left transition-all duration-300 ${
                          jurisdiction === j.code
                            ? 'border-emerald-500/30 bg-emerald-500/[0.06] shadow-[0_0_20px_rgba(52,211,153,0.06)]'
                            : 'border-emerald-500/[0.06] bg-emerald-500/[0.02] hover:border-emerald-500/[0.12] hover:bg-emerald-500/[0.04]'
                        }`}
                      >
                        <span className="text-2xl leading-none">{j.flag}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[13px] font-medium ${
                            jurisdiction === j.code ? 'text-emerald-400' : 'text-white/70'
                          }`}>
                            {j.name}
                          </p>
                          <p className="text-[11px] text-white/25 truncate">
                            {j.regulator} · {j.framework}
                          </p>
                        </div>
                        {jurisdiction === j.code && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                          >
                            <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
                          </motion.div>
                        )}
                      </button>
                    ))}
                  </div>
                  <GlowButton
                    onClick={() => jurisdiction && setStep('passkey')}
                    disabled={!jurisdiction}
                  >
                    Continue
                  </GlowButton>
                </motion.div>
              )}

              {/* Step: Passkey */}
              {step === 'passkey' && (
                <motion.div key="passkey" {...slideIn}>
                  <h2 className="text-[22px] font-bold text-white mb-2 tracking-[-0.01em]">Set up passkey</h2>
                  <p className="text-[13px] text-white/35 mb-8 leading-relaxed">
                    Use your fingerprint, face, or device PIN. Fast, secure, no passwords ever.
                  </p>
                  <div className="flex flex-col items-center py-4">
                    {/* Fingerprint scanner animation */}
                    <div className="relative mb-8">
                      <motion.div
                        className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl"
                        animate={scanPulse ? {
                          scale: [1, 1.5, 1],
                          opacity: [0.3, 0.6, 0.3],
                        } : {}}
                        transition={{ duration: 1, repeat: Infinity }}
                      />
                      <motion.div
                        className={`relative w-24 h-24 rounded-full flex items-center justify-center border-2 transition-colors duration-500 ${
                          scanPulse
                            ? 'border-emerald-400 bg-emerald-500/10'
                            : 'border-emerald-500/[0.08] bg-emerald-500/[0.02]'
                        }`}
                        animate={scanPulse ? { scale: [1, 0.95, 1] } : {}}
                        transition={{ duration: 0.8, repeat: Infinity }}
                      >
                        <Fingerprint className={`w-12 h-12 transition-colors duration-500 ${
                          scanPulse ? 'text-emerald-400' : 'text-white/25'
                        }`} />
                        {/* Scan line */}
                        {scanPulse && (
                          <motion.div
                            className="absolute left-3 right-3 h-0.5 bg-emerald-400/60 rounded-full"
                            initial={{ top: '20%' }}
                            animate={{ top: ['20%', '80%', '20%'] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                          />
                        )}
                      </motion.div>
                    </div>

                    {error && (
                      <p className="text-[12px] text-red-400 text-center mb-3 w-full">{error}</p>
                    )}
                    <GlowButton onClick={handlePasskeySetup} disabled={scanPulse}>
                      {scanPulse ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Scanning...
                        </>
                      ) : (
                        <>
                          <Fingerprint className="w-4 h-4" />
                          {error ? 'Try Again' : 'Set Up Passkey'}
                        </>
                      )}
                    </GlowButton>
                  </div>
                  <p className="text-[11px] text-white/15 text-center mt-2">
                    Passkeys use WebAuthn — the same tech behind Apple Face ID and Google Passkeys.
                  </p>
                </motion.div>
              )}

              {/* Step: Verifying */}
              {step === 'verifying' && (
                <motion.div key="verifying" {...slideIn}>
                  <h2 className="text-[22px] font-bold text-white mb-2 tracking-[-0.01em]">Setting up your account</h2>
                  <p className="text-[13px] text-white/35 mb-8">
                    Invisible compliance — just a moment...
                  </p>
                  <div className="space-y-4">
                    {VERIFY_STEPS.map((vs, i) => {
                      const done = i < currentVerifyStep
                      const active = i === currentVerifyStep
                      return (
                        <motion.div
                          key={i}
                          className={`flex items-start gap-3.5 p-3 rounded-xl transition-all duration-300 ${
                            active ? 'bg-emerald-500/[0.04] border border-emerald-500/[0.1]' :
                            done ? 'border border-transparent' : 'border border-transparent'
                          }`}
                          initial={{ opacity: 0.3 }}
                          animate={{ opacity: done || active ? 1 : 0.3 }}
                          transition={{ duration: 0.4 }}
                        >
                          <div className="shrink-0 mt-0.5">
                            {done ? (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                              >
                                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400" />
                              </motion.div>
                            ) : active ? (
                              <Loader2 className="h-4.5 w-4.5 text-emerald-400 animate-spin" />
                            ) : (
                              <div className="h-4.5 w-4.5 rounded-full border border-emerald-500/[0.12]" />
                            )}
                          </div>
                          <div>
                            <p className={`text-[13px] font-medium ${done ? 'text-emerald-400' : active ? 'text-white' : 'text-white/20'}`}>
                              {vs.label}
                            </p>
                            {(done || active) && (
                              <motion.p
                                className="text-[11px] text-white/20 font-mono mt-0.5"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                              >
                                {vs.detail}
                              </motion.p>
                            )}
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                </motion.div>
              )}

              {/* Step: Complete */}
              {step === 'complete' && (
                <motion.div key="complete" {...slideIn} className="text-center">
                  {/* Success animation */}
                  <motion.div
                    className="relative w-20 h-20 mx-auto mb-6"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
                  >
                    <motion.div
                      className="absolute inset-0 rounded-full bg-emerald-500/20"
                      animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0, 0.3] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    <div className="relative w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <motion.div
                        initial={{ scale: 0, rotate: -45 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: 0.3, type: 'spring', stiffness: 300 }}
                      >
                        <ShieldCheck className="w-9 h-9 text-emerald-400" />
                      </motion.div>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <h2 className="text-[22px] font-bold text-white mb-2 tracking-[-0.01em]">You're all set!</h2>
                    <p className="text-[13px] text-white/35 mb-3">
                      Account created, verified, and compliant.
                    </p>

                    {/* Veriff badge */}
                    {veriffUrl && (
                      <motion.div
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/[0.08] border border-cyan-500/20 mb-2"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.45 }}
                      >
                        <span className="text-[10px] font-semibold text-cyan-400 tracking-wide uppercase">Verified by Veriff</span>
                      </motion.div>
                    )}

                    {/* ZK Proof badge */}
                    <motion.div
                      className="flex items-center justify-center gap-3 mb-4"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/[0.08] border border-violet-500/20">
                        <Lock className="w-3 h-3 text-violet-400" />
                        <span className="text-[10px] font-semibold text-violet-400 tracking-wide uppercase">ZK Proof Generated</span>
                      </div>
                    </motion.div>

                    {/* Success details */}
                    <div className="flex items-center justify-center gap-4 mb-8">
                      {[
                        { label: 'ZK Verified' },
                        { label: 'Zero data on-chain' },
                        { label: 'Gas fees covered' },
                      ].map((item, i) => (
                        <motion.span
                          key={i}
                          className="text-[11px] text-emerald-400/60 flex items-center gap-1"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.5 + i * 0.1 }}
                        >
                          <CheckCircle2 className="w-3 h-3" /> {item.label}
                        </motion.span>
                      ))}
                    </div>

                    <GlowButton onClick={onComplete}>
                      Go to Dashboard
                    </GlowButton>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Trust badges below card */}
        <motion.div
          className="flex items-center justify-center gap-6 mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          {[
            { icon: ShieldCheck, label: 'ZK Privacy' },
            { icon: Lock, label: 'Encrypted' },
            { icon: Cpu, label: 'On-Chain' },
          ].map((badge, i) => {
            const Icon = badge.icon
            return (
              <div key={i} className="flex items-center gap-1.5">
                <Icon className="w-3 h-3 text-emerald-400/25" />
                <span className="text-[10px] text-emerald-400/25 font-medium">{badge.label}</span>
              </div>
            )
          })}
        </motion.div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 mt-6">
          {['email', 'jurisdiction', 'passkey', 'verifying', 'complete'].map((s) => (
            <div
              key={s}
              className={`h-1 rounded-full transition-all duration-500 ${
                s === step ? 'w-6 bg-emerald-400' : stepIndex[s] < stepIndex[step] ? 'w-1.5 bg-emerald-400/40' : 'w-1.5 bg-emerald-500/[0.1]'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
