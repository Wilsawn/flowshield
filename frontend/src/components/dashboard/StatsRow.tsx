/**
 * @file Stats Row Component
 * @module components/dashboard/StatsRow
 * @description Renders the top-level stats cards on the dashboard:
 *              Wallet Balance, Total Deposited, Total Borrowed, and Risk Score.
 *              Each card is clickable and opens a detail modal.
 */
import AnimatedTicker from '@/components/ui/animated-ticker'

export default function StatsRow({ live, chain, flowBalance, loading, onStatClick, onRiskClick }) {
  const stats = [
    { label: 'Wallet Balance', value: chain.account?.balance ?? live.walletBalance ?? 0, sub: 'FLOW', prefix: '', decimals: 2, onClick: () => onStatClick('wallet') },
    { label: 'Total Deposited', value: live.deposited ?? 0, sub: live.baseAPYPercent != null ? `${live.baseAPYPercent}% APY` : '—', onClick: () => onStatClick('deposited') },
    { label: 'Total Borrowed', value: live.borrowed ?? 0, sub: live.borrowRatePercent != null ? `${live.borrowRatePercent}% interest` : '—', onClick: () => onStatClick('borrowed') },
    { label: 'Risk Score', value: live.riskScore != null ? live.riskScore : '—', sub: live.riskTier || (live.riskScore == null ? 'Not calculated yet' : '—'), noPrefix: true, onClick: onRiskClick },
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="p-5 rounded-xl border border-emerald-500/[0.06] bg-[#0a0f0c]/60">
            <div className="h-3 w-24 rounded bg-white/[0.04] animate-pulse mb-4" />
            <div className="h-7 w-20 rounded bg-white/[0.06] animate-pulse mb-2" />
            <div className="h-2.5 w-16 rounded bg-white/[0.03] animate-pulse" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map((stat, i) => (
        <button
          key={i}
          onClick={stat.onClick}
          className="p-5 rounded-xl border border-emerald-500/[0.08] bg-[#0a0f0c]/80 text-left hover:border-emerald-500/[0.15] transition-colors"
        >
          <span className="text-xs text-white/35 block mb-3">{stat.label}</span>
          <p className="text-[1.6rem] font-bold tracking-tight text-white">
            {stat.noPrefix ? '' : (stat.prefix !== undefined ? stat.prefix : '$')}<AnimatedTicker value={stat.value} decimals={stat.decimals || 0} />
          </p>
          <p className="text-xs text-white/30 mt-1">{stat.sub}</p>
        </button>
      ))}
    </div>
  )
}
