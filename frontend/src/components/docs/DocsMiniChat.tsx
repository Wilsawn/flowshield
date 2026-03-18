import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, X, Send, Loader2 } from 'lucide-react'
import FlowShieldLogo from '@/components/FlowShieldLogo'
import { API } from '@/lib/api'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function DocsMiniChat() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus()
  }, [open])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || loading) return

    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setLoading(true)

    try {
      const token = localStorage.getItem('flowshield_token')
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch(`${API}/api/copilot/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: text,
          sessionId: 'docs-mini-chat',
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setMessages(prev => [...prev, { role: 'assistant', content: data.response || data.message || 'No response.' }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Sign in to use the AI assistant, or explore the graph nodes for documentation.' }])
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Could not connect to the server. Try again later.' }])
    }
    setLoading(false)
  }

  return (
    <>
      <AnimatePresence initial={false} mode="wait">
        {!open ? (
          <motion.button
            key="chat-btn"
            className="absolute bottom-4 right-4 z-50 w-11 h-11 rounded-full bg-white/[0.08] border border-white/[0.1] flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.12] hover:border-white/[0.15] shadow-[0_4px_24px_rgba(0,0,0,0.4)]"
            onClick={() => setOpen(true)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            title="Ask AI about FlowShield"
          >
            <MessageSquare className="w-4.5 h-4.5" />
          </motion.button>
        ) : (
          <motion.div
            key="chat-panel"
            className="absolute bottom-4 right-4 z-50 w-[340px] max-w-[calc(100%-2rem)] rounded-2xl border border-white/[0.08] bg-[#060e09] shadow-[0_8px_48px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col"
            style={{ height: '420px' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] shrink-0">
              <div className="flex items-center gap-2">
                <FlowShieldLogo size={20} />
                <span className="text-[13px] font-medium text-white/70">Ask about FlowShield</span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded text-white/20 hover:text-white/60 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 chat-scroll">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center py-8">
                  <MessageSquare className="w-8 h-8 text-white/10 mb-3" />
                  <p className="text-[13px] text-white/30 mb-1">Ask anything about FlowShield</p>
                  <p className="text-[11px] text-white/15">Contracts, agents, API, integration...</p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] px-3 py-2 rounded-xl text-[12px] leading-[1.7] ${
                      msg.role === 'user'
                        ? 'bg-white/[0.08] text-white/70 rounded-br-md'
                        : 'bg-emerald-500/[0.06] border border-emerald-500/[0.08] text-white/55 rounded-bl-md'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="px-3 py-2 rounded-xl rounded-bl-md bg-emerald-500/[0.06] border border-emerald-500/[0.08]">
                    <Loader2 className="w-3.5 h-3.5 text-emerald-400/50 animate-spin" />
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="px-3 py-3 border-t border-white/[0.06] shrink-0">
              <form
                onSubmit={(e) => { e.preventDefault(); sendMessage() }}
                className="flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="e.g. How does ComplianceAction work?"
                  className="flex-1 h-9 px-3 rounded-lg border border-white/[0.06] bg-white/[0.03] text-[12px] text-white placeholder:text-white/15 focus:outline-none focus:border-emerald-500/30 transition-colors"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="h-9 w-9 rounded-lg bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center text-emerald-400 disabled:opacity-30 hover:bg-emerald-500/25 transition-colors shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
