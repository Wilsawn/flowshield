import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Copy, Check, ArrowDown, Shield, Code, BookOpen, Zap, Globe, Lock, ChevronRight, Upload, FileCode, Scan, AlertTriangle, Activity, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import FlowShieldLogo from '@/components/FlowShieldLogo'

const BASE_SUGGESTION_CARDS = [
  { icon: Shield, label: 'Risk Score', prompt: 'Why is my risk score what it is and how can I improve it?', color: 'emerald' },
  { icon: Code, label: 'Integrate', prompt: 'How do I add compliance to my lending pool?', color: 'cyan' },
  { icon: BookOpen, label: 'Regulations', prompt: 'Explain MiCA vs FinCEN in simple terms', color: 'violet' },
  { icon: Lock, label: 'ZK Privacy', prompt: 'What happens to my identity data?', color: 'amber' },
  { icon: Zap, label: 'Gas Fees', prompt: 'How do sponsored transactions work?', color: 'emerald' },
  { icon: Globe, label: 'Jurisdictions', prompt: 'What jurisdictions does FlowShield support?', color: 'cyan' },
]

// Context-aware cards shown when anomalies or risk factors are active
const ALERT_SUGGESTION_CARDS = [
  { icon: AlertTriangle, label: 'My Anomalies', prompt: 'I have active anomalies detected. What do they mean and how should I respond?', color: 'amber' },
  { icon: Activity, label: 'Risk Factors', prompt: 'What are my current risk factors and how can I reduce my risk score?', color: 'amber' },
  { icon: Shield, label: 'Fix Compliance', prompt: 'What steps should I take to get back to compliant status?', color: 'emerald' },
  { icon: Scan, label: 'Scan My Code', prompt: 'I want to scan my smart contract code for compliance issues', color: 'cyan' },
]

// Fallback responses when backend is unavailable or Claude API has no credits
const FALLBACK_RESPONSES = {
  risk: `**Your Risk Score Explained**\n\nYour risk score is calculated from **public on-chain data only** — no personal information is used. Here's what affects it:\n\n**Factors checked (8 total):**\n- Account age (< 7 days = +15 pts, < 30 days = +8 pts)\n- High transaction volume in 24h (> 50 txs = +20 pts)\n- Rapid in-out patterns (+25 pts)\n- Flagged contract interactions (+30 pts)\n- Mixer/privacy tool usage (+35 pts)\n- Multiple funding sources > 5 (+15 pts)\n- Dormant then suddenly active (+12 pts)\n\n**Tiers:**\n- **0–30**: Compliant ✓ (full access)\n- **31–70**: Semi-compliant (deposits OK, borrows limited)\n- **71–100**: Non-compliant (restricted)\n\n**How to improve:** Keep your account active over time, avoid rapid in-out patterns, and use fewer funding sources. Your score updates automatically as your on-chain behavior changes.\n\nClick the Risk Score card on the dashboard for a full visual breakdown!`,
  deposit: `**What is Depositing?**\n\nWhen you deposit, you're supplying liquidity to the **DemoLendingPool** smart contract on Flow.\n\n**How it works:**\n1. You enter an amount and click Deposit\n2. FlowShield automatically checks your compliance credential on-chain\n3. If compliant, the deposit goes through — a real transaction on Flow testnet\n4. You earn **4.2% APY** on your deposits\n5. Other users can borrow from the pool\n\n**Is it safe?** Yes — this is on Flow testnet (free test tokens, not real money). Every transaction is compliance-verified on-chain via \`ComplianceAction.verify()\`.\n\n**Gas fees?** Completely **free** — FlowShield sponsors all gas fees so users pay nothing.\n\nAfter depositing, you'll see a real transaction hash and a link to view it on Flowscan (block explorer).`,
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
  if (lower.includes('risk') || lower.includes('score') || lower.includes('15') || lower.includes('improve') || lower.includes('factor')) return FALLBACK_RESPONSES.risk
  if (lower.includes('deposit') && (lower.includes('what') || lower.includes('safe') || lower.includes('how') || lower.includes('mean'))) return FALLBACK_RESPONSES.deposit
  if (lower.includes('borrow') && (lower.includes('what') || lower.includes('how') || lower.includes('mean'))) return FALLBACK_RESPONSES.borrow
  if (lower.includes('identity') || lower.includes('data') || lower.includes('privacy') || lower.includes('private') || lower.includes('pii') || lower.includes('zk')) return FALLBACK_RESPONSES.identity
  if (lower.includes('save') || lower.includes('money') || lower.includes('cost') || lower.includes('lawyer') || lower.includes('price')) return FALLBACK_RESPONSES.savings
  if (lower.includes('gas') || lower.includes('fee') || lower.includes('free') || lower.includes('sponsor') || lower.includes('frictionless')) return FALLBACK_RESPONSES.gas
  if (lower.includes('lending') || lower.includes('lend') || lower.includes('pool') || lower.includes('integrate')) return FALLBACK_RESPONSES.lending
  if (lower.includes('dex') || lower.includes('swap') || lower.includes('exchange') || lower.includes('trade')) return FALLBACK_RESPONSES.dex
  if (lower.includes('mica') || lower.includes('fincen') || lower.includes('regulat') || lower.includes('jurisdiction')) return FALLBACK_RESPONSES.mica
  if (lower.includes('cadence') || lower.includes('contract') || lower.includes('generate')) return FALLBACK_RESPONSES.lending
  if (lower.includes('deposit')) return FALLBACK_RESPONSES.deposit
  if (lower.includes('borrow')) return FALLBACK_RESPONSES.borrow
  return FALLBACK_RESPONSES.default
}

