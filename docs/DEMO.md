# FlowShield — Demo Script

**Duration:** 4–5 minutes
**Live site:** [flowshield.netlify.app](https://flowshield.netlify.app)
**Contracts:** [testnet.flowscan.io/account/0x93c691a98b975493](https://testnet.flowscan.io/account/0x93c691a98b975493)

---

## Video Pitch Script

### Intro (0:00–0:20)

> Hey, what's up? My name is Wilsawn Dideh, hope whoever's watching this is having a great day. So I've been building FlowShield — it's a full-stack, privacy-preserving compliance infrastructure for DeFi on Flow. And when I say full-stack, I mean seven smart contracts, four AI agents, a cross-VM zero-knowledge proof pipeline, an A2A agent protocol, and a complete user platform — all built from scratch and all live on testnet right now.

### The Problem (0:20–0:40)

> So here's the core problem in DeFi. Compliance and user experience are treated as opposites. You add KYC — now you've got forms, wait times, and people's identity data sitting on a blockchain where it doesn't belong. You skip compliance — and regulators shut you down. Nobody's solved this well. FlowShield makes compliance completely invisible to the end user. They prove they're compliant using zero-knowledge proofs, and their identity — name, ID, biometrics — never touches the chain. Not once.

### The Architecture (0:40–1:10)

> Let me walk you through what's actually under the hood. FlowShield is four layers deep.
>
> At the top, the user experience layer — React 19, Framer Motion, a full interactive dashboard with React Flow.
>
> Below that, seven Cadence smart contracts deployed on Flow Testnet — ComplianceCredential as a Cadence Resource in each user's account, ComplianceAction as a Flow Actions primitive for one-line integration, a RuleEngine with per-jurisdiction rules for five countries, ZKVerifier, a reference lending pool, an autonomous ComplianceAgent, and a multi-sig Governance contract.
>
> Then the ZK layer — this is a real cross-VM pipeline. We wrote a circom circuit, proofs are generated client-side with snarkjs, verified on FlowEVM using a Solidity Groth16 verifier with BN256 elliptic curve pairings, and the boolean result crosses back to Cadence through a Cadence-Owned Account. Identity data never enters either VM.
>
> And at the bottom, four AI agents — risk scoring, anomaly detection, a Builder Copilot, and a Regulatory Radar — all orchestrated through a Google A2A-style agent-to-agent protocol.

*Show the architecture diagram on the landing page.*

### Integration (1:10–1:25)

> And for a developer integrating all of this? One line. Import ComplianceAction, call verify on the user's address. That's it. Your contract never touches identity data, never stores sensitive info, never implements compliance logic. FlowShield does everything.

*Show the code snippet.*

### Live Demo — Onboarding (1:25–2:05)

> Let me show this live. I'll hit Launch Dashboard — this triggers the onboarding.
>
> Email, pick a jurisdiction — United States — and now the passkey prompt. Just my fingerprint. No wallet extension, no seed phrase, no MetaMask.
>
> What just happened is significant. FlowShield created a real Flow account on-chain, funded it through sponsored transactions, generated a zero-knowledge compliance proof entirely client-side, verified it through our cross-VM pipeline, and minted a ComplianceCredential resource into the user's account storage. All of that — five seconds, one fingerprint.

*Walk through onboarding.*

### Live Demo — Dashboard (2:05–2:45)

> Now on the dashboard — everything here is live testnet data. That badge says "Flow Testnet · LIVE." The risk score is calculated from eight real on-chain factors through our risk scoring agent — account age, transaction velocity, funding patterns, contract interactions — all public chain data, zero personal information.
>
> I can deposit into the lending pool — real on-chain transaction. ComplianceAction.verify runs automatically before it executes. Borrowing requires a higher compliance tier since it's riskier. The whole DeFi flow is compliance-gated but the user experience is seamless.
>
> Gas fees? Zero. We use Flow's Sponsored Transactions for everything. The user never sees a fee.
>
> And you can click this Flowscan link right here — that takes you to our seven deployed contracts. All verifiable on-chain.

*Deposit, show Flowscan link.*

### Builder Copilot (2:45–3:10)

> The Builder Copilot is an AI assistant powered by Claude Haiku 4.5. Developers ask compliance questions in plain English — "Does my contract handle the EU travel rule?" — and get back actual Cadence code with the right jurisdiction configuration.
>
> It's got conversation persistence, a code scanner for pasting smart contracts and finding compliance gaps, and prompt injection protection built into every request. This isn't a chatbot wrapper — it has deep context about FlowShield's contract architecture and regulatory requirements.

*Type a question, show response.*

### Regulatory Radar (3:10–3:40)

> The Regulatory Radar is where our hybrid AI architecture really shines. It scans on-chain RuleEngine rules against real regulatory checklists — MiCA, FinCEN, FATF, MAS — for five jurisdictions.
>
> The key design: deterministic gap detection runs first — same input always produces the same output, no randomness. Then Claude enriches the findings with regulatory context. Claude can only improve descriptions — it cannot add or remove gaps. So you get AI intelligence with zero hallucination risk.
>
> When a gap is found, the operator approves and the fix pushes directly to the RuleEngine contract on-chain. One click, rule updated, gap gone on next scan.

*Run scan, show gaps, approve fix.*

### Governance + Automations (3:40–4:05)

> Governance is fully on-chain — multi-sig M-of-N proposals. Create a proposal to change fees, update rules, or revoke credentials. Signers approve, hit quorum, execute. Seven-day expiry. Everything links to Flowscan for full transparency. Proposals auto-execute when approved if quorum is met.
>
> And on the automations side — four presets built on Flow primitives. Scheduled Transactions for periodic KYC re-verification, Flow Agents for continuous anomaly monitoring, Flow Actions for regulatory syncs, and batch compliance checks across the pool. Each triggers real backend calls with live results.

*Show governance, toggle an automation.*

### Flow Primitives (4:05–4:20)

> I want to highlight — we're using six Flow primitives deeply. Flow Actions for composable compliance checks. Cadence Resources for credential ownership in user storage. Flow Agents for autonomous monitoring. Scheduled Transactions for recurring cycles. Sponsored Transactions so users pay nothing. And WebAuthn Passkeys for passwordless biometric onboarding that creates real Flow accounts.

### Closing (4:20–4:35)

> So that's FlowShield. Seven Cadence contracts, a Solidity Groth16 verifier, four AI agents with A2A orchestration, a cross-VM ZK pipeline, and a complete platform — all live on testnet.
>
> We're not another DeFi app. We're the compliance infrastructure that makes every DeFi app on Flow legally operable — without ever putting identity on-chain. Just math and booleans.
>
> Thanks for watching. Feel free to try it at flowshield.netlify.app or check the contracts on Flowscan. Cheers.

---

## Key Talking Points

| Topic | What to Say |
|---|---|
| **Scale of the build** | "Seven contracts, four AI agents, a cross-VM ZK pipeline, full platform — all from scratch." |
| **One-line integration** | "Import ComplianceAction, call verify. That's it." |
| **Zero identity on-chain** | "Just a boolean and a proof hash. Never a name, never an ID." |
| **Cross-VM ZK** | "circom circuit, snarkjs in the browser, Groth16 on FlowEVM, result consumed by Cadence. Real cross-VM." |
| **Six Flow primitives** | "Actions, Resources, Agents, Scheduled Transactions, Sponsored Transactions, Passkeys." |
| **Hybrid AI** | "Deterministic detection first, Claude enriches. Same input, same output. No hallucinations." |
| **Gas fees** | "Users pay zero. Sponsored Transactions." |
| **Real data** | "Everything's live testnet. Click the Flowscan link." |

---

## Likely Questions

| Question | Answer |
|---|---|
| "Is this actually on-chain?" | Yes — 7 Cadence contracts + 1 Solidity verifier on Flow testnet. Open Flowscan. |
| "How's this different from zkMe/zkPass?" | Those are identity-only. We're full-stack: credentials, rule engine, agents, governance, A2A protocol, and one-line DeFi integration. |
| "Did you build the ZK circuit?" | Yes — custom circom circuit with five constraints. Proofs generated client-side, verified on FlowEVM via Groth16 BN256 pairings. |
| "How does cross-VM work?" | Cadence calls FlowEVM through a Cadence-Owned Account. The Solidity verifier returns a boolean, Cadence mints the credential. |
| "What AI do you use?" | Claude Haiku 4.5 for copilot and radar. Risk scoring and anomaly detection are deterministic — no LLM. |
| "What's the gas cost?" | Zero for users. Sponsored Transactions. |
| "Can this work cross-chain?" | ZK layer is portable. Cadence contracts are Flow-native, FlowEVM bridge is built. |
| "What about privacy regulations?" | No personal data on-chain. Regulators see "verified: true" — the ZK proof is the mechanism, not the output. |

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
