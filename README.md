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

All six contracts are deployed on **Flow Testnet** at [`0x93c691a98b975493`](https://testnet.flowscan.io/account/0x93c691a98b975493).

| Contract | Purpose |
|---|---|
| **ComplianceCredential** | Cadence Resource stored in user accounts — credential ownership |
| **ZKVerifier** | Validates zero-knowledge proofs from trusted verifiers |
| **ComplianceAction** | Flow Actions primitive — one-line compliance check for DeFi |
| **RuleEngine** | Per-jurisdiction rules (US, EU, UK, SG, CA) stored on-chain |
| **DemoLendingPool** | Reference lending pool with compliance-gated deposit and borrow |
| **ComplianceAgent** | Flow Agent for autonomous credential monitoring |

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

# Frontend (Terminal 1)
cd frontend && npm install && npm run dev

# Backend (Terminal 2)
cd backend && npm install && npm start
```

Frontend runs on `localhost:3001`, backend on `localhost:3002`.

## Project Structure

```
flowshield/
├── cadence/
│   ├── contracts/        6 Cadence smart contracts (deployed to testnet)
│   ├── scripts/          Read-only queries (check_compliance, get_risk_score)
│   ├── transactions/     State-changing ops (verify_and_mint, deposit, revoke)
│   └── tests/            Contract test suites
├── backend/
│   ├── agents/           AI + rule-based agents (risk, copilot, radar, anomaly)
│   ├── api/              Express server + REST routes
│   └── lib/              Supabase, middleware, demo state
├── frontend/
│   ├── src/components/   React UI (dashboard, copilot, radar, onboarding)
│   ├── src/hooks/        Data hooks (useChainData, useDashboardData, useRiskScore)
│   └── src/pages/        Route pages (landing, dashboard, copilot, operator)
├── docs/                 Architecture and demo guide
└── scripts/              Deployment scripts
```

## API

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Server health and network info |
| `GET` | `/api/compliance/status/:address` | Compliance status from Flow testnet |
| `GET` | `/api/compliance/rules/:jurisdiction` | On-chain jurisdiction rules |
| `POST` | `/api/risk/score` | Risk score for any Flow address |
| `POST` | `/api/risk/monitor` | Anomaly detection for an address |
| `POST` | `/api/copilot/chat` | Builder Copilot AI assistant |
| `POST` | `/api/copilot/radar/scan` | Regulatory Radar — scan on-chain rules |
| `POST` | `/api/copilot/radar/fix` | Push approved rule fixes on-chain |

## Architecture

```
┌──────────────────────────────────────────────────┐
│  User Experience                                  │
│  React · Vite · TailwindCSS · Framer Motion       │
├──────────────────────────────────────────────────┤
│  Compliance Engine (On-Chain Cadence)             │
│  ComplianceCredential · ComplianceAction          │
│  RuleEngine · DemoLendingPool · ComplianceAgent   │
├──────────────────────────────────────────────────┤
│  Zero-Knowledge Verification                      │
│  Client-side proof generation → On-chain verify   │
│  Identity data NEVER on-chain                     │
├──────────────────────────────────────────────────┤
│  AI Intelligence (Off-Chain)                      │
│  Risk Scoring · Anomaly Monitor                   │
│  Builder Copilot · Regulatory Radar               │
└──────────────────────────────────────────────────┘
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full technical deep-dive.

## Tech Stack

| Layer | Technologies |
|---|---|
| **Blockchain** | Flow Testnet, Cadence 1.0, FCL |
| **Frontend** | React 19, Vite, TailwindCSS, Framer Motion, React Flow |
| **Backend** | Node.js, Express |
| **AI** | Claude AI (Haiku 4.5) for Copilot and Regulatory Radar |
| **Identity** | Veriff KYC, WebAuthn/Passkeys, Zero-Knowledge Proofs |
| **Infrastructure** | Supabase (audit trail), Vercel (deployment) |

## Design Principle

> Identity data **never** exists on-chain. Only math proofs and boolean results. The blockchain knows you're compliant, but not who you are.

## License

MIT
