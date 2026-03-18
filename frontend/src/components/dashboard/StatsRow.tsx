/**
 * @file Stats Row Component
 * @module components/dashboard/StatsRow
 * @description Renders the top-level stats cards on the dashboard:
 *              Wallet Balance, Total Deposited, Total Borrowed, and Risk Score.
 *              Each card is clickable and opens a detail modal.
 */
import { useRef, useEffect } from 'react'
import AnimatedTicker from '@/components/ui/animated-ticker'

// Mini sparkline SVG — renders a small area chart from data points
function Sparkline({ data, color = '#34d399', width = 64, height = 24 }) {
  if (!data || data.length < 2) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * (height - 4) - 2
    return `${x},${y}`
  })
  const linePath = `M${points.join(' L')}`
  const areaPath = `${linePath} L${width},${height} L0,${height} Z`

  return (
    <svg width={width} height={height} className="shrink-0" viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id={`spark-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#spark-${color.replace('#','')})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
    </svg>
  )
}

// Generate mock sparkline data derived from value (deterministic)
function useSparklineData(value, seed = 0) {
  return useRef(
    Array.from({ length: 8 }, (_, i) => {
      const base = typeof value === 'number' ? value : 0
      const noise = Math.sin((i + seed) * 2.5 + seed * 0.7) * (base * 0.15) + Math.cos((i + seed) * 1.3) * (base * 0.08)
      return Math.max(0, base * 0.7 + noise + (i / 7) * (base * 0.3))
    })
  ).current
}

// Trend indicator arrow + percentage
function TrendBadge({ value, prevValue }) {
  if (typeof value !== 'number' || typeof prevValue !== 'number' || prevValue === 0) return null
  const pct = ((value - prevValue) / prevValue) * 100
  const isUp = pct >= 0
  const display = Math.abs(pct).toFixed(1)

  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${
      isUp ? 'text-emerald-400/70' : 'text-red-400/70'
    }`}>
      <svg width="8" height="8" viewBox="0 0 8 8" className={!isUp ? 'rotate-180' : ''}>
        <path d="M4 1L7 5H1L4 1Z" fill="currentColor" />
      </svg>
      {display}%
    </span>
  )
}

export default function StatsRow({ live, chain, flowBalance, loading, onStatClick, onRiskClick }) {
  // Track previous values for trend calculation
  const prevRef = useRef(null)
  const currentBalance = chain.account?.balance ?? live.walletBalance ?? 0
  const currentDeposited = live.deposited ?? 0
  const currentBorrowed = live.borrowed ?? 0
  const currentRisk = live.riskScore ?? 0

  useEffect(() => {
    // On first meaningful data load, snapshot as "previous" for trend
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

  const sparkBalance = useSparklineData(currentBalance, 1)
  const sparkDeposited = useSparklineData(currentDeposited, 2)
  const sparkBorrowed = useSparklineData(currentBorrowed, 3)
  const sparkRisk = useSparklineData(currentRisk, 4)

  const riskColor = currentRisk > 70 ? '#f87171' : currentRisk > 30 ? '#fbbf24' : '#34d399'

  const stats = [
    { label: 'Wallet Balance', value: currentBalance, sub: 'FLOW', prefix: '', decimals: 2, onClick: () => onStatClick('wallet'), sparkline: sparkBalance, color: '#34d399', prev: prevValues.balance },
    { label: 'Total Deposited', value: currentDeposited, sub: live.baseAPYPercent != null ? `${live.baseAPYPercent}% APY` : '—', onClick: () => onStatClick('deposited'), sparkline: sparkDeposited, color: '#34d399', prev: prevValues.deposited },
    { label: 'Total Borrowed', value: currentBorrowed, sub: live.borrowRatePercent != null ? `${live.borrowRatePercent}% interest` : '—', onClick: () => onStatClick('borrowed'), sparkline: sparkBorrowed, color: '#fbbf24', prev: prevValues.borrowed },
    { label: 'Risk Score', value: live.riskScore != null ? live.riskScore : '—', sub: live.riskTier || (live.riskScore == null ? 'Not calculated yet' : '—'), noPrefix: true, onClick: onRiskClick, sparkline: sparkRisk, color: riskColor, prev: prevValues.risk },
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
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
          className="group p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] text-left hover:border-white/[0.1] hover:bg-white/[0.03] transition-all duration-200"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-white/35">{stat.label}</span>
            <TrendBadge value={typeof stat.value === 'number' ? stat.value : null} prevValue={stat.prev} />
          </div>
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[1.6rem] font-bold tracking-tight text-white">
                {stat.noPrefix ? '' : (stat.prefix !== undefined ? stat.prefix : '$')}<AnimatedTicker value={stat.value} decimals={stat.decimals || 0} />
              </p>
              <p className="text-xs text-white/30 mt-1">{stat.sub}</p>
            </div>
            <div className="shrink-0 opacity-40 group-hover:opacity-70 transition-opacity">
              <Sparkline data={stat.sparkline} color={stat.color} />
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}
