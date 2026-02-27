// regulatory-radar.js
// Hybrid AI compliance agent (production pattern):
//   1. Deterministic checklist detects gaps (stable — same input = same output)
//   2. Claude AI enriches gap descriptions with real regulatory context
//   3. Human-in-the-loop reviews before on-chain push
//   4. Fix a rule → gap disappears on next scan
//
// Architecture based on:
// - Microsoft AI Agent Orchestration Patterns (deterministic routing)
// - Stack AI Financial Services Compliance Agent patterns
// - "Combine deterministic controls with contextual reasoning, preserve traceability"

// ── Fixed compliance requirements per jurisdiction ──────────────────────────
// These are the exact values each jurisdiction requires.
// When on-chain rules match → compliant. When they don't → gap.
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
      console.warn(`[Radar] Could not read on-chain rules for ${code}:`, err.message)
      onChainRules[code] = null
    }
  }

  return onChainRules
}

/**
 * Deterministic gap detection — compares on-chain rules against fixed checklist.
 * Same input ALWAYS produces same output. Fix a rule → gap disappears.
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

/**
 * Claude AI enrichment — takes deterministic gaps and adds real regulatory context.
 * Claude CANNOT add or remove gaps. It can only improve the descriptions.
 * This is the production pattern: deterministic controls + AI reasoning.
 */
async function enrichWithClaude(gaps) {
  const apiKey = process.env.CLAUDE_API_KEY
  if (!apiKey || gaps.length === 0) return gaps

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
        max_tokens: 1500,
        system: `You are a regulatory compliance analyst. You will receive a list of compliance gaps found by comparing on-chain DeFi rules against regulatory requirements.

Your job: For each gap, write a better 1-2 sentence "summary" that explains the real-world regulatory impact. Be specific about the actual law or regulation involved.

RULES:
- Do NOT add new gaps. Do NOT remove any gaps. Do NOT change jurisdiction, title, severity, or requiredRules.
- ONLY improve the "summary" field with real regulatory knowledge.
- Return ONLY a JSON array of objects: [{"index": 0, "summary": "improved summary"}, ...]
- Keep summaries concise and professional.`,
        messages: [{
          role: 'user',
          content: `Enrich these ${gaps.length} compliance gaps with regulatory context:\n\n${JSON.stringify(gaps.map((g, i) => ({ index: i, jurisdiction: g.jurisdiction, title: g.title, currentOnChain: g.currentOnChain, requiredRules: g.requiredRules })), null, 2)}`,
        }],
      }),
    })

    if (!res.ok) return gaps

    const data = await res.json()
    const text = data.content[0].text
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return gaps

    const enrichments = JSON.parse(jsonMatch[0])
    const enriched = [...gaps]
    for (const e of enrichments) {
      if (typeof e.index === 'number' && e.summary && enriched[e.index]) {
        enriched[e.index].summary = e.summary
      }
    }
    console.log(`[Radar] Claude enriched ${enrichments.length} gap descriptions`)
    return enriched
  } catch (err) {
    console.warn('[Radar] Claude enrichment failed (using base descriptions):', err.message)
    return gaps
  }
}

/**
 * Main scan function — reads on-chain rules, runs deterministic gap check,
 * then enriches with Claude AI for real regulatory context.
 *
 * Architecture (production compliance agent pattern):
 *   1. READ on-chain state (deterministic data source)
 *   2. DETECT gaps via fixed checklist (deterministic — same input = same output)
 *   3. ENRICH with Claude AI (adds regulatory context, cannot change gap list)
 *   4. HUMAN reviews and approves (human-in-the-loop)
 *   5. PUSH on-chain (deterministic state update)
 *   6. RE-SCAN shows gap resolved (deterministic verification)
 */
export async function scanForGaps(fcl, contractAddress) {
  console.log('[Radar] Starting regulatory scan...')

  // 1. Read real on-chain rules
  const onChainRules = await readOnChainRules(fcl, contractAddress)
  const active = Object.keys(onChainRules).filter(k => onChainRules[k])
  console.log('[Radar] On-chain rules read for:', active.join(', ') || 'none')

  // 2. Deterministic gap detection against fixed checklist
  const analysis = detectGaps(onChainRules)
  console.log(`[Radar] Checklist: ${analysis.gaps.length} gaps, ${analysis.compliantJurisdictions.length} compliant`)

  // 3. Claude AI enriches gap descriptions with real regulatory context
  // Claude cannot add/remove gaps — only improve summaries
  const enrichedGaps = await enrichWithClaude(analysis.gaps, onChainRules)

  return {
    gaps: enrichedGaps,
    compliantJurisdictions: analysis.compliantJurisdictions,
    overallAssessment: analysis.overallAssessment,
    source: 'compliance-checklist+ai',
    onChainRules,
    scannedAt: new Date().toISOString(),
  }
}

/**
 * Parse custom regulatory text into structured rules (still uses Claude)
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
          model: process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          system: `You are a regulatory analysis AI. Given regulatory text, extract structured compliance rules as JSON.\n\nOutput format:\n{\n  "jurisdiction": "XX",\n  "rules": {\n    "kyc_required": "true/false",\n    "travel_rule_threshold": "number",\n    "travel_rule_currency": "XXX",\n    "reverification_days": "number",\n    "sanctions_screening": "LIST_NAME",\n    "max_anonymous_tx": "number"\n  },\n  "summary": "One paragraph summary",\n  "severity": "low/medium/high",\n  "effectiveDate": "YYYY-MM-DD"\n}\n\nBe precise. Only include rules explicitly stated or clearly implied.`,
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
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0])
        }
      }
    } catch (err) {
      console.log('[Radar] Claude API error, using fallback:', err.message)
    }
  }

  return {
    jurisdiction,
    rules: {},
    summary: `Regulatory update for ${jurisdiction} detected. Manual review recommended.`,
    severity: 'medium',
    effectiveDate: new Date().toISOString().split('T')[0],
  }
}
