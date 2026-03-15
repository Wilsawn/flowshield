import BuilderCopilot from '@/components/BuilderCopilot'

export default function CopilotPage() {
  return (
    <div className="h-full">
      <div className="mb-6">
        <h1 className="font-display text-[1.75rem] font-bold tracking-tight text-white">Builder Copilot</h1>
        <p className="text-[13px] text-white/40 mt-1">Ask about compliance, integration, risk, and Cadence.</p>
      </div>
      <BuilderCopilot />
    </div>
  )
}
