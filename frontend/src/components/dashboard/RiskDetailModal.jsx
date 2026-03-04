import { X, CheckCircle2, XCircle, ExternalLink } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const RISK_FACTORS = [
  { id: 'account_age_7d', label: 'Account age < 7 days', points: 15, tip: 'Wait until your account is at least 7 days old', source: 'Account creation timestamp on Flow', explorer: 'account' },
  { id: 'account_age_30d', label: 'Account age < 30 days', points: 8, tip: 'Older accounts are considered lower risk', source: 'Account creation timestamp on Flow', explorer: 'account' },
  { id: 'high_volume_24h', label: 'High tx volume in 24h (>50)', points: 20, tip: 'Reduce transaction frequency or spread over multiple days', source: 'Transaction count from Flow Access API', explorer: 'transactions' },
  { id: 'rapid_in_out', label: 'Rapid in-out pattern', points: 25, tip: 'Avoid sending and receiving large amounts in quick succession', source: 'Transfer pattern analysis via Anomaly Monitor', explorer: 'transactions' },
  { id: 'flagged_contract', label: 'Flagged contract interaction', points: 30, tip: 'Avoid interacting with known flagged contracts', source: 'Contract interaction log on Flow', explorer: 'transactions' },
  { id: 'mixer_interaction', label: 'Mixer / privacy tool interaction', points: 35, tip: 'Mixer usage is flagged by most compliance frameworks', source: 'Known mixer address database', explorer: 'transactions' },
  { id: 'multi_funding', label: 'Multiple funding sources (>5)', points: 15, tip: 'Consolidate funding to fewer wallet sources', source: 'Incoming transfer origins on Flow', explorer: 'transactions' },
  { id: 'dormancy_spike', label: 'Dormant then suddenly active', points: 12, tip: 'Gradually increase activity after dormancy periods', source: 'Activity gap analysis via Anomaly Monitor', explorer: 'account' },
]

const STANDARD_IDS = RISK_FACTORS.map(f => f.id)

