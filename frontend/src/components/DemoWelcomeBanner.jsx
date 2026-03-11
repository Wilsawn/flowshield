import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Settings, MessageSquare, AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const DISMISS_KEY = 'flowshield_demo_banner_dismissed'

const actions = [
  {
    label: 'Operator Panel',
    description: 'Monitor threats, run compliance cycles, and manage jurisdiction rules',
    icon: Settings,
    path: '/operator',
    color: 'emerald',
  },
  {
    label: 'Builder Copilot',
    description: 'AI compliance assistant for smart contracts',
    icon: MessageSquare,
    path: '/copilot',
    color: 'cyan',
  },
  {
    label: 'Simulate a Threat',
    description: 'Test threat detection and response workflows',
    icon: AlertTriangle,
    path: '/operator',
    color: 'amber',
  },
]

const colorMap = {
  emerald: {
    border: 'border-emerald-500/20 hover:border-emerald-500/30',
    bg: 'bg-emerald-500/[0.04] hover:bg-emerald-500/[0.08]',
    icon: 'text-emerald-400',
  },
  cyan: {
    border: 'border-cyan-500/20 hover:border-cyan-500/30',
    bg: 'bg-cyan-500/[0.04] hover:bg-cyan-500/[0.08]',
    icon: 'text-cyan-400',
  },
  amber: {
    border: 'border-amber-500/20 hover:border-amber-500/30',
    bg: 'bg-amber-500/[0.04] hover:bg-amber-500/[0.08]',
    icon: 'text-amber-400',
  },
}

export default function DemoWelcomeBanner() {
  const navigate = useNavigate()
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(DISMISS_KEY) === '1' } catch { return false }
  })

  if (dismissed) return null

  const handleDismiss = () => {
    setDismissed(true)
    try { localStorage.setItem(DISMISS_KEY, '1') } catch { /* ignore */ }
  }

  return (
    <AnimatePresence>
      <motion.div
        className="mb-6 p-5 rounded-2xl border border-emerald-500/[0.1] bg-gradient-to-br from-emerald-500/[0.04] to-transparent"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-[15px] font-semibold text-white/90">Welcome to FlowShield</h2>
            <p className="text-[12px] text-white/35 mt-0.5">
              Autonomous compliance for DeFi protocols on Flow. Pick a starting point:
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-lg text-white/20 hover:text-white/50 hover:bg-white/[0.04] transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {actions.map((action) => {
            const Icon = action.icon
            const c = colorMap[action.color]
            return (
              <button
                key={action.label}
                onClick={() => navigate(action.path)}
                className={`p-4 rounded-xl border ${c.border} ${c.bg} text-left transition-all`}
              >
                <Icon className={`w-5 h-5 ${c.icon} mb-2.5`} />
                <p className="text-[13px] font-medium text-white/80">{action.label}</p>
                <p className="text-[11px] text-white/30 mt-1 leading-relaxed">{action.description}</p>
              </button>
            )
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
