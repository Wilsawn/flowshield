// regulatory-radar.js
// AI agent that parses regulatory text into machine-readable rules.
// Uses Claude API when available, falls back to pre-loaded scenarios.

const RADAR_SYSTEM_PROMPT = `You are a regulatory analysis AI. Given regulatory text, extract structured compliance rules as JSON.

Output format:
{
  "jurisdiction": "XX",
  "rules": {
    "kyc_required": "true/false",
    "travel_rule_threshold": "number",
    "travel_rule_currency": "XXX",
    "reverification_days": "number",
    "sanctions_screening": "LIST_NAME",
    "max_anonymous_tx": "number"
  },
  "summary": "One paragraph summary of the change",
  "severity": "low/medium/high",
  "effectiveDate": "YYYY-MM-DD"
}

Be precise. Only include rules that are explicitly stated or clearly implied.`

// Pre-loaded demo scenarios for the hackathon
const DEMO_SCENARIOS = {
  eu_mica_update: {
    jurisdiction: 'EU',
    title: 'MiCA Travel Rule Threshold Reduction',
    regulatoryText: 'The European Banking Authority has announced that effective March 2026, the travel rule threshold for crypto-asset transfers will be reduced from €1,000 to €0, meaning all crypto transactions regardless of size must include originator and beneficiary information. This aligns crypto regulations with traditional wire transfer rules under the EU Funds Transfer Regulation.',
    rules: {
      travel_rule_threshold: '0.0',
      travel_rule_currency: 'EUR',
      reverification_days: '90',
    },
    summary: 'MiCA travel rule threshold reduced to €0. All crypto transactions now require originator/beneficiary info regardless of size. Reverification period shortened to 90 days.',
    severity: 'high',
    effectiveDate: '2026-03-01',
  },
  us_genius_act: {
    jurisdiction: 'US',
    title: 'GENIUS Act Stablecoin Compliance',
    regulatoryText: 'The Guiding and Establishing National Innovation for US Stablecoins (GENIUS) Act requires all stablecoin issuers and DeFi protocols handling stablecoins to implement real-time transaction monitoring and maintain reserves verifiable on-chain. Protocols must verify user identity for transactions exceeding $1,000 and report suspicious activity to FinCEN within 24 hours.',
    rules: {
      travel_rule_threshold: '1000.0',
      travel_rule_currency: 'USD',
      kyc_required: 'true',
      sanctions_screening: 'OFAC',
    },
    summary: 'GENIUS Act mandates real-time monitoring for stablecoin protocols. KYC threshold lowered to $1,000. Suspicious activity reporting required within 24 hours.',
    severity: 'high',
    effectiveDate: '2026-06-01',
  },
  ca_fintrac_update: {
    jurisdiction: 'CA',
    title: 'FINTRAC DeFi Registration Requirement',
    regulatoryText: 'FINTRAC has issued updated guidance requiring all DeFi protocols accessible to Canadian users to register as Money Services Businesses (MSBs). The travel rule threshold remains at CAD $10,000 but new requirements include mandatory suspicious transaction reporting and enhanced record-keeping for cross-border transactions.',
    rules: {
      kyc_required: 'true',
      travel_rule_threshold: '10000.0',
      travel_rule_currency: 'CAD',
      sanctions_screening: 'OSFI',
    },
    summary: 'FINTRAC now requires DeFi protocols to register as MSBs. Enhanced reporting and record-keeping for cross-border transactions.',
    severity: 'medium',
    effectiveDate: '2026-04-15',
  },
  sg_mas_defi: {
    jurisdiction: 'SG',
    title: 'MAS DeFi Licensing Framework',
    regulatoryText: 'The Monetary Authority of Singapore has introduced a new licensing framework for DeFi protocols under an expanded Payment Services Act. Protocols must implement continuous transaction monitoring, maintain a risk-based approach to customer verification, and reduce the travel rule threshold from SGD 1,500 to SGD 1,000.',
    rules: {
      travel_rule_threshold: '1000.0',
      travel_rule_currency: 'SGD',
      reverification_days: '180',
    },
    summary: 'MAS introduces DeFi licensing. Travel rule threshold reduced to SGD 1,000. Continuous monitoring required.',
    severity: 'medium',
    effectiveDate: '2026-07-01',
  },
}

/**
 * Parse regulatory text into structured rules
 * Uses Claude API if available, otherwise returns pre-analyzed result
 */
export async function parseRegulation(regulatoryText, jurisdiction) {
  const apiKey = process.env.CLAUDE_API_KEY

  if (apiKey) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20250929',
          max_tokens: 1024,
          system: RADAR_SYSTEM_PROMPT,
          messages: [
            {
              role: 'user',
              content: `Jurisdiction: ${jurisdiction}\n\nRegulatory text:\n${regulatoryText}`,
            },
          ],
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const text = data.content[0].text
        // Try to parse JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0])
        }
      }
    } catch (err) {
      console.log('[Radar] Claude API error, using fallback:', err.message)
    }
  }

  // Fallback: return a generic parsed result
  return {
    jurisdiction,
    rules: {},
    summary: `Regulatory update for ${jurisdiction} detected. Manual review recommended.`,
    severity: 'medium',
    effectiveDate: new Date().toISOString().split('T')[0],
  }
}

/**
 * Format parsed rules for on-chain RuleEngine update
 * Returns arguments for the update_rules.cdc transaction
 */
export function formatForOnChain(parsedRules) {
  const updates = []
  for (const [key, value] of Object.entries(parsedRules.rules || {})) {
    updates.push({
      jurisdiction: parsedRules.jurisdiction,
      key,
      value: String(value),
    })
  }
  return updates
}

/**
 * Simulate a regulatory change for the hackathon demo
 * Returns the full scenario with parsed rules ready for on-chain update
 */
export function simulateRegulatoryChange(scenarioKey) {
  const scenario = DEMO_SCENARIOS[scenarioKey]
  if (!scenario) {
    return { error: `Unknown scenario: ${scenarioKey}`, availableScenarios: Object.keys(DEMO_SCENARIOS) }
  }

  return {
    ...scenario,
    onChainUpdates: formatForOnChain(scenario),
    timestamp: new Date().toISOString(),
  }
}

/**
 * Get all available demo scenarios
 */
export function getScenarios() {
  return Object.entries(DEMO_SCENARIOS).map(([key, s]) => ({
    key,
    title: s.title,
    jurisdiction: s.jurisdiction,
    severity: s.severity,
    summary: s.summary,
  }))
}

export { DEMO_SCENARIOS }
