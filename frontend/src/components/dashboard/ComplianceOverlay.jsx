import { ExternalLink } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function ComplianceOverlay({ showCompliance, chain, live, jurisdiction, onChainRules, walletAddr }) {
  return (
    <AnimatePresence>
      {showCompliance && (
        <motion.div
          className="mt-8"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs font-medium text-white/40 uppercase tracking-wider">Compliance — On-Chain</span>
            {chain.latestBlock && <span className="text-xs text-white/20 ml-auto font-mono">#{chain.latestBlock.height}</span>}
          </div>

          {/* On-chain status cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-emerald-500/[0.08]">
              <span className="text-xs text-white/30 block mb-2">Credential</span>
              <p className={`text-sm font-bold mb-1 ${chain.compliance?.hasCredential ? 'text-emerald-400' : 'text-white/50'}`}>
                {chain.compliance?.hasCredential ? 'Active' : 'Not issued'}
              </p>
              <p className="text-xs text-white/20 font-mono">{chain.compliance?.tier || '—'} · {chain.compliance?.source || '—'}</p>
            </div>

            <div className="p-4 rounded-xl border border-emerald-500/[0.08]">
              <span className="text-xs text-white/30 block mb-2">Risk Score</span>
              <p className="text-sm font-bold text-white mb-1">{live.riskScore ?? '—'}/100</p>
              <p className="text-xs text-white/20 font-mono">{live.riskTier || '—'} · {live.riskFactors?.length || 0} factors</p>
            </div>

            <div className="p-4 rounded-xl border border-emerald-500/[0.08]">
              <span className="text-xs text-white/30 block mb-2">Jurisdiction</span>
              <p className="text-sm font-bold text-white mb-1">{jurisdiction.code} / {jurisdiction.regulator}</p>
              <p className="text-xs text-white/20 font-mono">
                Travel rule: {onChainRules?.rules?.travel_rule_threshold || jurisdiction.travelRuleThreshold}
              </p>
            </div>

            <div className="p-4 rounded-xl border border-emerald-500/[0.08]">
              <span className="text-xs text-white/30 block mb-2">Network</span>
              <p className="text-sm font-bold text-white mb-1">Flow Testnet</p>
              <p className="text-xs text-white/20 font-mono">
                {chain.account?.balance?.toLocaleString() || '—'} FLOW · {chain.account?.contractCount || 0} contracts
              </p>
            </div>
          </div>

          {/* Deployed Contracts */}
          <div className="p-5 mt-4 rounded-xl border border-emerald-500/[0.08]">
            <span className="text-xs text-white/30 uppercase tracking-wider block mb-3">Deployed Contracts</span>
            {chain.contracts.length > 0 ? (
              <div className="space-y-2">
                {chain.contracts.map((c, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-emerald-500/[0.04] last:border-0">
                    <span className="text-xs font-medium text-white/60">{c.name}</span>
                    <span className="text-xs text-white/20 font-mono">{(c.codeSize / 1024).toFixed(1)} KB</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-white/20">Loading contracts...</p>
            )}
            <a
              href={`https://testnet.flowscan.io/account/${chain.account?.address || '0x93c691a98b975493'}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 mt-3 text-xs text-white/30 hover:text-white/50 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              View on Flowscan
            </a>
          </div>

          {/* Jurisdiction Rules */}
          <div className="p-5 mt-4 rounded-xl border border-emerald-500/[0.08]">
            <span className="text-xs text-white/30 uppercase tracking-wider block mb-3">
              {onChainRules?.source === 'flow-testnet' ? 'On-Chain' : 'Active'} Rules — {jurisdiction.code}
            </span>
            {onChainRules?.rules ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(onChainRules.rules).map(([key, value], i) => (
                  <div key={i} className="py-2">
                    <span className="text-[10px] text-white/20 block">{key.replace(/_/g, ' ')}</span>
                    <span className="text-xs text-white/50 font-medium">{value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {jurisdiction.complianceChecks.map((check, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5">
                    <span className="text-xs text-white/35">{check.label}</span>
                    <span className="text-[10px] font-mono text-white/25">{check.status.toUpperCase()}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 pt-3 border-t border-emerald-500/[0.06]">
              <p className="text-xs text-white/15 leading-relaxed">
                {jurisdiction.rules.join(' · ')}
              </p>
              <a
                href={jurisdiction.code === 'US' ? 'https://www.fincen.gov/sites/default/files/advisory/2019-05-10/FinCEN%20Advisory%20CVC%20FINAL%20508.pdf' :
                      jurisdiction.code === 'EU' ? 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32023R1114' :
                      jurisdiction.code === 'UK' ? 'https://www.fca.org.uk/firms/cryptoassets' :
                      jurisdiction.code === 'SG' ? 'https://www.mas.gov.sg/regulation/acts/payment-services-act' :
                      'https://www.fintrac-canafe.gc.ca/msb-esm/msb-eng'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 mt-2 text-xs text-white/30 hover:text-white/50 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                View {jurisdiction.regulator} guidelines
              </a>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
