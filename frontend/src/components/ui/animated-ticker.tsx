import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

export default function AnimatedTicker({ value, prefix = "", suffix = "", decimals = 0, className, duration = 1.5 }) {
  const numValue = typeof value === 'number' && !isNaN(value) ? value : 0
  const isNonNumeric = value == null || value === '—' || (typeof value === 'number' && isNaN(value))
  const [display, setDisplay] = useState(0)
  const ref = useRef(null)
  const hasAnimated = useRef(false)

  useEffect(() => {
    hasAnimated.current = false
  }, [numValue])

  useEffect(() => {
    if (isNonNumeric) return
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
            setDisplay(startVal + (numValue - startVal) * eased)
            if (progress < 1) requestAnimationFrame(animate)
          }
          requestAnimationFrame(animate)
        }
      },
      { threshold: 0.1 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [numValue, duration, isNonNumeric])

  if (isNonNumeric) {
    return <span ref={ref} className={cn("tabular-nums", className)}>{prefix}—{suffix}</span>
  }

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {prefix}{display.toFixed(decimals)}{suffix}
    </span>
  )
}
