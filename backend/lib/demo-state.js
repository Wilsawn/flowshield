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
    sybil: [
      {
        jurisdiction: 'EU',
        ruleKey: 'sybil_detection',
        linkedAnomalyId: 'sybil_cluster',
        currentValue: 'none',
        requiredValue: 'true',
        label: 'Sybil Attack Detection Missing',
        summary: 'MiCA Article 68 requires CASPs to detect and prevent market manipulation including coordinated fake account activity. 53 accounts from a single funding source operating in lockstep indicates a Sybil attack on governance or airdrop farming.',
        severity: 'high',
        regulatoryBasis: 'MiCA Article 68 (Market Manipulation Prevention)',
        framework: 'MiCA (Markets in Crypto-Assets)',
      },
    ],
    mixer: [
      {
        jurisdiction: 'US',
        ruleKey: 'mixer_screening',
        linkedAnomalyId: 'mixer_interaction',
        currentValue: 'none',
        requiredValue: 'true',
        label: 'Mixer/Tumbler Screening Missing',
        summary: 'FinCEN guidance FIN-2019-G001 and OFAC sanctions (Tornado Cash, Aug 2022) require VASPs to screen for and block interactions with known mixing services. A 120,000 FLOW deposit to a flagged mixer contract is a critical compliance failure.',
        severity: 'critical',
        regulatoryBasis: 'FinCEN FIN-2019-G001 + OFAC Tornado Cash Designation',
        framework: 'Bank Secrecy Act (BSA) + OFAC Sanctions',
      },
    ],
    rugpull: [
      {
        jurisdiction: 'SG',
        ruleKey: 'liquidity_safeguards',
        linkedAnomalyId: 'liquidity_drain',
        currentValue: 'none',
        requiredValue: 'true',
        label: 'Liquidity Pool Safeguards Missing',
        summary: 'MAS PS Act requires DPT service providers to maintain safeguards against misappropriation of customer assets. A contract deployer draining 94% of pool liquidity in one transaction indicates missing withdrawal limits, timelocks, or multi-sig controls.',
        severity: 'critical',
        regulatoryBasis: 'MAS Payment Services Act 2019, Section 49',
        framework: 'MAS DPT Regulations',
      },
    ],
    sanctions: [
      {
        jurisdiction: 'US',
        ruleKey: 'sanctions_screening',
        linkedAnomalyId: 'sanctioned_address',
        currentValue: 'none',
        requiredValue: 'true',
        label: 'OFAC Sanctions Screening Missing',
        summary: 'OFAC requires all US persons and entities to screen transactions against the SDN list. A 50,000 FLOW transfer to a Tornado Cash-designated address is a potential sanctions violation carrying civil and criminal penalties.',
        severity: 'critical',
        regulatoryBasis: 'OFAC SDN List + Executive Order 13694',
        framework: 'US Treasury Sanctions Program',
      },
    ],
    structuring: [
      {
        jurisdiction: 'CA',
        ruleKey: 'structuring_detection',
        linkedAnomalyId: 'structuring_pattern',
        currentValue: 'none',
        requiredValue: 'true',
        label: 'Transaction Structuring Detection Missing',
        summary: 'FINTRAC PCMLTFA Section 7 requires reporting of suspicious transactions designed to evade reporting thresholds. 14 transactions of exactly 2,900 FLOW (just below the 3,000 threshold) over 48 hours is textbook structuring — also known as "smurfing."',
        severity: 'high',
        regulatoryBasis: 'FINTRAC PCMLTFA Section 7 (Suspicious Transaction Reports)',
        framework: 'FINTRAC AML/ATF',
      },
    ],
  }

  // Build threats — 1 anomaly per scenario, 1 radar gap per scenario, linked by ID
  if (scenario && ANOMALY_SCENARIOS[scenario]) {
    state.threats = ANOMALY_SCENARIOS[scenario]
    state.radarGaps = RADAR_SCENARIOS[scenario] || []
  } else {
    // Mixed: 4 high-impact scenarios for a clean demo view
    state.threats = [
      ANOMALY_SCENARIOS.whale[0],
      ANOMALY_SCENARIOS.mixer[0],
      ANOMALY_SCENARIOS.sanctions[0],
      ANOMALY_SCENARIOS.structuring[0],
    ]
    state.radarGaps = [
      RADAR_SCENARIOS.whale[0],
      RADAR_SCENARIOS.mixer[0],
      RADAR_SCENARIOS.sanctions[0],
      RADAR_SCENARIOS.structuring[0],
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
