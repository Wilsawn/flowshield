import { ShieldCheck, AlertTriangle, Wallet } from 'lucide-react'

export default function WalletStatus({ isCustodial, walletAddr, flowBalance, onNavigate }) {
  if (isCustodial && walletAddr) {
    return (
      <div className="mb-4 p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
        <p className="text-xs text-emerald-400">
          <ShieldCheck className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
          Your Flow account is active — transactions are ready
          {flowBalance !== null && <span className="ml-2 text-white/50">Balance: {flowBalance.toFixed(4)} FLOW</span>}
        </p>
      </div>
    )
  }

  if (!isCustodial && walletAddr) {
    // Self-custodial wallet connected via FCL
    const walletData = (() => {
      try { return JSON.parse(localStorage.getItem('flowshield_wallet') || '{}') } catch { return {} }
    })()
    const isWalletUser = walletData.custodial === false

    if (isWalletUser) {
      return (
        <div className="mb-4 p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
          <p className="text-xs text-emerald-400">
            <Wallet className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
            Wallet connected — you sign all transactions
            {flowBalance !== null && <span className="ml-2 text-white/50">Balance: {flowBalance.toFixed(4)} FLOW</span>}
          </p>
        </div>
      )
    }

    return (
      <div className="mb-4 p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 flex items-center justify-between">
        <p className="text-xs text-amber-400">
          <AlertTriangle className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
          Wallet not recognized — create a new account to get started
        </p>
        <button
          onClick={() => { localStorage.removeItem('flowshield_token'); localStorage.removeItem('flowshield_wallet'); localStorage.removeItem('flowshield_user'); onNavigate('/') }}
          className="ml-3 px-3 py-1 text-xs font-medium rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition-colors whitespace-nowrap"
        >
          Create Account
        </button>
      </div>
    )
  }

  return (
    <div className="mb-4 p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 flex items-center justify-between">
      <p className="text-xs text-amber-400">
        <Wallet className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
        No account found — sign up or connect your Flow wallet
      </p>
      <button
        onClick={() => onNavigate('/')}
        className="ml-3 px-3 py-1 text-xs font-medium rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition-colors whitespace-nowrap"
      >
        Get Started
      </button>
    </div>
  )
}
