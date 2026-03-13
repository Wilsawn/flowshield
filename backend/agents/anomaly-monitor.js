/**
 * @file Anomaly Monitor Agent
 * @module agents/anomaly-monitor
 * @description Hybrid AI + deterministic behavioral monitoring agent.
 *              Gathers real on-chain activity data from Flow testnet, runs threshold-based
 *              anomaly detection (velocity spikes, dormancy patterns, unusual balances),
 *              then optionally enriches findings with Claude AI reasoning.
 *              Falls back to pure deterministic thresholds if no API key or agent failure.
 */

import { runAgentLoop, parseJsonFromText, isValidFlowAddress, agentLog } from './agent-runner.js'

const SEVERITY_ORDER = { low: 1, medium: 2, high: 3 }

/**
 * Gather real on-chain data for an address from Flow
 */
async function gatherOnChainData(address, fcl) {
  try {
    const account = await fcl.account(address)
    return {
      address,
      balance: parseFloat(account.balance) / 100000000, // Convert from UFix64 storage
      keyCount: account.keys?.length || 0,
      sequenceNumber: account.keys?.[0]?.sequenceNumber || 0,
      contractCount: Object.keys(account.contracts || {}).length,
      contracts: Object.keys(account.contracts || {}),
      network: 'testnet',
      source: 'flow-testnet-live',
    }
  } catch (err) {
    console.warn(`[AnomalyMonitor] Could not fetch on-chain data for ${address}:`, err.message)
    return {
      address,
      balance: null,
      keyCount: null,
      sequenceNumber: null,
      contractCount: null,
      network: 'testnet',
      source: 'unavailable',
      error: err.message,
    }
  }
}

/**
 * Deterministic anomaly detection — fixed thresholds.
 * Same wallet data = same anomalies. No randomness.
 */
// Thresholds configurable via env vars (override for mainnet vs testnet)
const THRESHOLDS = {
  highFrequencyTxs: parseInt(process.env.ANOMALY_HIGH_FREQ_TXS || '500'),
  extremeBalance: parseFloat(process.env.ANOMALY_EXTREME_BALANCE || '1000000'),
  maxKeys: parseInt(process.env.ANOMALY_MAX_KEYS || '5'),
  dormantBalance: parseFloat(process.env.ANOMALY_DORMANT_BALANCE || '10000'),
}

const ANOMALY_RULES = [
  {
    id: 'high_frequency',
    label: 'Automated transaction pattern',
    severity: 'medium',
    check: (d) => d.sequenceNumber > THRESHOLDS.highFrequencyTxs,
    detail: (d) => `${d.sequenceNumber} lifetime transactions — exceeds ${THRESHOLDS.highFrequencyTxs} threshold`,
  },
  {
    id: 'extreme_balance',
    label: 'Extremely large balance',
    severity: 'high',
    check: (d) => d.balance > THRESHOLDS.extremeBalance,
    detail: (d) => `${d.balance.toFixed(2)} FLOW — exceeds ${THRESHOLDS.extremeBalance.toLocaleString()} threshold, requires review`,
  },
  {
    id: 'multi_key_risk',
    label: 'Excessive signing keys',
    severity: 'medium',
    check: (d) => d.keyCount > THRESHOLDS.maxKeys,
    detail: (d) => `${d.keyCount} keys on account — potential shared access or key management issue`,
  },
  {
    id: 'dormant_reactivation',
    label: 'Dormant account suddenly active',
    severity: 'medium',
    check: (d) => d.sequenceNumber === 0 && d.balance > THRESHOLDS.dormantBalance,
    detail: (d) => `Account funded with ${d.balance.toFixed(2)} FLOW but zero transactions — potential sleeper account`,
  },
]

