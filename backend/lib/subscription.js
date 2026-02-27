// subscription.js
// Tier-based access control for FlowShield API.
//
// Revenue model:
//   Free:       Basic verify() calls, 1 jurisdiction, 100 req/day
//   Pro:        All jurisdictions, Radar scans, Copilot, 10K req/day — $499/mo
//   Enterprise: Custom jurisdictions, dedicated Copilot, SLA, unlimited — $2,999/mo
//
// Protocols register with an API key and are assigned a tier.
// Middleware checks tier before allowing access to gated endpoints.

const TIERS = {
  free: {
    name: 'Free',
    price: 0,
    dailyLimit: 100,
    jurisdictions: ['US'],
    features: ['verify', 'verifyFull'],
    copilot: false,
    radar: false,
    webhooks: false,
    sla: null,
  },
  pro: {
    name: 'Pro',
    price: 499,
    dailyLimit: 10000,
    jurisdictions: ['US', 'EU', 'UK', 'SG', 'CA'],
    features: ['verify', 'verifyFull', 'verifyWithRecord', 'verifyForJurisdiction', 'radar', 'copilot'],
    copilot: true,
    radar: true,
    webhooks: true,
    sla: '99.9%',
  },
  enterprise: {
    name: 'Enterprise',
    price: 2999,
    dailyLimit: -1, // unlimited
    jurisdictions: ['US', 'EU', 'UK', 'SG', 'CA', 'JP', 'AU', 'BR', 'KR', 'custom'],
    features: ['verify', 'verifyFull', 'verifyWithRecord', 'verifyForJurisdiction', 'radar', 'copilot', 'admin', 'webhooks', 'dedicated'],
    copilot: true,
    radar: true,
    webhooks: true,
    sla: '99.99%',
  },
}

// In-memory store for demo. Production: Supabase or Stripe.
const apiKeys = new Map()
const dailyUsage = new Map()

// Register a new protocol with an API key
function registerProtocol(apiKey, { name, tier = 'free', contactEmail }) {
  apiKeys.set(apiKey, {
    name,
    tier,
    contactEmail,
    createdAt: new Date().toISOString(),
    active: true,
  })
  return { apiKey, tier: TIERS[tier], protocol: name }
}

// Get protocol info from API key
function getProtocol(apiKey) {
  return apiKeys.get(apiKey) || null
}

// Check if a protocol has access to a feature
function hasFeature(apiKey, feature) {
  const protocol = apiKeys.get(apiKey)
  if (!protocol || !protocol.active) return false
  const tier = TIERS[protocol.tier]
  if (!tier) return false
  return tier.features.includes(feature)
}

// Check and increment daily usage
function checkUsage(apiKey) {
  const protocol = apiKeys.get(apiKey)
  if (!protocol) return { allowed: false, reason: 'Invalid API key' }

  const tier = TIERS[protocol.tier]
  if (!tier) return { allowed: false, reason: 'Invalid tier' }

  // Unlimited for enterprise
  if (tier.dailyLimit === -1) return { allowed: true, remaining: -1 }

  const today = new Date().toISOString().split('T')[0]
  const key = `${apiKey}:${today}`
  const current = dailyUsage.get(key) || 0

  if (current >= tier.dailyLimit) {
    return {
      allowed: false,
      reason: `Daily limit reached (${tier.dailyLimit} requests). Upgrade to ${protocol.tier === 'free' ? 'Pro' : 'Enterprise'} for more.`,
      limit: tier.dailyLimit,
      used: current,
    }
  }

  dailyUsage.set(key, current + 1)
  return { allowed: true, remaining: tier.dailyLimit - current - 1 }
}

// Express middleware: enforce tier-based access
function requireTier(minimumTier) {
  const tierOrder = ['free', 'pro', 'enterprise']

  return (req, res, next) => {
    const apiKey = req.headers['x-api-key'] || req.query.apiKey

    // Allow unauthenticated requests in demo mode (no API key = free tier)
    if (!apiKey) {
      req.tier = TIERS.free
      req.tierName = 'free'
      return next()
    }

    const protocol = apiKeys.get(apiKey)
    if (!protocol || !protocol.active) {
      return res.status(401).json({ error: 'Invalid or inactive API key' })
    }

    const protocolTierIndex = tierOrder.indexOf(protocol.tier)
    const requiredTierIndex = tierOrder.indexOf(minimumTier)

    if (protocolTierIndex < requiredTierIndex) {
      return res.status(403).json({
        error: `This endpoint requires ${minimumTier} tier or above`,
        currentTier: protocol.tier,
        upgrade: `Contact sales@flowshield.xyz to upgrade to ${minimumTier}`,
      })
    }

    // Check daily usage
    const usage = checkUsage(apiKey)
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
    dailyLimit: tier.dailyLimit === -1 ? 'Unlimited' : tier.dailyLimit.toLocaleString(),
    jurisdictions: tier.jurisdictions,
    copilot: tier.copilot,
    radar: tier.radar,
    webhooks: tier.webhooks,
    sla: tier.sla || 'Best effort',
  }))
}

// Seed demo protocols
registerProtocol('demo-free-key', { name: 'Demo DeFi Protocol', tier: 'free', contactEmail: 'demo@example.com' })
registerProtocol('demo-pro-key', { name: 'FlowShield Pro Demo', tier: 'pro', contactEmail: 'pro@flowshield.xyz' })
registerProtocol('demo-enterprise-key', { name: 'FlowShield Enterprise', tier: 'enterprise', contactEmail: 'enterprise@flowshield.xyz' })

export {
  TIERS,
  registerProtocol,
  getProtocol,
  hasFeature,
  checkUsage,
  requireTier,
  getPricing,
}
