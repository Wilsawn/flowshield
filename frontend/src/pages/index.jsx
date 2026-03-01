import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Fingerprint, Zap, Bot, Lock, Scale, Cpu } from 'lucide-react'
import { motion } from 'framer-motion'
import DisplayCards from '@/components/ui/display-cards'
import AuroraBackground from '@/components/ui/aurora-background'
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

  // Fetch live stats from backend
  const [stats, setStats] = useState(null)
  const [statsError, setStatsError] = useState(false)
  useEffect(() => {
    const API = import.meta.env.VITE_API_URL || 'http://localhost:3002'
    fetch(`${API}/api/stats`).then(r => {
      if (!r.ok) throw new Error('Stats unavailable')
      return r.json()
    }).then(data => {
      if (data.error) throw new Error(data.error)
      setStats({ contracts: data.contracts, jurisdictions: data.jurisdictions, onChainPII: data.onChainPII })
    }).catch(() => { setStatsError(true) })
  }, [])

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
            <span className="text-[15px] font-semibold tracking-[-0.01em]">FlowShield</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => handleNavigate('/copilot')} className="text-[13px] text-white/40 hover:text-white transition-colors">Copilot</button>
            <button onClick={() => handleNavigate('/operator')} className="text-[13px] text-white/40 hover:text-white transition-colors">Operator</button>
            <button onClick={() => handleNavigate('/dashboard')} className="text-[13px] text-white/40 hover:text-white transition-colors">Dashboard</button>
            <button
              onClick={handleLaunch}
              className="text-[13px] font-medium px-4 py-1.5 rounded-lg bg-white text-[#060a13] hover:bg-white/90 transition-colors"
            >
              Launch App
            </button>
          </div>
          <button
            onClick={handleLaunch}
            className="md:hidden text-[13px] font-medium px-4 py-1.5 rounded-lg bg-white text-[#060a13] hover:bg-white/90 transition-colors"
          >
            Launch App
          </button>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="relative z-10 pt-24 pb-20 md:pt-40 md:pb-32">
        <div className="max-w-[720px] mx-auto px-6 text-center">
          <motion.div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-md text-[13px] border border-white/[0.06] mb-8"
            variants={fade} initial="hidden" animate="show" custom={0}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-white/40">Live on Flow Testnet</span>
          </motion.div>

          <motion.h1
            className="text-[clamp(2.5rem,6vw,3.5rem)] leading-[1.08] font-bold tracking-[-0.03em] mb-6"
            variants={fade} initial="hidden" animate="show" custom={0.08}
          >
            Compliance infrastructure{' '}
            <span className="text-emerald-400">for DeFi on Flow</span>
          </motion.h1>

          <motion.p
            className="text-base text-white/40 max-w-lg mx-auto leading-relaxed mb-10"
            variants={fade} initial="hidden" animate="show" custom={0.16}
          >
            Add KYC verification to any protocol with one Cadence import.
            Users sign up with a passkey, verify via ZK proof, and never
            share identity data on-chain.
          </motion.p>

          <motion.div
            className="flex items-center justify-center gap-3"
            variants={fade} initial="hidden" animate="show" custom={0.24}
          >
            <button
              onClick={handleLaunch}
              className="px-6 py-2.5 rounded-lg bg-white text-[#060a13] font-semibold text-[14px] hover:bg-white/90 transition-colors"
            >
              Try the Demo →
            </button>
            <button
              onClick={() => handleNavigate('/copilot')}
              className="px-6 py-2.5 rounded-lg border border-white/[0.08] text-[14px] text-white/50 hover:text-white/80 hover:border-white/[0.15] transition-colors"
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

      {/* ─── METRICS ─── */}
      <section className="relative z-10 py-16 md:py-24">
        <div className="max-w-[1080px] mx-auto px-6">
          <div className="grid grid-cols-3 gap-8 border-b border-white/[0.04] pb-16">
            {statsError ? (
              <div className="col-span-3 text-center py-4">
                <p className="text-sm text-white/25">Stats unavailable — connect to backend to see live data</p>
              </div>
            ) : !stats ? (
              <div className="col-span-3 flex justify-center gap-12">
                {[0, 1, 2].map(i => (
                  <div key={i} className="text-center animate-pulse">
                    <div className="h-12 w-16 mx-auto rounded bg-white/[0.04] mb-2" />
                    <div className="h-4 w-24 mx-auto rounded bg-white/[0.03]" />
                  </div>
                ))}
              </div>
            ) : (
              [
                { val: stats.contracts, suffix: '', label: 'Cadence contracts deployed' },
                { val: stats.jurisdictions, suffix: '', label: 'Jurisdictions supported' },
                { val: stats.onChainPII, suffix: '%', label: 'Identity data on-chain' },
              ].map((s, i) => (
                <motion.div
                  key={i}
                  className="text-center"
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                >
                  <p className="text-[2.5rem] md:text-[3rem] font-bold tracking-tight text-white">
                    <AnimatedTicker value={s.val} suffix={s.suffix} />
                  </p>
                  <p className="text-sm text-white/40 mt-1">{s.label}</p>
                </motion.div>
              ))
            )}
          </div>

          <div className="pt-8 flex items-center justify-center gap-8 flex-wrap">
            {['FinCEN', 'MiCA', 'FCA', 'FINTRAC', 'FATF', 'MAS'].map((f) => (
              <span key={f} className="text-sm font-medium text-white/25">{f}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="relative z-10 py-20 md:py-32">
        <div className="max-w-[1080px] mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            <div>
              <motion.h2
                className="text-2xl md:text-[2rem] font-bold tracking-[-0.02em] leading-[1.1] mb-10"
                initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              >
                Three steps to compliant transactions
              </motion.h2>

              <div className="space-y-8">
                {[
                  { n: '01', t: 'Passkey sign-up', d: 'User enters an email and taps a fingerprint. WebAuthn creates a Flow account in the background.' },
                  { n: '02', t: 'ZK proof verifies', d: 'A zero-knowledge proof runs client-side. The chain receives a boolean — never identity data.' },
                  { n: '03', t: 'Protocol checks', d: 'Your Cadence contract calls ComplianceAction.verify(addr) before any deposit, borrow, or swap.' },
                ].map((step, i) => (
                  <motion.div
                    key={i}
                    className="flex gap-4"
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08, duration: 0.5 }}
                  >
                    <span className="text-sm font-mono text-white/20 pt-0.5 shrink-0">{step.n}</span>
                    <div>
                      <h4 className="text-[15px] font-semibold mb-1 text-white/80">{step.t}</h4>
                      <p className="text-sm text-white/40 leading-relaxed">{step.d}</p>
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

      {/* ─── PRODUCT SHOWCASE ─── */}
      <section className="relative z-10 py-20 md:py-32">
        <div className="max-w-[1200px] mx-auto px-6">
          <motion.h2
            className="text-2xl md:text-[2rem] font-bold tracking-[-0.02em] text-center mb-2"
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          >
            Architecture
          </motion.h2>
          <motion.p
            className="text-sm text-white/35 text-center mb-12"
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
          >
            Drag to explore · Scroll to zoom
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}
          >
            <ProductShowcase />
          </motion.div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section className="relative z-10 py-20 md:py-32">
        <div className="max-w-[1080px] mx-auto px-6">
          <motion.h2
            className="text-2xl md:text-[2rem] font-bold tracking-[-0.02em] text-center mb-16"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Every layer, purpose-built
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-white/[0.04] rounded-xl overflow-hidden border border-white/[0.04]">
            {[
              {
                icon: <Lock className="w-4 h-4" />,
                title: 'Zero-Knowledge Proofs',
                desc: 'Groth16 circuit generates a client-side proof. The chain receives a boolean — never identity data.',
              },
              {
                icon: <Fingerprint className="w-4 h-4" />,
                title: 'Passkey Onboarding',
                desc: 'WebAuthn creates a Flow account with one biometric tap. No seed phrases, no extensions.',
              },
              {
                icon: <Cpu className="w-4 h-4" />,
                title: 'Regulatory Radar',
                desc: 'AI-enriched gap detection across five jurisdictions. Fix a rule on-chain, the gap disappears.',
              },
              {
                icon: <Zap className="w-4 h-4" />,
                title: 'Flow Actions',
                desc: 'ComplianceAction.verify() runs as a pre-check before every deposit, borrow, or swap.',
              },
              {
                icon: <Scale className="w-4 h-4" />,
                title: 'Multi-Jurisdiction Rules',
                desc: 'On-chain RuleEngine stores per-jurisdiction thresholds, KYC levels, and re-verification windows.',
              },
              {
                icon: <Bot className="w-4 h-4" />,
                title: 'Builder Copilot',
                desc: 'Ask anything about compliance. Get Cadence code, regulatory context, and risk explanations.',
              },
            ].map((f, i) => (
              <motion.div
                key={i}
                className="bg-[#060a13] p-8"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
              >
                <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center text-white/40 mb-4">
                  {f.icon}
                </div>
                <h3 className="text-[15px] font-semibold mb-2 text-white/80">{f.title}</h3>
                <p className="text-sm text-white/35 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CODE PREVIEW ─── */}
      <section className="relative z-10 py-20 md:py-32">
        <div className="max-w-[720px] mx-auto px-6">
          <motion.h2
            className="text-2xl md:text-[2rem] font-bold tracking-[-0.02em] text-center mb-3"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            One import. That's it.
          </motion.h2>
          <motion.p
            className="text-sm text-white/35 text-center mb-10 max-w-md mx-auto"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            A real lending pool contract on Flow testnet. The highlighted line is the only change.
          </motion.p>

          <motion.div
            className="rounded-xl border border-white/[0.06] overflow-hidden"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04] bg-white/[0.01]">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                <span className="text-xs text-white/30 ml-3 font-mono">LendingPool.cdc</span>
              </div>
            </div>
            <div className="p-6 font-mono text-[13px] leading-[1.9] text-white/50 overflow-x-auto">
              <span className="text-white/20">// Import the compliance engine</span>
              <br />
              <span className="text-white/60">import</span>{' '}
              <span className="text-emerald-400">ComplianceAction</span>{' '}
              <span className="text-white/60">from</span>{' '}
              <span className="text-white/40">0x93c691a98b975493</span>
              <br /><br />
              <span className="text-white/20">// Check compliance before any DeFi action</span>
              <br />
              <span className="text-white/60">access(all) fun</span>{' '}
              <span className="text-white/70">deposit</span>
              <span className="text-white/30">(user: Address, amount: UFix64) {'{'}</span>
              <br />
              <span className="text-white/30">{'    '}</span>
              <span className="text-white/60">let</span>{' '}
              <span className="text-white/70">ok</span>{' '}
              <span className="text-white/30">= </span>
              <span className="text-emerald-400">ComplianceAction</span>
              <span className="text-white/50">.verify</span>
              <span className="text-white/30">(user)</span>
              {'  '}
              <span className="text-emerald-400/40 text-xs">{'// ← one line'}</span>
              <br />
              <span className="text-white/30">{'    '}assert(ok, message: </span>
              <span className="text-white/50">"Not compliant"</span>
              <span className="text-white/30">)</span>
              <br />
              <span className="text-white/30">{'    '}{'// ... deposit logic'}</span>
              <br />
              <span className="text-white/30">{'}'}</span>
            </div>
            <div className="border-t border-white/[0.04] px-6 py-3">
              <p className="text-xs text-white/25">
                verify() checks ZK credential → validates jurisdiction → confirms not expired → collects 0.001 FLOW → returns boolean
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="relative z-10 py-24 md:py-40">
        <div className="max-w-[600px] mx-auto px-6 text-center">
          <motion.h2
            className="text-2xl md:text-[2rem] font-bold tracking-[-0.02em] leading-[1.15] mb-4"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Your protocol handles the finance.
            <br />
            FlowShield handles the compliance.
          </motion.h2>
          <motion.p
            className="text-sm text-white/35 mb-8"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            Cryptographic proof that every transaction was checked.
          </motion.p>
          <motion.div
            className="flex items-center justify-center gap-3"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
          >
            <button
              onClick={handleLaunch}
              className="px-6 py-2.5 rounded-lg bg-white text-[#060a13] font-semibold text-[14px] hover:bg-white/90 transition-colors"
            >
              Try the Demo →
            </button>
            <button
              onClick={() => handleNavigate('/copilot')}
              className="px-6 py-2.5 rounded-lg border border-white/[0.08] text-[14px] text-white/50 hover:text-white/80 hover:border-white/[0.15] transition-colors"
            >
              Builder Copilot
            </button>
          </motion.div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="relative z-10 border-t border-white/[0.06]">
        <div className="max-w-[1080px] mx-auto px-6 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FlowShieldLogo size={18} />
                <span className="text-sm font-semibold text-white/70">FlowShield</span>
              </div>
              <p className="text-xs text-white/30 leading-relaxed max-w-[220px]">
                Privacy-preserving compliance infrastructure for DeFi on Flow.
              </p>
            </div>

            <div>
              <p className="text-xs text-white/25 uppercase tracking-wider font-medium mb-3">Product</p>
              <div className="flex flex-col gap-2">
                <button onClick={() => handleNavigate('/dashboard')} className="text-sm text-white/40 hover:text-white/70 transition-colors text-left">Dashboard</button>
                <button onClick={() => handleNavigate('/copilot')} className="text-sm text-white/40 hover:text-white/70 transition-colors text-left">Builder Copilot</button>
                <button onClick={() => handleNavigate('/operator')} className="text-sm text-white/40 hover:text-white/70 transition-colors text-left">Operator</button>
              </div>
            </div>

            <div>
              <p className="text-xs text-white/25 uppercase tracking-wider font-medium mb-3">Legal</p>
              <div className="flex flex-col gap-2">
                <button onClick={() => navigate('/privacy')} className="text-sm text-white/40 hover:text-white/70 transition-colors text-left">Privacy Policy</button>
                <button onClick={() => navigate('/terms')} className="text-sm text-white/40 hover:text-white/70 transition-colors text-left">Terms of Service</button>
              </div>
            </div>
          </div>

          <div className="border-t border-white/[0.06] pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs text-white/25">&copy; {new Date().getFullYear()} FlowShield</p>
            <p className="text-xs text-white/25">Built on Flow Blockchain</p>
          </div>
        </div>
      </footer>
    </AuroraBackground>
  )
}
