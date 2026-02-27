// anomaly-monitor.js
// Hybrid AI behavioral monitoring agent (same pattern as regulatory radar):
//   1. Deterministic thresholds detect anomalies (same data = same result)
//   2. Claude AI enriches descriptions (cannot add/remove anomalies)
//   3. Thresholds set for REAL usage — normal testnet activity won't flag
//
// Your wallet: 200K FLOW, 6 contracts, 39 txs, 1 key = ALL NORMAL. Zero anomalies.

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
 *
 * Thresholds are set for REAL usage — testnet operator accounts with
 * high balances and multiple contracts are NORMAL and won't flag.
 * Only genuinely suspicious patterns trigger anomalies.
 */
const ANOMALY_RULES = [
  {
    id: 'high_frequency',
    label: 'Automated transaction pattern',
    severity: 'medium',
    check: (d) => d.sequenceNumber > 500,
    detail: (d) => `${d.sequenceNumber} lifetime transactions — consistent with bot/automated activity`,
  },
  {
    id: 'extreme_balance',
    label: 'Extremely large balance',
    severity: 'high',
    check: (d) => d.balance > 1000000, // > 1M FLOW is genuinely unusual
    detail: (d) => `${d.balance.toFixed(2)} FLOW — exceeds 1M threshold, requires review`,
  },
  {
    id: 'multi_key_risk',
    label: 'Excessive signing keys',
    severity: 'medium',
    check: (d) => d.keyCount > 5,
    detail: (d) => `${d.keyCount} keys on account — potential shared access or key management issue`,
  },
  {
    id: 'dormant_reactivation',
    label: 'Dormant account suddenly active',
    severity: 'medium',
    check: (d) => d.sequenceNumber === 0 && d.balance > 10000,
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

/**
 * Claude AI enrichment for anomaly descriptions (same pattern as regulatory radar).
 * Claude CANNOT add or remove anomalies — only improve descriptions.
 */
async function enrichAnomaliesWithClaude(anomalies, walletData) {
  const apiKey = process.env.CLAUDE_API_KEY
  if (!apiKey || anomalies.length === 0) return anomalies

  try {
    const model = process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001'
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        system: `You are a blockchain compliance analyst. You will receive anomalies detected on a Flow wallet. For each anomaly, write a better 1-2 sentence "detail" explaining the risk.

RULES:
- Do NOT add new anomalies. Do NOT remove any.
- ONLY improve the "detail" field.
- Return ONLY a JSON array: [{"index": 0, "detail": "improved detail"}, ...]`,
        messages: [{
          role: 'user',
          content: `Wallet: ${JSON.stringify({ address: walletData.address, balance: walletData.balance, keyCount: walletData.keyCount, sequenceNumber: walletData.sequenceNumber, contractCount: walletData.contractCount })}\n\nAnomalies:\n${JSON.stringify(anomalies.map((a, i) => ({ index: i, id: a.id, label: a.label, detail: a.detail })), null, 2)}`,
        }],
      }),
    })

    if (!res.ok) return anomalies

    const data = await res.json()
    const text = data.content[0].text
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return anomalies

    const enrichments = JSON.parse(jsonMatch[0])
    const enriched = [...anomalies]
    for (const e of enrichments) {
      if (typeof e.index === 'number' && e.detail && enriched[e.index]) {
        enriched[e.index].detail = e.detail
      }
    }
    console.log(`[AnomalyMonitor] Claude enriched ${enrichments.length} anomaly descriptions`)
    return enriched
  } catch (err) {
    console.warn('[AnomalyMonitor] Claude enrichment failed (using base descriptions):', err.message)
    return anomalies
  }
}

/**
 * Monitor a single address — hybrid pattern:
 *   1. Gather real on-chain data
 *   2. Deterministic anomaly detection (fixed thresholds)
 *   3. Claude AI enriches descriptions (cannot add/remove anomalies)
 *
 * Same wallet data always produces the same anomaly list.
 */
export async function monitorAddress(address, fcl) {
  // 1. Gather real on-chain data
  const walletData = await gatherOnChainData(address, fcl)
  console.log(`[AnomalyMonitor] On-chain: balance=${walletData.balance}, seq=${walletData.sequenceNumber}, keys=${walletData.keyCount}, contracts=${walletData.contractCount}`)

  // 2. Deterministic anomaly detection
  const detection = detectAnomalies(walletData)
  console.log(`[AnomalyMonitor] Deterministic: ${detection.anomalies.length} anomalies`)

  // 3. Claude AI enriches descriptions (cannot add/remove)
  const enrichedAnomalies = await enrichAnomaliesWithClaude(detection.anomalies, walletData)

  return {
    anomalyCount: enrichedAnomalies.length,
    highestSeverity: detection.highestSeverity,
    recommendedAction: detection.recommendation,
    summary: detection.summary,
    anomalies: enrichedAnomalies,
    activity: walletData,
    analysisSource: enrichedAnomalies.length > 0 ? 'checklist+ai' : 'checklist',
  }
}

/**
 * Run monitoring cycle across multiple addresses
 */
export async function runMonitoringCycle(addresses, fcl) {
  const results = []
  for (const address of addresses) {
    const result = await monitorAddress(address, fcl)
    results.push(result)
  }

  const flagged = results.filter((r) => r.anomalyCount > 0)
  return {
    totalChecked: addresses.length,
    totalFlagged: flagged.length,
    results,
    timestamp: new Date().toISOString(),
  }
}

export { ANOMALY_RULES }
