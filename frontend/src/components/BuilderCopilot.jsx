import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'

const EXAMPLE_PROMPTS = [
  "Why is my risk score 15? How can I improve it?",
  "What does depositing do and is it safe?",
  "How do I add compliance to my lending pool?",
  "Explain MiCA vs FinCEN in simple terms",
  "How much money does FlowShield save vs hiring lawyers?",
  "What happens to my identity data?",
]

// Fallback responses when backend is unavailable or Claude API has no credits
const FALLBACK_RESPONSES = {
  risk: `**Your Risk Score Explained**\n\nYour risk score is calculated from **public on-chain data only** — no personal information is used. Here's what affects it:\n\n**Factors checked (8 total):**\n- Account age (< 7 days = +15 pts, < 30 days = +8 pts)\n- High transaction volume in 24h (> 50 txs = +20 pts)\n- Rapid in-out patterns (+25 pts)\n- Flagged contract interactions (+30 pts)\n- Mixer/privacy tool usage (+35 pts)\n- Multiple funding sources > 5 (+15 pts)\n- Dormant then suddenly active (+12 pts)\n\n**Tiers:**\n- **0–30**: Compliant ✓ (full access)\n- **31–70**: Semi-compliant (deposits OK, borrows limited)\n- **71–100**: Non-compliant (restricted)\n\n**How to improve:** Keep your account active over time, avoid rapid in-out patterns, and use fewer funding sources. Your score updates automatically as your on-chain behavior changes.\n\nClick the Risk Score card on the dashboard for a full visual breakdown!`,
  deposit: `**What is Depositing?**\n\nWhen you deposit, you're supplying liquidity to the **DemoLendingPool** smart contract on Flow.\n\n**How it works:**\n1. You enter an amount and click Deposit\n2. FlowShield automatically checks your compliance credential on-chain\n3. If compliant, the deposit goes through — a real transaction on Flow testnet\n4. You earn **4.2% APY** on your deposits\n5. Other users can borrow from the pool\n\n**Is it safe?** Yes — this is on Flow testnet (free test tokens, not real money). Every transaction is compliance-verified on-chain via \`ComplianceAction.verify()\`.\n\n**Gas fees?** Completely **free** — FlowShield sponsors all gas fees so users pay nothing.\n\nAfter depositing, you'll see a real transaction hash and a link to view it on FlowDiver (block explorer).`,
  borrow: `**What is Borrowing?**\n\nBorrowing lets you take a loan from the lending pool using your deposits as collateral.\n\n**Key details:**\n- **LTV ratio**: 75% (you can borrow up to 75% of your deposits)\n- **Interest rate**: 2.8%\n- **Compliance**: Requires FULL compliance (\`verifyFull()\`) — stricter than deposits\n- **Gas fees**: Sponsored by FlowShield (free for users)\n\n**Example:** If you deposited $1,000, you can borrow up to $750.\n\nBorrowing requires a higher compliance tier because it's a higher-risk DeFi action. This is how real-world regulations work — different actions have different compliance thresholds.`,
  identity: `**Your Identity Data is 100% Private**\n\nFlowShield uses **Zero-Knowledge (ZK) proofs** — here's what that means:\n\n1. You verify your identity once (via biometrics — fingerprint or Face ID)\n2. A ZK proof is generated **on your device**\n3. Only the proof goes on-chain — **never your actual identity data**\n4. The blockchain only sees: "this person is verified" (true/false)\n\n**What's stored on-chain:**\n- ComplianceCredential (tier: compliant/semi/non)\n- Risk score (0-100 number)\n- Expiry date\n- ZK proof hash\n\n**What's NEVER on-chain:**\n- Name, email, address\n- Government ID\n- Biometric data\n- Any personally identifiable information (PII)\n\nThis is what makes FlowShield unique: **compliance WITHOUT sacrificing privacy**.`,
  savings: `**How FlowShield Saves Money**\n\nTraditional compliance costs for DeFi protocols:\n- Compliance lawyers: **$300-600/hour**\n- Full compliance setup: **$50,000-200,000+**\n- Ongoing monitoring: **$10,000-50,000/year**\n- Per-jurisdiction licensing: **$5,000-25,000 each**\n\n**With FlowShield:**\n- One smart contract import: **free**\n- 5 jurisdictions built-in: **included**\n- Automated rule updates: **included**\n- ZK-based KYC: **included**\n\nFlowShield replaces an entire compliance department with a single line of code. For startups and indie builders, this is the difference between shipping and not shipping.`,
  gas: `**Gas Fees on FlowShield**\n\nAll gas fees are **sponsored** — users pay absolutely nothing.\n\n**How it works:**\n- FlowShield uses Flow's **Sponsored Transactions** feature\n- The protocol pays gas on behalf of users (~0.001 FLOW per transaction)\n- This is a fraction of a penny\n- Users never see gas fees, never need to hold FLOW tokens\n\nThis is one of Flow's killer features: **frictionless transactions**. Unlike Ethereum where users need ETH for gas, Flow allows protocols to sponsor transaction costs.\n\n**For the hackathon demo:** We're on testnet, so all tokens are free. But even on mainnet, gas would be less than $0.001 per transaction.`,
  lending: `Great choice. Here's what FlowShield provides for a multi-jurisdiction lending pool:\n\n**Compliance Configuration**\n- US (FinCEN): Travel Rule at $3,000, BSA/AML screening\n- EU (MiCA): Travel Rule at €1,000, enhanced due diligence\n\n**Integration (one line)**\n\`\`\`cadence\nimport ComplianceAction from 0x93c691a98b975493\n\ntransaction(amount: UFix64) {\n  prepare(acct: auth(Storage) &Account) {\n    let isCompliant = ComplianceAction.verify(acct.address)\n    assert(isCompliant, message: "Compliance check failed")\n    LendingPool.deposit(from: acct, amount: amount)\n  }\n}\n\`\`\`\n\n**What happens behind the scenes:**\n1. FlowShield checks the user's ComplianceCredential\n2. Verifies the ZK proof is valid and not expired\n3. Confirms the amount is within jurisdiction limits\n4. Returns a boolean — your contract never touches identity data.`,
  dex: `For a DEX on Flow, compliance requirements depend on your target jurisdictions.\n\n**Minimum viable compliance:**\n- Import FlowShield and call \`verify()\` before each swap\n- Travel Rule reporting for swaps above jurisdiction thresholds\n- Sanctions screening via ZK proof (no PII on-chain)\n\n\`\`\`cadence\nimport ComplianceAction from 0x93c691a98b975493\n\nlet verified = ComplianceAction.verify(trader.address)\nassert(verified, message: "User not compliant")\n\`\`\`\n\nFlowShield handles the rest: credential validation, proof verification, and jurisdiction-specific rules.`,
  mica: `**MiCA (Markets in Crypto-Assets Regulation)** took full effect in December 2024.\n\n**Key requirements:**\n- Travel Rule: transfers above **€1,000**\n- Enhanced due diligence for high-risk txs\n- DORA compliance\n- Full record-keeping\n\n**vs FinCEN (US):**\n- Travel Rule: transfers above **$3,000**\n- BSA/AML screening\n- FinCEN registration required\n- Suspicious Activity Reports (SARs)\n\n**FlowShield handles both** — the RuleEngine contract stores jurisdiction-specific rules on-chain. When you call \`verify()\`, it automatically applies the right rules for the user's jurisdiction.\n\nNo need to hire separate compliance teams for each country.`,
  default: `I can help with anything about FlowShield! Here are some things I know about:\n\n**For Users:**\n- Why your risk score is what it is and how to improve it\n- What deposits and borrows actually do\n- How your identity data stays private (ZK proofs)\n- What gas fees are (spoiler: you pay nothing)\n- What different jurisdictions require\n\n**For Developers:**\n- One-line compliance integration in Cadence\n- 5 jurisdiction support (US, EU, UK, SG, CA)\n- How ZK proofs work with FlowShield\n- Setting up automated compliance monitoring\n\nWhat would you like to know?`,
}

