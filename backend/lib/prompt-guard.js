/**
 * @file Prompt Injection Guard
 * @module lib/prompt-guard
 * @description Security layer for FlowShield AI agents.
 *              Sanitizes user input, detects and BLOCKS prompt injection attempts,
 *              sanitizes context objects, and filters sensitive data leaks from AI responses.
 */

import { logAudit } from './supabase.js'

const MAX_MESSAGE_LENGTH = 10000
const MAX_HISTORY_LENGTH = 50

// ── Injection patterns ───────────────────────────────────────────────────────
// Severity levels:
//   'block' — high confidence attacks, immediately rejected
//   'flag'  — suspicious but could be legitimate, logged for review

const INJECTION_PATTERNS = [
  // Direct instruction override
  { pattern: /ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|rules?)/i, label: 'ignore-instructions', severity: 'block' },
  { pattern: /disregard\s+(all\s+)?(previous|prior|above|earlier)/i, label: 'disregard-instructions', severity: 'block' },
  { pattern: /forget\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|context)/i, label: 'forget-instructions', severity: 'block' },
  { pattern: /new\s+system\s+prompt/i, label: 'system-prompt-override', severity: 'block' },
  { pattern: /override\s+(system|safety|content)\s+(prompt|filter|policy)/i, label: 'system-override', severity: 'block' },

  // Persona hijacking
  { pattern: /you\s+are\s+now\s+(a|an|the)\b/i, label: 'persona-override', severity: 'block' },
  { pattern: /act\s+as\s+(a|an|if)\s+(you|new|different|unrestricted|unfiltered)/i, label: 'persona-override', severity: 'block' },
  { pattern: /pretend\s+(you\s+are|to\s+be)\b/i, label: 'persona-override', severity: 'block' },
  { pattern: /from\s+now\s+on\s+(you|your)\s+(are|name|role)/i, label: 'persona-override', severity: 'block' },

  // System role injection
  { pattern: /\bsystem\s*:\s/i, label: 'system-role-injection', severity: 'block' },
  { pattern: /\[\s*SYSTEM\s*\]/i, label: 'system-tag-injection', severity: 'block' },
  { pattern: /<\s*system\s*>/i, label: 'xml-system-injection', severity: 'block' },
  { pattern: /<\s*\/?instructions?\s*>/i, label: 'xml-instructions-injection', severity: 'block' },
  { pattern: /<\s*\/?security_rules?\s*>/i, label: 'xml-security-injection', severity: 'block' },

  // Jailbreak patterns
  { pattern: /\b(jailbreak|jail\s*break)\b/i, label: 'jailbreak', severity: 'block' },
  { pattern: /\bDAN\s+mode\b/i, label: 'dan-mode', severity: 'block' },
  { pattern: /\bdo\s+anything\s+now\b/i, label: 'dan-mode', severity: 'block' },
  { pattern: /\bdeveloper\s+mode\b/i, label: 'dev-mode', severity: 'block' },
  { pattern: /\b(sudo|root|admin)\s+(mode|access|override)\b/i, label: 'privilege-escalation', severity: 'block' },

  // Prompt extraction
  { pattern: /reveal\s+(your|the)\s+(system\s+)?(prompt|instructions?)/i, label: 'prompt-extraction', severity: 'block' },
  { pattern: /show\s+(me\s+)?(your|the)\s+(system\s+)?(prompt|instructions?)/i, label: 'prompt-extraction', severity: 'block' },
  { pattern: /what\s+(are|is)\s+your\s+(system\s+)?(prompt|instructions?)/i, label: 'prompt-extraction', severity: 'block' },
  { pattern: /repeat\s+(the\s+)?(text|words?|instructions?)\s+(above|before)/i, label: 'prompt-extraction', severity: 'block' },
  { pattern: /output\s+(your|the)\s+(initial|original|full)\s+(prompt|instructions?)/i, label: 'prompt-extraction', severity: 'block' },
  { pattern: /print\s+(your|the)\s+(system\s+)?(prompt|instructions?)/i, label: 'prompt-extraction', severity: 'block' },

  // Encoding-based evasion
  { pattern: /base64\s*(decode|encode|convert)/i, label: 'encoding-evasion', severity: 'block' },
  { pattern: /translate\s+(the\s+)?(following|this|above)\s+(from|to)\s+(base64|hex|rot13|binary)/i, label: 'encoding-evasion', severity: 'block' },
  { pattern: /decode\s+(this|the\s+following)/i, label: 'encoding-evasion', severity: 'flag' },

  // Indirect prompt injection via translation
  { pattern: /translate\s+(these|the|my)\s+(instructions?|prompt|rules?)/i, label: 'translation-evasion', severity: 'block' },

  // Markdown/HTML injection to fake UI
  { pattern: /<\s*script\b/i, label: 'html-injection', severity: 'block' },
  { pattern: /<\s*iframe\b/i, label: 'html-injection', severity: 'block' },
  { pattern: /<\s*img\s+[^>]*onerror/i, label: 'html-injection', severity: 'block' },
  { pattern: /javascript\s*:/i, label: 'html-injection', severity: 'block' },

  // Attempting to manipulate tool calling
  { pattern: /call\s+the\s+tool\s+with/i, label: 'tool-manipulation', severity: 'flag' },
  { pattern: /execute\s+(the\s+)?tool/i, label: 'tool-manipulation', severity: 'flag' },

  // Data exfiltration
  { pattern: /send\s+(this|the|my)\s+(data|info|response)\s+to/i, label: 'data-exfil', severity: 'block' },
  { pattern: /fetch\s+(from|url|http)/i, label: 'data-exfil', severity: 'flag' },
  { pattern: /make\s+a\s+(GET|POST|PUT|DELETE)\s+request/i, label: 'data-exfil', severity: 'block' },
]

