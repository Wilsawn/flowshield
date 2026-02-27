// lib/middleware.js
// Middleware for FlowShield API — authentication, rate limiting, etc.

import { validateApiKey } from './supabase.js'

/**
 * API key authentication middleware.
 * 
 * In dev mode (no SUPABASE_URL): all requests pass through.
 * In production: requires `x-api-key` header or `?api_key` query param.
 * 
 * Public endpoints (health, docs) should be mounted BEFORE this middleware.
 */
export function requireApiKey(req, res, next) {
  // Dev mode — no Supabase means no key enforcement
  if (!process.env.SUPABASE_URL) {
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

// Clean up rate limit store every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore) {
    if (now > entry.resetAt) rateLimitStore.delete(key)
  }
}, 300000)
