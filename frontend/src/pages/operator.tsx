import { useState } from 'react'
import { X, Lightbulb } from 'lucide-react'
import OperatorDashboard from '@/components/OperatorDashboard'
import GovernancePanel from '@/components/GovernancePanel'

const HINT_DISMISS_KEY = 'flowshield_operator_hint_dismissed'

export default function OperatorPage() {
  const [hintDismissed, setHintDismissed] = useState(() => {
    try { return localStorage.getItem(HINT_DISMISS_KEY) === '1' } catch { return false }
  })

  const dismissHint = () => {
    setHintDismissed(true)
    try { localStorage.setItem(HINT_DISMISS_KEY, '1') } catch { /* ignore */ }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-[1.75rem] font-bold tracking-tight text-white">
          Operator Dashboard
        </h1>
        <p className="text-[13px] text-white/40 mt-1">
          Monitor compliance status, risk scores, and audit logs across your protocol.
        </p>
      </div>

      {!hintDismissed && (
        <div className="mb-6 flex items-start gap-3 p-4 rounded-xl border border-cyan-500/15 bg-cyan-500/[0.04]">
          <Lightbulb className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <p className="text-[12px] text-cyan-400/80 leading-relaxed flex-1">
            Start by clicking <strong>"Simulate Threat"</strong> in Compliance Controls below, then use <strong>Regulatory Radar</strong> to detect and fix the gaps.
          </p>
          <button onClick={dismissHint} className="p-1 rounded text-white/20 hover:text-white/50 transition-colors shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <OperatorDashboard />

      {/* Governance — Multi-sig proposals */}
      <div className="mt-10 pt-8 border-t border-white/[0.04]">
        <GovernancePanel />
      </div>
    </div>
  )
}
