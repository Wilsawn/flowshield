# FlowShield — Demo Script

**Duration:** 4–5 minutes
**Live site:** [flowshield.netlify.app](https://flowshield.netlify.app)
**Contracts:** [testnet.flowscan.io/account/0x93c691a98b975493](https://testnet.flowscan.io/account/0x93c691a98b975493)

---

## Video Pitch Script

### Intro (0:00–0:15)

> Hey, what's up? My name is Wilsawn Dideh, and I hope whoever's watching this is having a great day. So over the past couple of weeks I've been building FlowShield — it's basically a compliance layer for DeFi on Flow that keeps user identity completely private.

### The Problem (0:15–0:35)

> So here's the thing. If you're building a DeFi app right now, you have to pick — either you add KYC and the user experience goes down the drain, or you skip it and you can't legally operate. There's no middle ground.
>
> FlowShield fixes that. Users prove they're compliant using zero-knowledge proofs, and their actual identity data — name, ID, all of that — never goes on-chain. Ever.

### Integration Demo (0:35–0:55)

> And the best part? Adding FlowShield to your protocol is one line of Cadence. You just import our contract, call `verify()` on the user's address, and you're done. No forms, no storing sensitive data, nothing. FlowShield takes care of everything in the background.

*Show the code snippet on the landing page.*

### Smart Contracts (0:55–1:15)

> Let me show you what's actually deployed. We've got seven Cadence contracts live on Flow Testnet. The main ones are ComplianceCredential, which is a resource that lives in the user's account. ComplianceAction — that's the one-line hook I just showed you. RuleEngine, which stores rules for five jurisdictions — US, EU, UK, Singapore, Canada. And then we've got a ZK verifier, a demo lending pool, an autonomous monitoring agent, and a governance contract for multi-sig admin stuff.

*Open Flowscan and show the deployed contracts.*

### User Onboarding (1:15–1:55)

> OK so let me walk through what the user actually sees. I'll hit Launch Dashboard — and since this is a new account, it kicks off the onboarding.
>
> I type in my email, pick a jurisdiction — let's do United States — and then I get a fingerprint prompt. That's it. No seed phrase, no wallet extension, nothing.
>
> What just happened behind the scenes is — FlowShield created a real Flow account, funded it with testnet tokens, ran a ZK verification, and issued a compliance credential. All of that in like five seconds. The user didn't fill out a single form.

*Walk through the onboarding flow live.*

### Dashboard (1:55–2:35)

> Now I'm on the dashboard. Everything here is pulling live data from Flow Testnet — you can see the green badge that says "Flow Testnet, LIVE." The risk score comes from eight on-chain factors — things like account age, transaction patterns, number of funding sources. It's all public chain data, zero personal info.
>
> I can deposit into the lending pool right here — that's a real transaction hitting the chain. The compliance check runs automatically before it goes through. Borrowing works the same way but needs a higher compliance tier since it's riskier.
>
> And gas fees? Users pay zero. FlowShield covers everything through Flow's Sponsored Transactions.

*Show deposit, point out compliance badge, click Flowscan link.*

### Builder Copilot (2:35–3:05)

> Next up is the Builder Copilot. It's an AI assistant powered by Claude. So a developer can just ask, like, "Does my contract handle the travel rule for EU users?" and it comes back with the actual compliance config and Cadence code.
>
> There's also a code scanner — you paste in your smart contract and it flags compliance issues. And we've got prompt injection protection built in so nobody can mess with the AI.

*Type a question, show the AI response.*

### Regulatory Radar (3:05–3:35)

> This is my favorite part — the Regulatory Radar. It scans our on-chain rules against real regulations. MiCA for Europe, FinCEN for the US, FATF guidelines. It does deterministic gap detection first — same input, same output, no randomness — and then Claude adds regulatory context on top.
>
> So if it finds something wrong — like the EU travel rule threshold is off — the operator just hits approve and the fix goes straight to the RuleEngine contract on-chain. Next scan, the gap is gone.

*Run a scan, show gaps, approve a fix.*

### Governance (3:35–3:55)

> We also built out governance. It's a multi-sig proposal system — you create a proposal, signers approve it, hit quorum, and execute. You can update fees, change rules, revoke credentials. Everything's on-chain and you can click through to Flowscan to verify any of it.

*Show the governance panel, point out an executed proposal.*

### Flow Automations (3:55–4:15)

> And then we have the automations tab. Four presets built on Flow primitives — scheduled re-verification every 30 days, continuous anomaly monitoring, regulatory rule syncs, and batch compliance checks across the lending pool. You toggle one on and it runs real calls against the backend, gives you live results right there.

*Toggle an automation on, show the result.*

### Closing (4:15–4:30)

> So yeah, that's FlowShield. Seven contracts on testnet, four AI agents, ZK proofs working across Cadence and FlowEVM, and six Flow primitives — Actions, Resources, Agents, Scheduled Transactions, Sponsored Transactions, and Passkeys.
>
> We're not trying to be another DeFi project. We're the compliance layer that makes all of them possible. Identity never hits the chain. Just math and booleans.
>
> Thanks for watching — feel free to reach out if you have any questions. Cheers.

---

## Key Talking Points

| Topic | What to Say |
|---|---|
| **One-line integration** | "Import ComplianceAction, call verify. Done." |
| **Zero identity on-chain** | "Just a boolean and a proof hash. Never a name, never an ID." |
| **Gas fees** | "Users pay nothing. Sponsored Transactions handle it." |
| **Passkey onboarding** | "Fingerprint creates a Flow account. No wallet, no seed phrase." |
| **Cross-VM ZK** | "Proofs made in the browser, verified on FlowEVM, used by Cadence." |
| **Real data** | "Everything on the dashboard is live testnet. Click the Flowscan link." |
| **Hybrid AI** | "Deterministic detection first, then Claude adds context. No hallucinations." |

---

## Likely Questions

| Question | Answer |
|---|---|
| "Is this actually on-chain?" | Yeah — 7 contracts on Flow testnet. Open Flowscan, it's all there. |
| "How's this different from zkMe or zkPass?" | Those just do identity. We're full-stack — credentials, rule engine, agents, governance, one-line integration. |
| "What do users pay for gas?" | Nothing. Sponsored Transactions. The protocol covers it. |
| "Can it work on other chains?" | The ZK layer is portable. The Cadence contracts are Flow-native but we bridge through FlowEVM. |
| "What about privacy laws?" | No personal data on-chain at all. Regulators see "verified: true" — that's it. |
| "What AI are you using?" | Claude Haiku 4.5 for the copilot and radar. Risk scoring and anomaly detection are pure logic, no LLM. |

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
