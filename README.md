# FlowShield

**Privacy-preserving compliance infrastructure for DeFi on Flow.**

FlowShield lets DeFi developers on Flow verify regulatory compliance using ZK proofs and AI auditing — without storing any personal data on-chain. Users verify through a trusted third party, generate a zero-knowledge proof locally, and receive a Cadence compliance credential that any protocol can check. No passports on-chain. No data liability. No compliance headaches.

---

## The Problem

DeFi builders have to choose between being compliant and being usable. Hiring a blockchain lawyer costs $50k+. Bolting on traditional KYC kills the user experience. Building it yourself takes months. Most teams skip compliance entirely — and that's a ticking time bomb with MiCA enforcing, US rules tightening, and FATF travel rule expanding.

## The Solution

A compliance layer that's invisible to users and drop-in for developers:

- **ZK-KYC at onboarding** — user signs up with a passkey, identity verification happens behind the scenes via zero-knowledge proofs. No data stored on-chain, ever.
- **Compliance Credential** — a Cadence resource minted into the user's account. Non-duplicable, expirable, revocable. Any DeFi protocol can check it.
- **Composable Compliance Action** — a Flow Actions primitive. One step to make any DeFi workflow compliant.
- **Compliance Agent** — a Flow Agent on Scheduled Transactions that handles ongoing monitoring autonomously.
- **AI-powered tools** — Regulatory Radar, Risk Scoring, Builder Copilot, Anomaly Monitor.

## Flow Primitives Used

| Primitive | How We Use It |
|-----------|---------------|
| Flow Actions | Composable Compliance Action primitive |
| Scheduled Transactions | Autonomous compliance monitoring |
| Flow Agents | On-chain compliance autopilot |
| WebAuthn / Passkeys | Walletless onboarding with invisible KYC |
| Cadence Resources | Compliance Credential in user accounts |
| Sponsored Transactions | Gas-free compliance for end users |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   LAYER 1: USER EXPERIENCE              │
│  Passkey Onboarding → Consumer UI → Operator Dashboard  │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│              LAYER 2: COMPLIANCE ENGINE (CADENCE)        │
│  Credential Resource → Compliance Action → Flow Agent    │
│                    → Rule Engine                         │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│           LAYER 3: ZERO-KNOWLEDGE VERIFICATION           │
│  ZK Verifier Contract → Client-Side Proof Generation     │
│              → Trusted Verifier Bridge                   │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│            LAYER 4: AI INTELLIGENCE (OFF-CHAIN)          │
│  Regulatory Radar → Risk Scoring → Builder Copilot       │
│                  → Anomaly Monitor                       │
└─────────────────────────────────────────────────────────┘
```

**Key principle:** Identity data never exists on-chain. The blockchain only sees mathematical proofs and boolean results.

---

## Project Structure

```
flowshield/
├── cadence/                    # On-chain smart contracts
│   ├── contracts/
│   │   ├── ComplianceCredential.cdc    # Credential resource
│   │   ├── ComplianceAction.cdc        # Flow Actions primitive
│   │   ├── ComplianceAgent.cdc         # Flow Agent for monitoring
│   │   ├── RuleEngine.cdc             # Configurable policy rules
│   │   ├── ZKVerifier.cdc             # ZK proof verification
│   │   └── DemoLendingPool.cdc        # Example DeFi integration
│   ├── scripts/                # Read-only blockchain queries
│   │   ├── check_compliance.cdc
│   │   ├── get_risk_score.cdc
│   │   └── get_credential_status.cdc
│   ├── transactions/           # State-changing operations
│   │   ├── verify_and_mint.cdc
│   │   ├── revoke_credential.cdc
│   │   ├── update_rules.cdc
│   │   └── deposit_with_compliance.cdc
│   └── tests/                  # Cadence test files
│       ├── ComplianceCredential_test.cdc
│       └── ComplianceAction_test.cdc
├── backend/                    # Off-chain services
│   ├── agents/
│   │   ├── regulatory-radar.js         # Monitors regulatory changes
│   │   ├── risk-scoring.js             # Wallet risk analysis
│   │   ├── builder-copilot.js          # AI dev assistant
│   │   └── anomaly-monitor.js          # Post-verification monitoring
│   ├── api/
│   │   ├── server.js                   # Express API server
│   │   └── routes/
│   │       ├── compliance.js
│   │       ├── copilot.js
│   │       └── risk.js
│   └── config/
│       ├── rules.json                  # Default compliance rules
│       └── jurisdictions.json          # Jurisdiction configurations
├── frontend/                   # User-facing application
│   ├── src/
│   │   ├── components/
│   │   │   ├── OnboardingFlow.jsx
│   │   │   ├── ComplianceBadge.jsx
│   │   │   ├── OperatorDashboard.jsx
│   │   │   └── BuilderCopilot.jsx
│   │   ├── hooks/
│   │   │   ├── useCompliance.js
│   │   │   └── useRiskScore.js
│   │   ├── pages/
│   │   │   ├── index.jsx
│   │   │   ├── dashboard.jsx
│   │   │   └── copilot.jsx
│   │   └── utils/
│   │       └── flow-config.js
│   └── public/
├── docs/
│   ├── ARCHITECTURE.md
│   ├── CONTRACTS.md
│   └── INTEGRATION.md
├── scripts/
│   ├── deploy.sh
│   └── setup-testnet.sh
├── flow.json                   # Flow project configuration
├── package.json
├── .gitignore
├── .env.example
└── LICENSE
```

---

## Getting Started

### Prerequisites

- [Flow CLI](https://developers.flow.com/tools/flow-cli) installed
- Node.js 18+
- npm or yarn

### Setup

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/flowshield.git
cd flowshield

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Add your Claude API key and Flow testnet account details to .env

# Start the Flow emulator
flow emulator start

# In a new terminal, deploy contracts
flow project deploy --network emulator

# Start the backend
cd backend && npm start

# Start the frontend
cd frontend && npm run dev
```

