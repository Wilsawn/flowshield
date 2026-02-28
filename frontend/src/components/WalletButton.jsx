import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wallet, LogOut, ShieldCheck, ShieldX, ExternalLink, Copy, Check, Loader2, X } from 'lucide-react'
import { connectWallet, disconnectWallet, subscribeToWallet } from '@/utils/fcl-config'

export default function WalletButton() {
  const [walletUser, setWalletUser] = useState(null)
  const [connecting, setConnecting] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [showDiscovery, setShowDiscovery] = useState(false)
  const [compliance, setCompliance] = useState(null)
  const [checkingCompliance, setCheckingCompliance] = useState(false)
  const [copied, setCopied] = useState(false)
  const ref = useRef(null)

  // Subscribe to FCL auth state on mount
  useEffect(() => {
    const unsub = subscribeToWallet((user) => {
      if (user?.loggedIn && user?.addr) {
        setWalletUser(user)
        localStorage.setItem('flowshield_wallet', JSON.stringify(user))
        checkComplianceStatus(user.addr)
      }
    })
    // Also restore from localStorage for manual/demo connections
    try {
      const saved = localStorage.getItem('flowshield_wallet')
      if (saved) {
        const w = JSON.parse(saved)
        setWalletUser(w)
        if (w.addr) checkComplianceStatus(w.addr)
      }
    } catch { /* ignore */ }
    return unsub
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

  // Re-check compliance when dropdown is opened
  useEffect(() => {
    if (showDropdown && walletUser?.addr) {
      checkComplianceStatus(walletUser.addr)
    }
  }, [showDropdown])

  // Periodic compliance refresh (every 30s)
  useEffect(() => {
    if (!walletUser?.addr) return
    const interval = setInterval(() => checkComplianceStatus(walletUser.addr), 30000)
    return () => clearInterval(interval)
  }, [walletUser?.addr])

  const [manualAddr, setManualAddr] = useState('')

  // Primary: FCL wallet discovery (Lilico, Blocto, etc.)
  const handleFCLConnect = async () => {
    setConnecting(true)
    try {
      const user = await connectWallet()
      if (user?.loggedIn) {
        setWalletUser(user)
        localStorage.setItem('flowshield_wallet', JSON.stringify(user))
        checkComplianceStatus(user.addr)
        setShowDiscovery(false)
      }
    } catch (err) {
      console.error('[Wallet] FCL connect failed:', err)
    }
    setConnecting(false)
  }

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

  const handleDisconnect = async () => {
    try { await disconnectWallet() } catch { /* ignore */ }
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
      setCompliance({ hasCredential: false, isValid: false })
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

                {/* Primary: Real wallet connection via FCL Discovery */}
                <div className="px-4 pt-4 space-y-2">
                  <button
                    onClick={handleFCLConnect}
                    disabled={connecting}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-white/[0.08] bg-white text-[#060a13] hover:bg-white/90 transition-all"
                  >
                    {connecting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Wallet className="w-5 h-5" />
                    )}
                    <div className="text-left flex-1">
                      <p className="text-[13px] font-semibold">{connecting ? 'Connecting...' : 'Connect Flow Wallet'}</p>
                      <p className="text-[10px] text-[#060a13]/50">Lilico, Blocto, or any FCL-compatible wallet</p>
                    </div>
                  </button>
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
          compliance?.hasCredential && compliance?.isValid
            ? 'border-emerald-500/15 bg-emerald-500/[0.04] text-emerald-400/80'
            : 'border-white/[0.06] bg-white/[0.02] text-white/50'
        }`}
      >
        <Wallet className="w-3.5 h-3.5" />
        <span className="font-mono">{shortAddr}</span>
        {compliance?.hasCredential && compliance?.isValid && <ShieldCheck className="w-3 h-3" />}
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
                compliance?.hasCredential && compliance?.isValid
                  ? 'border-emerald-500/20 bg-emerald-500/[0.04]'
                  : 'border-amber-500/20 bg-amber-500/[0.04]'
              }`}>
                <div className="flex items-center gap-2">
                  {checkingCompliance ? (
                    <Loader2 className="w-4 h-4 text-white/40 animate-spin" />
                  ) : compliance?.hasCredential && compliance?.isValid ? (
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <ShieldX className="w-4 h-4 text-amber-400" />
                  )}
                  <div>
                    <p className={`text-[12px] font-medium ${
                      compliance?.hasCredential && compliance?.isValid ? 'text-emerald-400' : 'text-amber-400'
                    }`}>
                      {checkingCompliance ? 'Checking...' : compliance?.hasCredential && compliance?.isValid ? 'Compliant' : 'Not Compliant'}
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