export default function RiskDetailModal({ show, onClose, live }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-lg mx-4 rounded-2xl border border-emerald-500/[0.08] bg-[#0a1410] overflow-hidden"
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-emerald-500/[0.06]">
              <div>
                <h3 className="text-[15px] font-semibold text-white">Risk Score Breakdown</h3>
                <p className="text-[12px] text-white/30 mt-0.5">How your score is calculated from on-chain data</p>
              </div>
              <button onClick={onClose} className="text-white/20 hover:text-white/50 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5">
              {/* Score gauge */}
              <div className="flex items-center gap-5 mb-6">
                <div className={`w-20 h-20 rounded-2xl flex flex-col items-center justify-center ${
                  (live.riskScore ?? 0) <= 30 ? 'bg-emerald-500/10 border border-emerald-500/20' :
                  (live.riskScore ?? 0) <= 70 ? 'bg-amber-500/10 border border-amber-500/20' :
                  'bg-red-500/10 border border-red-500/20'
                }`}>
                  <span className={`text-[24px] font-bold ${
                    (live.riskScore ?? 0) <= 30 ? 'text-emerald-400' :
                    (live.riskScore ?? 0) <= 70 ? 'text-amber-400' : 'text-red-400'
                  }`}>{live.riskScore ?? 0}</span>
                  <span className="text-[10px] text-white/25">/100</span>
                </div>
                <div className="flex-1">
                  <p className={`text-[14px] font-semibold ${
                    live.riskTier === 'compliant' ? 'text-emerald-400' :
                    live.riskTier === 'semi-compliant' ? 'text-amber-400' : 'text-red-400'
                  }`}>{(live.riskTier || 'unknown').toUpperCase()}</p>
                  <p className="text-[11px] text-white/30 mt-1">
                    {live.riskTier === 'compliant' ? 'Your wallet passes all compliance checks. You can deposit, borrow, and use all DeFi features.' :
                     live.riskTier === 'semi-compliant' ? 'Some risk factors detected. You can deposit but may be limited on borrows.' :
                     'High risk detected. Some actions may be restricted until risk factors are resolved.'}
                  </p>
                </div>
              </div>

              {/* Tier legend */}
              <div className="grid grid-cols-3 gap-2 mb-5">
                {[
                  { label: 'Compliant', range: '0–30', color: 'emerald' },
                  { label: 'Semi-Compliant', range: '31–70', color: 'amber' },
                  { label: 'Non-Compliant', range: '71–100', color: 'red' },
                ].map(t => (
                  <div key={t.label} className={`px-3 py-2 rounded-lg border ${
                    live.riskTier === t.label.toLowerCase().replace('-', '-') ? `border-${t.color}-500/30 bg-${t.color}-500/5` : 'border-emerald-500/[0.06] bg-emerald-500/[0.01]'
                  }`}>
                    <span className={`text-[10px] font-medium text-${t.color}-400`}>{t.label}</span>
                    <span className="text-[9px] text-white/20 block">{t.range} pts</span>
                  </div>
                ))}
              </div>

              {/* Factor list */}
              <div className="space-y-1.5 mb-5">
                <p className="text-[10px] text-white/25 uppercase tracking-wider font-semibold mb-2">Risk Factors Checked</p>
                {RISK_FACTORS.map(factor => {
                  const liveFactor = live.riskFactors?.find(f => f.id === factor.id)
                  const isTriggered = !!liveFactor
                  const explorerBase = `https://testnet.flowscan.io/account/${live.address || '0x93c691a98b975493'}`
                  return (
                    <div key={factor.id} className={`flex items-start gap-3 p-2.5 rounded-lg ${isTriggered ? 'bg-amber-500/5 border border-amber-500/10' : 'bg-emerald-500/[0.01]'}`}>
                      {isTriggered ? (
                        <XCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400/50 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={`text-[11px] font-medium ${isTriggered ? 'text-amber-400' : 'text-white/40'}`}>
                            {liveFactor?.label || factor.label}
                          </span>
                          <span className={`text-[10px] font-mono ${isTriggered ? 'text-amber-400/70' : 'text-white/15'}`}>+{liveFactor?.points || factor.points} pts</span>
                        </div>
                        {isTriggered && (
                          <div className="mt-1 space-y-1">
                            <p className="text-[10px] text-white/25">Fix: {factor.tip}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[9px] text-white/15">Source: {factor.source}</span>
                              <a
                                href={explorerBase}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[9px] text-white/25 hover:text-white/50 transition-colors"
                              >
                                <ExternalLink className="w-2.5 h-2.5" />
                                Flowscan
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
                {/* Extra demo-injected factors not in the standard list */}
                {live.riskFactors?.filter(f => !STANDARD_IDS.includes(f.id)).map(factor => (
                  <div key={factor.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-white/[0.02] border border-emerald-500/[0.06]">
                    <XCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-amber-400">{factor.label}</span>
                        <span className="text-[10px] font-mono text-amber-400/70">+{factor.points} pts</span>
                      </div>
                      <div className="mt-1 space-y-1">
                        <p className="text-[10px] text-white/25">Detected by AI Anomaly Monitor</p>
                        <a
                          href={`https://testnet.flowscan.io/account/${live.address || '0x93c691a98b975493'}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[9px] text-white/25 hover:text-white/50 transition-colors"
                        >
                          <ExternalLink className="w-2.5 h-2.5" />
                          Flowscan
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-lg bg-white/[0.02] border border-emerald-500/[0.06]">
                <p className="text-[10px] text-white/30 leading-relaxed">
                  Score is calculated from <strong className="text-white/50">public on-chain data only</strong> — no personal information is used.
                  Lower scores mean lower risk. The score updates automatically as your on-chain behavior changes.
                  Data source: {live.sources?.risk || 'flow-testnet'}
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
