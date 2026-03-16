import { useNavigate } from 'react-router-dom'
import PricingSection from '@/components/PricingSection'

export default function PricingPage() {
  const navigate = useNavigate()
  return (
    <div>
      <div className="mb-8">
        <p className="text-[12px] font-medium text-emerald-400/80 mb-2">Start with a free trial — no credit card required</p>
        <h1 className="font-display text-[1.75rem] font-bold tracking-tight text-white">Plans</h1>
        <p className="text-[13px] text-white/40 mt-1">For protocols, operators, and teams.</p>
      </div>
      <PricingSection />
      <p className="mt-12 pt-8 border-t border-emerald-500/[0.06] text-center text-[12px] text-white/35">
        <button type="button" onClick={() => navigate('/terms')} className="hover:text-white/55 transition-colors">Terms</button>
        <span className="mx-2">·</span>
        <button type="button" onClick={() => navigate('/terms#refunds')} className="hover:text-white/55 transition-colors">Refunds</button>
        <span className="mx-2">·</span>
        <button type="button" onClick={() => navigate('/privacy')} className="hover:text-white/55 transition-colors">Privacy</button>
      </p>
    </div>
  )
}
