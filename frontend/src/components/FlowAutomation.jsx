import { useState } from 'react'
import { Zap, Shield, Activity, Globe, Play, ChevronRight, Timer } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const AUTOMATION_PRESETS = [
  {
    id: 'kyc-reverify',
    label: 'KYC Re-Verification',
    description: 'Automatically re-verify compliance credentials before they expire',
    icon: Shield,
    color: 'emerald',
    flowPrimitive: 'Scheduled Transactions',
    defaultInterval: 30,
    unit: 'days',
    cadenceSnippet: `import ComplianceAgent from 0x93c691a98b975493

// Scheduled: runs every 30 days
transaction {
  prepare(acct: auth(Storage) &Account) {
    ComplianceAgent.scheduleReverification(
      address: acct.address,
      intervalDays: 30
    )
  }
}`,
  },
  {
    id: 'anomaly-scan',
    label: 'Anomaly Monitoring',
    description: 'Continuous anomaly detection on wallet activity patterns',
    icon: Activity,
    color: 'cyan',
    flowPrimitive: 'Flow Agents',
    defaultInterval: 1,
    unit: 'hours',
    cadenceSnippet: `import ComplianceAgent from 0x93c691a98b975493

// Flow Agent: autonomous monitoring
access(all) fun monitor() {
  ComplianceAgent.runAnomalyScan(
    address: self.account.address,
    thresholds: {
      "rapid_in_out": 3,
      "high_volume_24h": 50,
      "dormancy_spike": 180
    }
  )
}`,
  },
  {
    id: 'rule-sync',
    label: 'Regulatory Rule Sync',
    description: 'Auto-update on-chain rules when regulations change',
    icon: Globe,
    color: 'violet',
    flowPrimitive: 'Flow Actions',
    defaultInterval: 7,
    unit: 'days',
    cadenceSnippet: `import RuleEngine from 0x93c691a98b975493
import ComplianceAction from 0x93c691a98b975493

// Flow Action: batch rule update
transaction(jurisdiction: String, rules: {String: String}) {
  prepare(admin: auth(Storage) &Account) {
    for key in rules.keys {
      RuleEngine.setRule(
        jurisdiction: jurisdiction,
        key: key,
        value: rules[key]!
      )
    }
  }
}`,
  },
  {
    id: 'compliance-batch',
    label: 'Batch Compliance Check',
    description: 'Verify compliance for all active users in the lending pool',
    icon: Zap,
    color: 'amber',
    flowPrimitive: 'Flow Actions',
    defaultInterval: 24,
    unit: 'hours',
    cadenceSnippet: `import ComplianceAction from 0x93c691a98b975493
import DemoLendingPool from 0x93c691a98b975493

// Flow Action: batch verify all pool users
transaction {
  prepare(acct: auth(Storage) &Account) {
    let users = DemoLendingPool.getActiveUsers()
    for user in users {
      let status = ComplianceAction.verify(user)
      if !status {
        ComplianceAgent.flagUser(user, reason: "Failed periodic check")
      }
    }
  }
}`,
  },
]