// ── Typing indicator with 3 bouncing dots ──
function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-1 py-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-emerald-400"
          animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

// ── Code block with copy button ──
function CodeBlock({ lang, code }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="my-3 rounded-xl bg-[#0a0f1a] border border-white/[0.06] overflow-hidden group">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.04] bg-white/[0.01]">
        <span className="text-[10px] text-white/20 uppercase tracking-wider font-mono">{lang || 'code'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[10px] text-white/20 hover:text-white/50 transition-colors opacity-0 group-hover:opacity-100"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto">
        <code className="text-[12px] text-emerald-300/80 font-mono leading-relaxed">{code}</code>
      </pre>
    </div>
  )
}

// ── Rich markdown renderer ──
function RichContent({ content }) {
  const lines = content.split('\n')
  const elements = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Code blocks
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim()
      const codeLines = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      i++ // skip closing ```
      elements.push(<CodeBlock key={elements.length} lang={lang} code={codeLines.join('\n')} />)
      continue
    }

    // Tables
    if (line.includes('|') && line.trim().startsWith('|')) {
      const tableRows = []
      while (i < lines.length && lines[i].includes('|') && lines[i].trim().startsWith('|')) {
        const cells = lines[i].split('|').filter(c => c.trim()).map(c => c.trim())
        if (!lines[i].match(/^\|[\s-|]+\|$/)) {
          tableRows.push(cells)
        }
        i++
      }
      if (tableRows.length > 0) {
        elements.push(
          <div key={elements.length} className="my-3 rounded-lg border border-white/[0.06] overflow-hidden">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-white/[0.03]">
                  {tableRows[0].map((cell, ci) => (
                    <th key={ci} className="px-3 py-2 text-left text-white/40 font-medium border-b border-white/[0.04]">
                      <InlineMarkdown text={cell} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.slice(1).map((row, ri) => (
                  <tr key={ri} className="border-b border-white/[0.03] last:border-0">
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-3 py-2 text-white/40">
                        <InlineMarkdown text={cell} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
      continue
    }

    // Headings
    if (line.startsWith('# ')) {
      elements.push(<h2 key={elements.length} className="text-[16px] font-bold text-white mt-4 mb-2">{line.slice(2)}</h2>)
      i++; continue
    }
    if (line.startsWith('## ')) {
      elements.push(<h3 key={elements.length} className="text-[14px] font-semibold text-white/90 mt-3 mb-1.5">{line.slice(3)}</h3>)
      i++; continue
    }
    if (line.startsWith('### ')) {
      elements.push(<h4 key={elements.length} className="text-[13px] font-semibold text-white/80 mt-2 mb-1">{line.slice(4)}</h4>)
      i++; continue
    }

    // List items
    if (line.match(/^[\s]*[-*]\s/)) {
      const listItems = []
      while (i < lines.length && lines[i].match(/^[\s]*[-*]\s/)) {
        listItems.push(lines[i].replace(/^[\s]*[-*]\s/, ''))
        i++
      }
      elements.push(
        <ul key={elements.length} className="my-1.5 space-y-1">
          {listItems.map((item, li) => (
            <li key={li} className="flex items-start gap-2 text-[13px] text-white/45 leading-relaxed">
              <span className="w-1 h-1 rounded-full bg-emerald-400/50 mt-2 shrink-0" />
              <span><InlineMarkdown text={item} /></span>
            </li>
          ))}
        </ul>
      )
      continue
    }

    // Numbered list
    if (line.match(/^\d+\.\s/)) {
      const listItems = []
      while (i < lines.length && lines[i].match(/^\d+\.\s/)) {
        listItems.push(lines[i].replace(/^\d+\.\s/, ''))
        i++
      }
      elements.push(
        <ol key={elements.length} className="my-1.5 space-y-1">
          {listItems.map((item, li) => (
            <li key={li} className="flex items-start gap-2.5 text-[13px] text-white/45 leading-relaxed">
              <span className="text-[11px] text-emerald-400/60 font-mono mt-0.5 shrink-0 w-4 text-right">{li + 1}.</span>
              <span><InlineMarkdown text={item} /></span>
            </li>
          ))}
        </ol>
      )
      continue
    }

    // Empty lines
    if (line.trim() === '') {
      elements.push(<div key={elements.length} className="h-2" />)
      i++; continue
    }

    // Regular paragraph
    elements.push(
      <p key={elements.length} className="text-[13px] text-white/45 leading-relaxed">
        <InlineMarkdown text={line} />
      </p>
    )
    i++
  }

  return <>{elements}</>
}

// ── Inline markdown (bold, code, links) ──
function InlineMarkdown({ text }) {
  const parts = text.split(/(\*\*.*?\*\*|`[^`]+`|\[.*?\]\(.*?\))/g)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="text-white/80 font-semibold">{part.slice(2, -2)}</strong>
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return <code key={i} className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400/80 text-[11px] font-mono">{part.slice(1, -1)}</code>
        }
        const linkMatch = part.match(/\[(.*?)\]\((.*?)\)/)
        if (linkMatch) {
          return <a key={i} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" className="text-emerald-400/70 hover:text-emerald-400 underline underline-offset-2 decoration-emerald-400/20">{linkMatch[1]}</a>
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

export default function BuilderCopilot() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const messagesEndRef = useRef(null)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)

  // Live context from user's on-chain state
  const [liveContext, setLiveContext] = useState(null)
  const [contextLoading, setContextLoading] = useState(true)

  // Code import / scanner state
  const [showCodeInput, setShowCodeInput] = useState(false)
  const [codeInput, setCodeInput] = useState('')
  const [codeLanguage, setCodeLanguage] = useState('cadence')
  const [isScanning, setIsScanning] = useState(false)

  const API = import.meta.env.VITE_API_URL || 'http://localhost:3002'

  // Fetch user's live context on mount
  useEffect(() => {
    const fetchContext = async () => {
      try {
        const address = '0x93c691a98b975493'
        const [riskRes, monitorRes, demoRes] = await Promise.allSettled([
          fetch(`${API}/api/risk/score`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address }),
          }).then(r => r.json()),
          fetch(`${API}/api/risk/monitor`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address }),
          }).then(r => r.json()),
          fetch(`${API}/api/risk/monitor/demo-status`).then(r => r.json()),
        ])

        const risk = riskRes.status === 'fulfilled' ? riskRes.value : {}
        const monitor = monitorRes.status === 'fulfilled' ? monitorRes.value : {}
        const demo = demoRes.status === 'fulfilled' ? demoRes.value : {}

        setLiveContext({
          riskScore: risk.score ?? null,
          riskTier: risk.tier || null,
          riskFactors: risk.factors || [],
          anomalies: monitor.anomalies || [],
          anomalyCount: monitor.anomalyCount ?? 0,
          demoMode: demo.active || risk.demoMode || false,
          walletBalance: risk.walletData?.balance ?? null,
        })
      } catch { /* context unavailable */ }
      setContextLoading(false)
    }
    fetchContext()
    // Re-fetch context every 15s to stay current
    const interval = setInterval(fetchContext, 15000)
    return () => clearInterval(interval)
  }, [API])

  // Dynamic suggestion cards based on context
  const SUGGESTION_CARDS = (liveContext?.anomalyCount > 0 || (liveContext?.riskScore ?? 0) > 30)
    ? ALERT_SUGGESTION_CARDS
    : BASE_SUGGESTION_CARDS

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Show/hide scroll-to-bottom button
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100
      setShowScrollBtn(!atBottom)
    }
    el.addEventListener('scroll', onScroll)
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  const sendMessage = async (text) => {
    const userMessage = text || input.trim()
    if (!userMessage || isLoading) return

    // If code is attached, prepend it to the message
    let fullMessage = userMessage
    if (codeInput.trim()) {
      fullMessage = `${userMessage}\n\nHere's my code (${codeLanguage}):\n\`\`\`${codeLanguage}\n${codeInput.trim()}\n\`\`\``
      setCodeInput('')
      setShowCodeInput(false)
    }

    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: fullMessage }])
    setIsLoading(true)

    try {
      const res = await fetch(`${API}/api/copilot/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: fullMessage,
          sessionId: 'copilot-ui',
          context: liveContext,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setMessages((prev) => [...prev, { role: 'assistant', content: data.response }])
      } else {
        await new Promise((r) => setTimeout(r, 800 + Math.random() * 600))
        setMessages((prev) => [...prev, { role: 'assistant', content: getFallbackResponse(fullMessage) }])
      }
    } catch {
      await new Promise((r) => setTimeout(r, 800 + Math.random() * 600))
      setMessages((prev) => [...prev, { role: 'assistant', content: getFallbackResponse(fullMessage) }])
    }

    setIsLoading(false)
    inputRef.current?.focus()
  }

  // Scan code for compliance issues
  const handleScanCode = async () => {
    if (!codeInput.trim() || isScanning) return
    setIsScanning(true)
    setMessages((prev) => [...prev, { role: 'user', content: `Scan this ${codeLanguage} code for compliance issues:\n\n\`\`\`${codeLanguage}\n${codeInput.trim()}\n\`\`\`` }])
    setIsLoading(true)

    try {
      const res = await fetch(`${API}/api/copilot/scan-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeInput.trim(), language: codeLanguage }),
      })
      if (res.ok) {
        const data = await res.json()
        setMessages((prev) => [...prev, { role: 'assistant', content: data.analysis }])
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', content: 'Failed to scan code. Please try again.' }])
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Code scanner unavailable. Please try again later.' }])
    }

    setCodeInput('')
    setShowCodeInput(false)
    setIsScanning(false)
    setIsLoading(false)
    inputRef.current?.focus()
  }

  // Handle file upload
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setCodeInput(ev.target.result)
      setShowCodeInput(true)
      // Auto-detect language from file extension
      const ext = file.name.split('.').pop()?.toLowerCase()
      if (ext === 'cdc') setCodeLanguage('cadence')
      else if (ext === 'sol') setCodeLanguage('solidity')
      else if (ext === 'rs') setCodeLanguage('rust')
      else if (ext === 'js' || ext === 'ts') setCodeLanguage('javascript')
      else if (ext === 'py') setCodeLanguage('python')
    }
    reader.readAsText(file)
    e.target.value = '' // Reset for re-upload
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const isEmptyState = messages.length === 0

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] max-w-[860px] mx-auto">

      {/* ── Messages area ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto relative">
        {/* Empty state */}
        <AnimatePresence>
          {isEmptyState && (
            <motion.div
              className="flex flex-col items-center justify-center h-full px-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              {/* Flow-style gradient orb */}
              <div className="relative mb-8">
                <motion.div
                  className="absolute inset-0 w-20 h-20 rounded-full bg-emerald-500/20 blur-xl"
                  animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.5, 0.3] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                />
                <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-white/[0.06] flex items-center justify-center backdrop-blur-sm">
                  <FlowShieldLogo size={36} />
                </div>
              </div>

              <h2 className="text-[22px] font-bold text-white mb-2 text-center">
                Builder Copilot
              </h2>
              <p className="text-[13px] text-white/30 mb-1 text-center max-w-md">
                AI-powered compliance assistant for Flow developers and users
              </p>
              <p className="text-[11px] text-white/15 mb-10 text-center">
                Powered by Claude &middot; Flow Testnet
              </p>

              {/* Suggestion cards grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 w-full max-w-lg">
                {SUGGESTION_CARDS.map((card, i) => {
                  const Icon = card.icon
                  return (
                    <motion.button
                      key={card.label}
                      onClick={() => sendMessage(card.prompt)}
                      className={`group relative flex flex-col items-start gap-2 p-3.5 rounded-xl border text-left transition-all duration-300 ${
                        card.color === 'emerald' ? 'border-emerald-500/10 hover:border-emerald-500/25 hover:bg-emerald-500/[0.04]' :
                        card.color === 'cyan' ? 'border-cyan-500/10 hover:border-cyan-500/25 hover:bg-cyan-500/[0.04]' :
                        card.color === 'violet' ? 'border-violet-500/10 hover:border-violet-500/25 hover:bg-violet-500/[0.04]' :
                        'border-amber-500/10 hover:border-amber-500/25 hover:bg-amber-500/[0.04]'
                      } bg-white/[0.01]`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 + i * 0.05 }}
                    >
                      <Icon className={`w-4 h-4 ${
                        card.color === 'emerald' ? 'text-emerald-400/60' :
                        card.color === 'cyan' ? 'text-cyan-400/60' :
                        card.color === 'violet' ? 'text-violet-400/60' :
                        'text-amber-400/60'
                      }`} />
                      <div>
                        <p className="text-[12px] font-medium text-white/60 group-hover:text-white/80 transition-colors">{card.label}</p>
                        <p className="text-[10px] text-white/20 mt-0.5 line-clamp-2 leading-relaxed">{card.prompt}</p>
                      </div>
                      <ChevronRight className="w-3 h-3 text-white/10 absolute top-3.5 right-3 group-hover:text-white/30 transition-colors" />
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages */}
        {!isEmptyState && (
          <div className="space-y-6 py-6 px-1">
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {msg.role === 'user' ? (
                  /* ── User message ── */
                  <div className="flex justify-end">
                    <div className="max-w-[75%] px-4 py-3 rounded-2xl rounded-br-md bg-gradient-to-br from-emerald-500/[0.12] to-cyan-500/[0.06] border border-emerald-500/15 text-[13px] text-white/75 leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  /* ── Assistant message ── */
                  <div className="flex gap-3">
                    <div className="shrink-0 mt-1">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500/15 to-cyan-500/10 border border-emerald-500/20 flex items-center justify-center">
                        <FlowShieldLogo size={14} />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-white/20 mb-1.5 font-medium">FlowShield Copilot</div>
                      <div className="text-[13px] leading-relaxed">
                        <RichContent content={msg.content} />
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}

            {/* Typing indicator */}
            {isLoading && (
              <motion.div
                className="flex gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="shrink-0 mt-1">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500/15 to-cyan-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <FlowShieldLogo size={14} />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-[10px] text-white/20 mb-1.5 font-medium">FlowShield Copilot</div>
                  <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <TypingIndicator />
                    <span className="text-[11px] text-white/15">Thinking...</span>
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Scroll to bottom FAB */}
        <AnimatePresence>
          {showScrollBtn && !isEmptyState && (
            <motion.button
              onClick={scrollToBottom}
              className="fixed bottom-32 right-1/2 translate-x-1/2 w-8 h-8 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white/40 hover:text-white/60 hover:bg-white/[0.1] transition-all backdrop-blur-sm z-20 shadow-lg"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* ── Input area ── */}
      <div className="pt-3 pb-1">
        {/* Live context banner */}
        {liveContext && !contextLoading && (
          <div className="flex items-center gap-2 mb-2 px-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="text-[10px] text-white/25">
              Context: Risk {liveContext.riskScore ?? '—'}/100
              {liveContext.anomalyCount > 0 && <span className="text-amber-400/70"> · {liveContext.anomalyCount} anomalies</span>}
              {liveContext.demoMode && <span className="text-cyan-400/70"> · Demo active</span>}
              {liveContext.riskFactors?.length > 0 && <span className="text-amber-400/50"> · {liveContext.riskFactors.length} risk factors</span>}
            </span>
          </div>
        )}

        {/* Quick follow-up suggestions after conversation starts */}
        {messages.length > 0 && messages.length < 4 && !isLoading && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {SUGGESTION_CARDS.filter((_, i) => i < 3).map((card) => (
              <button
                key={card.label}
                onClick={() => sendMessage(card.prompt)}
                className="text-[10px] px-2.5 py-1.5 rounded-lg border border-white/[0.05] bg-white/[0.01] text-white/25 hover:text-white/50 hover:border-white/[0.1] transition-all duration-200"
              >
                {card.label}
              </button>
            ))}
          </div>
        )}

        {/* Code import panel */}
        <AnimatePresence>
          {showCodeInput && (
            <motion.div
              className="mb-3 rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.04]">
                <div className="flex items-center gap-2">
                  <FileCode className="w-3.5 h-3.5 text-cyan-400/60" />
                  <span className="text-[11px] text-white/40 font-medium">Import Code</span>
                  <select
                    value={codeLanguage}
                    onChange={(e) => setCodeLanguage(e.target.value)}
                    className="text-[10px] bg-[#0d1117] border border-white/[0.06] rounded-md px-2 py-0.5 text-white/50 outline-none [&>option]:bg-[#0d1117] [&>option]:text-white/70"
                  >
                    <option value="cadence">Cadence</option>
                    <option value="solidity">Solidity</option>
                    <option value="javascript">JavaScript</option>
                    <option value="rust">Rust</option>
                    <option value="python">Python</option>
                  </select>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleScanCode}
                    disabled={!codeInput.trim() || isScanning}
                    className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 transition-all disabled:opacity-30"
                  >
                    <Scan className="w-3 h-3" />
                    {isScanning ? 'Scanning...' : 'Scan for Compliance'}
                  </button>
                  <button
                    onClick={() => { setShowCodeInput(false); setCodeInput('') }}
                    className="text-white/20 hover:text-white/50 transition-colors p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <textarea
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                placeholder={`Paste your ${codeLanguage} code here...`}
                rows={6}
                className="w-full bg-transparent resize-none border-0 outline-none text-[12px] text-emerald-300/70 font-mono px-3 py-2.5 placeholder:text-white/10 leading-relaxed"
              />
              {codeInput.trim() && (
                <div className="px-3 pb-2 flex items-center gap-2">
                  <span className="text-[9px] text-white/15">{codeInput.split('\n').length} lines · {codeInput.length} chars</span>
                  <span className="text-[9px] text-white/10">·</span>
                  <span className="text-[9px] text-white/15">Ask a question or click "Scan for Compliance"</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative rounded-2xl border border-white/[0.06] bg-white/[0.015] backdrop-blur-sm overflow-hidden transition-all duration-300 focus-within:border-emerald-500/20 focus-within:shadow-[0_0_30px_rgba(52,211,153,0.04)]">
          {/* Gradient line at top of input */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent opacity-0 transition-opacity duration-300" style={{ opacity: input ? 1 : 0 }} />

          {/* Code attachment indicator */}
          {codeInput.trim() && !showCodeInput && (
            <div className="flex items-center gap-2 px-3 pt-2">
              <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/15 text-cyan-400/70">
                <FileCode className="w-2.5 h-2.5" />
                {codeLanguage} · {codeInput.split('\n').length} lines attached
              </span>
              <button onClick={() => setShowCodeInput(true)} className="text-[9px] text-white/20 hover:text-white/40">edit</button>
              <button onClick={() => setCodeInput('')} className="text-[9px] text-white/20 hover:text-red-400/60">remove</button>
            </div>
          )}

          <div className="flex items-end gap-2 p-2">
            {/* Toolbar buttons */}
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                onClick={() => setShowCodeInput(!showCodeInput)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${showCodeInput ? 'bg-cyan-500/10 text-cyan-400' : 'text-white/15 hover:text-white/40 hover:bg-white/[0.04]'}`}
                title="Import code"
              >
                <Code className="w-4 h-4" />
              </button>
              <label className="w-8 h-8 rounded-lg flex items-center justify-center text-white/15 hover:text-white/40 hover:bg-white/[0.04] transition-all cursor-pointer" title="Upload file">
                <Upload className="w-4 h-4" />
                <input type="file" className="hidden" accept=".cdc,.sol,.js,.ts,.rs,.py,.txt,.move" onChange={handleFileUpload} />
              </label>
            </div>

            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={codeInput.trim() ? 'Ask about the attached code...' : 'Ask about compliance, risk scoring, Cadence code...'}
              rows={1}
              className="flex-1 bg-transparent resize-none border-0 outline-none text-[13px] text-white/80 px-2 py-2.5 placeholder:text-white/15 max-h-32 leading-relaxed"
              style={{ minHeight: '42px' }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={(!input.trim() && !codeInput.trim()) || isLoading}
              className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 disabled:opacity-20 disabled:cursor-not-allowed bg-gradient-to-br from-emerald-500/20 to-cyan-500/15 hover:from-emerald-500/30 hover:to-cyan-500/25 text-emerald-400 hover:shadow-[0_0_20px_rgba(52,211,153,0.1)]"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 mt-2">
          <span className="text-[9px] text-white/10">Powered by Claude AI</span>
          <span className="text-[9px] text-white/[0.06]">&middot;</span>
          <span className="text-[9px] text-white/10">Flow Testnet</span>
          {liveContext && <><span className="text-[9px] text-white/[0.06]">&middot;</span><span className="text-[9px] text-emerald-400/20">Context-aware</span></>}
        </div>
      </div>
    </div>
  )
}
