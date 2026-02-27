import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wallet, LogOut, ShieldCheck, ShieldX, ExternalLink, Copy, Check, Loader2, X } from 'lucide-react'

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '0x93c691a98b975493'

export default function WalletButton() {
  const [walletUser, setWalletUser] = useState(null)
  const [connecting, setConnecting] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [showDiscovery, setShowDiscovery] = useState(false)
  const [compliance, setCompliance] = useState(null)
  const [checkingCompliance, setCheckingCompliance] = useState(false)
  const [copied, setCopied] = useState(false)
  const ref = useRef(null)

  // Load saved wallet on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('flowshield_wallet')
      if (saved) {
        const w = JSON.parse(saved)
        setWalletUser(w)
        if (w.addr) checkComplianceStatus(w.addr)
      }
    } catch { /* ignore */ }
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    if (!showDropdown) return
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setShowDropdown(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showDropdown])

  const [manualAddr, setManualAddr] = useState('')

  const handleConnect = () => {
    setShowDiscovery(true)
  }


  const handleManualConnect = () => {
    const addr = manualAddr.trim()
    if (!addr || !addr.startsWith('0x') || addr.length < 10) return
    const user = { loggedIn: true, addr }
    setWalletUser(user)
    localStorage.setItem('flowshield_wallet', JSON.stringify(user))
    checkComplianceStatus(addr)
    setShowDiscovery(false)
    setConnecting(false)
    setManualAddr('')
  }

  const handleDisconnect = () => {
    setWalletUser(null)
    setCompliance(null)
    setShowDropdown(false)
    localStorage.removeItem('flowshield_wallet')
  }

  const checkComplianceStatus = async (address) => {
    setCheckingCompliance(true)
    try {
      const API = import.meta.env.VITE_API_URL || 'http://localhost:3002'
      const res = await fetch(`${API}/api/compliance/status/${address}`)
      if (res.ok) {
        const data = await res.json()
        setCompliance(data)
      }
    } catch {
      setCompliance({ isCompliant: false, hasCredential: false })
    }
    setCheckingCompliance(false)
  }

  const copyAddress = () => {
    if (walletUser?.addr) {
      navigator.clipboard.writeText(walletUser.addr)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const shortAddr = walletUser?.addr
    ? `${walletUser.addr.slice(0, 6)}...${walletUser.addr.slice(-4)}`
    : ''

  // Not connected — show connect button + discovery modal
  if (!walletUser) {
    return (
      <>
        <button
          onClick={handleConnect}
          disabled={connecting && !showDiscovery}
          className="flex items-center gap-2 h-9 px-3 rounded-lg border border-white/[0.06] bg-white/[0.02] text-[12px] font-medium text-white/50 hover:text-white/70 hover:border-white/[0.1] transition-all"
        >
          <Wallet className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Connect Wallet</span>
          <span className="sm:hidden">Wallet</span>
        </button>

        {/* Discovery Modal */}
        <AnimatePresence>
          {showDiscovery && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowDiscovery(false); setConnecting(false) }}
            >
              <motion.div
                className="w-full max-w-md mx-4 rounded-2xl border border-white/[0.08] bg-[#0a0f1a] overflow-hidden"
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.04]">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-[14px] font-semibold text-white">Connect Wallet</h3>
                  </div>
                  <button onClick={() => { setShowDiscovery(false); setConnecting(false) }} className="text-white/20 hover:text-white/50 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Quick connect — demo account */}
                <div className="px-4 pt-4 space-y-2">
                  <button
                    onClick={() => {
                      const user = { loggedIn: true, addr: CONTRACT_ADDRESS }
                      setWalletUser(user)
                      localStorage.setItem('flowshield_wallet', JSON.stringify(user))
                      checkComplianceStatus(user.addr)
                      setShowDiscovery(false)
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] hover:bg-emerald-500/[0.08] hover:border-emerald-500/30 transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="text-[13px] font-medium text-emerald-400/90">FlowShield Demo Account</p>
                      <p className="text-[10px] text-white/30 font-mono">0x93c6...5493 · Credentials + Contracts deployed</p>
                    </div>
                  </button>

                  <a
                    href={`https://testnet.flowscan.io/account/${CONTRACT_ADDRESS}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/[0.1] transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
                      <ExternalLink className="w-4 h-4 text-white/40" />
                    </div>
                    <div className="text-left">
                      <p className="text-[13px] font-medium text-white/70 group-hover:text-white/90">View on Flowscan</p>
                      <p className="text-[10px] text-white/30">Verify contracts and credentials on-chain</p>
                    </div>
                  </a>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3 px-5 py-3">
                  <div className="flex-1 h-px bg-white/[0.06]" />
                  <span className="text-[10px] text-white/20 uppercase tracking-wider">or enter address</span>
                  <div className="flex-1 h-px bg-white/[0.06]" />
                </div>

                {/* Manual address entry */}
                <div className="px-5 pb-5">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={manualAddr}
                      onChange={(e) => setManualAddr(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleManualConnect()}
                      placeholder="0x... (Flow address)"
                      className="flex-1 h-9 px-3 rounded-lg border border-white/[0.08] bg-white/[0.03] text-[12px] text-white/70 placeholder:text-white/20 focus:outline-none focus:border-emerald-500/30 font-mono"
                    />
                    <button
                      onClick={handleManualConnect}
                      disabled={!manualAddr.trim().startsWith('0x')}
                      className="h-9 px-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[12px] font-medium text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      Connect
                    </button>
                  </div>
                  <p className="text-[10px] text-white/15 mt-2 text-center">
                    Enter any Flow testnet address to view its compliance status
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    )
  }

  // Connected — show address with dropdown
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`flex items-center gap-2 h-9 px-3 rounded-lg border text-[12px] font-medium transition-all ${
          compliance?.isCompliant
            ? 'border-emerald-500/15 bg-emerald-500/[0.04] text-emerald-400/80'
            : 'border-white/[0.06] bg-white/[0.02] text-white/50'
        }`}
      >
        <Wallet className="w-3.5 h-3.5" />
        <span className="font-mono">{shortAddr}</span>
        {compliance?.isCompliant && <ShieldCheck className="w-3 h-3" />}
      </button>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-white/[0.08] bg-[#0a0f1a] backdrop-blur-xl shadow-2xl z-50 overflow-hidden"
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-4 space-y-3">
              {/* Address */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">Connected Wallet</p>
                  <p className="text-[13px] text-white/70 font-mono mt-0.5">{shortAddr}</p>
                </div>
                <button
                  onClick={copyAddress}
                  className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
                  title="Copy address"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-white/30" />
                  )}
                </button>
              </div>

              {/* Compliance Status */}
              <div className={`rounded-lg p-3 border ${
                compliance?.isCompliant
                  ? 'border-emerald-500/20 bg-emerald-500/[0.04]'
                  : 'border-amber-500/20 bg-amber-500/[0.04]'
              }`}>
                <div className="flex items-center gap-2">
                  {checkingCompliance ? (
                    <Loader2 className="w-4 h-4 text-white/40 animate-spin" />
                  ) : compliance?.isCompliant ? (
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <ShieldX className="w-4 h-4 text-amber-400" />
                  )}
                  <div>
                    <p className={`text-[12px] font-medium ${
                      compliance?.isCompliant ? 'text-emerald-400' : 'text-amber-400'
                    }`}>
                      {checkingCompliance ? 'Checking...' : compliance?.isCompliant ? 'Compliant' : 'Not Compliant'}
                    </p>
                    {compliance?.hasCredential && (
                      <p className="text-[10px] text-white/30">
                        Tier: {compliance.tier || 'standard'} · On-chain credential found
                      </p>
                    )}
                    {!compliance?.hasCredential && !checkingCompliance && (
                      <p className="text-[10px] text-white/30">
                        No credential found — complete onboarding first
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <a
                  href={`https://testnet.flowscan.io/account/${walletUser.addr}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-white/[0.06] bg-white/[0.02] text-[11px] text-white/40 hover:text-white/60 hover:border-white/[0.1] transition-all"
                >
                  <ExternalLink className="w-3 h-3" /> Flowscan
                </a>
                <button
                  onClick={handleDisconnect}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-red-500/10 bg-red-500/[0.04] text-[11px] text-red-400/60 hover:text-red-400 hover:border-red-500/20 transition-all"
                >
                  <LogOut className="w-3 h-3" /> Disconnect
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
