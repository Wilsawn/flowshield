# FlowShield Architecture

## System Overview

FlowShield is a four-layer system. Each layer is independent but composable. The key design principle is that **identity data never touches the blockchain** — only cryptographic proofs do.

```
┌─────────────────────────────────────────────────────────┐
│                   LAYER 1: USER EXPERIENCE              │
│                                                         │
│  WebAuthn Passkey Onboarding                            │
│  Consumer DeFi Interface (deposit, borrow, etc.)        │
│  Protocol Operator Dashboard                            │
│                                                         │
│  → All compliance friction is invisible to end users    │
│  → Sponsored gas: users never pay for compliance txs    │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│          LAYER 2: COMPLIANCE ENGINE (ON-CHAIN)          │
│                                                         │
│  ComplianceCredential.cdc — Cadence resource            │
│    → Minted into user's account after ZK verification   │
│    → Non-duplicable, expirable, revocable               │
│    → Any protocol can check via public capability       │
│                                                         │
│  ComplianceAction.cdc — Flow Actions primitive          │
│    → Composable step in any DeFi workflow               │
│    → verify() or verifyFull() before financial ops      │
│                                                         │
│  ComplianceAgent.cdc — Flow Agent                       │
│    → Lives in protocol's account                        │
│    → Runs monitoring via Scheduled Transactions         │
│    → Checks expiry, triggers re-verification            │
│                                                         │
│  RuleEngine.cdc — Configurable policy rules             │
│    → Jurisdiction-specific parameters                   │
│    → Updated by AI Regulatory Radar agent               │
│                                                         │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│        LAYER 3: ZERO-KNOWLEDGE VERIFICATION             │
│                                                         │
│  ZKVerifier.cdc — On-chain proof verification           │
│    → Validates ZK proofs mathematically                 │
│    → Confirms "user passed KYC" without identity data   │
│                                                         │
│  Client-Side Proof Generation                           │
│    → Runs in user's browser/device                      │
│    → Takes credential from trusted verifier             │
│    → Outputs ZK proof (no identity in the proof)        │
│                                                         │
│  Trusted Verifier Bridge                                │
│    → Off-chain regulated KYC provider                   │
│    → Performs actual identity verification              │
│    → Issues verifiable credential to user               │
│    → FlowShield never stores this data                  │
│                                                         │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│          LAYER 4: AI INTELLIGENCE (OFF-CHAIN)           │
│                                                         │
│  Regulatory Radar (Claude API)                          │
│    → Monitors global regulatory feeds                   │
│    → Translates law changes to machine-readable rules   │
│    → Pushes updates to on-chain RuleEngine              │
│                                                         │
│  Risk Scoring Engine (rule-based, no API needed)        │
│    → Analyzes public on-chain Flow data                 │
│    → Transaction patterns, flagged contracts, volume    │
│    → Assigns risk tiers (0-100 score)                   │
│                                                         │
│  Builder Copilot (Claude API)                           │
│    → Conversational AI for developers                   │
│    → Generates compliance config + Cadence code         │
│                                                         │
│  Anomaly Monitor (rule-based, no API needed)            │
│    → Post-verification behavioral monitoring            │
│    → Flags suspicious wallet patterns                   │
│    → Triggers re-verification via ComplianceAgent       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Data Flow: What Goes Where

| On-Chain (Public) | Client-Side (Private) | Off-Chain Services |
|---|---|---|
| ZK proof verification results | ZK proof generation | Initial KYC verification |
| Compliance credential (resource) | Verifiable credential storage | AI regulatory monitoring |
| Risk tier (numeric score) | User's passkey / private key | AI risk analysis |
| Policy rules (parameters) | | Builder Copilot LLM |
| Audit logs (no PII) | | |
| **NEVER: names, addresses, IDs, documents** | User controls their own data | Regulated KYC provider handles identity |

## Key Principle

The entire system is designed around one rule: **identity data never exists on-chain.** The blockchain only ever sees mathematical proofs and boolean results. There is nothing to breach, nothing to subpoena, and nothing that violates GDPR. The protocol can tell regulators "yes, we checked" without holding any data that creates liability.
