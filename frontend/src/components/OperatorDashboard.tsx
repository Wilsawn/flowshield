import { useState, useEffect } from 'react'
import { ShieldCheck, RefreshCw, AlertTriangle, Clock, Globe, Loader2, Radio, Zap, TrendingDown, Scan, Wallet, Calendar } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import { motion, AnimatePresence } from 'framer-motion'
import { JURISDICTION_LIST } from '@/data/jurisdictions'
import useOperatorData from '@/hooks/useOperatorData'
import RegulatoryRadar from '@/components/RegulatoryRadar'
import FlowAutomation from '@/components/FlowAutomation'
import ComplianceReportExport from '@/components/ComplianceReportExport'
import { API } from '@/lib/api'
import { authFetch } from '@/lib/utils'

const severityColors = {
  success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  danger: 'bg-red-500/10 text-red-400 border-red-500/20',
  info: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
}

const impactColors = {
  high: 'text-red-400 bg-red-500/10',
  medium: 'text-amber-400 bg-amber-500/10',
  low: 'text-white/30 bg-emerald-500/[0.04]',
}

export default function OperatorDashboard() {
  const { toast } = useToast()
  const [walletAddr] = useState(() => {
    try {
      const w = JSON.parse(localStorage.getItem('flowshield_wallet') || '{}')
      return w.addr || null
    } catch { return null }
  })
  const live = useOperatorData(walletAddr)
  const [isRunningCycle, setIsRunningCycle] = useState(false)
  const [cycleResults, setCycleResults] = useState(null)
  const [auditLog, setAuditLog] = useState([])

  const addAuditEntry = (type, detail, severity) => {
    setAuditLog(prev => [{
      type, detail, severity,
      address: live.address || '0x93c6...5493',
      time: new Date().toLocaleTimeString(),
    }, ...prev].slice(0, 10))
  }

  const [demoActive, setDemoActive] = useState(false)

  // Pre-populate audit log when demo is active and log is empty
  useEffect(() => {
    if (auditLog.length > 0) return
    authFetch(`${API}/api/risk/monitor/demo-status`)
      .then(r => r.json())
      .then(data => {
        if (data.active && auditLog.length === 0) {
          const now = new Date().toLocaleTimeString()
          setAuditLog([
            { type: 'system', detail: 'Demo mode active — simulated threats loaded on startup', severity: 'info', address: live.address || '0x93c6...5493', time: now },
            { type: 'monitor', detail: 'Compliance monitoring initialized — watching Flow testnet', severity: 'success', address: live.address || '0x93c6...5493', time: now },
          ])
          setDemoActive(true)
        }
      })
      .catch(() => { /* backend offline — ignore */ })
  }, [])

  const handleSimulateThreat = async () => {
    try {
      const res = await authFetch(`${API}/api/risk/monitor/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      setDemoActive(true)
      addAuditEntry('threat', `${data.injectedCount} anomaly pattern(s) detected — flagged by AI monitor`, 'danger')
      // Refresh panels and run cycle in parallel
      await Promise.all([live.refresh(), autoRunCycle()])
    } catch (err) {
      addAuditEntry('error', `Simulation failed: ${err.message}`, 'danger')
    }
  }

  const handleClearThreat = async () => {
    try {
      await authFetch(`${API}/api/risk/monitor/clear`, { method: 'POST' })
      setDemoActive(false)
      setCycleResults(null)
      addAuditEntry('resolve', 'Threats investigated and cleared by compliance operator', 'success')
      // Refresh panels and run cycle in parallel
      await Promise.all([live.refresh(), autoRunCycle()])
    } catch (err) {
      addAuditEntry('error', `Clear failed: ${err.message}`, 'danger')
    }
  }

  // Shared cycle runner — used by both manual button and auto-refresh
  const runCycleInternal = async (silent = false) => {
    const [monitorRes, riskRes] = await Promise.all([
      authFetch(`${API}/api/risk/monitor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: live.address }),
      }).then(r => r.json()),
      authFetch(`${API}/api/risk/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: live.address }),
      }).then(r => r.json()),
    ])
    const results = {
      riskScore: riskRes.score,
      riskTier: riskRes.tier,
      anomalies: monitorRes.anomalyCount,
      txAnalyzed: monitorRes.activity?.txCount24h || 0,
      largestTx: monitorRes.activity?.largestTx || 0,
      riskFactors: riskRes.factors?.length || 0,
      source: monitorRes.activity?.source || 'unknown',
    }
    setCycleResults(results)
    if (!silent) {
      addAuditEntry('monitor', `Cycle complete: risk=${riskRes.score}, anomalies=${monitorRes.anomalyCount}, factors=${riskRes.factors?.length || 0}`, 'success')
    }
    return results
  }

  // Auto-run cycle (silent — no audit log spam)
  const autoRunCycle = async () => {
    setIsRunningCycle(true)
    try { await runCycleInternal(true) } catch { /* silent */ }
    setIsRunningCycle(false)
  }

  const handleRunCycle = async () => {
    setIsRunningCycle(true)
    setCycleResults(null)
    addAuditEntry('monitor', 'Monitoring cycle initiated by operator', 'info')
    try {
      await runCycleInternal(false)
      live.refresh()
    } catch (err) {
      addAuditEntry('error', `Monitoring cycle failed: ${err.message}`, 'danger')
      setCycleResults({ error: true })
    }
    setIsRunningCycle(false)
  }

  // Called by RegulatoryRadar after approving a gap — auto-refresh everything
  const handleRadarRefresh = async () => {
    await live.refresh()
    await autoRunCycle()
  }


  const actionItems = [
    ...(live.anomalyCount > 0 ? [`${live.anomalyCount} anomal${live.anomalyCount === 1 ? 'y' : 'ies'} detected`] : []),
    ...(live.riskFactors?.length > 0 ? [`${live.riskFactors.length} risk factor${live.riskFactors.length === 1 ? '' : 's'}`] : []),
    ...(!live.hasCredential ? ['No compliance credential'] : []),
  ]

  return (
    <div className="space-y-6">
      {/* ─── Status bar: connection + demo ─── */}
      <div className="flex items-center gap-4">
        {live.isLive && (
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-[11px] text-emerald-400/70 font-medium">Flow Testnet</span>
          </div>
        )}
        {demoActive && (
          <div className="flex items-center gap-1.5 text-[11px] text-amber-400/50">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400/50" />
            <span>Demo mode</span>
          </div>
        )}
        {live.lastUpdated && <span className="text-[10px] text-white/15">{live.lastUpdated.toLocaleTimeString()}</span>}
      </div>

      {/* ─── Stat cards ─── */}
      {live.loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="border border-white/[0.06] bg-white/[0.02] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="h-3 w-24 rounded bg-white/[0.04] animate-pulse" />
                <div className="h-4 w-4 rounded bg-white/[0.04] animate-pulse" />
              </div>
              <div className="h-8 w-20 rounded bg-white/[0.06] animate-pulse mb-2" />
              <div className="h-2.5 w-32 rounded bg-white/[0.03] animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Wallet Balance', value: live.walletData?.balance ?? 0, color: 'text-white/80', sub: live.isLive ? `${live.address?.slice(0,6)}...${live.address?.slice(-4)} · FLOW` : 'Loading...', decimals: 2 },
            { label: 'Risk Score', value: live.riskScore ?? 0, color: live.riskTier === 'compliant' ? 'text-emerald-400' : 'text-amber-400', sub: `Tier: ${live.riskTier || '—'} · ${live.riskFactors?.length || 0} factors` },
            { label: 'Compliance', value: live.hasCredential ? 'Active' : 'Inactive', color: live.hasCredential ? 'text-emerald-400' : 'text-red-400', sub: live.hasCredential ? `${live.credentialTier || 'compliant'} · credential valid` : 'No credential issued', noTicker: true, dot: live.hasCredential ? 'bg-emerald-400' : 'bg-red-400' },
            { label: 'Transactions (24h)', value: live.walletData?.txCount24h ?? 0, color: 'text-white/80', sub: `Account age: ${live.walletData?.accountAgeDays ?? '—'} days` },
          ].map((stat, i) => (
            <div key={i} className="border border-white/[0.06] bg-white/[0.02] rounded-xl p-5">
              <span className="text-[11px] text-white/35 uppercase tracking-wider font-medium mb-4 block">{stat.label}</span>
              <p className={`text-[1.75rem] font-bold tracking-tight ${stat.color} flex items-center gap-2.5`}>
                {stat.dot && <span className={`w-2.5 h-2.5 rounded-full ${stat.dot} shrink-0`} />}
                {stat.noTicker ? stat.value : (stat.decimals ? Number(stat.value).toFixed(stat.decimals) : stat.value)}
              </p>
              <p className="text-[11px] text-white/25 mt-1.5">{stat.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* ─── Action required banner ─── */}
      {!live.loading && actionItems.length > 0 && (
        <div className="flex items-center justify-between p-3.5 rounded-xl border border-amber-500/15 bg-amber-500/[0.03]">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400/70" />
            <span className="text-[12px] text-amber-400/70 font-medium">{actionItems.join(' · ')}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRunCycle}
              disabled={isRunningCycle}
              className="text-[11px] px-3 py-1.5 rounded-lg border border-white/[0.06] text-white/40 hover:text-white/60 hover:border-white/[0.1] transition-all disabled:opacity-40"
            >
              {isRunningCycle ? 'Running...' : 'Run Cycle'}
            </button>
            {demoActive && (
              <button
                onClick={handleClearThreat}
                className="text-[11px] px-3 py-1.5 rounded-lg border border-emerald-500/15 text-emerald-400/60 hover:text-emerald-400 hover:border-emerald-500/25 transition-all"
              >
                Clear Threat
              </button>
            )}
          </div>
        </div>
      )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Wallet Activity — Real from Flow testnet */}
          <div className="border border-white/[0.06] bg-white/[0.02] rounded-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-white/30" />
                <h3 className="text-[15px] font-semibold text-white/90">On-Chain Activity</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] px-2 py-0.5 rounded-md bg-emerald-500/[0.08] text-emerald-300/80 font-medium">ON-CHAIN</span>
                {live.isLive && <span className="text-[9px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-medium">LIVE</span>}
              </div>
            </div>
          <div className="space-y-3.5">
            {[
              { label: 'Transactions (24h)', value: live.walletData?.txCount24h ?? 0, max: 50, color: 'bg-emerald-500' },
              { label: 'Funding Sources', value: live.walletData?.fundingSources ?? 0, max: 10, color: live.walletData?.fundingSources > 3 ? 'bg-amber-500' : 'bg-emerald-500' },
              { label: 'Largest Transaction', value: live.walletData?.largestTx ?? (live.walletData?.balance ? Math.round(live.walletData.balance * 0.002) : 0), max: 500, color: 'bg-emerald-500', suffix: ' FLOW' },
              { label: 'Contracts Deployed', value: live.walletData?.contractCount ?? 0, max: 10, color: 'bg-emerald-500' },
              { label: 'Risk Score', value: live.riskScore ?? 0, max: 100, color: (live.riskScore ?? 0) > 50 ? 'bg-red-500' : (live.riskScore ?? 0) > 25 ? 'bg-amber-500' : 'bg-emerald-500' },
            ].map((item) => (
              <div key={item.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-white/40">{item.label}</span>
                  <span className="font-medium text-white/60">{item.value}{item.suffix || ''}</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${item.color}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((item.value / item.max) * 100, 100)}%` }}
                    transition={{ duration: 0.8, delay: 0.1 }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-white/15 mt-5">
            All data read from Flow testnet. No personal data accessed.
          </p>
        </div>

          {/* Jurisdiction Rules */}
          <div className="border border-white/[0.06] bg-white/[0.02] rounded-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-white/30" />
                <h3 className="text-[15px] font-semibold text-white/90">Active Jurisdiction Rules</h3>
              </div>
              <span className="text-[9px] px-2 py-0.5 rounded-md bg-emerald-500/[0.08] text-emerald-300/80 font-medium">ON-CHAIN</span>
            </div>
          <div className="space-y-3">
            {JURISDICTION_LIST.map((j) => (
              <div key={j.code} className="p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg leading-none">{j.flag}</span>
                  <span className="text-[13px] font-medium text-white/70">{j.name}</span>
                  <span className="text-[10px] text-white/20 ml-auto font-mono">{j.regulator}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                  <div>
                    <span className="text-white/20">Travel Rule</span>
                    <p className="text-white/50 font-medium">{j.travelRuleCurrency} {j.travelRuleThreshold.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-white/20">KYC Level</span>
                    <p className="text-white/50 font-medium capitalize">{j.kycLevel}</p>
                  </div>
                  <div>
                    <span className="text-white/20">Re-verify</span>
                    <p className="text-white/50 font-medium">{j.reVerifyDays} days</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        </div>

      <div className="space-y-4">
      {/* Risk Analysis — Real from Flow testnet */}
      <div className="border border-white/[0.06] bg-white/[0.02] rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-400" />
            <h3 className="text-[15px] font-semibold text-white/90">Risk Analysis</h3>
            {live.isLive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] px-2 py-0.5 rounded-md bg-emerald-500/[0.08] text-emerald-300/80 font-medium">ON-CHAIN</span>
            {live.isLive && <span className="text-[9px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-medium">LIVE</span>}
          </div>
        </div>
        <div className="space-y-2">
          {/* Risk factors from real scoring */}
          {(live.riskFactors?.length > 0) ? live.riskFactors.map((factor, i) => (
            <motion.div
              key={factor.id || i}
              className="flex items-start gap-4 p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/[0.04]"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.1 }}
            >
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 mt-0.5 ${impactColors[factor.points > 20 ? 'high' : factor.points > 10 ? 'medium' : 'low']}`}>
                +{factor.points}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] text-white/60 leading-relaxed">{factor.label}</p>
                <span className="text-[10px] text-white/20">Factor ID: {factor.id}</span>
              </div>
              <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-md shrink-0 ${impactColors[factor.points > 20 ? 'high' : factor.points > 10 ? 'medium' : 'low']}`}>
                {factor.points > 20 ? 'high' : factor.points > 10 ? 'medium' : 'low'}
              </span>
            </motion.div>
          )) : (
            <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] text-center">
              <ShieldCheck className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
              <p className="text-[12px] text-emerald-400 font-medium">No high-risk factors detected</p>
              <p className="text-[10px] text-white/25 mt-1">Overall risk score: {live.riskScore ?? '—'}/100 · Tier: {live.riskTier || '—'}</p>
            </div>
          )}

        </div>
      </div>

      {/* Anomaly Monitor — AI-powered via Claude */}
      <div className="border border-white/[0.06] bg-white/[0.02] rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Scan className="w-4 h-4 text-emerald-400" />
            <h3 className="text-[15px] font-semibold text-white/90">Anomaly Monitor</h3>
            <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium ${live.anomalyCount > 0 ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
              {live.anomalyCount > 0 ? `${live.anomalyCount} detected` : 'All clear'}
            </span>
            {demoActive && live.anomalyCount > 0 && (
              <span className="text-[9px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 font-medium">DEMO</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-violet-400/80 font-semibold uppercase tracking-wider">AI ANALYSIS</span>
            {live.analysisSource && (
              <span className={`text-[9px] px-2 py-0.5 rounded-md font-medium ${live.analysisSource === 'claude-ai' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-500/[0.04] text-white/30'}`}>
                {live.analysisSource === 'claude-ai' ? 'AI AGENT' : 'RULE-BASED'}
              </span>
            )}
            {live.isLive && <span className="text-[9px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-medium">LIVE</span>}
          </div>
        </div>

        {/* AI Summary */}
        {live.monitorSummary && (
          <p className="text-[11px] text-white/30 mb-4 leading-relaxed">{live.monitorSummary}</p>
        )}

        <div className="space-y-2">
          {live.anomalies?.length > 0 ? live.anomalies.map((anomaly, i) => (
            <motion.div
              key={i}
              className={`p-3.5 rounded-xl border ${anomaly.severity === 'high' ? 'border-red-500/20 bg-red-500/[0.04]' : anomaly.severity === 'medium' ? 'border-amber-500/20 bg-amber-500/[0.04]' : 'border-emerald-500/[0.08] bg-white/[0.02]'}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.1 }}
            >
              <div className="flex items-start gap-3">
                <span className={`w-2 h-2 rounded-full block shrink-0 mt-1 ${anomaly.severity === 'high' ? 'bg-red-400' : anomaly.severity === 'medium' ? 'bg-amber-400' : 'bg-white/30'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-medium text-white/70">{anomaly.label || 'Anomaly'}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${anomaly.severity === 'high' ? 'bg-red-500/10 text-red-400' : anomaly.severity === 'medium' ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/[0.04] text-white/30'}`}>{anomaly.severity}</span>
                  </div>
                  <p className="text-[11px] text-white/35 leading-relaxed mt-0.5">{anomaly.detail || `Detected at ${anomaly.timestamp ? new Date(anomaly.timestamp).toLocaleTimeString() : 'now'}`}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[9px] text-white/15">
                      Source: {anomaly.id === 'whale_transfer' ? 'Transfer pattern analysis' : anomaly.id === 'bot' ? 'Transaction frequency monitor' : anomaly.id === 'sleeper' ? 'Activity gap detection' : 'AI Anomaly Monitor'}
                    </span>
                    <a
                      href={`https://testnet.flowscan.io/account/${live.monitorAddress || live.address || ''}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[9px] text-emerald-400/40 hover:text-emerald-400 transition-colors"
                    >
                      <Globe className="w-2.5 h-2.5" />
                      Flowscan
                    </a>
                    <span className="text-[9px] text-white/10">
                      {anomaly.severity === 'high' ? 'Action: Investigate immediately' : anomaly.severity === 'medium' ? 'Action: Monitor closely' : 'Action: No action needed'}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )) : (
            <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04]">
              <div className="flex items-center gap-3 mb-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <p className="text-[12px] text-emerald-400 font-medium">No anomalies detected</p>
                  <p className="text-[11px] text-white/35 mt-0.5">Your monitored address shows no suspicious patterns.</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                {[
                  { label: 'Balance', value: live.walletData?.balance != null ? `${Number(live.walletData.balance).toFixed(2)} FLOW` : '—' },
                  { label: 'Lifetime Txs', value: live.walletData?.sequenceNumber ?? '—' },
                  { label: 'Keys', value: live.walletData?.keyCount ?? '—' },
                  { label: 'Contracts', value: live.walletData?.contractCount ?? '—' },
                ].map((m, i) => (
                  <div key={i}>
                    <span className="text-white/20">{m.label}</span>
                    <p className="text-white/50 font-medium">{m.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
        </div>

      <div className="border border-white/[0.06] bg-white/[0.02] rounded-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h3 className="text-[15px] font-semibold text-white/90">Regulatory Radar</h3>
            <span className="text-[9px] px-2 py-0.5 rounded-md bg-emerald-500/[0.08] text-emerald-300/80 font-medium">ON-CHAIN</span>
            <span className="text-[9px] text-violet-400/80 font-semibold uppercase tracking-wider">AI AGENT</span>
          </div>
          <RegulatoryRadar onAuditEntry={addAuditEntry} onRefresh={handleRadarRefresh} />
        </div>

      {/* Controls + Agent Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border border-white/[0.06] bg-white/[0.02] rounded-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Zap className="w-4 h-4 text-white/30" />
            <h3 className="text-[15px] font-semibold text-white/90">Compliance Controls</h3>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleRunCycle}
              disabled={isRunningCycle}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] text-[12px] font-medium text-white/50 hover:text-white/70 hover:border-white/[0.1] transition-all disabled:opacity-40"
            >
              {isRunningCycle ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              {isRunningCycle ? 'Running Cycle...' : 'Run Monitoring Cycle'}
            </button>
            {!demoActive ? (
              <button
                onClick={handleSimulateThreat}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-500/20 bg-red-500/[0.04] text-[12px] font-medium text-red-400/70 hover:text-red-400 hover:border-red-500/30 transition-all"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Simulate Threat
              </button>
            ) : (
              <button
                onClick={handleClearThreat}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] text-[12px] font-medium text-emerald-400/70 hover:text-emerald-400 hover:border-emerald-500/30 transition-all"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Clear Threat
              </button>
            )}
          </div>
          <AnimatePresence>
            {cycleResults && !cycleResults.error && (
              <motion.div
                className="mt-4 p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04]"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <p className="text-[12px] text-emerald-400 font-medium">Monitoring cycle complete</p>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400/70 ml-auto">{cycleResults.source}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-[11px]">
                  <div><span className="text-white/25">Risk Score</span><p className={`font-medium ${cycleResults.riskTier === 'compliant' ? 'text-emerald-400' : 'text-amber-400'}`}>{cycleResults.riskScore}/100</p></div>
                  <div><span className="text-white/25">Tier</span><p className="text-white/60 font-medium capitalize">{cycleResults.riskTier}</p></div>
                  <div><span className="text-white/25">Anomalies</span><p className={`font-medium ${cycleResults.anomalies > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{cycleResults.anomalies}</p></div>
                  <div><span className="text-white/25">Txs Analyzed</span><p className="text-white/60 font-medium">{cycleResults.txAnalyzed}</p></div>
                  <div><span className="text-white/25">Largest Tx</span><p className="text-white/60 font-medium">{cycleResults.largestTx} FLOW</p></div>
                  <div><span className="text-white/25">Risk Factors</span><p className="text-amber-400 font-medium">{cycleResults.riskFactors}</p></div>
                </div>
              </motion.div>
            )}
            {cycleResults?.error && (
              <motion.div
                className="mt-4 p-3.5 rounded-xl border border-red-500/20 bg-red-500/[0.04]"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <p className="text-[12px] text-red-400 font-medium">Monitoring cycle failed — backend may be offline</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Agent Status */}
        <div className="border border-white/[0.06] bg-white/[0.02] rounded-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Clock className="w-4 h-4 text-white/30" />
            <h3 className="text-[15px] font-semibold text-white/90">Compliance Agent</h3>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Monitoring Status', value: live.isLive ? 'Active' : 'Connecting...', dot: live.isLive ? 'bg-emerald-400' : 'bg-amber-400' },
              { label: 'Risk Level', value: live.monitorRiskLevel === 'none' ? 'Clear' : live.monitorRiskLevel || '—', dot: !live.monitorRiskLevel || live.monitorRiskLevel === 'none' ? 'bg-emerald-400' : live.monitorRiskLevel === 'low' ? 'bg-emerald-400' : 'bg-amber-400' },
              { label: 'Anomalies Detected', value: `${live.anomalyCount}`, dot: live.anomalyCount > 0 ? 'bg-red-400' : 'bg-emerald-400' },
              { label: 'Data Source', value: live.isLive ? 'Flow Testnet' : 'Offline', dot: live.isLive ? 'bg-emerald-400' : 'bg-white/30' },
              { label: 'Refresh', value: demoActive ? 'Auto — updates on each action' : 'Manual — Run Monitoring Cycle', dot: 'bg-emerald-400' },
            ].map((row, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${row.dot}`} />
                  <span className="text-[12px] text-white/35">{row.label}</span>
                </div>
                <span className="text-[12px] text-white/60 font-medium">{row.value}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-white/15 mt-4">
            Powered by Flow Scheduled Transactions and Flow Agents
          </p>
        </div>
      </div>

        {/* Flow Automation — Scheduled Transactions, Flow Agents, Flow Actions */}
        <div className="border border-white/[0.06] bg-white/[0.02] rounded-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <h3 className="text-[15px] font-semibold text-white/90">Flow Automation</h3>
            <span className="text-[9px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-medium">FLOW PRIMITIVES</span>
          </div>
          <FlowAutomation onAuditEntry={addAuditEntry} />
        </div>

      {/* Audit Log — Real-time from operator actions */}
      <div className="border border-white/[0.06] bg-white/[0.02] rounded-xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Clock className="w-4 h-4 text-white/30" />
          <h3 className="text-[15px] font-semibold text-white/90">Audit Log</h3>
          {auditLog.length > 0 && <span className="text-[9px] px-2 py-0.5 rounded-md bg-white/[0.04] text-white/30 font-medium">{auditLog.length} entries</span>}
          <div className="ml-auto">
            <ComplianceReportExport />
          </div>
        </div>
        {auditLog.length > 0 ? (
          <div className="space-y-2">
            {auditLog.map((event, i) => (
              <motion.div
                key={`${event.time}-${i}`}
                className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/[0.02] transition-colors"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <span className={`text-[10px] font-medium px-2.5 py-1 rounded-lg border shrink-0 mt-0.5 capitalize ${severityColors[event.severity] || severityColors.info}`}>
                  {event.type}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-white/50">{event.detail}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-white/20 font-mono">{event.address}</span>
                    <span className="text-[10px] text-white/15">{event.time}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Clock className="w-6 h-6 text-white/10 mx-auto mb-2" />
            <p className="text-[12px] text-white/25">No events yet</p>
            <p className="text-[10px] text-white/15 mt-1">Run a monitoring cycle or simulate a regulatory change to see live events</p>
          </div>
        )}
      </div>
    </div>
  )
}
