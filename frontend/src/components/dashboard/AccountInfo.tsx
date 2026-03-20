export default function AccountInfo({ live }) {
  const rows = [
    { label: 'Account age', value: live.accountAge != null ? `${live.accountAge} days` : '—' },
    { label: 'Transactions (24h)', value: live.txCount != null ? `${live.txCount}` : '—' },
    { label: 'Contracts deployed', value: live.contractCount != null ? `${live.contractCount}` : '—' },
    { label: 'Signing keys', value: live.keyCount != null ? `${live.keyCount}` : '—' },
    { label: 'Funding sources', value: live.fundingSources != null ? `${live.fundingSources}` : '—' },
  ]

  return (
    <div className="mt-6 rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
      <h3 className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/35">On-chain account</h3>
      <div className="mt-4 divide-y divide-white/[0.06]">
        {rows.map((item, i) => (
          <div key={i} className="flex items-center justify-between gap-4 py-3 first:pt-0">
            <span className="text-[12px] text-white/40">{item.label}</span>
            <span className="text-[12px] font-medium tabular-nums text-white/80">{item.value}</span>
          </div>
        ))}
        {live.riskFactors?.length > 0 && (
          <div className="pt-4">
            <span className="text-[11px] font-medium uppercase tracking-wider text-white/35">Risk factors</span>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {live.riskFactors.map((f, fi) => (
                <span key={fi} className="rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-1 text-[10px] text-white/45">
                  +{f.points} {f.label?.length > 30 ? `${f.label.slice(0, 27)}…` : f.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      {live.lastUpdated && (
        <p className="mt-4 text-center text-[11px] text-white/25">
          Updated {live.lastUpdated.toLocaleTimeString()}
        </p>
      )}
    </div>
  )
}
