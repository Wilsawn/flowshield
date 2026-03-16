import { motion } from 'framer-motion'

interface SectionLabelProps {
  children: React.ReactNode
  className?: string
  animate?: boolean
}

export default function SectionLabel({ children, className = '', animate = true }: SectionLabelProps) {
  const base = 'text-[11px] font-medium tracking-[0.08em] uppercase text-white/35'
  const combined = `${base} ${className}`.trim()

  if (animate) {
    return (
      <motion.p
        className={combined}
        initial={{ opacity: 0, y: 4 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        {children}
      </motion.p>
    )
  }

  return <p className={combined}>{children}</p>
}
