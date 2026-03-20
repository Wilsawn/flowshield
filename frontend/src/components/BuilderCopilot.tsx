import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Send, Copy, Check, ArrowDown, Shield, Code, BookOpen, Zap, Globe, Lock, ChevronRight, Upload, FileCode, Scan, AlertTriangle, Activity, X, Plus, MessageSquare, Trash2, Clock, Search, CornerDownLeft, Mic, MicOff } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import FlowShieldLogo from '@/components/FlowShieldLogo'
import { API } from '@/lib/api'
import { authFetch } from '@/lib/utils'

// ── Storage keys ──
const CONVERSATIONS_KEY = 'flowshield_copilot_conversations'
const ACTIVE_CONVO_KEY = 'flowshield_copilot_active'

// ── Conversation helpers ──
function loadConversations() {
  try {
    const raw = localStorage.getItem(CONVERSATIONS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveConversations(convos) {
  try { localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(convos)) } catch { /* ignore */ }
}

function loadActiveId() {
  try { return localStorage.getItem(ACTIVE_CONVO_KEY) || null } catch { return null }
}

function saveActiveId(id) {
  try { localStorage.setItem(ACTIVE_CONVO_KEY, id) } catch { /* ignore */ }
}

function generateId() {
  return `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function generateTitle(messages) {
  const first = messages.find(m => m.role === 'user')
  if (!first) return 'New conversation'
  const text = first.content.replace(/```[\s\S]*?```/g, '').trim()
  return text.length > 50 ? text.slice(0, 50) + '...' : text
}

// Migrate old single-conversation format to new multi-conversation format
function migrateOldFormat() {
  try {
    const oldMessages = localStorage.getItem('flowshield_copilot_messages')
    const oldSession = localStorage.getItem('flowshield_copilot_session')
    if (oldMessages) {
      const messages = JSON.parse(oldMessages)
      if (messages.length > 0) {
        const existingConvos = loadConversations()
        // Only migrate if we have no conversations yet
        if (existingConvos.length === 0) {
          const convo = {
            id: oldSession || generateId(),
            title: generateTitle(messages),
            messages,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }
          saveConversations([convo])
          saveActiveId(convo.id)
        }
      }
      // Clean up old keys
      localStorage.removeItem('flowshield_copilot_messages')
      localStorage.removeItem('flowshield_copilot_session')
    }
  } catch { /* ignore */ }
}

// Prune conversations older than 30 days to prevent unbounded localStorage growth
function pruneExpiredConversations() {
  const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000
  const convos = loadConversations()
  const now = Date.now()
  const fresh = convos.filter(c => now - (c.updatedAt || c.createdAt || 0) < MAX_AGE_MS)
  if (fresh.length < convos.length) saveConversations(fresh)
}

function isAuthenticated() {
  return !!localStorage.getItem('flowshield_token')
}

function getUserName() {
  try {
    const raw = localStorage.getItem('flowshield_user')
    if (!raw) return null
    const user = JSON.parse(raw)
    return user.name || user.displayName || user.username || null
  } catch {
    // If it's a plain string, use directly
    try {
      const val = localStorage.getItem('flowshield_user')
      if (val && !val.startsWith('{')) return val
    } catch { /* ignore */ }
    return null
  }
}

const BASE_SUGGESTION_CARDS = [
  { icon: Shield, label: 'Risk Score', prompt: 'Why is my risk score what it is and how can I improve it?', color: 'emerald' },
  { icon: Code, label: 'Integrate', prompt: 'How do I add compliance to my lending pool?', color: 'emerald' },
  { icon: BookOpen, label: 'Regulations', prompt: 'Explain MiCA vs FinCEN in simple terms', color: 'emerald' },
  { icon: Lock, label: 'ZK Privacy', prompt: 'What happens to my identity data?', color: 'emerald' },
  { icon: Zap, label: 'Gas Fees', prompt: 'How do sponsored transactions work?', color: 'emerald' },
  { icon: Globe, label: 'Jurisdictions', prompt: 'What jurisdictions does FlowShield support?', color: 'emerald' },
]

const ALERT_SUGGESTION_CARDS = [
  { icon: AlertTriangle, label: 'My Anomalies', prompt: 'I have active anomalies detected. What do they mean and how should I respond?', color: 'emerald' },
  { icon: Activity, label: 'Risk Factors', prompt: 'What are my current risk factors and how can I reduce my risk score?', color: 'emerald' },
  { icon: Shield, label: 'Fix Compliance', prompt: 'What steps should I take to get back to compliant status?', color: 'emerald' },
  { icon: Scan, label: 'Scan My Code', prompt: 'I want to scan my smart contract code for compliance issues', color: 'emerald' },
]

const FALLBACK_RESPONSES = {
  risk: `**Your Risk Score Explained**\n\nYour risk score is calculated from **public on-chain data only** — no personal information is used.\n\n**Factors checked:**\n- Account age (newer accounts score higher)\n- Transaction volume in the last 24h\n- Rapid in-out patterns\n- Flagged contract interactions\n- Mixer or privacy tool usage\n- Number of funding sources\n- Sudden activity after dormancy\n\n**Tiers:**\n- **0-30**: Compliant (full access)\n- **31-70**: Semi-compliant (deposits OK, borrows limited)\n- **71-100**: Non-compliant (restricted)\n\n**How to improve:** Maintain consistent account activity, avoid rapid in-out patterns, and use fewer funding sources. Your score updates automatically as your on-chain behavior changes.`,
  deposit: `**What is Depositing?**\n\nWhen you deposit, you're supplying liquidity to the **Lending Pool** smart contract on Flow.\n\n**How it works:**\n1. You enter an amount and click Deposit\n2. FlowShield automatically checks your compliance credential on-chain\n3. If compliant, the deposit goes through as a real transaction on Flow testnet\n4. You earn **4.2% APY** on your deposits\n5. Other users can borrow from the pool\n\n**Is it safe?** Yes — this runs on Flow testnet with test tokens. Every transaction is compliance-verified on-chain before it executes.\n\n**Gas fees?** Completely covered by FlowShield through sponsored transactions — you pay nothing.`,
  borrow: `**What is Borrowing?**\n\nBorrowing lets you take a loan from the lending pool using your deposits as collateral.\n\n**Key details:**\n- **LTV ratio**: 75% (you can borrow up to 75% of your deposits)\n- **Interest rate**: 2.8%\n- **Compliance**: Requires full compliance verification — stricter than deposits\n- **Gas fees**: Covered by FlowShield (free for users)\n\n**Example:** If you deposited $1,000, you can borrow up to $750.\n\nBorrowing requires a higher compliance tier because it's a higher-risk DeFi action. This mirrors how real-world regulations work — different actions have different compliance thresholds.`,
  identity: `**Your Identity Data is 100% Private**\n\nFlowShield uses **Zero-Knowledge (ZK) proofs** — here's what that means:\n\n1. You verify your identity once (via biometrics)\n2. A ZK proof is generated **on your device**\n3. Only the proof goes on-chain — **never your actual identity data**\n4. The blockchain only sees: "this person is verified" (true/false)\n\n**What's stored on-chain:**\n- Compliance credential (tier: compliant / semi / non)\n- Risk score (0-100)\n- Expiry date\n- ZK proof hash\n\n**What's NEVER on-chain:**\n- Name, email, address\n- Government ID\n- Biometric data\n- Any personally identifiable information\n\nThis is what makes FlowShield unique: **compliance without sacrificing privacy**.`,
  gas: `**Gas Fees on FlowShield**\n\nAll gas fees are **sponsored** — users pay nothing.\n\n**How it works:**\n- FlowShield uses Flow's **Sponsored Transactions** feature\n- The protocol covers gas on behalf of users (~0.001 FLOW per transaction)\n- Users never see gas prompts or need to hold FLOW tokens for fees\n\nThis is one of Flow's standout features: **frictionless transactions**. Unlike Ethereum where users need ETH for gas, Flow allows protocols to sponsor transaction costs entirely.`,
  lending: `Here's what FlowShield provides for a multi-jurisdiction lending pool:\n\n**Compliance Configuration**\n- US (FinCEN): Travel Rule at $3,000, BSA/AML screening\n- EU (MiCA): Travel Rule at EUR 1,000, enhanced due diligence\n\n**Integration (one line)**\n\`\`\`cadence\nimport ComplianceAction from 0x93c691a98b975493\n\ntransaction(amount: UFix64) {\n  prepare(acct: auth(Storage) &Account) {\n    let isCompliant = ComplianceAction.verify(acct.address)\n    assert(isCompliant, message: "Compliance check failed")\n    LendingPool.deposit(from: acct, amount: amount)\n  }\n}\n\`\`\`\n\n**What happens behind the scenes:**\n1. FlowShield checks the user's compliance credential\n2. Verifies the ZK proof is valid and not expired\n3. Confirms the amount is within jurisdiction limits\n4. Returns a boolean — your contract never touches identity data`,
  dex: `For a DEX on Flow, compliance requirements depend on your target jurisdictions.\n\n**Minimum viable compliance:**\n- Call FlowShield's \`verify()\` before each swap\n- Travel Rule reporting for swaps above jurisdiction thresholds\n- Sanctions screening via ZK proof (no personal data on-chain)\n\n\`\`\`cadence\nimport ComplianceAction from 0x93c691a98b975493\n\nlet verified = ComplianceAction.verify(trader.address)\nassert(verified, message: "User not compliant")\n\`\`\`\n\nFlowShield handles the rest: credential validation, proof verification, and jurisdiction-specific rules.`,
  mica: `**MiCA (Markets in Crypto-Assets Regulation)** took full effect in December 2024.\n\n**Key requirements:**\n- Travel Rule: transfers above **EUR 1,000**\n- Enhanced due diligence for high-risk transactions\n- DORA compliance\n- Full record-keeping\n\n**vs FinCEN (US):**\n- Travel Rule: transfers above **$3,000**\n- BSA/AML screening\n- FinCEN registration required\n- Suspicious Activity Reports (SARs)\n\n**FlowShield handles both** — the RuleEngine contract stores jurisdiction-specific rules on-chain. When you run a compliance check, it automatically applies the right rules for the user's jurisdiction.`,
  default: `I can help with anything about FlowShield. Here are some topics:\n\n**For Users:**\n- How your risk score works and how to improve it\n- What deposits and borrows do\n- How your identity stays private through ZK proofs\n- How gas fees are covered for you\n- What different jurisdictions require\n\n**For Developers:**\n- One-line compliance integration in Cadence\n- Multi-jurisdiction support (US, EU, UK, SG, CA)\n- How ZK proofs work with FlowShield\n- Setting up automated compliance monitoring\n\nWhat would you like to know?`,
}

function getFallbackResponse(message) {
  const lower = message.toLowerCase()
  if (lower.includes('risk') || lower.includes('score') || lower.includes('improve') || lower.includes('factor')) return FALLBACK_RESPONSES.risk
  if (lower.includes('deposit') && (lower.includes('what') || lower.includes('safe') || lower.includes('how') || lower.includes('mean'))) return FALLBACK_RESPONSES.deposit
  if (lower.includes('borrow') && (lower.includes('what') || lower.includes('how') || lower.includes('mean'))) return FALLBACK_RESPONSES.borrow
  if (lower.includes('identity') || lower.includes('data') || lower.includes('privacy') || lower.includes('private') || lower.includes('pii') || lower.includes('zk')) return FALLBACK_RESPONSES.identity
  if (lower.includes('gas') || lower.includes('fee') || lower.includes('free') || lower.includes('sponsor') || lower.includes('frictionless')) return FALLBACK_RESPONSES.gas
  if (lower.includes('lending') || lower.includes('lend') || lower.includes('pool') || lower.includes('integrate')) return FALLBACK_RESPONSES.lending
  if (lower.includes('dex') || lower.includes('swap') || lower.includes('exchange') || lower.includes('trade')) return FALLBACK_RESPONSES.dex
  if (lower.includes('mica') || lower.includes('fincen') || lower.includes('regulat') || lower.includes('jurisdiction')) return FALLBACK_RESPONSES.mica
  if (lower.includes('cadence') || lower.includes('contract') || lower.includes('generate')) return FALLBACK_RESPONSES.lending
  if (lower.includes('deposit')) return FALLBACK_RESPONSES.deposit
  if (lower.includes('borrow')) return FALLBACK_RESPONSES.borrow
  return FALLBACK_RESPONSES.default
}

// ── AI thinking steps ──
const THINKING_STEPS = [
  'Gathering context',
  'Planning',
  'Reasoning',
  'Synthesizing',
]

function ThinkingSteps({ startTime }: { startTime: number }) {
  const [completedSteps, setCompletedSteps] = useState(0)

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []
    // Each step completes after a staggered delay
    THINKING_STEPS.forEach((_, i) => {
      if (i < THINKING_STEPS.length - 1) {
        timers.push(setTimeout(() => setCompletedSteps(i + 1), 800 + i * 1200))
      }
    })
    return () => timers.forEach(clearTimeout)
  }, [startTime])

  return (
    <div className="space-y-2 py-1">
      {THINKING_STEPS.map((step, i) => {
        const isComplete = i < completedSteps
        const isActive = i === completedSteps
        return (
          <div
            key={step}
            className="flex items-center gap-2.5"
          >
            {isComplete ? (
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : isActive ? (
              <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0">
                <span className="text-[12px] text-white/40 font-mono tracking-widest motion-safe:animate-pulse">...</span>
              </span>
            ) : (
              <span className="w-3.5 h-3.5 shrink-0" />
            )}
            <span className={`text-[13px] font-['Inter'] ${
              isComplete ? 'text-white/50' :
              isActive ? 'text-white/60' :
              'text-white/20'
            }`}>
              {step}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Code block ──
function CodeBlock({ lang, code }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    if (copied) return
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="my-3 rounded-xl bg-[#0a0f0c] border border-white/[0.08] overflow-hidden group">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06] bg-white/[0.01]">
        <span className="text-[11px] text-white/20 uppercase tracking-wider font-['JetBrains_Mono'] font-medium">{lang || 'code'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[10px] text-white/20 hover:text-white/50 transition-colors opacity-0 group-hover:opacity-100"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto">
        <code className="text-[12px] text-emerald-300/80 font-['JetBrains_Mono'] leading-relaxed">{code}</code>
      </pre>
    </div>
  )
}

// ── Strip emojis ──
function stripEmojis(text) {
  return text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}\u{FE0F}\u{E0020}-\u{E007F}✅❌✓✗⚡️🔒💡🚀⭐️💰🎯📌🔑🛡️⚠️📊💎🔥✨🏆📈📉🤖💻🔐📋🎉🏗️💪🧩🌐]/gu, '').replace(/\s{2,}/g, ' ').trim()
}

// ── Inline markdown ──
function InlineMarkdown({ text }) {
  const parts = text.split(/(\*\*.*?\*\*|`[^`]+`|\[.*?\]\(.*?\))/g)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="text-white/80 font-semibold">{part.slice(2, -2)}</strong>
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return <code key={i} className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400/80 text-[11px] font-['JetBrains_Mono']">{part.slice(1, -1)}</code>
        }
        const linkMatch = part.match(/\[(.*?)\]\((.*?)\)/)
        if (linkMatch) {
          const href = linkMatch[2]
          // Only allow http/https links — block javascript:, data:, vbscript: etc.
          const safeHref = /^https?:\/\//i.test(href) ? href : '#'
          return <a key={i} href={safeHref} target="_blank" rel="noopener noreferrer" className="text-emerald-400/70 hover:text-emerald-400 underline underline-offset-2 decoration-emerald-400/20">{linkMatch[1]}</a>
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

// ── Rich markdown renderer ──
function RichContent({ content }) {
  const lines = stripEmojis(content).split('\n')
  const elements = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith('```')) {
      const lang = line.slice(3).trim()
      const codeLines = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      i++
      elements.push(<CodeBlock key={elements.length} lang={lang} code={codeLines.join('\n')} />)
      continue
    }

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
                    <th key={ci} className="px-3 py-2 text-left text-white/40 font-medium border-b border-white/[0.06]">
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

    if (line.startsWith('# ')) {
      elements.push(<h2 key={elements.length} className="text-[16px] font-bold text-white font-['Syne'] mt-4 mb-2">{line.slice(2)}</h2>)
      i++; continue
    }
    if (line.startsWith('## ')) {
      elements.push(<h3 key={elements.length} className="text-[14px] font-semibold text-white/90 font-['Syne'] mt-3 mb-1.5">{line.slice(3)}</h3>)
      i++; continue
    }
    if (line.startsWith('### ')) {
      elements.push(<h4 key={elements.length} className="text-[13px] font-semibold text-white/80 font-['Syne'] mt-2 mb-1">{line.slice(4)}</h4>)
      i++; continue
    }

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
              <span className="text-[11px] text-emerald-400/60 font-['JetBrains_Mono'] mt-0.5 shrink-0 w-4 text-right">{li + 1}.</span>
              <span><InlineMarkdown text={item} /></span>
            </li>
          ))}
        </ol>
      )
      continue
    }

    if (line.trim() === '') {
      elements.push(<div key={elements.length} className="h-2" />)
      i++; continue
    }

    elements.push(
      <p key={elements.length} className="text-[13px] text-white/45 leading-relaxed font-['Inter']">
        <InlineMarkdown text={line} />
      </p>
    )
    i++
  }

  return <>{elements}</>
}

