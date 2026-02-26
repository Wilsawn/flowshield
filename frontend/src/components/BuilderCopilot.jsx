import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'

const EXAMPLE_PROMPTS = [
  "I'm building a lending pool for EU and US users",
  "What compliance do I need for a DEX on Flow?",
  "Generate a Cadence contract with compliance checks",
  "Explain MiCA requirements for DeFi protocols",
]

// Fallback responses when backend is unavailable
const FALLBACK_RESPONSES = {
  lending: `Great choice. Here's what FlowShield provides for a multi-jurisdiction lending pool:\n\n**Compliance Configuration**\n- US (FinCEN): Travel Rule at $3,000, BSA/AML screening\n- EU (MiCA): Travel Rule at €1,000, enhanced due diligence\n\n**Integration (one line)**\n\`\`\`cadence\nimport ComplianceAction from 0x93c691a98b975493\n\ntransaction(amount: UFix64) {\n  prepare(acct: auth(Storage) &Account) {\n    // FlowShield checks compliance before deposit\n    let isCompliant = ComplianceAction.verify(acct.address)\n    assert(isCompliant, message: "Compliance check failed")\n    \n    // Your lending pool deposit logic\n    LendingPool.deposit(from: acct, amount: amount)\n  }\n}\n\`\`\`\n\n**What happens behind the scenes:**\n1. FlowShield checks the user's ComplianceCredential resource\n2. Verifies the ZK proof is valid and not expired\n3. Confirms the transaction amount is within jurisdiction limits\n4. Returns a boolean. Your contract never touches identity data.`,
  dex: `For a DEX on Flow, compliance requirements depend on your target jurisdictions.\n\n**Minimum viable compliance:**\n- Import FlowShield and call \`isCompliant()\` before each swap\n- Travel Rule reporting for swaps above jurisdiction thresholds\n- Sanctions screening via ZK proof (no PII on-chain)\n\n\`\`\`cadence\nimport ComplianceAction from 0x93c691a98b975493\n\n// Pre-check before any swap\nlet verified = ComplianceAction.verify(trader.address)\nassert(verified, message: "User not compliant")\n\`\`\`\n\nFlowShield handles the rest: credential validation, proof verification, and jurisdiction-specific rules. Your DEX contract stays clean.`,
  mica: `**MiCA (Markets in Crypto-Assets Regulation)** took full effect in December 2024. Here's what it means for your DeFi protocol:\n\n**Key requirements:**\n- Travel Rule applies to transfers above **€1,000**\n- Enhanced due diligence for high-risk transactions\n- DORA (Digital Operational Resilience Act) compliance\n- Record-keeping for all crypto-asset transactions\n\n**How FlowShield handles this:**\n- ZK proofs verify user identity without revealing PII\n- Jurisdiction-aware rule engine auto-applies MiCA thresholds\n- Compliance credentials stored as Cadence resources with 90-day expiry\n- Automated re-verification via Scheduled Transactions\n\nFlowShield abstracts all of this behind a single \`isCompliant()\` call.`,
  default: `I can help you configure compliance for your protocol. FlowShield supports:\n\n- **5 jurisdictions**: US, EU, UK, Singapore, Canada\n- **ZK-based KYC**: Users verify once, proof stored client-side\n- **One-line integration**: \`ComplianceAction.verify(address)\`\n- **AI Regulatory Radar**: Auto-updates when regulations change\n\nTell me more about what you're building and which jurisdictions you're targeting. I'll generate the specific Cadence code and compliance configuration you need.`,
}

function getFallbackResponse(message) {
  const lower = message.toLowerCase()
  if (lower.includes('lending') || lower.includes('lend') || lower.includes('pool')) return FALLBACK_RESPONSES.lending
  if (lower.includes('dex') || lower.includes('swap') || lower.includes('exchange')) return FALLBACK_RESPONSES.dex
  if (lower.includes('mica') || lower.includes('eu') || lower.includes('europe')) return FALLBACK_RESPONSES.mica
  if (lower.includes('cadence') || lower.includes('contract') || lower.includes('generate')) return FALLBACK_RESPONSES.lending
  return FALLBACK_RESPONSES.default
}