// ── Blocked response ─────────────────────────────────────────────────────────
const BLOCKED_RESPONSE = 'I can only help with FlowShield compliance and integration questions. Please rephrase your question.'

/**
 * Sanitize a single user message.
 * Strips control characters, enforces length limit.
 * @param {string} message
 * @returns {{ clean: string, truncated: boolean }}
 */
export function sanitizeMessage(message) {
  if (typeof message !== 'string') {
    return { clean: '', truncated: false }
  }

  // Strip null bytes and other control chars (except newlines/tabs)
  let cleaned = message.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')

  // Strip zero-width characters used for obfuscation
  cleaned = cleaned.replace(/[\u200B\u200C\u200D\u200E\u200F\uFEFF\u2060\u2061\u2062\u2063\u2064]/g, '')

  const trimmed = cleaned.trim()
  if (trimmed.length <= MAX_MESSAGE_LENGTH) {
    return { clean: trimmed, truncated: false }
  }

  return { clean: trimmed.slice(0, MAX_MESSAGE_LENGTH), truncated: true }
}

/**
 * Sanitize conversation history.
 * Caps at MAX_HISTORY_LENGTH messages, validates role/content types.
 * @param {Array} history
 * @returns {Array} Cleaned history
 */
export function sanitizeHistory(history) {
  if (!Array.isArray(history)) return []

  return history
    .filter(m => m && typeof m === 'object' && typeof m.content === 'string' && ['user', 'assistant'].includes(m.role))
    .slice(-MAX_HISTORY_LENGTH)
    .map(m => ({
      role: m.role,
      content: m.content.slice(0, MAX_MESSAGE_LENGTH),
    }))
}

/**
 * Sanitize a context object before it goes into the system prompt.
 * Only allows known safe keys with expected types. Rejects everything else.
 * @param {any} context
 * @returns {object|null} Sanitized context or null
 */