// ── Conversation list sidebar item ──
function ConversationItem({ convo, isActive, onSelect, onDelete }) {
  const [hovering, setHovering] = useState(false)
  const timeAgo = useMemo(() => {
    const diff = Date.now() - convo.updatedAt
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'now'
    if (mins < 60) return `${mins}m`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h`
    const days = Math.floor(hrs / 24)
    return `${days}d`
  }, [convo.updatedAt])

  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className={`w-full group flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all duration-200 ${
        isActive
          ? 'bg-emerald-500/[0.08] border border-emerald-500/15'
          : 'hover:bg-white/[0.03] border border-transparent'
      }`}
    >
      <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-emerald-400' : 'text-white/15'}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-[12px] font-medium truncate ${isActive ? 'text-emerald-400/90' : 'text-white/50'}`}>
          {convo.title}
        </p>
        <p className="text-[10px] text-white/20 mt-0.5 flex items-center gap-1">
          <Clock className="w-2.5 h-2.5" />
          {timeAgo}
          <span className="text-white/10">·</span>
          {convo.messages.length} msg{convo.messages.length !== 1 ? 's' : ''}
        </p>
      </div>
      <AnimatePresence>
        {hovering && !isActive && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </motion.button>
        )}
      </AnimatePresence>
    </button>
  )
}

