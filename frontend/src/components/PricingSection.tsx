import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Copy, CheckCircle2, Loader2, ArrowRight, Monitor, Send, Search, Eye, Clock, Shield } from 'lucide-react'
import { API } from '@/lib/api'

const TIERS = [
  {
    id: 'starter',
    name: 'Free',
    price: '$0',
    period: '/month',
    description: 'Get started with the basics',
    cta: 'Get started free',
    features: [
      { icon: Monitor, text: '50,000 API calls / month' },
      { icon: Send, text: 'verify() + verifyFull()' },
      { icon: Search, text: 'US jurisdiction' },
      { icon: Eye, text: 'Builder Copilot (limited)' },
    ],
  },
  {
    id: 'growth',
    name: 'Pro',
    price: '$20',
    period: '/month',
    description: 'For power users who want it all',
    popular: true,
    cta: 'Get Pro',
    features: [
      { icon: Monitor, text: '500,000 API calls / month' },
      { icon: Send, text: 'All verification methods' },
      { icon: Search, text: 'US, EU, UK, SG, CA jurisdictions' },
      { icon: Clock, text: 'Regulatory Radar + alerts' },
      { icon: Eye, text: 'Builder Copilot AI (full)' },
      { icon: Shield, text: '99.9% uptime SLA + priority support' },
    ],
  },
]

export default function PricingSection() {
  const [loading, setLoading] = useState<string | null>(null)
  const [result, setResult] = useState<{ key?: string; tier?: string; demo?: boolean; error?: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const handleTierAction = async (tierId: string) => {
    setLoading(tierId)
    setResult(null)

    try {
      const res = await fetch(`${API}/api/subscription/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: tierId }),
      })
      const data = await res.json()

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
        return
      }

      if (data.apiKey) {
        setResult({ key: data.apiKey, tier: tierId, demo: data.demo })
      }
    } catch {
      setResult({ error: 'Backend unavailable. Start the server and try again.' })
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
      {/* Tier cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl mx-auto">
        {TIERS.map((tier) => (
          <div
            key={tier.id}
            className={`relative rounded-2xl p-7 flex flex-col transition-all duration-200 ${
              tier.popular
                ? 'border border-white/[0.10] bg-white/[0.04]'
                : 'border border-white/[0.06] bg-white/[0.02]'
            }`}
          >
            {tier.popular && (
              <div className="absolute -top-3 right-5">
                <span className="px-3 py-1 rounded-full border border-white/[0.12] bg-white/[0.06] text-[10px] font-semibold text-white/70 tracking-wide">
                  Best value
                </span>
              </div>
            )}

            <h3 className="text-[15px] font-semibold text-white/80 mb-4">{tier.name}</h3>

            <div className="mb-1">
              <span className="text-[42px] font-bold text-white tracking-tight">{tier.price}</span>
              <span className="text-[14px] text-white/30 ml-1">{tier.period}</span>
            </div>

            <p className="text-[13px] text-white/35 mb-7">{tier.description}</p>

            <ul className="space-y-3.5 mb-8 flex-1">
              {tier.features.map((feature, j) => (
                <li key={j} className="flex items-center gap-3 text-[13px] text-white/55">
                  <feature.icon className="w-4 h-4 text-white/25 shrink-0" />
                  {feature.text}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleTierAction(tier.id)}
              disabled={loading === tier.id}
              className={`w-full py-3 rounded-xl text-[13px] font-semibold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 ${
                tier.popular
                  ? 'bg-white text-[#0a0a0a] hover:bg-white/90'
                  : 'border border-white/[0.10] text-white/60 hover:text-white/80 hover:border-white/[0.15] hover:bg-white/[0.03]'
              }`}
            >
              {loading === tier.id ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing...
                </>
              ) : (
                tier.cta
              )}
            </button>
          </div>
        ))}
      </div>

      {/* API Key result */}
      <AnimatePresence>
        {result && !result.error && (
          <motion.div
            className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-5 max-w-3xl mx-auto"
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
            className="rounded-xl border border-red-500/20 bg-red-500/[0.04] p-4 max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-[12px] text-red-400">{result.error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Comparison note */}
      <div className="text-center">
        <p className="text-[11px] text-white/15 leading-relaxed max-w-lg mx-auto">
          Compared: Sumsub ($199–499/mo), Chainalysis (enterprise-only), ComplyAdvantage ($500–2k/mo).
          FlowShield undercuts by 85–95% — ZK proofs eliminate manual review overhead.
        </p>
      </div>
    </div>
  )
}
