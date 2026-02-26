import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

export default function AnimatedTicker({ value, prefix = "", suffix = "", decimals = 0, className, duration = 1.5 }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef(null)
  const hasAnimated = useRef(false)

  useEffect(() => {
    // Re-animate whenever value changes
    hasAnimated.current = false
  }, [value])

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true
          const startVal = display
          const start = performance.now()
          const animate = (now) => {
            const elapsed = (now - start) / 1000
            const progress = Math.min(elapsed / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3)
            setDisplay(startVal + (value - startVal) * eased)
            if (progress < 1) requestAnimationFrame(animate)
          }
          requestAnimationFrame(animate)
        }
      },
      { threshold: 0.1 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [value, duration])

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {prefix}{display.toFixed(decimals)}{suffix}
    </span>
  )
}
