# Demo Guide

**Duration:** 3–5 minutes
**Prerequisites:** Frontend on `localhost:3001`, backend on `localhost:3002`

---

## The Pitch

> What happens when a regulator sends your DeFi protocol a letter? Right now, you either block users or expose their data. FlowShield makes compliance invisible — identity data never touches the blockchain.

---

## What We Built

| Feature | What It Does |
|---|---|
| **Passkey Onboarding** | Email + fingerprint → Flow account created, KYC via Veriff, ZK credential minted. No wallet, no seed phrase, no gas fees. |
| **User Dashboard** | Live lending pool (deposit/borrow), real-time Flow testnet data, risk scoring, jurisdiction picker (US, EU, UK, SG, CA). |
| **Builder Copilot** | AI assistant powered by Claude. Ask compliance questions in plain English, get Cadence code back. |
| **Regulatory Radar** | AI scans on-chain rules against real regulations (MiCA, FATF, FinCEN). Finds gaps, operator approves fixes, rules update on-chain. |
| **Operator Dashboard** | Protocol-level view of compliance stats, audit trail, and jurisdiction rules — zero personal data visible. |

---

## Demo Flow

### 1. Landing Page (15 sec)

Open the landing page. Scroll through the interactive canvas showing how all components connect. Point out the integration code example — one line of Cadence.

### 2. User Onboarding (60 sec)

1. Click **"Launch Dashboard"** → triggers onboarding for new users
2. Enter an email → click **Continue**
3. Select **United States** → click **Continue**
4. Touch ID / fingerprint prompt → authenticate
5. Watch the verification steps animate:
   - Creating secure account on Flow
   - Setting up passkey authentication
   - Running ZK background verification
   - Issuing compliance credential
6. Click **"Go to Dashboard"**

**Say:** "The user just onboarded with a fingerprint. No seed phrase, no wallet extension, no KYC form. Compliance happened invisibly using zero-knowledge proofs."

### 3. Dashboard (45 sec)

1. Point out the **Flow Testnet · LIVE** badge — all data is real
2. Show the stat cards: wallet balance, risk score, deposited, borrowed
3. Deposit some USDC into the lending pool
4. Show the compliance layer: credential status, on-chain rules, deployed contracts
5. Click the **Flowscan link** — "These are our 6 real Cadence contracts on Flow testnet."

### 4. Jurisdiction Change (45 sec)

1. Click the jurisdiction dropdown → switch from **US** to **EU**
2. Watch the re-verification:
   - Queries RuleEngine for EU rules
   - Shows different travel rule threshold (€1,000 vs $3,000)
   - Re-evaluates risk score
   - Confirms compliance under MiCA
3. Show the regulation source link → opens actual MiCA text on EUR-Lex

**Say:** "The user moved from the US to the EU. FlowShield detected different regulations apply, queried the on-chain rule engine, and re-verified automatically. No form, no wait, no data exposed."

### 5. Builder Copilot (30 sec)

1. Navigate to **Copilot** in the sidebar
2. Type: "Does my Cadence contract handle the travel rule for EU users?"
3. Show the AI response with compliance config and Cadence code

**Say:** "A developer configures compliance in plain English. The copilot outputs the exact Cadence code to integrate FlowShield."

### 6. Regulatory Radar (30 sec)

1. Navigate to **Operator** → open **Regulatory Radar**
2. Click **Start AI Scan** → watch it scan on-chain rules
3. Show the EU gaps (travel rule threshold, re-verification period)
4. Click **Approve Fix** → push the fix on-chain

**Say:** "The AI found that our on-chain rules don't match EU's MiCA regulation. The operator approves the fix and it updates the RuleEngine contract directly."

### 7. Closing (15 sec)

> FlowShield uses six Flow primitives: Flow Actions, Cadence Resources, Flow Agents, Scheduled Transactions, Sponsored Transactions, and WebAuthn Passkeys. We're not competing with other DeFi projects — we're the compliance layer that makes them all possible. Identity data never exists on-chain. Only math proofs and boolean results.

---

## Technologies

| Category | Technologies |
|---|---|
| **Blockchain** | Flow Testnet, Cadence 1.0, FCL |
| **Smart Contracts** | ComplianceCredential, ZKVerifier, ComplianceAction, RuleEngine, DemoLendingPool, ComplianceAgent |
| **Frontend** | React 19, Vite, TailwindCSS, Framer Motion, React Flow |
| **Backend** | Node.js, Express |
| **AI** | Claude AI (Haiku 4.5) — Builder Copilot + Regulatory Radar |
| **Identity** | Veriff KYC, WebAuthn/Passkeys, Zero-Knowledge Proofs |
| **Infrastructure** | Supabase (audit trail), Vercel |

---

## Backup Plan

If the live demo fails:

- Have a screen recording ready
- Have Flowscan open showing the deployed contracts
- Run API calls directly:

```bash
curl http://localhost:3002/health
curl http://localhost:3002/api/compliance/rules/US
curl http://localhost:3002/api/compliance/rules/EU
```

---

## Likely Questions

| Question | Answer |
|---|---|
| "Is this actually on-chain?" | Yes — 6 contracts on Flow testnet at `0x93c691a98b975493`. Click the Flowscan link to verify. |
| "How is this different from zkMe/zkPass?" | Those are identity-only. FlowShield is full-stack compliance infrastructure — credentials, rule engine, autonomous monitoring, and one-line DeFi integration via Flow Actions. |
| "What's the gas cost?" | Zero for users. We use Flow's Sponsored Transactions — the protocol pays. |
| "Can this work cross-chain?" | The ZK verification layer is portable. The Cadence contracts are Flow-native, but the architecture supports FlowEVM bridging. |
| "What about jurisdictions that don't accept ZK proofs?" | FlowShield stores the compliance result (boolean), not the proof method. Regulators see "verified: true" — the ZK proof is the mechanism, not the output. |
