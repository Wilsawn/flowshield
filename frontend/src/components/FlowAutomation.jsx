import { useState } from 'react'
import { Zap, Shield, Activity, Globe, Play, ChevronRight, Timer, Loader2, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { API } from '@/lib/api'
import { authFetch } from '@/lib/utils'

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

// Format results from each automation type into a readable summary
function formatResult(id, data) {
  if (!data) return null
  switch (id) {
    case 'kyc-reverify':
      return {
        status: data.hasCredential ? 'pass' : 'fail',
        title: data.hasCredential ? 'Credential Valid' : 'No Credential Found',
        items: [
          { label: 'Has Credential', value: data.hasCredential ? 'Yes' : 'No' },
          { label: 'Valid', value: data.isValid ? 'Yes' : 'Expired' },
          data.tier && { label: 'Tier', value: data.tier },
          data.jurisdiction && { label: 'Jurisdiction', value: data.jurisdiction },
          data.expiresAt && { label: 'Expires', value: new Date(data.expiresAt).toLocaleDateString() },
        ].filter(Boolean),
      }
    case 'anomaly-scan':
      return {
        status: data.anomalyCount > 0 ? 'warning' : 'pass',
        title: data.anomalyCount > 0 ? `${data.anomalyCount} Anomaly Pattern${data.anomalyCount !== 1 ? 's' : ''} Detected` : 'No Anomalies Detected',
        items: [
          { label: 'Anomalies', value: data.anomalyCount ?? 0 },
          { label: 'Severity', value: data.highestSeverity || 'none' },
          data.recommendedAction && { label: 'Action', value: data.recommendedAction },
          data.analysisSource && { label: 'Source', value: data.analysisSource },
          ...(data.anomalies || []).slice(0, 3).map(a => ({
            label: a.severity?.toUpperCase() || 'ALERT',
            value: a.label || a.detail?.slice(0, 60) + '...',
            danger: a.severity === 'high',
          })),
        ].filter(Boolean),
      }
    case 'rule-sync':
      return {
        status: (data.gaps?.length || 0) > 0 ? 'warning' : 'pass',
        title: (data.gaps?.length || 0) > 0 ? `${data.gaps.length} Compliance Gap${data.gaps.length !== 1 ? 's' : ''} Found` : 'All Rules Compliant',
        items: [
          { label: 'Gaps', value: data.gaps?.length ?? 0 },
          data.compliantJurisdictions && { label: 'Compliant', value: data.compliantJurisdictions.join(', ') },
          data.source && { label: 'Source', value: data.source.includes('ai') ? 'AI Agent' : 'Checklist' },
          ...(data.gaps || []).slice(0, 3).map(g => ({
            label: g.jurisdiction,
            value: g.title || g.summary?.slice(0, 60) + '...',
            danger: g.severity === 'high',
          })),
        ].filter(Boolean),
      }
    case 'compliance-batch':
      return {
        status: (data.score ?? 0) <= 30 ? 'pass' : (data.score ?? 0) <= 70 ? 'warning' : 'fail',
        title: `Risk Score: ${data.score ?? '—'}/100 — ${data.tier || 'unknown'}`,
        items: [
          { label: 'Score', value: data.score ?? '—' },
          { label: 'Tier', value: data.tier || '—' },
          { label: 'Factors', value: data.factors?.length ?? 0 },
          data.walletData?.balance != null && { label: 'Balance', value: `${parseFloat(data.walletData.balance).toFixed(2)} FLOW` },
          ...(data.factors || []).slice(0, 3).map(f => ({
            label: `+${f.points}`,
            value: f.label,
            danger: f.points >= 20,
          })),
        ].filter(Boolean),
      }
    default:
      return null
  }
}

export default function FlowAutomation({ onAuditEntry }) {
  const [automations, setAutomations] = useState(
    AUTOMATION_PRESETS.map(p => ({
      ...p,
      enabled: false,
      interval: p.defaultInterval,
      lastRun: null,
      nextRun: null,
      runCount: 0,
      lastResult: null,
    }))
  )
  const [expandedId, setExpandedId] = useState(null)
  const [running, setRunning] = useState(null)

  const runNow = async (id) => {
    setRunning(id)
    onAuditEntry?.('automation', `Running: ${AUTOMATION_PRESETS.find(a => a.id === id)?.label}...`, 'info')

    try {
      const apiCalls = {
        'kyc-reverify': async () => {
          const res = await authFetch(`${API}/api/compliance/status/0x93c691a98b975493`)
          return res.ok ? await res.json() : null
        },
        'anomaly-scan': async () => {
          const res = await authFetch(`${API}/api/risk/monitor`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address: '0x93c691a98b975493' }),
          })
          return res.ok ? await res.json() : null
        },
        'rule-sync': async () => {
          const res = await authFetch(`${API}/api/copilot/radar/scan`, { method: 'POST' })
          return res.ok ? await res.json() : null
        },
        'compliance-batch': async () => {
          const res = await authFetch(`${API}/api/risk/score`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address: '0x93c691a98b975493' }),
          })
          return res.ok ? await res.json() : null
        },
      }

      const result = await apiCalls[id]?.()
      const formatted = formatResult(id, result)

      setAutomations(prev => prev.map(a => {
        if (a.id !== id) return a
        return {
          ...a,
          lastRun: new Date().toLocaleTimeString(),
          nextRun: a.enabled ? getNextRun(a.interval, a.unit) : null,
          runCount: a.runCount + 1,
          lastResult: formatted,
        }
      }))

      if (formatted) {
        const label = AUTOMATION_PRESETS.find(a => a.id === id)?.label
        const severity = formatted.status === 'pass' ? 'success' : formatted.status === 'warning' ? 'warning' : 'danger'
        onAuditEntry?.('automation', `${label}: ${formatted.title}`, severity)
      } else {
        onAuditEntry?.('automation', `${AUTOMATION_PRESETS.find(a => a.id === id)?.label} — no response from backend`, 'warning')
      }
    } catch (err) {
      onAuditEntry?.('automation', `Run failed: ${err.message}`, 'danger')
      setAutomations(prev => prev.map(a =>
        a.id === id ? { ...a, lastResult: { status: 'fail', title: `Error: ${err.message}`, items: [] } } : a
      ))
    }
    setRunning(null)
  }

  const toggleAutomation = (id) => {
    setAutomations(prev => prev.map(a => {
      if (a.id !== id) return a
      const nowEnabled = !a.enabled
      if (nowEnabled) {
        onAuditEntry?.('automation', `Enabled ${a.label} — runs every ${a.interval} ${a.unit}`, 'success')
        runNow(id)
        return { ...a, enabled: true, nextRun: getNextRun(a.interval, a.unit) }
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

  const getNextRun = (interval, unit) => {
    const now = new Date()
    if (unit === 'hours') now.setHours(now.getHours() + interval)
    else if (unit === 'days') now.setDate(now.getDate() + interval)
    else if (unit === 'minutes') now.setMinutes(now.getMinutes() + interval)
    return now.toLocaleDateString() + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const enabledCount = automations.filter(a => a.enabled).length

  const statusIcon = (status) => {
    if (status === 'pass') return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
    if (status === 'warning') return <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
    return <XCircle className="w-3.5 h-3.5 text-red-400" />
  }

  const statusBorder = (status) => {
    if (status === 'pass') return 'border-emerald-500/20 bg-emerald-500/[0.03]'
    if (status === 'warning') return 'border-amber-500/20 bg-amber-500/[0.03]'
    return 'border-red-500/20 bg-red-500/[0.03]'
  }

  return (
    <div className="space-y-4">
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
                    {auto.lastResult && (
                      <span className="ml-auto mr-1">{statusIcon(auto.lastResult.status)}</span>
                    )}
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
                          disabled={running === auto.id}
                          className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.06] text-white/40 hover:text-white/60 hover:bg-white/[0.06] transition-all disabled:opacity-50"
                        >
                          {running === auto.id ? (
                            <><Loader2 className="w-3 h-3 animate-spin" /> Running...</>
                          ) : (
                            <><Play className="w-3 h-3" /> Run Now</>
                          )}
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

                      {/* Last Result */}
                      <AnimatePresence>
                        {auto.lastResult && (
                          <motion.div
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className={`rounded-lg border p-3 mb-3 ${statusBorder(auto.lastResult.status)}`}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              {statusIcon(auto.lastResult.status)}
                              <span className="text-[11px] font-semibold text-white/70">{auto.lastResult.title}</span>
                            </div>
                            <div className="space-y-1.5">
                              {auto.lastResult.items.map((item, j) => (
                                <div key={j} className="flex items-start justify-between gap-2">
                                  <span className={`text-[9px] font-medium shrink-0 ${item.danger ? 'text-red-400/70' : 'text-white/25'}`}>{item.label}</span>
                                  <span className={`text-[10px] text-right ${item.danger ? 'text-red-400/80' : 'text-white/50'}`}>{String(item.value)}</span>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Running indicator */}
                      <AnimatePresence>
                        {running === auto.id && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="rounded-lg border border-cyan-500/15 bg-cyan-500/[0.03] p-3 mb-3"
                          >
                            <div className="flex items-center gap-2">
                              <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                              <span className="text-[11px] text-cyan-400/70">Querying Flow testnet and running analysis...</span>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

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
