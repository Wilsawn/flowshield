// lib/demo-state.js
// Shared demo simulation state — used by both risk.js (anomalies) and copilot.js (radar gaps).
// Anomalies and radar gaps are LINKED: fixing a gap removes its corresponding anomaly.
//
// PRODUCTION: All demo functions return null/false/no-op to prevent fake data injection.

const IS_PRODUCTION = process.env.NODE_ENV === 'production'

const state = {
  threats: null,
  radarGaps: null,
}

export function getDemoThreats() {
  if (IS_PRODUCTION) return null
  return state.threats
}

export function getDemoRadarGaps() {
  if (IS_PRODUCTION) return null
  return state.radarGaps
}

export function isDemoActive() {
  if (IS_PRODUCTION) return false
  return !!(state.threats?.length || state.radarGaps?.length)
}

/**
 * Resolve a single demo radar gap (called when operator approves + pushes on-chain).
 * Removes the gap AND its linked anomaly so both counts stay in sync.
 * Returns { remainingGaps, remainingThreats } for the response.
 */
export function resolveDemoGap(jurisdiction, ruleKey) {
  if (IS_PRODUCTION) return null
  if (!state.radarGaps) return null

  // Find and remove the matching gap
  const gapIndex = state.radarGaps.findIndex(
    g => g.jurisdiction === jurisdiction && g.ruleKey === ruleKey
  )
  if (gapIndex === -1) return null

  const resolvedGap = state.radarGaps[gapIndex]
  state.radarGaps.splice(gapIndex, 1)

  // Remove the linked anomaly
  if (state.threats && resolvedGap.linkedAnomalyId) {
    state.threats = state.threats.filter(t => t.id !== resolvedGap.linkedAnomalyId)
  }

  // Clean up if everything is resolved
  if (state.radarGaps.length === 0) state.radarGaps = null
  if (state.threats?.length === 0) state.threats = null

  console.log(`[Demo] Resolved gap ${jurisdiction}/${ruleKey} → ${state.radarGaps?.length || 0} gaps, ${state.threats?.length || 0} anomalies remaining`)

  return {
    resolved: resolvedGap,
    remainingGaps: state.radarGaps?.length || 0,
    remainingThreats: state.threats?.length || 0,
  }
}

/**
 * Resolve ALL remaining demo gaps at once (Apply All).
 * Clears everything — both gaps and anomalies.
 */
export function resolveAllDemoGaps() {
  if (IS_PRODUCTION) return { resolvedGaps: 0, resolvedThreats: 0 }
  const gapCount = state.radarGaps?.length || 0
  const threatCount = state.threats?.length || 0
  state.radarGaps = null
  state.threats = null
  console.log(`[Demo] Resolved ALL — cleared ${gapCount} gaps and ${threatCount} anomalies`)
  return { resolvedGaps: gapCount, resolvedThreats: threatCount }
}

