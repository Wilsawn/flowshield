export const GITHUB_BASE = 'https://github.com/Wilsawn/flowshield/tree/main'

export interface RepoFile {
  name: string
  path: string // relative to repo root
  description?: string
}

export interface DocNode {
  id: string
  label: string
  group: 'frontend' | 'backend' | 'contracts' | 'agents' | 'infra'
  repoPath: string // directory or file path relative to repo root
  shape: 'circle' | 'diamond' | 'hexagon' | 'square' | 'triangle'
  content: {
    title: string
    description: string
    files: RepoFile[]
    sections: Array<{
      heading: string
      body: string
      code?: { language: string; snippet: string }
    }>
  }
}

export interface DocLink {
  source: string
  target: string
}

export const GROUP_COLORS: Record<string, string> = {
  'frontend': '#34d399',
  'backend': '#a78bfa',
  'contracts': '#22d3ee',
  'agents': '#fbbf24',
  'infra': '#fb7185',
}

export const GROUP_LABELS: Record<string, string> = {
  'frontend': 'Frontend',
  'backend': 'Backend',
  'contracts': 'Contracts',
  'agents': 'Agents',
  'infra': 'Infrastructure',
}

export const GROUP_SHAPES: Record<string, string> = {
  'frontend': 'circle',
  'backend': 'square',
  'contracts': 'diamond',
  'agents': 'hexagon',
  'infra': 'triangle',
}

