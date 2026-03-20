/**
 * TiltCard — mouse-follow 3D tilt for a cool, premium card feel.
 * Keeps motion restrained (design system): subtle max tilt, smooth spring.
 * Use on hero cards, bento cells, or feature panels.
 */
import { useRef, useCallback, useState } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'

const defaultSpring = { stiffness: 300, damping: 30 }

export default function TiltCard({
  children,
  className = '',
  style = {},
  maxTilt = 8,
  scaleOnHover = 1.02,
  perspective = 1000,
  spring = defaultSpring,
  disabled = false,
  ...rest
}) {
  const cardRef = useRef(null)
  const [hovered, setHovered] = useState(false)
  const x = useMotionValue(0.5)
  const y = useMotionValue(0.5)

  const rotateX = useTransform(y, [0, 1], [maxTilt, -maxTilt])
  const rotateY = useTransform(x, [0, 1], [-maxTilt, maxTilt])

  const springRotateX = useSpring(rotateX, spring)
  const springRotateY = useSpring(rotateY, spring)

  const handleMove = useCallback(
    (e) => {
      if (disabled || !cardRef.current) return
      const rect = cardRef.current.getBoundingClientRect()
      const mx = (e.clientX - rect.left) / rect.width
      const my = (e.clientY - rect.top) / rect.height
      x.set(mx)
      y.set(my)
    },
    [disabled, x, y]
  )

  const handleLeave = useCallback(() => {
    x.set(0.5)
    y.set(0.5)
    setHovered(false)
  }, [x, y])

  const handleEnter = useCallback(() => setHovered(true), [])

  return (
    <motion.div
      ref={cardRef}
      className={className}
      style={{
        perspective,
        transformStyle: 'preserve-3d',
        ...style,
      }}
      onMouseMove={handleMove}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      {...rest}
    >
      <motion.div
        style={{
          rotateX: springRotateX,
          rotateY: springRotateY,
          transformStyle: 'preserve-3d',
          backfaceVisibility: 'hidden',
        }}
        animate={{ scale: disabled ? 1 : hovered ? scaleOnHover : 1 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}
