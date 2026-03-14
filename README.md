<div align="center">

<img src="https://img.shields.io/badge/FlowShield-Compliance_Infrastructure-00ef8b?style=for-the-badge&labelColor=0d1117" alt="FlowShield" />

### Privacy-preserving compliance for DeFi on Flow.

Users prove compliance with zero-knowledge proofs. Identity never touches the chain.

[Live App](https://flowshield.netlify.app) &nbsp;·&nbsp; [Contracts on Flowscan](https://testnet.flowscan.io/account/0x93c691a98b975493) &nbsp;·&nbsp; [Architecture](docs/ARCHITECTURE.md) &nbsp;·&nbsp; [Setup Guide](docs/SETUP.md)

![Flow Testnet](https://img.shields.io/badge/Flow-Testnet-00ef8b?style=flat-square)
![Cadence 1.0](https://img.shields.io/badge/Cadence-1.0-00ef8b?style=flat-square)
![React 19](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-white?style=flat-square)

</div>

---

## The Problem

DeFi protocols need to verify users are compliant. The current options are bad: add KYC forms and kill the user experience, or skip compliance and get shut down by regulators. There's no middle ground.

FlowShield is the middle ground. One line of Cadence and your protocol is compliant — no identity data on-chain, no KYC forms, no user friction.

```cadence
import ComplianceAction from 0x93c691a98b975493

access(all) fun deposit(user: Address, amount: UFix64) {
    assert(ComplianceAction.verify(user), message: "Compliance required")
    // your deposit logic
}
```

## How It Works

1. User signs up with a fingerprint (WebAuthn passkey) — no wallet, no seed phrase
2. A zero-knowledge proof is generated client-side (circom + snarkjs)
3. The proof is verified on FlowEVM via a Solidity Groth16 verifier
4. The boolean result crosses back to Cadence through a Cadence-Owned Account
5. A `ComplianceCredential` resource is minted into the user's account storage

The blockchain knows the user is compliant. It never knows who they are.

## Smart Contracts

Seven contracts deployed on Flow Testnet at [`0x93c691a98b975493`](https://testnet.flowscan.io/account/0x93c691a98b975493):

| Contract | What it does |
|---|---|
| `ComplianceCredential` | Resource stored in user accounts — credential ownership and expiry |
| `ZKVerifier` | Validates zero-knowledge proofs from registered verifiers |
| `ComplianceAction` | Flow Action — composable compliance gate with per-verification fees |
| `RuleEngine` | Per-jurisdiction compliance rules (US, EU, UK, SG, CA) stored on-chain |
| `DemoLendingPool` | Reference lending pool with compliance-gated deposit and borrow |
| `ComplianceAgent` | Autonomous agent that monitors wallets and flags expired credentials |
| `Governance` | Multi-sig M-of-N proposal system for admin operations |

## Flow Primitives

| Primitive | Usage |
|---|---|
| **Actions** | `ComplianceAction.verify()` — composable pre-transaction compliance check |
| **Resources** | Credentials live in the user's own account storage |
| **Agents** | `ComplianceAgent` monitors wallets, emits events for re-verification |
| **Scheduled Transactions** | Monitoring cycles run on a recurring timer |
| **Sponsored Transactions** | Protocol pays gas — users pay nothing |
| **Passkeys** | Biometric login creates a real Flow account in seconds |

## AI Agents

Four specialized agents, orchestrated through a [Google A2A-style protocol](https://google.github.io/A2A/):

| Agent | Type | What it does |
|---|---|---|
| **Risk Scoring** | Deterministic | 8 rule-based factors from public chain data. No LLM. |
| **Anomaly Monitor** | Hybrid | Deterministic detection + Claude AI context enrichment |
| **Regulatory Radar** | Hybrid | Scans on-chain rules against 5 jurisdiction checklists, Claude adds regulatory context |
| **Builder Copilot** | AI | Claude-powered assistant for compliance code and integration questions |

Agent discovery: `GET /.well-known/agent.json`

## Quick Start

```bash
git clone https://github.com/Wilsawn/flowshield.git && cd flowshield

cp .env.example .env
cp backend/.env.example backend/.env
# Fill in: ANTHROPIC_API_KEY (required for AI agents)

npm install
npm run dev
```

Frontend runs on `localhost:3000`, backend on `localhost:3002`.

## Tech Stack

| Layer | Technologies |
|---|---|
| **Blockchain** | Flow Testnet, Cadence 1.0, FCL, FlowEVM |
| **Smart Contracts** | 7 Cadence + 1 Solidity (Groth16 verifier) |
| **ZK Proofs** | circom circuits, snarkjs, Groth16 / BN256 pairing |
| **Frontend** | React 19, Vite, TailwindCSS, Framer Motion |
| **Backend** | Node.js, Express, A2A protocol |
| **AI** | Claude Haiku 4.5 — 4 agents with orchestration and chaining |
| **Auth** | WebAuthn / Passkeys, Google OAuth, Veriff KYC |
| **Infrastructure** | Supabase, Railway, Netlify |

## Project Structure

```
flowshield/
├── frontend/           React 19 / Vite / Tailwind
├── backend/
│   ├── agents/         4 AI + rule-based agents
│   ├── api/            Express server + 12 route files
│   └── lib/            Auth, crypto, Flow signer, Supabase
├── cadence/
│   ├── contracts/      7 Cadence smart contracts
│   ├── transactions/   State-changing operations
│   └── scripts/        Read-only queries
├── evm/
│   ├── contracts/      Solidity Groth16 verifier
│   └── circuits/       circom ZK circuit
└── docs/               Architecture, setup guide
```

## API

Full API documentation is in the [Architecture docs](docs/ARCHITECTURE.md). Key endpoints:

```
GET   /health                          Server status
GET   /api/compliance/status/:address  On-chain compliance status
GET   /api/compliance/rules/:jur       Jurisdiction rules
POST  /api/risk/score                  Risk score for any Flow address
POST  /api/accounts/create             Custodial account creation
POST  /api/copilot/chat                Builder Copilot (auth required)
POST  /api/copilot/radar/scan          Regulatory Radar (auth required)
GET   /.well-known/agent.json          A2A agent discovery
```

## Architecture

```
┌─────────────────────────────────────────────┐
│  User Experience                            │
│  React 19 · Vite · TailwindCSS · Passkeys  │
├─────────────────────────────────────────────┤
│  A2A Protocol                               │
│  Orchestrator · Task Manager · Agent Cards  │
├─────────────────────────────────────────────┤
│  AI Agents                                  │
│  Risk · Anomaly · Radar · Copilot           │
├─────────────────────────────────────────────┤
│  Compliance Engine (On-Chain)               │
│  7 Cadence contracts · Fee treasury · Gov   │
├─────────────────────────────────────────────┤
│  Zero-Knowledge Verification (Cross-VM)     │
│  circom → snarkjs → FlowEVM Groth16        │
└─────────────────────────────────────────────┘
```

## License

MIT
