import { useNavigate } from 'react-router-dom'
import { ArrowLeft, FileQuestion } from 'lucide-react'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#060e09] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] mb-8">
          <FileQuestion className="w-10 h-10 text-amber-400/80" />
        </div>
        <p className="font-display text-[4rem] md:text-[5rem] font-bold text-white/[0.08] leading-none mb-2">404</p>
        <h1 className="font-display text-2xl font-bold text-white mb-3">
          This page failed the compliance check.
        </h1>
        <p className="text-[15px] text-white/50 mb-2">
          Our agents ran a full audit. This URL doesn&apos;t exist — and we have zero PII to prove otherwise.
        </p>
        <p className="text-[13px] text-white/30 mb-8">
          (We&apos;re kidding. It&apos;s just a 404.)
        </p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 text-[#060e09] font-semibold text-sm hover:bg-emerald-400 hover:shadow-[0_0_30px_rgba(52,211,153,0.25)] transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to compliant territory
        </button>
      </div>
    </div>
  )
}
