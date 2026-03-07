// agents/agent-cards.js
// A2A (Agent-to-Agent) protocol — Agent Card metadata for FlowShield's 4 agents.
// Each card describes capabilities, input/output schemas, endpoint, auth, and rate limits.

const FLOW_ADDRESS_PATTERN = '^0x[a-fA-F0-9]{16}$'

const AGENT_CARDS = {
  'builder-copilot': {
    id: 'builder-copilot',
    name: 'Builder Copilot',
    description: 'AI super-agent that orchestrates other agents via tool use. Can autonomously run risk assessments, anomaly detection, and compliance scans to provide comprehensive analysis. Supports chat conversations and code compliance scanning.',
    version: '2.0.0',
    capabilities: ['chat', 'code-scan'],
    tags: ['ai', 'chat', 'developer', 'compliance', 'code-analysis', 'orchestrator'],
    endpoint: '/api/copilot',
    auth: { type: 'bearer', header: 'Authorization', required: true },
    rateLimit: { chat: '20 req/min per user', 'code-scan': '10 req/min per user' },
    inputSchemas: {
      chat: {
        type: 'object',
        properties: {
          message: { type: 'string', description: 'User message', minLength: 1, maxLength: 10000 },
          context: {
            type: 'object',
            description: 'Optional live on-chain context',
            properties: {
              riskScore: { type: 'number', minimum: 0, maximum: 100 },
              riskTier: { type: 'string', enum: ['compliant', 'semi-compliant', 'non-compliant'] },
              anomalyCount: { type: 'number' },
              jurisdiction: { type: 'string', enum: ['US', 'EU', 'UK', 'SG', 'CA'] },
              demoMode: { type: 'boolean' },
            },
          },
          sessionId: { type: 'string', description: 'Conversation session ID for multi-turn chat' },
        },
        required: ['message'],
      },
      'code-scan': {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'Source code to analyze', minLength: 1, maxLength: 100000 },
          language: { type: 'string', enum: ['cadence', 'solidity', 'javascript', 'typescript'], default: 'cadence' },
          context: { type: 'string', description: 'Additional context about the project', maxLength: 2000 },
        },
        required: ['code'],
      },
    },
    outputSchemas: {
      chat: {
        type: 'object',
        properties: {
          response: { type: 'string', description: 'AI-generated response' },
          sessionId: { type: 'string' },
          messageCount: { type: 'number' },
          injectionWarning: { type: 'boolean', description: 'True if injection attempt detected' },
        },
      },
      'code-scan': {
        type: 'object',
        properties: {
          analysis: { type: 'string', description: 'Markdown-formatted compliance analysis' },
          source: { type: 'string', enum: ['claude-ai', 'deterministic-scanner'] },
          score: { type: 'number', minimum: 0, maximum: 100, description: 'Compliance score' },
          issues: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
                location: { type: 'string' },
                issue: { type: 'string' },
                fix: { type: 'string' },
              },
            },
          },
        },
      },
    },
  },

  'risk-scoring': {
    id: 'risk-scoring',
    name: 'Risk Scoring Agent',
    description: 'AI-powered agent that autonomously analyzes wallets using on-chain tools and reasoning. Fetches wallet data, runs deterministic scoring, then uses Claude to identify correlated risk signals beyond static rules. Falls back to pure deterministic scoring without API key.',
    version: '2.0.0',
    capabilities: ['assess-risk'],
    tags: ['risk', 'scoring', 'on-chain', 'ai-enhanced', 'tool-use'],
    endpoint: '/api/risk',
    auth: { type: 'bearer', header: 'Authorization', required: true },
    rateLimit: { 'assess-risk': '30 req/min' },
    inputSchemas: {
      'assess-risk': {
        type: 'object',
        properties: {
          address: { type: 'string', description: 'Flow address (0x + 16 hex chars)', pattern: FLOW_ADDRESS_PATTERN },
        },
        required: ['address'],
      },
    },
    outputSchemas: {
      'assess-risk': {
        type: 'object',
        properties: {
          score: { type: 'number', minimum: 0, maximum: 100, description: 'Risk score (0=safe, 100=highest risk)' },
          tier: { type: 'string', enum: ['compliant', 'semi-compliant', 'non-compliant'] },
          factors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                label: { type: 'string' },
                points: { type: 'number' },
              },
            },
            description: 'Triggered risk factors',
          },
          factorCount: { type: 'number' },
          totalFactors: { type: 'number', const: 8 },
          walletData: { type: 'object', description: 'Raw on-chain wallet data from Flow testnet' },
          analysisSource: { type: 'string', enum: ['agent', 'deterministic'], description: 'Whether AI agent or fallback was used' },
          agentReasoning: { type: 'string', description: 'AI analysis of correlated signals (only when source=agent)' },
        },
      },
    },
  },

  'anomaly-monitor': {
    id: 'anomaly-monitor',
    name: 'Anomaly Monitor',
    description: 'AI agent that detects suspicious patterns using on-chain tools and correlates behavioral signals beyond static thresholds. Autonomously gathers data, runs detection, and provides contextual analysis. Falls back to deterministic thresholds without API key.',
    version: '2.0.0',
    capabilities: ['monitor-address'],
    tags: ['anomaly', 'monitoring', 'behavioral', 'ai-enhanced', 'tool-use'],
    endpoint: '/api/risk',
    auth: { type: 'bearer', header: 'Authorization', required: true },
    rateLimit: { 'monitor-address': '30 req/min' },
    inputSchemas: {
      'monitor-address': {
        type: 'object',
        properties: {
          address: { type: 'string', description: 'Flow address to monitor (0x + 16 hex chars)', pattern: FLOW_ADDRESS_PATTERN },
        },
        required: ['address'],
      },
    },
    outputSchemas: {
      'monitor-address': {
        type: 'object',
        properties: {
          anomalyCount: { type: 'number', minimum: 0 },
          highestSeverity: { type: 'string', enum: ['none', 'low', 'medium', 'high'] },
          recommendedAction: { type: 'string', enum: ['none', 'monitor', 're-verify', 'flag-and-review'] },
          summary: { type: 'string', description: 'Human-readable summary of findings' },
          anomalies: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                label: { type: 'string' },
                detail: { type: 'string' },
                severity: { type: 'string', enum: ['low', 'medium', 'high'] },
                timestamp: { type: 'string', format: 'date-time' },
              },
            },
          },
          activity: { type: 'object', description: 'Raw on-chain wallet data' },
          analysisSource: { type: 'string', enum: ['agent', 'checklist', 'validation'] },
          agentReasoning: { type: 'string', description: 'Contextual analysis (only when source=agent)' },
        },
      },
    },
  },

  'regulatory-radar': {
    id: 'regulatory-radar',
    name: 'Regulatory Radar',
    description: 'AI agent that scans on-chain compliance with tools and provides regulatory impact analysis. Autonomously reads RuleEngine state, detects gaps against requirements (US, EU, UK, SG, CA), and enriches findings with real regulatory context. Falls back to deterministic checklist without API key.',
    version: '2.0.0',
    capabilities: ['scan-gaps', 'parse-regulation'],
    tags: ['regulatory', 'compliance', 'radar', 'ai-enhanced', 'tool-use', 'on-chain'],
    endpoint: '/api/copilot',
    auth: { type: 'bearer', header: 'Authorization', required: true },
    rateLimit: { 'scan-gaps': '10 req/min', 'parse-regulation': '10 req/min' },
    inputSchemas: {
      'scan-gaps': {
        type: 'object',
        properties: {},
        description: 'No input needed — reads directly from on-chain RuleEngine state for all 5 jurisdictions.',
      },
      'parse-regulation': {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Regulatory text to parse', minLength: 10, maxLength: 50000 },
          jurisdiction: { type: 'string', description: 'Jurisdiction code', enum: ['US', 'EU', 'UK', 'SG', 'CA'] },
        },
        required: ['text', 'jurisdiction'],
      },
    },
    outputSchemas: {
      'scan-gaps': {
        type: 'object',
        properties: {
          gaps: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                jurisdiction: { type: 'string', enum: ['US', 'EU', 'UK', 'SG', 'CA'] },
                title: { type: 'string' },
                severity: { type: 'string', enum: ['low', 'medium', 'high'] },
                summary: { type: 'string' },
                regulatoryBasis: { type: 'string' },
                currentOnChain: { type: 'object' },
                requiredRules: { type: 'object' },
                effectiveDate: { type: 'string' },
              },
            },
          },
          compliantJurisdictions: { type: 'array', items: { type: 'string' } },
          overallAssessment: { type: 'string' },
          source: { type: 'string', enum: ['agent', 'compliance-checklist'] },
          scannedAt: { type: 'string', format: 'date-time' },
        },
      },
      'parse-regulation': {
        type: 'object',
        properties: {
          jurisdiction: { type: 'string' },
          rules: { type: 'object' },
          summary: { type: 'string' },
          severity: { type: 'string', enum: ['low', 'medium', 'high'] },
          effectiveDate: { type: 'string', format: 'date' },
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
    description: 'Privacy-preserving compliance infrastructure for DeFi on Flow blockchain. 4 specialized AI agents with autonomous tool use for compliance, risk scoring, anomaly detection, and regulatory monitoring.',
    version: '2.0.0',
    protocol: 'a2a',
    authentication: { type: 'bearer', header: 'Authorization' },
    agents: getAllAgentCards().map(card => ({
      id: card.id,
      name: card.name,
      description: card.description,
      version: card.version,
      capabilities: card.capabilities,
      tags: card.tags,
      url: `${baseUrl}/api/a2a/agents/${card.id}`,
    })),
    tasksEndpoint: `${baseUrl}/api/a2a/tasks`,
    chainsEndpoint: `${baseUrl}/api/a2a/chains`,
    chains: ['full-risk-review', 'compliance-review', 'full-compliance-review'],
  }
}

export { AGENT_CARDS }
