import BuilderCopilot from '@/components/BuilderCopilot'

export default function CopilotPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-[1.75rem] font-bold tracking-tight text-white">Builder Copilot</h1>
        <p className="text-[13px] text-white/30 mt-1">
          Describe your protocol, get compliance configuration and Cadence code.
        </p>
      </div>
      <BuilderCopilot />
    </div>
  )
}
