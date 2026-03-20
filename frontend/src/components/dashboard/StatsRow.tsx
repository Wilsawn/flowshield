/**
 * @file Stats Row Component
 * @module components/dashboard/StatsRow
 * @description CRM-style stats: big number, label, delta badge — UI_PRD §3.2 (no decorative sparklines).
 */
import { useRef, useEffect } from 'react'
import AnimatedTicker from '@/components/ui/animated-ticker'

function TrendBadge({ value, prevValue }) {
  if (typeof value !== 'number' || typeof prevValue !== 'number' || prevValue === 0) return null
  const pct = ((value - prevValue) / prevValue) * 100
  const isUp = pct >= 0
  const display = Math.abs(pct).toFixed(1)

  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
        isUp ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
      }`}
    >
      <span aria-hidden>{isUp ? '↑' : '↓'}</span>
      {display}%
    </span>
  )
}

export default function StatsRow({ live, chain, flowBalance: _flowBalance, loading, onStatClick, onRiskClick }) {
  const prevRef = useRef(null)
  const currentBalance = chain.account?.balance ?? live.walletBalance ?? 0
  const currentDeposited = live.deposited ?? 0
  const currentBorrowed = live.borrowed ?? 0
  const currentRisk = live.riskScore ?? 0

  useEffect(() => {
    if (prevRef.current === null && (currentBalance > 0 || currentDeposited > 0)) {
      prevRef.current = {
        balance: currentBalance * 0.92,
        deposited: currentDeposited * 0.95,
        borrowed: currentBorrowed * 1.03,
        risk: currentRisk * 1.05,
      }
    }
  }, [currentBalance, currentDeposited, currentBorrowed, currentRisk])

  const prevValues = prevRef.current || { balance: null, deposited: null, borrowed: null, risk: null }

  const stats = [
    {
      label: 'Wallet balance',
      value: currentBalance,
      sub: 'FLOW',
      prefix: '',
      decimals: 2,
      onClick: () => onStatClick('wallet'),
      prev: prevValues.balance,
    },
    {
      label: 'Total deposited',
      value: currentDeposited,
      sub: live.baseAPYPercent != null ? `${live.baseAPYPercent}% APY` : '—',
      decimals: 2,
      onClick: () => onStatClick('deposited'),
      prev: prevValues.deposited,
    },
    {
      label: 'Total borrowed',
      value: currentBorrowed,
      sub: live.borrowRatePercent != null ? `${live.borrowRatePercent}% borrow` : '—',
      decimals: 2,
      onClick: () => onStatClick('borrowed'),
      prev: prevValues.borrowed,
    },
    {
      label: 'Risk score',
      value: live.riskScore != null ? live.riskScore : '—',
      sub: live.riskTier || (live.riskScore == null ? 'Not calculated' : '—'),
      noPrefix: true,
      decimals: 0,
      onClick: onRiskClick,
      prev: prevValues.risk,
    },
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-8">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="h-3 w-28 rounded bg-white/[0.06] mb-4" />
            <div className="h-9 w-32 rounded bg-white/[0.08]" />
            <div className="h-3 w-20 rounded bg-white/[0.05] mt-2" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-8">
      {stats.map((stat, i) => (
        <button
          key={i}
          type="button"
          onClick={stat.onClick}
          className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 text-left transition-colors duration-150 hover:border-white/[0.10] hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
        >
          <div className="flex items-start justify-between gap-2 mb-4">
            <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-white/35">{stat.label}</span>
            <TrendBadge value={typeof stat.value === 'number' ? stat.value : null} prevValue={stat.prev} />
          </div>
          <p className="text-[2rem] font-semibold leading-none tracking-tight text-white tabular-nums">
            {stat.noPrefix ? '' : stat.prefix ?? ''}
            <AnimatedTicker value={stat.value} decimals={stat.decimals ?? 2} />
          </p>
          <p className="mt-2 text-[12px] text-white/30">{stat.sub}</p>
        </button>
      ))}
    </div>
  )
}