export const GRAPH_NODES: DocNode[] = [
  // ── Frontend ──────────────────────────────────────────────
  {
    id: 'frontend',
    label: 'Frontend',
    group: 'frontend',
    repoPath: 'frontend',
    shape: 'circle',
    content: {
      title: 'Frontend',
      description: 'React + Vite + Tailwind frontend application.',
      files: [
        { name: 'src/App.tsx', path: 'frontend/src/App.tsx', description: 'Router & app shell' },
        { name: 'src/index.css', path: 'frontend/src/index.css', description: 'Global styles & animations' },
        { name: 'vite.config.ts', path: 'frontend/vite.config.ts', description: 'Build config' },
        { name: 'tailwind.config.js', path: 'frontend/tailwind.config.js', description: 'Design tokens' },
      ],
      sections: [
        {
          heading: 'Stack',
          body: 'React 18, Vite, Tailwind CSS, Framer Motion, React Router. TypeScript throughout with path aliases via @/.',
        },
        {
          heading: 'Dev server',
          body: 'Run the frontend locally:',
          code: { language: 'bash', snippet: 'cd frontend && npm run dev' },
        },
      ],
    },
  },
  {
    id: 'pages',
    label: 'Pages',
    group: 'frontend',
    repoPath: 'frontend/src/pages',
    shape: 'circle',
    content: {
      title: 'Pages',
      description: 'Route-level page components.',
      files: [
        { name: 'index.tsx', path: 'frontend/src/pages/index.tsx', description: 'Landing page with hero, FAQs, CTA' },
        { name: 'dashboard.tsx', path: 'frontend/src/pages/dashboard.tsx', description: 'Authenticated dashboard' },
        { name: 'copilot.tsx', path: 'frontend/src/pages/copilot.tsx', description: 'Builder Copilot AI chat' },
        { name: 'operator.tsx', path: 'frontend/src/pages/operator.tsx', description: 'Operator control panel' },
        { name: 'pricing.tsx', path: 'frontend/src/pages/pricing.tsx', description: 'Pricing plans page' },
        { name: 'docs.tsx', path: 'frontend/src/pages/docs.tsx', description: 'This documentation page' },
        { name: 'privacy.tsx', path: 'frontend/src/pages/privacy.tsx', description: 'Privacy policy' },
        { name: 'terms.tsx', path: 'frontend/src/pages/terms.tsx', description: 'Terms of service' },
      ],
      sections: [
        {
          heading: 'Routing',
          body: 'Routes are defined in App.tsx. Protected routes (dashboard, copilot, operator) require authentication via RequireAuth wrapper. Public routes (landing, pricing, docs, privacy, terms) are open.',
        },
      ],
    },
  },
  {
    id: 'components',
    label: 'Components',
    group: 'frontend',
    repoPath: 'frontend/src/components',
    shape: 'circle',
    content: {
      title: 'Components',
      description: 'Shared UI components and feature modules.',
      files: [
        { name: 'Layout.tsx', path: 'frontend/src/components/Layout.tsx', description: 'App shell with sidebar nav' },
        { name: 'FloatingNav.tsx', path: 'frontend/src/components/FloatingNav.tsx', description: 'Landing page top nav' },
        { name: 'BuilderCopilot.tsx', path: 'frontend/src/components/BuilderCopilot.tsx', description: 'AI chat interface' },
        { name: 'ProductShowcase.tsx', path: 'frontend/src/components/ProductShowcase.tsx', description: 'Architecture diagram' },
        { name: 'RegulatoryRadar.tsx', path: 'frontend/src/components/RegulatoryRadar.tsx', description: 'Jurisdiction scanner UI' },
        { name: 'PricingSection.tsx', path: 'frontend/src/components/PricingSection.tsx', description: 'Pricing cards & contact modal' },
        { name: 'VerificationPanel.tsx', path: 'frontend/src/components/VerificationPanel.tsx', description: 'ZK verification flow' },
        { name: 'OnboardingFlow.tsx', path: 'frontend/src/components/OnboardingFlow.tsx', description: 'Passkey sign-up wizard' },
        { name: 'GovernancePanel.tsx', path: 'frontend/src/components/GovernancePanel.tsx', description: 'On-chain governance UI' },
      ],
      sections: [
        {
          heading: 'Design system',
          body: 'Dark theme with emerald/cyan accents. Uses Geist Sans + Geist Mono fonts. Glass morphism with backdrop-blur and border-white/[0.06] borders. CSS-based scroll reveal animations via IntersectionObserver.',
        },
      ],
    },
  },

  // ── Backend ───────────────────────────────────────────────
  {
    id: 'backend',
    label: 'Backend',
    group: 'backend',
    repoPath: 'backend',
    shape: 'square',
    content: {
      title: 'Backend',
      description: 'Express.js API server with agent orchestration.',
      files: [
        { name: 'api/server.js', path: 'backend/api/server.js', description: 'Express entry point' },
        { name: 'package.json', path: 'backend/package.json', description: 'Dependencies & scripts' },
      ],
      sections: [
        {
          heading: 'Architecture',
          body: 'Node.js + Express server with modular route files, AI agent layer, Supabase for persistence, and Flow blockchain integration. HMAC-SHA256 session auth, not JWT.',
        },
        {
          heading: 'Start',
          body: 'Run the backend:',
          code: { language: 'bash', snippet: 'cd backend && npm run dev' },
        },
      ],
    },
  },
  {
    id: 'api-routes',
    label: 'API Routes',
    group: 'backend',
    repoPath: 'backend/api/routes',
    shape: 'square',
    content: {
      title: 'API Routes',
      description: 'Express route handlers for all endpoints.',
      files: [
        { name: 'risk.js', path: 'backend/api/routes/risk.js', description: 'POST /api/risk/score, /api/risk/monitor' },
        { name: 'compliance.js', path: 'backend/api/routes/compliance.js', description: 'GET /api/compliance/status/:address' },
        { name: 'accounts.js', path: 'backend/api/routes/accounts.js', description: 'Register, login, mint-credential' },
        { name: 'copilot.js', path: 'backend/api/routes/copilot.js', description: 'POST /api/copilot/chat' },
        { name: 'a2a.js', path: 'backend/api/routes/a2a.js', description: 'Agent-to-Agent task endpoints' },
        { name: 'subscription.js', path: 'backend/api/routes/subscription.js', description: 'Plan management' },
        { name: 'chain.js', path: 'backend/api/routes/chain.js', description: 'Flow blockchain queries' },
        { name: 'kyc.js', path: 'backend/api/routes/kyc.js', description: 'KYC verification triggers' },
        { name: 'pool.js', path: 'backend/api/routes/pool.js', description: 'DemoLendingPool operations' },
        { name: 'governance.js', path: 'backend/api/routes/governance.js', description: 'On-chain governance voting' },
        { name: 'admin.js', path: 'backend/api/routes/admin.js', description: 'Admin endpoints' },
      ],
      sections: [
        {
          heading: 'Authentication',
          body: 'Most routes require a Bearer token (HMAC-SHA256 session). Some accept X-Api-Key for server-to-server calls. Public routes: /health, /api/accounts/register, /api/accounts/login.',
        },
      ],
    },
  },
  {
    id: 'backend-lib',
    label: 'Lib & Middleware',
    group: 'backend',
    repoPath: 'backend/lib',
    shape: 'square',
    content: {
      title: 'Lib & Middleware',
      description: 'Shared utilities, auth, and blockchain helpers.',
      files: [
        { name: 'middleware.js', path: 'backend/lib/middleware.js', description: 'Auth middleware & rate limiting' },
        { name: 'crypto.js', path: 'backend/lib/crypto.js', description: 'HMAC-SHA256 token generation' },
        { name: 'supabase.js', path: 'backend/lib/supabase.js', description: 'Supabase client setup' },
        { name: 'flow-signer.js', path: 'backend/lib/flow-signer.js', description: 'Flow transaction signing' },
        { name: 'flow-addresses.js', path: 'backend/lib/flow-addresses.js', description: 'Contract address resolution' },
        { name: 'flow-timeout.js', path: 'backend/lib/flow-timeout.js', description: 'Timeout wrapper for Flow calls' },
        { name: 'prompt-guard.js', path: 'backend/lib/prompt-guard.js', description: 'AI prompt injection guard' },
        { name: 'subscription.js', path: 'backend/lib/subscription.js', description: 'Plan & usage tracking' },
        { name: 'demo-state.js', path: 'backend/lib/demo-state.js', description: 'Demo mode state management' },
      ],
      sections: [
        {
          heading: 'Security',
          body: 'prompt-guard.js prevents prompt injection in copilot requests. crypto.js handles HMAC token generation/verification. middleware.js enforces auth + rate limits on all protected routes.',
        },
      ],
    },
  },
  {
    id: 'database',
    label: 'Database',
    group: 'backend',
    repoPath: 'backend/db',
    shape: 'square',
    content: {
      title: 'Database',
      description: 'Supabase PostgreSQL schema and row-level security.',
      files: [
        { name: 'schema.sql', path: 'backend/db/schema.sql', description: 'Table definitions' },
        { name: 'rls.sql', path: 'backend/db/rls.sql', description: 'Row-level security policies' },
      ],
      sections: [
        {
          heading: 'Tables',
          body: 'Users, sessions, compliance credentials, risk scores, audit logs, subscriptions, and governance proposals. All tables have RLS policies to scope access per user.',
        },
      ],
    },
  },

  // ── Agents ────────────────────────────────────────────────
  {
    id: 'risk-scoring',
    label: 'Risk Scoring',
    group: 'agents',
    repoPath: 'backend/agents/risk-scoring.js',
    shape: 'hexagon',
    content: {
      title: 'Risk Scoring Agent',
      description: 'Calculates a 0-100 risk score based on 8 on-chain factors.',
      files: [
        { name: 'risk-scoring.js', path: 'backend/agents/risk-scoring.js', description: 'Core scoring logic' },
      ],
      sections: [
        {
          heading: 'Risk factors',
          body: '1. Account age (new accounts score higher)\n2. Transaction volume in 24h\n3. Rapid in-out patterns\n4. Mixer/tumbler interaction\n5. Flagged contract interaction\n6. Dormancy spike\n7. High-value transfers\n8. Cross-chain bridge usage',
        },
        {
          heading: 'Tiers',
          body: 'Compliant (0-30): Full access\nSemi-compliant (31-70): Restricted access\nNon-compliant (71-100): Blocked',
        },
      ],
    },
  },
  {
    id: 'anomaly-monitor',
    label: 'Anomaly Monitor',
    group: 'agents',
    repoPath: 'backend/agents/anomaly-monitor.js',
    shape: 'hexagon',
    content: {
      title: 'Anomaly Monitor Agent',
      description: 'Real-time anomaly detection on wallet activity.',
      files: [
        { name: 'anomaly-monitor.js', path: 'backend/agents/anomaly-monitor.js', description: 'Pattern detection engine' },
      ],
      sections: [
        {
          heading: 'Detection patterns',
          body: 'Whale transfers from unverified wallets, fund layering through multiple wallets, bot-like high-frequency trading, MEV extraction patterns, dormant wallet sudden activation.',
        },
      ],
    },
  },
  {
    id: 'regulatory-radar',
    label: 'Regulatory Radar',
    group: 'agents',
    repoPath: 'backend/agents/regulatory-radar.js',
    shape: 'hexagon',
    content: {
      title: 'Regulatory Radar Agent',
      description: 'Scans on-chain rules against jurisdiction checklists.',
      files: [
        { name: 'regulatory-radar.js', path: 'backend/agents/regulatory-radar.js', description: 'Jurisdiction scanner' },
      ],
      sections: [
        {
          heading: 'Jurisdictions',
          body: 'FinCEN (US), MiCA (EU), FCA (UK), MAS (Singapore), FINTRAC (Canada). Compares deployed RuleEngine rules against deterministic checklists per jurisdiction.',
        },
      ],
    },
  },
  {
    id: 'builder-copilot',
    label: 'Builder Copilot',
    group: 'agents',
    repoPath: 'backend/agents/builder-copilot.js',
    shape: 'hexagon',
    content: {
      title: 'Builder Copilot',
      description: 'AI assistant with tool-calling for compliance and code generation.',
      files: [
        { name: 'builder-copilot.js', path: 'backend/agents/builder-copilot.js', description: 'Claude-powered copilot' },
        { name: 'agent-cards.js', path: 'backend/agents/agent-cards.js', description: 'A2A agent card definitions' },
      ],
      sections: [
        {
          heading: 'Tools',
          body: 'check_compliance — verify a wallet\nscan_risk — get risk score\nrun_radar — scan regulations\ngenerate_cadence — write contract code',
        },
      ],
    },
  },
  {
    id: 'orchestrator',
    label: 'A2A Orchestrator',
    group: 'agents',
    repoPath: 'backend/agents/orchestrator.js',
    shape: 'hexagon',
    content: {
      title: 'A2A Orchestrator',
      description: 'Chains multiple agents into multi-step compliance workflows.',
      files: [
        { name: 'orchestrator.js', path: 'backend/agents/orchestrator.js', description: 'Pipeline execution engine' },
        { name: 'a2a-task-manager.js', path: 'backend/agents/a2a-task-manager.js', description: 'Task state management' },
        { name: 'agent-runner.js', path: 'backend/agents/agent-runner.js', description: 'Agent execution wrapper' },
      ],
      sections: [
        {
          heading: 'Pipelines',
          body: 'full-risk-review: Risk -> Anomaly -> Radar -> Copilot summary\ncompliance-audit: Scanner -> Radar -> Report\nanomaly-scan: Monitor -> Flag -> Alert\nmonitoring-cycle: Scheduled autonomous scans',
        },
        {
          heading: 'Discovery',
          body: 'Agent cards are served at /.well-known/agent.json following the A2A protocol spec.',
        },
      ],
    },
  },

  // ── Contracts ─────────────────────────────────────────────
  {
    id: 'compliance-action',
    label: 'ComplianceAction',
    group: 'contracts',
    repoPath: 'cadence/contracts/ComplianceAction.cdc',
    shape: 'diamond',
    content: {
      title: 'ComplianceAction.cdc',
      description: 'The primary contract protocols import. One function: verify().',
      files: [
        { name: 'ComplianceAction.cdc', path: 'cadence/contracts/ComplianceAction.cdc', description: 'Single verify() entry point' },
      ],
      sections: [
        {
          heading: 'Interface',
          body: 'Exposes verify(user: Address): Bool. Checks if the user has a valid, non-expired ComplianceCredential NFT in their account storage. Read-only — does not mutate state.',
        },
      ],
    },
  },
  {
    id: 'compliance-credential',
    label: 'ComplianceCredential',
    group: 'contracts',
    repoPath: 'cadence/contracts/ComplianceCredential.cdc',
    shape: 'diamond',
    content: {
      title: 'ComplianceCredential.cdc',
      description: 'NFT-based credential stored in user account storage.',
      files: [
        { name: 'ComplianceCredential.cdc', path: 'cadence/contracts/ComplianceCredential.cdc', description: 'Credential NFT resource' },
      ],
      sections: [
        {
          heading: 'What gets stored on-chain',
          body: 'Only a boolean (isCompliant), risk score (UInt8), expiry timestamp, and compliance hash. Never names, documents, or personal data. Minted after a successful ZK verification.',
        },
      ],
    },
  },
  {
    id: 'rule-engine',
    label: 'RuleEngine',
    group: 'contracts',
    repoPath: 'cadence/contracts/RuleEngine.cdc',
    shape: 'diamond',
    content: {
      title: 'RuleEngine.cdc',
      description: 'On-chain rule definitions for jurisdiction-specific compliance.',
      files: [
        { name: 'RuleEngine.cdc', path: 'cadence/contracts/RuleEngine.cdc', description: 'Rule storage & enforcement' },
      ],
      sections: [
        {
          heading: 'How rules work',
          body: 'Stores compliance rules per jurisdiction. Each rule has an ID, description, jurisdiction, enforcement status, and optional threshold. The Regulatory Radar agent updates rules when regulations change.',
        },
      ],
    },
  },
  {
    id: 'zk-verifier',
    label: 'ZKVerifier',
    group: 'contracts',
    repoPath: 'cadence/contracts/ZKVerifier.cdc',
    shape: 'diamond',
    content: {
      title: 'ZKVerifier.cdc',
      description: 'Zero-knowledge proof verification on Flow via EVM bridge.',
      files: [
        { name: 'ZKVerifier.cdc', path: 'cadence/contracts/ZKVerifier.cdc', description: 'Cadence-side ZK bridge' },
        { name: 'Groth16Verifier.sol', path: 'evm/contracts/Groth16Verifier.sol', description: 'Solidity Groth16 verifier' },
        { name: 'IGroth16Verifier.sol', path: 'evm/contracts/IGroth16Verifier.sol', description: 'Verifier interface' },
        { name: 'compliance.circom', path: 'evm/circuits/compliance.circom', description: 'Circom ZK circuit' },
      ],
      sections: [
        {
          heading: 'ZK pipeline',
          body: 'User submits identity proof off-chain. The circom circuit generates a Groth16 proof. The Solidity verifier validates it on the Flow EVM sidechain. ZKVerifier.cdc bridges the result back to Cadence to mint a ComplianceCredential.',
        },
      ],
    },
  },
  {
    id: 'governance',
    label: 'Governance',
    group: 'contracts',
    repoPath: 'cadence/contracts/Governance.cdc',
    shape: 'diamond',
    content: {
      title: 'Governance.cdc',
      description: 'On-chain governance for compliance rule proposals and voting.',
      files: [
        { name: 'Governance.cdc', path: 'cadence/contracts/Governance.cdc', description: 'Proposal & voting contract' },
      ],
      sections: [
        {
          heading: 'Governance flow',
          body: 'Compliant users can propose rule changes, vote on proposals, and execute passed proposals. Voting power is 1-per-credential. Proposals require a quorum to pass.',
        },
      ],
    },
  },
  {
    id: 'lending-pool',
    label: 'DemoLendingPool',
    group: 'contracts',
    repoPath: 'cadence/contracts/DemoLendingPool.cdc',
    shape: 'diamond',
    content: {
      title: 'DemoLendingPool.cdc',
      description: 'Example DeFi protocol with built-in compliance gates.',
      files: [
        { name: 'DemoLendingPool.cdc', path: 'cadence/contracts/DemoLendingPool.cdc', description: 'Compliant lending pool' },
        { name: 'deposit_with_compliance.cdc', path: 'cadence/transactions/deposit_with_compliance.cdc', description: 'Deposit transaction' },
      ],
      sections: [
        {
          heading: 'How it works',
          body: 'A reference DeFi lending pool that calls ComplianceAction.verify() before every deposit and withdrawal. Shows the one-line integration pattern in a real protocol.',
        },
      ],
    },
  },
  {
    id: 'transactions',
    label: 'Transactions',
    group: 'contracts',
    repoPath: 'cadence/transactions',
    shape: 'diamond',
    content: {
      title: 'Cadence Transactions',
      description: 'On-chain transaction templates.',
      files: [
        { name: 'verify_and_mint.cdc', path: 'cadence/transactions/verify_and_mint.cdc', description: 'Verify + mint credential' },
        { name: 'verify_zk_via_evm.cdc', path: 'cadence/transactions/verify_zk_via_evm.cdc', description: 'ZK proof bridge call' },
        { name: 'deposit_with_compliance.cdc', path: 'cadence/transactions/deposit_with_compliance.cdc', description: 'Compliant deposit' },
        { name: 'update_rules.cdc', path: 'cadence/transactions/update_rules.cdc', description: 'Update RuleEngine rules' },
        { name: 'revoke_credential.cdc', path: 'cadence/transactions/revoke_credential.cdc', description: 'Revoke a credential' },
        { name: 'schedule_monitoring.cdc', path: 'cadence/transactions/schedule_monitoring.cdc', description: 'Schedule agent monitoring' },
      ],
      sections: [
        {
          heading: 'Scripts',
          body: 'Read-only Cadence scripts for querying state:',
        },
      ],
    },
  },

  // ── Infrastructure ────────────────────────────────────────
  {
    id: 'scripts',
    label: 'Scripts',
    group: 'infra',
    repoPath: 'scripts',
    shape: 'triangle',
    content: {
      title: 'Deploy & Setup Scripts',
      description: 'Shell scripts for testnet deployment and setup.',
      files: [
        { name: 'deploy.sh', path: 'scripts/deploy.sh', description: 'Deploy contracts to testnet' },
        { name: 'setup-testnet.sh', path: 'scripts/setup-testnet.sh', description: 'Initialize testnet accounts' },
        { name: 'flow.json', path: 'flow.json', description: 'Flow CLI project config' },
      ],
      sections: [
        {
          heading: 'Deployment',
          body: 'flow.json defines contract deployment targets. deploy.sh runs flow project deploy for all 7 contracts. setup-testnet.sh creates test accounts and funds them.',
        },
      ],
    },
  },
  {
    id: 'evm-zk',
    label: 'EVM & ZK',
    group: 'infra',
    repoPath: 'evm',
    shape: 'triangle',
    content: {
      title: 'EVM & ZK Circuits',
      description: 'Solidity verifiers and circom circuits for zero-knowledge proofs.',
      files: [
        { name: 'Groth16Verifier.sol', path: 'evm/contracts/Groth16Verifier.sol', description: 'On-chain Groth16 verifier' },
        { name: 'IGroth16Verifier.sol', path: 'evm/contracts/IGroth16Verifier.sol', description: 'Verifier interface' },
        { name: 'compliance.circom', path: 'evm/circuits/compliance.circom', description: 'ZK compliance circuit' },
      ],
      sections: [
        {
          heading: 'How ZK works here',
          body: 'The circom circuit proves compliance without revealing PII. The Groth16 verifier validates proofs on-chain via Flow EVM. The Cadence ZKVerifier contract bridges the result.',
        },
      ],
    },
  },
]

