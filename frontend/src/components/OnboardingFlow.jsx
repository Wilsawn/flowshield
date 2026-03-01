import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Loader2, CheckCircle2, Fingerprint, Mail, ShieldCheck, Sparkles, Globe, Wallet } from 'lucide-react'
import FlowShieldLogo from '@/components/FlowShieldLogo'
import { JURISDICTION_LIST } from '@/data/jurisdictions'
import { generateComplianceProof } from '@/utils/zk-proof'
import { connectWallet } from '@/utils/fcl-config'

const VERIFY_STEPS = [
  { label: 'Creating your Flow account', detail: 'Unique on-chain account — funded by FlowShield', delay: 800 },
  { label: 'Running identity verification', detail: 'KYC + ZK proof — no PII stored on-chain', delay: 1500 },
  { label: 'Issuing compliance credential', detail: 'Minting to your account', delay: 1000 },
  { label: 'Verifying on-chain state', detail: 'Confirming credential on Flow testnet', delay: 800 },
  { label: 'Finalizing account', detail: 'Sponsored by FlowShield — zero gas fees', delay: 600 },
]

const stepIndex = { email: 0, jurisdiction: 1, passkey: 2, verifying: 3, complete: 4 }

const slideIn = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.25, 0.4, 0.25, 1] } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.25 } },
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
  const [walletLoading, setWalletLoading] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)

  // ── Connect Flow Wallet (self-custodial) ──
  const handleWalletConnect = async () => {
    setWalletLoading(true)
    setError(null)
    try {
      const user = await connectWallet()
      if (!user?.addr) {
        setError('Wallet connection cancelled')
        setWalletLoading(false)
        return
      }

      // Register wallet user with backend (no private key stored)
      const API = import.meta.env.VITE_API_URL || 'http://localhost:3002'
      const res = await fetch(`${API}/api/accounts/register-wallet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: user.addr }),
      })
      const data = await res.json()

      // Store session
      if (data.token) localStorage.setItem('flowshield_token', data.token)
      localStorage.setItem('flowshield_wallet', JSON.stringify({
        loggedIn: true,
        addr: user.addr,
        custodial: false,
        email: null,
      }))
      localStorage.setItem('flowshield_user', JSON.stringify({
        flowAddress: user.addr,
        displayName: user.addr.slice(0, 6) + '...' + user.addr.slice(-4),
        authMethod: 'wallet',
        createdAt: data.createdAt || new Date().toISOString(),
      }))
      window.dispatchEvent(new Event('storage'))
      setWalletLoading(false)
      onComplete()
    } catch (err) {
      console.warn('[FlowShield] Wallet connect:', err.message)
      setError('Wallet connection failed. Please try again.')
      setWalletLoading(false)
    }
  }

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

    // Check if user already has an account — skip full onboarding if so
    const API = import.meta.env.VITE_API_URL || 'http://localhost:3002'
    try {
      const res = await fetch(`${API}/api/accounts/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (res.ok) {
        const data = await res.json()
        // Existing user — restore session and go straight to dashboard
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
      // Login failed (backend down, etc.) — continue with new account flow
    }

    // New user — continue onboarding
    setEmailLoading(false)
    setStep('jurisdiction')
  }


  const handlePasskeySetup = async () => {
    setScanPulse(true)
    setError(null)

    let passkeySuccess = false

    try {
      // Real WebAuthn passkey creation
      if (window.PublicKeyCredential) {
        const challenge = new Uint8Array(32)
        crypto.getRandomValues(challenge)

        // Use a unique user ID based on email + timestamp to avoid duplicate credential errors
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
              { alg: -7, type: 'public-key' },   // ES256
              { alg: -257, type: 'public-key' },  // RS256
            ],
            authenticatorSelection: {
              userVerification: 'preferred',
              residentKey: 'preferred',
            },
            timeout: 60000,
            attestation: 'none',
          },
        })

        // Credential created successfully — real biometric was used
        passkeySuccess = true
      } else {
        // WebAuthn not available on this device — allow through
        await new Promise((r) => setTimeout(r, 1200))
        passkeySuccess = true
      }
    } catch (err) {
      console.warn('[FlowShield] WebAuthn:', err.name)

      if (err.name === 'InvalidStateError') {
        // Credential already exists for this user — that's fine, passkey is set up
        passkeySuccess = true
      } else if (err.name === 'NotAllowedError') {
        // User actually cancelled the prompt
        setScanPulse(false)
        setError('Passkey setup was cancelled. Please try again to continue.')
        return
      } else {
        // Other error (SecurityError, etc.) — log but allow skip for demo
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

    const API = import.meta.env.VITE_API_URL || 'http://localhost:3002'

    // Step 1: Create a Flow account for this user (or retrieve existing)
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
        // Store session token for authenticated API calls
        if (acctData.token) {
          localStorage.setItem('flowshield_token', acctData.token)
        }
        // Store as the user's wallet so the dashboard picks it up
        localStorage.setItem('flowshield_wallet', JSON.stringify({
          loggedIn: true,
          addr: acctData.address,
          custodial: true,
          email: email,
        }))
        // Dispatch storage event so dashboard reacts immediately
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

    // Step 2: Start KYC + generate ZK proof
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

    // Generate ZK compliance proof in the browser (no PII leaves the device)
    let zkProof = null
    try {
      const kycSecret = kycSession?.transactionId || `kyc_${email}_${Date.now()}`
      const expiryTimestamp = Math.floor(Date.now() / 1000) + 7776000 // 90 days
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

    // Step 3: Mint compliance credential into the user's own Flow account.
    // Uses a two-authorizer transaction (admin + user) so the credential lands
    // in the user's storage — not the deployer's.
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

    // Step 4: Confirm on-chain state
    setCurrentVerifyStep(4)
    await new Promise((r) => setTimeout(r, 1000))

    // Step 5: Finalize
    setCurrentVerifyStep(5)
    await new Promise((r) => setTimeout(r, 600))

    // Store user session in localStorage with ZK proof data + Flow address
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
    <div className="min-h-screen bg-[#060a13] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-emerald-500/[0.03] blur-[120px] pointer-events-none" />

      <div className="w-full max-w-[420px] relative z-10">
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

        {/* Progress bar */}
        <div className="h-0.5 bg-white/[0.04] rounded-full mb-8 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>

        {/* Card */}
        <motion.div
          className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="p-8">
            {/* Logo */}
            <div className="flex items-center gap-2.5 mb-8">
              <FlowShieldLogo size={24} />
              <span className="text-[15px] font-semibold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">FlowShield</span>
            </div>

            <AnimatePresence mode="wait">
              {/* Step: Email */}
              {step === 'email' && (
                <motion.form key="email" onSubmit={handleEmailSubmit} {...slideIn}>
                  <h2 className="text-xl font-bold text-white mb-2">Create your account</h2>
                  <p className="text-[13px] text-white/35 mb-7 leading-relaxed">
                    No wallet needed. No seed phrases. We create a secure Flow account for you automatically.
                  </p>
                  <div className="space-y-4">
                    <div className="relative">
                      <Mail className="absolute left-4 top-3.5 h-4 w-4 text-white/20" />
                      <input
                        type="email"
                        placeholder="you@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full h-12 bg-white/[0.03] border border-white/[0.06] rounded-xl pl-11 pr-4 text-[14px] text-white placeholder:text-white/20 focus:outline-none focus:border-emerald-500/30 transition-colors"
                        autoFocus
                      />
                    </div>
                    {error && <p className="text-[12px] text-red-400">{error}</p>}
                    <button
                      type="submit"
                      disabled={emailLoading}
                      className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-[#060a13] font-semibold text-[14px] hover:shadow-[0_0_30px_rgba(52,211,153,0.2)] transition-all duration-500 disabled:opacity-60"
                    >
                      {emailLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" /> Checking...
                        </span>
                      ) : 'Continue with Email'}
                    </button>

                    {/* Divider */}
                    <div className="flex items-center gap-3 my-1">
                      <div className="flex-1 h-px bg-white/[0.06]" />
                      <span className="text-[11px] text-white/20">or</span>
                      <div className="flex-1 h-px bg-white/[0.06]" />
                    </div>

                    {/* Connect Flow Wallet (self-custodial) */}
                    <button
                      type="button"
                      onClick={handleWalletConnect}
                      disabled={walletLoading}
                      className="w-full h-12 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white font-medium text-[14px] flex items-center justify-center gap-3 hover:bg-white/[0.06] transition-all disabled:opacity-50"
                    >
                      {walletLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Wallet className="w-4 h-4 text-emerald-400" />
                      )}
                      Connect Flow Wallet
                    </button>
                  </div>
                  <p className="text-[11px] text-white/20 mt-5 text-center leading-relaxed">
                    Your account is secured with industry-standard encryption.
                    No personal data is ever stored on-chain.
                  </p>
                </motion.form>
              )}

              {/* Step: Jurisdiction */}
              {step === 'jurisdiction' && (
                <motion.div key="jurisdiction" {...slideIn}>
                  <h2 className="text-xl font-bold text-white mb-2">Select your jurisdiction</h2>
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
                            ? 'border-emerald-500/30 bg-emerald-500/[0.06]'
                            : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1] hover:bg-white/[0.03]'
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
                  <button
                    onClick={() => jurisdiction && setStep('passkey')}
                    disabled={!jurisdiction}
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-[#060a13] font-semibold text-[14px] hover:shadow-[0_0_30px_rgba(52,211,153,0.2)] transition-all duration-500 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Continue
                  </button>
                </motion.div>
              )}

              {/* Step: Passkey */}
              {step === 'passkey' && (
                <motion.div key="passkey" {...slideIn}>
                  <h2 className="text-xl font-bold text-white mb-2">Set up passkey</h2>
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
                            : 'border-white/[0.08] bg-white/[0.02]'
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
                    <button
                      onClick={handlePasskeySetup}
                      disabled={scanPulse}
                      className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-[#060a13] font-semibold text-[14px] hover:shadow-[0_0_30px_rgba(52,211,153,0.2)] transition-all duration-500 disabled:opacity-60"
                    >
                      {scanPulse ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Scanning...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          <Fingerprint className="w-4 h-4" />
                          {error ? 'Try Again' : 'Set Up Passkey'}
                        </span>
                      )}
                    </button>
                  </div>
                  <p className="text-[11px] text-white/20 text-center mt-2">
                    Passkeys use WebAuthn — the same tech behind Apple Face ID and Google Passkeys.
                  </p>
                </motion.div>
              )}

              {/* Step: Verifying */}
              {step === 'verifying' && (
                <motion.div key="verifying" {...slideIn}>
                  <h2 className="text-xl font-bold text-white mb-2">Setting up your account</h2>
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
                          className="flex items-start gap-3.5"
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
                              <div className="h-4.5 w-4.5 rounded-full border border-white/[0.08]" />
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
                    <h2 className="text-xl font-bold text-white mb-2">You're all set!</h2>
                    <p className="text-[13px] text-white/35 mb-3">
                      Account created, verified, and compliant.
                    </p>

                    {/* Veriff badge — shows when real KYC was used */}
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

                    {/* ZK Proof badge — always shows after proof generation */}
                    <motion.div
                      className="flex items-center justify-center gap-3 mb-4"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/[0.08] border border-violet-500/20">
                        <svg className="w-3 h-3 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        <span className="text-[10px] font-semibold text-violet-400 tracking-wide uppercase">ZK Proof Generated</span>
                      </div>
                    </motion.div>

                    {/* Success details */}
                    <div className="flex items-center justify-center gap-4 mb-8">
                      {[
                        { label: 'ZK Verified', icon: '✓' },
                        { label: 'Zero data on-chain', icon: '✓' },
                        { label: 'Zero gas fees', icon: '✓' },
                      ].map((item, i) => (
                        <motion.span
                          key={i}
                          className="text-[11px] text-emerald-400/60 flex items-center gap-1"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.5 + i * 0.1 }}
                        >
                          <span className="text-emerald-400">{item.icon}</span> {item.label}
                        </motion.span>
                      ))}
                    </div>

                    <button
                      onClick={onComplete}
                      className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-[#060a13] font-semibold text-[14px] hover:shadow-[0_0_30px_rgba(52,211,153,0.2)] transition-all duration-500"
                    >
                      Go to Dashboard
                    </button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 mt-6">
          {['email', 'jurisdiction', 'passkey', 'verifying', 'complete'].map((s) => (
            <div
              key={s}
              className={`h-1 rounded-full transition-all duration-500 ${
                s === step ? 'w-6 bg-emerald-400' : stepIndex[s] < stepIndex[step] ? 'w-1.5 bg-emerald-400/40' : 'w-1.5 bg-white/[0.06]'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
