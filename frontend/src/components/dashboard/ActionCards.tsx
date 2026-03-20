export default function ActionCards({
  depositAmount, setDepositAmount, onDeposit,
  borrowAmount, setBorrowAmount, onBorrow,
  repayAmount, setRepayAmount, onRepay,
  live, flowBalance, maxBorrowRemaining,
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">

      {/* Deposit */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 transition-colors hover:border-white/[0.08]">
        <div className="mb-4 flex items-baseline justify-between gap-2">
          <h3 className="text-[13px] font-semibold text-white/90">Deposit</h3>
          <span className="text-[11px] font-medium uppercase tracking-wider text-white/25">FLOW</span>
        </div>
        <div className="space-y-3">
          <input
            type="number"
            placeholder="0.00"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            className="h-10 w-full rounded-lg border border-white/[0.06] bg-[#0a1410] px-4 text-[13px] text-white placeholder:text-white/25 transition-colors focus:border-emerald-500/25 focus:outline-none"
          />
          <button
            type="button"
            onClick={onDeposit}
            className="h-10 w-full rounded-lg bg-emerald-500 text-[13px] font-semibold text-[#060e09] transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!depositAmount || Number(depositAmount) <= 0}
          >
            Deposit
          </button>
          <p className="text-center text-[11px] text-white/30">
            {flowBalance !== null ? `Balance ${flowBalance.toFixed(4)} FLOW` : 'Lending pool'} · Gas sponsored
          </p>
        </div>
      </div>

      {/* Borrow */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 transition-colors hover:border-white/[0.08]">
        <div className="mb-4 flex items-baseline justify-between gap-2">
          <h3 className="text-[13px] font-semibold text-white/90">Borrow</h3>
          <span className="text-[11px] font-medium uppercase tracking-wider text-white/25">FLOW</span>
        </div>
        <div className="space-y-3">
          <input
            type="number"
            placeholder="0.00"
            value={borrowAmount}
            onChange={(e) => setBorrowAmount(e.target.value)}
            className="h-10 w-full rounded-lg border border-white/[0.06] bg-[#0a1410] px-4 text-[13px] text-white placeholder:text-white/25 transition-colors focus:border-emerald-500/25 focus:outline-none"
          />
          <button
            type="button"
            onClick={onBorrow}
            className="h-10 w-full rounded-lg bg-emerald-500 text-[13px] font-semibold text-[#060e09] transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!borrowAmount || Number(borrowAmount) <= 0}
          >
            Borrow
          </button>
          <p className="text-center text-[11px] text-white/30">
            {maxBorrowRemaining.toFixed(2)} remaining · {live.maxLTVPercent ?? 75}% LTV
          </p>
        </div>
      </div>

      {/* Repay */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 transition-colors hover:border-white/[0.08]">
        <div className="mb-4 flex items-baseline justify-between gap-2">
          <h3 className="text-[13px] font-semibold text-white/90">Repay</h3>
          <span className="text-[11px] font-medium uppercase tracking-wider text-white/25">FLOW</span>
        </div>
        <div className="space-y-3">
          <input
            type="number"
            placeholder="0.00"
            value={repayAmount}
            onChange={(e) => setRepayAmount(e.target.value)}
            className="h-10 w-full rounded-lg border border-white/[0.06] bg-[#0a1410] px-4 text-[13px] text-white placeholder:text-white/25 transition-colors focus:border-emerald-500/25 focus:outline-none"
          />
          <button
            type="button"
            onClick={onRepay}
            className="h-10 w-full rounded-lg bg-emerald-500 text-[13px] font-semibold text-[#060e09] transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!repayAmount || Number(repayAmount) <= 0 || (live.borrowed ?? 0) <= 0}
          >
            Repay
          </button>
          <p className="text-center text-[11px] text-white/30">
            {(live.borrowed ?? 0) > 0 ? `${(live.borrowed ?? 0).toFixed(2)} outstanding` : 'No outstanding borrows'}
          </p>
        </div>
      </div>

    </div>
  )
}