export const GRAPH_LINKS: DocLink[] = [
  // Frontend internal
  { source: 'frontend', target: 'pages' },
  { source: 'frontend', target: 'components' },

  // Backend internal
  { source: 'backend', target: 'api-routes' },
  { source: 'backend', target: 'backend-lib' },
  { source: 'backend', target: 'database' },

  // Frontend <-> Backend
  { source: 'pages', target: 'api-routes' },
  { source: 'components', target: 'api-routes' },

  // Agents connected to backend
  { source: 'api-routes', target: 'risk-scoring' },
  { source: 'api-routes', target: 'anomaly-monitor' },
  { source: 'api-routes', target: 'builder-copilot' },
  { source: 'api-routes', target: 'orchestrator' },

  // A2A orchestrator chains agents
  { source: 'orchestrator', target: 'risk-scoring' },
  { source: 'orchestrator', target: 'anomaly-monitor' },
  { source: 'orchestrator', target: 'regulatory-radar' },
  { source: 'orchestrator', target: 'builder-copilot' },

  // Agents <-> Contracts
  { source: 'risk-scoring', target: 'compliance-action' },
  { source: 'regulatory-radar', target: 'rule-engine' },
  { source: 'builder-copilot', target: 'compliance-action' },

  // Contracts internal
  { source: 'compliance-action', target: 'compliance-credential' },
  { source: 'compliance-action', target: 'rule-engine' },
  { source: 'zk-verifier', target: 'compliance-credential' },
  { source: 'governance', target: 'rule-engine' },
  { source: 'lending-pool', target: 'compliance-action' },
  { source: 'transactions', target: 'compliance-action' },
  { source: 'transactions', target: 'zk-verifier' },

  // Infra
  { source: 'evm-zk', target: 'zk-verifier' },
  { source: 'scripts', target: 'backend' },
  { source: 'scripts', target: 'frontend' },

  // Backend lib supports routes
  { source: 'backend-lib', target: 'api-routes' },
  { source: 'database', target: 'backend-lib' },
]
