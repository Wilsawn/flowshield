import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, Zap, Building2, Rocket, Copy, CheckCircle2, Loader2, ArrowRight, Mail, Send } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3002'

const TIERS = [
  {
    id: 'starter',
    name: 'Starter',
    price: '$0',
    period: 'forever',
    description: 'For indie builders exploring compliance on Flow.',
    icon: Zap,
    color: 'emerald',
    cta: 'Get Free API Key',
    features: [
      { label: '1,000 API calls / month', included: true },
      { label: 'Basic verify() + verifyFull()', included: true },
      { label: 'US jurisdiction', included: true },
      { label: 'Public documentation', included: true },
      { label: 'Community support', included: true },
      { label: 'Builder Copilot', included: false },
      { label: 'Regulatory Radar', included: false },
      { label: 'Webhooks', included: false },
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    price: '$149',
    period: '/mo',
    description: 'For protocols going to market across jurisdictions.',
    icon: Rocket,
    color: 'violet',
    popular: true,
    cta: 'Start Growth Plan',
    features: [
      { label: '25,000 API calls / month', included: true },
      { label: 'All verification methods', included: true },
      { label: 'US, EU, UK, SG, CA jurisdictions', included: true },
      { label: 'Builder Copilot AI', included: true },
      { label: 'Regulatory Radar scans', included: true },
      { label: 'Webhook alerts', included: true },
      { label: '99.9% uptime SLA', included: true },
      { label: 'Email support (24h response)', included: true },
    ],
  },
  {
    id: 'scale',
    name: 'Scale',
    price: '$499',
    period: '/mo',
    description: 'For production protocols with custom compliance needs.',
    icon: Building2,
    color: 'cyan',
    cta: 'Contact Sales',
    features: [
      { label: 'Unlimited API calls', included: true },
      { label: '10+ jurisdictions + custom', included: true },
      { label: 'Dedicated Copilot instance', included: true },
      { label: 'Regulatory Radar + auto-remediation', included: true },
      { label: 'Priority webhooks + Slack alerts', included: true },
      { label: '99.99% uptime SLA', included: true },
      { label: 'Dedicated support + Slack channel', included: true },
      { label: 'Custom contract deployment', included: true },
    ],
  },
]

const colorMap = {
  emerald: {
    border: 'border-emerald-500/20',
    bg: 'bg-emerald-500/[0.04]',
    text: 'text-emerald-400',
    icon: 'bg-emerald-500/10 border-emerald-500/20',
    button: 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/[0.08]',
    check: 'text-emerald-400/60',
  },
  violet: {
    border: 'border-violet-500/20',
    bg: 'bg-violet-500/[0.04]',
    text: 'text-violet-400',
    icon: 'bg-violet-500/10 border-violet-500/20',
    button: 'bg-gradient-to-r from-violet-500 to-purple-500 text-white hover:shadow-[0_0_30px_rgba(139,92,246,0.2)]',
    check: 'text-violet-400/60',
  },
  cyan: {
    border: 'border-cyan-500/20',
    bg: 'bg-cyan-500/[0.04]',
    text: 'text-cyan-400',
    icon: 'bg-cyan-500/10 border-cyan-500/20',
    button: 'border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/[0.08]',
    check: 'text-cyan-400/60',
  },
}

export default function PricingSection() {
  const [loading, setLoading] = useState(null)
  const [result, setResult] = useState(null)
  const [copied, setCopied] = useState(false)
  const [showContactModal, setShowContactModal] = useState(false)
  const [contactForm, setContactForm] = useState({ email: '', protocolName: '', message: '' })
  const [contactSent, setContactSent] = useState(false)

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
    if (!contactForm.email) return
    setLoading('contact')
    try {
      await fetch(`${API}/api/subscription/contact-sales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm),
      })
      setContactSent(true)
    } catch {
      setContactSent(true) // Show success anyway for UX
    }
    setLoading(null)
  }

  const copyKey = () => {
    if (result?.key) {
      navigator.clipboard.writeText(result.key)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">API Pricing</h2>
        <p className="text-[13px] text-white/30 mt-1">
          Compliance infrastructure for DeFi protocols on Flow. Usage-based on-chain fees + optional API subscription for advanced features.
        </p>
      </div>

      {/* On-chain fees callout */}
      <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.03] p-4">
        <p className="text-[12px] font-semibold text-emerald-400 mb-2">On-Chain Fees (all tiers)</p>
        <div className="flex flex-wrap gap-6">
          <div>
            <p className="text-[20px] font-bold text-white">0.001 <span className="text-[12px] text-white/30 font-normal">FLOW</span></p>
            <p className="text-[10px] text-white/30">per verification check</p>
          </div>
          <div>
            <p className="text-[20px] font-bold text-white">0.01 <span className="text-[12px] text-white/30 font-normal">FLOW</span></p>
            <p className="text-[10px] text-white/30">per credential mint</p>
          </div>
          <div className="flex-1 flex items-center">
            <p className="text-[11px] text-white/25 leading-relaxed">
              Fees collected on-chain via <code className="text-emerald-400/50 bg-black/20 px-1.5 py-0.5 rounded text-[10px]">ComplianceAction.verifyWithFee()</code> into the FlowShield treasury vault. ~$0.0005 per check at current FLOW price.
            </p>
          </div>
        </div>
      </div>

      {/* Tier cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {TIERS.map((tier, i) => {
          const c = colorMap[tier.color]
          return (
            <motion.div
              key={tier.id}
              className={`relative rounded-xl border ${c.border} ${c.bg} p-5 flex flex-col`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 rounded-full bg-violet-500 text-[10px] font-bold text-white uppercase tracking-wider">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div className={`w-9 h-9 rounded-lg ${c.icon} border flex items-center justify-center`}>
                  <tier.icon className={`w-4.5 h-4.5 ${c.text}`} />
                </div>
                <div>
                  <h3 className={`text-[15px] font-bold ${c.text}`}>{tier.name}</h3>
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

              <p className="text-[12px] text-white/30 mb-5 leading-relaxed">{tier.description}</p>

              <div className="space-y-2 mb-6 flex-1">
                {tier.features.map((f, j) => (
                  <div key={j} className="flex items-center gap-2">
                    {f.included ? (
                      <Check className={`w-3.5 h-3.5 ${c.check} shrink-0`} />
                    ) : (
                      <X className="w-3.5 h-3.5 text-white/10 shrink-0" />
                    )}
                    <span className={`text-[12px] ${f.included ? 'text-white/50' : 'text-white/15'}`}>
                      {f.label}
                    </span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => handleTierAction(tier.id)}
                disabled={loading === tier.id}
                className={`w-full py-2.5 rounded-lg border text-[13px] font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
                  tier.popular ? c.button : `${c.button} border`
                } disabled:opacity-50`}
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
            </motion.div>
          )
        })}
      </div>

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
              className="w-full max-w-md mx-4 rounded-2xl border border-white/[0.08] bg-[#0a0f1a] overflow-hidden"
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                {contactSent ? (
                  <div className="text-center py-4">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                    <h3 className="text-[16px] font-bold text-white mb-1">We'll be in touch!</h3>
                    <p className="text-[12px] text-white/30">Our team will reach out within 24 hours to discuss your Scale plan.</p>
                    <button
                      onClick={() => { setShowContactModal(false); setContactSent(false) }}
                      className="mt-4 px-6 py-2 rounded-lg border border-white/[0.08] text-[12px] text-white/50 hover:text-white/70 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-5">
                      <Building2 className="w-5 h-5 text-cyan-400" />
                      <h3 className="text-[16px] font-bold text-white">Contact Sales — Scale Plan</h3>
                    </div>
                    <p className="text-[12px] text-white/30 mb-5">
                      $499/mo · Unlimited API calls · 10+ jurisdictions · 99.99% SLA · Dedicated support
                    </p>
                    <div className="space-y-3">
                      <input
                        type="email"
                        placeholder="Work email"
                        value={contactForm.email}
                        onChange={(e) => setContactForm(p => ({ ...p, email: e.target.value }))}
                        className="w-full h-10 px-3 rounded-lg border border-white/[0.08] bg-white/[0.03] text-[13px] text-white placeholder:text-white/20 focus:outline-none focus:border-cyan-500/30"
                      />
                      <input
                        type="text"
                        placeholder="Protocol / Company name"
                        value={contactForm.protocolName}
                        onChange={(e) => setContactForm(p => ({ ...p, protocolName: e.target.value }))}
                        className="w-full h-10 px-3 rounded-lg border border-white/[0.08] bg-white/[0.03] text-[13px] text-white placeholder:text-white/20 focus:outline-none focus:border-cyan-500/30"
                      />
                      <textarea
                        placeholder="Tell us about your compliance needs (optional)"
                        value={contactForm.message}
                        onChange={(e) => setContactForm(p => ({ ...p, message: e.target.value }))}
                        rows={3}
                        className="w-full px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.03] text-[13px] text-white placeholder:text-white/20 focus:outline-none focus:border-cyan-500/30 resize-none"
                      />
                      <button
                        onClick={handleContactSales}
                        disabled={!contactForm.email || loading === 'contact'}
                        className="w-full py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-[13px] font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:shadow-[0_0_30px_rgba(6,182,212,0.2)]"
                      >
                        {loading === 'contact' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Get in Touch
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Comparison note */}
      <div className="text-center">
        <p className="text-[11px] text-white/15 leading-relaxed max-w-lg mx-auto">
          Pricing compared: Sumsub ($199–499/mo), Chainalysis (enterprise-only), ComplyAdvantage ($500–2k/mo).
          FlowShield undercuts by 60–80% — ZK proofs eliminate manual review overhead.
        </p>
      </div>
    </div>
  )
}
