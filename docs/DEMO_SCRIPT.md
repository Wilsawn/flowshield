# FlowShield — Live Demo Script

**Duration:** 3–5 minutes
**Prerequisites:** Backend running on port 3002, Frontend on port 3000/3001

---

## 1. Open with the Problem (15 sec)

> "What happens when a regulator sends your DeFi protocol a letter? Right now, you either block users or expose their data. FlowShield makes compliance invisible — identity data never touches the blockchain."

## 2. User Onboarding (60 sec)

1. Open the landing page → Click **"Get Started"**
2. Enter an email → Click **Continue**
3. Select **United States** jurisdiction → Click **Continue**
4. Touch ID / fingerprint prompt appears → Authenticate
5. Watch the verification steps animate:
   - Creating secure account on Flow
   - Setting up passkey authentication
   - Running ZK background verification
   - Issuing compliance credential
   - Finalizing account
6. **Key point:** "The user just onboarded with a fingerprint. No seed phrase, no wallet extension, no KYC form. Compliance happened invisibly in the background using zero-knowledge proofs."
7. Click **"Go to Dashboard"**

## 3. Dashboard — Real On-Chain Data (45 sec)

1. Point out the **"Live · Flow Testnet"** badge — all data is real
2. Show the 4 stat cards: Wallet Balance (~99,999 FLOW), Risk Score (15/100)
3. Show **Account Info** panel: "These numbers — account age, transactions, contracts deployed — are all queried live from Flow testnet right now."
4. Click **"Show compliance layer"**
5. Show the on-chain status cards: Credential status, Risk score, Jurisdiction rules
6. Scroll to **Deployed Contracts**: "These are our 6 real Cadence smart contracts deployed on Flow testnet. You can click this FlowDiver link to verify them yourself."
7. Scroll to **On-Chain Rules**: "These rules are read directly from our RuleEngine contract. The travel rule threshold, KYC level — all stored on-chain."

## 4. Jurisdiction Change Scenario (45 sec)

1. Click the **US** flag dropdown
2. Select **European Union**
3. Watch the re-verification modal:
   - "Querying RuleEngine contract for EU rules..."
   - Shows real on-chain travel rule threshold (€1,000 vs $3,000)
   - Real risk score re-evaluation
   - "Compliance confirmed under MiCA"
4. **Key point:** "The user just moved from the US to the EU. FlowShield automatically detected different regulations apply — MiCA instead of FinCEN — queried the on-chain rule engine, and re-verified their credential. No form, no wait, no data exposed."
5. Show the compliance layer now shows EU/EBA rules with "FROM CHAIN" badge
6. Click the **regulation source link** → "This links to the actual MiCA regulation text on EUR-Lex."

## 5. Operator Dashboard (30 sec)

1. Navigate to **Operator** in the sidebar
2. Show: "This is what a protocol operator sees. Risk scores, anomaly alerts, jurisdiction rules — but zero personal data. They can see that users are compliant without knowing who they are."
3. Click **"Run Monitoring Cycle"** → Shows real results from the Anomaly Monitor agent
4. Show the audit log: "Every action is logged in real time."

## 6. Builder Copilot (30 sec)

1. Navigate to **Copilot** in the sidebar
2. Type: "I'm building a lending pool for EU and US users"
3. Show the AI response: compliance configuration + Cadence code
4. **Key point:** "A developer can configure compliance in plain English. The copilot outputs the exact Cadence code to integrate FlowShield."

## 7. Close with the Pitch (15 sec)

> "FlowShield uses 6 Flow primitives: Flow Actions, Cadence Resources, Flow Agents, Scheduled Transactions, Sponsored Transactions, and WebAuthn Passkeys. We're not competing with other DeFi projects — we're the compliance layer that makes them all possible. Identity data never exists on-chain. Only math proofs and boolean results."

---

## Backup Plan

If live demo fails:
- Have screen recording ready
- Have FlowDiver tab open showing deployed contracts
- Have `curl` commands ready to show real API responses:
  ```bash
  curl http://localhost:3002/api/chain/account/0x93c691a98b975493
  curl http://localhost:3002/api/compliance/rules/US
  curl http://localhost:3002/api/chain/contracts/0x93c691a98b975493
  ```

## Likely Judge Questions

| Question | Answer |
|---|---|
| "Is this actually on-chain?" | "Yes — 6 contracts on Flow testnet at 0x93c691a98b975493. Click the FlowDiver link to verify." |
| "How is this different from zkMe/zkPass?" | "Those are identity-only. FlowShield is full-stack compliance infrastructure — credentials, rule engine, autonomous monitoring, and one-line DeFi integration via Flow Actions." |
| "What's the gas cost?" | "Zero for users — we use Flow's Sponsored Transactions. The protocol pays." |
| "Can this work cross-chain?" | "The ZK verification layer is portable. The Cadence contracts are Flow-native, but the architecture supports FlowEVM bridging." |
| "What about jurisdictions that don't accept ZK proofs?" | "FlowShield stores the compliance result (boolean), not the proof method. Regulators see 'verified: true' — the ZK proof is the mechanism, not the output." |
