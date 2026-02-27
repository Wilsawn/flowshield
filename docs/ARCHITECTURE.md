# Architecture

> **Identity data never exists on-chain.** Only zero-knowledge proofs and boolean compliance results are stored.

---

## System Overview

FlowShield is a four-layer system. The top two layers face users and developers. The bottom two handle verification and intelligence without exposing personal data.

```
┌──────────────────────────────────────────────────────────┐
│  User Experience Layer                                   │
│  Passkey onboarding · Dashboard · Copilot · Radar        │
├──────────────────────────────────────────────────────────┤
│  Compliance Engine (On-Chain Cadence)                    │
│  6 smart contracts at 0x93c691a98b975493                 │
├──────────────────────────────────────────────────────────|
│  Zero-Knowledge Verification                             │
│  Client-side proof generation → on-chain boolean result  │
├──────────────────────────────────────────────────────────┤
│  AI Intelligence (Off-Chain)                             │
│  Risk scoring · Anomaly detection · Copilot · Radar      │
└──────────────────────────────────────────────────────────┘
```

---

## Layer 1 — User Experience

**Stack:** React 19, Vite, TailwindCSS, Framer Motion, React Flow

| Surface | What It Does |
|---|---|
| **Landing page** | Product overview with interactive React Flow canvas |
| **Passkey onboarding** | WebAuthn biometric login → Flow account creation → ZK credential |
| **User dashboard** | Lending pool, risk score, jurisdiction picker, live chain data |
| **Builder Copilot** | AI chat for compliance questions and Cadence code generation |
| **Regulatory Radar** | Scan on-chain rules against real regulations, push fixes |
| **Operator dashboard** | Protocol-level compliance stats, audit trail, rule management |

---

## Layer 2 — Compliance Engine

