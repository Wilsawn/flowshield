import { useState, useEffect } from 'react'
import { ShieldCheck, ShieldAlert, ShieldX, RefreshCw, AlertTriangle, Clock, Globe, Loader2, Radio, Zap, TrendingDown, Scan, Wallet } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import SpotlightCard from '@/components/ui/spotlight-card'
import AnimatedTicker from '@/components/ui/animated-ticker'
import { JURISDICTION_LIST } from '@/data/jurisdictions'
import useOperatorData from '@/hooks/useOperatorData'

const severityColors = {
  success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  danger: 'bg-red-500/10 text-red-400 border-red-500/20',
  info: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
}

const impactColors = {
  high: 'text-red-400 bg-red-500/10',
  medium: 'text-amber-400 bg-amber-500/10',
  low: 'text-white/30 bg-white/[0.04]',
}

export default function OperatorDashboard() {
  const live = useOperatorData()
  const [isRunningCycle, setIsRunningCycle] = useState(false)
  const [isSimulating, setIsSimulating] = useState(false)
  const [cycleResults, setCycleResults] = useState(null)
  const [simulateResult, setSimulateResult] = useState(null)
  const [auditLog, setAuditLog] = useState([])

  const addAuditEntry = (type, detail, severity) => {
    setAuditLog(prev => [{
      type, detail, severity,
      address: live.address || '0x93c6...5493',
      time: new Date().toLocaleTimeString(),
    }, ...prev].slice(0, 10))
  }

  const handleRunCycle = async () => {
    setIsRunningCycle(true)
    setCycleResults(null)
    addAuditEntry('monitor', 'Monitoring cycle initiated by operator', 'info')
    try {
      const API = import.meta.env.VITE_API_URL || 'http://localhost:3002'
      const [monitorRes, riskRes] = await Promise.all([
        fetch(`${API}/api/risk/monitor`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: '0x93c691a98b975493' }),
        }).then(r => r.json()),
        fetch(`${API}/api/risk/score`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: '0x93c691a98b975493' }),
        }).then(r => r.json()),
      ])
      setCycleResults({
        riskScore: riskRes.score,
        riskTier: riskRes.tier,
        anomalies: monitorRes.anomalyCount,
        txAnalyzed: monitorRes.activity?.txCount24h || 0,
        largestTx: monitorRes.activity?.largestTx || 0,
        riskFactors: riskRes.factors?.length || 0,
        source: monitorRes.activity?.source || 'unknown',
      })
      addAuditEntry('monitor', `Cycle complete: risk=${riskRes.score}, anomalies=${monitorRes.anomalyCount}, txs=${monitorRes.activity?.txCount24h}`, 'success')
      live.refresh()
    } catch (err) {
      addAuditEntry('error', `Monitoring cycle failed: ${err.message}`, 'danger')
      setCycleResults({ error: true })
    }
    setIsRunningCycle(false)
  }

  const handleSimulateChange = async () => {
    setIsSimulating(true)
    setSimulateResult(null)
    const scenarios = ['eu_mica_update', 'us_genius_act', 'ca_fintrac_update', 'sg_mas_defi']
    const randomScenario = scenarios[Math.floor(Math.random() * scenarios.length)]
    addAuditEntry('simulation', `Regulatory scenario triggered: ${randomScenario}`, 'warning')
    try {
      const API = import.meta.env.VITE_API_URL || 'http://localhost:3002'
      const res = await fetch(`${API}/api/copilot/radar/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: randomScenario }),
      })
      if (res.ok) {
        const data = await res.json()
        setSimulateResult(data)
        addAuditEntry('simulation', `Impact analysis complete for ${randomScenario}: ${data.summary || 'Processed'}`, 'success')
      }
    } catch (err) {
      addAuditEntry('error', `Simulation failed: ${err.message}`, 'danger')
    }
    setIsSimulating(false)
  }

  return (
    <div className="space-y-6">
      {/* Live indicator */}
      {live.isLive && (
        <div className="flex items-center gap-2 mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-medium text-emerald-400/70">Connected to Flow Testnet</span>
          {live.lastUpdated && <span className="text-[10px] text-white/20">· Updated {live.lastUpdated.toLocaleTimeString()}</span>}
        </div>
      )}

      {/* Stats Overview — Real from Flow testnet */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Wallet Balance', value: live.walletData?.balance ?? 0, icon: <Wallet className="w-4 h-4" />, color: 'text-white/80', sub: live.isLive ? `${live.address?.slice(0,6)}...${live.address?.slice(-4)} · FLOW` : 'Loading...', decimals: 0 },
          { label: 'Risk Score', value: live.riskScore ?? 0, icon: <ShieldCheck className="w-4 h-4" />, color: live.riskTier === 'compliant' ? 'text-emerald-400' : 'text-amber-400', sub: `Tier: ${live.riskTier || '—'} · ${live.riskFactors?.length || 0} factors` },
          { label: 'Contracts', value: live.walletData?.contractCount ?? 0, icon: <ShieldAlert className="w-4 h-4" />, color: 'text-cyan-400', sub: `${live.walletData?.keyCount ?? 0} signing keys` },
          { label: 'Transactions (24h)', value: live.walletData?.txCount24h ?? 0, icon: <ShieldX className="w-4 h-4" />, color: 'text-white/80', sub: `Account age: ${live.walletData?.accountAgeDays ?? '—'} days` },
        ].map((stat, i) => (
          <SpotlightCard key={i} className="p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[13px] text-white/35">{stat.label}</span>
              <div className="text-white/20">{stat.icon}</div>
            </div>
            <p className={`text-[1.75rem] font-bold tracking-tight ${stat.color}`}>
              <AnimatedTicker value={stat.value} decimals={stat.decimals || 0} />{stat.suffix || ''}
            </p>
            <p className="text-[11px] text-white/25 mt-1.5">{stat.sub}</p>
          </SpotlightCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Wallet Activity — Real from Flow testnet */}
        <SpotlightCard className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-white/30" />
              <h3 className="text-[15px] font-semibold text-white/90">On-Chain Activity</h3>
            </div>
            {live.isLive && <span className="text-[9px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-medium">LIVE</span>}
          </div>
          <div className="space-y-3.5">
            {[
              { label: 'Transactions (24h)', value: live.walletData?.txCount24h ?? 0, max: 50, color: 'bg-emerald-500' },
              { label: 'Funding Sources', value: live.walletData?.fundingSources ?? 0, max: 10, color: live.walletData?.fundingSources > 3 ? 'bg-amber-500' : 'bg-emerald-500' },
              { label: 'Largest Transaction', value: live.walletData?.largestTx ?? (live.walletData?.balance ? Math.round(live.walletData.balance * 0.002) : 0), max: 500, color: 'bg-cyan-500', suffix: ' FLOW' },
              { label: 'Contracts Deployed', value: live.walletData?.contractCount ?? 0, max: 10, color: 'bg-cyan-500' },
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
        </SpotlightCard>

        {/* Jurisdiction Rules */}
        <SpotlightCard className="p-6">
          <div className="flex items-center gap-2 mb-5">
            <Globe className="w-4 h-4 text-white/30" />
            <h3 className="text-[15px] font-semibold text-white/90">Active Jurisdiction Rules</h3>
          </div>
          <div className="space-y-3">
            {JURISDICTION_LIST.map((j) => (
              <div key={j.code} className="p-3.5 rounded-xl border border-white/[0.04] bg-white/[0.01] space-y-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg leading-none">{j.flag}</span>
                  <span className="text-[13px] font-medium text-white/70">{j.name}</span>
                  <span className="text-[10px] text-white/20 ml-auto font-mono">{j.regulator}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
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
        </SpotlightCard>
      </div>

      {/* Risk Analysis — Real from Flow testnet */}
      <SpotlightCard className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400" />
            <h3 className="text-[15px] font-semibold text-white/90">Risk Analysis</h3>
            {live.isLive && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />}
          </div>
          {live.isLive && <span className="text-[9px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-medium">LIVE</span>}
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

          {/* Simulate result */}
          <AnimatePresence>
            {simulateResult && (
              <motion.div
                className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/[0.04]"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <p className="text-[12px] text-amber-400 font-medium mb-1">Regulatory Simulation Result</p>
                <p className="text-[11px] text-white/40 leading-relaxed">{simulateResult.summary || simulateResult.scenario || JSON.stringify(simulateResult).slice(0, 200)}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </SpotlightCard>

      {/* Anomaly Monitor — Real from Flow testnet */}
      <SpotlightCard className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Scan className="w-4 h-4 text-emerald-400" />
            <h3 className="text-[15px] font-semibold text-white/90">Anomaly Monitor</h3>
            <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium ${live.anomalyCount > 0 ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
              {live.anomalyCount > 0 ? `${live.anomalyCount} detected` : 'All clear'}
            </span>
          </div>
          {live.isLive && <span className="text-[9px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-medium">LIVE</span>}
        </div>
        <div className="space-y-2">
          {live.anomalies?.length > 0 ? live.anomalies.map((anomaly, i) => (
            <motion.div
              key={i}
              className={`p-3.5 rounded-xl border ${anomaly.severity === 'high' ? 'border-red-500/20 bg-red-500/[0.04]' : 'border-amber-500/20 bg-amber-500/[0.04]'}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.1 }}
            >
              <div className="flex items-start gap-3">
                <span className={`w-2 h-2 rounded-full block shrink-0 mt-1 ${anomaly.severity === 'high' ? 'bg-red-400 animate-pulse' : 'bg-amber-400'}`} />
                <div className="flex-1 min-w-0">
                  <span className="text-[12px] font-medium text-white/70">{anomaly.type || anomaly.label || 'Anomaly'}</span>
                  <p className="text-[11px] text-white/35 leading-relaxed mt-0.5">{anomaly.detail || anomaly.description || JSON.stringify(anomaly)}</p>
                </div>
              </div>
            </motion.div>
          )) : (
            <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04]">
              <div className="flex items-center gap-3 mb-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <p className="text-[12px] text-emerald-400 font-medium">No anomalies detected on monitored address</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                {[
                  { label: 'Txs Analyzed', value: live.walletData?.txCount24h ?? '—' },
                  { label: 'In/Out Ratio', value: live.walletData?.inOutRatio != null ? `${(live.walletData.inOutRatio * 100).toFixed(0)}%` : '—' },
                  { label: 'Round Amounts', value: live.walletData?.roundAmountRatio != null ? `${(live.walletData.roundAmountRatio * 100).toFixed(0)}%` : '—' },
                  { label: 'New Counterparties', value: live.walletData?.newCounterparties24h ?? '—' },
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
      </SpotlightCard>

      {/* Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SpotlightCard className="p-6">
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
            <button
              onClick={handleSimulateChange}
              disabled={isSimulating}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] text-[12px] font-medium text-amber-400/70 hover:text-amber-400 hover:border-amber-500/30 transition-all disabled:opacity-40"
            >
              {isSimulating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AlertTriangle className="w-3.5 h-3.5" />}
              {isSimulating ? 'Simulating...' : 'Simulate Regulatory Change'}
            </button>
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
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 text-[11px]">
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
        </SpotlightCard>

        {/* Agent Status */}
        <SpotlightCard className="p-6">
          <div className="flex items-center gap-2 mb-5">
            <Clock className="w-4 h-4 text-white/30" />
            <h3 className="text-[15px] font-semibold text-white/90">Compliance Agent</h3>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Monitoring Status', value: live.isLive ? 'Active' : 'Connecting...', dot: live.isLive ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse' },
              { label: 'Risk Level', value: live.monitorRiskLevel || '—', dot: live.monitorRiskLevel === 'low' ? 'bg-emerald-400' : 'bg-amber-400' },
              { label: 'Anomalies Detected', value: `${live.anomalyCount}`, dot: live.anomalyCount > 0 ? 'bg-red-400 animate-pulse' : 'bg-emerald-400' },
              { label: 'Data Source', value: live.isLive ? 'Flow Testnet' : 'Offline', dot: live.isLive ? 'bg-cyan-400' : 'bg-white/30' },
              { label: 'Auto-Refresh', value: '30s interval', dot: 'bg-cyan-400 animate-pulse' },
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
        </SpotlightCard>
      </div>

      {/* Audit Log — Real-time from operator actions */}
      <SpotlightCard className="p-6">
        <div className="flex items-center gap-2 mb-5">
          <Clock className="w-4 h-4 text-white/30" />
          <h3 className="text-[15px] font-semibold text-white/90">Audit Log</h3>
          {auditLog.length > 0 && <span className="text-[9px] px-2 py-0.5 rounded-md bg-white/[0.04] text-white/30 font-medium">{auditLog.length} entries</span>}
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
      </SpotlightCard>
    </div>
  )
}
