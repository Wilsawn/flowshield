import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import FlowShieldLogo from '@/components/FlowShieldLogo'

const navItems = [
  { label: 'Pricing', path: '/pricing' },
  { label: 'Docs', path: '/docs' },
]

export default function FloatingNav({ onLaunch }: { onLaunch: () => void }) {
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#0a0a0a]/80 backdrop-blur-lg border-b border-white/[0.06] shadow-[0_1px_12px_rgba(0,0,0,0.3)]'
          : 'bg-[#0a0a0a]/40 backdrop-blur-md border-b border-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between py-3 sm:py-4">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity duration-150"
        >
          <FlowShieldLogo size={20} />
          <span className="text-[14px] font-semibold text-white/90 tracking-tight">FlowShield</span>
        </button>

        <div className="flex items-center gap-1">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() => {
                if (item.external) {
                  window.open(item.path, '_blank')
                } else {
                  navigate(item.path)
                }
              }}
              className="text-[13px] text-white/60 hover:text-white/90 transition-colors duration-150 px-3 py-1.5 rounded-md hover:bg-white/[0.04]"
            >
              {item.label}
            </button>
          ))}

          <button
            onClick={onLaunch}
            className="text-[12px] sm:text-[13px] font-medium text-[#0a0a0a] bg-white px-3 sm:px-4 py-1.5 rounded-full ml-1 sm:ml-2 transition-all duration-200 ease-out hover:bg-white/95 hover:scale-[1.03] active:scale-[0.98]"
            aria-label="Launch FlowShield app"
          >
            Try FlowShield
          </button>
        </div>
      </div>
    </nav>
  )
}
