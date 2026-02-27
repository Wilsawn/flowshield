import { useState } from 'react'
import { AlertTriangle, FileSearch, CheckCircle2, ArrowUpCircle, Loader2, X, ExternalLink, ChevronRight, ShieldCheck, ArrowRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const STEPS = [
  { id: 'scan', label: 'AI Scans On-Chain', icon: FileSearch, description: 'Reads current RuleEngine rules from Flow blockchain' },
  { id: 'analyze', label: 'AI Finds Gaps', icon: AlertTriangle, description: 'Claude compares on-chain rules against real regulations' },
  { id: 'review', label: 'Human Reviews', icon: CheckCircle2, description: 'Operator reviews proposed changes before they go on-chain' },
  { id: 'push', label: 'Push On-Chain', icon: ArrowUpCircle, description: 'Approved rules are sent to RuleEngine via setRule' },
]

const RULE_LABELS = {
  travel_rule_threshold: 'Travel Rule Threshold',
  travel_rule_currency: 'Currency',
  reverification_days: 'Re-verification Period',
  kyc_required: 'KYC Required',
  sanctions_screening: 'Sanctions List',
  max_anonymous_tx: 'Max Anonymous Tx',
}

export default function RegulatoryRadar({ onAuditEntry, onRefresh }) {
  const [currentStep, setCurrentStep] = useState(null) // null = idle
  const [scanResult, setScanResult] = useState(null) // full scan result from Claude
  const [selectedGap, setSelectedGap] = useState(null) // which gap the user is fixing
  const [isLoading, setIsLoading] = useState(false)
  const [pushResult, setPushResult] = useState(null)
  const [editedRules, setEditedRules] = useState({})

  const API = import.meta.env.VITE_API_URL || 'http://localhost:3002'

  // Step 1: AI scans on-chain rules and compares against real regulations
  const handleScan = async () => {
    setCurrentStep('scan')
    setScanResult(null)
    setSelectedGap(null)
    setPushResult(null)
    setEditedRules({})
    setIsLoading(true)
    onAuditEntry?.('radar', 'Regulatory Radar reading on-chain rules...', 'info')

    try {
      const res = await fetch(`${API}/api/copilot/radar/scan`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setScanResult(data)

        if (data.gaps?.length > 0) {
          onAuditEntry?.('radar', `${data.gaps.length} compliance gap(s) found across jurisdictions`, 'warning')
          setCurrentStep('analyze')
        } else {
          onAuditEntry?.('radar', 'All jurisdictions compliant — no gaps detected', 'success')
          setCurrentStep('allclear')
        }
      } else {
        onAuditEntry?.('error', 'Radar scan failed', 'danger')
        setCurrentStep(null)
      }
    } catch (err) {
      onAuditEntry?.('error', `Radar scan failed: ${err.message}`, 'danger')
      setCurrentStep(null)
    }
    setIsLoading(false)
  }

  // Select a gap to fix
  const handleSelectGap = (gap) => {
    setSelectedGap(gap)
    setEditedRules({ ...gap.requiredRules })
    setCurrentStep('review')
  }

  // Step 3: Human approves and pushes on-chain
  const handleApprove = async () => {
    setCurrentStep('push')
    setIsLoading(true)
    onAuditEntry?.('radar', `Operator approved rule update for ${selectedGap.jurisdiction}`, 'success')

    try {
      const res = await fetch(`${API}/api/copilot/radar/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jurisdiction: selectedGap.jurisdiction,
          rules: editedRules,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setPushResult(data)
        onAuditEntry?.('radar', `Rules pushed on-chain: ${data.txHash.slice(0, 16)}... (${data.rulesApplied.length} rules)`, 'success')
        // Update scan result to reflect resolved gap — remove it from the local gaps list
        if (data.demoState || data.simulated) {
          setScanResult(prev => {
            if (!prev) return prev
            const approvedKeys = Object.keys(editedRules)
            const updatedGaps = (prev.gaps || []).filter(g => {
              if (g.jurisdiction !== selectedGap.jurisdiction) return true
              // Match by ruleKey if present, or by jurisdiction+requiredRules overlap
              if (g.ruleKey && approvedKeys.includes(g.ruleKey)) return false
              if (g.requiredRules && approvedKeys.some(k => k in g.requiredRules)) return false
              return true
            })
            const remaining = data.demoState?.remainingGaps ?? updatedGaps.length
            return {
              ...prev,
              gaps: updatedGaps,
              compliantJurisdictions: remaining === 0
                ? ['US', 'EU', 'UK', 'SG', 'CA']
                : prev.compliantJurisdictions,
            }
          })
        }
      }
    } catch (err) {
      onAuditEntry?.('error', `On-chain push failed: ${err.message}`, 'danger')
    }
    setIsLoading(false)
    // Auto-refresh all dashboard panels (Risk Analysis, Compliance Controls, Compliance Agent)
    onRefresh?.()
  }

  const handleApproveAll = async () => {
    setCurrentStep('push')
    setIsLoading(true)
    onAuditEntry?.('radar', 'Operator applying all remaining rule fixes...', 'success')

    try {
      const res = await fetch(`${API}/api/copilot/radar/approve-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (res.ok) {
        const data = await res.json()
        setPushResult({
          ...data,
          txHash: data.rulesApplied?.[data.rulesApplied.length - 1]?.txId || 'batch-apply',
          blockHeight: null,
          explorerUrl: null,
        })
        setScanResult(prev => prev ? { ...prev, gaps: [], compliantJurisdictions: ['US', 'EU', 'UK', 'SG', 'CA'] } : prev)
        onAuditEntry?.('radar', `All ${data.resolvedGaps} gap(s) resolved — ${data.resolvedThreats} anomaly(s) cleared`, 'success')
      }
    } catch (err) {
      onAuditEntry?.('error', `Batch apply failed: ${err.message}`, 'danger')
    }
    setIsLoading(false)
    // Auto-refresh all dashboard panels
    onRefresh?.()
  }

  const handleReject = () => {
    onAuditEntry?.('radar', `Operator rejected rule update for ${selectedGap.jurisdiction}`, 'warning')
    setSelectedGap(null)
    setCurrentStep('analyze')
  }

  const handleReset = () => {
    setCurrentStep(null)
    setScanResult(null)
    setSelectedGap(null)
    setPushResult(null)
    setEditedRules({})
  }

  const severityBadge = (severity) => {
    const colors = {
      high: 'bg-red-500/10 text-red-400 border-red-500/20',
      medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      low: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    }
    return colors[severity] || colors.medium
  }

  return (
    <div className="space-y-5">
      {/* Step Progress Bar */}
      <div className="flex items-center gap-1">
        {STEPS.map((step, i) => {
          const StepIcon = step.icon
          const stepIndex = STEPS.findIndex(s => s.id === currentStep)
          const isActive = currentStep === step.id
          const isPast = currentStep && stepIndex > i
          const isAllClear = currentStep === 'allclear'

          return (
            <div key={step.id} className="flex items-center flex-1">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl flex-1 transition-all duration-300 ${
                isAllClear ? 'bg-emerald-500/[0.03] border border-emerald-500/10' :
                isActive ? 'bg-emerald-500/10 border border-emerald-500/20' :
                isPast ? 'bg-white/[0.03] border border-emerald-500/10' :
                'bg-white/[0.01] border border-white/[0.04]'
              }`}>
                <StepIcon className={`w-3.5 h-3.5 shrink-0 ${
                  isAllClear ? 'text-emerald-400/50' :
                  isActive ? 'text-emerald-400' :
                  isPast ? 'text-emerald-400/50' :
                  'text-white/15'
                }`} />
                <div className="min-w-0">
                  <p className={`text-[10px] font-medium truncate ${
                    isAllClear ? 'text-emerald-400/50' :
                    isActive ? 'text-emerald-400' :
                    isPast ? 'text-white/40' :
                    'text-white/20'
                  }`}>{step.label}</p>
                </div>
              </div>
              {i < STEPS.length - 1 && (
                <ChevronRight className={`w-3 h-3 shrink-0 mx-0.5 ${isPast || isAllClear ? 'text-emerald-400/30' : 'text-white/10'}`} />
              )}
            </div>
          )
        })}
      </div>

      {/* Idle State — Start Button */}
      {!currentStep && (
        <motion.div
          className="text-center py-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <FileSearch className="w-8 h-8 text-white/10 mx-auto mb-3" />
          <p className="text-[13px] text-white/40 mb-1">Regulatory Radar</p>
          <p className="text-[11px] text-white/20 mb-5 max-w-md mx-auto">
            AI reads your on-chain RuleEngine rules and compares them against real-world regulations 
            (MiCA, FinCEN, FCA, MAS, FINTRAC) to find compliance gaps.
          </p>
          <button
            onClick={handleScan}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] text-[12px] font-medium text-amber-400/80 hover:text-amber-400 hover:border-amber-500/30 hover:bg-amber-500/[0.1] transition-all"
          >
            <FileSearch className="w-3.5 h-3.5" />
            Scan On-Chain Rules
          </button>
        </motion.div>
      )}

      {/* Scanning State */}
      <AnimatePresence>
        {currentStep === 'scan' && (
          <motion.div
            className="p-5 rounded-xl border border-amber-500/20 bg-amber-500/[0.03]"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
              <div>
                <p className="text-[13px] text-amber-400 font-medium">Scanning on-chain rules...</p>
                <p className="text-[11px] text-white/25 mt-0.5">
                  Reading RuleEngine state for US, EU, UK, SG, CA — then analyzing with Claude AI
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* All Clear State */}
      <AnimatePresence>
        {currentStep === 'allclear' && scanResult && (
          <motion.div
            className="p-5 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04]"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <div className="flex items-center gap-3 mb-3">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
              <div>
                <p className="text-[14px] text-emerald-400 font-semibold">All Rules Up to Date</p>
                <p className="text-[11px] text-white/30 mt-0.5">{scanResult.overallAssessment}</p>
              </div>
            </div>
            {scanResult.compliantJurisdictions?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3 mb-4">
                {scanResult.compliantJurisdictions.map(j => (
                  <span key={j} className="text-[10px] px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 font-medium border border-emerald-500/15">{j}</span>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between mt-3">
              {scanResult.source && (
                <span className={`text-[9px] px-2 py-0.5 rounded-md font-medium ${scanResult.source?.includes('ai') ? 'bg-violet-500/10 text-violet-400' : 'bg-white/[0.04] text-white/30'}`}>
                  {scanResult.source?.includes('ai') ? 'AI AGENT' : 'CHECKLIST'}
                </span>
              )}
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/[0.06] bg-white/[0.02] text-[12px] font-medium text-white/40 hover:text-white/60 transition-all"
              >
                Scan Again
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step 2: Gaps Found — pick one to fix */}
      <AnimatePresence>
        {currentStep === 'analyze' && scanResult && (
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <p className="text-[13px] text-amber-400 font-semibold">{scanResult.gaps.length} Compliance Gap{scanResult.gaps.length !== 1 ? 's' : ''} Found</p>
                {scanResult.source && (
                  <span className={`text-[9px] px-2 py-0.5 rounded-md font-medium ${scanResult.source?.includes('ai') ? 'bg-violet-500/10 text-violet-400' : 'bg-white/[0.04] text-white/30'}`}>
                    {scanResult.source?.includes('ai') ? 'AI AGENT' : 'CHECKLIST'}
                  </span>
                )}
              </div>
              {scanResult.gaps.length > 1 && (
                <button
                  onClick={handleApproveAll}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] text-[10px] font-medium text-emerald-400/80 hover:text-emerald-400 hover:border-emerald-500/30 transition-all"
                >
                  <ShieldCheck className="w-3 h-3" />
                  Apply All Fixes
                </button>
              )}
            </div>
            <p className="text-[11px] text-white/25 -mt-2">{scanResult.overallAssessment}</p>

            {scanResult.gaps.map((gap, i) => (
              <motion.div
                key={i}
                className="p-4 rounded-xl border border-amber-500/15 bg-amber-500/[0.02] cursor-pointer hover:border-amber-500/30 hover:bg-amber-500/[0.04] transition-all"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => handleSelectGap(gap)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.06] text-white/50 font-bold">{gap.jurisdiction}</span>
                      <span className={`text-[9px] px-2 py-0.5 rounded-md border font-medium uppercase tracking-wider ${severityBadge(gap.severity)}`}>
                        {gap.severity}
                      </span>
                    </div>
                    <p className="text-[12px] text-white/60 font-medium">{gap.title}</p>
                    <p className="text-[11px] text-white/30 leading-relaxed mt-1">{gap.summary}</p>
                    {gap.regulatoryBasis && (
                      <p className="text-[10px] text-white/15 mt-1.5 italic">Based on: {gap.regulatoryBasis}</p>
                    )}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {Object.entries(gap.requiredRules || {}).map(([key, value]) => (
                        <span key={key} className="text-[9px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400/70 font-mono">
                          {key}: {value}
                        </span>
                      ))}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-white/15 shrink-0 mt-1" />
                </div>
              </motion.div>
            ))}

            {scanResult.compliantJurisdictions?.length > 0 && (
              <div className="p-3 rounded-xl border border-emerald-500/10 bg-emerald-500/[0.02]">
                <p className="text-[10px] text-emerald-400/60 font-medium">
                  Compliant: {scanResult.compliantJurisdictions.join(', ')}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step 3: Human Review */}
      <AnimatePresence>
        {currentStep === 'review' && selectedGap && (
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            {/* Gap Detail */}
            <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/[0.03]">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.06] text-white/50 font-bold">{selectedGap.jurisdiction}</span>
                <span className={`text-[9px] px-2 py-0.5 rounded-md border font-medium uppercase tracking-wider ${severityBadge(selectedGap.severity)}`}>
                  {selectedGap.severity}
                </span>
              </div>
              <p className="text-[13px] text-amber-400 font-semibold">{selectedGap.title}</p>
              <p className="text-[11px] text-white/35 leading-relaxed mt-1">{selectedGap.summary}</p>
              {selectedGap.regulatoryBasis && (
                <p className="text-[10px] text-white/20 mt-2 italic">Regulatory basis: {selectedGap.regulatoryBasis}</p>
              )}
            </div>

            {/* Proposed Rule Updates */}
            <div className="p-4 rounded-xl border border-cyan-500/20 bg-cyan-500/[0.02]">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                <p className="text-[13px] text-cyan-400 font-semibold">Proposed Rule Updates — {selectedGap.jurisdiction}</p>
              </div>

              <div className="space-y-3">
                {Object.entries(editedRules).map(([key, value]) => {
                  const currentValue = selectedGap.currentOnChain?.[key]
                  return (
                    <div key={key} className="flex items-center justify-between p-3 rounded-lg border border-white/[0.04] bg-white/[0.01]">
                      <div className="flex-1">
                        <p className="text-[11px] text-white/30 font-medium">{RULE_LABELS[key] || key}</p>
                        <p className="text-[10px] text-white/15 font-mono mt-0.5">{key}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-[10px] text-white/20">Current</p>
                          <p className="text-[11px] text-white/30 font-mono">{currentValue || '—'}</p>
                        </div>
                        <ArrowRight className="w-3 h-3 text-amber-400/50" />
                        <div className="text-right">
                          <p className="text-[10px] text-amber-400/60">New</p>
                          <input
                            type="text"
                            value={editedRules[key]}
                            onChange={(e) => setEditedRules(prev => ({ ...prev, [key]: e.target.value }))}
                            className="text-[11px] text-amber-400 font-mono font-bold bg-transparent border-b border-amber-500/20 outline-none text-right w-24 py-0.5 focus:border-amber-500/50 transition-colors"
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <p className="text-[10px] text-white/15 mt-3 italic">
                You can edit the values before approving. These will be sent to RuleEngine.setRule() on-chain.
              </p>
            </div>

            {/* Cadence Transaction Preview */}
            <div className="p-4 rounded-xl border border-white/[0.04] bg-black/30">
              <p className="text-[10px] text-white/20 uppercase tracking-wider mb-2 font-medium">Transaction Preview</p>
              <pre className="text-[11px] text-emerald-300/70 font-mono leading-relaxed overflow-x-auto">
{`import RuleEngine from 0x93c691a98b975493

// ${Object.keys(editedRules).length} rule(s) for ${selectedGap.jurisdiction}
${Object.entries(editedRules).map(([key, value]) => `// RuleEngine.setRule("${selectedGap.jurisdiction}", "${key}", "${value}")`).join('\n')}`}
              </pre>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between">
              <button
                onClick={handleReject}
                className="text-[11px] text-white/30 hover:text-white/50 transition-colors"
              >
                ← Back to gaps
              </button>
              <div className="flex gap-3">
                <button
                  onClick={handleReject}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-red-500/20 bg-red-500/[0.04] text-[12px] font-medium text-red-400/70 hover:text-red-400 hover:border-red-500/30 transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                  Skip
                </button>
                <button
                  onClick={handleApprove}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.08] text-[12px] font-semibold text-emerald-400 hover:bg-emerald-500/[0.15] hover:border-emerald-500/40 transition-all"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Approve & Push On-Chain
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step 4: Pushing / Pushed */}
      <AnimatePresence>
        {currentStep === 'push' && (
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            {isLoading && !pushResult && (
              <div className="p-5 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03]">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                  <div>
                    <p className="text-[13px] text-emerald-400 font-medium">Sending transaction to Flow testnet...</p>
                    <p className="text-[11px] text-white/25 mt-0.5">
                      Calling RuleEngine.setRule() for {selectedGap?.jurisdiction}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {pushResult && (
              <div className="p-5 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04]">
                <div className="flex items-center gap-2 mb-4">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <p className="text-[14px] text-emerald-400 font-semibold">Rules Updated On-Chain</p>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                    <p className="text-[10px] text-white/20 mb-1">
                      Transaction Hash {pushResult.simulated && <span className="text-white/10">(demo)</span>}
                    </p>
                    {pushResult.explorerUrl && !pushResult.simulated ? (
                      <a
                        href={pushResult.explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-emerald-400 font-mono hover:underline flex items-center gap-1"
                      >
                        {pushResult.txHash.slice(0, 20)}...
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    ) : (
                      <p className="text-[11px] text-emerald-400 font-mono">
                        {pushResult.txHash.slice(0, 20)}...
                      </p>
                    )}
                    {!pushResult.simulated && (
                      <p className="text-[9px] text-emerald-400/40 mt-1">Real on-chain tx via RuleEngine.setRule</p>
                    )}
                  </div>
                  <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                    <p className="text-[10px] text-white/20 mb-1">Block Height</p>
                    <p className="text-[11px] text-white/50 font-mono">{pushResult.blockHeight?.toLocaleString()}</p>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <p className="text-[10px] text-white/20 uppercase tracking-wider font-medium">Rules Applied</p>
                  {pushResult.rulesApplied?.map((rule, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
                      <span className="text-[11px] text-white/30 font-mono">{rule.key}</span>
                      <span className="text-[11px] text-emerald-400 font-mono font-bold">{rule.value}</span>
                    </div>
                  ))}
                </div>

                <div className="p-3 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/10">
                  <p className="text-[11px] text-emerald-400/70 leading-relaxed">
                    Rules for <strong>{selectedGap?.jurisdiction}</strong> are now updated on-chain. 
                    Scan again to verify compliance or fix remaining gaps.
                  </p>
                </div>

                <div className="flex justify-end gap-3 mt-4">
                  {scanResult?.gaps?.length > 0 ? (
                    <>
                      <button
                        onClick={handleReset}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/[0.06] bg-white/[0.02] text-[12px] font-medium text-white/30 hover:text-white/50 transition-all"
                      >
                        Scan Again
                      </button>
                      <button
                        onClick={() => { setSelectedGap(null); setPushResult(null); setCurrentStep('analyze') }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] text-[12px] font-medium text-amber-400/80 hover:text-amber-400 hover:border-amber-500/30 transition-all"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Fix Remaining {scanResult.gaps.length} Gap{scanResult.gaps.length !== 1 ? 's' : ''}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleReset}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] text-[12px] font-medium text-emerald-400/80 hover:text-emerald-400 transition-all"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      All Clear — Scan Again
                    </button>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