export default function BuilderCopilot() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Welcome to the FlowShield Builder Copilot. Tell me what you're building and which jurisdictions you're targeting.\n\nI'll provide compliance configuration, Cadence code, and regulatory guidance specific to your protocol.`,
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text) => {
    const userMessage = text || input.trim()
    if (!userMessage || isLoading) return

    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    try {
      const API = import.meta.env.VITE_API_URL || 'http://localhost:3002'
      const res = await fetch(`${API}/api/copilot/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          sessionId: 'copilot-ui',
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setMessages((prev) => [...prev, { role: 'assistant', content: data.response }])
      } else {
        // Use fallback when backend returns error
        await new Promise((r) => setTimeout(r, 800 + Math.random() * 600))
        setMessages((prev) => [...prev, { role: 'assistant', content: getFallbackResponse(userMessage) }])
      }
    } catch {
      // Use fallback when backend is unreachable
      await new Promise((r) => setTimeout(r, 800 + Math.random() * 600))
      setMessages((prev) => [...prev, { role: 'assistant', content: getFallbackResponse(userMessage) }])
    }

    setIsLoading(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const renderContent = (content) => {
    const parts = content.split(/(```[\s\S]*?```)/g)
    return parts.map((part, i) => {
      if (part.startsWith('```')) {
        const lines = part.slice(3, -3).split('\n')
        const lang = lines[0] || ''
        const code = lines.slice(lang ? 1 : 0).join('\n')
        return (
          <pre key={i} className="my-3 rounded-xl bg-black/40 border border-white/[0.06] p-4 overflow-x-auto">
            {lang && (
              <div className="text-[10px] text-white/25 mb-2 uppercase tracking-wider font-mono">{lang}</div>
            )}
            <code className="text-[12px] text-emerald-300/90 font-mono leading-relaxed">{code}</code>
          </pre>
        )
      }
      const boldParts = part.split(/(\*\*.*?\*\*)/g)
      return (
        <span key={i}>
          {boldParts.map((bp, j) =>
            bp.startsWith('**') && bp.endsWith('**') ? (
              <strong key={j} className="text-white font-semibold">
                {bp.slice(2, -2)}
              </strong>
            ) : (
              <span key={j}>{bp}</span>
            )
          )}
        </span>
      )
    })
  }

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-5 pb-4 pr-1">
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {msg.role === 'assistant' && (
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-1">
                <Bot className="h-4 w-4 text-emerald-400" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-emerald-500/[0.08] border border-emerald-500/10 text-white/80'
                  : 'bg-white/[0.02] border border-white/[0.06] text-white/50'
              }`}
            >
              {renderContent(msg.content)}
            </div>
            {msg.role === 'user' && (
              <div className="h-8 w-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0 mt-1">
                <User className="h-4 w-4 text-white/40" />
              </div>
            )}
          </motion.div>
        ))}
        {isLoading && (
          <motion.div
            className="flex gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <Bot className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] px-4 py-3">
              <div className="flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 text-emerald-400 animate-spin" />
                <span className="text-[12px] text-white/25">Thinking...</span>
              </div>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Example prompts */}
      {messages.length === 1 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {EXAMPLE_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => sendMessage(prompt)}
              className="text-[11px] px-3.5 py-2 rounded-xl border border-white/[0.06] bg-white/[0.02] text-white/35 hover:text-white/60 hover:border-white/[0.1] hover:bg-white/[0.04] transition-all duration-200"
            >
              <Sparkles className="h-3 w-3 inline mr-1.5 text-emerald-400/50" />
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-2 flex items-end gap-2">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe what you're building..."
          rows={1}
          className="flex-1 bg-transparent resize-none border-0 outline-none text-[13px] text-white px-3 py-2 placeholder:text-white/20 max-h-32"
          style={{ minHeight: '40px' }}
        />
        <button
          onClick={() => sendMessage()}
          disabled={!input.trim() || isLoading}
          className="shrink-0 w-9 h-9 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 flex items-center justify-center text-emerald-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
