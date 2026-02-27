import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, X, Zap, Building2, Rocket, Copy, CheckCircle2, Loader2 } from 'lucide-react'

const TIERS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'For indie builders exploring compliance on Flow.',
    icon: Zap,
    color: 'emerald',
    features: [
      { label: 'Basic verify() calls', included: true },
      { label: '100 requests/day', included: true },
      { label: 'US jurisdiction only', included: true },
      { label: 'Public documentation', included: true },
      { label: 'Builder Copilot', included: false },
      { label: 'Regulatory Radar', included: false },
      { label: 'Webhooks', included: false },
      { label: 'SLA', included: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$499',
    period: '/mo',
    description: 'For protocols going to market across jurisdictions.',
    icon: Rocket,
    color: 'violet',
    popular: true,
    features: [
      { label: 'All verification methods', included: true },
      { label: '10,000 requests/day', included: true },
      { label: 'All 5 jurisdictions', included: true },
      { label: 'Builder Copilot AI', included: true },
      { label: 'Regulatory Radar scans', included: true },
      { label: 'Webhooks', included: true },
      { label: '99.9% SLA', included: true },
      { label: 'Dedicated support', included: false },
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '$2,999',
    period: '/mo',
    description: 'For large protocols with custom compliance needs.',
    icon: Building2,
    color: 'cyan',
    features: [
      { label: 'Unlimited requests', included: true },
      { label: 'Custom jurisdictions', included: true },
      { label: 'Dedicated Copilot instance', included: true },
      { label: 'Regulatory Radar + auto-fix', included: true },
      { label: 'Priority webhooks', included: true },
      { label: '99.99% SLA', included: true },
      { label: 'Dedicated support + Slack', included: true },
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
  const [registering, setRegistering] = useState(null)
  const [apiKey, setApiKey] = useState(null)
  const [copied, setCopied] = useState(false)

  const handleRegister = async (tierId) => {
    setRegistering(tierId)
    try {
      const API = import.meta.env.VITE_API_URL || 'http://localhost:3002'
      const res = await fetch(`${API}/api/subscription/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'My Protocol',
          contactEmail: 'dev@example.com',
          tier: tierId,
        }),
      })
      const data = await res.json()
      if (data.apiKey) {
        setApiKey({ key: data.apiKey, tier: tierId })
      }
    } catch (err) {
      console.warn('[Pricing] Registration failed:', err)
      // Demo fallback
      setApiKey({
        key: `fs_${tierId}_demo_${Date.now().toString(36)}`,
        tier: tierId,
        demo: true,
      })
    }
    setRegistering(null)
  }

  const copyKey = () => {
    if (apiKey?.key) {
      navigator.clipboard.writeText(apiKey.key)
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
          Integrate compliance verification into your protocol. Pay per verification on-chain, plus an optional API subscription for advanced features.
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
              Fees are collected on-chain by <code className="text-emerald-400/50 bg-black/20 px-1.5 py-0.5 rounded text-[10px]">ComplianceAction.verifyWithFee()</code> and deposited into the FlowShield treasury vault.
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
                <span className="text-[13px] text-white/30">{tier.period}</span>
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
                onClick={() => handleRegister(tier.id)}
                disabled={registering === tier.id}
                className={`w-full py-2.5 rounded-lg border text-[13px] font-medium transition-all duration-300 ${
                  tier.popular ? c.button : `${c.button} border`
                } disabled:opacity-50`}
              >
                {registering === tier.id ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Registering...
                  </span>
                ) : (
                  'Get API Key'
                )}
              </button>
            </motion.div>
          )
        })}
      </div>

      {/* API Key result */}
      {apiKey && (
        <motion.div
          className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-emerald-400">API Key Generated</p>
              <p className="text-[11px] text-white/30 mt-0.5 mb-3">
                Store this key securely. Include it as <code className="text-emerald-400/50 bg-black/20 px-1 rounded">X-Api-Key</code> header in all API requests.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-[12px] text-emerald-300/70 font-mono bg-black/30 px-3 py-2 rounded-lg break-all">
                  {apiKey.key}
                </code>
                <button
                  onClick={copyKey}
                  className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors shrink-0"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-white/30" />
                  )}
                </button>
              </div>
              {apiKey.demo && (
                <p className="text-[10px] text-white/20 mt-2">Demo key — start the backend server for real registration.</p>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
