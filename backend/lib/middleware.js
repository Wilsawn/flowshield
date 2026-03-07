// lib/middleware.js
// Middleware for FlowShield API — authentication, rate limiting, etc.

import { validateApiKey } from './supabase.js'
import { createHmac, timingSafeEqual, randomBytes } from 'crypto'

/**
 * API key authentication middleware.
 * 
 * In dev mode (no SUPABASE_URL): all requests pass through.
 * In production: requires `x-api-key` header or `?api_key` query param.
 * 
 * Public endpoints (health, docs) should be mounted BEFORE this middleware.
 */
export function requireApiKey(req, res, next) {
  if (!process.env.SUPABASE_URL) {
    if (process.env.NODE_ENV === 'production') {
      return res.status(503).json({ error: 'Auth backend not configured' })
    }
    // Dev mode — no Supabase means no key enforcement
    return next()
  }

  // Skip auth for health check
  if (req.path === '/health') {
    return next()
  }

  const apiKey = req.headers['x-api-key'] || req.query.api_key

  if (!apiKey) {
    return res.status(401).json({
      error: 'API key required',
      message: 'Include your API key in the x-api-key header or api_key query parameter.',
      docs: 'https://flowshield.xyz/docs/api',
    })
  }

  validateApiKey(apiKey).then(keyData => {
    if (!keyData) {
      return res.status(403).json({
        error: 'Invalid API key',
        message: 'The provided API key is not valid or has been disabled.',
      })
    }

    // Attach key metadata to request for downstream use
    req.apiKeyData = keyData
    next()
  }).catch(() => {
    // If validation fails (e.g. Supabase down), allow in dev, block in prod
    if (process.env.NODE_ENV === 'production') {
      return res.status(500).json({ error: 'Could not validate API key' })
    }
    next()
  })
}

/**
 * Simple in-memory rate limiter.
 * Limits requests per IP per window (default: 100 req / 60s).
 */
const rateLimitStore = new Map()

export function rateLimit({ windowMs = 60000, max = 100 } = {}) {
  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress || 'unknown'
    const now = Date.now()

    if (!rateLimitStore.has(key)) {
      rateLimitStore.set(key, { count: 1, resetAt: now + windowMs })
      return next()
    }

    const entry = rateLimitStore.get(key)

    if (now > entry.resetAt) {
      entry.count = 1
      entry.resetAt = now + windowMs
      return next()
    }

    entry.count++

    if (entry.count > max) {
      res.set('Retry-After', Math.ceil((entry.resetAt - now) / 1000))
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Maximum ${max} requests per ${windowMs / 1000}s. Try again in ${Math.ceil((entry.resetAt - now) / 1000)}s.`,
      })
    }

    next()
  }
}

/**
 * Generate a session token for a user (HMAC-based, no external deps).
 * Format: base64(email):expiry:hmac
 */
// Generate a random fallback secret for dev mode (per-process, not hardcoded)
const DEV_SECRET = process.env.NODE_ENV !== 'production'
  ? randomBytes(32).toString('hex')
  : undefined

function getTokenSecret() {
  const secret = process.env.JWT_SECRET || DEV_SECRET
  if (!secret) throw new Error('JWT_SECRET is required in production')
  return secret
}

export function generateSessionToken(email, expiresInMs = 3600000) {
  const secret = getTokenSecret()
  const expiry = Date.now() + expiresInMs
  const payload = `${Buffer.from(email.toLowerCase()).toString('base64')}:${expiry}`
  const hmac = createHmac('sha256', secret).update(payload).digest('hex')
  return `${payload}:${hmac}`
}

/**
 * Verify a session token. Returns { email, expiry } or null.
 */
export function verifySessionToken(token) {
  if (!token) return null
  let secret
  try { secret = getTokenSecret() } catch { return null }

  const parts = token.split(':')
  if (parts.length !== 3) return null

  const [emailB64, expiryStr, providedHmac] = parts
  const payload = `${emailB64}:${expiryStr}`
  const expectedHmac = createHmac('sha256', secret).update(payload).digest('hex')

  // Timing-safe comparison
  try {
    const a = Buffer.from(providedHmac, 'hex')
    const b = Buffer.from(expectedHmac, 'hex')
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  } catch {
    return null
  }

  const expiry = parseInt(expiryStr, 10)
  if (Date.now() > expiry) return null

  try {
    const email = Buffer.from(emailB64, 'base64').toString('utf8')
    return { email, expiry }
  } catch {
    return null
  }
}

/**
 * User authentication middleware.
 * Checks Authorization: Bearer <token> header.
 * In dev mode (no JWT_SECRET and no SUPABASE_URL): passes through.
 * Sets req.userEmail on success.
 */
export function requireAuth(req, res, next) {
  if (!process.env.JWT_SECRET && !process.env.SUPABASE_URL) {
    if (process.env.NODE_ENV === 'production') {
      return res.status(503).json({ error: 'Auth backend not configured' })
    }
    // Dev mode — no auth enforcement
    req.userEmail = req.body?.email || null
    return next()
  }

  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required', message: 'Include a Bearer token in the Authorization header.' })
  }

  const token = authHeader.slice(7)
  const session = verifySessionToken(token)

  if (!session) {
    return res.status(401).json({ error: 'Invalid or expired session', message: 'Please log in again.' })
  }

  req.userEmail = session.email
  next()
}

/**
 * Production-safe error message helper.
 * In production: returns a generic fallback to avoid leaking internal details.
 * In dev: returns the full error message for debugging.
 */
export function safeError(err, fallback = 'Internal error') {
  return process.env.NODE_ENV === 'production' ? fallback : err.message
}

// Clean up rate limit store every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore) {
    if (now > entry.resetAt) rateLimitStore.delete(key)
  }
}, 300000)
