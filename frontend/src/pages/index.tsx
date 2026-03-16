import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Fingerprint, Bot, Lock, Cpu, Radar, ArrowRight, Scan, ChevronRight, Check, AlertTriangle, User, Copy, CheckCheck, Globe, FileCode, KeyRound, MessageSquare, Workflow } from 'lucide-react'
import { motion, AnimatePresence, useScroll, useTransform, useMotionValueEvent } from 'framer-motion'
import OnboardingFlow from '@/components/OnboardingFlow'
import FlowShieldLogo from '@/components/FlowShieldLogo'
import ProductShowcase from '@/components/ProductShowcase'
import FloatingNav from '@/components/FloatingNav'
import DataGridHero from '@/components/ui/data-grid-hero'
import { Button } from '@/components/ui/button'
import { getSupabaseSession, signOutSupabase } from '@/lib/supabase'
import { API } from '@/lib/api'

/* ── shared glass card style (opaque enough for readability) ── */
const glass = 'rounded-xl border border-white/[0.08] bg-[#0a0f0c]/95'
const glassInner = 'rounded-xl border border-white/[0.08] bg-[#0a0f0c]/90'

/** Replace with your case study or integration doc when live */
const CASE_STUDY_URL = 'https://github.com/Wilsawn/flowshield'

