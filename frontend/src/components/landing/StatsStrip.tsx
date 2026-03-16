import { motion } from 'framer-motion'

interface Stat {
  value: string
  label: string
}

interface StatsStripProps {
  context?: string
  stats: Stat[]
  className?: string
}

export default function StatsStrip({ context, stats, className = '' }: StatsStripProps) {
  return (
    <motion.div
      className={`py-8 border-y border-white/[0.06] ${className}`.trim()}
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      {context && (
        <p className="text-[11px] font-medium tracking-[0.06em] uppercase text-white/30 text-center mb-4">
          {context}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4">
        {stats.map((stat, i) => (
          <div key={i} className="flex items-baseline gap-2">
            <span className="text-[20px] font-semibold tracking-tight text-white/90">
              {stat.value}
            </span>
            <span className="text-[13px] text-white/35">{stat.label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
