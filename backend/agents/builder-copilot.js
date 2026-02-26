// builder-copilot.js
// AI assistant for developers integrating FlowShield.
// Uses Claude API (Haiku 4.5 for speed + cost efficiency).

const SYSTEM_PROMPT = `You are the FlowShield Copilot — an expert AI assistant that helps BOTH developers AND end-users with privacy-preserving compliance on the Flow blockchain.

You have two modes:

**For Developers** — Help integrate FlowShield into DeFi protocols:
- Cadence smart contract language (Cadence 1.0+ syntax with access(all), auth(), capabilities)
- FlowShield's 6 contracts: ComplianceCredential, ZKVerifier, ComplianceAction, RuleEngine, DemoLendingPool, ComplianceAgent
- Flow primitives: Flow Actions, Scheduled Transactions, Flow Agents, WebAuthn/Passkeys, Cadence Resources, Sponsored Transactions
- Integration is ONE line: import ComplianceAction from 0x93c691a98b975493; let isCompliant = ComplianceAction.verify(userAddress)

**For End Users** — Help understand and improve their compliance status:
- Explain risk scores: what factors contribute (account age, tx patterns, funding sources), how to reduce risk
- Explain compliance tiers: compliant (0-30), semi-compliant (31-70), non-compliant (71-100)
- Help users understand what deposits and borrows do in DeFi lending pools
- Explain jurisdiction rules (FinCEN/US, MiCA/EU, FCA/UK, MAS/SG, FINTRAC/CA) in plain language
- Help users understand why compliance matters and how FlowShield protects their privacy
- Explain that gas fees are SPONSORED — users pay nothing, FlowShield covers transaction costs
- Explain WebAuthn/passkeys: biometric auth (fingerprint OR face) for passwordless login
- Explain ZK proofs: identity is verified but NEVER stored on-chain

FlowShield contracts are deployed at: 0x93c691a98b975493 on Flow testnet.
Key design principle: identity data NEVER exists on-chain. Only ZK proofs and boolean results.

Be conversational, helpful, and concise. If someone asks a simple question, give a simple answer. If they need code, provide Cadence 1.0 examples. If they need compliance advice, explain in plain English.

You can also help with:
- Setting up FlowShield for a new project
- Understanding compliance documents and what they mean
- Comparing jurisdiction requirements
- Estimating costs of compliance (hint: FlowShield saves $50k-200k+ vs hiring compliance lawyers)
- Understanding DeFi concepts like lending pools, collateral, LTV ratios, APY

Always be proactive: suggest next steps, offer to explain more, and guide the user.`

const FALLBACK_RESPONSES = {
  lending: `To add compliance to a lending pool on Flow:

\`\`\`cadence
import ComplianceAction from 0x93c691a98b975493

access(all) fun deposit(depositor: Address, amount: UFix64) {
    // One-line compliance check
    let isCompliant = ComplianceAction.verify(depositor)
    assert(isCompliant, message: "User not compliant")
    
    // ... your deposit logic
}

// For borrows (higher risk), use verifyFull():
access(all) fun borrow(borrower: Address, amount: UFix64) {
    let isFullyCompliant = ComplianceAction.verifyFull(borrower)
    assert(isFullyCompliant, message: "Full compliance required")
    
    // ... your borrow logic
}
\`\`\`

\`verify()\` allows compliant + semi-compliant users (deposits).
\`verifyFull()\` requires full compliance only (borrows, large transfers).`,

  dex: `For a DEX/swap integration:

\`\`\`cadence
import ComplianceAction from 0x93c691a98b975493

transaction(amountIn: UFix64, minAmountOut: UFix64) {
    prepare(acct: auth(Storage) &Account) {
        // Compliance check before swap
        let isCompliant = ComplianceAction.verify(acct.address)
        assert(isCompliant, message: "Compliance required for swaps")
        
        // Your swap logic here
    }
}
\`\`\`

For jurisdiction-specific checks:
\`ComplianceAction.verifyForJurisdiction(addr, jurisdiction: "EU")\``,

  mica: `MiCA (Markets in Crypto-Assets) compliance on FlowShield:

**Key MiCA rules stored in RuleEngine:**
- Travel rule threshold: €1,000
- KYC required: yes
- Sanctions screening: EU sanctions list
- Reverification: every 180 days

\`\`\`cadence
import RuleEngine from 0x93c691a98b975493

// Read EU rules on-chain
let euRules = RuleEngine.getRules(jurisdiction: "EU")
let threshold = RuleEngine.getTravelRuleThreshold(jurisdiction: "EU")
// Returns 1000.0 (EUR)
\`\`\`

FlowShield's Regulatory Radar AI agent monitors MiCA updates and pushes rule changes on-chain automatically.`,

  general: `FlowShield adds compliance to any DeFi protocol with a single Cadence import.

**Quick start:**
1. Import \`ComplianceAction\` from \`0x93c691a98b975493\`
2. Call \`verify(address)\` before financial operations
3. That's it — users verify once via WebAuthn + ZK proof

**Contracts available:**
- \`ComplianceCredential\` — user's on-chain credential
- \`ComplianceAction\` — the one-line integration point
- \`ZKVerifier\` — proof verification
- \`RuleEngine\` — jurisdiction rules (US, EU, UK, SG, CA)
- \`ComplianceAgent\` — autonomous monitoring
- \`DemoLendingPool\` — reference implementation

What are you building? I can give you specific integration code.`,
}

/**
 * Chat with the Builder Copilot
 * Uses Claude API if available, falls back to pattern-matched responses
 */
export async function chat(userMessage, conversationHistory = []) {
  const apiKey = process.env.CLAUDE_API_KEY

  // Try Claude API first
  if (apiKey) {
    try {
      const messages = [
        ...conversationHistory.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        { role: 'user', content: userMessage },
      ]

      const model = process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20250929'
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: 2048,
          system: SYSTEM_PROMPT,
          messages,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const response = data.content[0].text

        return {
          response,
          conversationHistory: [
            ...conversationHistory,
            { role: 'user', content: userMessage },
            { role: 'assistant', content: response },
          ],
        }
      } else {
        const errBody = await res.text()
        console.warn(`[Copilot] Claude API ${res.status}: ${errBody.slice(0, 200)}`)
      }
    } catch (err) {
      console.warn('[Copilot] Claude API error, using fallback:', err.message)
    }
  }

  // Fallback: pattern-matched responses
  const msg = userMessage.toLowerCase()
  let response
  if (msg.includes('lend') || msg.includes('deposit') || msg.includes('borrow') || msg.includes('pool')) {
    response = FALLBACK_RESPONSES.lending
  } else if (msg.includes('swap') || msg.includes('dex') || msg.includes('exchange') || msg.includes('trade')) {
    response = FALLBACK_RESPONSES.dex
  } else if (msg.includes('mica') || msg.includes('eu') || msg.includes('europe') || msg.includes('regulat')) {
    response = FALLBACK_RESPONSES.mica
  } else {
    response = FALLBACK_RESPONSES.general
  }

  return {
    response,
    conversationHistory: [
      ...conversationHistory,
      { role: 'user', content: userMessage },
      { role: 'assistant', content: response },
    ],
  }
}

export { SYSTEM_PROMPT, FALLBACK_RESPONSES }
