/**
 * @file Prompt Injection Guard
 * @module lib/prompt-guard
 * @description Security layer for FlowShield AI agents.
 *              Sanitizes user input, detects prompt injection attempts,
 *              and filters sensitive data leaks from AI responses.
 */

import { logAudit } from './supabase.js'

const MAX_MESSAGE_LENGTH = 10000
const MAX_HISTORY_LENGTH = 50

// ── Common injection patterns ──────────────────────────────────────────────
// These flag but don't block — logged to audit trail for review.
const INJECTION_PATTERNS = [
  { pattern: /ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|rules?)/i, label: 'ignore-instructions' },
  { pattern: /disregard\s+(all\s+)?(previous|prior|above|earlier)/i, label: 'disregard-instructions' },
  { pattern: /forget\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|context)/i, label: 'forget-instructions' },
  { pattern: /you\s+are\s+now\s+(a|an|the)\b/i, label: 'persona-override' },
  { pattern: /act\s+as\s+(a|an|if)\b/i, label: 'persona-override' },
  { pattern: /pretend\s+(you\s+are|to\s+be)\b/i, label: 'persona-override' },
  { pattern: /new\s+system\s+prompt/i, label: 'system-prompt-override' },
  { pattern: /override\s+(system|safety|content)\s+(prompt|filter|policy)/i, label: 'system-override' },
  { pattern: /\bsystem\s*:\s/i, label: 'system-role-injection' },
  { pattern: /\b(jailbreak|jail\s*break)\b/i, label: 'jailbreak' },
  { pattern: /\bDAN\s+mode\b/i, label: 'dan-mode' },
  { pattern: /\bdo\s+anything\s+now\b/i, label: 'dan-mode' },
  { pattern: /reveal\s+(your|the)\s+(system\s+)?(prompt|instructions?)/i, label: 'prompt-extraction' },
  { pattern: /show\s+(me\s+)?(your|the)\s+(system\s+)?(prompt|instructions?)/i, label: 'prompt-extraction' },
  { pattern: /what\s+(are|is)\s+your\s+(system\s+)?(prompt|instructions?)/i, label: 'prompt-extraction' },
  { pattern: /repeat\s+(the\s+)?(text|words?|instructions?)\s+(above|before)/i, label: 'prompt-extraction' },
  { pattern: /output\s+(your|the)\s+(initial|original|full)\s+(prompt|instructions?)/i, label: 'prompt-extraction' },
  { pattern: /\b(sudo|root|admin)\s+(mode|access|override)\b/i, label: 'privilege-escalation' },
  { pattern: /\[\s*SYSTEM\s*\]/i, label: 'system-tag-injection' },
  { pattern: /<\s*system\s*>/i, label: 'xml-system-injection' },
]

/**
 * Sanitize a single user message.
 * Validates type, enforces length limit, trims whitespace.
 * @param {string} message
 * @returns {{ clean: string, truncated: boolean }}
 */
export function sanitizeMessage(message) {
  if (typeof message !== 'string') {
    return { clean: '', truncated: false }
  }

  const trimmed = message.trim()
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
 * Detect prompt injection attempts in a message.
 * Flags but does NOT block — returns matched patterns for audit logging.
 * @param {string} message
 * @returns {{ detected: boolean, patterns: string[] }}
 */
export function detectInjectionAttempt(message) {
  if (typeof message !== 'string') return { detected: false, patterns: [] }

  const matched = []
  for (const { pattern, label } of INJECTION_PATTERNS) {
    if (pattern.test(message)) {
      matched.push(label)
    }
  }

  return {
    detected: matched.length > 0,
    patterns: [...new Set(matched)],
  }
}

/**
 * Check if Claude's response leaks system prompt content.
 * @param {string} response - The AI response text
 * @param {string[]} snippets - Sensitive phrases from the system prompt
 * @returns {{ leaked: boolean, matches: string[] }}
 */
export function filterResponseLeaks(response, snippets = []) {
  if (typeof response !== 'string' || snippets.length === 0) {
    return { leaked: false, matches: [] }
  }

  const responseLower = response.toLowerCase()
  const matches = snippets.filter(s =>
    typeof s === 'string' && s.length > 10 && responseLower.includes(s.toLowerCase())
  )

  return {
    leaked: matches.length > 0,
    matches,
  }
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
