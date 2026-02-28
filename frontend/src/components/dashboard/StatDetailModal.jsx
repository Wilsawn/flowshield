import { X, ExternalLink } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function StatDetailModal({ showStatDetail, onClose, live }) {
  return (
    <AnimatePresence>
      {showStatDetail && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-md mx-4 rounded-2xl border border-white/[0.08] bg-[#0a0f1a] overflow-hidden"
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.04]">
              <h3 className="text-[15px] font-semibold text-white">
                {showStatDetail === 'wallet' ? 'Wallet Balance' : showStatDetail === 'deposited' ? 'Deposits' : 'Borrows'}
              </h3>
              <button onClick={onClose} className="text-white/20 hover:text-white/50 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {showStatDetail === 'wallet' && (<>
                <div className="text-center py-3">
                  <p className="text-[32px] font-bold text-white">{(live.walletBalance ?? 0).toLocaleString()} <span className="text-[16px] text-white/30">FLOW</span></p>
                  <p className="text-[11px] text-white/25 mt-1 font-mono">{live.address}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between p-2.5 rounded-lg bg-white/[0.02]">
                    <span className="text-[11px] text-white/40">Network</span>
                    <span className="text-[11px] text-emerald-400 font-medium">Flow Testnet</span>
                  </div>
                  <div className="flex justify-between p-2.5 rounded-lg bg-white/[0.02]">
                    <span className="text-[11px] text-white/40">Account Age</span>
                    <span className="text-[11px] text-white/70 font-medium">{live.accountAge ?? '—'} days</span>
                  </div>
                  <div className="flex justify-between p-2.5 rounded-lg bg-white/[0.02]">
                    <span className="text-[11px] text-white/40">Contracts Deployed</span>
                    <span className="text-[11px] text-white/70 font-medium">{live.contractCount ?? '—'}</span>
                  </div>
                  <div className="flex justify-between p-2.5 rounded-lg bg-white/[0.02]">
                    <span className="text-[11px] text-white/40">Signing Keys</span>
                    <span className="text-[11px] text-white/70 font-medium">{live.keyCount ?? '—'}</span>
                  </div>
                </div>
                <p className="text-[10px] text-white/20 leading-relaxed">
                  This is your FLOW token balance on testnet. These are <strong className="text-white/40">free test tokens</strong> — not real cryptocurrency.
                  Your balance decreases slightly with each transaction (gas fees ~0.001 FLOW), but gas is sponsored so users pay nothing.
                </p>
                <a href={`https://testnet.flowscan.io/account/${live.address}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:border-cyan-500/30 transition-colors">
                  <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-[11px] text-cyan-400 font-medium">View on Flowscan</span>
                </a>
              </>)}

              {showStatDetail === 'deposited' && (<>
                <div className="text-center py-3">
                  <p className="text-[32px] font-bold text-white">{(live.deposited ?? 0).toLocaleString()} <span className="text-[16px] text-white/30">FLOW</span></p>
                  <p className="text-[11px] text-emerald-400/70 mt-1">Earning {live.baseAPYPercent ?? '—'}% APY</p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between p-2.5 rounded-lg bg-white/[0.02]">
                    <span className="text-[11px] text-white/40">Pool Contract</span>
                    <span className="text-[11px] text-white/70 font-medium font-mono">DemoLendingPool</span>
                  </div>
                  <div className="flex justify-between p-2.5 rounded-lg bg-white/[0.02]">
                    <span className="text-[11px] text-white/40">Pool Total Deposits</span>
                    <span className="text-[11px] text-white/70 font-medium">{live.totalDeposits?.toLocaleString() ?? '—'} FLOW</span>
                  </div>
                  <div className="flex justify-between p-2.5 rounded-lg bg-white/[0.02]">
                    <span className="text-[11px] text-white/40">Utilization Rate</span>
                    <span className="text-[11px] text-white/70 font-medium">{live.utilizationRate?.toFixed(1) ?? '—'}%</span>
                  </div>
                  <div className="flex justify-between p-2.5 rounded-lg bg-white/[0.02]">
                    <span className="text-[11px] text-white/40">Gas Fees</span>
                    <span className="text-[11px] text-emerald-400 font-medium">Sponsored (free for users)</span>
                  </div>
                </div>
                <p className="text-[10px] text-white/20 leading-relaxed">
                  <strong className="text-white/40">What is depositing?</strong> You supply liquidity to the DemoLendingPool smart contract.
                  Other users can borrow from the pool, and you earn interest (APY) on your deposits. Every deposit is compliance-checked
                  on-chain via ComplianceAction.verify() — this happens automatically and invisibly. Gas fees are sponsored by FlowShield.
                </p>
              </>)}

              {showStatDetail === 'borrowed' && (<>
                <div className="text-center py-3">
                  <p className="text-[32px] font-bold text-white">{(live.borrowed ?? 0).toLocaleString()} <span className="text-[16px] text-white/30">FLOW</span></p>
                  <p className="text-[11px] text-cyan-400/70 mt-1">{live.borrowRatePercent ?? '—'}% interest rate</p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between p-2.5 rounded-lg bg-white/[0.02]">
                    <span className="text-[11px] text-white/40">Max Borrow ({live.maxLTVPercent ?? '—'}% LTV)</span>
                    <span className="text-[11px] text-white/70 font-medium">{((live.deposited ?? 0) * (live.maxLTVPercent ?? 75) / 100).toFixed(2)} FLOW</span>
                  </div>
                  <div className="flex justify-between p-2.5 rounded-lg bg-white/[0.02]">
                    <span className="text-[11px] text-white/40">Available Liquidity</span>
                    <span className="text-[11px] text-white/70 font-medium">{live.availableLiquidity?.toLocaleString() ?? '—'} FLOW</span>
                  </div>
                  <div className="flex justify-between p-2.5 rounded-lg bg-white/[0.02]">
                    <span className="text-[11px] text-white/40">Compliance Required</span>
                    <span className="text-[11px] text-white/70 font-medium">Full (verifyFull)</span>
                  </div>
                  <div className="flex justify-between p-2.5 rounded-lg bg-white/[0.02]">
                    <span className="text-[11px] text-white/40">Gas Fees</span>
                    <span className="text-[11px] text-emerald-400 font-medium">Sponsored (free for users)</span>
                  </div>
                </div>
                <p className="text-[10px] text-white/20 leading-relaxed">
                  <strong className="text-white/40">What is borrowing?</strong> You borrow from the pool using your deposits as collateral ({live.maxLTVPercent ?? '—'}% loan-to-value ratio).
                  Borrowing requires <strong className="text-white/40">full compliance</strong> — ComplianceAction.verifyFull() is called on-chain, which checks
                  your credential tier is "compliant" (not just semi-compliant). Gas fees are sponsored by FlowShield — completely free for users.
                </p>
              </>)}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