function detectAnomalies(walletData) {
  const anomalies = []

  if (walletData.source === 'unavailable') {
    return {
      anomalies: [],
      summary: 'Could not fetch on-chain data. Monitor will retry on next cycle.',
      recommendation: 'none',
    }
  }

  for (const rule of ANOMALY_RULES) {
    try {
      if (rule.check(walletData)) {
        anomalies.push({
          id: rule.id,
          label: rule.label,
          detail: rule.detail(walletData),
          severity: rule.severity,
          timestamp: new Date().toISOString(),
        })
      }
    } catch { /* skip if data missing */ }
  }

  let highestSeverity = 'none'
  for (const a of anomalies) {
    if (SEVERITY_ORDER[a.severity] > (SEVERITY_ORDER[highestSeverity] || 0)) {
      highestSeverity = a.severity
    }
  }

  const ACTIONS = { low: 'monitor', medium: 're-verify', high: 'flag-and-review' }
  return {
    anomalies,
    summary: anomalies.length > 0
      ? `${anomalies.length} anomaly pattern(s) detected that require attention.`
      : 'No suspicious activity detected. Account behavior is within normal parameters.',
    recommendation: anomalies.length > 0 ? ACTIONS[highestSeverity] : 'none',
    highestSeverity,
  }
}

// ── Agent Tools ──────────────────────────────────────────────────────────────