// ── Recent conversation row (for empty state) ──
function RecentConvoRow({ convo, onSelect }: { convo: any; onSelect: () => void }) {
  const timeStr = useMemo(() => {
    const d = new Date(convo.updatedAt)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    if (days < 7) return `${days}d ago`
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }, [convo.updatedAt])

  return (
    <button
      onClick={onSelect}
      className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/[0.03] transition-colors text-left group"
    >
      <span className="text-[13px] text-white/40 group-hover:text-white/60 transition-colors truncate mr-3 font-['Inter']">
        {convo.title}
      </span>
      <span className="text-[11px] text-white/15 shrink-0 font-['Inter'] uppercase tracking-wider">
        {timeStr}
      </span>
    </button>
  )
}

// ── Main Component ──
export default function BuilderCopilot() {
  // Migrate old format on first load
  useEffect(() => { migrateOldFormat(); pruneExpiredConversations() }, [])

  const [conversations, setConversations] = useState(loadConversations)
  const [activeId, setActiveId] = useState(loadActiveId)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [loadingStartTime, setLoadingStartTime] = useState(0)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const messagesEndRef = useRef(null)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)

  // Code import / scanner state
  const [showCodeInput, setShowCodeInput] = useState(false)
  const [codeInput, setCodeInput] = useState('')
  const [codeLanguage, setCodeLanguage] = useState('cadence')
  const [isScanning, setIsScanning] = useState(false)
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)
  const [codeFileName, setCodeFileName] = useState('')
  const codeTextareaRef = useRef(null)
  const codeScrollRef = useRef(null)
  const gutterRef = useRef(null)

  // Voice-to-text
  const [isRecording, setIsRecording] = useState(false)
  const [voiceSupported] = useState(() => typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window))
  const recognitionRef = useRef(null)

  const toggleVoice = useCallback(() => {
    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop()
      setIsRecording(false)
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    let finalTranscript = ''

    recognition.onresult = (event) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' '
        } else {
          interim = transcript
        }
      }
      setInput(prev => {
        const base = prev.replace(/\u200B.*$/, '').trimEnd()
        const spoken = (finalTranscript + interim).trim()
        return base ? `${base} ${spoken}` : spoken
      })
    }

    recognition.onerror = () => setIsRecording(false)
    recognition.onend = () => setIsRecording(false)

    recognitionRef.current = recognition
    recognition.start()
    setIsRecording(true)
  }, [isRecording])

  // Cleanup recognition on unmount
  useEffect(() => {
    return () => { recognitionRef.current?.stop() }
  }, [])

  // Prompt usage tracking
  const [promptUsage, setPromptUsage] = useState({ used: 0, limit: null, remaining: null, tier: 'starter', unlimited: false })
  const [limitReached, setLimitReached] = useState(false)

  // Live context from user's on-chain state
  const [liveContext, setLiveContext] = useState(null)
  const [contextLoading, setContextLoading] = useState(true)

  // Active conversation
  const activeConvo = useMemo(() => {
    return conversations.find(c => c.id === activeId) || null
  }, [conversations, activeId])

  const messages = activeConvo?.messages || []

  // Fetch prompt usage on mount
  useEffect(() => {
    if (!isAuthenticated()) return
    const fetchUsage = async () => {
      try {
        const res = await authFetch(`${API}/api/copilot/usage`)
        if (res.ok) {
          const data = await res.json()
          setPromptUsage(data)
          setLimitReached(!data.unlimited && data.remaining !== null && data.remaining <= 0)
        }
      } catch { /* backend unavailable */ }
    }
    fetchUsage()
  }, [])

  // Sync conversations from backend on mount (if authenticated)
  const [backendSynced, setBackendSynced] = useState(false)
  useEffect(() => {
    if (!isAuthenticated()) { setBackendSynced(true); return }
    const syncFromBackend = async () => {
      try {
        const res = await authFetch(`${API}/api/copilot/conversations`)
        if (res.ok) {
          const { conversations: remote } = await res.json()
          if (remote && remote.length > 0) {
            // Merge: backend conversations take priority, keep local-only ones
            const remoteIds = new Set(remote.map(c => c.id))
            const localOnly = loadConversations().filter(c => !remoteIds.has(c.id))
            // Load full messages for remote conversations
            const fullRemote = await Promise.all(remote.map(async (c) => {
              try {
                const r = await authFetch(`${API}/api/copilot/conversations/${c.id}`)
                if (r.ok) {
                  const full = await r.json()
                  return { id: full.id, title: full.title, messages: full.messages || [], createdAt: new Date(full.created_at).getTime(), updatedAt: new Date(full.updated_at).getTime() }
                }
              } catch { /* skip */ }
              return { id: c.id, title: c.title, messages: [], createdAt: new Date(c.created_at).getTime(), updatedAt: new Date(c.updated_at).getTime() }
            }))
            const merged = [...fullRemote, ...localOnly]
            setConversations(merged)
            if (!activeId && merged.length > 0) setActiveId(merged[0].id)
          }
        }
      } catch { /* backend unavailable — use localStorage */ }
      setBackendSynced(true)
    }
    syncFromBackend()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Persist conversations and active ID
  useEffect(() => {
    saveConversations(conversations)
  }, [conversations])

  useEffect(() => {
    if (activeId) saveActiveId(activeId)
  }, [activeId])

  // Fetch user's live context on mount
  useEffect(() => {
    const fetchContext = async () => {
      try {
        const walletData = (() => { try { return JSON.parse(localStorage.getItem('flowshield_wallet') || '{}') } catch { return {} } })()
        const address = walletData.addr
        if (!address) { setContextLoading(false); return }
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
    const interval = setInterval(fetchContext, 15000)
    return () => clearInterval(interval)
  }, [])

  // Dynamic suggestion cards based on context
  const SUGGESTION_CARDS = (liveContext?.anomalyCount > 0 || (liveContext?.riskScore ?? 0) > 30)
    ? ALERT_SUGGESTION_CARDS
    : BASE_SUGGESTION_CARDS

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, scrollToBottom])

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

  // ── Conversation management ──
  const createNewConversation = useCallback(() => {
    const newConvo = {
      id: generateId(),
      title: 'New conversation',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    setConversations(prev => [newConvo, ...prev])
    setActiveId(newConvo.id)
    setInput('')
    setShowHistory(false)
    inputRef.current?.focus()
  }, [])

  const selectConversation = useCallback((id) => {
    setActiveId(id)
    setShowHistory(false)
    setInput('')
  }, [])

  const deleteConversation = useCallback((id) => {
    setConversations(prev => prev.filter(c => c.id !== id))
    if (activeId === id) {
      const remaining = conversations.filter(c => c.id !== id)
      setActiveId(remaining.length > 0 ? remaining[0].id : null)
    }
    // Sync delete to backend
    if (isAuthenticated()) {
      authFetch(`${API}/api/copilot/conversations/${id}`, { method: 'DELETE' }).catch(() => {})
    }
  }, [activeId, conversations])

  const updateConversation = useCallback((id, updater) => {
    setConversations(prev => prev.map(c =>
      c.id === id ? { ...updater(c), updatedAt: Date.now() } : c
    ))
  }, [])

  // ── Send message ──
  const sendMessage = async (text) => {
    const userMessage = text || input.trim()
    if (!userMessage || isLoading) return

    // Block if daily limit reached
    if (limitReached) return

    // Stop voice recording if active
    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop()
      setIsRecording(false)
    }

    let fullMessage = userMessage
    if (codeInput.trim()) {
      fullMessage = `${userMessage}\n\nHere's my code (${codeLanguage}):\n\`\`\`${codeLanguage}\n${codeInput.trim()}\n\`\`\``
      setCodeInput('')
      setCodeFileName('')
      setShowCodeInput(false)
    }

    setInput('')

    // If no active conversation, create one
    let convoId = activeId
    if (!convoId) {
      const newConvo = {
        id: generateId(),
        title: userMessage.length > 50 ? userMessage.slice(0, 50) + '...' : userMessage,
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      setConversations(prev => [newConvo, ...prev])
      setActiveId(newConvo.id)
      convoId = newConvo.id
    }

    // Add user message
    const userMsg = { role: 'user', content: fullMessage, timestamp: Date.now() }
    updateConversation(convoId, c => ({
      ...c,
      messages: [...c.messages, userMsg],
      title: c.messages.length === 0 ? (userMessage.length > 50 ? userMessage.slice(0, 50) + '...' : userMessage) : c.title,
    }))

    setIsLoading(true)
    setLoadingStartTime(Date.now())

    try {
      const res = await authFetch(`${API}/api/copilot/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: fullMessage,
          sessionId: convoId,
          context: liveContext,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        // Update prompt usage from response
        if (data.usage) {
          setPromptUsage(data.usage)
          setLimitReached(!data.usage.unlimited && data.usage.remaining !== null && data.usage.remaining <= 0)
        }
        updateConversation(convoId, c => ({
          ...c,
          messages: [...c.messages, { role: 'assistant', content: data.response, timestamp: Date.now() }],
        }))
      } else if (res.status === 429) {
        // Daily limit reached
        const errData = await res.json().catch(() => ({}))
        setLimitReached(true)
        if (errData.used) setPromptUsage(prev => ({ ...prev, used: errData.used, remaining: 0 }))
        updateConversation(convoId, c => ({
          ...c,
          messages: [...c.messages, { role: 'assistant', content: `**Daily prompt limit reached.** You've used all ${errData.limit || 15} prompts for today. Limits reset at midnight UTC.\n\nUpgrade to Growth for 200 prompts/day.`, timestamp: Date.now() }],
        }))
      } else {
        const offlineNotice = '**Copilot is connecting...** Here\'s what I know:\n\n'
        updateConversation(convoId, c => ({
          ...c,
          messages: [...c.messages, { role: 'assistant', content: offlineNotice + getFallbackResponse(fullMessage), timestamp: Date.now() }],
        }))
      }
    } catch {
      const offlineNotice = '**Copilot is connecting...** Here\'s what I know:\n\n'
      updateConversation(convoId, c => ({
        ...c,
        messages: [...c.messages, { role: 'assistant', content: offlineNotice + getFallbackResponse(fullMessage), timestamp: Date.now() }],
      }))
    }

    setIsLoading(false)
    inputRef.current?.focus()
  }

  // ── Scan code ──
  const handleScanCode = async () => {
    if (!codeInput.trim() || isScanning) return
    setIsScanning(true)

    let convoId = activeId
    if (!convoId) {
      const newConvo = {
        id: generateId(),
        title: `Code scan: ${codeLanguage}`,
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      setConversations(prev => [newConvo, ...prev])
      setActiveId(newConvo.id)
      convoId = newConvo.id
    }

    const scanMsg = `Scan this ${codeLanguage} code for compliance issues:\n\n\`\`\`${codeLanguage}\n${codeInput.trim()}\n\`\`\``
    updateConversation(convoId, c => ({
      ...c,
      messages: [...c.messages, { role: 'user', content: scanMsg, timestamp: Date.now() }],
    }))
    setIsLoading(true)
    setLoadingStartTime(Date.now())

    try {
      const res = await authFetch(`${API}/api/copilot/scan-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeInput.trim(), language: codeLanguage }),
      })
      if (res.ok) {
        const data = await res.json()
        updateConversation(convoId, c => ({
          ...c,
          messages: [...c.messages, { role: 'assistant', content: data.analysis, timestamp: Date.now() }],
        }))
      } else {
        updateConversation(convoId, c => ({
          ...c,
          messages: [...c.messages, { role: 'assistant', content: 'Failed to scan code. Please try again.', timestamp: Date.now() }],
        }))
      }
    } catch {
      updateConversation(convoId, c => ({
        ...c,
        messages: [...c.messages, { role: 'assistant', content: 'Code scanner unavailable. Please try again later.', timestamp: Date.now() }],
      }))
    }

    setCodeInput('')
    setCodeFileName('')
    setShowCodeInput(false)
    setIsScanning(false)
    setIsLoading(false)
    inputRef.current?.focus()
  }

  // ── File upload ──
  const MAX_FILE_SIZE = 512 * 1024 // 512KB
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_FILE_SIZE) {
      setInput('File too large (max 512KB). Paste the relevant code instead.')
      e.target.value = ''
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      setCodeInput(ev.target.result)
      setShowCodeInput(true)
      setCodeFileName(file.name)
      const ext = file.name.split('.').pop()?.toLowerCase()
      const langMap = { cdc: 'cadence', sol: 'solidity', rs: 'rust', js: 'javascript', ts: 'typescript', py: 'python', go: 'go', rb: 'ruby', java: 'java', swift: 'swift', kt: 'kotlin', c: 'c', cpp: 'c++', h: 'c', hpp: 'c++', cs: 'c#', php: 'php', sh: 'shell', bash: 'shell', zsh: 'shell', yaml: 'yaml', yml: 'yaml', json: 'json', toml: 'toml', xml: 'xml', html: 'html', css: 'css', scss: 'scss', sql: 'sql', md: 'markdown', move: 'move', vy: 'vyper' }
      setCodeLanguage(langMap[ext] || ext || 'text')
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const isEmptyState = messages.length === 0

  // Filtered conversations for search
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations
    const q = searchQuery.toLowerCase()
    return conversations.filter(c =>
      c.title.toLowerCase().includes(q) ||
      c.messages.some(m => m.content.toLowerCase().includes(q))
    )
  }, [conversations, searchQuery])

  // Recent conversations for empty state (up to 5, sorted by most recent)
  const recentConversations = useMemo(() => {
    return [...conversations]
      .filter(c => c.messages.length > 0)
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
      .slice(0, 5)
  }, [conversations])

  // Get user name for greeting
  const userName = useMemo(() => getUserName(), [])

  return (
    <div className="flex h-[calc(100dvh-4rem)] max-w-[960px] mx-auto">

      {/* ── Conversation History Sidebar ── */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            className="w-72 shrink-0 border-r border-white/[0.06] flex flex-col bg-[#060e09]/50 mr-4 rounded-xl overflow-hidden border border-white/[0.06]"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 288, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            {/* History header */}
            <div className="p-3 border-b border-white/[0.06]">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider font-['Inter']">History</p>
                <button
                  onClick={() => setShowHistory(false)}
                  className="w-6 h-6 rounded-md flex items-center justify-center text-white/20 hover:text-white/50 hover:bg-white/[0.04] transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/15" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search conversations..."
                  className="w-full pl-7 pr-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[11px] text-white/60 placeholder:text-white/15 outline-none focus:border-white/[0.12] transition-colors font-['Inter']"
                />
              </div>
            </div>

            {/* New chat button */}
            <div className="p-2">
              <button
                onClick={createNewConversation}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-[12px] font-medium text-emerald-400/70 hover:text-emerald-400 border border-emerald-500/10 hover:border-emerald-500/25 hover:bg-emerald-500/[0.04] transition-all font-['Inter']"
              >
                <Plus className="w-3.5 h-3.5" />
                New Conversation
              </button>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto p-2 space-y-0.5 chat-scroll">
              {filteredConversations.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-5 h-5 text-white/10 mx-auto mb-2" />
                  <p className="text-[11px] text-white/20 font-['Inter']">
                    {searchQuery ? 'No matches found' : 'No conversations yet'}
                  </p>
                  {!searchQuery && (
                    <p className="text-[10px] text-white/15 mt-0.5 font-['Inter']">Start one below or pick a suggestion.</p>
                  )}
                </div>
              ) : (
                (() => {
                  const now = Date.now()
                  const today = new Date(); today.setHours(0,0,0,0)
                  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)
                  const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7)

                  const groups = { today: [], yesterday: [], week: [], older: [] }
                  filteredConversations.forEach(c => {
                    const d = new Date(c.updatedAt)
                    if (d >= today) groups.today.push(c)
                    else if (d >= yesterday) groups.yesterday.push(c)
                    else if (d >= weekAgo) groups.week.push(c)
                    else groups.older.push(c)
                  })

                  const sections = [
                    { label: 'Today', items: groups.today },
                    { label: 'Yesterday', items: groups.yesterday },
                    { label: 'Previous 7 days', items: groups.week },
                    { label: 'Older', items: groups.older },
                  ].filter(s => s.items.length > 0)

                  return sections.map(section => (
                    <div key={section.label}>
                      <p className="text-[9px] text-white/15 uppercase tracking-wider px-3 pt-3 pb-1 font-medium font-['Inter']">{section.label}</p>
                      {section.items.map(convo => (
                        <ConversationItem
                          key={convo.id}
                          convo={convo}
                          isActive={convo.id === activeId}
                          onSelect={() => selectConversation(convo.id)}
                          onDelete={() => deleteConversation(convo.id)}
                        />
                      ))}
                    </div>
                  ))
                })()
              )}
            </div>

            {/* History footer */}
            {conversations.length > 0 && (
              <div className="p-3 border-t border-white/[0.06]">
                <p className="text-[9px] text-white/15 text-center font-['Inter']">
                  {conversations.length} conversation{conversations.length !== 1 ? 's' : ''} saved locally
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main chat area ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <div className="flex items-center justify-between px-2 py-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                showHistory ? 'bg-white/[0.06] text-white/60' : 'text-white/20 hover:text-white/40 hover:bg-white/[0.04]'
              }`}
              title="Conversation history"
            >
              <Clock className="w-4 h-4" />
            </button>
            {activeConvo && messages.length > 0 && (
              <p className="text-[12px] text-white/25 truncate max-w-[200px] font-['Inter']">
                {activeConvo.title}
              </p>
            )}
          </div>
          <button
            onClick={createNewConversation}
            className="flex items-center gap-1.5 text-[11px] text-white/25 hover:text-white/50 px-3 py-1.5 rounded-full hover:bg-white/[0.04] transition-all font-['Inter']"
          >
            <Plus className="w-3.5 h-3.5" />
            New chat
          </button>
        </div>

        {/* ── Messages area ── */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto relative chat-scroll">
          {/* Empty state — centered greeting */}
          <AnimatePresence>
            {isEmptyState && (
              <motion.div
                className="flex flex-col items-center justify-center h-full px-6 max-w-[720px] mx-auto"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
              >
                {/* Greeting */}
                <motion.h2
                  className="text-[28px] font-bold text-white/90 mb-2 text-center tracking-tight font-['Syne']"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.4 }}
                >
                  Hey{userName ? ` ${userName}` : ''}, how can I help?
                </motion.h2>
                <p className="text-[14px] text-white/25 mb-10 text-center max-w-sm font-['Inter']">
                  Compliance, risk scoring, Cadence code, and DeFi regulations
                </p>

                {/* Suggested prompts as text buttons */}
                <div className="flex flex-wrap justify-center gap-2 max-w-xl mb-10">
                  {SUGGESTION_CARDS.map((card, i) => (
                    <motion.button
                      key={card.label}
                      onClick={() => sendMessage(card.prompt)}
                      className="text-[12px] text-white/40 hover:text-white/70 px-4 py-2 rounded-full border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.03] transition-all duration-200 font-['Inter']"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 + i * 0.04 }}
                    >
                      {card.label}
                    </motion.button>
                  ))}
                </div>

                {/* Recent conversations as simple rows */}
                {recentConversations.length > 0 && (
                  <motion.div
                    className="w-full max-w-md"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    <p className="text-[11px] text-white/20 uppercase tracking-wider font-medium mb-2 px-3 font-['Inter']">Recent</p>
                    <div className="space-y-0.5">
                      {recentConversations.map(convo => (
                        <RecentConvoRow
                          key={convo.id}
                          convo={convo}
                          onSelect={() => selectConversation(convo.id)}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Messages */}
          {!isEmptyState && (
            <div className="space-y-5 py-6 px-1 max-w-[720px] mx-auto">
              {messages.map((msg, i) => {
                const timeStr = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
                return (
                  <motion.div
                    key={`${activeId}-${i}`}
                    className="group/msg"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {msg.role === 'user' ? (
                      /* User messages: right-aligned, subtle panel */
                      <div className="flex justify-end items-end gap-2">
                        {timeStr && <span className="text-[9px] text-white/0 group-hover/msg:text-white/20 transition-colors mb-1 shrink-0 font-['Inter']">{timeStr}</span>}
                        <div className="max-w-[80%] px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[13px] text-white/70 leading-relaxed whitespace-pre-wrap font-['Inter']">
                          {msg.content}
                        </div>
                      </div>
                    ) : (
                      /* AI messages: left-aligned, no background */
                      <div className="flex gap-3 group/ai">
                        <div className="shrink-0 mt-0.5">
                          <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                            <FlowShieldLogo size={14} />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-[10px] text-white/25 font-medium font-['Inter']">FlowShield Copilot</span>
                            {timeStr && <span className="text-[9px] text-white/0 group-hover/msg:text-white/15 transition-colors font-['Inter']">{timeStr}</span>}
                          </div>
                          <div className="text-[13px] leading-relaxed font-['Inter',sans-serif]">
                            <RichContent content={msg.content} />
                          </div>
                          {/* Follow-up suggestions after AI messages */}
                          {i === messages.length - 1 && !isLoading && messages.length < 6 && (
                            <div className="flex flex-wrap gap-1.5 mt-4">
                              {SUGGESTION_CARDS.filter((_, si) => si < 3).map((card) => (
                                <button
                                  key={card.label}
                                  onClick={() => sendMessage(card.prompt)}
                                  className="text-[10px] px-3 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] text-white/25 hover:text-white/50 hover:border-white/[0.12] hover:bg-white/[0.04] transition-all font-['Inter']"
                                >
                                  {card.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )
              })}

              {/* Loading — step-by-step thinking states */}
              {isLoading && (
                <motion.div
                  className="flex gap-3"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="shrink-0 mt-0.5">
                    <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                      <FlowShieldLogo size={14} />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-white/25 mb-1.5 font-medium font-['Inter']">FlowShield Copilot</div>
                    <ThinkingSteps startTime={loadingStartTime} />
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
                className="fixed bottom-32 right-1/2 translate-x-1/2 w-8 h-8 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-white/40 hover:text-white/60 hover:bg-white/[0.06] transition-all z-20 shadow-lg"
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
        <div className="pt-3 pb-2 shrink-0 px-1 max-w-[720px] mx-auto w-full">
          {/* Code import panel */}
          <AnimatePresence>
            {showCodeInput && (
              <motion.div
                className={`mb-3 rounded-xl overflow-hidden transition-all duration-200 group/codepanel border ${
                  isDraggingOver
                    ? 'border-white/[0.15] bg-white/[0.04]'
                    : 'border-white/[0.06] bg-white/[0.02]'
                }`}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true) }}
                onDragLeave={() => setIsDraggingOver(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setIsDraggingOver(false)
                  const file = e.dataTransfer.files?.[0]
                  if (!file) return
                  if (file.size > 512 * 1024) return // 512KB max
                  const reader = new FileReader()
                  reader.onload = (ev) => {
                    setCodeInput(ev.target.result)
                    const ext = file.name.split('.').pop()?.toLowerCase()
                    const langMap = { cdc: 'cadence', sol: 'solidity', rs: 'rust', js: 'javascript', ts: 'typescript', py: 'python', go: 'go', rb: 'ruby', java: 'java', swift: 'swift', kt: 'kotlin', c: 'c', cpp: 'c++', h: 'c', hpp: 'c++', cs: 'c#', php: 'php', sh: 'shell', bash: 'shell', zsh: 'shell', yaml: 'yaml', yml: 'yaml', json: 'json', toml: 'toml', xml: 'xml', html: 'html', css: 'css', scss: 'scss', sql: 'sql', md: 'markdown', move: 'move', vy: 'vyper' }
                    setCodeLanguage(langMap[ext] || ext || 'text')
                    setCodeFileName(file.name)
                  }
                  reader.readAsText(file)
                }}
              >
                {/* Header — file info + actions */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-3.5 h-3.5 text-white/20" />
                    {codeFileName ? (
                      <span className="text-[11px] text-white/40 font-medium font-['Inter']">{codeFileName}</span>
                    ) : (
                      <span className="text-[11px] text-white/25 font-['Inter']">Code</span>
                    )}
                    {codeInput.trim() && (
                      <span className="text-[10px] text-white/15 font-['Inter']">{codeLanguage}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {codeInput.trim() && (
                      <button
                        onClick={() => {
                          if (codeCopied) return
                          navigator.clipboard.writeText(codeInput)
                          setCodeCopied(true)
                          setTimeout(() => setCodeCopied(false), 2000)
                        }}
                        className="flex items-center justify-center w-7 h-7 rounded-lg text-white/20 hover:text-white/50 hover:bg-white/[0.04] transition-all"
                        title="Copy code"
                      >
                        {codeCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    )}
                    <button
                      onClick={() => { setShowCodeInput(false); setCodeInput(''); setCodeFileName('') }}
                      className="flex items-center justify-center w-7 h-7 rounded-lg text-white/20 hover:text-white/50 hover:bg-white/[0.04] transition-all"
                      title="Close"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Code area */}
                <div
                  className="relative"
                  style={{ minHeight: codeInput.trim() ? undefined : '140px', maxHeight: '400px' }}
                >
                  {!codeInput.trim() && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                      {isDraggingOver ? (
                        <div className="flex flex-col items-center gap-2">
                          <Upload className="w-5 h-5 text-white/30" />
                          <p className="text-[12px] text-white/40 font-medium font-['Inter']">Drop to import</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2.5">
                          <p className="text-[13px] text-white/20 font-['Inter']">Paste or drop any file</p>
                          <div className="flex items-center gap-2 text-[10px] text-white/12 font-['Inter']">
                            <span className="px-1.5 py-0.5 rounded border border-white/[0.06] font-['JetBrains_Mono']">Cmd+V</span>
                            <span>or drag and drop</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div
                    ref={codeScrollRef}
                    className="flex overflow-y-auto overflow-x-hidden [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.08)_transparent] [&::-webkit-scrollbar]:w-[6px] [&::-webkit-scrollbar-thumb]:bg-white/[0.08] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent"
                    style={{ maxHeight: '400px' }}
                    onScroll={() => {
                      if (gutterRef.current && codeScrollRef.current) {
                        gutterRef.current.scrollTop = codeScrollRef.current.scrollTop
                      }
                    }}
                  >
                    {codeInput.trim() && (
                      <div
                        ref={gutterRef}
                        className="select-none text-right shrink-0 py-4 pr-3 pl-4 font-['JetBrains_Mono'] leading-[1.55] text-[13px] text-white/10 overflow-hidden"
                        style={{ minWidth: '44px' }}
                        aria-hidden="true"
                      >
                        {codeInput.split('\n').map((_, i) => (
                          <div key={i}>{i + 1}</div>
                        ))}
                      </div>
                    )}
                    <textarea
                      ref={codeTextareaRef}
                      value={codeInput}
                      onChange={(e) => setCodeInput(e.target.value)}
                      placeholder=""
                      rows={codeInput.trim() ? Math.min(Math.max(codeInput.split('\n').length, 6), 20) : 6}
                      className="w-full bg-transparent resize-none border-0 outline-none font-['JetBrains_Mono'] leading-[1.55] text-[13px] text-white/60 py-4 pr-4 placeholder:text-transparent [tab-size:2]"
                      style={{ caretColor: 'rgba(255,255,255,0.5)', paddingLeft: codeInput.trim() ? '0' : '44px' }}
                      spellCheck={false}
                      autoCorrect="off"
                      autoCapitalize="off"
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-3 py-2 border-t border-white/[0.06]">
                  <div className="flex items-center gap-3 text-[10px] text-white/15 font-['Inter']">
                    {codeInput.trim() ? (
                      <>
                        <span>{codeInput.split('\n').length} lines</span>
                        <span className="text-white/8">·</span>
                        <span>{codeInput.length.toLocaleString()} chars</span>
                      </>
                    ) : null}
                    <span className="text-white/30 font-medium">{codeLanguage}</span>
                  </div>
                  <button
                    onClick={handleScanCode}
                    disabled={!codeInput.trim() || isScanning}
                    className={`flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg transition-all disabled:opacity-20 font-['Inter'] ${
                      codeInput.trim() && !isScanning
                        ? 'bg-white/90 text-[#060e09] hover:bg-white'
                        : 'text-white/20'
                    }`}
                  >
                    {isScanning ? (
                      <><div className="w-3 h-3 border-[1.5px] border-current/30 border-t-current rounded-full motion-safe:animate-spin" />Scanning...</>
                    ) : (
                      <><Scan className="w-3 h-3" />Scan</>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Recording indicator */}
          <AnimatePresence>
            {isRecording && (
              <motion.div
                className="flex items-center gap-2 px-3 py-2 mb-2 rounded-xl bg-red-500/[0.06] border border-red-500/15"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <span className="w-2 h-2 rounded-full bg-red-400 motion-safe:animate-pulse" />
                <span className="text-[11px] text-red-400/70 font-medium font-['Inter']">Listening...</span>
                <button
                  onClick={toggleVoice}
                  className="ml-auto text-[10px] text-red-400/50 hover:text-red-400 transition-colors font-['Inter']"
                >
                  Stop
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Prompt usage indicator */}
          {!promptUsage.unlimited && promptUsage.limit && (
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 h-1 rounded-full bg-white/[0.04] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    promptUsage.remaining === 0 ? 'bg-red-400' :
                    promptUsage.remaining !== null && promptUsage.remaining <= 3 ? 'bg-emerald-400' :
                    'bg-emerald-500/50'
                  }`}
                  style={{ width: `${Math.min(100, (promptUsage.used / promptUsage.limit) * 100)}%` }}
                />
              </div>
              <span className={`text-[10px] font-medium shrink-0 font-['Inter'] ${
                promptUsage.remaining === 0 ? 'text-red-400/70' :
                promptUsage.remaining !== null && promptUsage.remaining <= 3 ? 'text-emerald-400/70' :
                'text-white/20'
              }`}>
                {promptUsage.used}/{promptUsage.limit}
              </span>
            </div>
          )}

          {/* Limit reached banner */}
          {limitReached && (
            <div className="flex items-center gap-2 px-3 py-2.5 mb-2 rounded-xl bg-red-500/[0.06] border border-red-500/15">
              <span className="text-[11px] text-red-400/80 font-medium font-['Inter']">Daily limit reached</span>
              <span className="text-[10px] text-white/20 font-['Inter']">Resets at midnight UTC</span>
              <a href="/pricing" className="ml-auto text-[10px] font-medium text-emerald-400/70 hover:text-emerald-400 transition-colors font-['Inter']">Upgrade</a>
            </div>
          )}

          {/* Approaching limit warning */}
          {!limitReached && promptUsage.remaining !== null && promptUsage.remaining > 0 && promptUsage.remaining <= 3 && (
            <div className="flex items-center gap-2 px-3 py-2 mb-2 rounded-xl bg-emerald-500/[0.04] border border-emerald-500/10">
              <span className="text-[10px] text-emerald-400/70 font-medium font-['Inter']">{promptUsage.remaining} prompt{promptUsage.remaining !== 1 ? 's' : ''} remaining today</span>
            </div>
          )}

          {/* Main input container */}
          <div className={`relative rounded-xl border border-white/[0.06] overflow-hidden transition-all duration-200 focus-within:border-white/[0.12] ${limitReached ? 'opacity-50 pointer-events-none' : ''}`}>
            {/* Code attachment indicator */}
            {codeInput.trim() && !showCodeInput && (
              <div className="flex items-center gap-2 px-4 pt-3">
                <span className="inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white/40 font-['Inter']">
                  <FileCode className="w-3 h-3" />
                  {codeLanguage} · {codeInput.split('\n').length} lines
                </span>
                <button onClick={() => setShowCodeInput(true)} className="text-[10px] text-white/20 hover:text-white/40 font-['Inter']">edit</button>
                <button onClick={() => setCodeInput('')} className="text-[10px] text-white/20 hover:text-red-400/60 font-['Inter']">remove</button>
              </div>
            )}

            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={codeInput.trim() ? 'Ask about the attached code...' : 'Ask about compliance, risk scoring, Cadence code...'}
              rows={1}
              className="w-full bg-transparent resize-none border-0 outline-none text-[14px] text-white/70 px-4 pt-4 pb-2 placeholder:text-white/20 max-h-36 leading-relaxed font-['Inter']"
              style={{ minHeight: '44px' }}
            />

            {/* Bottom toolbar row */}
            <div className="flex items-center justify-between px-3 pb-3">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowCodeInput(!showCodeInput)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${showCodeInput ? 'bg-white/[0.06] text-white/50' : 'text-white/15 hover:text-white/35 hover:bg-white/[0.04]'}`}
                  title="Import code"
                >
                  <Code className="w-4 h-4" />
                </button>
                <label className="w-8 h-8 rounded-lg flex items-center justify-center text-white/15 hover:text-white/35 hover:bg-white/[0.04] transition-all cursor-pointer" title="Upload file">
                  <Upload className="w-4 h-4" />
                  <input type="file" className="hidden" onChange={handleFileUpload} />
                </label>
                {voiceSupported && (
                  <button
                    onClick={toggleVoice}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                      isRecording
                        ? 'bg-red-500/15 text-red-400 motion-safe:animate-pulse'
                        : 'text-white/15 hover:text-white/35 hover:bg-white/[0.04]'
                    }`}
                    title={isRecording ? 'Stop recording' : 'Voice input'}
                  >
                    {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                )}
                {liveContext && !contextLoading && (
                  <span className="text-[10px] text-white/15 ml-1 flex items-center gap-1.5 font-['Inter']">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/50" />
                    Risk {liveContext.riskScore ?? '—'}/100
                  </span>
                )}
              </div>

              <AnimatePresence mode="wait">
                {(input.trim() || codeInput.trim()) ? (
                  <motion.button
                    key="send"
                    onClick={() => sendMessage()}
                    disabled={isLoading}
                    className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-emerald-500 text-white hover:bg-emerald-400"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Send className="h-3.5 w-3.5" />
                  </motion.button>
                ) : (
                  <motion.div
                    key="hint"
                    className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-white/10"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <CornerDownLeft className="w-3.5 h-3.5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <p className="text-[10px] text-white/10 text-center mt-2.5 font-['Inter']">
            FlowShield may make mistakes. Verify compliance advice independently.
          </p>
        </div>
      </div>
    </div>
  )
}
