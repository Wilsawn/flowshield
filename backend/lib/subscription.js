/**
 * @file Subscription & Access Control
 * @module lib/subscription
 * @description Tier-based access control for FlowShield API.
 *              Revenue model: on-chain verification fees, API subscriptions (Stripe),
 *              and enterprise contract deployments.
 */
//   1. On-chain fees: 0.001 FLOW per verification, 0.01 FLOW per credential mint
//   2. API subscriptions (below)
//   3. Enterprise custom contracts
//
// Pricing based on industry comps:
//   Sumsub ($199-499/mo), Persona (free + usage), Auth0 (free-$240/mo),
//   ComplyAdvantage ($500-2k/mo), Chainalysis (enterprise-only)
//
// FlowShield undercuts traditional compliance vendors by 60-80% because
// ZK proofs + on-chain credentials eliminate manual review overhead.

const TIERS = {
  starter: {
    name: 'Starter',
    price: 0,
    monthlyLimit: 1000,
    jurisdictions: ['US'],
    features: ['verify', 'verifyFull'],
    copilot: false,
    radar: false,
    webhooks: false,
    sla: null,
    stripePriceId: null, // free tier — no Stripe product
  },
  growth: {
    name: 'Growth',
    price: 149,
    monthlyLimit: 25000,
    jurisdictions: ['US', 'EU', 'UK', 'SG', 'CA'],
    features: ['verify', 'verifyFull', 'verifyWithRecord', 'verifyForJurisdiction', 'radar', 'copilot'],
    copilot: true,
    radar: true,
    webhooks: true,
    sla: '99.9%',
    stripePriceId: process.env.STRIPE_GROWTH_PRICE_ID || null,
  },
  scale: {
    name: 'Scale',
    price: 499,
    monthlyLimit: -1, // unlimited
    jurisdictions: ['US', 'EU', 'UK', 'SG', 'CA', 'JP', 'AU', 'BR', 'KR', 'custom'],
    features: ['verify', 'verifyFull', 'verifyWithRecord', 'verifyForJurisdiction', 'radar', 'copilot', 'admin', 'webhooks', 'dedicated'],
    copilot: true,
    radar: true,
    webhooks: true,
    sla: '99.99%',
    stripePriceId: process.env.STRIPE_SCALE_PRICE_ID || null,
  },
}

import { getSupabase } from './supabase.js'

// In-memory fallback (dev mode or when Supabase is down)
const apiKeysMemory = new Map()
const dailyUsageMemory = new Map()

// Register a new protocol with an API key
async function registerProtocol(apiKey, { name, tier = 'free', contactEmail }) {
  const record = {
    name,
    tier,
    contactEmail,
    createdAt: new Date().toISOString(),
    active: true,
  }
  apiKeysMemory.set(apiKey, record)
  const sb = getSupabase()
  if (sb) {
    try {
      await sb.from('api_keys').upsert({
        key: apiKey,
        protocol_name: name,
        tier,
        contact_email: contactEmail,
        created_at: record.createdAt,
      }, { onConflict: 'key' })
    } catch (err) {
      console.warn('[Subscription] Supabase api_keys save failed:', err.message)
    }
  }
  return { apiKey, tier: TIERS[tier], protocol: name }
}

// Get protocol info from API key
async function getProtocol(apiKey) {
  if (apiKeysMemory.has(apiKey)) return apiKeysMemory.get(apiKey)
  const sb = getSupabase()
  if (sb) {
    try {
      const { data } = await sb.from('api_keys').select('*').eq('key', apiKey).single()
      if (data) {
        const record = {
          name: data.protocol_name,
          tier: data.tier,
          contactEmail: data.contact_email,
          createdAt: data.created_at,
          active: true,
        }
        apiKeysMemory.set(apiKey, record)
        return record
      }
    } catch { /* fall through */ }
  }
  return null
}

// Check if a protocol has access to a feature
async function hasFeature(apiKey, feature) {
  const protocol = await getProtocol(apiKey)
  if (!protocol || !protocol.active) return false
  const tier = TIERS[protocol.tier]
  if (!tier) return false
  return tier.features.includes(feature)
}

