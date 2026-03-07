// regulatory-radar.js
// AI-powered compliance agent with tool use.
// Claude autonomously reads on-chain rules, runs gap detection, then enriches with regulatory analysis.
// Falls back to deterministic checklist if no API key or agent fails.

import { runAgentLoop, parseJsonFromText, isValidFlowAddress, agentLog } from './agent-runner.js'

// ── Fixed compliance requirements per jurisdiction ──────────────────────────
const COMPLIANCE_CHECKLIST = {
  US: {
    framework: 'Bank Secrecy Act / FinCEN Guidance',
    regulator: 'FinCEN / SEC',
    rules: {
      kyc_required: { value: 'true', label: 'KYC Required', basis: 'Bank Secrecy Act (31 USC 5311-5330)' },
      travel_rule_threshold: { value: '3000.0', label: 'Travel Rule Threshold', basis: 'FinCEN Travel Rule (31 CFR 1010.410) — $3,000 threshold' },
      travel_rule_currency: { value: 'USD', label: 'Travel Rule Currency', basis: 'FinCEN Travel Rule' },
      sanctions_screening: { value: 'OFAC', label: 'Sanctions Screening', basis: 'OFAC SDN List (Executive Order 13224)' },
      max_anonymous_tx: { value: '0', label: 'Max Anonymous Transactions', basis: 'FinCEN KYC/AML requirements' },
    },
  },
  EU: {
    framework: 'MiCA (Markets in Crypto-Assets)',
    regulator: 'EBA / ESMA',
    rules: {
      kyc_required: { value: 'true', label: 'KYC Required', basis: 'MiCA Article 68 — Customer identification' },
      travel_rule_threshold: { value: '1000.0', label: 'Travel Rule Threshold', basis: 'Transfer of Funds Regulation (EU 2023/1113) — €1,000' },
      travel_rule_currency: { value: 'EUR', label: 'Travel Rule Currency', basis: 'MiCA / TFR' },
      sanctions_screening: { value: 'EU_SANCTIONS', label: 'Sanctions Screening', basis: 'EU Sanctions Regulation (EC 881/2002)' },
      reverification_days: { value: '365', label: 'Re-verification Period', basis: 'EBA Guidelines on CDD — 12 month review cycle' },
      max_anonymous_tx: { value: '0', label: 'Max Anonymous Transactions', basis: 'MiCA Article 76 — no anonymous crypto accounts' },
    },
  },
  UK: {
    framework: 'FCA Crypto Registration',
    regulator: 'FCA',
    rules: {
      kyc_required: { value: 'true', label: 'KYC Required', basis: 'UK Money Laundering Regulations 2017 (MLR 2017)' },
      travel_rule_threshold: { value: '1000.0', label: 'Travel Rule Threshold', basis: 'FCA Travel Rule — £1,000 threshold' },
      travel_rule_currency: { value: 'GBP', label: 'Travel Rule Currency', basis: 'FCA Travel Rule' },
      sanctions_screening: { value: 'OFSI', label: 'Sanctions Screening', basis: 'OFSI Consolidated List' },
      reverification_days: { value: '365', label: 'Re-verification Period', basis: 'FCA SYSC 6.3 — annual review' },
      max_anonymous_tx: { value: '0', label: 'Max Anonymous Transactions', basis: 'MLR 2017 Regulation 28' },
    },
  },
  SG: {
    framework: 'Payment Services Act',
    regulator: 'MAS',
    rules: {
      kyc_required: { value: 'true', label: 'KYC Required', basis: 'MAS Notice PSN02 — CDD requirements' },
      travel_rule_threshold: { value: '1500.0', label: 'Travel Rule Threshold', basis: 'MAS Notice PSN02 — SGD 1,500 threshold' },
      travel_rule_currency: { value: 'SGD', label: 'Travel Rule Currency', basis: 'MAS Payment Services Act' },
      sanctions_screening: { value: 'MAS_SANCTIONS', label: 'Sanctions Screening', basis: 'MAS Terrorism (Suppression of Financing) Act' },
      reverification_days: { value: '365', label: 'Re-verification Period', basis: 'MAS Notice PSN02 — periodic review' },
      max_anonymous_tx: { value: '0', label: 'Max Anonymous Transactions', basis: 'Payment Services Act Section 36' },
    },
  },
  CA: {
    framework: 'PCMLTFA',
    regulator: 'FINTRAC',
    rules: {
      kyc_required: { value: 'true', label: 'KYC Required', basis: 'PCMLTFA — Know Your Client requirements' },
      travel_rule_threshold: { value: '10000.0', label: 'Travel Rule Threshold', basis: 'FINTRAC Travel Rule — CAD 10,000 threshold' },
      travel_rule_currency: { value: 'CAD', label: 'Travel Rule Currency', basis: 'FINTRAC Travel Rule' },
      sanctions_screening: { value: 'OSFI', label: 'Sanctions Screening', basis: 'OSFI Consolidated Sanctions List' },
      reverification_days: { value: '365', label: 'Re-verification Period', basis: 'PCMLTFA — ongoing monitoring obligations' },
      max_anonymous_tx: { value: '0', label: 'Max Anonymous Transactions', basis: 'PCMLTFA — no anonymous accounts' },
    },
  },
}

