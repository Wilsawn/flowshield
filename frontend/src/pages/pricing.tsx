
import { useNavigate } from 'react-router-dom'
import PricingSection from '@/components/PricingSection'

export default function PricingPage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-full flex flex-col">
      <div className="mb-10 text-center">
        <h1 className="font-display text-[2rem] font-bold tracking-tight text-white">Simple, transparent pricing</h1>
        <p className="text-[14px] text-white/35 mt-2">Start free, no credit card required.</p>
      </div>
      <PricingSection />
      <p className="mt-auto pt-8 border-t border-white/[0.06] text-center text-[12px] text-white/35">
        <button type="button" onClick={() => navigate('/terms')} className="hover:text-white/55 transition-colors">Terms</button>
        <span className="mx-2">·</span>
        <button type="button" onClick={() => navigate('/terms#refunds')} className="hover:text-white/55 transition-colors">Refunds</button>
        <span className="mx-2">·</span>
        <button type="button" onClick={() => navigate('/privacy')} className="hover:text-white/55 transition-colors">Privacy</button>
      </p>
    </div>
  )
}
