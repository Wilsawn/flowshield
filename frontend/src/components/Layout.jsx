import { useState, useEffect } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, MessageSquare, Settings, ArrowLeft, Menu, X } from 'lucide-react'
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
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [backendStatus, setBackendStatus] = useState({ connected: false, network: '', address: '' })

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
      <div className="p-3 border-t border-white/[0.04]">
        <NavLink
          to="/"
          onClick={() => setSidebarOpen(false)}
          className="flex items-center gap-2 px-3 py-2 text-[12px] text-white/25 hover:text-white/50 transition-colors rounded-lg hover:bg-white/[0.03]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Home
        </NavLink>
        <a
          href={backendStatus.address ? `https://www.flowdiver.io/account/${backendStatus.address.replace('0x','')}` : '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-3 py-2 mt-1 rounded-lg hover:bg-white/[0.03] transition-colors group"
          title={backendStatus.address ? `View ${backendStatus.address} on FlowDiver` : ''}
        >
          <div className={`h-7 w-7 rounded-full flex items-center justify-center ${backendStatus.connected ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-white/[0.04] border border-white/[0.06]'}`}>
            <span className={`w-2 h-2 rounded-full ${backendStatus.connected ? 'bg-emerald-400 animate-pulse' : 'bg-white/20'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-white/60 truncate">
              {backendStatus.connected ? `Flow ${backendStatus.network}` : 'Connecting...'}
            </p>
            <p className="text-[10px] text-white/20 group-hover:text-cyan-400/50 font-mono truncate transition-colors">
              {backendStatus.address || '—'}
            </p>
          </div>
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
