import AnimatedTicker from '@/components/ui/animated-ticker'

export default function StatsRow({ live, chain, flowBalance, onStatClick, onRiskClick }) {
  const stats = [
    { label: 'Wallet Balance', value: chain.account?.balance ?? live.walletBalance ?? 0, sub: 'FLOW', prefix: '', decimals: 2, onClick: () => onStatClick('wallet') },
    { label: 'Total Deposited', value: live.deposited ?? 0, sub: live.baseAPYPercent != null ? `${live.baseAPYPercent}% APY` : '—', onClick: () => onStatClick('deposited') },
    { label: 'Total Borrowed', value: live.borrowed ?? 0, sub: live.borrowRatePercent != null ? `${live.borrowRatePercent}% interest` : '—', onClick: () => onStatClick('borrowed') },
    { label: 'Risk Score', value: live.riskScore != null ? live.riskScore : '—', sub: live.riskTier || (live.riskScore == null ? 'Unavailable' : '—'), noPrefix: true, onClick: onRiskClick },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map((stat, i) => (
        <button
          key={i}
          onClick={stat.onClick}
          className="p-5 rounded-xl border border-emerald-500/[0.08] bg-emerald-500/[0.01] text-left hover:border-emerald-500/[0.12] transition-colors"
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
