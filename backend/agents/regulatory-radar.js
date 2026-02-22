/**
 * regulatory-radar.js
 * AI agent that monitors regulatory changes across jurisdictions
 * and translates them into machine-readable rules for the on-chain RuleEngine.
 * Uses Claude API for natural language processing of regulatory text.
 */

const SYSTEM_PROMPT = `You are FlowShield's Regulatory Radar — an AI agent that reads regulatory text and extracts compliance rules for DeFi protocols.

When given regulatory text or a regulatory update, you must output a JSON object with the following structure:
{
  "jurisdiction": "EU" | "US" | "CA" | etc,
  "rules": {
    "min_age": "18",
    "sanctions_screening": "true" | "false",
    "kyc_required": "true" | "false",
    "max_anonymous_tx": "1000",
    "travel_rule_threshold": "1000",
    "reverification_seconds": "2592000"
  },
  "summary": "Brief plain-language summary of what changed",
  "severity": "low" | "medium" | "high",
  "effective_date": "YYYY-MM-DD"
}

Only output valid JSON. No preamble, no markdown backticks, no explanation outside the JSON.

Key regulations you know:
- EU MiCA: Crypto-asset service providers must verify identity for transactions over 1000 EUR. Full KYC required. Sanctions screening mandatory.
- US: Moving toward clearer frameworks. GENIUS Act advancing. FinCEN rules apply. OFAC sanctions screening required.
- Canada: MSB registration required. FINTRAC reporting. KYC mandatory for all transactions.
- FATF Travel Rule: Identity info must accompany transfers above jurisdiction-specific thresholds.`;

/**
 * Parse regulatory text and extract compliance rules.
 * @param {string} regulatoryText - The regulatory update or text to parse
 * @param {string} jurisdiction - The jurisdiction code (EU, US, CA, etc.)
 * @returns {Object} - Extracted rules in machine-readable format
 */
async function parseRegulation(regulatoryText, jurisdiction) {
  const apiKey = process.env.CLAUDE_API_KEY;

  if (!apiKey) {
    throw new Error("CLAUDE_API_KEY not set in environment variables");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Jurisdiction: ${jurisdiction}\n\nRegulatory text:\n${regulatoryText}\n\nExtract the compliance rules as JSON.`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const text = data.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  // Parse the JSON response
  try {
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch (e) {
    throw new Error(`Failed to parse regulatory rules: ${e.message}\nRaw response: ${text}`);
  }
}

/**
 * Check for regulatory updates for a jurisdiction.
 * In production, this would scrape regulatory feeds, RSS, or APIs.
 * For the hackathon, we use pre-loaded regulatory scenarios.
 */
const REGULATORY_SCENARIOS = {
  EU_MICA_UPDATE: {
    jurisdiction: "EU",
    text: "MiCA Article 68 update: All crypto-asset service providers must implement real-time transaction monitoring. The threshold for mandatory identity verification has been lowered from 1000 EUR to 250 EUR for cross-border transfers. Effective March 1, 2026.",
  },
  US_GENIUS_ACT: {
    jurisdiction: "US",
    text: "GENIUS Act Section 4: Stablecoin issuers and DeFi protocols facilitating stablecoin transactions must implement KYC procedures for all users. Sanctions screening against OFAC SDN list required before any transaction. Reporting threshold set at $3,000.",
  },
  CA_MSB_UPDATE: {
    jurisdiction: "CA",
    text: "FINTRAC update: All money services businesses dealing in virtual currencies must report transactions of $10,000 CAD or more. Enhanced due diligence required for transactions involving privacy-enhancing technologies. Re-verification required every 12 months.",
  },
};

/**
 * Simulate a regulatory change detection and rule update.
 * This is what would run on a schedule in production.
 * @param {string} scenarioKey - Key from REGULATORY_SCENARIOS
 * @returns {Object} - Parsed rules ready for on-chain update
 */
async function simulateRegulatoryChange(scenarioKey) {
  const scenario = REGULATORY_SCENARIOS[scenarioKey];
  if (!scenario) {
    throw new Error(`Unknown scenario: ${scenarioKey}. Available: ${Object.keys(REGULATORY_SCENARIOS).join(", ")}`);
  }

  console.log(`[Regulatory Radar] Detected change for ${scenario.jurisdiction}...`);
  const rules = await parseRegulation(scenario.text, scenario.jurisdiction);
  console.log(`[Regulatory Radar] Extracted rules:`, JSON.stringify(rules, null, 2));

  return rules;
}

/**
 * Format rules for on-chain RuleEngine update transaction.
 * Returns the arguments needed for the Cadence transaction.
 * @param {Object} parsedRules - Output from parseRegulation
 * @returns {Object} - Transaction arguments for RuleEngine.batchUpdateRules
 */
function formatForOnChain(parsedRules) {
  return {
    jurisdiction: parsedRules.jurisdiction,
    updates: parsedRules.rules,
    summary: parsedRules.summary,
    severity: parsedRules.severity,
  };
}

module.exports = {
  parseRegulation,
  simulateRegulatoryChange,
  formatForOnChain,
  REGULATORY_SCENARIOS,
};
