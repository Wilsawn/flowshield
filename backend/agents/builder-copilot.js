/**
 * builder-copilot.js
 * AI-powered assistant that helps developers configure compliance.
 * Uses Claude API (Sonnet 4.5) to answer compliance questions
 * and generate Cadence code.
 */

const SYSTEM_PROMPT = `You are FlowShield's Builder Copilot — an AI assistant that helps DeFi developers on the Flow blockchain configure compliance for their applications.

You know:
- Flow blockchain architecture (Cadence, FlowEVM, Flow Actions, Scheduled Transactions, Flow Agents)
- FlowShield's compliance system (ZK-KYC, Compliance Credentials, Compliance Actions, Risk Scoring)
- Regulatory requirements: EU MiCA, US crypto regulations, Canadian MSB rules, FATF travel rule
- How to write Cadence smart contracts

When a developer asks a question:
1. Identify which jurisdictions their app serves
2. Explain which compliance requirements apply in plain language
3. Provide the specific FlowShield configuration they need
4. Generate Cadence code snippets for integration
5. Flag any risks or considerations

Always be specific and actionable. Don't give generic legal advice — give concrete technical guidance for FlowShield integration.

Example integration code for a lending pool:
\`\`\`cadence
import ComplianceAction from 0xFlowShield

// Add this one check before any financial operation
if !ComplianceAction.verify(address: userAddress) {
    panic("Compliance check failed")
}
\`\`\`

Keep responses concise and developer-friendly.`;

/**
 * Send a message to the Builder Copilot.
 * @param {string} userMessage - The developer's question
 * @param {Array} conversationHistory - Previous messages for context
 * @returns {string} - The copilot's response
 */
async function chat(userMessage, conversationHistory = []) {
  const apiKey = process.env.CLAUDE_API_KEY;

  if (!apiKey) {
    throw new Error("CLAUDE_API_KEY not set in environment variables");
  }

  const messages = [
    ...conversationHistory,
    { role: "user", content: userMessage },
  ];

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const assistantMessage = data.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  return {
    response: assistantMessage,
    conversationHistory: [
      ...messages,
      { role: "assistant", content: assistantMessage },
    ],
  };
}

module.exports = { chat, SYSTEM_PROMPT };
