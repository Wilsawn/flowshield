// risk-scoring.js
// Rule-based risk scoring agent. No LLM API needed.
// Analyzes public on-chain Flow data to assign risk tiers.

const RISK_FACTORS = [
  { id: 'account_age_7d', label: 'Account age < 7 days', points: 15, check: (d) => d.accountAgeDays < 7 },
  { id: 'account_age_30d', label: 'Account age < 30 days', points: 8, check: (d) => d.accountAgeDays >= 7 && d.accountAgeDays < 30 },
  { id: 'high_volume_24h', label: 'High tx volume in 24h', points: 20, check: (d) => d.txCount24h > 50 },
  { id: 'rapid_in_out', label: 'Rapid in-out pattern', points: 25, check: (d) => d.rapidInOut },
  { id: 'flagged_contract', label: 'Flagged contract interaction', points: 30, check: (d) => d.flaggedContracts > 0 },
  { id: 'mixer_interaction', label: 'Mixer interaction', points: 35, check: (d) => d.mixerInteractions > 0 },
  { id: 'multi_funding', label: 'Multiple wallet funding sources', points: 15, check: (d) => d.fundingSources > 5 },
  { id: 'dormancy_spike', label: 'Dormant then suddenly active', points: 12, check: (d) => d.dormancySpike },
]

function getTier(score) {
  if (score <= 30) return 'compliant'
  if (score <= 70) return 'semi-compliant'
  return 'non-compliant'
}

/**
 * Calculate risk score from wallet data
 * @param {object} walletData - Public chain data about the wallet
 * @returns {{ score: number, tier: string, factors: object[] }}
 */
export function calculateRiskScore(walletData) {
  let score = 0
  const activeFactors = []

  for (const factor of RISK_FACTORS) {
    try {
      if (factor.check(walletData)) {
        score += factor.points
        activeFactors.push({ id: factor.id, label: factor.label, points: factor.points })
      }
    } catch {
      // Skip factor if data is missing
    }
  }

  // Cap at 100
  score = Math.min(score, 100)

  return {
    score,
    tier: getTier(score),
    factors: activeFactors,
    factorCount: activeFactors.length,
    totalFactors: RISK_FACTORS.length,
  }
}

/**
 * Fetch public wallet data from Flow Access API
 * Falls back to mock data if API is unavailable
 * @param {string} address - Flow address (0x prefixed)
 * @param {object} fcl - Configured FCL instance
 * @returns {object} Wallet data for risk analysis
 */
export async function fetchWalletData(address, fcl) {
  try {
    // Query the Flow Access API for account info
    const account = await fcl.account(address)

    const keySeqNum = account.keys?.[0]?.sequenceNumber || 0
    const contractCount = Object.keys(account.contracts || {}).length

    // Account age: check Supabase for real creation timestamp, else estimate from activity.
    // sequenceNumber is cumulative tx count — NOT a reliable age proxy.
    // Without an indexer, we estimate conservatively: low seq = new, high seq = established.
    let accountAgeDays = null
    try {
      const { getSupabase } = await import('../lib/supabase.js')
      const sb = getSupabase()
      if (sb) {
        const { data } = await sb.from('users').select('created_at').eq('flow_address', address).single()
        if (data?.created_at) {
          accountAgeDays = Math.floor((Date.now() - new Date(data.created_at).getTime()) / 86400000)
        }
      }
    } catch { /* Supabase unavailable — fall through to estimate */ }

    if (accountAgeDays === null) {
      // Conservative estimate: accounts with very few txs are likely new
      accountAgeDays = keySeqNum <= 5 ? 1 : keySeqNum <= 50 ? 14 : 60
    }

    return {
      address,
      balance: parseFloat(account.balance) / 100000000, // Convert from UFix64
      accountAgeDays,
      txCount24h: keySeqNum, // Best available proxy (lifetime tx count, not 24h)
      rapidInOut: false,
      flaggedContracts: 0,
      mixerInteractions: 0,
      fundingSources: 1, // On-chain: can't determine funding sources without indexer
      dormancySpike: false,
      keyCount: account.keys?.length || 0,
      contractCount,
      source: 'flow-testnet',
    }
  } catch (err) {
    console.warn(`[RiskScoring] Could not fetch wallet data for ${address}:`, err.message)
    return {
      address,
      balance: 0,
      accountAgeDays: null,
      txCount24h: null,
      rapidInOut: false,
      flaggedContracts: 0,
      mixerInteractions: 0,
      fundingSources: null,
      dormancySpike: false,
      keyCount: null,
      contractCount: null,
      source: 'unavailable',
      error: err.message,
    }
  }
}

/**
 * Full risk assessment pipeline: fetch data + calculate score
 */
export async function assessRisk(address, fcl) {
  const walletData = await fetchWalletData(address, fcl)
  const riskResult = calculateRiskScore(walletData)
  return { ...riskResult, walletData }
}

export { RISK_FACTORS, getTier }
