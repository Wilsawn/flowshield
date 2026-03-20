import { ShieldCheck, CheckCircle2, ArrowDownRight, Activity, Wallet, FileCheck, AlertTriangle } from 'lucide-react'

const STATS = [
  { label: 'Risk Score', value: '12', sub: '/100', icon: Activity, trend: '↓ 8%' },
  { label: 'Wallets Screened', value: '1,847', sub: '', icon: Wallet, trend: '↑ 12%' },
  { label: 'Compliance Rate', value: '99.2%', sub: '', icon: FileCheck, trend: '↑ 0.3%' },
  { label: 'Alerts', value: '3', sub: '', icon: AlertTriangle, trend: '↓ 2' },
]

const CHECKS = [
  { label: 'ZK Identity Proof', detail: 'Verified', time: '2s ago' },
  { label: 'Travel Rule — EU (MiCA)', detail: 'Passed', time: '4s ago' },
  { label: 'Sanctions Screening', detail: 'Clear', time: '6s ago' },
  { label: 'On-Chain Credential', detail: 'Active', time: '8s ago' },
]

const TXNS = [
  { hash: '0xa3f1…e82c', from: '0x8b2d…4f1a', risk: 'Low', amount: '2,450 FLOW' },
  { hash: '0xd7c4…91ab', from: '0x3e9f…c7d2', risk: 'Low', amount: '890 USDC' },
  { hash: '0xf1b8…3c5e', from: '0x71a2…8e6f', risk: 'Med', amount: '12,100 FLOW' },
]

export default function HeroProductPreview() {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0a1410] shadow-[0_8px_60px_rgba(0,0,0,0.5)] overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-4.5 h-4.5 text-emerald-400" />
          <span className="text-[13px] font-semibold text-white/80">FlowShield</span>
          <span className="text-[11px] text-white/20 font-mono ml-1">Dashboard</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/15">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">Compliant</span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Stats row */}
        <div className="grid grid-cols-4 gap-2.5">
          {STATS.map((s) => (
            <div key={s.label} className="px-3 py-2.5 rounded-lg bg-white/[0.025] border border-white/[0.04]">
              <div className="flex items-center gap-1.5 mb-1.5">
                <s.icon className="w-3 h-3 text-emerald-400/50" />
                <span className="text-[9px] text-white/25 uppercase tracking-wider">{s.label}</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-[20px] font-bold text-white/90 leading-none">{s.value}</span>
                {s.sub && <span className="text-[10px] text-white/20">{s.sub}</span>}
              </div>
              <span className="text-[9px] text-emerald-400/50 font-medium mt-1 block">{s.trend}</span>
            </div>
          ))}
        </div>

        {/* Two-column: checks + transactions */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Compliance checks */}
          <div className="rounded-lg border border-white/[0.04] bg-white/[0.015] p-3">
            <p className="text-[9px] text-white/25 uppercase tracking-wider font-medium mb-2">Compliance Checks</p>
            <div className="space-y-1.5">
              {CHECKS.map((item) => (
                <div key={item.label} className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-white/[0.02] border border-white/[0.03]">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400/60" />
                    <span className="text-[10px] text-white/45">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-emerald-400/40 font-medium">{item.detail}</span>
                    <span className="text-[8px] text-white/15">{item.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent transactions */}
          <div className="rounded-lg border border-white/[0.04] bg-white/[0.015] p-3">
            <p className="text-[9px] text-white/25 uppercase tracking-wider font-medium mb-2">Recent Transactions</p>
            <div className="space-y-1.5">
              {/* Table header */}
              <div className="flex items-center px-2.5 py-1">
                <span className="text-[8px] text-white/15 uppercase tracking-wider flex-1">Hash</span>
                <span className="text-[8px] text-white/15 uppercase tracking-wider flex-1">From</span>
                <span className="text-[8px] text-white/15 uppercase tracking-wider w-12 text-center">Risk</span>
                <span className="text-[8px] text-white/15 uppercase tracking-wider w-20 text-right">Amount</span>
              </div>
              {TXNS.map((tx) => (
                <div key={tx.hash} className="flex items-center px-2.5 py-1.5 rounded-md bg-white/[0.02] border border-white/[0.03]">
                  <span className="text-[10px] text-white/40 font-mono flex-1">{tx.hash}</span>
                  <span className="text-[10px] text-white/30 font-mono flex-1">{tx.from}</span>
                  <span className={`text-[9px] font-medium w-12 text-center ${tx.risk === 'Med' ? 'text-yellow-400/60' : 'text-emerald-400/50'}`}>{tx.risk}</span>
                  <span className="text-[10px] text-white/40 font-mono w-20 text-right">{tx.amount}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
          <span className="text-[8px] text-white/15 font-mono">Flow Testnet · Block #98,412,087</span>
          <div className="flex items-center gap-3">
            <span className="text-[8px] text-white/15">Gas: Sponsored</span>
            <span className="flex items-center gap-1 text-[8px] text-emerald-400/30">
              <ArrowDownRight className="w-2.5 h-2.5" />
              Risk trending down
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