/**
 * Read current on-chain rules for all jurisdictions
 */
async function readOnChainRules(fcl, contractAddress) {
  // Sanitize contractAddress to prevent Cadence injection
  if (!isValidFlowAddress(contractAddress)) {
    agentLog('error', 'Radar', 'Invalid contract address — aborting on-chain read', { contractAddress })
    return Object.fromEntries(Object.keys(COMPLIANCE_CHECKLIST).map(k => [k, null]))
  }

  const jurisdictions = Object.keys(COMPLIANCE_CHECKLIST)
  const onChainRules = {}

  for (const code of jurisdictions) {
    try {
      const result = await fcl.query({
        cadence: `
          import RuleEngine from ${contractAddress}
          access(all) fun main(jurisdiction: String): {String: String}? {
            return RuleEngine.getRules(jurisdiction: jurisdiction)
          }
        `,
        args: (arg, t) => [arg(code, t.String)],
      })
      onChainRules[code] = result || null
    } catch (err) {
      agentLog('warn', 'Radar', `Could not read on-chain rules for ${code}`, { error: err.message })
      onChainRules[code] = null
    }
  }

  return onChainRules
}

/**
 * Deterministic gap detection — compares on-chain rules against fixed checklist.
 */
function detectGaps(onChainRules) {
  const gaps = []
  const compliant = []

  for (const [code, checklist] of Object.entries(COMPLIANCE_CHECKLIST)) {
    const current = onChainRules[code]

    if (!current) {
      const requiredRules = {}
      for (const [key, spec] of Object.entries(checklist.rules)) {
        requiredRules[key] = spec.value
      }
      gaps.push({
        jurisdiction: code,
        title: `${code} — No compliance rules on-chain`,
        severity: 'high',
        summary: `No rules found for ${code} in RuleEngine. All ${Object.keys(checklist.rules).length} required compliance rules must be added to satisfy ${checklist.framework} requirements.`,
        regulatoryBasis: `${checklist.framework} (${checklist.regulator})`,
        currentOnChain: {},
        requiredRules,
        effectiveDate: 'now',
      })
      continue
    }

    const missingRules = {}
    const currentValues = {}
    const mismatchDetails = []

    for (const [key, spec] of Object.entries(checklist.rules)) {
      const onChainValue = current[key]
      if (!onChainValue || onChainValue !== spec.value) {
        missingRules[key] = spec.value
        currentValues[key] = onChainValue || null
        mismatchDetails.push(
          onChainValue
            ? `${spec.label}: on-chain "${onChainValue}" → required "${spec.value}" (${spec.basis})`
            : `${spec.label}: missing — required "${spec.value}" (${spec.basis})`
        )
      }
    }

    if (Object.keys(missingRules).length > 0) {
      const missingCount = Object.keys(missingRules).length
      const totalCount = Object.keys(checklist.rules).length
      gaps.push({
        jurisdiction: code,
        title: `${code} — ${missingCount} of ${totalCount} rule(s) non-compliant`,
        severity: missingCount >= 3 ? 'high' : missingCount >= 2 ? 'medium' : 'low',
        summary: mismatchDetails.join('. ') + '.',
        regulatoryBasis: `${checklist.framework} (${checklist.regulator})`,
        currentOnChain: currentValues,
        requiredRules: missingRules,
        effectiveDate: 'now',
      })
    } else {
      compliant.push(code)
    }
  }

  return {
    gaps,
    compliantJurisdictions: compliant,
    overallAssessment: gaps.length > 0
      ? `${gaps.length} jurisdiction(s) have compliance gaps. Fix the on-chain rules and scan again to verify.`
      : 'All monitored jurisdictions have up-to-date compliance rules on-chain.',
  }
}

