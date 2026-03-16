import { useEffect, useRef } from 'react'
import { createNoise3D } from 'simplex-noise'

interface NoiseGridProps {
  className?: string
  cellSize?: number
  speed?: number
  opacity?: number
}

export default function NoiseGrid({
  className = '',
  cellSize = 40,
  speed = 0.0004,
  opacity = 0.12,
}: NoiseGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const noise3D = createNoise3D()
    let animationId: number
    let startTime = performance.now()

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2)
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.scale(dpr, dpr)
    }

    const draw = (time: number) => {
      const elapsed = (time - startTime) * speed
      const rect = canvas.getBoundingClientRect()
      const w = rect.width
      const h = rect.height

      ctx.clearRect(0, 0, w, h)

      const cols = Math.ceil(w / cellSize) + 1
      const rows = Math.ceil(h / cellSize) + 1

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = col * cellSize
          const y = row * cellSize

          const n = noise3D(col * 0.08, row * 0.08, elapsed)
          const val = (n + 1) / 2

          const alpha = val * opacity
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
          ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2)
        }
      }

      animationId = requestAnimationFrame(draw)
    }

    resize()
    animationId = requestAnimationFrame(draw)

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(canvas)

    return () => {
      cancelAnimationFrame(animationId)
      resizeObserver.disconnect()
    }
  }, [cellSize, speed, opacity])

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      style={{ opacity: 0.6 }}
    />
  )
}