export function activateDemo(scenario) {
  if (IS_PRODUCTION) return { threats: [], radarGaps: [] }
  const now = new Date().toISOString()

  // ── Anomaly scenarios (each has an id that radar gaps reference) ─────────────
  const ANOMALY_SCENARIOS = {
    whale: [
      { id: 'whale_transfer', label: 'Large whale transfer detected', detail: 'Incoming transfer of 2.4M FLOW from unverified wallet 0xf8d6...3a1b — exceeds monitoring threshold of 1M FLOW. Possible wash trading or fund layering attempt.', severity: 'high', timestamp: now },
      { id: 'rapid_movement', label: 'Rapid fund movement pattern', detail: 'Funds moved through 4 intermediate wallets within 12 minutes before arriving. Pattern consistent with structuring to avoid detection thresholds.', severity: 'high', timestamp: now },
    ],
    bot: [
      { id: 'automated_pattern', label: 'Automated transaction burst', detail: '847 transactions in the last hour from account 0xa3c2...9e7f — 17x above normal volume. Likely automated bot activity targeting DeFi pools.', severity: 'medium', timestamp: now },
      { id: 'gas_manipulation', label: 'Gas price manipulation attempt', detail: 'Repeated transactions with escalating gas bids detected. Pattern consistent with MEV extraction or sandwich attack preparation.', severity: 'medium', timestamp: now },
    ],
    sleeper: [
      { id: 'dormant_activation', label: 'Dormant wallet reactivation', detail: 'Wallet 0x7b2e...4d8c dormant for 340 days suddenly moved 45,000 FLOW to a newly created address. Possible compromised key or planned withdrawal.', severity: 'high', timestamp: now },
    ],
  }

  // ── Radar gap scenarios — each gap has linkedAnomalyId to its anomaly ───────
  const RADAR_SCENARIOS = {
    whale: [
      {
        jurisdiction: 'US',
        ruleKey: 'travel_rule_threshold',
        linkedAnomalyId: 'whale_transfer',
        currentValue: '3000.0',
        requiredValue: '1000.0',
        label: 'Travel Rule Threshold Breach',
        summary: 'Whale transfer of 2.4M FLOW exceeds the $3,000 threshold without accompanying originator/beneficiary data — violates FinCEN Travel Rule (31 CFR 1010.410). Threshold should be lowered to $1,000 to match FATF guidance.',
        severity: 'high',
        regulatoryBasis: 'FinCEN Travel Rule (31 CFR 1010.410)',
        framework: 'Bank Secrecy Act (BSA)',
      },
    ],
    bot: [
      {
        jurisdiction: 'EU',
        ruleKey: 'automated_trading_controls',
        linkedAnomalyId: 'automated_pattern',
        currentValue: 'none',
        requiredValue: 'true',
        label: 'Automated Trading Controls Missing',
        summary: 'MiCA Article 76 requires controls to prevent market manipulation by automated systems. 847 transactions/hour from a single account indicates bot activity that should trigger circuit breakers.',
        severity: 'medium',
        regulatoryBasis: 'MiCA Article 76 (Algorithmic Trading)',
        framework: 'MiCA (Markets in Crypto-Assets)',
      },
    ],
    sleeper: [
      {
        jurisdiction: 'UK',
        ruleKey: 'dormant_account_monitoring',
        linkedAnomalyId: 'dormant_activation',
        currentValue: 'none',
        requiredValue: 'true',
        label: 'Dormant Account Monitoring Missing',
        summary: 'FCA MLR 2017 Reg 28 requires enhanced due diligence for accounts showing unusual reactivation. A 340-day dormant wallet moving 45,000 FLOW should trigger automatic EDD review.',
        severity: 'high',
        regulatoryBasis: 'FCA MLR 2017 Reg 28 (EDD)',
        framework: 'FCA Crypto-asset Rules',
      },
    ],
  }

  // Build threats — 1 anomaly per scenario, 1 radar gap per scenario, linked by ID
  if (scenario && ANOMALY_SCENARIOS[scenario]) {
    state.threats = ANOMALY_SCENARIOS[scenario]
    state.radarGaps = RADAR_SCENARIOS[scenario] || []
  } else {
    // Mixed: one anomaly + one gap from each scenario
    state.threats = [
      ANOMALY_SCENARIOS.whale[0],
      ANOMALY_SCENARIOS.bot[0],
      ANOMALY_SCENARIOS.sleeper[0],
    ]
    state.radarGaps = [
      RADAR_SCENARIOS.whale[0],
      RADAR_SCENARIOS.bot[0],
      RADAR_SCENARIOS.sleeper[0],
    ]
  }

  console.log(`[Demo] Activated — ${state.threats.length} anomalies, ${state.radarGaps.length} radar gaps (scenario: ${scenario || 'mixed'})`)

  return {
    threats: state.threats,
    radarGaps: state.radarGaps,
  }
}

export function clearDemo() {
  if (IS_PRODUCTION) return
  state.threats = null
  state.radarGaps = null
  console.log('[Demo] Cleared — all threats and radar gaps removed')
}