// ── Agent Tools ──────────────────────────────────────────────────────────────

const RADAR_TOOLS = [
  {
    name: 'read_onchain_rules',
    description: 'Read the current RuleEngine state from Flow testnet for all monitored jurisdictions (US, EU, UK, SG, CA). Returns a map of jurisdiction -> rules object.',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'detect_compliance_gaps',
    description: 'Compare on-chain rules against the regulatory compliance checklist. Returns gaps (non-compliant rules) and compliant jurisdictions.',
    input_schema: {
      type: 'object',
      properties: {
        onchain_rules: {
          type: 'object',
          description: 'Map of jurisdiction code -> rules object from read_onchain_rules',
        },
      },
      required: ['onchain_rules'],
    },
  },
  {
    name: 'get_jurisdiction_checklist',
    description: 'Get the full compliance requirements checklist for a specific jurisdiction, including required values and regulatory basis for each rule.',
    input_schema: {
      type: 'object',
      properties: {
        jurisdiction: { type: 'string', description: 'Jurisdiction code: US, EU, UK, SG, or CA' },
      },
      required: ['jurisdiction'],
    },
  },
]

const RADAR_SYSTEM_PROMPT = `You are a regulatory compliance agent for DeFi protocols on the Flow blockchain.

Your task: Autonomously scan on-chain compliance rules and identify regulatory gaps by:
1. Call read_onchain_rules to fetch current RuleEngine state from Flow testnet
2. Call detect_compliance_gaps to compare against regulatory requirements
3. For each gap found, analyze the real regulatory impact:
   - What specific law or regulation is violated?
   - What are the enforcement risks?
   - What is the remediation priority?
4. You can call get_jurisdiction_checklist to deep-dive into a specific jurisdiction's requirements

Return your final answer as a JSON object with this EXACT shape:
{
  "gaps": [
    {
      "jurisdiction": "<code>",
      "title": "<gap title>",
      "severity": "low" | "medium" | "high",
      "summary": "<your detailed regulatory analysis — specific laws, enforcement risk, remediation priority>",
      "regulatoryBasis": "<framework and regulator>",
      "currentOnChain": { "<key>": "<current_value_or_null>" },
      "requiredRules": { "<key>": "<required_value>" },
      "effectiveDate": "now"
    }
  ],
  "compliantJurisdictions": ["<code>", ...],
  "overallAssessment": "<comprehensive assessment>"
}

IMPORTANT: You MUST keep the same gaps that the detection tool found. Do NOT add or remove gaps. You CAN and SHOULD improve their summaries with real regulatory analysis.
Return ONLY the JSON object, no other text.`

function buildRadarToolHandlers(fcl, contractAddress) {
  return {
    read_onchain_rules: async () => {
      return await readOnChainRules(fcl, contractAddress)
    },
    detect_compliance_gaps: async (input) => {
      return detectGaps(input.onchain_rules)
    },
    get_jurisdiction_checklist: async (input) => {
      const j = input.jurisdiction?.toUpperCase()
      const checklist = COMPLIANCE_CHECKLIST[j]
      if (!checklist) return { error: `Unknown jurisdiction: ${input.jurisdiction}` }
      return {
        jurisdiction: j,
        framework: checklist.framework,
        regulator: checklist.regulator,
        rules: Object.fromEntries(
          Object.entries(checklist.rules).map(([k, v]) => [k, { required: v.value, label: v.label, basis: v.basis }])
        ),
      }
    },
  }
}

function validateRadarResult(result) {
  return (
    result &&
    Array.isArray(result.gaps) &&
    Array.isArray(result.compliantJurisdictions) &&
    typeof result.overallAssessment === 'string'
  )
}

/**
 * Main scan function — agent-first with deterministic fallback.
 *
 * 1. Try agentic loop (Claude reads rules, detects gaps, analyzes)
 * 2. If agent fails or no API key -> deterministic checklist pipeline
 */
