# FlowShield

**Privacy-preserving compliance infrastructure for DeFi on Flow.**

FlowShield lets DeFi protocols add regulatory compliance with a single Cadence import — no user data ever touches the blockchain. Users verify once via WebAuthn + ZK proofs, receive an on-chain credential, and interact with any integrated protocol seamlessly.

## Live on Flow Testnet

All contracts deployed at **`0x93c691a98b975493`**

| Contract | Purpose |
|---|---|
| ComplianceCredential | On-chain credential resource stored in user accounts |
| ZKVerifier | Zero-knowledge proof verification |
| ComplianceAction | One-line compliance check for DeFi integration |
| RuleEngine | Jurisdiction rules (US, EU, UK, SG, CA) |
| DemoLendingPool | Reference DeFi integration |
| ComplianceAgent | Autonomous monitoring via Flow Agents |

Verify: [Flowscan](https://testnet.flowscan.io/account/0x93c691a98b975493)

## Integrate in One Line

```cadence
import ComplianceAction from 0x93c691a98b975493

access(all) fun deposit(user: Address, amount: UFix64) {
    assert(ComplianceAction.verify(user), message: "Compliance required")
    // your deposit logic
}
```

## Quick Start

```bash
# 1. Clone
git clone https://github.com/your-org/flowshield && cd flowshield

# 2. Frontend
cd frontend && npm install && npm run dev

# 3. Backend API (new terminal)
cd backend && npm install && npm run dev

# 4. Deploy contracts (if needed)
flow project deploy --network testnet --update
```

## Project Structure

```
cadence/
  contracts/          6 Cadence smart contracts (deployed to testnet)
  scripts/            Read-only queries (check_compliance, get_risk_score)
  transactions/       State-changing ops (verify_and_mint, deposit, revoke)
  tests/              Contract test suites
backend/
  agents/
    risk-scoring.js   Rule-based risk analysis (reads Flow chain data)
    anomaly-monitor.js Post-verification behavioral monitoring
    builder-copilot.js AI developer assistant (Claude API + fallbacks)
    regulatory-radar.js Regulatory text → on-chain rule updates
  api/
    server.js         Express server connected to Flow testnet via FCL
    routes/           REST API endpoints
frontend/
  src/
    components/       React UI (landing, dashboard, compliance views)
    hooks/            useCompliance, useRiskScore (connected to backend)
    pages/            Page routes
docs/                 Architecture docs, contract addresses
scripts/              Deployment scripts
```

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Server health + network info |
| GET | `/api/compliance/status/:address` | Compliance status from Flow testnet |
| GET | `/api/compliance/rules/:jurisdiction` | On-chain jurisdiction rules |
| GET | `/api/compliance/pool` | DemoLendingPool stats |
| POST | `/api/risk/score` | Risk score for any Flow address |
| GET | `/api/risk/factors` | All risk factors + tier definitions |
| POST | `/api/risk/monitor` | Anomaly detection for an address |
| POST | `/api/copilot/chat` | Builder Copilot AI assistant |
| GET | `/api/copilot/radar/scenarios` | Regulatory change demo scenarios |
| POST | `/api/copilot/radar/simulate` | Simulate a regulatory change |

## Flow Primitives Used

- **Flow Actions** — `ComplianceAction.verify()` composable compliance check
- **Cadence Resources** — `Credential` resource lives in user accounts
- **Flow Agents** — `ComplianceAgent` monitors wallets autonomously
- **Scheduled Transactions** — Agent runs monitoring cycles on a timer
- **Sponsored Transactions** — Protocol pays gas, user pays nothing
- **WebAuthn / Passkeys** — Passwordless biometric onboarding

## Architecture

```
┌─────────────────────────────────────────────────┐
│  Layer 1: User Experience                       │
│  React + Vite + TailwindCSS + Framer Motion     │
├─────────────────────────────────────────────────┤
│  Layer 2: Compliance Engine (On-Chain Cadence)  │
│  ComplianceCredential → ComplianceAction        │
│  RuleEngine → DemoLendingPool                   │
│  ZKVerifier → ComplianceAgent                   │
├─────────────────────────────────────────────────┤
│  Layer 3: Zero-Knowledge Verification           │
│  Client-side proof gen → On-chain ZK verify     │
│  Identity data NEVER on-chain                   │
├─────────────────────────────────────────────────┤
│  Layer 4: AI Intelligence (Off-Chain)           │
│  Risk Scoring │ Anomaly Monitor │Builder Copilot|
│  Regulatory Radar                               │
└─────────────────────────────────────────────────┘
```

## Key Design Principle

> Identity data **never** exists on-chain. Only math proofs and boolean results.

## License

MIT
