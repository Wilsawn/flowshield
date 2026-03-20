import { ShieldCheck, RefreshCw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function JurisdictionChangeModal({ jurisdictionChanging, reVerifySteps }) {
  return (
    <AnimatePresence>
      {jurisdictionChanging && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-md mx-4 rounded-xl border border-emerald-500/[0.08] bg-[#0a1410] p-8"
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-amber-400 animate-spin" />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-white">Jurisdiction Change</h3>
                <p className="text-[12px] text-white/30">Re-verifying compliance credentials</p>
              </div>
            </div>

            <div className="space-y-3">
              {reVerifySteps.map((s, i) => (
                <motion.div
                  key={i}
                  className="flex items-center gap-3"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-[12px] text-emerald-400/80">{s.label}</span>
                </motion.div>
              ))}
            </div>

            {/* Progress bar */}
            <div className="mt-6 h-1 bg-emerald-500/[0.04] rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-emerald-400 rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: `${(reVerifySteps.length / 5) * 100}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
