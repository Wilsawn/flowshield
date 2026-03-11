import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Fingerprint, Zap, Bot, Lock, Scale, Cpu, Radar, ArrowRight, Scan, Globe, ChevronRight, Check, AlertTriangle, BarChart3, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import OnboardingFlow from '@/components/OnboardingFlow'
import FlowShieldLogo from '@/components/FlowShieldLogo'
import ProductShowcase from '@/components/ProductShowcase'
import AnimatedGenerateButton from '@/components/ui/animated-generate-button'
import VerticalBarsNoise from '@/components/ui/vertical-bars'

/* ── shared glass card style ── */
const glass = 'rounded-2xl border border-emerald-500/[0.08] bg-[#0a1410]/60 backdrop-blur-sm'
const glassInner = 'rounded-xl border border-emerald-500/[0.06] bg-emerald-500/[0.02]'

export default function LandingPage() {
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [redirectTarget, setRedirectTarget] = useState('/dashboard')
  const [activeAgent, setActiveAgent] = useState(0)
  const navigate = useNavigate()

  const isLoggedIn = () => {
    try {
      const stored = localStorage.getItem('flowshield_user')
      return stored && JSON.parse(stored).email
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

  if (showOnboarding) {
    return <OnboardingFlow onComplete={() => navigate(redirectTarget)} onBack={() => setShowOnboarding(false)} />
  }

  const agents = [
    {
      icon: Radar,
      name: 'Regulatory Radar',
      sub: 'Continuous monitoring',
      desc: 'AI reads your on-chain RuleEngine state and compares it against live regulations from FinCEN, MiCA, FCA, MAS, and FINTRAC. Gaps are detected in seconds.',
      preview: (
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/[0.12] flex items-center justify-center">
              <Radar className="w-5 h-5 text-emerald-400/60" />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-white/90">Jurisdiction Coverage</p>
              <p className="text-[12px] text-white/35">Real-time compliance status</p>
            </div>
          </div>
          <div className={`${glassInner} p-4 space-y-3`}>
            {[
              { name: 'FinCEN', region: 'United States', ok: true },
              { name: 'MiCA', region: 'European Union', ok: true },
              { name: 'FCA', region: 'United Kingdom', gap: 2 },
              { name: 'MAS', region: 'Singapore', ok: true },
              { name: 'FINTRAC', region: 'Canada', ok: true },
            ].map((j) => (
              <div key={j.name} className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-3">
                  <span className="text-[13px] font-medium text-white/70 w-16">{j.name}</span>
                  <span className="text-[11px] text-white/25">{j.region}</span>
                </div>
                {j.ok ? (
                  <span className="flex items-center gap-1.5 text-[11px] text-emerald-400/70 font-medium">
                    <Check className="w-3 h-3" /> Compliant
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-[11px] text-amber-400/70 font-medium">
                    <AlertTriangle className="w-3 h-3" /> {j.gap} gaps
                  </span>
                )}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { v: '98%', l: 'Score' },
              { v: '5', l: 'Jurisdictions' },
              { v: '0', l: 'Alerts' },
            ].map((s) => (
              <div key={s.l} className={`${glassInner} p-3 text-center`}>
                <p className="text-[18px] font-bold text-white/85">{s.v}</p>
                <p className="text-[10px] text-white/30">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      icon: Scan,
      name: 'Compliance Scanner',
      sub: 'Smart contract analysis',
      desc: 'Upload Cadence, Solidity, or any smart contract. The scanner identifies missing compliance checks, incorrect thresholds, and jurisdiction-specific issues.',
      preview: (
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/[0.12] flex items-center justify-center">
              <Scan className="w-5 h-5 text-emerald-400/60" />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-white/90">Contract Analysis</p>
              <p className="text-[12px] text-white/35">LendingPool.cdc</p>
            </div>
          </div>
          <div className={`${glassInner} p-4 font-mono text-[12px] leading-[1.8] text-white/35`}>
            <span className="text-white/50">import</span> <span className="text-emerald-400/70">ComplianceAction</span>
            <br /><span className="text-white/50">fun</span> <span className="text-white/60">deposit</span>(user, amount) {'{'}
            <br /><span className="text-white/20">{'  '}// ...</span>
            <br />{'}'}
          </div>
          <div className={`${glassInner} p-3 flex items-start gap-2.5`}>
            <Check className="w-4 h-4 text-emerald-400/70 mt-0.5 shrink-0" />
            <div>
              <p className="text-[12px] font-medium text-emerald-400/80">KYC check found</p>
              <p className="text-[11px] text-white/30">Line 12: verify(addr) present</p>
            </div>
          </div>
          <div className={`${glassInner} p-3 flex items-start gap-2.5`}>
            <AlertTriangle className="w-4 h-4 text-amber-400/70 mt-0.5 shrink-0" />
            <div>
              <p className="text-[12px] font-medium text-amber-400/80">Missing threshold</p>
              <p className="text-[11px] text-white/30">No max transaction limit set</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-white/50 font-medium">Score: 94/100</span>
            <div className="flex gap-0.5">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className={`w-3 h-1.5 rounded-sm ${i < 9 ? 'bg-emerald-400/50' : 'bg-white/10'}`} />
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      icon: Bot,
      name: 'Builder Copilot',
      sub: 'Context-aware assistant',
      desc: 'Ask anything about compliance. Get Cadence integration code, regulatory explanations, and live risk analysis with your on-chain context in every response.',
      preview: (
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/[0.12] flex items-center justify-center">
              <Bot className="w-5 h-5 text-emerald-400/60" />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-white/90">Builder Copilot</p>
              <p className="text-[12px] text-white/35">AI compliance assistant</p>
            </div>
          </div>
          <div className={`${glassInner} p-3`}>
            <p className="text-[11px] text-white/25 mb-1">You</p>
            <p className="text-[13px] text-white/60 leading-relaxed">How do I add compliance checks to my DEX contract?</p>
          </div>
          <div className={`${glassInner} p-3`}>
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles className="w-3 h-3 text-emerald-400/50" />
              <p className="text-[11px] text-emerald-400/50">Copilot</p>
            </div>
            <p className="text-[13px] text-white/60 leading-relaxed mb-2">
              Import <span className="text-emerald-400/70 font-mono text-[12px]">ComplianceAction</span> from the deployer and call <span className="text-emerald-400/70 font-mono text-[12px]">verify()</span> before each swap:
            </p>
            <div className="bg-black/20 rounded-lg p-2.5 font-mono text-[11px] text-white/40 leading-[1.7]">
              ComplianceAction.verify(user)
            </div>
          </div>
          <div className="flex gap-2">
            {['Regulatory context', 'Cadence code', 'Risk analysis'].map((t) => (
              <span key={t} className={`${glassInner} px-2.5 py-1 text-[10px] text-white/35`}>{t}</span>
            ))}
          </div>
        </div>
      ),
    },
    {
      icon: Lock,
      name: 'ZK Verification',
      sub: 'Privacy-preserving proofs',
      desc: 'Groth16 circuit generates a client-side proof. The chain receives a boolean — never identity data. Privacy is cryptographically guaranteed.',
      preview: (
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/[0.12] flex items-center justify-center">
              <Lock className="w-5 h-5 text-emerald-400/60" />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-white/90">Proof Pipeline</p>
              <p className="text-[12px] text-white/35">Zero-knowledge verification flow</p>
            </div>
          </div>
          <div className="space-y-2">
            {[
              { step: 'Identity data', detail: 'Stays on device', icon: Fingerprint },
              { step: 'ZK Circuit (Groth16)', detail: 'Proof generated client-side', icon: Cpu },
              { step: 'On-chain verification', detail: 'Boolean only — no PII', icon: ShieldCheck },
            ].map((s, i) => (
              <div key={i}>
                <div className={`${glassInner} p-3 flex items-center gap-3`}>
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/[0.1] flex items-center justify-center">
                    <s.icon className="w-3.5 h-3.5 text-emerald-400/60" />
                  </div>
                  <div>
                    <p className="text-[12px] font-medium text-white/70">{s.step}</p>
                    <p className="text-[10px] text-white/30">{s.detail}</p>
                  </div>
                </div>
                {i < 2 && <div className="flex justify-center py-1"><div className="w-px h-3 bg-emerald-500/[0.15]" /></div>}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className={`${glassInner} p-3 text-center`}>
              <p className="text-[18px] font-bold text-white/85">0%</p>
              <p className="text-[10px] text-white/30">PII on-chain</p>
            </div>
            <div className={`${glassInner} p-3 text-center`}>
              <p className="text-[18px] font-bold text-white/85">&lt;1s</p>
              <p className="text-[10px] text-white/30">Verify time</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      icon: Cpu,
      name: 'A2A Orchestrator',
      sub: 'Agent-to-agent protocol',
      desc: 'Agent-to-agent protocol that chains multi-agent workflows. Risk scoring feeds anomaly detection which feeds the copilot — all automated.',
      preview: (
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-violet-500/[0.08] border border-violet-500/[0.12] flex items-center justify-center">
              <Cpu className="w-5 h-5 text-violet-400/60" />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-white/90">Agent Chains</p>
              <p className="text-[12px] text-white/35">Predefined orchestration workflows</p>
            </div>
          </div>
          <div className={`${glassInner} p-4 space-y-3`}>
            {[
              { name: 'full-risk-review', agents: 3, status: 'active' },
              { name: 'compliance-review', agents: 2, status: 'idle' },
            ].map((chain) => (
              <div key={chain.name} className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-3">
                  <span className="text-[13px] font-mono font-medium text-white/70">{chain.name}</span>
                  <span className="text-[11px] text-white/25">{chain.agents} agents</span>
                </div>
                <span className={`flex items-center gap-1.5 text-[11px] font-medium ${
                  chain.status === 'active' ? 'text-violet-400/70' : 'text-white/30'
                }`}>
                  {chain.status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />}
                  {chain.status === 'active' ? 'Running' : 'Idle'}
                </span>
              </div>
            ))}
          </div>
          <div className={`${glassInner} p-4 space-y-2`}>
            <p className="text-[11px] text-white/25 uppercase tracking-wider">Task Lifecycle</p>
            <div className="flex gap-2">
              {['submitted', 'working', 'completed', 'failed'].map((state) => (
                <span key={state} className={`px-2 py-1 rounded text-[10px] font-medium border ${
                  state === 'completed' ? 'bg-emerald-500/[0.06] border-emerald-500/15 text-emerald-400/60' :
                  state === 'working' ? 'bg-violet-500/[0.08] border-violet-500/20 text-violet-400/60' :
                  state === 'failed' ? 'bg-red-500/[0.06] border-red-500/15 text-red-400/50' :
                  'bg-white/[0.02] border-white/[0.06] text-white/30'
                }`}>{state}</span>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { v: '4', l: 'Agents' },
              { v: '2', l: 'Chains' },
              { v: '~3s', l: 'Avg Latency' },
            ].map((s) => (
              <div key={s.l} className={`${glassInner} p-3 text-center`}>
                <p className="text-[18px] font-bold text-white/85">{s.v}</p>
                <p className="text-[10px] text-white/30">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      ),
    },
  ]

  return (
    <div className="min-h-screen bg-[#060e09] text-white selection:bg-emerald-500/20 antialiased">

      {/* ─── NAV ─── */}
      <nav className="sticky top-0 z-50 border-b border-emerald-500/[0.06] bg-[#060e09]/80 backdrop-blur-xl">
        <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FlowShieldLogo size={22} />
            <span className="text-[14px] font-semibold tracking-[-0.01em] text-white/90">FlowShield</span>
          </div>
          <div className="hidden md:flex items-center">
            <div className="flex items-center gap-1 px-2 py-1.5 rounded-full border border-emerald-500/[0.06] bg-white/[0.02]">
              {['Copilot', 'Operator', 'Dashboard'].map((item) => (
                <button
                  key={item}
                  onClick={() => handleNavigate(`/${item.toLowerCase()}`)}
                  className="text-[13px] text-white/40 hover:text-white/70 transition-colors duration-200 px-4 py-1.5 rounded-full hover:bg-white/[0.04]"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <AnimatedGenerateButton
            onClick={handleLaunch}
            labelIdle="Get Started"
            labelActive="Loading..."
            highlightHueDeg={160}
            size="sm"
            icon={ArrowRight}
          />
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="relative pt-28 pb-20 md:pt-40 md:pb-32 overflow-hidden">
        {/* Vertical bars noise background */}
        <div className="absolute inset-0 opacity-[0.07] pointer-events-none">
          <VerticalBarsNoise
            backgroundColor="#060e09"
            lineColor="#1a4a35"
            barColor="#34d399"
            lineWidth={0.5}
            animationSpeed={0.0003}
            removeWaveLine
          />
        </div>

        {/* Green ambient glow */}
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full bg-emerald-600/[0.06] blur-[180px] pointer-events-none" />

        {/* Floating product icons */}
        <motion.div className="absolute top-[18%] left-[8%] hidden lg:block" animate={{ y: [0, -14, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}>
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 border border-emerald-500/[0.12] flex items-center justify-center shadow-lg shadow-emerald-900/20">
            <ShieldCheck className="w-7 h-7 text-emerald-400/60" />
          </div>
        </motion.div>
        <motion.div className="absolute top-[30%] right-[6%] hidden lg:block" animate={{ y: [0, 12, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}>
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 border border-emerald-500/[0.12] flex items-center justify-center shadow-lg shadow-emerald-900/20">
            <Lock className="w-7 h-7 text-emerald-400/60" />
          </div>
        </motion.div>
        <motion.div className="absolute top-[55%] left-[5%] hidden lg:block" animate={{ y: [0, 10, 0] }} transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/[0.08] flex items-center justify-center">
            <Radar className="w-6 h-6 text-emerald-400/40" />
          </div>
        </motion.div>
        <motion.div className="absolute top-[12%] right-[12%] hidden lg:block" animate={{ y: [0, -10, 0] }} transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/[0.08] flex items-center justify-center">
            <Fingerprint className="w-6 h-6 text-emerald-400/40" />
          </div>
        </motion.div>
        <motion.div className="absolute top-[60%] right-[10%] hidden lg:block" animate={{ y: [0, -8, 0] }} transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}>
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/[0.08] flex items-center justify-center">
            <Bot className="w-5 h-5 text-emerald-400/40" />
          </div>
        </motion.div>

        <div className="relative max-w-[880px] mx-auto px-6 text-center">
          {/* Logo icon with glow */}
          <motion.div
            className="flex justify-center mb-8"
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}
          >
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 border border-emerald-500/[0.15] flex items-center justify-center">
                <FlowShieldLogo size={32} />
              </div>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-12 h-4 bg-emerald-500/20 blur-lg rounded-full" />
            </div>
          </motion.div>

          {/* Announcement pill */}
          <motion.div
            className="flex justify-center mb-8"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-500/[0.1] bg-emerald-500/[0.03]">
              <span className="flex items-center gap-1.5 text-[12px] font-medium text-emerald-400/80">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Live on Testnet
              </span>
              <span className="text-white/15">|</span>
              <span className="text-[12px] text-white/40">Autonomous compliance agents for Flow</span>
              <span className="text-[10px] font-medium text-emerald-400/60 bg-emerald-500/[0.08] px-1.5 py-0.5 rounded">NEW</span>
            </div>
          </motion.div>

          {/* Hero heading - uppercase with bordered highlight */}
          <motion.h1
            className="mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.7, ease: [0.25, 0.4, 0.25, 1] }}
          >
            <span className="block text-[clamp(2rem,5.5vw,3.5rem)] leading-[1.1] font-extrabold tracking-[-0.02em] uppercase text-white/95">
              DeFi Compliance,
            </span>
            <span className="inline-block mt-2 px-5 py-2 rounded-xl border border-emerald-500/[0.15] bg-emerald-500/[0.03]">
              <span className="text-[clamp(2rem,5.5vw,3.5rem)] leading-[1.1] font-extrabold tracking-[-0.02em] uppercase text-white/95">
                Solved.
              </span>
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            className="text-[17px] leading-[1.7] text-white/40 max-w-[560px] mx-auto mb-10"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.7, ease: [0.25, 0.4, 0.25, 1] }}
          >
            AI agents scan five jurisdictions, enforce rules on-chain, and verify identity with zero-knowledge proofs — no personal data ever touches the blockchain.
          </motion.p>

          {/* CTA */}
          <motion.div
            className="flex justify-center"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.7, ease: [0.25, 0.4, 0.25, 1] }}
          >
            <AnimatedGenerateButton
              onClick={handleLaunch}
              labelIdle="Start Building"
              labelActive="Launching..."
              highlightHueDeg={160}
              size="lg"
            />
          </motion.div>
        </div>

        {/* Bottom horizon glow */}
        <div className="absolute bottom-0 left-0 right-0 h-[200px]">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[120%] h-[300px] rounded-[50%] bg-emerald-500/[0.04] blur-[60px]" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/[0.15] to-transparent" />
        </div>
      </section>

      {/* ─── PRODUCT SHOWCASE (Clover-style interactive cards) ─── */}
      <section className="py-20 md:py-32">
        <div className="max-w-[1200px] mx-auto px-6">
          <motion.div
            className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-4"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            {/* Left panel - product card */}
            <div className={`${glass} p-8 flex flex-col`}>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 border border-emerald-500/[0.12] flex items-center justify-center">
                  <FlowShieldLogo size={24} />
                </div>
                <div>
                  <h3 className="text-[20px] font-bold text-white/90">FlowShield</h3>
                  <p className="text-[11px] font-medium tracking-[0.06em] uppercase text-white/25">flowshield.dev</p>
                </div>
              </div>

              <div className="flex gap-2 mt-6 mb-8">
                <button
                  onClick={handleLaunch}
                  className="px-5 py-2.5 rounded-full bg-white/[0.06] border border-emerald-500/[0.1] text-[13px] font-medium text-white/70 hover:bg-white/[0.1] transition-colors flex items-center gap-2"
                >
                  Sign Up <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleNavigate('/copilot')}
                  className="px-5 py-2.5 rounded-full text-[13px] font-medium text-white/40 hover:text-white/60 transition-colors tracking-wide"
                >
                  Learn More
                </button>
              </div>

              {/* Feature nav */}
              <div className="space-y-1 flex-1">
                {agents.map((agent, i) => {
                  const Icon = agent.icon
                  const isActive = activeAgent === i
                  return (
                    <button
                      key={agent.name}
                      onClick={() => setActiveAgent(i)}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all duration-200 ${
                        isActive
                          ? 'text-white/90 border-b border-emerald-500/[0.15]'
                          : 'text-white/35 hover:text-white/55'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400/70' : 'text-white/20'}`} />
                      <span className="text-[14px] font-medium">{agent.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Right panel - feature preview */}
            <div className={`${glass} p-8`}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeAgent}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="mb-6">
                    <h3 className="text-[22px] font-bold text-white/90 mb-2">{agents[activeAgent].name}</h3>
                    <p className="text-[15px] text-white/40 leading-[1.6]">{agents[activeAgent].desc}</p>
                  </div>
                  <div className={`${glass} p-6`}>
                    {agents[activeAgent].preview}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── STATS STRIP ─── */}
      <section className="py-16 md:py-20">
        <div className="max-w-[1200px] mx-auto px-6">
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-3"
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
          >
            {[
              { value: '24/7', label: 'Agent Monitoring', icon: Radar },
              { value: '5', label: 'Jurisdictions Scanned', icon: Globe },
              { value: '0%', label: 'PII On-Chain', icon: Lock },
              { value: '<1s', label: 'Verification Time', icon: Zap },
            ].map((stat, i) => {
              const Icon = stat.icon
              return (
                <div key={i} className={`${glass} p-6 md:p-8 text-center relative overflow-hidden group`}>
                  <div className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-emerald-500/[0.04] border border-emerald-500/[0.06] flex items-center justify-center opacity-40 group-hover:opacity-60 transition-opacity">
                    <Icon className="w-3.5 h-3.5 text-emerald-400/50" />
                  </div>
                  <p className="text-[2rem] md:text-[2.5rem] font-bold tracking-tight text-white/90 mb-1">{stat.value}</p>
                  <p className="text-[12px] text-white/30 tracking-wide">{stat.label}</p>
                </div>
              )
            })}
          </motion.div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="py-24 md:py-36">
        <div className="max-w-[1120px] mx-auto px-6">
          <div className="text-center mb-16">
            <motion.p
              className="text-[12px] font-medium tracking-[0.1em] uppercase text-emerald-400/40 mb-4"
              initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            >
              How it works
            </motion.p>
            <motion.h2
              className="text-[clamp(1.5rem,3.5vw,2.5rem)] font-bold tracking-[-0.025em] text-white/90 leading-[1.15]"
              initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            >
              Three steps to compliant transactions
            </motion.h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                n: '01',
                icon: Fingerprint,
                t: 'Passkey Sign-Up',
                d: 'Tap your fingerprint. WebAuthn creates a Flow account in the background — no seed phrases, no wallet extensions.',
              },
              {
                n: '02',
                icon: Lock,
                t: 'Identity Verified Privately',
                d: 'A zero-knowledge proof runs client-side. The chain receives a yes or no, never identity data.',
              },
              {
                n: '03',
                icon: Scan,
                t: 'Agents Enforce Compliance',
                d: 'Every deposit, borrow, or swap is compliance-checked on-chain. Agents continuously update rules from live regulations.',
              },
            ].map((step, i) => (
              <motion.div
                key={step.n}
                className={`${glass} p-8 relative`}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
              >
                <span className="text-[11px] font-mono text-emerald-400/30 mb-4 block">{step.n}</span>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/[0.1] flex items-center justify-center mb-4">
                  <step.icon className="w-4.5 h-4.5 text-emerald-400/60" />
                </div>
                <h3 className="text-[16px] font-semibold text-white/85 mb-2">{step.t}</h3>
                <p className="text-[13px] text-white/35 leading-[1.65]">{step.d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── ARCHITECTURE ─── */}
      <section className="py-24 md:py-36">
        <div className="max-w-[1200px] mx-auto px-6">
          <motion.p
            className="text-[12px] font-medium tracking-[0.1em] uppercase text-emerald-400/40 mb-4 text-center"
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          >
            Architecture
          </motion.p>
          <motion.h2
            className="text-[clamp(1.5rem,3.5vw,2.5rem)] font-bold tracking-[-0.025em] text-white/90 text-center mb-2 leading-[1.15]"
            initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          >
            How everything connects
          </motion.h2>
          <motion.p
            className="text-[13px] text-white/30 text-center mb-12"
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
          >
            Drag to explore &middot; Scroll to zoom
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}
          >
            <ProductShowcase />
          </motion.div>
        </div>
      </section>

      {/* ─── CODE PREVIEW ─── */}
      <section className="py-24 md:py-36">
        <div className="max-w-[680px] mx-auto px-6">
          <motion.p
            className="text-[12px] font-medium tracking-[0.1em] uppercase text-emerald-400/40 mb-4 text-center"
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          >
            Integration
          </motion.p>
          <motion.h2
            className="text-[clamp(1.5rem,3.5vw,2.5rem)] font-bold tracking-[-0.025em] text-white/90 text-center mb-3 leading-[1.15]"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            One import. That&apos;s it.
          </motion.h2>
          <motion.p
            className="text-[15px] text-white/35 text-center mb-10 max-w-md mx-auto leading-[1.6]"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            A lending pool contract on Flow testnet. The highlighted line is the only change.
          </motion.p>

          <motion.div
            className={`${glass} overflow-hidden`}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
          >
            <div className="flex items-center px-5 py-3 border-b border-emerald-500/[0.06] bg-emerald-500/[0.02]">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/[0.15]" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/[0.15]" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/[0.15]" />
                <span className="text-xs text-white/25 ml-3 font-mono">LendingPool.cdc</span>
              </div>
            </div>
            <div className="p-6 font-mono text-[13px] leading-[1.9] text-white/40 overflow-x-auto">
              <span className="text-white/20">// Import the compliance engine</span>
              <br />
              <span className="text-white/55">import</span>{' '}
              <span className="text-emerald-400/80">ComplianceAction</span>{' '}
              <span className="text-white/55">from</span>{' '}
              <span className="text-white/30">0x93c691a98b975493</span>
              <br /><br />
              <span className="text-white/20">// Check compliance before any DeFi action</span>
              <br />
              <span className="text-white/55">access(all) fun</span>{' '}
              <span className="text-white/65">deposit</span>
              <span className="text-white/25">(user: Address, amount: UFix64) {'{'}</span>
              <br />
              <span className="text-white/25">{'    '}</span>
              <span className="text-white/55">let</span>{' '}
              <span className="text-white/65">ok</span>{' '}
              <span className="text-white/25">= </span>
              <span className="text-emerald-400/80">ComplianceAction</span>
              <span className="text-white/40">.verify</span>
              <span className="text-white/25">(user)</span>
              <br />
              <span className="text-white/25">{'    '}assert(ok, message: </span>
              <span className="text-white/40">&quot;Not compliant&quot;</span>
              <span className="text-white/25">)</span>
              <br />
              <span className="text-white/20">{'    '}{'// ... deposit logic'}</span>
              <br />
              <span className="text-white/25">{'}'}</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-32 md:py-44 relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-emerald-500/[0.03] blur-[120px] rounded-full" />
        </div>
        <div className="relative max-w-[600px] mx-auto px-6 text-center">
          <motion.h2
            className="text-[clamp(1.5rem,3.5vw,2.5rem)] font-bold tracking-[-0.025em] text-white/90 leading-[1.15] mb-5"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Your protocol handles the finance.
            <br />
            <span className="text-emerald-400">FlowShield handles the rest.</span>
          </motion.h2>
          <motion.p
            className="text-[15px] text-white/35 mb-8 leading-[1.6]"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            Cryptographic proof that every transaction was checked.
            Autonomous agents that never miss a regulatory update.
          </motion.p>
          <motion.div
            className="flex justify-center"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
          >
            <AnimatedGenerateButton
              onClick={handleLaunch}
              labelIdle="Launch Dashboard"
              labelActive="Launching..."
              highlightHueDeg={160}
              size="lg"
            />
          </motion.div>
        </div>
      </section>

      {/* ─── PRODUCT SUMMARY STRIP ─── */}
      <section className="border-y border-emerald-500/[0.06]">
        <div className="max-w-[1200px] mx-auto px-6 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Radar, name: 'Regulatory Radar', tagline: 'Scan five jurisdictions in real-time' },
              { icon: Scan, name: 'Compliance Scanner', tagline: 'Analyze contracts for compliance gaps' },
              { icon: Bot, name: 'Builder Copilot', tagline: 'AI-powered compliance assistant' },
              { icon: Lock, name: 'ZK Verification', tagline: 'Privacy-preserving on-chain proofs' },
            ].map((product) => {
              const Icon = product.icon
              return (
                <div key={product.name}>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/[0.1] flex items-center justify-center mb-3">
                    <Icon className="w-5 h-5 text-emerald-400/50" />
                  </div>
                  <p className="text-[14px] font-semibold text-white/70 mb-0.5">{product.name}</p>
                  <p className="text-[12px] text-white/30 leading-relaxed">{product.tagline}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="pt-16 pb-8">
        <div className="max-w-[1200px] mx-auto px-6">
          {/* Top row: brand + tagline + CTA */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-10 border-b border-emerald-500/[0.06]">
            <div className="flex items-center gap-3">
              <FlowShieldLogo size={22} />
              <span className="text-[16px] font-semibold text-white/80">FlowShield</span>
              <span className="text-white/15 mx-1">|</span>
              <span className="text-[13px] text-white/30">Autonomous Compliance for DeFi</span>
            </div>
            <button
              onClick={handleLaunch}
              className="px-5 py-2.5 rounded-full border border-emerald-500/[0.1] bg-white/[0.03] text-[13px] font-medium text-white/60 hover:bg-white/[0.06] transition-colors"
            >
              Join the Testnet
            </button>
          </div>

          {/* Link columns + stats widget */}
          <div className="grid grid-cols-2 md:grid-cols-[1fr_1fr_1fr_1fr_280px] gap-8 py-10">
            <div>
              <p className="text-[11px] font-medium tracking-[0.08em] uppercase text-white/20 mb-4">Company</p>
              <div className="flex flex-col gap-2.5">
                <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="text-[13px] text-white/40 hover:text-white/60 transition-colors text-left">About</button>
                <a href="https://github.com/Wilsawn/flowshield" target="_blank" rel="noopener noreferrer" className="text-[13px] text-white/40 hover:text-white/60 transition-colors text-left">Documentation</a>
              </div>
            </div>
            <div>
              <p className="text-[11px] font-medium tracking-[0.08em] uppercase text-white/20 mb-4">Products</p>
              <div className="flex flex-col gap-2.5">
                <button onClick={() => handleNavigate('/operator')} className="text-[13px] text-white/40 hover:text-white/60 transition-colors text-left">Regulatory Radar</button>
                <button onClick={() => handleNavigate('/operator')} className="text-[13px] text-white/40 hover:text-white/60 transition-colors text-left">Compliance Scanner</button>
                <button onClick={() => handleNavigate('/copilot')} className="text-[13px] text-white/40 hover:text-white/60 transition-colors text-left">Builder Copilot</button>
              </div>
            </div>
            <div>
              <p className="text-[11px] font-medium tracking-[0.08em] uppercase text-white/20 mb-4">Resources</p>
              <div className="flex flex-col gap-2.5">
                <button onClick={() => handleNavigate('/dashboard')} className="text-[13px] text-white/40 hover:text-white/60 transition-colors text-left">Dashboard</button>
                <button onClick={() => handleNavigate('/operator')} className="text-[13px] text-white/40 hover:text-white/60 transition-colors text-left">Operator</button>
              </div>
            </div>
            <div>
              <p className="text-[11px] font-medium tracking-[0.08em] uppercase text-white/20 mb-4">Legal</p>
              <div className="flex flex-col gap-2.5">
                <button onClick={() => navigate('/privacy')} className="text-[13px] text-white/40 hover:text-white/60 transition-colors text-left">Privacy</button>
                <button onClick={() => navigate('/terms')} className="text-[13px] text-white/40 hover:text-white/60 transition-colors text-left">Terms</button>
              </div>
            </div>

            {/* Stats widget */}
            <div className={`${glass} p-5 hidden md:block`}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[18px] font-bold text-white/85">5</p>
                  <p className="text-[11px] text-white/30">Jurisdictions Monitored</p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/[0.1] flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-emerald-400/50" />
                </div>
              </div>
              <div className="flex items-end gap-1 h-10 mb-3">
                {[3, 5, 4, 6, 5, 7, 6, 8, 7, 5, 6, 8, 7, 9, 8].map((h, i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-sm ${i === 14 ? 'bg-emerald-400/50' : 'bg-emerald-500/[0.12]'}`}
                    style={{ height: `${h * 10}%` }}
                  />
                ))}
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/20" />
                  <span className="text-white/25">Total Scans</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/50" />
                  <span className="text-white/25">Live</span>
                </div>
              </div>
            </div>
          </div>

          {/* Giant scrolling brand marquee */}
          <div className="relative overflow-hidden py-12 border-t border-emerald-500/[0.06]">
            <div className="flex animate-[marqueeScroll_20s_linear_infinite] whitespace-nowrap">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-8 mx-8 shrink-0">
                  <span className="text-[clamp(4rem,10vw,8rem)] font-extrabold tracking-[-0.04em] uppercase text-white/[0.08] select-none">
                    FlowShield
                  </span>
                  <svg className="w-[clamp(2rem,5vw,4rem)] h-[clamp(2rem,5vw,4rem)] text-white/[0.08] shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                  </svg>
                </div>
              ))}
            </div>
          </div>

          {/* Copyright */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-[12px] text-white/20">&copy;{new Date().getFullYear()} FlowShield &mdash; All rights reserved.</p>
            <p className="text-[12px] text-white/20">Built on Flow Blockchain</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
