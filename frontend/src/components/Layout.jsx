import { useState, useEffect } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, MessageSquare, Settings, ArrowLeft, Menu, X, Fingerprint, Globe, Key, LogOut } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import GlowOrbs from '@/components/GlowOrbs'
import FlowShieldLogo from '@/components/FlowShieldLogo'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/copilot', label: 'Builder Copilot', icon: MessageSquare },
  { to: '/operator', label: 'Operator', icon: Settings },
]

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [backendStatus, setBackendStatus] = useState({ connected: false, network: '', address: '' })
  const [user, setUser] = useState(null)

  const handleLogout = () => {
    localStorage.removeItem('flowshield_user')
    setUser(null)
    setSidebarOpen(false)
    navigate('/')
  }

  // Load user session from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('flowshield_user')
      if (stored) setUser(JSON.parse(stored))
    } catch { /* no session */ }

    // Listen for storage changes (e.g. onboarding completes in same tab)
    const onStorage = () => {
      try {
        const stored = localStorage.getItem('flowshield_user')
        if (stored) setUser(JSON.parse(stored))
      } catch { /* ignore */ }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // Re-check user session when navigating (handles onboarding → dashboard)
  useEffect(() => {
    try {
      const stored = localStorage.getItem('flowshield_user')
      if (stored) setUser(JSON.parse(stored))
    } catch { /* ignore */ }
  }, [location.pathname])

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const API = import.meta.env.VITE_API_URL || 'http://localhost:3002'
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
      {/* Logo */}
      <div className="p-5 border-b border-white/[0.04]">
        <NavLink to="/" className="flex items-center gap-2.5 group" onClick={() => setSidebarOpen(false)}>
          <FlowShieldLogo size={26} />
          <div>
            <h1 className="text-[15px] font-semibold tracking-tight text-white">FlowShield</h1>
            <p className="text-[10px] text-white/25 tracking-wider uppercase">Compliance Infrastructure</p>
          </div>
        </NavLink>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map(({ to, label, icon: Icon }, i) => (
          <motion.div
            key={to}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08, duration: 0.3 }}
          >
            <NavLink
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-emerald-500/[0.08] text-emerald-400'
                    : 'text-white/35 hover:text-white/60 hover:bg-white/[0.03]'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          </motion.div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-white/[0.04] space-y-1">
        {/* User Profile — shows after onboarding */}
        {user ? (
          <div className="px-3 py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <Fingerprint className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-white/70 truncate">{user.displayName || user.email?.split('@')[0]}</p>
                <p className="text-[10px] text-white/25 truncate">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400/70 font-medium">
                <Key className="w-2.5 h-2.5" /> Passkey
              </span>
              {user.jurisdiction && (
                <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400/70 font-medium">
                  <Globe className="w-2.5 h-2.5" /> {user.jurisdiction}
                </span>
              )}
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-white/[0.04] text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all ml-auto"
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
            className="flex items-center gap-2 px-3 py-2 text-[12px] text-emerald-400/60 hover:text-emerald-400 transition-colors rounded-lg hover:bg-white/[0.03]"
          >
            <Fingerprint className="h-3.5 w-3.5" />
            Sign up with Passkey
          </NavLink>
        )}

        {/* Protocol Status */}
        <a
          href={backendStatus.address ? `https://testnet.flowscan.io/account/${backendStatus.address}` : '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-white/[0.03] transition-colors group"
          title={backendStatus.address ? `View ${backendStatus.address} on Flowscan` : ''}
        >
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${backendStatus.connected ? 'bg-emerald-400 animate-pulse' : 'bg-white/20'}`} />
          <span className="text-[10px] text-white/25 group-hover:text-white/40 transition-colors truncate">
            {backendStatus.connected ? `Flow ${backendStatus.network}` : 'Connecting...'} {backendStatus.address ? `· ${backendStatus.address.slice(0, 6)}...${backendStatus.address.slice(-4)}` : ''}
          </span>
        </a>

        <NavLink
          to="/"
          onClick={() => setSidebarOpen(false)}
          className="flex items-center gap-2 px-3 py-1.5 text-[11px] text-white/20 hover:text-white/40 transition-colors rounded-lg hover:bg-white/[0.03]"
        >
          <ArrowLeft className="h-3 w-3" />
          Home
        </NavLink>

        {/* Powered by Flow badge */}
        <a
          href="https://flow.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 px-3 py-2 mt-1 rounded-lg bg-gradient-to-r from-emerald-500/[0.04] to-cyan-500/[0.04] border border-white/[0.03] hover:border-emerald-500/15 transition-all group"
        >
          <span className="text-[9px] text-white/20 group-hover:text-white/35 transition-colors font-medium tracking-wide">POWERED BY</span>
          <span className="text-[10px] font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">FLOW</span>
        </a>
      </div>
    </>
  )

  return (
    <div className="flex h-screen relative bg-[#060a13] text-white">
      <GlowOrbs />

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-60 border-r border-white/[0.04] bg-[#060a13]/80 flex-col relative z-10 backdrop-blur-sm">
        {sidebarContent}
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 border-b border-white/[0.04] bg-[#060a13]/90 backdrop-blur-sm flex items-center justify-between px-4">
        <NavLink to="/" className="flex items-center gap-2">
          <FlowShieldLogo size={22} />
          <span className="text-[14px] font-semibold text-white">FlowShield</span>
        </NavLink>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-white/50 hover:text-white/80 hover:bg-white/[0.04] transition-colors"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              className="md:hidden fixed top-14 left-0 bottom-0 w-60 z-50 border-r border-white/[0.04] bg-[#060a13] flex flex-col"
              initial={{ x: -240 }}
              animate={{ x: 0 }}
              exit={{ x: -240 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main className="flex-1 overflow-auto relative z-10 pt-14 md:pt-0">
        <div className="p-4 sm:p-6 md:p-10">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