function getFallbackResponse(message) {
  const lower = message.toLowerCase()
  // User-facing questions
  if (lower.includes('risk') || lower.includes('score') || lower.includes('15') || lower.includes('improve') || lower.includes('factor')) return FALLBACK_RESPONSES.risk
  if (lower.includes('deposit') && (lower.includes('what') || lower.includes('safe') || lower.includes('how') || lower.includes('mean'))) return FALLBACK_RESPONSES.deposit
  if (lower.includes('borrow') && (lower.includes('what') || lower.includes('how') || lower.includes('mean'))) return FALLBACK_RESPONSES.borrow
  if (lower.includes('identity') || lower.includes('data') || lower.includes('privacy') || lower.includes('private') || lower.includes('pii') || lower.includes('zk')) return FALLBACK_RESPONSES.identity
  if (lower.includes('save') || lower.includes('money') || lower.includes('cost') || lower.includes('lawyer') || lower.includes('price')) return FALLBACK_RESPONSES.savings
  if (lower.includes('gas') || lower.includes('fee') || lower.includes('free') || lower.includes('sponsor') || lower.includes('frictionless')) return FALLBACK_RESPONSES.gas
  // Developer questions
  if (lower.includes('lending') || lower.includes('lend') || lower.includes('pool') || lower.includes('integrate')) return FALLBACK_RESPONSES.lending
  if (lower.includes('dex') || lower.includes('swap') || lower.includes('exchange') || lower.includes('trade')) return FALLBACK_RESPONSES.dex
  if (lower.includes('mica') || lower.includes('fincen') || lower.includes('regulat') || lower.includes('jurisdiction')) return FALLBACK_RESPONSES.mica
  if (lower.includes('cadence') || lower.includes('contract') || lower.includes('generate')) return FALLBACK_RESPONSES.lending
  // Deposit/borrow without context
  if (lower.includes('deposit')) return FALLBACK_RESPONSES.deposit
  if (lower.includes('borrow')) return FALLBACK_RESPONSES.borrow
  return FALLBACK_RESPONSES.default
}

export default function BuilderCopilot() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hey! I'm the FlowShield Copilot. I can help with:\n\n**For Users** — Understand your risk score, compliance status, how deposits/borrows work, and what your data means.\n\n**For Developers** — Integrate compliance into your DeFi protocol with Cadence code, jurisdiction rules, and regulatory guidance.\n\nWhat would you like to know?`,
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
