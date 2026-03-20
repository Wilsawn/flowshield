/**
 * @file Pricing Section
 * @module components/PricingSection
 * @description API pricing page with 3 tiers (Starter, Growth, Scale).
 *              Includes scroll-triggered animations, Stripe checkout integration,
 *              contact sales modal, and API key generation for free tier.
 */
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, Sparkles, ArrowUpRight, Building, Copy, CheckCircle2, Loader2, ArrowRight } from 'lucide-react'
import { API } from '@/lib/api'

/* CSS-based stagger reveal for pricing cards */
function PricingGrid({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } }, { threshold: 0.15 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return (
    <div
      ref={ref}
      className={`grid grid-cols-1 md:grid-cols-3 gap-5 ${visible ? 'reveal-stagger reveal-visible' : 'reveal-hidden'}`}
    >
      {children}
    </div>
  )
}

const TIERS = [
  {
    id: 'starter',
    name: 'Starter',
    price: '$0',
    period: 'forever',
    description: 'For builders exploring compliance on Flow.',
    icon: Sparkles,
    cta: 'Get Free API Key',
    features: [
      '25,000 API calls / month',
      'verify() + verifyFull()',
      'US jurisdiction',
      'Documentation + community support',
      'Builder Copilot (limited)',
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    price: '$49',
    period: '/mo',
    description: 'For protocols launching across jurisdictions.',
    icon: ArrowUpRight,
    popular: true,
    cta: 'Start Growth Plan',
    features: [
      '250,000 API calls / month',
      'All verification methods',
      'US, EU, UK, SG, CA jurisdictions',
      'Builder Copilot AI (full)',
      'Regulatory Radar scans',
      'Webhook alerts',
      '99.9% uptime SLA',
      'Email support (24h response)',
    ],
  },
  {
    id: 'scale',
    name: 'Scale',
    price: '$149',
    period: '/mo',
    description: 'For production protocols with custom needs.',
    icon: Building,
    cta: 'Contact Sales',
    features: [
      'Unlimited API calls',
      '10+ jurisdictions + custom rules',
      'Dedicated Copilot instance',
      'Regulatory Radar + auto-remediation',
      'Priority webhooks + Slack alerts',
      '99.99% uptime SLA',
      'Dedicated support + Slack channel',
      'Custom contract deployment',
    ],
  },
]

export default function PricingSection() {
  const [loading, setLoading] = useState(null)
  const [result, setResult] = useState(null)
  const [copied, setCopied] = useState(false)
  const [showContactModal, setShowContactModal] = useState(false)
  const [contactForm, setContactForm] = useState({ email: '', protocolName: '', message: '' })
  const [contactSent, setContactSent] = useState(false)
  const [contactError, setContactError] = useState('')

  const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())

  const handleTierAction = async (tierId) => {
    setLoading(tierId)
    setResult(null)

    // Scale tier → open contact sales modal
    if (tierId === 'scale') {
      setShowContactModal(true)
      setLoading(null)
      return
    }

    try {
      const res = await fetch(`${API}/api/subscription/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: tierId }),
      })
      const data = await res.json()

      if (data.checkoutUrl) {
        // Stripe is configured — redirect to checkout
        window.location.href = data.checkoutUrl
        return
      }

      if (data.apiKey) {
        // Demo mode or free tier — show API key
        setResult({ key: data.apiKey, tier: tierId, demo: data.demo })
      }
    } catch (err) {
      setResult({ error: 'Backend unavailable. Start the server and try again.' })
    }
    setLoading(null)
  }

  const handleContactSales = async () => {
    setContactError('')

    if (!contactForm.email.trim()) {
      setContactError('Email is required.')
      return
    }
    if (!isValidEmail(contactForm.email)) {
      setContactError('Please enter a valid email address.')
      return
    }

    setLoading('contact')
    try {
      const res = await fetch(`${API}/api/subscription/contact-sales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm),
      })
      const data = await res.json()
      if (!res.ok) {
        setContactError(data.error || 'Something went wrong. Please try again.')
      } else {
        setContactSent(true)
      }
    } catch {
      setContactError('Could not reach the server. Please try again.')
    }
    setLoading(null)
  }

  const copyKey = () => {
    if (!result?.key || copied) return
    navigator.clipboard.writeText(result.key)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-8">
      {/* On-chain fees — compact inline */}
      <div className="flex items-center gap-4 text-[12px] text-white/30">
        <span className="text-white/50 font-medium">On-chain fees:</span>
        <span>0.001 FLOW / verification</span>
        <span className="text-white/10">·</span>
        <span>0.01 FLOW / credential mint</span>
        <span className="text-white/10">·</span>
        <span>Gas sponsored</span>
      </div>

      {/* Tier cards */}
      <PricingGrid>
        {TIERS.map((tier, i) => (
            <div
              key={tier.id}
              className={`relative rounded-xl p-5 flex flex-col transition-all duration-200 ${
                tier.popular
                  ? 'border border-emerald-500/25 bg-emerald-500/[0.04] hover:border-emerald-500/35'
                  : 'border border-white/[0.06] bg-white/[0.02] hover:border-white/[0.10] hover:bg-white/[0.04]'
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 rounded-full bg-emerald-400 text-[10px] font-bold text-[#060e09] uppercase tracking-wider">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  tier.popular
                    ? 'bg-emerald-500/10 border border-emerald-500/20'
                    : 'bg-white/[0.05] border border-white/[0.08]'
                }`}>
                  <tier.icon className={`w-4.5 h-4.5 ${tier.popular ? 'text-emerald-400' : 'text-white/50'}`} />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-white/90">{tier.name}</h3>
                </div>
              </div>

              <div className="mb-3">
                <span className="text-[28px] font-bold text-white">{tier.price}</span>
                {tier.period === 'forever' ? (
                  <span className="block text-[12px] text-white/25 mt-0.5">Free forever</span>
                ) : (
                  <span className="text-[13px] text-white/30 ml-1">{tier.period}</span>
                )}
              </div>

              <p className="text-[12px] text-white/40 mb-5 leading-relaxed">{tier.description}</p>

              <ul className="space-y-2 mb-6 flex-1">
                {tier.features.map((feature, j) => (
                  <li key={j} className="flex items-center gap-2 text-[12px] text-white/50">
                    <span className="text-emerald-400/50 shrink-0">•</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleTierAction(tier.id)}
                disabled={loading === tier.id}
                className={`w-full py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 ${
                  tier.popular
                    ? 'bg-white/90 text-[#060e09] hover:bg-white'
                    : 'border border-white/[0.08] text-white/50 hover:text-white/70 hover:border-white/[0.12] hover:bg-white/[0.03]'
                }`}
              >
                {loading === tier.id ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing...
                  </>
                ) : (
                  <>
                    {tier.cta} <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          ))}
      </PricingGrid>

      {/* API Key result */}
      <AnimatePresence>
        {result && !result.error && (
          <motion.div
            className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-emerald-400">
                  {result.demo ? 'API Key Generated (Demo Mode)' : 'API Key Generated'}
                </p>
                <p className="text-[11px] text-white/30 mt-0.5 mb-3">
                  Include as <code className="text-emerald-400/50 bg-black/20 px-1 rounded">X-Api-Key</code> header in all API requests.
                  {result.demo && <span className="text-amber-400/50"> Configure STRIPE_SECRET_KEY for real payments.</span>}
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-[12px] text-emerald-300/70 font-mono bg-black/30 px-3 py-2 rounded-lg break-all">
                    {result.key}
                  </code>
                  <button onClick={copyKey} className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors shrink-0">
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-white/30" />}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
        {result?.error && (
          <motion.div
            className="rounded-xl border border-red-500/20 bg-red-500/[0.04] p-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-[12px] text-red-400">{result.error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contact Sales Modal */}
      <AnimatePresence>
        {showContactModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { setShowContactModal(false); setContactSent(false) }}
          >
            <motion.div
              className="w-full max-w-lg mx-4 rounded-xl border border-white/[0.08] bg-[#0c1210] overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.6)]"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              {contactSent ? (
                <div className="p-10 text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-5">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h3 className="text-[18px] font-bold text-white mb-2">Request received</h3>
                  <p className="text-[13px] text-white/40 max-w-xs mx-auto leading-relaxed">
                    A solutions engineer will reach out within one business day to scope your deployment.
                  </p>
                  <button
                    onClick={() => { setShowContactModal(false); setContactSent(false) }}
                    className="mt-6 px-8 py-2.5 rounded-xl border border-white/[0.08] text-[13px] text-white/50 hover:text-white/80 hover:border-white/[0.15] transition-all"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <>
                  {/* Header with plan context */}
                  <div className="px-5 sm:px-7 pt-7 pb-5 border-b border-white/[0.06]">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-[17px] font-bold text-white tracking-tight">Talk to our team</h3>
                        <p className="text-[13px] text-white/35 mt-1">We'll scope your integration and get you live in days, not months.</p>
                      </div>
                      <button
                        onClick={() => { setShowContactModal(false); setContactSent(false) }}
                        className="text-white/20 hover:text-white/50 transition-colors p-1 -mr-1 -mt-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-white/30">
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.06]">
                        <Building className="w-3 h-3" /> Scale Plan
                      </span>
                      <span>Unlimited calls</span>
                      <span className="text-white/10">·</span>
                      <span>99.99% SLA</span>
                      <span className="text-white/10">·</span>
                      <span>Dedicated support</span>
                    </div>
                  </div>

                  {/* Form */}
                  <div className="px-5 sm:px-7 py-6 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-white/30 font-medium mb-1.5 uppercase tracking-wider">Work email</label>
                        <input
                          type="email"
                          placeholder="you@protocol.xyz"
                          value={contactForm.email}
                          onChange={(e) => setContactForm(p => ({ ...p, email: e.target.value }))}
                          className="w-full h-10 px-3 rounded-lg border border-white/[0.08] bg-white/[0.03] text-[13px] text-white placeholder:text-white/15 focus:outline-none focus:border-emerald-500/40 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-white/30 font-medium mb-1.5 uppercase tracking-wider">Protocol</label>
                        <input
                          type="text"
                          placeholder="Your protocol or company"
                          value={contactForm.protocolName}
                          onChange={(e) => setContactForm(p => ({ ...p, protocolName: e.target.value }))}
                          className="w-full h-10 px-3 rounded-lg border border-white/[0.08] bg-white/[0.03] text-[13px] text-white placeholder:text-white/15 focus:outline-none focus:border-emerald-500/40 transition-colors"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] text-white/30 font-medium mb-1.5 uppercase tracking-wider">What are you building?</label>
                      <textarea
                        placeholder="e.g. DEX with 50K monthly users, need MiCA + FinCEN coverage"
                        value={contactForm.message}
                        onChange={(e) => setContactForm(p => ({ ...p, message: e.target.value }))}
                        rows={3}
                        className="w-full px-3 py-2.5 rounded-lg border border-white/[0.08] bg-white/[0.03] text-[13px] text-white placeholder:text-white/15 focus:outline-none focus:border-emerald-500/40 transition-colors resize-none"
                      />
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="px-5 sm:px-7 pb-7 space-y-3">
                    {contactError && (
                      <p className="text-[12px] text-red-400">{contactError}</p>
                    )}
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-[11px] text-white/20 leading-relaxed">
                        No commitment. We'll send a custom proposal.
                      </p>
                      <button
                        onClick={handleContactSales}
                        disabled={!contactForm.email.trim() || loading === 'contact'}
                        className="px-6 py-2.5 rounded-xl bg-white text-[13px] font-semibold text-[#0a0a0a] flex items-center gap-2 disabled:opacity-40 transition-all hover:bg-white/90 active:scale-[0.98] shrink-0"
                      >
                        {loading === 'contact' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                        Send request
                      </button>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Comparison note */}
      <div className="text-center">
        <p className="text-[11px] text-white/15 leading-relaxed max-w-lg mx-auto">
          Pricing compared: Sumsub ($199–499/mo), Chainalysis (enterprise-only), ComplyAdvantage ($500–2k/mo).
          FlowShield undercuts by 70–90% — ZK proofs eliminate manual review overhead.
        </p>
      </div>
    </div>
  )
}
