// agents/agent-cards.js
// A2A (Agent-to-Agent) protocol — Agent Card metadata for FlowShield's 4 agents.
// Each card describes the agent's capabilities, input/output schemas, and endpoint.

const AGENT_CARDS = {
  'builder-copilot': {
    id: 'builder-copilot',
    name: 'Builder Copilot',
    description: 'AI assistant for developers integrating FlowShield and end-users managing compliance. Supports chat conversations and code compliance scanning.',
    version: '1.0.0',
    capabilities: ['chat', 'code-scan'],
    tags: ['ai', 'chat', 'developer', 'compliance', 'code-analysis'],
    endpoint: '/api/copilot',
    inputSchemas: {
      chat: {
        type: 'object',
        properties: {
          message: { type: 'string', description: 'User message' },
          context: { type: 'object', description: 'Optional live on-chain context (risk score, anomalies, etc.)' },
          sessionId: { type: 'string', description: 'Conversation session ID' },
        },
        required: ['message'],
      },
      'code-scan': {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'Source code to analyze' },
          language: { type: 'string', enum: ['cadence', 'solidity', 'javascript', 'typescript'], default: 'cadence' },
          context: { type: 'string', description: 'Additional context about the project' },
        },
        required: ['code'],
      },
    },
    outputSchemas: {
      chat: {
        type: 'object',
        properties: {
          response: { type: 'string' },
          sessionId: { type: 'string' },
          messageCount: { type: 'number' },
        },
      },
      'code-scan': {
        type: 'object',
        properties: {
          analysis: { type: 'string' },
          source: { type: 'string' },
          score: { type: 'number' },
          issues: { type: 'array' },
        },
      },
    },
  },

  'risk-scoring': {
    id: 'risk-scoring',
    name: 'Risk Scoring Agent',
    description: 'Rule-based risk scoring agent that analyzes public on-chain Flow data to assign compliance risk tiers. No LLM needed — deterministic scoring.',
    version: '1.0.0',
    capabilities: ['assess-risk'],
    tags: ['risk', 'scoring', 'on-chain', 'deterministic'],
    endpoint: '/api/risk',
    inputSchemas: {
      'assess-risk': {
        type: 'object',
        properties: {
          address: { type: 'string', description: 'Flow address (0x prefixed)' },
        },
        required: ['address'],
      },
    },
    outputSchemas: {
      'assess-risk': {
        type: 'object',
        properties: {
          score: { type: 'number', minimum: 0, maximum: 100 },
          tier: { type: 'string', enum: ['compliant', 'semi-compliant', 'non-compliant'] },
          factors: { type: 'array' },
          walletData: { type: 'object' },
        },
      },
    },
  },

  'anomaly-monitor': {
    id: 'anomaly-monitor',
    name: 'Anomaly Monitor',
    description: 'Hybrid AI behavioral monitoring agent. Deterministic thresholds detect anomalies, Claude AI enriches descriptions. Same wallet data always produces the same anomaly list.',
    version: '1.0.0',
    capabilities: ['monitor-address'],
    tags: ['anomaly', 'monitoring', 'behavioral', 'hybrid-ai'],
    endpoint: '/api/risk',
    inputSchemas: {
      'monitor-address': {
        type: 'object',
        properties: {
          address: { type: 'string', description: 'Flow address to monitor (0x prefixed)' },
        },
        required: ['address'],
      },
    },
    outputSchemas: {
      'monitor-address': {
        type: 'object',
        properties: {
          anomalyCount: { type: 'number' },
          highestSeverity: { type: 'string' },
          recommendedAction: { type: 'string' },
          summary: { type: 'string' },
          anomalies: { type: 'array' },
          activity: { type: 'object' },
        },
      },
    },
  },

  'regulatory-radar': {
    id: 'regulatory-radar',
    name: 'Regulatory Radar',
    description: 'Hybrid AI compliance agent. Reads on-chain RuleEngine state, compares against fixed regulatory checklists (US, EU, UK, SG, CA), and enriches gap descriptions with Claude AI.',
    version: '1.0.0',
    capabilities: ['scan-gaps', 'parse-regulation'],
    tags: ['regulatory', 'compliance', 'radar', 'hybrid-ai', 'on-chain'],
    endpoint: '/api/copilot',
    inputSchemas: {
      'scan-gaps': {
        type: 'object',
        properties: {},
        description: 'No input needed — reads directly from on-chain RuleEngine state.',
      },
      'parse-regulation': {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Regulatory text to parse' },
          jurisdiction: { type: 'string', description: 'Jurisdiction code (US, EU, UK, SG, CA)' },
        },
        required: ['text', 'jurisdiction'],
      },
    },
    outputSchemas: {
      'scan-gaps': {
        type: 'object',
        properties: {
          gaps: { type: 'array' },
          compliantJurisdictions: { type: 'array' },
          overallAssessment: { type: 'string' },
          source: { type: 'string' },
        },
      },
      'parse-regulation': {
        type: 'object',
        properties: {
          jurisdiction: { type: 'string' },
          rules: { type: 'object' },
          summary: { type: 'string' },
          severity: { type: 'string' },
          effectiveDate: { type: 'string' },
        },
      },
    },
  },
}

/**
 * Get all agent cards
 */
export function getAllAgentCards() {
  return Object.values(AGENT_CARDS)
}

/**
 * Get a single agent card by ID
 */
export function getAgentCard(agentId) {
  return AGENT_CARDS[agentId] || null
}

/**
 * Build the A2A discovery document (/.well-known/agent.json)
 */
export function buildDiscoveryDocument(baseUrl) {
  return {
    name: 'FlowShield',
    description: 'Privacy-preserving compliance infrastructure for DeFi on Flow blockchain. 4 specialized AI agents for compliance, risk scoring, anomaly detection, and regulatory monitoring.',
    version: '1.0.0',
    protocol: 'a2a',
    agents: getAllAgentCards().map(card => ({
      id: card.id,
      name: card.name,
      description: card.description,
      capabilities: card.capabilities,
      url: `${baseUrl}/api/a2a/agents/${card.id}`,
    })),
    tasksEndpoint: `${baseUrl}/api/a2a/tasks`,
    chainsEndpoint: `${baseUrl}/api/a2a/chains`,
  }
}

export { AGENT_CARDS }
