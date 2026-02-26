# FlowShield Architecture

## Core Principle

**Identity data never exists on-chain.** Only zero-knowledge proofs and boolean compliance results are stored. This preserves user privacy while enabling full regulatory compliance.

## 4-Layer System

### Layer 1: User Experience
**Stack:** React + Vite + TailwindCSS + Framer Motion

- Passkey/WebAuthn onboarding (no passwords, no seed phrases)
- Consumer verification flow (biometric → ZK proof → credential)
- Operator dashboard (compliance overview, rule management)
- Responsive landing page with animated stats

### Layer 2: Compliance Engine (On-Chain Cadence)
**Deployed:** `0x93c691a98b975493` on Flow Testnet

| Contract | Role | Key Function |
|---|---|---|
| **ComplianceCredential** | Cadence Resource stored in user accounts | `isValid()`, `isExpired()`, `getTier()` |
| **ComplianceAction** | Flow Actions primitive for DeFi integration | `verify(addr)`, `verifyFull(addr)` |
| **ZKVerifier** | Validates ZK proofs from trusted verifiers | `verifyProof(proofData, userAddr)` |
| **RuleEngine** | Stores jurisdiction-specific rules on-chain | `getRules(jurisdiction)`, admin `setRule()` |
| **DemoLendingPool** | Reference DeFi integration | `deposit()` + `borrow()` with compliance |
| **ComplianceAgent** | Flow Agent for autonomous monitoring | `runMonitoringCycle()` via Scheduled Txns |

**Data flow:**
```
User → WebAuthn → ZK Proof → ZKVerifier.verifyProof()
     → ComplianceCredential.mint() → stored in user account
     → DeFi protocol calls ComplianceAction.verify(user)
     → Boolean result (no identity data exposed)
```

### Layer 3: Zero-Knowledge Verification

- **Client-side proof generation** — user's identity provider creates ZK proof locally
- **On-chain verification** — `ZKVerifier` validates proof structure, freshness, and trusted source
- **Proof hash only** — SHA3-256 hash stored on credential, not the proof itself
- **Trusted verifier registry** — admin-managed list of approved identity providers

### Layer 4: AI Intelligence (Off-Chain)
**Stack:** Express.js + Claude API + FCL

| Agent | Type | Function |
|---|---|---|
| **Risk Scoring** | Rule-based (no LLM) | 8 risk factors, reads real Flow chain data via FCL |
| **Anomaly Monitor** | Rule-based (no LLM) | 8 anomaly types, post-verification behavioral monitoring |
| **Builder Copilot** | Claude API + fallbacks | AI assistant for developers integrating FlowShield |
| **Regulatory Radar** | Claude API + fallbacks | Parses regulatory text → on-chain rule updates |

## Flow Primitives Integration

### Flow Actions
`ComplianceAction` implements the Flow Actions pattern — any DeFi protocol imports it and calls `verify()` or `verifyFull()` as a composable pre-condition.

### Scheduled Transactions
`ComplianceAgent.runMonitoringCycle()` is designed to be called by a Scheduled Transaction on a recurring timer, checking all monitored wallets for expired credentials.

### Flow Agents
The `Agent` resource lives in the protocol operator's account and autonomously monitors wallet compliance, emitting events when re-verification is needed.

### Sponsored Transactions
The `verify_and_mint.cdc` transaction uses two signers — the protocol account pays gas while the user just signs with their passkey.

### Cadence Resources
`Credential` is a Cadence Resource that lives in the user's account storage, not in a central registry. The user owns their compliance credential.

### WebAuthn / Passkeys
Frontend uses WebAuthn for passwordless authentication. No seed phrases, no browser extensions — just biometrics.

## API Architecture

```
Frontend (port 3001)
    ↓ HTTP
Backend API (port 3002)
    ├── /api/compliance/* → FCL → Flow Testnet (real chain queries)
    ├── /api/risk/*       → Risk Scoring Agent → FCL → Flow Testnet
    ├── /api/copilot/*    → Builder Copilot Agent → Claude API
    └── /api/radar/*      → Regulatory Radar Agent → Claude API
```

All compliance endpoints query **real on-chain data** from the deployed contracts. Risk scoring reads actual account balances, key counts, and contract deployments from the Flow Access API.
