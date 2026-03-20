import { ArrowDownToLine, ArrowUpFromLine, RotateCcw } from 'lucide-react'

export default function ActionCards({
  depositAmount, setDepositAmount, onDeposit,
  borrowAmount, setBorrowAmount, onBorrow,
  repayAmount, setRepayAmount, onRepay,
  live, flowBalance, maxBorrowRemaining,
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

      {/* Deposit */}
      <div className="p-6 rounded-xl border border-white/[0.06]">
        <div className="flex items-center gap-2 mb-5">
          <ArrowDownToLine className="w-4 h-4 text-white/40" />
          <h3 className="text-sm font-semibold text-white/80">Deposit</h3>
          <span className="text-xs text-white/20 ml-auto">FLOW</span>
        </div>
        <div className="space-y-3">
          <input
            type="number"
            placeholder="0.00"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            className="w-full h-10 bg-white/[0.02] border border-white/[0.06] rounded-lg px-4 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-emerald-500/[0.15] transition-colors"
          />
          <button
            onClick={onDeposit}
            className="w-full h-10 rounded-lg bg-white/90 text-[#060e09] text-sm font-semibold hover:bg-white transition-all disabled:opacity-30"
            disabled={!depositAmount || Number(depositAmount) <= 0}
          >
            Deposit
          </button>
          <p className="text-xs text-white/25 text-center">
            {flowBalance !== null ? `Balance: ${flowBalance.toFixed(4)} FLOW` : 'Into Lending Pool'} · Gas sponsored
          </p>
        </div>
      </div>

      {/* Borrow */}
      <div className="p-6 rounded-xl border border-white/[0.06]">
        <div className="flex items-center gap-2 mb-5">
          <ArrowUpFromLine className="w-4 h-4 text-white/40" />
          <h3 className="text-sm font-semibold text-white/80">Borrow</h3>
          <span className="text-xs text-white/20 ml-auto">FLOW</span>
        </div>
        <div className="space-y-3">
          <input
            type="number"
            placeholder="0.00"
            value={borrowAmount}
            onChange={(e) => setBorrowAmount(e.target.value)}
            className="w-full h-10 bg-white/[0.02] border border-white/[0.06] rounded-lg px-4 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-emerald-500/[0.15] transition-colors"
          />
          <button
            onClick={onBorrow}
            className="w-full h-10 rounded-lg bg-white/90 text-[#060e09] text-sm font-semibold hover:bg-white transition-all disabled:opacity-30"
            disabled={!borrowAmount || Number(borrowAmount) <= 0}
          >
            Borrow
          </button>
          <p className="text-xs text-white/25 text-center">
            {maxBorrowRemaining.toFixed(2)} remaining · {live.maxLTVPercent ?? 75}% LTV
          </p>
        </div>
      </div>

      {/* Repay */}
      <div className="p-6 rounded-xl border border-white/[0.06]">
        <div className="flex items-center gap-2 mb-5">
          <RotateCcw className="w-4 h-4 text-white/40" />
          <h3 className="text-sm font-semibold text-white/80">Repay</h3>
          <span className="text-xs text-white/20 ml-auto">FLOW</span>
        </div>
        <div className="space-y-3">
          <input
            type="number"
            placeholder="0.00"
            value={repayAmount}
            onChange={(e) => setRepayAmount(e.target.value)}
            className="w-full h-10 bg-white/[0.02] border border-white/[0.06] rounded-lg px-4 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-emerald-500/[0.15] transition-colors"
          />
          <button
            onClick={onRepay}
            className="w-full h-10 rounded-lg bg-white/90 text-[#060e09] text-sm font-semibold hover:bg-white transition-all disabled:opacity-30"
            disabled={!repayAmount || Number(repayAmount) <= 0 || (live.borrowed ?? 0) <= 0}
          >
            Repay
          </button>
          <p className="text-xs text-white/25 text-center">
            {(live.borrowed ?? 0) > 0 ? `${(live.borrowed ?? 0).toFixed(2)} outstanding` : 'No outstanding borrows'}
          </p>
        </div>
      </div>

    </div>
  )
}
