import { ExternalLink } from 'lucide-react'

export default function NetworkBar({ chain, walletAddr, jurisdiction }) {
  return (
    <div className="mb-8 flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-3">
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        <span className="text-xs text-white/50 font-medium">Flow Testnet</span>
        <span className="text-xs text-white/20">·</span>
        <span className="text-xs text-white/30 font-mono">Block #{chain.latestBlock?.height || '—'}</span>
      </div>
      <div className="hidden sm:flex items-center gap-4">
        <a href={`https://testnet.flowscan.io/account/${walletAddr || '0x93c691a98b975493'}`} target="_blank" rel="noopener noreferrer" className="text-xs text-white/30 font-mono hover:text-white/50 transition-colors">{walletAddr ? `${walletAddr.slice(0, 6)}...${walletAddr.slice(-4)}` : 'Not connected'}</a>
        <span className="text-xs text-white/20">·</span>
        <span className="text-xs text-white/30">{jurisdiction.flag} {jurisdiction.code}</span>
        <span className="text-xs text-white/20">·</span>
        <span className="text-xs text-white/30">Gas sponsored</span>
      </div>
    </div>
  )
}