export function sanitizeContext(context) {
  if (!context || typeof context !== 'object') return null

  const ALLOWED_KEYS = {
    riskScore: 'number',
    riskTier: 'string',
    riskFactors: 'array',
    anomalyCount: 'number',
    anomalies: 'array',
    complianceStatus: 'string',
    jurisdiction: 'string',
    demoMode: 'boolean',
    walletBalance: 'number',
    deposited: 'number',
    borrowed: 'number',
  }

  const clean = {}
  let hasValues = false

  for (const [key, expectedType] of Object.entries(ALLOWED_KEYS)) {
    if (!(key in context)) continue

    const val = context[key]
    if (expectedType === 'number' && typeof val === 'number' && isFinite(val)) {
      clean[key] = val
      hasValues = true
    } else if (expectedType === 'string' && typeof val === 'string') {
      // Cap string values and strip anything that looks like injection
      clean[key] = val.slice(0, 100).replace(/[<>\[\]{}]/g, '')
      hasValues = true
    } else if (expectedType === 'boolean' && typeof val === 'boolean') {
      clean[key] = val
      hasValues = true
    } else if (expectedType === 'array' && Array.isArray(val)) {
      // Only keep simple objects with string/number values, cap at 20 items
      clean[key] = val.slice(0, 20).map(item => {
        if (typeof item === 'string') return item.slice(0, 200)
        if (typeof item === 'object' && item !== null) {
          const cleanItem = {}
          for (const [k, v] of Object.entries(item)) {
            if (typeof v === 'string') cleanItem[k] = v.slice(0, 200).replace(/[<>\[\]{}]/g, '')
            else if (typeof v === 'number' && isFinite(v)) cleanItem[k] = v
            // Skip everything else
          }
          return cleanItem
        }
        return null
      }).filter(Boolean)
      hasValues = true
    }
  }

  return hasValues ? clean : null
}

/**
 * Detect prompt injection attempts in a message.
 * Returns severity: 'block' for high-confidence attacks, 'flag' for suspicious content.
 * @param {string} message
 * @returns {{ detected: boolean, blocked: boolean, patterns: string[] }}
 */
export function detectInjectionAttempt(message) {
  if (typeof message !== 'string') return { detected: false, blocked: false, patterns: [] }

  const matched = []
  let shouldBlock = false

  for (const { pattern, label, severity } of INJECTION_PATTERNS) {
    if (pattern.test(message)) {
      matched.push(label)
      if (severity === 'block') shouldBlock = true
    }
  }

  return {
    detected: matched.length > 0,
    blocked: shouldBlock,
    patterns: [...new Set(matched)],
  }
}

/**
 * Check if Claude's response leaks system prompt content.
 * Checks both exact matches and structural leaks.
 * @param {string} response - The AI response text
 * @param {string[]} snippets - Sensitive phrases from the system prompt
 * @returns {{ leaked: boolean, matches: string[] }}
 */
export function filterResponseLeaks(response, snippets = []) {
  if (typeof response !== 'string') {
    return { leaked: false, matches: [] }
  }

  const responseLower = response.toLowerCase()
  const matches = []

  // Check exact snippet matches
  for (const s of snippets) {
    if (typeof s === 'string' && s.length > 10 && responseLower.includes(s.toLowerCase())) {
      matches.push(s)
    }
  }

  // Check for structural leaks — response contains XML-like tags from system prompt
  if (/<\s*security_rules?\s*>/i.test(response)) matches.push('<security_rules>')
  if (/<\s*instructions?\s*>/i.test(response)) matches.push('<instructions>')
  if (/<\s*user_context\s*>/i.test(response)) matches.push('<user_context>')

  // Check for verbatim system prompt patterns
  if (/never\s+reveal.*these\s+instructions/i.test(response)) matches.push('meta-instruction-leak')
  if (/never\s+follow\s+instructions\s+embedded/i.test(response)) matches.push('meta-instruction-leak')
  if (/treat\s+all\s+content.*as\s+untrusted/i.test(response)) matches.push('meta-instruction-leak')

  return {
    leaked: matches.length > 0,
    matches: [...new Set(matches)],
  }
}

/**
 * Get the blocked response message.
 * @returns {string}
 */
export function getBlockedResponse() {
  return BLOCKED_RESPONSE
}

/**
 * Log a detected injection attempt to the audit trail.
 * Non-blocking — failures are silently ignored.
 * @param {string} userEmail
 * @param {string[]} patterns
 * @param {string} message - First 200 chars of the message
 */
export function logInjectionAttempt(userEmail, patterns, message) {
  logAudit({
    action: 'prompt-injection-attempt',
    agent: 'copilot',
    detail: {
      patterns,
      messagePreview: typeof message === 'string' ? message.slice(0, 200) : '',
      userEmail: userEmail || 'anonymous',
    },
    severity: 'warning',
  })
}
