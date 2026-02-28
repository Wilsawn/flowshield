import { Activity } from 'lucide-react'

export default function AccountInfo({ live }) {
  return (
    <div className="mt-4 p-6 rounded-xl border border-white/[0.06]">
      <div className="flex items-center gap-2 mb-5">
        <Activity className="w-4 h-4 text-white/40" />
        <h3 className="text-sm font-semibold text-white/80">Account Info</h3>
      </div>
      <div className="space-y-2">
        {[
          { label: 'Account Age', value: live.accountAge != null ? `${live.accountAge} days` : '—' },
          { label: 'Transactions (24h)', value: live.txCount != null ? `${live.txCount}` : '—' },
          { label: 'Contracts', value: live.contractCount != null ? `${live.contractCount}` : '—' },
          { label: 'Keys', value: live.keyCount != null ? `${live.keyCount}` : '—' },
          { label: 'Funding Sources', value: live.fundingSources != null ? `${live.fundingSources}` : '—' },
        ].map((item, i) => (
          <div key={i} className="flex items-center justify-between py-1.5">
            <span className="text-xs text-white/35">{item.label}</span>
            <span className="text-xs text-white/60 font-medium">{item.value}</span>
          </div>
        ))}
        {live.riskFactors?.length > 0 && (
          <div className="pt-2 border-t border-white/[0.04]">
            <span className="text-xs text-white/35">Risk Factors</span>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {live.riskFactors.map((f, fi) => (
                <span key={fi} className="text-[10px] px-2 py-0.5 rounded bg-white/[0.04] text-white/40">
                  +{f.points} {f.label?.length > 30 ? f.label.slice(0, 27) + '...' : f.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      {live.lastUpdated && (
        <p className="text-xs text-white/20 mt-4 text-center">
          Updated {live.lastUpdated.toLocaleTimeString()}
        </p>
      )}
    </div>
  )
}