const ANOMALY_TOOLS = [
  {
    name: 'gather_onchain_data',
    description: 'Fetch real-time on-chain wallet data from Flow testnet. Returns balance, key count, sequence number (lifetime tx count), contract count, and deployed contract names.',
    input_schema: {
      type: 'object',
      properties: {
        address: { type: 'string', description: 'Flow address (0x prefixed)' },
      },
      required: ['address'],
    },
  },
  {
    name: 'run_anomaly_detection',
    description: 'Run deterministic threshold-based anomaly detection on wallet data. Returns list of triggered anomalies with severity levels.',
    input_schema: {
      type: 'object',
      properties: {
        wallet_data: {
          type: 'object',
          description: 'Wallet data object from gather_onchain_data',
        },
      },
      required: ['wallet_data'],
    },
  },
  {
    name: 'get_anomaly_thresholds',
    description: 'Get the current threshold configuration for anomaly detection rules.',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
]

const ANOMALY_SYSTEM_PROMPT = `You are a blockchain behavioral analysis agent monitoring Flow testnet wallets for suspicious activity.

Your task: Given a wallet address, autonomously analyze it by:
1. Call gather_onchain_data to fetch live on-chain data
2. Call run_anomaly_detection to run threshold-based checks
3. Analyze the context — is this a testnet developer/operator (normal) or genuinely suspicious?
   - High balance + many contracts = likely a deployer/developer (NORMAL on testnet)
   - High keys + high activity = shared or institutional account
   - Zero txs + high balance = potential sleeper, but could be newly funded
4. Write detailed, contextual descriptions for each anomaly

Return your final answer as a JSON object with this EXACT shape:
{
  "anomalyCount": <number>,
  "highestSeverity": "none" | "low" | "medium" | "high",
  "recommendedAction": "none" | "monitor" | "re-verify" | "flag-and-review",
  "summary": "<contextual summary of findings>",
  "anomalies": [
    {
      "id": "<anomaly_id>",
      "label": "<anomaly label>",
      "detail": "<your detailed contextual description>",
      "severity": "low" | "medium" | "high",
      "timestamp": "<ISO timestamp>"
    }
  ],
  "activity": <the wallet data object>,
  "agentReasoning": "<your contextual analysis explaining why these patterns are or aren't concerning>"
}

IMPORTANT: You MUST keep the same anomalies that the detection tool found. Do NOT add or remove anomalies. You CAN improve their descriptions with contextual analysis.
Return ONLY the JSON object, no other text.`

function buildAnomalyToolHandlers(address, fcl) {
  return {
    gather_onchain_data: async (input) => {
      const addr = input.address || address
      return await gatherOnChainData(addr, fcl)
    },
    run_anomaly_detection: async (input) => {
      return detectAnomalies(input.wallet_data)
    },
    get_anomaly_thresholds: async () => {
      return THRESHOLDS
    },
  }
}

function validateAnomalyResult(result) {
  return (
    result &&
    typeof result.anomalyCount === 'number' &&
    typeof result.highestSeverity === 'string' &&
    typeof result.recommendedAction === 'string' &&
    typeof result.summary === 'string' &&
    Array.isArray(result.anomalies) &&
    result.activity
  )
}

/**
 * Monitor a single address — agent-first with deterministic fallback.
 *
 * 1. Try agentic loop (Claude gathers data, detects, reasons)
 * 2. If agent fails or no API key -> deterministic pipeline
 */
export async function monitorAddress(address, fcl) {
  // Input validation
  if (!isValidFlowAddress(address)) {
    agentLog('warn', 'AnomalyMonitor', 'Invalid Flow address', { address })
    return {
      anomalyCount: 0, highestSeverity: 'none', recommendedAction: 'none',
      summary: 'Invalid address format. Expected 0x + 16 hex characters.',
      anomalies: [],
      activity: { address, source: 'invalid', error: 'Invalid Flow address format' },
      analysisSource: 'validation',
    }
  }

  // Try agent-first
  try {
    const agentResult = await runAgentLoop({
      systemPrompt: ANOMALY_SYSTEM_PROMPT,
      userMessage: `Monitor Flow wallet address for anomalies: ${address}`,
      tools: ANOMALY_TOOLS,
      toolHandlers: buildAnomalyToolHandlers(address, fcl),
      maxIterations: 5,
      maxTokens: 2048,
    })

    if (agentResult) {
      const parsed = parseJsonFromText(agentResult.text)
      if (validateAnomalyResult(parsed)) {
        parsed.analysisSource = 'agent'
        parsed.agentIterations = agentResult.iterations
        parsed.agentToolCalls = agentResult.toolCalls.length
        if (agentResult.usage) parsed.usage = agentResult.usage
        agentLog('info', 'AnomalyMonitor', 'Agent completed', {
          anomalyCount: parsed.anomalyCount, severity: parsed.highestSeverity,
          iterations: agentResult.iterations, toolCalls: agentResult.toolCalls.length,
        })
        return parsed
      } else {
        agentLog('warn', 'AnomalyMonitor', 'Agent returned invalid shape, falling back')
      }
    }
  } catch (err) {
    agentLog('warn', 'AnomalyMonitor', 'Agent failed, falling back to deterministic', { error: err.message })
  }

  // Deterministic fallback
  const walletData = await gatherOnChainData(address, fcl)
  agentLog('info', 'AnomalyMonitor', 'Deterministic analysis', {
    balance: walletData.balance, seq: walletData.sequenceNumber,
    keys: walletData.keyCount, contracts: walletData.contractCount,
  })

  const detection = detectAnomalies(walletData)

  return {
    anomalyCount: detection.anomalies.length,
    highestSeverity: detection.highestSeverity,
    recommendedAction: detection.recommendation,
    summary: detection.summary,
    anomalies: detection.anomalies,
    activity: walletData,
    analysisSource: 'checklist',
  }
}

/**
 * Run monitoring cycle across multiple addresses
 */
const MAX_BATCH_SIZE = 50
const BATCH_TIMEOUT_MS = 300_000 // 5 min max for entire batch

export async function runMonitoringCycle(addresses, fcl) {
  if (!Array.isArray(addresses) || addresses.length === 0) {
    return { totalChecked: 0, totalFlagged: 0, results: [], timestamp: new Date().toISOString() }
  }

  // Cap batch size to prevent resource exhaustion
  const capped = addresses.slice(0, MAX_BATCH_SIZE)
  if (addresses.length > MAX_BATCH_SIZE) {
    agentLog('warn', 'AnomalyMonitor', `Batch capped from ${addresses.length} to ${MAX_BATCH_SIZE}`)
  }

  const deadline = Date.now() + BATCH_TIMEOUT_MS
  const results = []

  for (const address of capped) {
    if (Date.now() > deadline) {
      agentLog('warn', 'AnomalyMonitor', 'Batch deadline exceeded', {
        completed: results.length, total: capped.length,
      })
      break
    }
    const result = await monitorAddress(address, fcl)
    results.push(result)
  }

  const flagged = results.filter((r) => r.anomalyCount > 0)
  return {
    totalChecked: results.length,
    totalFlagged: flagged.length,
    results,
    timestamp: new Date().toISOString(),
    ...(results.length < capped.length ? { truncated: true, reason: 'deadline_exceeded' } : {}),
  }
}

export { ANOMALY_RULES }
