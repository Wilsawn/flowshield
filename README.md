<div align="center">

# FlowShield

**Privacy-preserving compliance infrastructure for DeFi on Flow.**

[Live on Testnet](https://testnet.flowscan.io/account/0x93c691a98b975493) · [Architecture](docs/ARCHITECTURE.md) · [Demo Guide](docs/DEMO.md)

![Flow](https://img.shields.io/badge/Flow-Testnet-00ef8b?style=flat-square&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMiIgZmlsbD0iIzAwZWY4YiIvPjwvc3ZnPg==)
![Cadence](https://img.shields.io/badge/Cadence-1.0-00ef8b?style=flat-square)
![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react&logoColor=white)
![Claude AI](https://img.shields.io/badge/Claude_AI-Haiku_4.5-d97706?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-white?style=flat-square)

</div>

---

DeFi builders are forced to choose between compliance and usability. Add KYC and you kill the UX. Skip it and you can't operate legally. FlowShield makes them the same thing — users prove compliance with **zero-knowledge proofs**, and their identity data **never touches the blockchain**.

## Integrate in One Line

```cadence
import ComplianceAction from 0x93c691a98b975493

access(all) fun deposit(user: Address, amount: UFix64) {
    assert(ComplianceAction.verify(user), message: "Compliance required")
    // your deposit logic
}
```

That's it. No KYC forms, no identity storage, no compliance logic in your contract. FlowShield handles everything behind the scenes.

## Smart Contracts

All seven contracts are deployed on **Flow Testnet** at [`0x93c691a98b975493`](https://testnet.flowscan.io/account/0x93c691a98b975493).

| Contract | Purpose |
|---|---|
| **ComplianceCredential** | Cadence Resource stored in user accounts — credential ownership |
| **ZKVerifier** | Validates zero-knowledge proofs from trusted verifiers |
| **ComplianceAction** | Flow Actions primitive — compliance check + per-verification fee collection |
| **RuleEngine** | Per-jurisdiction rules (US, EU, UK, SG, CA) stored on-chain |
| **DemoLendingPool** | Reference lending pool with compliance-gated deposit and borrow |
| **ComplianceAgent** | Flow Agent for autonomous credential monitoring |
| **Governance** | Multi-sig M-of-N proposal system for admin operations |

## Flow Primitives

| Primitive | How FlowShield Uses It |
|---|---|
| **Flow Actions** | `ComplianceAction.verify()` as a composable pre-transaction check |
| **Cadence Resources** | Compliance credential lives in the user's account storage |
| **Flow Agents** | `ComplianceAgent` monitors wallets and flags expired credentials |
| **Scheduled Transactions** | Agent runs monitoring cycles on a recurring timer |
| **Sponsored Transactions** | Protocol pays gas — users pay nothing |
| **WebAuthn / Passkeys** | Biometric login creates a Flow account. No wallet, no seed phrase |

## Quick Start

```bash
# Clone
git clone https://github.com/Wilsawn/flowshield.git && cd flowshield

# Environment
cp .env.example .env
cp backend/.env.example backend/.env
# Fill in: CLAUDE_API_KEY, VERIFF_API_KEY, VERIFF_SHARED_SECRET (optional)

# Install all dependencies (npm workspaces)
npm install

# Run both frontend + backend
npm run dev
```

Or run separately:

```bash
npm run dev:frontend   # localhost:3000
npm run dev:backend    # localhost:3002
```

## Project Structure

```
flowshield/
├── backend/
│   ├── agents/            4 AI + rule-based agents
│   │   ├── builder-copilot.js      Claude AI chat + code scanning
│   │   ├── risk-scoring.js         Deterministic risk calculation
│   │   ├── anomaly-monitor.js      Hybrid AI anomaly detection
│   │   ├── regulatory-radar.js     Hybrid AI compliance scanning
│   │   ├── orchestrator.js         A2A agent routing + chaining
│   │   ├── agent-cards.js          A2A agent metadata
│   │   └── a2a-task-manager.js     A2A task lifecycle
│   ├── api/
│   │   ├── server.js               Express entry point
│   │   └── routes/                 REST endpoints (10 route files)
│   ├── config/                     Static configuration (jurisdictions, rules)
│   ├── db/                         Database schema + RLS policies
│   └── lib/                        Middleware, crypto, Supabase, Flow signer
├── frontend/
│   └── src/
│       ├── components/             React UI (dashboard, copilot, radar, onboarding)
│       ├── components/dashboard/   Dashboard sub-components
│       ├── components/ui/          Reusable primitives (button, card, badge)
│       ├── hooks/                  Data hooks (chain, dashboard, risk, compliance)
│       ├── lib/                    API client, auth utils, Supabase client
│       ├── pages/                  Route pages (landing, dashboard, copilot)
│       └── utils/                  FCL config, ZK proof helpers
├── cadence/
│   ├── contracts/        7 Cadence smart contracts (deployed to testnet)
│   ├── transactions/     State-changing ops (verify_and_mint, deposit, revoke)
│   ├── scripts/          Read-only queries (check_compliance, get_risk_score)
│   └── tests/            Contract test suites
├── evm/
│   ├── contracts/        Solidity Groth16 verifier for FlowEVM
│   └── circuits/         circom ZK circuit for compliance proof generation
├── docs/                 Architecture deep-dive + demo guide
└── scripts/              Deployment scripts
```

## API

**Public endpoints:**

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Server health and network info |
| `GET` | `/api/compliance/status/:address` | Compliance status from Flow testnet |
| `GET` | `/api/compliance/rules/:jurisdiction` | On-chain jurisdiction rules |
| `POST` | `/api/risk/score` | Risk score for any Flow address |
| `POST` | `/api/risk/monitor` | Anomaly detection for an address |
| `POST` | `/api/accounts/create` | Create custodial wallet (passkey onboarding) |
| `POST` | `/api/accounts/login` | Session token login |

**Authenticated endpoints** (require Bearer token):

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/copilot/chat` | Builder Copilot AI assistant (rate-limited, injection-protected) |
| `POST` | `/api/copilot/scan-code` | Compliance code scanner |
| `GET` | `/api/copilot/conversations` | List saved conversations |
| `GET` | `/api/copilot/conversations/:id` | Get conversation with messages |
| `PATCH` | `/api/copilot/conversations/:id` | Rename conversation |
| `DELETE` | `/api/copilot/conversations/:id` | Delete conversation |
| `POST` | `/api/copilot/radar/scan` | Regulatory Radar — scan on-chain rules |
| `POST` | `/api/copilot/radar/approve` | Push approved rule fixes on-chain |

**A2A (Agent-to-Agent) protocol:**

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/.well-known/agent.json` | A2A discovery document |
| `GET` | `/api/a2a/agents` | List all 4 agent cards |
| `GET` | `/api/a2a/agents/:id` | Get single agent card |
| `POST` | `/api/a2a/tasks` | Submit task to an agent |
| `GET` | `/api/a2a/tasks/:id` | Get task status and result |
| `GET` | `/api/a2a/chains` | List predefined multi-agent chains |
| `POST` | `/api/a2a/chains` | Execute a chain (e.g. `full-risk-review`) |

## Architecture

```
┌──────────────────────────────────────────────────┐
│  User Experience                                 │
│  React 19 · Vite · TailwindCSS · FCL Wallet      │
├──────────────────────────────────────────────────┤
│  A2A Protocol (Agent-to-Agent)                   │
│  Orchestrator · Task Manager · Agent Cards       │
│  Predefined chains: full-risk-review,            │
│  compliance-review                               │
├──────────────────────────────────────────────────┤
│  AI Agents (4 specialized)                       │
│  Builder Copilot · Risk Scoring                  │
│  Anomaly Monitor · Regulatory Radar              │
├──────────────────────────────────────────────────┤
│  Compliance Engine (On-Chain Cadence)            │
│  7 contracts · Fee treasury · Multi-sig gov      │
├──────────────────────────────────────────────────┤
│  Zero-Knowledge Verification (Cross-VM)          │
│  circom → snarkjs (browser) → FlowEVM Groth16    │
└──────────────────────────────────────────────────┘
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full technical deep-dive.

## Tech Stack

| Layer | Technologies |
|---|---|
| **Blockchain** | Flow Testnet, Cadence 1.0, FCL, FlowEVM |
| **Smart Contracts** | 7 Cadence + 1 Solidity (Groth16 verifier) |
| **ZK Proofs** | circom circuits, snarkjs, Groth16/BN256 pairing |
| **Frontend** | React 19, Vite, TailwindCSS, Framer Motion, React Flow |
| **Backend** | Node.js, Express, A2A protocol, prompt injection protection |
| **AI** | Claude AI (Haiku 4.5) — 4 agents with orchestration + chaining |
| **Identity** | Veriff KYC, WebAuthn/Passkeys, Zero-Knowledge Proofs |
| **Infrastructure** | Supabase (database + auth), Railway (backend), Netlify (frontend) |

## Design Principle

> Identity data **never** exists on-chain. Only math proofs and boolean results. The blockchain knows you're compliant, but not who you are.

## License

MIT
