import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Lock, Eye, EyeOff, Copy, Check, Fingerprint } from 'lucide-react'

export default function ZKProofBadge({ compact = false }) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  // Read ZK proof data from user session
  let zkData = null
  try {
    const stored = localStorage.getItem('flowshield_user')
    if (stored) {
      const user = JSON.parse(stored)
      zkData = user.zkProof || null
    }
  } catch { /* ignore */ }

  const copyHash = () => {
    if (zkData?.proofHash) {
      navigator.clipboard.writeText(zkData.proofHash)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!zkData) return null

  // Compact version for inline use in status strip
  if (compact) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <Lock className="w-3 h-3 text-violet-400/60" />
        <span className="text-violet-400/60">ZK Proof</span>
        <span className="text-white/20 font-mono">
          {zkData.proofHash?.slice(0, 8)}...
        </span>
      </span>
    )
  }

  // Full badge with expandable details
  return (
    <motion.div
      layout
      className="rounded-xl border border-violet-500/15 bg-violet-500/[0.03] overflow-hidden"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-violet-500/[0.03] transition-colors"
      >
        <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
          <Shield className="w-4 h-4 text-violet-400" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-[12px] font-medium text-violet-300">Zero-Knowledge Proof</p>
          <p className="text-[10px] text-white/30">
            {zkData.method === 'groth16' ? 'Groth16 (real)' : 'Simulated'} · Identity never on-chain
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-semibold tracking-wide uppercase ${
            zkData.verified
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
          }`}>
            {zkData.verified ? 'Verified' : 'Generated'}
          </span>
          {expanded ? (
            <EyeOff className="w-3.5 h-3.5 text-white/20" />
          ) : (
            <Eye className="w-3.5 h-3.5 text-white/20" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-violet-500/10 pt-3">
              {/* Proof Hash */}
              <div>
                <p className="text-[10px] text-white/25 uppercase tracking-wider font-semibold mb-1">Proof Hash (SHA-256)</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-[11px] text-violet-300/70 font-mono bg-black/20 px-3 py-2 rounded-lg break-all">
                    {zkData.proofHash || 'N/A'}
                  </code>
                  <button
                    onClick={copyHash}
                    className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors shrink-0"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-white/30" />
                    )}
                  </button>
                </div>
              </div>

              {/* What's proven */}
              <div>
                <p className="text-[10px] text-white/25 uppercase tracking-wider font-semibold mb-1.5">What This Proves</p>
                <div className="space-y-1.5">
                  {[
                    { label: 'KYC completed', detail: 'Identity verified off-chain' },
                    { label: 'Jurisdiction valid', detail: 'Approved regulatory region' },
                    { label: 'Risk score within bounds', detail: 'Below compliance threshold' },
                    { label: 'Credential not expired', detail: 'Valid for 90 days' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full bg-violet-400/50 shrink-0" />
                      <span className="text-[11px] text-white/50">{item.label}</span>
                      <span className="text-[10px] text-white/20">— {item.detail}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* What's NOT revealed */}
              <div className="rounded-lg bg-black/20 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Fingerprint className="w-3.5 h-3.5 text-violet-400/60" />
                  <p className="text-[10px] text-violet-400/60 uppercase tracking-wider font-semibold">Never Revealed</p>
                </div>
                <p className="text-[11px] text-white/30 leading-relaxed">
                  Name, date of birth, document number, address, photo — none of this data exists on-chain or leaves your device. Only the mathematical proof is stored.
                </p>
              </div>

              {/* Method */}
              <div className="flex items-center gap-4 text-[10px] text-white/20">
                <span>Method: <span className="text-white/40">{zkData.method === 'groth16' ? 'Groth16 (BN256)' : 'Simulated (SHA-256)'}</span></span>
                <span>Circuit: <span className="text-white/40">compliance.circom</span></span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