// Check and increment monthly usage
async function checkUsage(apiKey) {
  const protocol = await getProtocol(apiKey)
  if (!protocol) return { allowed: false, reason: 'Invalid API key' }

  const tier = TIERS[protocol.tier]
  if (!tier) return { allowed: false, reason: 'Invalid tier' }

  // Unlimited for scale tier
  if (tier.monthlyLimit === -1) return { allowed: true, remaining: -1 }

  const month = new Date().toISOString().slice(0, 7) // YYYY-MM
  const usageKey = `${apiKey}:${month}`

  // Try Supabase first
  const sb = getSupabase()
  if (sb) {
    try {
      const { data } = await sb.from('api_usage').select('count').eq('key', apiKey).eq('date', month).single()
      const current = data?.count || 0

      if (current >= tier.monthlyLimit) {
        return { allowed: false, reason: `Monthly limit reached (${tier.monthlyLimit.toLocaleString()} requests). Upgrade for more.`, limit: tier.monthlyLimit, used: current }
      }

      await sb.from('api_usage').upsert({ key: apiKey, date: month, count: current + 1 }, { onConflict: 'key,date' })
      return { allowed: true, remaining: tier.monthlyLimit - current - 1 }
    } catch { /* fall through to memory */ }
  }

  const current = dailyUsageMemory.get(usageKey) || 0
  if (current >= tier.monthlyLimit) {
    return { allowed: false, reason: `Monthly limit reached (${tier.monthlyLimit.toLocaleString()} requests). Upgrade for more.`, limit: tier.monthlyLimit, used: current }
  }
  dailyUsageMemory.set(usageKey, current + 1)
  return { allowed: true, remaining: tier.monthlyLimit - current - 1 }
}

// Express middleware: enforce tier-based access
function requireTier(minimumTier) {
  const tierOrder = ['starter', 'growth', 'scale']

  return async (req, res, next) => {
    const apiKey = req.headers['x-api-key'] || req.query.apiKey

    // Allow unauthenticated requests in demo mode (no API key = free tier)
    if (!apiKey) {
      req.tier = TIERS.starter
      req.tierName = 'starter'
      return next()
    }

    const protocol = await getProtocol(apiKey)
    if (!protocol || !protocol.active) {
      return res.status(401).json({ error: 'Invalid or inactive API key' })
    }

    const protocolTierIndex = tierOrder.indexOf(protocol.tier)
    const requiredTierIndex = tierOrder.indexOf(minimumTier)

    if (protocolTierIndex < requiredTierIndex) {
      return res.status(403).json({
        error: `This endpoint requires ${minimumTier} tier or above`,
        currentTier: protocol.tier,
        upgrade: `Upgrade to ${minimumTier} tier via the billing portal`,
      })
    }

    // Check usage
    const usage = await checkUsage(apiKey)
    if (!usage.allowed) {
      return res.status(429).json({ error: usage.reason, limit: usage.limit, used: usage.used })
    }

    req.tier = TIERS[protocol.tier]
    req.tierName = protocol.tier
    req.protocol = protocol
    req.usage = usage
    next()
  }
}

// Get pricing info (public endpoint)
function getPricing() {
  return Object.entries(TIERS).map(([key, tier]) => ({
    id: key,
    name: tier.name,
    price: tier.price,
    priceLabel: tier.price === 0 ? 'Free' : `$${tier.price}/mo`,
    monthlyLimit: tier.monthlyLimit === -1 ? 'Unlimited' : tier.monthlyLimit.toLocaleString(),
    jurisdictions: tier.jurisdictions,
    copilot: tier.copilot,
    radar: tier.radar,
    webhooks: tier.webhooks,
    sla: tier.sla || 'Best effort',
    stripePriceId: !!tier.stripePriceId,
  }))
}

// Seed demo protocols (dev only — never in production)
if (process.env.NODE_ENV !== 'production') {
  registerProtocol('demo-starter-key', { name: 'Demo DeFi Protocol', tier: 'starter', contactEmail: 'demo@example.com' })
  registerProtocol('demo-growth-key', { name: 'FlowShield Growth Demo', tier: 'growth', contactEmail: 'demo@example.com' })
  registerProtocol('demo-scale-key', { name: 'FlowShield Scale', tier: 'scale', contactEmail: 'demo@example.com' })
}

export {
  TIERS,
  registerProtocol,
  getProtocol,
  hasFeature,
  checkUsage,
  requireTier,
  getPricing,
}