export default function FlowAutomation({ onAuditEntry }) {
  const [automations, setAutomations] = useState(
    AUTOMATION_PRESETS.map(p => ({
      ...p,
      enabled: false,
      interval: p.defaultInterval,
      lastRun: null,
      nextRun: null,
      runCount: 0,
    }))
  )
  const [expandedId, setExpandedId] = useState(null)
  const [configuring, setConfiguring] = useState(null)

  const toggleAutomation = (id) => {
    setAutomations(prev => prev.map(a => {
      if (a.id !== id) return a
      const nowEnabled = !a.enabled
      if (nowEnabled) {
        onAuditEntry?.('automation', `Enabled ${a.label} — runs every ${a.interval} ${a.unit}`, 'success')
        return {
          ...a,
          enabled: true,
          lastRun: new Date().toLocaleTimeString(),
          nextRun: getNextRun(a.interval, a.unit),
          runCount: a.runCount + 1,
        }
      } else {
        onAuditEntry?.('automation', `Disabled ${a.label}`, 'info')
        return { ...a, enabled: false, nextRun: null }
      }
    }))
  }

  const updateInterval = (id, interval) => {
    setAutomations(prev => prev.map(a =>
      a.id === id ? { ...a, interval: parseInt(interval) || a.defaultInterval } : a
    ))
  }

  const runNow = (id) => {
    setAutomations(prev => prev.map(a => {
      if (a.id !== id) return a
      onAuditEntry?.('automation', `Manual run: ${a.label}`, 'info')
      return {
        ...a,
        lastRun: new Date().toLocaleTimeString(),
        nextRun: a.enabled ? getNextRun(a.interval, a.unit) : null,
        runCount: a.runCount + 1,
      }
    }))
  }

  const getNextRun = (interval, unit) => {
    const now = new Date()
    if (unit === 'hours') now.setHours(now.getHours() + interval)
    else if (unit === 'days') now.setDate(now.getDate() + interval)
    else if (unit === 'minutes') now.setMinutes(now.getMinutes() + interval)
    return now.toLocaleDateString() + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const enabledCount = automations.filter(a => a.enabled).length

  return (
    <div className="space-y-4">
      {/* Persistence warning */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-500/10 bg-amber-500/[0.03]">
        <Timer className="w-3 h-3 text-amber-400/50 shrink-0" />
        <p className="text-[10px] text-amber-400/50">Automation state is local-only and resets on page refresh.</p>
      </div>

      {/* Summary bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-white/30">
            {enabledCount} of {automations.length} active
          </span>
          {enabledCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-medium">
              <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
              Running
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {['Scheduled Transactions', 'Flow Agents', 'Flow Actions'].map(p => (
            <span key={p} className="text-[8px] px-1.5 py-0.5 rounded bg-white/[0.03] text-white/15 font-medium">{p}</span>
          ))}
        </div>
      </div>

      {/* Automation cards */}
      <div className="space-y-2">
        {automations.map((auto) => {
          const Icon = auto.icon
          const isExpanded = expandedId === auto.id
          const colorMap = {
            emerald: { border: 'border-emerald-500/15', bg: 'bg-emerald-500/[0.04]', text: 'text-emerald-400', dot: 'bg-emerald-400' },
            cyan: { border: 'border-cyan-500/15', bg: 'bg-cyan-500/[0.04]', text: 'text-cyan-400', dot: 'bg-cyan-400' },
            violet: { border: 'border-violet-500/15', bg: 'bg-violet-500/[0.04]', text: 'text-violet-400', dot: 'bg-violet-400' },
            amber: { border: 'border-amber-500/15', bg: 'bg-amber-500/[0.04]', text: 'text-amber-400', dot: 'bg-amber-400' },
          }
          const c = colorMap[auto.color] || colorMap.emerald

          return (
            <div key={auto.id} className={`rounded-xl border ${auto.enabled ? c.border : 'border-white/[0.04]'} ${auto.enabled ? c.bg : 'bg-white/[0.01]'} transition-all duration-300`}>
              {/* Header row */}
              <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : auto.id)}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${auto.enabled ? c.bg : 'bg-white/[0.03]'} border ${auto.enabled ? c.border : 'border-white/[0.04]'}`}>
                  <Icon className={`w-4 h-4 ${auto.enabled ? c.text : 'text-white/25'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-[12px] font-medium ${auto.enabled ? 'text-white/80' : 'text-white/50'}`}>{auto.label}</span>
                    <span className="text-[8px] px-1.5 py-0.5 rounded bg-white/[0.04] text-white/20 font-medium">{auto.flowPrimitive}</span>
                  </div>
                  <p className="text-[10px] text-white/25 mt-0.5">{auto.description}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {auto.enabled && (
                    <span className="text-[9px] text-white/20">every {auto.interval}{auto.unit[0]}</span>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleAutomation(auto.id) }}
                    className={`w-10 h-5 rounded-full relative transition-all duration-300 ${auto.enabled ? 'bg-emerald-500/30' : 'bg-white/[0.06]'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full transition-all duration-300 ${auto.enabled ? 'left-5.5 bg-emerald-400' : 'left-0.5 bg-white/20'}`}
                      style={{ left: auto.enabled ? '22px' : '2px' }}
                    />
                  </button>
                  <ChevronRight className={`w-3 h-3 text-white/15 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                </div>
              </div>

              {/* Expanded details */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 border-t border-white/[0.03]">
                      {/* Config row */}
                      <div className="flex items-center gap-4 mt-3 mb-3">
                        <div className="flex items-center gap-2">
                          <Timer className="w-3 h-3 text-white/20" />
                          <span className="text-[10px] text-white/30">Interval:</span>
                          <input
                            type="number"
                            value={auto.interval}
                            onChange={(e) => updateInterval(auto.id, e.target.value)}
                            className="w-14 text-[11px] bg-white/[0.04] border border-white/[0.06] rounded-md px-2 py-1 text-white/60 outline-none text-center"
                            min={1}
                          />
                          <span className="text-[10px] text-white/25">{auto.unit}</span>
                        </div>
                        <button
                          onClick={() => runNow(auto.id)}
                          className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.06] text-white/40 hover:text-white/60 hover:bg-white/[0.06] transition-all"
                        >
                          <Play className="w-3 h-3" />
                          Run Now
                        </button>
                      </div>

                      {/* Status */}
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="p-2 rounded-lg bg-white/[0.02]">
                          <span className="text-[9px] text-white/20 block">Last Run</span>
                          <span className="text-[10px] text-white/50 font-medium">{auto.lastRun || 'Never'}</span>
                        </div>
                        <div className="p-2 rounded-lg bg-white/[0.02]">
                          <span className="text-[9px] text-white/20 block">Next Run</span>
                          <span className="text-[10px] text-white/50 font-medium">{auto.nextRun || '—'}</span>
                        </div>
                        <div className="p-2 rounded-lg bg-white/[0.02]">
                          <span className="text-[9px] text-white/20 block">Total Runs</span>
                          <span className="text-[10px] text-white/50 font-medium">{auto.runCount}</span>
                        </div>
                      </div>

                      {/* Cadence snippet */}
                      <div className="rounded-lg bg-[#0a0f1a] border border-white/[0.04] overflow-hidden">
                        <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/[0.03]">
                          <span className="text-[9px] text-white/15 uppercase tracking-wider font-mono">cadence</span>
                          <span className="text-[9px] text-white/10">{auto.flowPrimitive}</span>
                        </div>
                        <pre className="p-3 overflow-x-auto">
                          <code className="text-[10px] text-emerald-300/60 font-mono leading-relaxed whitespace-pre">{auto.cadenceSnippet}</code>
                        </pre>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>

      <p className="text-[9px] text-white/10 text-center">
        Automations use Flow Scheduled Transactions, Flow Agents, and Flow Actions primitives
      </p>
    </div>
  )
}
