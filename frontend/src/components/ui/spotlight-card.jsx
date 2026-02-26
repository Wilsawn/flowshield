import { useRef, useState } from "react"
import { cn } from "@/lib/utils"

export default function SpotlightCard({ children, className, onClick }) {
  const ref = useRef(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [opacity, setOpacity] = useState(0)

  const handleMouseMove = (e) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  return (
    <div
      ref={ref}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      className={cn(
        "relative rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden transition-colors duration-500 hover:border-white/[0.1]",
        className
      )}
    >
      <div
        className="pointer-events-none absolute -inset-px rounded-2xl transition-opacity duration-500"
        style={{
          opacity,
          background: `radial-gradient(600px circle at ${pos.x}px ${pos.y}px, rgba(52,211,153,0.06), transparent 40%)`,
        }}
      />
      {children}
    </div>
  )
}
