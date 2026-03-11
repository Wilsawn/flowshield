# FlowShield — Demo Script

**Duration:** ~3 minutes
**Live site:** [flowshield.netlify.app](https://flowshield.netlify.app)
**Contracts:** [testnet.flowscan.io/account/0x93c691a98b975493](https://testnet.flowscan.io/account/0x93c691a98b975493)

---

## Video Pitch Script

### Hook (0:00–0:10)

> Every DeFi protocol building on Flow has the same problem — how do you verify a user is compliant without making them hand over their identity? Because right now, you can't. That's what FlowShield solves.

### Who I Am + What I Built (0:10–0:30)

> I'm Wilsawn Dideh, and I'm genuinely excited to show you this. I built FlowShield from scratch for DeFi protocols, compliance teams, and developers who need to add regulatory compliance without destroying the user experience. It's seven Cadence smart contracts, a Solidity Groth16 verifier on FlowEVM, four AI agents, a real cross-VM zero-knowledge proof pipeline, an A2A agent protocol, and a full platform — all deployed and live on Flow testnet right now. Let me show you what it actually does.

### The Problem — Why This Matters (0:30–0:50)

> Here's why this matters. A DeFi lending protocol launches on Flow. Regulators say you need to know your users. So the protocol adds KYC — and now you've got forms, wait times, and personal data sitting on a blockchain where anyone can see it. Users leave. Or the protocol skips compliance entirely — and gets shut down. There's no good option.
>
> FlowShield gives them a third option. Users prove they're compliant using zero-knowledge proofs. The only things on-chain are a boolean and a proof hash. Never a name, never an ID. And for a developer adding this to their protocol? One line — import ComplianceAction, call verify. That's the entire integration.

*Point to code snippet on landing page.*

### Live Demo — Onboarding (0:50–1:35)

> Let me show you what that looks like for a real user. I hit Launch Dashboard — enter an email, pick a jurisdiction — United States — and now it asks for my fingerprint. That's it. No wallet extension, no seed phrase, no MetaMask popup. This is WebAuthn — the same standard behind Apple Face ID and Google Passkeys.
>
> What happened in those five seconds is the part I'm most proud of. FlowShield created a real Flow account on-chain with a server-signed key pair and funded it through sponsored transactions — the user never pays gas. Then it generated a ZK proof entirely in the browser using snarkjs with a custom circom circuit I wrote — five constraints covering KYC, jurisdiction, risk, expiry, and score range — without revealing any of those values. That proof crossed to FlowEVM where a Solidity Groth16 verifier validated it using BN256 elliptic curve pairings. The boolean result bridged back to Cadence through a Cadence-Owned Account, and a ComplianceCredential resource was minted into the user's own account storage. One fingerprint. *(slow down)* The user has no idea any of that happened. *(pause)* That's the point.

*Walk through onboarding live.*

### Live Demo — Dashboard + Risk Score (1:35–2:10)

> Now on the dashboard — and I want to emphasize, everything here is live testnet data. Not mocked, not hardcoded. That badge says "Flow Testnet · LIVE."
>
> The risk score is fully deterministic — no LLM involved. It queries the Flow Access API for the user's account, then runs eight factors: account age, transaction velocity, rapid in-out patterns, mixer interactions, flagged contracts, funding diversity, dormancy spikes. Points add up, capped at 100. Zero to 30 is compliant, above 70 is non-compliant. All from public chain data — no personal information touches this system.
>
> Now watch — I deposit into the lending pool. That's a real on-chain transaction going through DemoLendingPool. ComplianceAction.verify runs automatically before it executes — the user doesn't see it, but the protocol is fully covered. Borrowing requires a higher tier since it's riskier. And gas? Zero. Sponsored transactions — the protocol pays, the user just signs with their passkey.
>
> Click this Flowscan link right here — that's all seven contracts, verified on-chain.

*Deposit, show Flowscan.*

### Operator Tools — Radar + Governance (2:10–2:50)

> Now here's where it gets powerful for protocol operators. The Regulatory Radar scans your on-chain RuleEngine rules against real regulatory checklists — MiCA for the EU, FinCEN CDD for the US, FATF travel rule, MAS for Singapore, FINTRAC for Canada. Five jurisdictions.
>
> The design here is deliberate. Deterministic gap detection runs first — a hardcoded checklist compared against what's actually in the RuleEngine contract on-chain. Same input always gives the same output. Then Claude Haiku 4.5 enriches the results with regulatory context — specific regulation names, article numbers, what to do about it. But Claude can only add context to existing gaps — it cannot invent new ones or hide real ones. That means you get the intelligence of an AI with zero hallucination risk.
>
> When a gap shows up, the operator approves and the fix pushes straight to the RuleEngine contract on-chain. One click — gap fixed.
>
> Governance works the same way — fully on-chain multi-sig proposals. Create a proposal to update fees, change rules, add verifiers, or revoke credentials. Signers approve, quorum hits, and it auto-executes — actually calls the admin function on the target contract. Every action links to Flowscan so there's a full audit trail.

*Show radar scan, approve a fix, show governance.*

### What Makes This Different (2:50–3:05)

> We use six Flow primitives — not as buzzwords, but deeply. Flow Actions for composable compliance checks. Cadence Resources so credentials live in the user's own storage. Flow Agents for autonomous wallet monitoring. Scheduled Transactions for recurring verification. Gasless UX through sponsored transactions. And WebAuthn Passkeys for onboarding that creates real Flow accounts without the user ever knowing.
>
> Four AI agents — risk scoring, anomaly detection, Builder Copilot, Regulatory Radar — all orchestrated through an A2A agent protocol. The site is live right now at flowshield.netlify.app — you can try it yourself.

### Closing (3:05–3:15)

> FlowShield is the compliance layer that every DeFi app on Flow needs to operate legally — without ever putting identity on-chain. Just math and booleans. Thanks for watching.

---

## Delivery Tips

| Do | Don't |
|---|---|
| Start with the problem, not your name — hook them first | Don't list features without showing them |
| Show the live demo — it's your strongest proof | Don't speed up to fit the time limit — cut content instead |
| Pause after big moments — "one fingerprint" *pause* | Don't say "um", "uh", "like" — replace with silence |
| Let your excitement show — you built something real | Don't read from a script — memorize the beats, talk naturally |
| Name who this is for — "DeFi protocols, compliance teams" | Don't describe features without saying why they matter |
| End with your vision, not "that's it" | Don't stack jargon — spread technical terms across sections |
| Mention the site is live and they can try it | Don't wait until the end to prove it's real |

### The 7 Beats to Memorize

Don't memorize the script word-for-word. Memorize these beats and talk naturally around each one:

1. **Hook** — "DeFi protocols can't verify compliance without asking for identity"
2. **Who + what** — "I built this for DeFi teams. Seven contracts, four agents, all live"
3. **Why it matters** — "Real lending protocol, can't add KYC without killing UX"
4. **Onboarding** — "One fingerprint. Here's what happened — ZK proof, cross-VM, credential minted"
5. **Dashboard** — "Live data. Eight risk factors. Real deposit. Zero gas"
6. **Operator** — "Radar finds gaps, one click fixes on-chain. Governance auto-executes"
7. **Close** — "The compliance layer every DeFi app on Flow needs"

### Pause Points

These are the moments to slow down and let the point land:

- After "That's what FlowShield solves" — *pause 1 second*
- After "One fingerprint" during onboarding — *pause*
- After "The user has no idea any of that happened. That's the point." — *pause 2 seconds*
- After "Not mocked, not hardcoded" — *pause*
- After "One click — gap fixed" — *pause*
- After "Just math and booleans" at the close — *pause, then "thanks for watching"*

---

## Key Talking Points

| Topic | What to Say |
|---|---|
| **Scale of the build** | "Seven contracts, four AI agents, a cross-VM ZK pipeline, full platform — all from scratch." |
| **Who it's for** | "DeFi protocols, compliance teams, and developers who need compliance without killing UX." |
| **One-line integration** | "Import ComplianceAction, call verify. That's it." |
| **Zero identity on-chain** | "Just a boolean and a proof hash. Never a name, never an ID." |
| **Cross-VM ZK** | "circom circuit, snarkjs in the browser, Groth16 on FlowEVM, result consumed by Cadence." |
| **Six Flow primitives** | "Actions, Resources, Agents, Scheduled Transactions, Sponsored Transactions, Passkeys." |
| **Hybrid AI** | "Deterministic first, Claude enriches. Same input, same output. No hallucinations." |
| **Gas fees** | "Users pay zero. Sponsored Transactions." |
| **It's live** | "Try it right now at flowshield.netlify.app. Click the Flowscan link." |

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
| "How does the risk score work?" | Eight rule-based factors scored from public chain data — account age, tx velocity, mixer interaction, funding patterns. Points add up to 100. No LLM, fully deterministic. |
| "Can I try it?" | Yes — flowshield.netlify.app. Create an account, it takes five seconds. |

---

## Backup Plan

If the live demo has issues:

- Have a screen recording ready as backup
- Have Flowscan open showing the 7 deployed contracts
- Run API calls directly to prove the backend is live:

```bash
curl https://flowshield-production.up.railway.app/health
curl https://flowshield-production.up.railway.app/api/compliance/rules/US
curl https://flowshield-production.up.railway.app/api/compliance/rules/EU
curl -X POST https://flowshield-production.up.railway.app/api/risk/score \
  -H "Content-Type: application/json" \
  -d '{"address": "0x93c691a98b975493"}'
```