### Testnet Deployment

```bash
# Create a testnet account (if you don't have one)
flow accounts create --network testnet

# Deploy to testnet
flow project deploy --network testnet
```

---

## Deployed Contracts (Testnet)

| Contract | Address | Status |
|----------|---------|--------|
| ComplianceCredential | `TBD` | Pending |
| ComplianceAction | `TBD` | Pending |
| ComplianceAgent | `TBD` | Pending |
| RuleEngine | `TBD` | Pending |
| ZKVerifier | `TBD` | Pending |
| DemoLendingPool | `TBD` | Pending |

---

## How It Works

### For Users
1. Sign up with passkey (WebAuthn) — no seed phrases, no wallet setup
2. Identity verification happens invisibly via trusted third-party + ZK proof
3. Compliance Credential minted into your account
4. Use any DeFi app on Flow that integrates FlowShield — no extra steps

### For Developers
1. Import FlowShield's Compliance Action into your Flow Actions workflow
2. Configure jurisdiction rules via the Builder Copilot (or manually)
3. Compliance checks happen atomically within your existing transactions
4. Ongoing monitoring runs autonomously via Flow Agent + Scheduled Transactions

### For Regulators
- Protocol can prove compliance was checked
- No personal data stored on-chain to breach or subpoena
- Audit logs available without exposing user identity
- Credentials are revocable when required

---

## Compliance Tiers

| Tier | ZK Proof | Risk Level | Status | Re-verification |
|------|----------|------------|--------|-----------------|
| Compliant | ✅ Pass | Low | Full access | After set time period |
| Semi-compliant | ✅ Pass | Medium | Limited access | After AI re-assessment |
| Non-compliant | ✅ Pass | High | Blocked | Manual review required |
| Non-compliant | ❌ Fail | Any | Blocked | Must re-submit |

---

## AI Agents

| Agent | Type | What It Does |
|-------|------|-------------|
| Regulatory Radar | Off-chain (LLM) | Monitors law changes, auto-updates on-chain rules |
| Risk Scoring | Off-chain (rule-based) | Analyzes public chain data, assigns risk tiers |
| Builder Copilot | Off-chain (LLM) | Helps devs configure compliance in plain language |
| Anomaly Monitor | Off-chain (rule-based) | Flags suspicious post-verification wallet behavior |

---

## Tech Stack

- **Smart Contracts:** Cadence (Flow native) + Solidity (FlowEVM for ZK verification)
- **Frontend:** Next.js + @onflow/react-sdk
- **Backend:** Node.js + Express
- **AI:** Claude API (Sonnet 4.5) for Copilot and Regulatory Radar
- **ZK Proofs:** TBD (snarkjs / circom / noir — pending Flow compatibility testing)

---

## Team

| Name | Role |
|------|------|
| TBD | Team Lead / Research |
| TBD | Smart Contract Dev |
| TBD | AI / Backend Dev |
| TBD | Frontend Dev |

---

## Hackathon

Built for **Flow: The Future of Finance** hackathon.

**Prize Track:** Consumer DeFi on Flow ($10,000 pool)

---

## License

MIT