export default function LandingPage() {
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [redirectTarget, setRedirectTarget] = useState('/dashboard')
  const [activeAgent, setActiveAgent] = useState(0)
  const [integrationCopied, setIntegrationCopied] = useState(false)
  const [googleEmail, setGoogleEmail] = useState(null)
  const navigate = useNavigate()

  const { scrollY } = useScroll()
  const heroOpacity = useTransform(scrollY, [0, 500], [1, 0])
  const heroScale = useTransform(scrollY, [0, 500], [1, 0.96])

  // Handle Google OAuth callback
  useEffect(() => {
    async function handleOAuthReturn() {
      const session = await getSupabaseSession()
      if (!session?.user?.email) return
      const email = session.user.email

      // Clear Supabase auth session — we use our own HMAC tokens
      await signOutSupabase()

      // Try logging in as existing user
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
            email,
          }))
          localStorage.setItem('flowshield_user', JSON.stringify({
            email,
            flowAddress: data.address,
            displayName: email.split('@')[0],
            authMethod: data.authMethod || 'google',
            createdAt: data.createdAt,
          }))
          localStorage.setItem('flowshield_email', email)
          window.dispatchEvent(new Event('storage'))
          navigate('/dashboard')
          return
        }
      } catch { /* login failed — new user */ }

      // New user — open onboarding pre-filled at jurisdiction step
      setGoogleEmail(email)
      localStorage.setItem('flowshield_email', email)
      setRedirectTarget('/dashboard')
      setShowOnboarding(true)
    }
    handleOAuthReturn()
  }, [navigate])

  const isLoggedIn = () => {
    try {
      const token = localStorage.getItem('flowshield_token')
      const wallet = localStorage.getItem('flowshield_wallet')
      const parsed = wallet ? JSON.parse(wallet) : null
      return token && parsed?.loggedIn && parsed?.addr
    } catch { return false }
  }

  const handleLaunch = () => {
    if (isLoggedIn()) { navigate('/dashboard'); return }
    setRedirectTarget('/dashboard')
    setShowOnboarding(true)
  }

  const handleNavigate = (path) => {
    if (isLoggedIn()) { navigate(path); return }
    setRedirectTarget(path)
    setShowOnboarding(true)
  }

  const INTEGRATION_CODE = `// Import the compliance engine
import ComplianceAction from 0x93c691a98b975493

access(all) fun deposit(user: Address, amount: UFix64) {
  let ok = ComplianceAction.verify(user)
  assert(ok, message: "Not compliant")
  // ... deposit logic
}`

  const handleCopyIntegration = async () => {
    try {
      await navigator.clipboard.writeText(INTEGRATION_CODE)
      setIntegrationCopied(true)
      setTimeout(() => setIntegrationCopied(false), 2000)
    } catch { /* fallback */ }
  }

  const handleOnboardingBack = () => {
    // Clear any partial auth state when user abandons onboarding
    localStorage.removeItem('flowshield_token')
    localStorage.removeItem('flowshield_wallet')
    localStorage.removeItem('flowshield_user')
    setGoogleEmail(null)
    setShowOnboarding(false)
  }

  if (showOnboarding) {
    return <OnboardingFlow onComplete={() => navigate(redirectTarget)} onBack={handleOnboardingBack} googleEmail={googleEmail} />
  }

  const [displayedAgent, setDisplayedAgent] = useState(0)
  const [fading, setFading] = useState(false)
  const protocolSurfacesRef = useRef(null)

  useEffect(() => {
    if (activeAgent !== displayedAgent) {
      setFading(true)
      const timer = setTimeout(() => {
        setDisplayedAgent(activeAgent)
        setFading(false)
      }, 180)
      return () => clearTimeout(timer)
    }
  }, [activeAgent])

  const agents = [
    {
      icon: Radar,
      name: 'Regulatory Radar',
      sub: 'Live jurisdiction monitoring',
      preview: (
        <div className="preview-stagger">
          <div className="flex items-center justify-between pb-3 mb-1 border-b border-white/[0.06]">
            <span className="text-[11px] font-medium text-white/30 uppercase tracking-wider">Jurisdiction</span>
            <span className="text-[11px] font-medium text-white/30 uppercase tracking-wider">Status</span>
          </div>
          {[
            { name: 'FinCEN', region: 'United States', ok: true },
            { name: 'MiCA', region: 'European Union', ok: true },
            { name: 'FCA', region: 'United Kingdom', gap: 2 },
            { name: 'MAS', region: 'Singapore', ok: true },
            { name: 'FINTRAC', region: 'Canada', ok: true },
          ].map((j) => (
            <div key={j.name} className="flex items-center justify-between py-2.5 border-b border-white/[0.06] last:border-0">
              <div className="flex items-center gap-3">
                <span className="text-[13px] font-medium text-white/70 w-16">{j.name}</span>
                <span className="text-[11px] text-white/30">{j.region}</span>
              </div>
              {j.ok ? (
                <span className="flex items-center gap-1.5 text-[11px] text-emerald-400/60 font-medium">
                  <Check className="w-3 h-3" /> Compliant
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-[11px] text-amber-400/60 font-medium">
                  <AlertTriangle className="w-3 h-3" /> {j.gap} gaps
                </span>
              )}
            </div>
          ))}
          <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between">
            <span className="text-[10px] text-white/30">Last scanned 3m ago</span>
            <span className="text-[10px] text-white/30">5 / 5 monitored</span>
          </div>
        </div>
      ),
    },
    {
      icon: Scan,
      name: 'Compliance Scanner',
      sub: 'Pre-deploy contract analysis',
      preview: (
        <div className="preview-stagger">
          <div className="rounded-lg bg-[#0a0f0c]/90 border border-white/[0.08] p-4 font-mono text-[12px] leading-[1.8]">
            <span className="text-white/35">import</span> <span className="text-white/60">ComplianceAction</span>
            <br /><span className="text-white/35">fun</span> <span className="text-white/35">deposit</span><span className="text-white/20">(user, amount) {'{'}</span>
            <br /><span className="text-white/20">{'  '}</span><span className="text-white/35">let ok =</span> <span className="text-white/35">ComplianceAction.verify(user)</span>
            <br /><span className="text-white/20">{'  '}</span><span className="text-white/35">assert(ok,</span> <span className="text-white/35">message: "KYC required"</span><span className="text-white/35">)</span>
            <br /><span className="text-white/20">{'}'}</span>
          </div>
          <div className="space-y-1 mt-3">
            <div className="flex items-start gap-2.5 py-2">
              <Check className="w-4 h-4 text-emerald-400/60 mt-0.5 shrink-0" />
              <div>
                <p className="text-[12px] font-medium text-white/60">KYC check found</p>
                <p className="text-[11px] text-white/20">Line 3: verify(user) present</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 py-2">
              <Check className="w-4 h-4 text-emerald-400/60 mt-0.5 shrink-0" />
              <div>
                <p className="text-[12px] font-medium text-white/60">Assertion guard</p>
                <p className="text-[11px] text-white/20">Line 4: revert on failure</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 py-2">
              <AlertTriangle className="w-4 h-4 text-amber-400/60 mt-0.5 shrink-0" />
              <div>
                <p className="text-[12px] font-medium text-white/60">Missing threshold</p>
                <p className="text-[11px] text-white/20">No max transaction limit set</p>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between">
            <span className="text-[10px] text-white/20">3 rules checked</span>
            <span className="text-[10px] text-white/20">2 passed · 1 warning</span>
          </div>
        </div>
      ),
    },
    {
      icon: Bot,
      name: 'Builder Copilot',
      sub: 'AI compliance assistant',
      preview: (
        <div className="preview-stagger space-y-5">
          {/* User message */}
          <div className="flex gap-3 justify-end">
            <div className="flex-1 max-w-[85%]">
              <p className="text-[11px] text-white/35 mb-1.5 text-right">You</p>
              <div className="rounded-2xl rounded-tr-md bg-white/[0.06] border border-white/[0.06] px-4 py-3">
                <p className="text-[13px] text-white/60 leading-relaxed">How do I add compliance checks to my DEX contract?</p>
              </div>
            </div>
            <div className="w-7 h-7 rounded-full bg-white/[0.06] border border-white/[0.06] flex items-center justify-center shrink-0 mt-6">
              <User className="w-3.5 h-3.5 text-white/35" />
            </div>
          </div>

          {/* Copilot response */}
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-white/[0.06] border border-white/[0.06] flex items-center justify-center shrink-0 mt-6">
              <Bot className="w-3.5 h-3.5 text-emerald-400/60" />
            </div>
            <div className="flex-1">
              <p className="text-[11px] text-white/35 mb-1.5">FlowShield Copilot</p>
              <div className="space-y-3">
                <p className="text-[13px] text-white/60 leading-[1.7]">
                  Import <span className="text-white/60 font-mono text-[12px] bg-white/[0.03] px-1.5 py-0.5 rounded">ComplianceAction</span> and call <span className="text-white/60 font-mono text-[12px] bg-white/[0.03] px-1.5 py-0.5 rounded">verify()</span> before each swap:
                </p>
                <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-4 font-mono text-[11px] text-white/35 leading-[1.8]">
                  <span className="text-white/20">import</span> <span className="text-white/60">ComplianceAction</span><br />
                  <br />
                  <span className="text-white/20">let</span> ok = ComplianceAction.<span className="text-white/60">verify</span>(user)<br />
                  <span className="text-white/20">assert</span>(ok, <span className="text-white/35">message:</span> <span className="text-white/35">"KYC required"</span>)
                </div>
              </div>
            </div>
          </div>

          {/* User follow-up */}
          <div className="flex gap-3 justify-end">
            <div className="flex-1 max-w-[85%]">
              <p className="text-[11px] text-white/35 mb-1.5 text-right">You</p>
              <div className="rounded-2xl rounded-tr-md bg-white/[0.06] border border-white/[0.06] px-4 py-3">
                <p className="text-[13px] text-white/60 leading-relaxed">What about MiCA requirements for EU users?</p>
              </div>
            </div>
            <div className="w-7 h-7 rounded-full bg-white/[0.06] border border-white/[0.06] flex items-center justify-center shrink-0 mt-6">
              <User className="w-3.5 h-3.5 text-white/35" />
            </div>
          </div>

          {/* Suggestion pills */}
          <div className="flex gap-2 flex-wrap pl-10">
            <span className="px-3 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.03] text-[11px] text-white/35 hover:text-white/60 hover:bg-white/[0.06] cursor-pointer transition-all">Add transaction limits</span>
            <span className="px-3 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.03] text-[11px] text-white/35 hover:text-white/60 hover:bg-white/[0.06] cursor-pointer transition-all">Check MiCA rules</span>
            <span className="px-3 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.03] text-[11px] text-white/35 hover:text-white/60 hover:bg-white/[0.06] cursor-pointer transition-all">Deploy to testnet</span>
          </div>
        </div>
      ),
    },
    {
      icon: Lock,
      name: 'ZK Verification',
      sub: 'Privacy-preserving proofs',
      preview: (
        <div className="preview-stagger space-y-3">
          {[
            { step: 'Identity data', detail: 'Stays on device', icon: Fingerprint, n: '01' },
            { step: 'ZK Circuit (Groth16)', detail: 'Proof generated client-side', icon: Cpu, n: '02' },
            { step: 'On-chain verification', detail: 'Boolean + expiry written to chain', icon: ShieldCheck, n: '03' },
          ].map((s) => {
            const StepIcon = s.icon
            return (
              <div key={s.n} className="flex items-center gap-4 p-4 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <span className="text-[11px] font-mono text-white/20 shrink-0">{s.n}</span>
                <div className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.06] flex items-center justify-center shrink-0">
                  <StepIcon className="w-3.5 h-3.5 text-white/35" />
                </div>
                <div className="flex-1">
                  <p className="text-[13px] font-medium text-white/60">{s.step}</p>
                  <p className="text-[11px] text-white/20">{s.detail}</p>
                </div>
                <Check className="w-3.5 h-3.5 text-emerald-400/60 shrink-0" />
              </div>
            )
          })}
          <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between">
            <span className="text-[10px] text-white/20">Proof verified in 0.8s</span>
            <span className="flex items-center gap-1.5 text-[10px] text-emerald-400/60">
              <Check className="w-3 h-3" /> Valid until 2026-04-15
            </span>
          </div>
        </div>
      ),
    },
    {
      icon: Cpu,
      name: 'A2A Orchestrator',
      sub: 'Agent-to-agent workflows',
      preview: (
        <div className="preview-stagger">
          <div className="flex items-center justify-between pb-3 mb-1 border-b border-white/[0.06]">
            <span className="text-[11px] font-medium text-white/20 uppercase tracking-wider">Pipeline</span>
            <span className="text-[11px] font-medium text-white/20 uppercase tracking-wider">Status</span>
          </div>
          {[
            { name: 'full-risk-review', agents: 3, status: 'active', time: '2.1s' },
            { name: 'compliance-audit', agents: 2, status: 'idle', time: '—' },
            { name: 'anomaly-scan', agents: 1, status: 'active', time: '0.4s' },
            { name: 'sanctions-check', agents: 2, status: 'active', time: '1.2s' },
            { name: 'report-gen', agents: 1, status: 'idle', time: '—' },
          ].map((chain) => (
            <div key={chain.name} className="flex items-center justify-between py-2.5 border-b border-white/[0.06] last:border-0">
              <div className="flex items-center gap-3">
                <span className="text-[13px] font-mono font-medium text-white/60">{chain.name}</span>
                <span className="text-[11px] text-white/20">{chain.agents} agents</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-white/20 font-mono">{chain.time}</span>
                <span className={`flex items-center gap-1.5 text-[11px] font-medium ${
                  chain.status === 'active' ? 'text-white/35' : 'text-white/20'
                }`}>
                  {chain.status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                  {chain.status === 'active' ? 'Running' : 'Idle'}
                </span>
              </div>
            </div>
          ))}
          <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between">
            <span className="text-[10px] text-white/20">9 agents active</span>
            <span className="text-[10px] text-white/20">3 / 5 pipelines running</span>
          </div>
        </div>
      ),
    },
  ]

  // Sub-features from FlowShield architecture (concise, no status spam)
  const agentSubFeatures = [
    [
      { icon: Globe, name: 'Deterministic checklist', desc: 'Compares RuleEngine rules to fixed checklists for US, EU, UK, SG, CA.' },
      { icon: AlertTriangle, name: 'Gap detection', desc: 'Fix a rule on-chain and the gap disappears on next scan.' },
      { icon: Check, name: 'AI enrichment', desc: 'Claude improves descriptions only. Cannot add or remove gaps.' },
    ],
    [
      { icon: FileCode, name: '8 dimensions', desc: 'KYC/AML, Travel Rule, sanctions, access controls, fund flow, privacy, rate limits, jurisdiction.' },
      { icon: ShieldCheck, name: 'One-line integration', desc: 'ComplianceAction.verify() before deposit, transfer, or withdraw.' },
      { icon: AlertTriangle, name: 'Travel rule', desc: 'MiCA (>€1000) and FinCEN (>$3000) threshold checks.' },
    ],
    [
      { icon: KeyRound, name: 'Client-side proof', desc: 'circom + snarkjs in browser. Identity never leaves the device.' },
      { icon: Lock, name: 'Cross-VM', desc: 'Cadence → FlowEVM Groth16 → boolean → ComplianceCredential.' },
      { icon: Fingerprint, name: 'Zero PII', desc: 'Only complianceHash on-chain. Credential at /storage/FlowShieldCredential.' },
    ],
    [
      { icon: MessageSquare, name: 'Orchestrates agents', desc: 'Chains risk, anomaly, radar, and code scan for full reviews.' },
      { icon: FileCode, name: 'Cadence generation', desc: 'Integration code. Knows all 7 contracts.' },
      { icon: Cpu, name: 'Two modes', desc: 'Developers: code and primitives. End users: risk tiers and rules.' },
    ],
    [
      { icon: Workflow, name: 'A2A protocol', desc: 'Chains Risk, Anomaly, Radar, Copilot. Discovery at /.well-known/agent.json.' },
      { icon: AlertTriangle, name: '8 risk factors', desc: 'Account age, tx volume, rapid in-out, mixer, dormancy. Rule-based.' },
      { icon: Cpu, name: 'Autonomous monitoring', desc: 'ComplianceAgent.runMonitoringCycle() on a recurring timer.' },
    ],
  ]

  // Scroll-driven card changes (Dovetail-style): card updates as you scroll through the section
  const { scrollYProgress } = useScroll({
    target: protocolSurfacesRef,
    offset: ['start start', 'end end'],
  })
  useMotionValueEvent(scrollYProgress, 'change', (latest) => {
    const idx = Math.min(agents.length - 1, Math.max(0, Math.floor(latest * agents.length)))
    setActiveAgent((prev) => (idx !== prev ? idx : prev))
  })

  const scrollToAgent = useCallback((i) => {
    if (!protocolSurfacesRef.current) return
    const block = protocolSurfacesRef.current.querySelector(`[data-agent-block="${i}"]`)
    block?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [])

  return (
    <div className="min-h-screen bg-[#070c09] text-white selection:bg-emerald-500/20 antialiased">

      {/* ─── HERO ─── */}
      <FloatingNav onLaunch={handleLaunch} />

      <section className="sticky top-0 z-0 h-screen overflow-hidden">
        <DataGridHero
          rows={25}
          cols={35}
          spacing={4}
          duration={5}
          color="rgb(52, 211, 153)"
          animationType="random"
          pulseEffect={true}
          mouseGlow={true}
          opacityMin={0.05}
          opacityMax={0.35}
          background="#0a0a0a"
        >
          <motion.div
            className="flex items-center h-screen w-full relative"
            style={{ opacity: heroOpacity, scale: heroScale }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_50%_50%,rgba(10,10,10,0.6),rgba(10,10,10,0.25)_50%,transparent_85%)] pointer-events-none" />
            <div className="relative max-w-6xl mx-auto px-6 w-full py-32 md:py-40">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20 items-start">
                {/* Left: headline + CTA */}
                <div>
                  <motion.div
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/[0.1] bg-[#0a0a0a]/85 backdrop-blur-md mb-8"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-[12px] text-white/60">Live on Flow Testnet</span>
                  </motion.div>

                  <motion.h1
                    className="font-display text-hero mb-6"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <span className="block text-white/95">DeFi compliance.</span>
                    <span className="block text-emerald-400">One import.</span>
                  </motion.h1>

                  <motion.p
                    className="text-[18px] md:text-[20px] leading-[1.6] text-white/50 max-w-[480px] mb-10"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  >
                    Identity-based compliance for Flow smart contracts. Deploys in minutes. Zero PII on-chain.
                  </motion.p>

                  <motion.div
                    className="flex flex-wrap items-center gap-3"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <Button size="lg" onClick={handleLaunch} className="text-base px-6">
                      Try FlowShield
                    </Button>
                    <Button variant="outline" size="lg" asChild className="!bg-transparent !border-white/[0.2] !text-white/70 hover:!bg-white/[0.06] hover:!text-white text-base px-6">
                      <a href="mailto:hello@flowshield.io?subject=FlowShield%20Demo%20Request" target="_blank" rel="noopener noreferrer">
                        Request a Demo
                        <ChevronRight className="w-4 h-4" />
                      </a>
                    </Button>
                  </motion.div>
                </div>

                {/* Right: product preview — Runway-style, shows what protocols get */}
                <motion.div
                  className="hidden lg:block mt-10"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="rounded-xl border border-white/[0.12] bg-[#0a0a0a] overflow-hidden shadow-[0_0_0_1px_rgba(0,0,0,0.5),0_8px_32px_rgba(0,0,0,0.4)]">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                      <span className="text-[12px] text-white/40 font-medium">What your protocol gets</span>
                      <span className="flex items-center gap-1.5 text-[11px] text-emerald-400/80">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Live
                      </span>
                    </div>
                    <div className="p-5 space-y-5">
                      {/* Mini viz: jurisdiction coverage */}
                      <div>
                        <p className="text-[11px] text-white/30 uppercase tracking-wider mb-2">5 jurisdictions covered</p>
                        <div className="flex gap-1">
                          {['US', 'EU', 'UK', 'SG', 'CA'].map((j) => (
                            <div key={j} className="flex-1 h-2 rounded-full bg-emerald-500/30" title={j} />
                          ))}
                        </div>
                        <p className="text-[10px] text-white/25 mt-1.5">FinCEN · MiCA · FCA · MAS · FINTRAC</p>
                      </div>

                      {/* Status row */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] px-3 py-2">
                          <p className="text-[10px] text-white/30 uppercase">Compliance</p>
                          <p className="text-[13px] font-semibold text-emerald-400/90">Active</p>
                        </div>
                        <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] px-3 py-2">
                          <p className="text-[10px] text-white/30 uppercase">Risk</p>
                          <p className="text-[13px] font-semibold text-white/90">12 / 100</p>
                        </div>
                        <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] px-3 py-2">
                          <p className="text-[10px] text-white/30 uppercase">PII on-chain</p>
                          <p className="text-[13px] font-semibold text-white/90">0%</p>
                        </div>
                      </div>

                      {/* Core value: one line */}
                      <div>
                        <p className="text-[11px] text-white/40 mb-2">This is all you add</p>
                        <div className="rounded-lg bg-[#0a0f0c]/95 border border-white/[0.08] p-3 font-mono text-[11px] leading-[1.7]">
                          <span className="text-white/30">import</span>{' '}
                          <span className="text-emerald-400/90">ComplianceAction</span>{' '}
                          <span className="text-white/30">from</span>{' '}
                          <span className="text-white/40">0x93c6...5493</span>
                          <br />
                          <span className="text-white/30">let ok =</span>{' '}
                          <span className="text-emerald-400/90">ComplianceAction</span>
                          <span className="text-white/30">.verify(user)</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleLaunch}
                        className="w-full py-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/25 text-[12px] font-medium text-emerald-400/90 hover:bg-emerald-500/20 transition-colors"
                      >
                        See it in action
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </DataGridHero>
      </section>

      {/* ─── Everything below swoops over the sticky hero ─── */}
      <main className="relative z-10 rounded-t-[40px] bg-[#070c09] shadow-[0_-20px_60px_rgba(0,0,0,0.5)] landing-grid-bg">

      {/* ─── POWERED BY FLOW (seamless infinite marquee) ─── */}
      <div className="py-8 border-b border-white/[0.04] overflow-hidden">
        <p className="text-center text-[11px] font-medium tracking-[0.12em] uppercase text-white/25 mb-5">
          Powered by Flow
        </p>
        <div className="marquee-flow overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)] [-webkit-mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
          <div className="animate-marquee-flow-wrap" style={{ display: 'flex', width: 'max-content' }}>
            {[1, 2].map((copy) => (
              <div key={copy} className="flex shrink-0 items-center" style={{ gap: 0 }}>
                {['Flow', 'Cadence', '7 contracts', '5 jurisdictions', '0% PII', 'FlowEVM', 'ZK proofs', 'US · EU · UK · SG · CA', 'Flow', 'Cadence', '7 contracts', '5 jurisdictions', '0% PII', 'FlowEVM', 'ZK proofs', 'US · EU · UK · SG · CA'].map((item, idx) => (
                  <span key={`${copy}-${idx}`} className="inline-flex shrink-0 items-center whitespace-nowrap text-[13px] text-white/30">
                    <span className="px-4">{item}</span>
                    <span className="text-white/15">·</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── PROTOCOL SURFACES (Dovetail-style: card changes on scroll) ─── */}
      <section ref={protocolSurfacesRef} id="protocol-surfaces" className="scroll-mt-20">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24">
          <div className="mb-12">
            <motion.h2
              className="font-display text-[clamp(1.5rem,3.5vw,2.25rem)] font-bold tracking-[-0.025em] text-white/90 leading-[1.15]"
              initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            >
              Built for every compliance surface
            </motion.h2>
            <motion.p
              className="mt-3 text-[14px] text-white/40 leading-[1.6] max-w-xl"
              initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.05 }}
            >
              Five tools for regulatory monitoring, static analysis, ZK verification, and AI-assisted development.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
            {/* Left: stacked blocks — scroll through these to change the card */}
            <div className="space-y-0">
              {agents.map((agent, i) => {
                const Icon = agent.icon
                const isActive = activeAgent === i
                return (
                  <div
                    key={agent.name}
                    data-agent-block={i}
                    onClick={() => scrollToAgent(i)}
                    className="min-h-[55vh] py-12 lg:py-16 flex flex-col justify-center cursor-pointer group"
                  >
                    <span className="flex items-center gap-2 text-[11px] font-medium text-white/25 uppercase tracking-wider mb-2">
                      <Icon className="w-3.5 h-3.5" />
                      [{String(i + 1).padStart(2, '0')}] {agent.name.replace(/\s+/g, '_').toUpperCase()}
                    </span>
                    <h3 className={`font-display text-xl md:text-2xl font-semibold tracking-[-0.02em] mb-3 transition-colors ${isActive ? 'text-white/95' : 'text-white/60'}`}>
                      {agent.sub}
                    </h3>
                    <p className="text-[14px] text-white/40 leading-[1.6] max-w-md mb-6">
                      {agent.name === 'Regulatory Radar' && 'Scans on-chain rules against real checklists. Deterministic gaps, AI-enriched descriptions.'}
                      {agent.name === 'Compliance Scanner' && 'Static analysis for Cadence. Catches missing KYC, travel rule thresholds, and more.'}
                      {agent.name === 'ZK Verification' && 'Proof in browser, verified on FlowEVM. Identity never touches the chain.'}
                      {agent.name === 'Builder Copilot' && 'Orchestrates risk, anomaly, radar, and code scan. Answers questions, generates Cadence.'}
                      {agent.name === 'A2A Orchestrator' && 'Chains 4 agents. Risk, anomaly, radar, copilot. Scheduled monitoring cycles.'}
                    </p>
                    <div className="h-px bg-white/[0.06] mb-6" />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleLaunch() }}
                      className="text-[11px] font-medium text-white/40 uppercase tracking-wider hover:text-emerald-400/80 transition-colors mb-8 text-left"
                    >
                      Explore {agent.name} features
                    </button>
                    <div className="space-y-6">
                      {agentSubFeatures[i].map((f) => {
                        const IconF = f.icon
                        return (
                          <div key={f.name} className="flex gap-4">
                            <div className="w-9 h-9 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center shrink-0">
                              <IconF className="w-4 h-4 text-emerald-400/70" />
                            </div>
                            <div>
                              <span className="text-[13px] font-semibold text-white/90 block mb-1">{f.name}</span>
                              <p className="text-[12px] text-white/40 leading-[1.6]">{f.desc}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Right: sticky card — updates based on scroll position */}
            <div className="lg:sticky lg:top-24">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="rounded-xl border border-white/[0.1] bg-[#0a0f0c]/98 overflow-hidden relative shadow-[0_0_0_1px_rgba(52,211,153,0.08),0_0_24px_rgba(52,211,153,0.04)]"
              >
                <div className="scan-line" />
                <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.08] bg-[#0a0f0c]/95">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                      <span className="w-[9px] h-[9px] rounded-full bg-white/[0.08]" />
                      <span className="w-[9px] h-[9px] rounded-full bg-white/[0.08]" />
                      <span className="w-[9px] h-[9px] rounded-full bg-white/[0.08]" />
                    </div>
                    <span className="text-[12px] text-white/50 ml-1">{agents[displayedAgent].name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[11px] text-white/35">Live</span>
                  </div>
                </div>
                <div
                  className={`p-6 md:p-8 min-h-[320px] md:min-h-[360px] transition-[opacity,transform] ${
                    fading
                      ? 'opacity-0 translate-y-1 duration-150 ease-out'
                      : 'opacity-100 translate-y-0 duration-500 ease-[cubic-bezier(0.22,0.61,0.36,1)]'
                  }`}
                >
                  <div key={displayedAgent}>{agents[displayedAgent].preview}</div>
                </div>
              </motion.div>
              <div className="flex items-center justify-between mt-5">
                <p className="text-[13px] text-white/50">{agents[displayedAgent].sub}</p>
                <Button variant="secondary" onClick={handleLaunch}>
                  Try {agents[displayedAgent].name} <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section id="how-it-works" className="py-16 md:py-24 scroll-mt-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-10 max-w-xl">
            <motion.h2
              className="font-display text-[clamp(1.5rem,3.5vw,2.25rem)] font-bold tracking-[-0.025em] text-white/90 leading-[1.15] sm:whitespace-nowrap"
              initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            >
              From fingerprint to compliant transaction
            </motion.h2>
            <motion.p
              className="mt-3 text-[14px] text-white/40 leading-[1.6]"
              initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.05 }}
            >
              Three steps: passkey sign-up, ZK proof on device, on-chain compliance check.
            </motion.p>
          </div>

          <div className="space-y-20 md:space-y-28">
            {/* Step 1: Passkey Sign-Up */}
            <motion.div
              className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div>
                <span className="text-[11px] font-mono text-white/20 block mb-4">01</span>
                <h3 className="text-[20px] font-semibold text-white/90 mb-3 tracking-[-0.01em]">Passkey Sign-Up</h3>
                <p className="text-[14px] text-white/35 leading-[1.7] mb-6">
                  Users tap their fingerprint. WebAuthn creates a Flow account instantly. No seed phrases, no browser extensions, no wallet setup.
                </p>
                <div className="flex items-center gap-4 text-[13px]">
                  <span className="text-white/60">Zero seed phrases</span>
                  <span className="text-white/20">·</span>
                  <span className="text-white/60">Works on any device</span>
                </div>
              </div>
              <motion.div
                className="rounded-xl border border-white/[0.06] bg-white/[0.03] overflow-hidden"
                whileHover={{ borderColor: 'rgba(255,255,255,0.1)' }}
                transition={{ duration: 0.2 }}
              >
                <div className="px-5 py-3 border-b border-white/[0.06] flex items-center gap-2">
                  <Fingerprint className="w-3.5 h-3.5 text-white/35" />
                  <span className="text-[12px] text-white/35">Sign Up</span>
                </div>
                <div className="p-6 space-y-4">
                  <motion.div
                    className="flex items-center gap-4 cursor-default"
                    whileHover={{ scale: 1.01 }}
                    transition={{ duration: 0.2 }}
                  >
                    <motion.div
                      className="w-12 h-12 rounded-xl bg-white/[0.06] border border-white/[0.06] flex items-center justify-center cursor-pointer"
                      whileHover={{
                        boxShadow: '0 0 20px rgba(52, 211, 153, 0.25)',
                        borderColor: 'rgba(52, 211, 153, 0.3)',
                      }}
                      transition={{ duration: 0.2 }}
                    >
                      <Fingerprint className="w-5 h-5 text-white/60" />
                    </motion.div>
                    <div>
                      <p className="text-[13px] font-medium text-white/90">Touch to authenticate</p>
                      <p className="text-[11px] text-white/20">WebAuthn · Passkey</p>
                    </div>
                  </motion.div>
                  <div className="h-px bg-white/[0.06]" />
                  <div className="space-y-1">
                    {[
                      { label: 'Flow Account', value: '0x7a3f...e291', mono: true },
                      { label: 'Auth Method', value: 'Passkey (biometric)', mono: false },
                      { label: 'Status', value: null, status: true },
                    ].map((row, idx) => (
                      <motion.div
                        key={idx}
                        className="group/row flex items-center justify-between py-2.5 px-3 -mx-3 rounded-lg cursor-default relative"
                        whileHover={{ backgroundColor: 'rgba(52, 211, 153, 0.06)' }}
                        transition={{ duration: 0.2 }}
                      >
                        <span className="text-[12px] text-white/35">{row.label}</span>
                        {row.status ? (
                          <span className="flex items-center gap-1.5 text-[12px] text-emerald-400/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Created
                          </span>
                        ) : (
                          <span className={`text-[12px] ${row.mono ? 'font-mono text-white/60' : 'text-white/60'}`}>{row.value}</span>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-emerald-400/50 origin-left scale-x-0 group-hover/row:scale-x-100 transition-transform duration-200" />
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Step 2: ZK Verification */}
            <motion.div
              className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <motion.div
                className="order-2 lg:order-1 rounded-xl border border-white/[0.06] bg-white/[0.03] overflow-hidden"
                whileHover={{ borderColor: 'rgba(255,255,255,0.1)' }}
                transition={{ duration: 0.2 }}
              >
                <div className="px-5 py-3 border-b border-white/[0.06] flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-white/35" />
                  <span className="text-[12px] text-white/35">ZK Verification</span>
                </div>
                <div className="p-6 space-y-3">
                  {[
                    { label: 'Identity data', value: 'On device only', icon: Fingerprint, done: true },
                    { label: 'Groth16 proof', value: 'Generated client-side', icon: Cpu, done: true },
                    { label: 'On-chain result', value: 'Boolean + expiry', icon: ShieldCheck, done: true },
                  ].map((item, idx) => {
                    const ItemIcon = item.icon
                    return (
                      <motion.div
                        key={idx}
                        className="group/zk flex items-center gap-4 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] cursor-default relative"
                        whileHover={{
                          backgroundColor: 'rgba(52, 211, 153, 0.06)',
                          borderColor: 'rgba(52, 211, 153, 0.15)',
                        }}
                        transition={{ duration: 0.2 }}
                      >
                        <motion.div
                          className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center shrink-0"
                          whileHover={{
                            boxShadow: '0 0 16px rgba(52, 211, 153, 0.2)',
                          }}
                          transition={{ duration: 0.2 }}
                        >
                          <ItemIcon className="w-3.5 h-3.5 text-white/35" />
                        </motion.div>
                        <div className="flex-1">
                          <p className="text-[12px] font-medium text-white/60">{item.label}</p>
                          <p className="text-[11px] text-white/20">{item.value}</p>
                        </div>
                        {item.done && <Check className="w-3.5 h-3.5 text-emerald-400/60 shrink-0" />}
                        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-emerald-400/50 origin-left scale-x-0 group-hover/zk:scale-x-100 transition-transform duration-200 rounded-b-lg" />
                      </motion.div>
                    )
                  })}
                  <div className="pt-2 flex items-center justify-between text-[11px] text-white/20">
                    <span>Proof verified in 0.8s</span>
                    <span>Valid 90 days</span>
                  </div>
                </div>
              </motion.div>
              <div className="order-1 lg:order-2">
                <span className="text-[11px] font-mono text-white/20 block mb-4">02</span>
                <h3 className="text-[20px] font-semibold text-white/90 mb-3 tracking-[-0.01em]">Identity Verified Privately</h3>
                <p className="text-[14px] text-white/35 leading-[1.7] mb-6">
                  A zero-knowledge proof runs entirely on the user's device. The chain only receives a boolean. Never names, documents, or addresses.
                </p>
                <div className="flex items-center gap-4 text-[13px]">
                  <span className="text-white/60">Zero PII on-chain</span>
                  <span className="text-white/20">·</span>
                  <span className="text-white/60">Client-side proving</span>
                </div>
              </div>
            </motion.div>

            {/* Step 3: Compliance Check */}
            <motion.div
              className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div>
                <span className="text-[11px] font-mono text-white/20 block mb-4">03</span>
                <h3 className="text-[20px] font-semibold text-white/90 mb-3 tracking-[-0.01em]">Agents Enforce Compliance</h3>
                <p className="text-[14px] text-white/35 leading-[1.7] mb-6">
                  Every transaction is compliance-checked on-chain in under a second. Agents continuously update rules from live regulatory feeds across five jurisdictions.
                </p>
                <Button variant="secondary" onClick={handleLaunch}>
                  Open Dashboard <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
              <motion.div
                className="rounded-xl border border-white/[0.06] bg-white/[0.03] overflow-hidden"
                whileHover={{ borderColor: 'rgba(255,255,255,0.1)' }}
                transition={{ duration: 0.2 }}
              >
                <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Scan className="w-3.5 h-3.5 text-white/35" />
                    <span className="text-[12px] text-white/35">Compliance Check</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[11px] text-white/20">Live</span>
                  </div>
                </div>
                <div className="p-6">
                  <div className="space-y-1">
                    {[
                      { tx: 'deposit(0x7a3f...)', jurisdiction: 'FinCEN', result: 'pass', time: '0.3s' },
                      { tx: 'swap(0xb2c1...)', jurisdiction: 'MiCA', result: 'pass', time: '0.5s' },
                      { tx: 'withdraw(0x9ef4...)', jurisdiction: 'FCA', result: 'pass', time: '0.2s' },
                      { tx: 'stake(0x3d7a...)', jurisdiction: 'MAS', result: 'flag', time: '0.4s' },
                    ].map((tx, idx) => (
                      <motion.div
                        key={idx}
                        className="group/tx flex items-center justify-between py-2.5 px-3 -mx-3 rounded-lg border-b border-white/[0.06] last:border-0 cursor-default relative"
                        whileHover={{ backgroundColor: 'rgba(52, 211, 153, 0.06)' }}
                        transition={{ duration: 0.2 }}
                      >
                        <span className="text-[12px] font-mono text-white/60">{tx.tx}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-[11px] text-white/20">{tx.jurisdiction}</span>
                          <span className="text-[11px] font-mono text-white/20">{tx.time}</span>
                          {tx.result === 'pass' ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400/60" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400/60" />
                          )}
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-emerald-400/50 origin-left scale-x-0 group-hover/tx:scale-x-100 transition-transform duration-200" />
                      </motion.div>
                    ))}
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-white/20">
                    <span>4 transactions checked</span>
                    <span>Avg 0.35s</span>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── ARCHITECTURE ─── */}
      <section id="architecture" className="py-20 md:py-28 scroll-mt-20">
        <div className="max-w-6xl mx-auto px-6">
          <motion.h2
            className="font-display text-[clamp(1.5rem,3.5vw,2.25rem)] font-bold tracking-[-0.025em] text-white/90 text-center mb-2 leading-[1.15]"
            initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          >
            How everything connects
          </motion.h2>
          <motion.p
            className="text-[14px] text-white/40 text-center mb-10 max-w-lg mx-auto"
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
          >
            Interactive diagram of the FlowShield stack. Drag to explore, scroll to zoom.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}
          >
            <ProductShowcase />
          </motion.div>
        </div>
      </section>

      {/* ─── CODE PREVIEW ─── */}
      <section id="integration-code" className="pt-12 pb-20 md:pt-16 md:pb-24 scroll-mt-24">
        <div className="max-w-6xl mx-auto px-6">
          {/* Copy block: centered, compact */}
          <div className="text-center max-w-2xl mx-auto mb-6">
            <motion.h2
              className="font-display text-[clamp(1.75rem,4vw,2.5rem)] font-bold tracking-[-0.03em] text-white leading-[1.15] mb-3"
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              One import. That&apos;s it.
            </motion.h2>
            <motion.p
              className="text-[14px] text-white/35 leading-[1.65]"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              Add compliance to any Cadence contract with a single import. The highlighted line is the only change to your existing code.
            </motion.p>
          </div>

          {/* Code block: opaque for readability */}
          <motion.div
            className="max-w-3xl mx-auto rounded-xl border border-white/[0.08] bg-[#0a0f0c]/95 overflow-hidden"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-medium text-white/70">LendingPool.cdc</span>
                  <span className="text-[11px] text-white/25">— Add compliance before deposit</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-white/25 font-mono">Cadence</span>
                  <button
                    type="button"
                    onClick={handleCopyIntegration}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-md text-[12px] font-medium text-white/50 hover:text-white/80 hover:bg-white/[0.06] transition-colors"
                  >
                    {integrationCopied ? (
                      <>
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>
              <div className="p-5 font-mono text-[12px] leading-[2] text-white/35 overflow-x-auto">
                <div className="flex">
                  <div className="select-none text-white/20 text-right pr-5 shrink-0" style={{width: '2.5rem'}}>1<br/>2<br/>3<br/>4<br/>5<br/>6<br/>7<br/>8</div>
                  <div className="flex-1">
                    <span className="text-white/20">// Import the compliance engine</span>
                    <br />
                    <span className="bg-emerald-500/[0.06] -mx-2 px-2 rounded inline-block w-full">
                      <span className="text-white/60">import</span>{' '}
                      <span className="text-emerald-400 font-semibold">ComplianceAction</span>{' '}
                      <span className="text-white/60">from</span>{' '}
                      <span className="text-white/50">0x93c6...5493</span>
                    </span>
                    <br />
                    <span className="text-white/60">access(all) fun</span>{' '}
                    <span className="text-white/60">deposit</span>
                    <span className="text-white/20">(user, amount) {'{'}</span>
                    <br />
                    <span className="text-white/20">{'  '}</span>
                    <span className="text-white/60">let</span>{' '}
                    <span className="text-white/60">ok</span>
                    <span className="text-white/20"> = </span>
                    <span className="text-emerald-400 font-semibold">ComplianceAction</span>
                    <span className="text-emerald-300/90 font-medium">.verify</span>
                    <span className="text-white/20">(user)</span>
                    <br />
                    <span className="text-white/20">{'  '}assert(ok, message: </span>
                    <span className="text-white/35">&quot;Not compliant&quot;</span>
                    <span className="text-white/20">)</span>
                    <br />
                    <span className="text-white/20">{'  '}{'// ... deposit logic'}</span>
                    <br />
                    <span className="text-white/20">{'}'}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          <motion.div
            className="mt-10 flex justify-center"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <Button variant="outline" size="lg" onClick={handleLaunch} className="!border-white/[0.15] !text-white/80">
              Add to your protocol <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ─── FAQs ─── */}
      <section id="faq" className="py-20 md:py-28 border-t border-white/[0.06] scroll-mt-20">
        <div className="max-w-6xl mx-auto px-6">
          <motion.h2
            className="font-display text-[clamp(1.5rem,3.5vw,2rem)] font-bold tracking-[-0.025em] text-white/90 text-center mb-2"
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          >
            FAQs
          </motion.h2>
          <motion.p
            className="text-[14px] text-white/40 text-center mb-12 max-w-md mx-auto"
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.05 }}
          >
            Common questions about FlowShield, integration, and compliance.
          </motion.p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { q: 'What is FlowShield?', a: 'An autonomous compliance layer for DeFi on Flow. One on-chain boolean per user, regulatory scanning across five jurisdictions, zero PII on-chain via zero-knowledge proofs.' },
              { q: 'Who is it for?', a: 'Flow protocols (lending, DEXs, NFT marketplaces), compliance operators, and end users who get a passkey-based credential without seed phrases.' },
              { q: 'Who pays?', a: 'Protocols pay for on-chain compliance checks. End users get credentials free. B2B and enterprise pricing available for custom deployments.' },
              { q: 'Is my data stored on-chain?', a: 'No. Only a boolean result and optional risk score are on-chain. Identity data stays off-chain. Verification uses zero-knowledge proofs.' },
              { q: 'How do I integrate?', a: 'Import ComplianceAction, call verify(user) before any restricted action, handle the boolean. One line of code.' },
              { q: 'Pricing and support?', a: 'Start with a free trial. No credit card required. For custom deployments or technical questions, reach out to support@flowshield.xyz.' },
            ].map((faq, i) => (
              <motion.details
                key={faq.q}
                className="group rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden transition-all duration-200 hover:border-white/[0.08] hover:bg-white/[0.04] cursor-pointer"
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <summary className="flex items-center justify-between gap-4 px-5 py-4 list-none select-none">
                  <span className="text-[14px] font-medium text-white/70 group-open:text-white/90 transition-colors">
                    {faq.q}
                  </span>
                  <ChevronRight className="w-4 h-4 text-white/25 group-open:rotate-90 transition-all duration-200 shrink-0" />
                </summary>
                <p className="text-[13px] text-white/40 leading-[1.75] px-5 pb-5 pt-0">
                  {faq.a}
                </p>
              </motion.details>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-20 md:py-24 border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col items-center gap-8 text-center">
            <div>
              <h2 className="font-display text-[clamp(1.5rem,3.5vw,2rem)] font-bold tracking-[-0.025em] text-white/90 mb-3">
                Ready to add compliance to your protocol?
              </h2>
              <p className="text-[14px] text-white/45 max-w-md mx-auto">
                Launch the app to create credentials, integrate ComplianceAction, or explore the dashboard.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" onClick={handleLaunch}>
                Get started
              </Button>
              <Button variant="outline" size="lg" asChild>
                <a href="https://github.com/Wilsawn/flowshield" target="_blank" rel="noopener noreferrer">
                  Documentation <ChevronRight className="w-4 h-4" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="pt-16 pb-8">
        <div className="max-w-6xl mx-auto px-6">
          {/* Top row: brand + tagline + CTA */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-10 border-b border-white/[0.06] pt-10">
            <div className="flex items-center gap-3">
              <FlowShieldLogo size={22} />
              <span className="text-[16px] font-semibold text-white/90">FlowShield</span>
              <span className="text-white/20 mx-1">|</span>
              <span className="text-[13px] text-white/35">Autonomous Compliance for DeFi</span>
            </div>
            <Button variant="outline" onClick={handleLaunch}>
              Join the Testnet
            </Button>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-10">
            <div>
              <p className="text-[11px] font-medium tracking-[0.08em] uppercase text-white/20 mb-4">Company</p>
              <div className="flex flex-col gap-2.5">
                <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="text-[13px] text-white/35 hover:text-white/60 transition-colors text-left">About</button>
                <a href="https://github.com/Wilsawn/flowshield" target="_blank" rel="noopener noreferrer" className="text-[13px] text-white/35 hover:text-white/60 transition-colors text-left">Documentation</a>
                <a href="mailto:support@flowshield.xyz" className="text-[13px] text-white/35 hover:text-white/60 transition-colors text-left">Contact</a>
              </div>
            </div>
            <div>
              <p className="text-[11px] font-medium tracking-[0.08em] uppercase text-white/20 mb-4">Products</p>
              <div className="flex flex-col gap-2.5">
                <button onClick={() => handleNavigate('/operator')} className="text-[13px] text-white/35 hover:text-white/60 transition-colors text-left">Regulatory Radar</button>
                <button onClick={() => handleNavigate('/operator')} className="text-[13px] text-white/35 hover:text-white/60 transition-colors text-left">Compliance Scanner</button>
                <button onClick={() => handleNavigate('/copilot')} className="text-[13px] text-white/35 hover:text-white/60 transition-colors text-left">Builder Copilot</button>
              </div>
            </div>
            <div>
              <p className="text-[11px] font-medium tracking-[0.08em] uppercase text-white/20 mb-4">Resources</p>
              <div className="flex flex-col gap-2.5">
                <button onClick={() => navigate('/pricing')} className="text-[13px] text-white/35 hover:text-white/60 transition-colors text-left">Plans</button>
                <button onClick={() => handleNavigate('/dashboard')} className="text-[13px] text-white/35 hover:text-white/60 transition-colors text-left">Dashboard</button>
                <button onClick={() => handleNavigate('/operator')} className="text-[13px] text-white/35 hover:text-white/60 transition-colors text-left">Operator</button>
              </div>
            </div>
            <div>
              <p className="text-[11px] font-medium tracking-[0.08em] uppercase text-white/20 mb-4">Legal</p>
              <div className="flex flex-col gap-2.5">
                <button onClick={() => navigate('/privacy')} className="text-[13px] text-white/35 hover:text-white/60 transition-colors text-left">Privacy</button>
                <button onClick={() => navigate('/terms')} className="text-[13px] text-white/35 hover:text-white/60 transition-colors text-left">Terms</button>
                <button onClick={() => navigate('/terms#refunds')} className="text-[13px] text-white/35 hover:text-white/60 transition-colors text-left">Refunds</button>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-[12px] text-white/20">&copy;{new Date().getFullYear()} FlowShield &mdash; All rights reserved.</p>
            <p className="text-[12px] text-white/20">Built on Flow Blockchain</p>
          </div>
        </div>
      </footer>
      </main>
    </div>
  )
}
