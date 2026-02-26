// anomaly-monitor.js
// Post-verification behavioral monitoring. Rule-based, no API needed.
// Flags wallets exhibiting suspicious patterns after KYC verification.

const ANOMALY_TYPES = [
  {
    id: 'high_frequency',
    label: 'Unusually high transaction frequency',
    severity: 'medium',
    check: (a) => a.txCount1h > 20,
  },
  {
    id: 'large_volume',
    label: 'Single large transaction exceeds threshold',
    severity: 'high',
    check: (a) => a.largestTx > 10000,
  },
  {
    id: 'rapid_transfer',
    label: 'Rapid in-out transfer pattern',
    severity: 'high',
    check: (a) => a.inOutRatio > 0.9 && a.txCount1h > 5,
  },
  {
    id: 'dormancy_spike',
    label: 'Dormant account suddenly active',
    severity: 'medium',
    check: (a) => a.daysSinceLastTx > 90 && a.txCount24h > 10,
  },
  {
    id: 'flagged_contract',
    label: 'Interaction with flagged contract',
    severity: 'high',
    check: (a) => a.flaggedContractInteractions > 0,
  },
  {
    id: 'split_pattern',
    label: 'Transaction splitting pattern detected',
    severity: 'medium',
    check: (a) => a.splitPatternScore > 0.7,
  },
  {
    id: 'counterparty_spike',
    label: 'Unusual number of new counterparties',
    severity: 'low',
    check: (a) => a.newCounterparties24h > 15,
  },
  {
    id: 'round_amounts',
    label: 'Suspiciously round transaction amounts',
    severity: 'low',
    check: (a) => a.roundAmountRatio > 0.8 && a.txCount24h > 5,
  },
]

const SEVERITY_ORDER = { low: 1, medium: 2, high: 3 }

const ACTIONS = {
  low: 'monitor',
  medium: 're-verify',
  high: 'flag-and-review',
}

/**
 * Detect anomalies in wallet activity data
 * @param {object} activity - Wallet activity metrics
 * @returns {{ anomalyCount, highestSeverity, recommendedAction, anomalies }}
 */
export function detectAnomalies(activity) {
  const anomalies = []
  let highestSeverity = 'low'

  for (const type of ANOMALY_TYPES) {
    try {
      if (type.check(activity)) {
        anomalies.push({
          id: type.id,
          label: type.label,
          severity: type.severity,
          timestamp: new Date().toISOString(),
        })
        if (SEVERITY_ORDER[type.severity] > SEVERITY_ORDER[highestSeverity]) {
          highestSeverity = type.severity
        }
      }
    } catch {
      // Skip if activity data is incomplete
    }
  }

  return {
    anomalyCount: anomalies.length,
    highestSeverity: anomalies.length > 0 ? highestSeverity : 'none',
    recommendedAction: anomalies.length > 0 ? ACTIONS[highestSeverity] : 'none',
    anomalies,
  }
}

/**
 * Fetch activity data for a single address and detect anomalies
 * In production: query a Flow indexer for real transaction history
 * For now: uses deterministic mock based on address
 */
export async function monitorAddress(address, fcl) {
  let activity
  try {
    // Try to get real account data from Flow
    const account = await fcl.account(address)
    const seqNum = account.keys?.[0]?.sequenceNumber || 0

    activity = {
      address,
      txCount1h: Math.min(seqNum % 25, 25),
      txCount24h: Math.min(seqNum % 60, 60),
      largestTx: (seqNum * 17) % 15000,
      inOutRatio: (seqNum % 100) / 100,
      daysSinceLastTx: seqNum > 0 ? 1 : 120,
      flaggedContractInteractions: 0,
      splitPatternScore: (seqNum % 50) / 100,
      newCounterparties24h: seqNum % 20,
      roundAmountRatio: (seqNum % 30) / 100,
      source: 'flow-testnet',
    }
  } catch {
    // Mock fallback
    const hash = address.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
    activity = {
      address,
      txCount1h: hash % 25,
      txCount24h: hash % 50,
      largestTx: (hash * 7) % 15000,
      inOutRatio: (hash % 100) / 100,
      daysSinceLastTx: hash % 120,
      flaggedContractInteractions: hash % 19 === 0 ? 1 : 0,
      splitPatternScore: (hash % 80) / 100,
      newCounterparties24h: hash % 20,
      roundAmountRatio: (hash % 60) / 100,
      source: 'mock-fallback',
    }
  }

  const result = detectAnomalies(activity)
  return { ...result, activity }
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

export { ANOMALY_TYPES }
