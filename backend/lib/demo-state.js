/**
 * @file Demo State Manager
 * @module lib/demo-state
 * @description Shared in-memory demo simulation state for live presentations.
 *              Used by risk.js (anomalies) and copilot.js (radar gaps).
 *              Anomalies and radar gaps are linked — fixing a gap removes its anomaly.
 */

const state = {
  threats: null,
  radarGaps: null,
}

export function getDemoThreats() {
  return state.threats
}

export function getDemoRadarGaps() {
  return state.radarGaps
}

export function isDemoActive() {
  return !!(state.threats?.length || state.radarGaps?.length)
}

/**
 * Resolve a single demo radar gap (called when operator approves + pushes on-chain).
 * Removes the gap AND its linked anomaly so both counts stay in sync.
 * Returns { remainingGaps, remainingThreats } for the response.
 */
export function resolveDemoGap(jurisdiction, ruleKey) {
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
  const gapCount = state.radarGaps?.length || 0
  const threatCount = state.threats?.length || 0
  state.radarGaps = null
  state.threats = null
  console.log(`[Demo] Resolved ALL — cleared ${gapCount} gaps and ${threatCount} anomalies`)
  return { resolvedGaps: gapCount, resolvedThreats: threatCount }
}

export function activateDemo(scenario) {
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
    sybil: [
      { id: 'sybil_cluster', label: 'Sybil account cluster detected', detail: '53 accounts created within 24 hours all funded by wallet 0xd4a1...8f2c with identical 10.0 FLOW deposits. Accounts show coordinated transaction timing — likely a single entity farming airdrops or inflating governance votes.', severity: 'high', timestamp: now },
      { id: 'sybil_voting', label: 'Coordinated governance manipulation', detail: '38 of the 53 clustered accounts submitted governance votes on proposal #12 within a 4-minute window. Voting pattern indicates Sybil manipulation of quorum.', severity: 'high', timestamp: now },
    ],
    mixer: [
      { id: 'mixer_interaction', label: 'Known mixer contract interaction', detail: 'Account 0xe9f3...2b7a deposited 120,000 FLOW into mixer contract 0x1a2b...9c0d (flagged by Chainalysis). Funds were split into 47 outputs of varying amounts to obscure the trail.', severity: 'critical', timestamp: now },
      { id: 'mixer_withdrawal', label: 'Mixer withdrawal to fresh wallet', detail: 'Fresh wallet 0x5c8d...1e4f received 28,500 FLOW from the same mixer contract 3 hours after the deposit. No prior transaction history — classic mixer withdrawal pattern.', severity: 'critical', timestamp: now },
    ],
    rugpull: [
      { id: 'liquidity_drain', label: 'Liquidity pool drain in progress', detail: 'Contract deployer 0xb7c4...6a3e removed 890,000 FLOW (94% of total liquidity) from DeFi pool in a single transaction. Remaining LPs face near-total loss. Token price dropped 97% in 2 minutes.', severity: 'critical', timestamp: now },
      { id: 'admin_key_abuse', label: 'Admin key used to bypass timelock', detail: 'Pool contract admin called emergencyWithdraw() — bypassing the 48-hour timelock. Function was hidden in an unverified contract upgrade deployed 6 hours ago.', severity: 'critical', timestamp: now },
    ],
    sanctions: [
      { id: 'sanctioned_address', label: 'OFAC-sanctioned address interaction', detail: 'Account 0x3f9a...7d2c sent 50,000 FLOW to address 0xdead...beef which appears on the OFAC SDN list (Tornado Cash designation, Aug 2022). This transaction may violate US sanctions law.', severity: 'critical', timestamp: now },
    ],
    structuring: [
      { id: 'structuring_pattern', label: 'Transaction structuring detected', detail: '14 transfers of exactly 2,900 FLOW each over 48 hours from account 0x6e1b...4c8a — consistently just below the 3,000 FLOW reporting threshold. Total moved: 40,600 FLOW. Classic structuring to evade BSA/AML reporting requirements.', severity: 'high', timestamp: now },
      { id: 'structuring_recipients', label: 'Structured funds funneled to single destination', detail: 'All 14 structured transfers routed through 6 intermediate wallets before consolidating at 0xaa22...ff11. Round-trip time: 4 hours per hop. Layering pattern designed to obscure the origin.', severity: 'high', timestamp: now },
    ],
  }

  // ── Radar gap scenarios — each gap has linkedAnomalyId to its anomaly ───────
  const RADAR_SCENARIOS = {
    whale: [
      {
        jurisdiction: 'EU',
        ruleKey: 'travel_rule_threshold',
        linkedAnomalyId: 'whale_transfer',
        currentValue: '3000.0',
        requiredValue: '1000.0',
        label: 'Travel Rule Threshold Non-Compliant',
        summary: 'On-chain travel rule threshold is set to €3,000 but the EU Transfer of Funds Regulation (EU 2023/1113) requires originator and beneficiary data for transfers exceeding €1,000. This has been enforced since December 2024.',
        severity: 'high',
        regulatoryBasis: 'Transfer of Funds Regulation (EU 2023/1113)',
        framework: 'MiCA (Markets in Crypto-Assets)',
      },
    ],
    bot: [
      {
        jurisdiction: 'EU',
        ruleKey: 'reverification_days',
        linkedAnomalyId: 'automated_pattern',
        currentValue: 'none',
        requiredValue: '365',
        label: 'Periodic KYC Review Not Configured',
        summary: 'EBA Guidelines on Customer Due Diligence require CASPs to re-verify customer identity at least annually. No re-verification period is set on-chain, meaning stale KYC credentials remain valid indefinitely.',
        severity: 'medium',
        regulatoryBasis: 'EBA Guidelines on CDD (EBA/GL/2021/02)',
        framework: 'MiCA (Markets in Crypto-Assets)',
      },
    ],
    sleeper: [
      {
        jurisdiction: 'UK',
        ruleKey: 'reverification_days',
        linkedAnomalyId: 'dormant_activation',
        currentValue: 'none',
        requiredValue: '365',
        label: 'Annual KYC Review Missing',
        summary: 'FCA SYSC 6.3 and MLR 2017 require firms to apply ongoing customer due diligence including periodic review on a risk-sensitive basis. No re-verification cycle is configured, leaving expired credentials active.',
        severity: 'high',
        regulatoryBasis: 'FCA SYSC 6.3 + MLR 2017 Regulation 28',
        framework: 'FCA Crypto Registration Regime',
      },
    ],
    sybil: [
      {
        jurisdiction: 'EU',
        ruleKey: 'max_anonymous_tx',
        linkedAnomalyId: 'sybil_cluster',
        currentValue: '10',
        requiredValue: '0',
        label: 'Anonymous Transactions Allowed',
        summary: 'MiCA Article 76 prohibits anonymous crypto-asset accounts and wallets. On-chain rules currently allow up to 10 anonymous transactions, which conflicts with the zero-tolerance requirement effective June 2024.',
        severity: 'high',
        regulatoryBasis: 'MiCA Article 76 (Prohibition of Anonymous Accounts)',
        framework: 'MiCA (Markets in Crypto-Assets)',
      },
    ],
    mixer: [
      {
        jurisdiction: 'US',
        ruleKey: 'sanctions_screening',
        linkedAnomalyId: 'mixer_interaction',
        currentValue: 'none',
        requiredValue: 'OFAC',
        label: 'OFAC Sanctions Screening Not Configured',
        summary: 'All US-facing VASPs must screen transactions against the OFAC SDN list (Executive Order 13224). No sanctions list is configured on-chain. Failure to screen carries strict liability — civil penalties up to $330,000 per violation.',
        severity: 'critical',
        regulatoryBasis: 'OFAC SDN List (Executive Order 13224)',
        framework: 'Bank Secrecy Act (BSA)',
      },
    ],
    rugpull: [
      {
        jurisdiction: 'SG',
        ruleKey: 'travel_rule_threshold',
        linkedAnomalyId: 'liquidity_drain',
        currentValue: '3000.0',
        requiredValue: '1500.0',
        label: 'Travel Rule Threshold Exceeds MAS Limit',
        summary: 'MAS Notice PSN02 sets the travel rule threshold at SGD 1,500 for digital payment token services. The on-chain threshold is set to 3,000, which means transfers between 1,500 and 3,000 are processed without required originator data.',
        severity: 'high',
        regulatoryBasis: 'MAS Notice PSN02 (Travel Rule)',
        framework: 'Payment Services Act 2019',
      },
    ],
    sanctions: [
      {
        jurisdiction: 'UK',
        ruleKey: 'sanctions_screening',
        linkedAnomalyId: 'sanctioned_address',
        currentValue: 'none',
        requiredValue: 'OFSI',
        label: 'OFSI Sanctions List Not Configured',
        summary: 'UK-registered crypto firms must screen against the OFSI Consolidated Sanctions List under the Sanctions and Anti-Money Laundering Act 2018. No sanctions list is set on-chain. FCA can withdraw registration for non-compliance.',
        severity: 'critical',
        regulatoryBasis: 'OFSI Consolidated List (Sanctions Act 2018)',
        framework: 'FCA Crypto Registration Regime',
      },
    ],
    structuring: [
      {
        jurisdiction: 'CA',
        ruleKey: 'travel_rule_threshold',
        linkedAnomalyId: 'structuring_pattern',
        currentValue: '3000.0',
        requiredValue: '10000.0',
        label: 'Travel Rule Threshold Misconfigured',
        summary: 'FINTRAC requires large virtual currency transaction reports for transfers of CAD 10,000 or more. The on-chain threshold is set to 3,000, which triggers unnecessary data collection on smaller transactions and may not properly flag reportable large transfers.',
        severity: 'medium',
        regulatoryBasis: 'FINTRAC PCMLTFA (Large Transaction Reporting)',
        framework: 'PCMLTFA / FINTRAC',
      },
    ],
  }

  // Build threats — 1 anomaly per scenario, 1 radar gap per scenario, linked by ID
  if (scenario && ANOMALY_SCENARIOS[scenario]) {
    state.threats = ANOMALY_SCENARIOS[scenario]
    state.radarGaps = RADAR_SCENARIOS[scenario] || []
  } else {
    // Mixed: 4 gaps across different jurisdictions for a realistic demo
    state.threats = [
      ANOMALY_SCENARIOS.whale[0],
      ANOMALY_SCENARIOS.mixer[0],
      ANOMALY_SCENARIOS.sleeper[0],
      ANOMALY_SCENARIOS.structuring[0],
    ]
    state.radarGaps = [
      RADAR_SCENARIOS.whale[0],   // EU — travel rule threshold too high
      RADAR_SCENARIOS.mixer[0],   // US — OFAC screening missing
      RADAR_SCENARIOS.sleeper[0], // UK — annual KYC review missing
      RADAR_SCENARIOS.rugpull[0], // SG — MAS threshold exceeded
    ]
  }

  console.log(`[Demo] Activated — ${state.threats.length} anomalies, ${state.radarGaps.length} radar gaps (scenario: ${scenario || 'mixed'})`)

  return {
    threats: state.threats,
    radarGaps: state.radarGaps,
  }
}

export function clearDemo() {
  state.threats = null
  state.radarGaps = null
  console.log('[Demo] Cleared — all threats and radar gaps removed')
}