All contracts are deployed on **Flow Testnet** at [`0x93c691a98b975493`](https://testnet.flowscan.io/account/0x93c691a98b975493).

| Contract | Role | Key Functions |
|---|---|---|
| **ComplianceCredential** | Cadence Resource in user accounts | `isValid()`, `isExpired()`, `getTier()` |
| **ComplianceAction** | Flow Actions pre-transaction check | `verify(addr)`, `verifyFull(addr)` |
| **ZKVerifier** | Validates ZK proofs from trusted verifiers | `verifyProof(proofData, userAddr)` |
| **RuleEngine** | Per-jurisdiction rules on-chain | `getRules(jurisdiction)`, `setRule()` |
| **DemoLendingPool** | Reference DeFi integration | `deposit()`, `borrow()` with compliance gates |
| **ComplianceAgent** | Flow Agent for autonomous monitoring | `runMonitoringCycle()` |

### Data Flow

```
User → WebAuthn → ZK Proof generated client-side
     → ZKVerifier.verifyProof() validates proof on-chain
     → ComplianceCredential minted → stored in user's account
     → DeFi protocol calls ComplianceAction.verify(user)
     → Returns boolean (no identity data exposed)
```

---

## Layer 3 — Zero-Knowledge Verification

The ZK layer ensures that **no identity data ever reaches the blockchain**. Only a boolean result and a proof hash are stored.

| Step | Where It Happens | What's Stored |
|---|---|---|
| Identity verification | Off-chain (Veriff KYC) | Nothing on-chain |
| Proof generation | Client-side (`snarkjs`) | Nothing on-chain |
| Proof verification | FlowEVM `Groth16Verifier` | SHA3-256 hash of proof |
| Compliance result | Cadence `ComplianceCredential` | Boolean + expiry timestamp |

### Cross-VM Bridge: Cadence → FlowEVM

Cadence does not natively support ZK-SNARK pairing operations. FlowShield solves this by deploying a **Groth16 verifier in Solidity on FlowEVM** and calling it from Cadence via a **Cadence-Owned Account (COA)**:

```
Cadence ZKVerifier
    │
    ▼ COA.call()
FlowEVM Groth16Verifier.verifyProof()
    │  Uses BN256 precompiles (ecAdd 0x06, ecMul 0x07, ecPairing 0x08)
    ▼
Returns boolean → Cadence mints ComplianceCredential
```

The Solidity verifier (`evm/contracts/Groth16Verifier.sol`) implements the full Groth16 pairing equation using the BN256 precompiles available on FlowEVM. The Cadence transaction (`cadence/transactions/verify_zk_via_evm.cdc`) ABI-encodes proof parameters and calls the Solidity contract through a COA.

**Why this matters:** This is a real cross-VM ZK verification pipeline — proofs are generated client-side with `snarkjs`, verified on FlowEVM using elliptic curve pairings, and the boolean result is consumed by Cadence to mint a compliance credential. Identity data never touches either VM.

---

## Layer 4 — AI Intelligence

**Stack:** Express.js, Claude AI (Haiku 4.5), FCL

| Agent | Type | Purpose |
|---|---|---|
| **Risk Scoring** | Rule-based, no LLM | 8 factors scored from real Flow chain data via FCL |
| **Anomaly Monitor** | Rule-based, no LLM | 8 anomaly types, post-verification behavioral analysis |
| **Builder Copilot** | Claude API + fallbacks | Answers compliance questions, generates Cadence code |
| **Regulatory Radar** | Deterministic + Claude | Scans on-chain rules against jurisdiction checklists |

### Regulatory Radar Architecture

The Radar uses a **hybrid deterministic + AI** approach based on [Microsoft AI Agent Orchestration Patterns](https://www.microsoft.com/en-us/research/):

1. **Deterministic checklist** defines exact required values per jurisdiction (US, EU, UK, SG, CA)
2. **`detectGaps()`** compares on-chain RuleEngine rules against the checklist — same input always produces same output
3. **`enrichWithClaude()`** sends deterministic gaps to Claude, which **only improves descriptions** with regulatory context — Claude cannot add or remove gaps

Fix a rule on-chain → the gap disappears on next scan. No randomness, no hallucination risk.

---

## Flow Primitives

### Flow Actions

`ComplianceAction` is a composable pre-transaction check. Any DeFi protocol imports it and calls `verify()` before financial operations:

```cadence
// In any transaction:
let isCompliant = ComplianceAction.verify(acct.address)
assert(isCompliant, message: "Not compliant")
// ...then proceed with deposit, borrow, swap
```

### Cadence Resources

`Credential` is a Cadence Resource stored in the user's account at `/storage/FlowShieldCredential`. Any contract can read the public capability — no extra transaction needed from the user.

### Flow Agents

The `ComplianceAgent` resource lives in the protocol operator's account. It monitors wallets autonomously and emits events when re-verification is needed.

### Scheduled Transactions

`ComplianceAgent.runMonitoringCycle()` is called by a Scheduled Transaction on a recurring timer. Each execution can schedule the next one for continuous monitoring.

### Sponsored Transactions

`verify_and_mint.cdc` uses two signers — the protocol account pays gas while the user signs with their passkey. Users never see a gas fee.

### WebAuthn / Passkeys

Frontend uses the Web Authentication API for passwordless biometric login. No seed phrases, no browser extensions. A Flow account is created in the background.

---

## API Architecture

```
Frontend (localhost:3001)
    │
    ▼ HTTP
Backend API (localhost:3002)
    ├── /api/compliance/*     → FCL → Flow Testnet (real chain queries)
    ├── /api/risk/*           → Risk Scoring Agent → FCL → Flow Testnet
    ├── /api/copilot/chat     → Builder Copilot → Claude API
    └── /api/copilot/radar/*  → Regulatory Radar → Claude API + FCL
```

All compliance endpoints query **real on-chain data** from deployed contracts. Risk scoring reads actual account balances, key counts, and contract deployments from the Flow Access API.
