# FlowShield — Demo Script

**Duration:** 4–5 minutes
**Live site:** [flowshield.netlify.app](https://flowshield.netlify.app)
**Contracts:** [testnet.flowscan.io/account/0x93c691a98b975493](https://testnet.flowscan.io/account/0x93c691a98b975493)

---

## Video Pitch Script

### Intro (0:00–0:15)

> Hey, what's up? My name is Wilsawn Dideh. I hope whoever's watching this is having a great day. Over the past couple of weeks I've been building FlowShield — a privacy-preserving compliance layer for DeFi on Flow.

### The Problem (0:15–0:35)

> Here's the problem. If you're building a DeFi protocol today, you're forced to choose between compliance and user experience. Add KYC and you kill the UX — forms, wait times, identity data sitting on-chain. Skip compliance and you can't operate legally. FlowShield makes compliance invisible. Users prove they're compliant through zero-knowledge proofs, and their identity data never touches the blockchain.

### Integration Demo (0:35–0:55)

> And here's the best part — integrating FlowShield is literally one line of Cadence. You import ComplianceAction from our contract address, call `verify()` on the user's address before any financial operation, and that's it. No KYC forms, no identity storage, no compliance logic in your contract. FlowShield handles everything behind the scenes.

*Show the code snippet on the landing page.*

### Smart Contracts (0:55–1:15)

> So let me show you what's actually on-chain. We have seven Cadence smart contracts deployed on Flow Testnet. ComplianceCredential — that's a Cadence Resource stored in the user's account. ZKVerifier — validates zero-knowledge proofs. ComplianceAction — that's the Flow Actions primitive, the one-line integration point. RuleEngine stores jurisdiction-specific rules for US, EU, UK, Singapore, and Canada. We've also got the DemoLendingPool as a reference integration, ComplianceAgent for autonomous monitoring, and Governance for multi-sig admin operations.

*Open Flowscan and show the deployed contracts.*

### User Onboarding (1:15–1:55)

> Now let me walk you through the user experience. I'll click Launch Dashboard — since I'm a new user, it triggers the onboarding flow.

> I enter my email, select my jurisdiction — let's go with United States — and then I get a passkey prompt. I just use my fingerprint. No seed phrase, no wallet extension, no MetaMask popup.

> Behind the scenes, FlowShield just created a real Flow account for me, funded it with testnet FLOW, ran a zero-knowledge background verification, and issued a compliance credential — all in about five seconds. The user didn't fill out a single form.

*Walk through the onboarding flow live.*

### Dashboard (1:55–2:35)

> Now I'm on the dashboard. Everything you see here is live data from Flow Testnet — that green badge says "Flow Testnet · LIVE." My risk score is calculated from eight on-chain factors — account age, transaction patterns, funding sources — all public chain data, no personal information.

> I can deposit into the lending pool — this triggers a real on-chain transaction. The compliance check happens automatically before the deposit executes. I can also borrow, and borrowing requires a stricter compliance tier because it's a higher-risk action.

> All gas fees are sponsored by FlowShield through Flow's Sponsored Transactions — the user pays nothing.

*Show deposit, point out compliance badge, click Flowscan link.*

### Builder Copilot (2:35–3:05)

> Next is the Builder Copilot — our AI compliance assistant powered by Claude. A developer can ask in plain English: "Does my Cadence contract handle the travel rule for EU users?" and the copilot responds with the exact compliance configuration and Cadence code they need.

> It also has a code scanner — paste your smart contract and it identifies compliance gaps. Everything runs through prompt injection protection so users can't manipulate the AI.

*Type a question, show the AI response.*

### Regulatory Radar (3:05–3:35)

> Now the Regulatory Radar. This is where it gets interesting. The radar scans our on-chain RuleEngine rules against real regulatory requirements — MiCA for the EU, FinCEN for the US, FATF guidelines. It uses a hybrid approach: deterministic gap detection first, then Claude enriches the findings with regulatory context.

> When it finds a gap — say the EU travel rule threshold is wrong — the operator can approve the fix and it updates the RuleEngine contract directly on-chain. Fix a rule, the gap disappears on the next scan.

*Run a scan, show gaps, approve a fix.*

### Governance (3:35–3:55)

> We also built a full governance system. The Governance contract uses multi-sig proposals — create a proposal, other signers approve, reach quorum, then execute. It can update fees, change rules, revoke credentials. Proposals expire after seven days. Everything is on-chain with Flowscan links for transparency.

*Show the governance panel, point out an executed proposal.*

### Flow Automations (3:55–4:15)

> And finally, Flow Automations. We built four automation presets using Flow's primitives — Scheduled Transactions for KYC re-verification every 30 days, Flow Agents for continuous anomaly monitoring, Flow Actions for regulatory rule syncs, and batch compliance checks for the lending pool. Each one runs real API calls against the backend and shows live results.

*Toggle an automation on, show the result.*

### Closing (4:15–4:30)

> So that's FlowShield. We use six Flow primitives: Flow Actions, Cadence Resources, Flow Agents, Scheduled Transactions, Sponsored Transactions, and WebAuthn Passkeys. Seven smart contracts on testnet, four AI agents, zero-knowledge proofs across Cadence and FlowEVM, and a full-stack compliance platform.

> We're not competing with other DeFi projects — we're the compliance layer that makes them all possible. Identity data never exists on-chain. Only math proofs and boolean results.

> Thank you so much for watching. If you have any questions, don't hesitate to reach out. Cheers.

---

## Key Talking Points

| Topic | What to Say |
|---|---|
| **One-line integration** | "Import ComplianceAction, call verify(). That's it." |
| **Zero identity on-chain** | "Only a boolean and a proof hash. Never a name, never an ID." |
| **Gas fees** | "Users pay nothing. Flow's Sponsored Transactions cover everything." |
| **Passkey onboarding** | "Fingerprint creates a Flow account. No wallet, no seed phrase." |
| **Cross-VM ZK** | "Proofs generated client-side, verified on FlowEVM, consumed by Cadence." |
| **Real data** | "Everything on the dashboard is live testnet data. Click the Flowscan link." |
| **Hybrid AI** | "Deterministic gap detection first, Claude enriches — no hallucination risk." |

---

## Likely Questions

| Question | Answer |
|---|---|
| "Is this actually on-chain?" | Yes — 7 contracts on Flow testnet at `0x93c691a98b975493`. Open Flowscan to verify. |
| "How is this different from zkMe/zkPass?" | Those are identity-only. FlowShield is full-stack: credentials, rule engine, monitoring agents, governance, and one-line DeFi integration. |
| "What's the gas cost for users?" | Zero. Sponsored Transactions — the protocol pays. |
| "Can this work cross-chain?" | The ZK layer is portable. Cadence contracts are Flow-native, but the architecture supports FlowEVM bridging. |
| "What about privacy regulations?" | No personal data is stored anywhere on-chain. ZK proofs are the mechanism — regulators see "verified: true", not the proof itself. |
| "What AI model do you use?" | Claude Haiku 4.5 for the copilot and radar agents. Risk scoring and anomaly detection are deterministic — no LLM required. |

---

## Backup Plan

If the live demo has issues:

- Have a screen recording ready
- Have Flowscan open showing the 7 deployed contracts
- Run API calls directly:

```bash
curl https://flowshield-production.up.railway.app/health
curl https://flowshield-production.up.railway.app/api/compliance/rules/US
curl https://flowshield-production.up.railway.app/api/compliance/rules/EU
curl -X POST https://flowshield-production.up.railway.app/api/risk/score \
  -H "Content-Type: application/json" \
  -d '{"address": "0x93c691a98b975493"}'
```
