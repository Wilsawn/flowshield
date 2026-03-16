import { motion } from 'framer-motion'
import { Blocks, Timer, Bot, Fingerprint, Box, CreditCard } from 'lucide-react'

const primitives = [
  { icon: Blocks, label: 'Flow Actions', desc: 'Composable DeFi workflows' },
  { icon: Timer, label: 'Scheduled Transactions', desc: 'Autonomous on-chain automation' },
  { icon: Bot, label: 'Flow Agents', desc: 'AI-driven compliance monitoring' },
  { icon: Fingerprint, label: 'WebAuthn / Passkeys', desc: 'Walletless onboarding' },
  { icon: Box, label: 'Cadence Resources', desc: 'Secure credential storage' },
  { icon: CreditCard, label: 'Sponsored Transactions', desc: 'Zero-gas user experience' },
]

function PrimitiveCard({ icon: Icon, label, desc }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3 rounded-xl glass hover:glow-green transition-all shrink-0 group cursor-default">
      <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
        <Icon className="h-4 w-4 text-emerald-400" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  )
}

export default function PrimitivesMarquee() {
  return (
    <div className="relative overflow-hidden py-6">
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-r from-background to-transparent" />
      <div className="absolute right-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-l from-background to-transparent" />

      <motion.div
        className="flex w-max"
        animate={{ x: ['0%', '-50%'] }}
        transition={{
          x: {
            duration: 30,
            repeat: Infinity,
            ease: 'linear',
          },
        }}
      >
        {/* Copy 1 */}
        <div className="flex gap-6 shrink-0">
          {primitives.map(({ icon, label, desc }) => (
            <PrimitiveCard key={label} icon={icon} label={label} desc={desc} />
          ))}
        </div>
        {/* Copy 2 */}
        <div className="flex gap-6 shrink-0 ml-6">
          {primitives.map(({ icon, label, desc }) => (
            <PrimitiveCard key={`dup-${label}`} icon={icon} label={label} desc={desc} />
          ))}
        </div>
      </motion.div>
    </div>
  )
}
