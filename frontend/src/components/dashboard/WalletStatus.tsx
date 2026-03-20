export default function WalletStatus({ isCustodial, walletAddr, flowBalance, onNavigate }) {
  if (isCustodial && walletAddr) {
    return (
      <div className="mb-6 rounded-xl border border-white/[0.06] bg-white/[0.02] py-3 pl-4 pr-4 border-l-2 border-l-emerald-500/60">
        <p className="text-[12px] font-medium text-white/85">
          Account active — transactions ready
          {flowBalance !== null && (
            <span className="mt-0.5 block text-[11px] font-normal text-white/40">
              Balance {flowBalance.toFixed(4)} FLOW
            </span>
          )}
        </p>
      </div>
    )
  }

  if (!isCustodial && walletAddr) {
    const walletData = (() => {
      try { return JSON.parse(localStorage.getItem('flowshield_wallet') || '{}') } catch { return {} }
    })()
    const isWalletUser = walletData.custodial === false

    if (isWalletUser) {
      return (
        <div className="mb-6 rounded-xl border border-white/[0.06] bg-white/[0.02] py-3 pl-4 pr-4 border-l-2 border-l-emerald-500/60">
          <p className="text-[12px] font-medium text-white/85">
            Wallet connected — you sign transactions
            {flowBalance !== null && (
              <span className="mt-0.5 block text-[11px] font-normal text-white/40">
                Balance {flowBalance.toFixed(4)} FLOW
              </span>
            )}
          </p>
        </div>
      )
    }

    return (
      <div className="mb-6 flex flex-col gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12px] text-amber-200/90">
          Wallet not recognized — create an account to continue.
        </p>
        <button
          type="button"
          onClick={() => { localStorage.removeItem('flowshield_token'); localStorage.removeItem('flowshield_wallet'); localStorage.removeItem('flowshield_user'); onNavigate('/') }}
          className="shrink-0 rounded-lg bg-amber-500/20 px-3 py-2 text-[12px] font-semibold text-amber-300 transition-colors hover:bg-amber-500/30"
        >
          Create account
        </button>
      </div>
    )
  }

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[12px] text-amber-200/90">No account — sign up or connect a Flow wallet.</p>
      <button
        type="button"
        onClick={() => onNavigate('/')}
        className="shrink-0 rounded-lg bg-amber-500/20 px-3 py-2 text-[12px] font-semibold text-amber-300 transition-colors hover:bg-amber-500/30"
      >
        Get started
      </button>
    </div>
  )
}
