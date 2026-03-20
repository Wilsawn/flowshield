import { useState, useEffect } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, MessageSquare, Settings, ArrowLeft, Menu, X, Fingerprint, Globe, Key, LogOut, Coins, BookOpen, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import FlowShieldLogo from '@/components/FlowShieldLogo'
import { API } from '@/lib/api'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/copilot', label: 'Builder Copilot', icon: MessageSquare },
  { to: '/operator', label: 'Operator', icon: Settings },
  { to: '/pricing', label: 'Pricing', icon: Coins },
  { to: '/docs', label: 'Docs', icon: BookOpen },
]

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [bottomOpen, setBottomOpen] = useState(false)
  const [backendStatus, setBackendStatus] = useState({ connected: false, network: '', address: '' })
  const [user, setUser] = useState<any>(null)
  const [showColdStartToast, setShowColdStartToast] = useState(false)

  const handleLogout = () => {
    localStorage.removeItem('flowshield_token')
    localStorage.removeItem('flowshield_wallet')
    localStorage.removeItem('flowshield_user')
    localStorage.removeItem('flowshield_email')
    setUser(null)
    setSidebarOpen(false)
    navigate('/')
  }

  useEffect(() => {
    try {
      const stored = localStorage.getItem('flowshield_user')
      if (stored) setUser(JSON.parse(stored))
    } catch { /* no session */ }

    const onStorage = () => {
      try {
        const stored = localStorage.getItem('flowshield_user')
        if (stored) setUser(JSON.parse(stored))
      } catch { /* ignore */ }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useEffect(() => {
    try {
      const stored = localStorage.getItem('flowshield_user')
      if (stored) setUser(JSON.parse(stored))
    } catch { /* ignore */ }
  }, [location.pathname])

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowColdStartToast(prev => !backendStatus.connected ? true : prev)
    }, 3000)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (backendStatus.connected && showColdStartToast) {
      const timer = setTimeout(() => setShowColdStartToast(false), 1500)
      return () => clearTimeout(timer)
    }
  }, [backendStatus.connected, showColdStartToast])

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const res = await fetch(`${API}/health`)
        if (res.ok) {
          const data = await res.json()
          setBackendStatus({ connected: true, network: data.network || 'testnet', address: data.contractAddress || '' })
        }
      } catch { setBackendStatus(prev => ({ ...prev, connected: false })) }
    }
    checkBackend()
    const interval = setInterval(checkBackend, 30000)
    return () => clearInterval(interval)
  }, [])

  const sidebarContent = (
    <>
      <div className="p-5 border-b border-emerald-500/[0.06]">
        <NavLink to="/" className="flex items-center gap-2.5 group" onClick={() => setSidebarOpen(false)}>
          <FlowShieldLogo size={24} />
          <div>
            <h1 className="text-[14px] font-semibold tracking-tight text-white">FlowShield</h1>
            <p className="text-[10px] text-white/25 tracking-wider uppercase">Compliance for DeFi</p>
          </div>
        </NavLink>
      </div>

      <nav className="p-3 space-y-0.5 shrink-0">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors duration-150 ${
                isActive
                  ? 'bg-white/[0.07] text-white/90'
                  : 'text-white/35 hover:text-white/60 hover:bg-white/[0.03]'
              }`
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="flex-1 min-h-0" aria-hidden="true" />

      <div className="border-t border-emerald-500/[0.06] shrink-0">
        <button
          onClick={() => setBottomOpen(!bottomOpen)}
          className="w-full flex items-center justify-between px-3 py-2.5 text-[11px] text-white/25 hover:text-white/40 transition-colors duration-150"
        >
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${backendStatus.connected ? 'bg-emerald-400' : 'bg-white/20'}`} />
            <span>{user ? (user.displayName || user.email?.split('@')[0]) : (backendStatus.connected ? `Flow ${backendStatus.network}` : 'Connecting...')}</span>
          </div>
          {bottomOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>

        <AnimatePresence>
          {bottomOpen && (
            <motion.div
              className="px-3 pb-3 pt-0.5 space-y-1.5 overflow-hidden"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              {user ? (
                <div className="px-3 py-2.5 rounded-xl border border-white/[0.08] bg-[#0a0f0c]/95">
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-full bg-white/[0.06] flex items-center justify-center shrink-0">
                      <Fingerprint className="w-3.5 h-3.5 text-white/40" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-white/70 truncate">{user.displayName || user.email?.split('@')[0]}</p>
                      <p className="text-[10px] text-white/25 truncate">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-white/[0.06] text-white/40 font-medium">
                      <Key className="w-2.5 h-2.5" /> Passkey
                    </span>
                    {user.jurisdiction && (
                      <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-white/[0.06] text-white/40 font-medium">
                        <Globe className="w-2.5 h-2.5" /> {user.jurisdiction}
                      </span>
                    )}
                    <button
                      onClick={handleLogout}
                      className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors duration-150 ml-auto"
                      title="Sign out"
                    >
                      <LogOut className="w-2.5 h-2.5" /> Sign out
                    </button>
                  </div>
                </div>
              ) : (
                <NavLink
                  to="/"
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-[12px] text-white/40 hover:text-white/60 transition-colors duration-150 rounded-lg hover:bg-white/[0.03]"
                >
                  <Fingerprint className="h-3.5 w-3.5" />
                  Sign up with Passkey
                </NavLink>
              )}

              {backendStatus.address ? (
                <a
                  href={`https://testnet.flowscan.io/account/${backendStatus.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-white/[0.03] transition-colors duration-150 group"
                >
                  <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-emerald-400" />
                  <span className="text-[10px] text-white/25 group-hover:text-white/40 transition-colors font-mono truncate">
                    Flow {backendStatus.network} · {backendStatus.address.slice(0, 6)}...{backendStatus.address.slice(-4)}
                  </span>
                </a>
              ) : (
                <div className="flex items-center gap-2.5 px-3 py-1.5">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-white/20" />
                  <span className="text-[10px] text-white/25 truncate">
                    {backendStatus.connected ? `Flow ${backendStatus.network}` : 'Connecting...'}
                  </span>
                </div>
              )}

              <NavLink
                to="/"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-2 px-3 py-1.5 text-[11px] text-white/20 hover:text-white/40 transition-colors duration-150 rounded-lg hover:bg-white/[0.03]"
              >
                <ArrowLeft className="h-3 w-3" />
                Home
              </NavLink>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )

  return (
    <div className="flex h-screen relative bg-[#060e09] text-white">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-56 border-r border-emerald-500/[0.06] bg-[#060e09] flex-col relative z-10">
        {sidebarContent}
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 border-b border-emerald-500/[0.06] bg-[#060e09]/95 backdrop-blur-sm flex items-center justify-between px-4">
        <NavLink to="/" className="flex items-center gap-2">
          <FlowShieldLogo size={20} />
          <span className="text-[14px] font-semibold text-white">FlowShield</span>
        </NavLink>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-white/50 hover:text-white/80 hover:bg-white/[0.04] transition-colors duration-150"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              className="md:hidden fixed inset-0 z-40 bg-black/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              className="md:hidden fixed top-14 left-0 bottom-0 w-56 z-50 border-r border-emerald-500/[0.06] bg-[#060e09] flex flex-col"
              initial={{ x: -224 }}
              animate={{ x: 0 }}
              exit={{ x: -224 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main className="flex-1 overflow-auto relative z-10 pt-14 md:pt-0">
        <div className="p-4 sm:p-6 md:p-8 lg:p-10">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <Outlet />
          </motion.div>
        </div>
      </main>

      {/* Cold-start toast */}
      <AnimatePresence>
        {showColdStartToast && !backendStatus.connected && (
          <motion.div
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-xl border border-white/[0.08] bg-[#0a0f0c]/95 backdrop-blur-sm shadow-[0_4px_24px_rgba(0,0,0,0.4)]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <Loader2 className="w-4 h-4 text-white/40 animate-spin shrink-0" />
            <p className="text-[12px] text-white/50">Getting things ready...</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