export async function scanForGaps(fcl, contractAddress) {
  agentLog('info', 'Radar', 'Starting regulatory scan', { contractAddress })

  // Try agent-first
  try {
    const agentResult = await runAgentLoop({
      systemPrompt: RADAR_SYSTEM_PROMPT,
      userMessage: `Scan on-chain compliance rules for all jurisdictions and identify regulatory gaps. Contract address: ${contractAddress}`,
      tools: RADAR_TOOLS,
      toolHandlers: buildRadarToolHandlers(fcl, contractAddress),
      maxIterations: 6,
      maxTokens: 3072,
    })

    if (agentResult) {
      const parsed = parseJsonFromText(agentResult.text)
      if (validateRadarResult(parsed)) {
        const onChainRules = await readOnChainRules(fcl, contractAddress)
        agentLog('info', 'Radar', 'Agent completed', {
          gaps: parsed.gaps.length, compliant: parsed.compliantJurisdictions.length,
          iterations: agentResult.iterations, toolCalls: agentResult.toolCalls.length,
        })
        return {
          ...parsed,
          source: 'agent',
          onChainRules,
          scannedAt: new Date().toISOString(),
          agentIterations: agentResult.iterations,
          agentToolCalls: agentResult.toolCalls.length,
          ...(agentResult.usage ? { usage: agentResult.usage } : {}),
        }
      } else {
        agentLog('warn', 'Radar', 'Agent returned invalid shape, falling back')
      }
    }
  } catch (err) {
    agentLog('warn', 'Radar', 'Agent failed, falling back to deterministic', { error: err.message })
  }

  // Deterministic fallback
  const onChainRules = await readOnChainRules(fcl, contractAddress)
  const active = Object.keys(onChainRules).filter(k => onChainRules[k])
  agentLog('info', 'Radar', 'Deterministic scan', { activeJurisdictions: active })

  const analysis = detectGaps(onChainRules)

  return {
    gaps: analysis.gaps,
    compliantJurisdictions: analysis.compliantJurisdictions,
    overallAssessment: analysis.overallAssessment,
    source: 'compliance-checklist',
    onChainRules,
    scannedAt: new Date().toISOString(),
  }
}

/**
 * Parse custom regulatory text into structured rules (still uses Claude directly)
 */
const VALID_JURISDICTIONS = new Set(Object.keys(COMPLIANCE_CHECKLIST))
const MAX_REGULATORY_TEXT_LENGTH = 50_000

export async function parseRegulation(regulatoryText, jurisdiction) {
  if (!regulatoryText || typeof regulatoryText !== 'string') {
    return { jurisdiction, rules: {}, summary: 'No regulatory text provided.', severity: 'low', effectiveDate: new Date().toISOString().split('T')[0] }
  }
  if (regulatoryText.length > MAX_REGULATORY_TEXT_LENGTH) {
    regulatoryText = regulatoryText.slice(0, MAX_REGULATORY_TEXT_LENGTH)
    agentLog('warn', 'Radar', 'Regulatory text truncated', { originalLength: regulatoryText.length })
  }

  // Try using agent runner for consistency
  try {
    const result = await runAgentLoop({
      systemPrompt: `You are a regulatory analysis AI. Given regulatory text, extract structured compliance rules as JSON.\n\nOutput format:\n{\n  "jurisdiction": "XX",\n  "rules": {\n    "kyc_required": "true/false",\n    "travel_rule_threshold": "number",\n    "travel_rule_currency": "XXX",\n    "reverification_days": "number",\n    "sanctions_screening": "LIST_NAME",\n    "max_anonymous_tx": "number"\n  },\n  "summary": "One paragraph summary",\n  "severity": "low/medium/high",\n  "effectiveDate": "YYYY-MM-DD"\n}\n\nBe precise. Only include rules explicitly stated or clearly implied.`,
      userMessage: `Jurisdiction: ${jurisdiction}\n\nRegulatory text:\n${regulatoryText}`,
      tools: [],
      toolHandlers: {},
      maxIterations: 1,
      maxTokens: 1024,
    })

    if (result) {
      const parsed = parseJsonFromText(result.text)
      if (parsed && parsed.jurisdiction) return parsed
    }
  } catch (err) {
    agentLog('warn', 'Radar', 'Agent parse failed, using fallback', { error: err.message })
  }

  return {
    jurisdiction,
    rules: {},
    summary: `Regulatory update for ${jurisdiction} detected. Manual review recommended.`,
    severity: 'medium',
    effectiveDate: new Date().toISOString().split('T')[0],
  }
}
