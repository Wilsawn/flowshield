import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Fingerprint, Zap, ArrowUpRight, Code2, Globe, Bot, Eye, Lock, Scale, Cpu, Workflow } from 'lucide-react'
import { motion } from 'framer-motion'
import DisplayCards from '@/components/ui/display-cards'
import AuroraBackground from '@/components/ui/aurora-background'
import SpotlightCard from '@/components/ui/spotlight-card'
import AnimatedTicker from '@/components/ui/animated-ticker'
import Marquee from '@/components/ui/marquee'
import OnboardingFlow from '@/components/OnboardingFlow'
import FlowShieldLogo from '@/components/FlowShieldLogo'
import ProductShowcase from '@/components/ProductShowcase'

const fade = {
  hidden: { opacity: 0, y: 24 },
  show: (d = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.7, delay: d, ease: [0.25, 0.4, 0.25, 1] } }),
}

export default function LandingPage() {
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [redirectTarget, setRedirectTarget] = useState('/dashboard')
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

  return (
    <AuroraBackground className="min-h-screen bg-[#060a13] text-white selection:bg-emerald-500/20">

      {/* ─── NAV ─── */}
      <nav className="relative z-50 border-b border-white/[0.04]">
        <div className="max-w-[1080px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FlowShieldLogo size={26} />
            <span className="text-[15px] font-semibold tracking-tight">FlowShield</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => handleNavigate('/copilot')} className="text-[13px] text-white/40 hover:text-white transition-colors">Copilot</button>
            <button onClick={() => handleNavigate('/operator')} className="text-[13px] text-white/40 hover:text-white transition-colors">Operator</button>
            <button onClick={() => handleNavigate('/dashboard')} className="text-[13px] text-white/40 hover:text-white transition-colors">Dashboard</button>
            <button
              onClick={handleLaunch}
              className="text-[13px] font-medium px-5 py-2 rounded-full bg-white text-[#060a13] hover:bg-white/90 transition-colors"
            >
              Launch App
            </button>
          </div>
          <button
            onClick={handleLaunch}
            className="md:hidden text-[13px] font-medium px-5 py-2 rounded-full bg-white text-[#060a13] hover:bg-white/90 transition-colors"
          >
            Launch App
          </button>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="relative z-10 pt-20 pb-16 md:pt-36 md:pb-28">
        <div className="max-w-[1080px] mx-auto px-6 text-center">
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[12px] border border-white/[0.06] bg-white/[0.02] mb-10"
            variants={fade} initial="hidden" animate="show" custom={0}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-white/40">Built on Flow Blockchain</span>
          </motion.div>

          <motion.h1
            className="text-[clamp(3rem,7vw,6rem)] leading-[0.95] font-bold tracking-[-0.035em] mb-8"
            variants={fade} initial="hidden" animate="show" custom={0.08}
          >
            Compliant DeFi,
            <br />
            <span className="bg-gradient-to-r from-emerald-400 via-cyan-300 to-emerald-400 bg-[length:200%_auto] animate-[shimmerText_4s_linear_infinite] bg-clip-text text-transparent">
              without the friction.
            </span>
          </motion.h1>

          <motion.p
            className="text-lg md:text-xl text-white/35 max-w-xl mx-auto leading-relaxed mb-14"
            variants={fade} initial="hidden" animate="show" custom={0.16}
          >
            FlowShield adds KYC verification to any DeFi protocol on Flow
            with a single Cadence import. Your users sign up with a passkey,
            verify through a ZK proof, and never fill out a form.
          </motion.p>

          <motion.div
            className="flex items-center justify-center gap-4"
            variants={fade} initial="hidden" animate="show" custom={0.24}
          >
            <button
              onClick={handleLaunch}
              className="group px-8 py-3.5 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-[#060a13] font-semibold text-[14px] hover:shadow-[0_0_50px_rgba(52,211,153,0.25)] transition-all duration-500"
            >
              Try the Demo
              <span className="inline-block ml-2 group-hover:translate-x-0.5 transition-transform">→</span>
            </button>
            <button
              onClick={() => handleNavigate('/copilot')}
              className="px-8 py-3.5 rounded-full border border-white/[0.08] text-[14px] text-white/50 hover:text-white hover:border-white/[0.15] transition-all duration-300"
            >
              Builder Copilot
            </button>
          </motion.div>
        </div>
      </section>

      {/* ─── MARQUEE ─── */}
      <section className="relative z-10 border-y border-white/[0.04] py-5">
        <Marquee speed={35}>
          {['Flow Actions', 'Scheduled Transactions', 'Flow Agents', 'WebAuthn / Passkeys', 'Cadence Resources', 'Sponsored Transactions', 'ZK Proofs', 'Compliance Credentials'].map((item) => (
            <span key={item} className="text-[13px] text-white/40 font-medium tracking-wide whitespace-nowrap flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-emerald-400/40" />
              {item}
            </span>
          ))}
        </Marquee>
      </section>

      {/* ─── METRICS + TRUST ─── */}
      <section className="relative z-10 py-20">
        <div className="max-w-[1080px] mx-auto px-6">
          {/* Stats in glass cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-16">
            {[
              { val: 7, suffix: '', label: 'Cadence Contracts', sub: 'Deployed on Flow testnet', color: 'from-emerald-500/20 to-emerald-500/5', accent: 'text-emerald-400', dot: 'bg-emerald-400' },
              { val: 5, suffix: '', label: 'Jurisdictions', sub: 'US · EU · UK · SG · CA', color: 'from-cyan-500/20 to-cyan-500/5', accent: 'text-cyan-400', dot: 'bg-cyan-400' },
              { val: 0, suffix: '%', label: 'Identity On-Chain', sub: 'Only math proofs and booleans', color: 'from-violet-500/20 to-violet-500/5', accent: 'text-violet-400', dot: 'bg-violet-400' },
            ].map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <SpotlightCard className="p-6 text-center group">
                  <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-b ${s.color} mb-4`}>
                    <p className={`text-[1.8rem] font-bold tracking-tight ${s.accent}`}>
                      <AnimatedTicker value={s.val} suffix={s.suffix} />
                    </p>
                  </div>
                  <p className="text-[14px] font-semibold text-white/80 mb-1">{s.label}</p>
                  <p className="text-[11px] text-white/35">{s.sub}</p>
                </SpotlightCard>
              </motion.div>
            ))}
          </div>

          {/* Compliance standards — compact pill row */}
          <motion.div
            className="flex flex-col items-center gap-4"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-semibold">Compliance frameworks</p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {[
                { label: 'FinCEN', sub: 'BSA/AML' },
                { label: 'MiCA', sub: 'EU' },
                { label: 'FCA', sub: 'UK' },
                { label: 'FINTRAC', sub: 'Canada' },
                { label: 'FATF', sub: 'Travel Rule' },
                { label: 'MAS', sub: 'Singapore' },
              ].map((std) => (
                <span
                  key={std.label}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] text-[11px] font-medium text-white/40 hover:text-white/60 hover:border-white/[0.1] transition-all cursor-default"
                >
                  <span className="font-bold text-white/55">{std.label}</span>
                  <span className="text-white/20">·</span>
                  <span>{std.sub}</span>
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── PRODUCT SHOWCASE (Interactive Flow Canvas) ─── */}
      <section className="relative z-10 py-20 md:py-32">
        <div className="max-w-[1200px] mx-auto px-6">
          <motion.p
            className="text-[11px] font-semibold text-emerald-400/70 uppercase tracking-[0.25em] mb-4 text-center"
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          >Architecture</motion.p>
          <motion.h2
            className="text-[2rem] md:text-[2.8rem] font-bold tracking-[-0.02em] leading-[1.1] text-center mb-4"
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          >
            See how the pieces connect.
          </motion.h2>
          <motion.p
            className="text-[13px] text-white/40 text-center mb-12"
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
          >
            Drag the nodes around · Scroll to zoom · Click to explore
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}
          >
            <ProductShowcase />
          </motion.div>
        </div>
      </section>

      {/* ─── HOW IT WORKS + DISPLAY CARDS ─── */}
      <section className="relative z-10 py-16 md:py-32">
        <div className="max-w-[1080px] mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <motion.p
                className="text-[11px] font-semibold text-emerald-400/70 uppercase tracking-[0.25em] mb-5"
                initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
              >
                How it works
              </motion.p>
              <motion.h2
                className="text-[2.8rem] md:text-[3.2rem] font-bold tracking-[-0.02em] leading-[1.05] mb-8"
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              >
                From sign-up to
                <br />
                compliant transaction.
              </motion.h2>

              <div className="space-y-6">
                {[
                  { n: '01', t: 'Passkey sign-up', d: 'Your user enters an email and taps a fingerprint. WebAuthn creates a Flow account in the background.' },
                  { n: '02', t: 'ZK proof runs', d: 'A zero-knowledge proof verifies compliance client-side. The blockchain receives a boolean, not identity data.' },
                  { n: '03', t: 'Protocol checks', d: 'Your Cadence contract calls FlowShield.isCompliant(addr) before any deposit, borrow, or swap.' },
                ].map((step, i) => (
                  <motion.div
                    key={i}
                    className="flex gap-5 group"
                    initial={{ opacity: 0, x: -16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1, duration: 0.5 }}
                  >
                    <span className="text-[13px] font-mono text-emerald-400/40 pt-1 shrink-0">{step.n}</span>
                    <div>
                      <h4 className="text-[15px] font-semibold mb-1 text-white/90">{step.t}</h4>
                      <p className="text-[14px] text-white/45 leading-relaxed">{step.d}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <motion.div
              className="hidden lg:flex items-center justify-center"
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <DisplayCards
                cards={[
                  {
                    icon: <ShieldCheck className="size-4 text-emerald-300" />,
                    title: 'ZK Verified',
                    description: 'Compliance confirmed on-chain',
                    date: 'Just now',
                    titleClassName: 'text-emerald-400',
                    className: '[grid-area:stack] hover:-translate-y-10 before:absolute before:inset-0 before:rounded-xl before:bg-background/40 before:content-[\'\'] before:transition-opacity before:duration-700 hover:before:opacity-0 grayscale-[100%] hover:grayscale-0',
                  },
                  {
                    icon: <Fingerprint className="size-4 text-cyan-300" />,
                    title: 'Passkey Auth',
                    description: 'Walletless sign-in via WebAuthn',
                    date: '2s ago',
                    titleClassName: 'text-cyan-400',
                    className: '[grid-area:stack] translate-x-12 translate-y-10 hover:-translate-y-1 before:absolute before:inset-0 before:rounded-xl before:bg-background/40 before:content-[\'\'] before:transition-opacity before:duration-700 hover:before:opacity-0 grayscale-[100%] hover:grayscale-0',
                  },
                  {
                    icon: <Zap className="size-4 text-emerald-300" />,
                    title: 'Flow Action',
                    description: 'Transaction authorized, verified on-chain',
                    date: 'Live',
                    titleClassName: 'text-emerald-400',
                    className: '[grid-area:stack] translate-x-24 translate-y-20 hover:translate-y-10',
                  },
                ]}
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── FEATURES GRID ─── */}
      <section className="relative z-10 py-16 md:py-32">
        <div className="max-w-[1080px] mx-auto px-6">
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p className="text-[11px] font-semibold text-emerald-400/70 uppercase tracking-[0.25em] mb-5">Under the hood</p>
            <h2 className="text-[2.8rem] md:text-[3.2rem] font-bold tracking-[-0.02em]">
              Every layer, purpose-built.
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: <Lock className="w-5 h-5" />,
                title: 'Zero-Knowledge Proofs',
                stat: 'Groth16',
                statLabel: 'proof system',
                accent: 'from-emerald-500 to-emerald-400',
                iconClass: 'bg-emerald-500/[0.08] text-emerald-400/70 group-hover:bg-emerald-500/[0.15] group-hover:text-emerald-400',
                statClass: 'text-emerald-400/80',
                desc: 'Groth16 circuit generates a client-side proof. The chain receives a boolean — never identity data. Verified via FlowEVM bridge.',
              },
              {
                icon: <Fingerprint className="w-5 h-5" />,
                title: 'Passkey Onboarding',
                stat: '<2s',
                statLabel: 'sign-up time',
                accent: 'from-cyan-500 to-cyan-400',
                iconClass: 'bg-cyan-500/[0.08] text-cyan-400/70 group-hover:bg-cyan-500/[0.15] group-hover:text-cyan-400',
                statClass: 'text-cyan-400/80',
                desc: 'WebAuthn creates a Flow account with one biometric tap. Gas is sponsored. No seed phrases, no extensions, no friction.',
              },
              {
                icon: <Cpu className="w-5 h-5" />,
                title: 'AI Regulatory Radar',
                stat: '5',
                statLabel: 'jurisdictions monitored',
                accent: 'from-violet-500 to-violet-400',
                iconClass: 'bg-violet-500/[0.08] text-violet-400/70 group-hover:bg-violet-500/[0.15] group-hover:text-violet-400',
                statClass: 'text-violet-400/80',
                desc: 'Claude AI enriches deterministic gap detection across FinCEN, MiCA, FCA, MAS, and FINTRAC. Fix a rule on-chain, the gap disappears.',
              },
              {
                icon: <Zap className="w-5 h-5" />,
                title: 'Flow Actions',
                stat: 'Pre-check',
                statLabel: 'every transaction',
                accent: 'from-amber-500 to-amber-400',
                iconClass: 'bg-amber-500/[0.08] text-amber-400/70 group-hover:bg-amber-500/[0.15] group-hover:text-amber-400',
                statClass: 'text-amber-400/80',
                desc: 'Attach ComplianceAction.verify() as a pre-check to any transaction. Runs before every deposit, borrow, or swap automatically.',
              },
              {
                icon: <Scale className="w-5 h-5" />,
                title: 'Multi-Jurisdiction Rules',
                stat: 'On-chain',
                statLabel: 'rule engine',
                accent: 'from-rose-500 to-rose-400',
                iconClass: 'bg-rose-500/[0.08] text-rose-400/70 group-hover:bg-rose-500/[0.15] group-hover:text-rose-400',
                statClass: 'text-rose-400/80',
                desc: 'On-chain RuleEngine stores per-jurisdiction rules — travel rule thresholds, KYC levels, re-verification windows. All configurable via governance.',
              },
              {
                icon: <Bot className="w-5 h-5" />,
                title: 'Builder Copilot',
                stat: 'AI',
                statLabel: 'powered assistant',
                accent: 'from-blue-500 to-blue-400',
                iconClass: 'bg-blue-500/[0.08] text-blue-400/70 group-hover:bg-blue-500/[0.15] group-hover:text-blue-400',
                statClass: 'text-blue-400/80',
                desc: 'Ask anything about compliance integration. Get Cadence code, regulatory guidance, and risk score explanations in plain language.',
              },
            ].map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06, duration: 0.5 }}
              >
                <SpotlightCard className="p-0 h-full group">
                  {/* Colored accent line */}
                  <div className={`h-[2px] bg-gradient-to-r ${f.accent} opacity-40 group-hover:opacity-80 transition-opacity duration-500`} />
                  <div className="p-7">
                    <div className="flex items-start justify-between mb-5">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-500 ${f.iconClass}`}>
                        {f.icon}
                      </div>
                      <div className="text-right">
                        <p className={`text-[18px] font-bold ${f.statClass}`}>{f.stat}</p>
                        <p className="text-[9px] text-white/25 uppercase tracking-wider">{f.statLabel}</p>
                      </div>
                    </div>
                    <h3 className="text-[15px] font-semibold mb-2.5 text-white/90">{f.title}</h3>
                    <p className="text-[13px] text-white/40 leading-relaxed">{f.desc}</p>
                  </div>
                </SpotlightCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CODE PREVIEW ─── */}
      <section className="relative z-10 py-16 md:py-32">
        <div className="max-w-[820px] mx-auto px-6">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-[2.2rem] font-bold tracking-tight mb-4">
              One import. That's it.
            </h2>
            <p className="text-[15px] text-white/45 max-w-md mx-auto">This is a real lending pool contract on Flow testnet. The highlighted line is the only change you make.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <SpotlightCard className="p-0 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.04]">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/30" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/30" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/30" />
                  <span className="text-[11px] text-white/40 ml-3 font-mono">LendingPool.cdc</span>
                </div>
                <span className="text-[9px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400/60 font-medium">LIVE ON TESTNET</span>
              </div>
              <div className="p-6 font-mono text-[13px] leading-[1.9] text-white/50 overflow-x-auto">
                <span className="text-white/20">// 1. Import the compliance engine</span>
                <br />
                <span className="text-cyan-400/80">import</span>{' '}
                <span className="text-emerald-400">ComplianceAction</span>{' '}
                <span className="text-cyan-400/80">from</span>{' '}
                <span className="text-amber-400/80">0x93c691a98b975493</span>
                <br /><br />
                <span className="text-white/20">// 2. Check compliance before any DeFi action</span>
                <br />
                <span className="text-cyan-400/80">access(all) fun</span>{' '}
                <span className="text-white/70">deposit</span>
                <span className="text-white/30">(user: Address, amount: UFix64) {'{'}</span>
                <br />
                <span className="text-white/30">{'    '}</span>
                <span className="text-cyan-400/80">let</span>{' '}
                <span className="text-white/70">ok</span>{' '}
                <span className="text-white/30">= </span>
                <span className="text-emerald-400">ComplianceAction</span>
                <span className="text-white/60">.verify</span>
                <span className="text-white/30">(user)</span>
                {'  '}
                <span className="text-emerald-400/50 text-[11px]">{'// ← this is it'}</span>
                <br />
                <span className="text-white/30">{'    '}assert(ok, message: </span>
                <span className="text-amber-400/70">"Not compliant"</span>
                <span className="text-white/30">)</span>
                <br />
                <span className="text-white/30">{'    '}{'// ... your deposit logic'}</span>
                <br />
                <span className="text-white/30">{'}'}</span>
              </div>
              {/* What happens under the hood */}
              <div className="border-t border-white/[0.04] px-6 py-4">
                <p className="text-[10px] text-white/25 uppercase tracking-wider font-semibold mb-3">What happens on-chain</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Checks ZK credential', color: 'bg-emerald-500/10 text-emerald-400/60 border-emerald-500/15' },
                    { label: 'Validates jurisdiction', color: 'bg-cyan-500/10 text-cyan-400/60 border-cyan-500/15' },
                    { label: 'Verifies not expired', color: 'bg-amber-500/10 text-amber-400/60 border-amber-500/15' },
                    { label: 'Collects 0.001 FLOW fee', color: 'bg-violet-500/10 text-violet-400/60 border-violet-500/15' },
                    { label: 'Returns boolean', color: 'bg-white/[0.04] text-white/40 border-white/[0.06]' },
                  ].map((step, si) => (
                    <span key={si} className={`inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-md border font-medium ${step.color}`}>
                      <span className="w-1 h-1 rounded-full bg-current opacity-60" />
                      {step.label}
                    </span>
                  ))}
                </div>
              </div>
            </SpotlightCard>
          </motion.div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="relative z-10 py-16 md:py-32">
        <div className="max-w-[1080px] mx-auto px-6 text-center">
          <motion.h2
            className="text-[clamp(1.5rem,5vw,3.5rem)] font-bold tracking-[-0.02em] leading-[1.1] mb-6"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Your protocol handles the finance.
            <br />
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              FlowShield handles the compliance.
            </span>
          </motion.h2>
          <motion.p
            className="text-[15px] text-white/45 mb-12 max-w-md mx-auto"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            When a regulator asks how you verify users, you'll have cryptographic proof that every transaction was checked.
          </motion.p>
          <motion.div
            className="flex items-center justify-center gap-4"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <button
              onClick={handleLaunch}
              className="px-8 py-3.5 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-[#060a13] font-semibold text-[14px] hover:shadow-[0_0_50px_rgba(52,211,153,0.25)] transition-all duration-500"
            >
              Try the Demo →
            </button>
            <button
              onClick={() => handleNavigate('/copilot')}
              className="px-8 py-3.5 rounded-full border border-white/[0.08] text-[14px] text-white/50 hover:text-white hover:border-white/[0.15] transition-all duration-300"
            >
              Builder Copilot
            </button>
          </motion.div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="relative z-10 border-t border-white/[0.08] mt-8">
        <div className="max-w-[1080px] mx-auto px-6 pt-14 pb-10">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 mb-14">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <FlowShieldLogo size={20} />
                <span className="text-[14px] font-semibold text-white/80">FlowShield</span>
              </div>
              <p className="text-[12px] text-white/55 leading-relaxed max-w-[240px]">
                Privacy-preserving compliance infrastructure for DeFi on Flow.
              </p>
            </div>

            {/* Product */}
            <div>
              <p className="text-[10px] text-white/45 uppercase tracking-[0.2em] font-semibold mb-4">Product</p>
              <div className="flex flex-col gap-2.5">
                <button onClick={() => handleNavigate('/dashboard')} className="text-[13px] text-white/45 hover:text-white/70 transition-colors text-left">Dashboard</button>
                <button onClick={() => handleNavigate('/copilot')} className="text-[13px] text-white/45 hover:text-white/70 transition-colors text-left">Builder Copilot</button>
                <button onClick={() => handleNavigate('/operator')} className="text-[13px] text-white/45 hover:text-white/70 transition-colors text-left">Operator</button>
              </div>
            </div>

            {/* Legal */}
            <div>
              <p className="text-[10px] text-white/45 uppercase tracking-[0.2em] font-semibold mb-4">Legal</p>
              <div className="flex flex-col gap-2.5">
                <button onClick={() => navigate('/privacy')} className="text-[13px] text-white/45 hover:text-white/70 transition-colors text-left">Privacy Policy</button>
                <button onClick={() => navigate('/terms')} className="text-[13px] text-white/45 hover:text-white/70 transition-colors text-left">Terms of Service</button>
              </div>
            </div>
          </div>

          <div className="border-t border-white/[0.08] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[11px] text-white/50">&copy; {new Date().getFullYear()} FlowShield. All rights reserved.</p>
            <p className="text-[11px] text-white/50">Built on Flow Blockchain</p>
          </div>

          {/* Giant brand text */}
          <div
            className="mt-12 -mb-4 select-none pointer-events-none"
            style={{ maskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)' }}
          >
            <h2 className="text-[clamp(5rem,15vw,12rem)] font-black tracking-[-0.04em] leading-[0.85] text-center text-emerald-400/[0.25]">
              FlowShield
            </h2>
          </div>
        </div>
      </footer>
    </AuroraBackground>
  )
}
