import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wallet, LogOut, ShieldCheck, ShieldX, ExternalLink, Copy, Check, Loader2 } from 'lucide-react'

const FLOW_NETWORK = import.meta.env.VITE_FLOW_NETWORK || 'testnet'
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '0x93c691a98b975493'
const DISCOVERY_URL = FLOW_NETWORK === 'testnet'
  ? 'https://fcl-discovery.onflow.org/testnet/authn'
  : 'https://fcl-discovery.onflow.org/authn'

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

  const handleConnect = async () => {
    setConnecting(true)
    // Open FCL Discovery in a popup window
    const width = 400, height = 600
    const left = window.screenX + (window.innerWidth - width) / 2
    const top = window.screenY + (window.innerHeight - height) / 2
    const popup = window.open(
      DISCOVERY_URL,
      'FlowShield Wallet',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
    )

    // Listen for messages from the popup (FCL Discovery protocol)
    const handleMessage = (event) => {
      try {
        const data = event.data
        // FCL Discovery sends back authn responses
        if (data?.type === 'FCL:VIEW:RESPONSE' || data?.addr || data?.address) {
          const addr = data.addr || data.address || data?.data?.addr
          if (addr) {
            const user = { loggedIn: true, addr, demo: false }
            setWalletUser(user)
            localStorage.setItem('flowshield_wallet', JSON.stringify(user))
            checkComplianceStatus(addr)
            if (popup && !popup.closed) popup.close()
          }
        }
      } catch { /* ignore malformed messages */ }
    }

    window.addEventListener('message', handleMessage)

    // Timeout: if popup is blocked or no response in 60s, stop connecting
    const timeout = setTimeout(() => {
      window.removeEventListener('message', handleMessage)
      setConnecting(false)
    }, 60000)

    // Poll for popup close
    const pollClose = setInterval(() => {
      if (popup && popup.closed) {
        clearInterval(pollClose)
        clearTimeout(timeout)
        window.removeEventListener('message', handleMessage)
        setConnecting(false)
      }
    }, 500)
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

  // Not connected — show connect button
  if (!walletUser) {
    return (
      <button
        onClick={handleConnect}
        disabled={connecting}
        className="flex items-center gap-2 h-9 px-3 rounded-lg border border-white/[0.06] bg-white/[0.02] text-[12px] font-medium text-white/50 hover:text-white/70 hover:border-white/[0.1] transition-all"
      >
        {connecting ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Connecting...</span>
          </>
        ) : (
          <>
            <Wallet className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Connect Wallet</span>
            <span className="sm:hidden">Wallet</span>
          </>
        )}
      </button>
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
