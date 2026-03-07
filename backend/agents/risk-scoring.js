// risk-scoring.js
// AI-powered risk scoring agent with tool use.
// Claude autonomously fetches wallet data, runs deterministic scoring, then reasons about results.
// Falls back to pure deterministic pipeline if no API key or agent fails.

import { runAgentLoop, parseJsonFromText, isValidFlowAddress, agentLog } from './agent-runner.js'

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

// ── Agent Tools ──────────────────────────────────────────────────────────────

const RISK_TOOLS = [
  {
    name: 'fetch_wallet_data',
    description: 'Fetch on-chain wallet data from Flow testnet for a given address. Returns balance, account age, transaction count, key count, contract count, and other metrics.',
    input_schema: {
      type: 'object',
      properties: {
        address: { type: 'string', description: 'Flow address (0x prefixed)' },
      },
      required: ['address'],
    },
  },
  {
    name: 'calculate_risk_score',
    description: 'Run the deterministic rule-based risk scoring algorithm on wallet data. Returns score (0-100), tier, and triggered factors.',
    input_schema: {
      type: 'object',
      properties: {
        wallet_data: {
          type: 'object',
          description: 'Wallet data object from fetch_wallet_data',
        },
      },
      required: ['wallet_data'],
    },
  },
  {
    name: 'get_risk_factors',
    description: 'Get the complete list of risk factors and their point values used in scoring.',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
]

const RISK_SYSTEM_PROMPT = `You are a blockchain compliance risk analyst agent. You have tools to fetch on-chain wallet data and run risk scoring algorithms.

Your task: Given a wallet address, autonomously assess its risk by:
1. First, call fetch_wallet_data to get the on-chain data
2. Then, call calculate_risk_score to run the deterministic scoring
3. Analyze the results — look for correlated signals the rules might miss (e.g., new account + high balance = suspicious, many keys + high activity = shared account)
4. You may adjust the score by up to +/- 10 points with a clear explanation if you identify patterns the rules don't capture

Return your final answer as a JSON object with this EXACT shape:
{
  "score": <number 0-100>,
  "tier": "compliant" | "semi-compliant" | "non-compliant",
  "factors": [{"id": "<factor_id>", "label": "<description>", "points": <number>}],
  "factorCount": <number>,
  "totalFactors": 8,
  "walletData": <the wallet data object>,
  "agentReasoning": "<your analysis of correlated signals and any score adjustments>"
}

Tier thresholds: 0-30 = compliant, 31-70 = semi-compliant, 71-100 = non-compliant.
Return ONLY the JSON object, no other text.`

/**
 * Build tool handlers that capture the fcl instance
 */
function buildRiskToolHandlers(address, fcl) {
  return {
    fetch_wallet_data: async (input) => {
      const addr = input.address || address
      return await fetchWalletData(addr, fcl)
    },
    calculate_risk_score: async (input) => {
      return calculateRiskScore(input.wallet_data)
    },
    get_risk_factors: async () => {
      return RISK_FACTORS.map(f => ({ id: f.id, label: f.label, points: f.points }))
    },
  }
}

/**
 * Validate that an agent result has the required shape
 */
function validateRiskResult(result) {
  return (
    result &&
    typeof result.score === 'number' &&
    result.score >= 0 && result.score <= 100 &&
    typeof result.tier === 'string' &&
    Array.isArray(result.factors) &&
    result.walletData
  )
}

/**
 * Full risk assessment pipeline: agent-first with deterministic fallback.
 *
 * 1. Try agentic loop (Claude fetches data, scores, reasons)
 * 2. If agent fails or no API key -> deterministic pipeline (unchanged)
 */
export async function assessRisk(address, fcl) {
  // Input validation
  if (!isValidFlowAddress(address)) {
    agentLog('warn', 'RiskScoring', 'Invalid Flow address', { address })
    return {
      score: 0, tier: 'compliant', factors: [], factorCount: 0, totalFactors: RISK_FACTORS.length,
      walletData: { address, source: 'invalid', error: 'Invalid Flow address format (expected 0x + 16 hex chars)' },
    }
  }

  // Try agent-first
  try {
    const agentResult = await runAgentLoop({
      systemPrompt: RISK_SYSTEM_PROMPT,
      userMessage: `Assess the risk for Flow wallet address: ${address}`,
      tools: RISK_TOOLS,
      toolHandlers: buildRiskToolHandlers(address, fcl),
      maxIterations: 5,
      maxTokens: 2048,
    })

    if (agentResult) {
      const parsed = parseJsonFromText(agentResult.text)
      if (validateRiskResult(parsed)) {
        // Enforce score adjustment bounds: agent cannot deviate more than ±10 from deterministic
        const deterministicScore = calculateRiskScore(parsed.walletData || {}).score
        const delta = parsed.score - deterministicScore
        if (Math.abs(delta) > 10) {
          agentLog('warn', 'RiskScoring', 'Agent score adjustment exceeded ±10, clamping', {
            agentScore: parsed.score,
            deterministicScore,
            delta,
          })
          parsed.score = Math.max(0, Math.min(100, deterministicScore + Math.sign(delta) * 10))
        }

        parsed.tier = getTier(parsed.score)
        parsed.analysisSource = 'agent'
        parsed.agentIterations = agentResult.iterations
        parsed.agentToolCalls = agentResult.toolCalls.length
        if (agentResult.usage) parsed.usage = agentResult.usage
        agentLog('info', 'RiskScoring', 'Agent completed', {
          score: parsed.score, tier: parsed.tier,
          iterations: agentResult.iterations, toolCalls: agentResult.toolCalls.length,
        })
        return parsed
      } else {
        agentLog('warn', 'RiskScoring', 'Agent returned invalid shape, falling back to deterministic')
      }
    }
  } catch (err) {
    agentLog('warn', 'RiskScoring', 'Agent failed, falling back to deterministic', { error: err.message })
  }

  // Deterministic fallback
  const walletData = await fetchWalletData(address, fcl)
  const riskResult = calculateRiskScore(walletData)
  return { ...riskResult, walletData }
}

export { RISK_FACTORS, getTier }
