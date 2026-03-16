import { cn } from "@/lib/utils"

export default function AuroraBackground({ className, children }) {
  return (
    <div className={cn("relative overflow-hidden", className)}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-[40%] -left-[20%] w-[70%] h-[70%] rounded-full opacity-[0.07] blur-[120px] animate-[auroraMove1_15s_ease-in-out_infinite]"
          style={{ background: 'radial-gradient(circle, #34d399, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-[30%] -right-[20%] w-[60%] h-[60%] rounded-full opacity-[0.05] blur-[120px] animate-[auroraMove2_18s_ease-in-out_infinite]"
          style={{ background: 'radial-gradient(circle, #06b6d4, transparent 70%)' }}
        />
        <div
          className="absolute top-[20%] left-[30%] w-[40%] h-[40%] rounded-full opacity-[0.04] blur-[100px] animate-[auroraMove3_12s_ease-in-out_infinite]"
          style={{ background: 'radial-gradient(circle, #34d399, transparent 70%)' }}
        />
      </div>
      {children}
    </div>
  )
}
