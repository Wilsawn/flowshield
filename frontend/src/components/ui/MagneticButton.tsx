/**
 * MagneticButton — Framer Motion “magnetic” cursor-follow effect.
 * Button subtly follows the cursor when it’s nearby; feels premium without being loud.
 * Restrained strength and range to match FlowShield design system.
 */
import { useRef, useCallback } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'

const defaultSpring = { stiffness: 200, damping: 20 }

export default function MagneticButton({
  children,
  className = '',
  strength = 0.15,
  range = 80,
  spring = defaultSpring,
  disabled = false,
  ...rest
}) {
  const ref = useRef(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const springX = useSpring(x, spring)
  const springY = useSpring(y, spring)

  const handleMove = useCallback(
    (e) => {
      if (disabled || !ref.current) return
      const rect = ref.current.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const dx = e.clientX - cx
      const dy = e.clientY - cy
      const dist = Math.hypot(dx, dy)
      if (dist > range) {
        x.set(0)
        y.set(0)
        return
      }
      const pull = (1 - dist / range) * strength
      x.set(dx * pull)
      y.set(dy * pull)
    },
    [disabled, range, strength, x, y]
  )

  const handleLeave = useCallback(() => {
    x.set(0)
    y.set(0)
  }, [x, y])

  return (
    <motion.span
      ref={ref}
      className={`inline-block ${className}`}
      style={{
        x: springX,
        y: springY,
      }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      {...rest}
    >
      {children}
    </motion.span>
  )
}
