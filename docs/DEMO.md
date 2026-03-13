# FlowShield — Demo Script

**Duration:** ~3 minutes
**Live site:** [flowshield.netlify.app](https://flowshield.netlify.app)
**Contracts:** [testnet.flowscan.io/account/0x93c691a98b975493](https://testnet.flowscan.io/account/0x93c691a98b975493)

---

## The Pitch (what to say)

Each section is a few short sentences. Say them naturally — don't read word for word.

---

### 1. HOOK (0:00–0:10)

> DeFi protocols on Flow can't verify if a user is compliant without asking for their identity.
> That's a dealbreaker for regulators.
> FlowShield fixes it.

*(pause)*

---

### 2. WHO + WHAT (0:10–0:20)

> I'm Wilsawn. I built FlowShield — a compliance layer for DeFi on Flow.
> Users prove they're compliant. Their identity never touches the chain.
> It's live on testnet right now. Let me show you.

---

### 3. THE PROBLEM (0:20–0:40)

> A lending protocol launches on Flow.
> Regulators say: know your users.
> So you add KYC. Now you've got forms, wait times, and personal data on a public blockchain.
> Users leave.
> Or you skip compliance — and get shut down.
> There's no good option.
>
> FlowShield is the third option.
> One line of code. Zero identity on-chain.

*Point to the code snippet on the landing page.*

---

### 4. LIVE DEMO — ONBOARDING (0:40–1:15)

*Click Launch Dashboard. Do the onboarding live.*

> Watch. I enter an email. Pick a jurisdiction. Scan my fingerprint.
> That's it. No wallet. No seed phrase. No MetaMask.

*(pause — let them watch it happen)*

> Here's what just happened in five seconds.
> A ZK proof was generated in the browser.
> It was verified on FlowEVM.
> The result came back to Cadence.
> A compliance credential was minted into the user's account.
> A real Flow account was created and funded.
> The user paid nothing.

*(slow down)*

> One fingerprint. The user had no idea any of that happened.

*(pause 2 seconds)*

> That's the point.

---

### 5. LIVE DEMO — DASHBOARD (1:15–1:55)

*Switch to your pre-loaded dashboard tab.*

> Everything here is live testnet data. Not mocked. Not hardcoded.

*(pause)*

> The risk score checks eight factors from public chain data.
> Account age. Transaction speed. Mixer interactions. Funding sources.
> Points add up. Capped at 100. No AI — fully deterministic.
> Zero to 30 is compliant. Above 70 is blocked.

*Do a deposit.*

> I just deposited into a real lending pool on-chain.
> Before it executed, ComplianceAction.verify ran automatically.
> The user didn't see it. The protocol is fully covered.
> Gas? Zero. Sponsored transactions.

*(pause)*

> That lending pool just verified a real user, on-chain, in under a second — with no gas and no personal data.

---

### 6. OPERATOR TOOLS (1:55–2:30)

*Open Regulatory Radar.*

> For protocol operators — the Regulatory Radar.
> It scans your on-chain rules against five jurisdictions.
> US, EU, UK, Singapore, Canada.
> Deterministic gap detection first. Then Claude AI adds regulatory context.
> The AI can only explain existing gaps. It can't invent new ones.

*Approve a fix.*

> One click. Fix pushed to the smart contract on-chain.

*(pause)*

> Governance works the same way. Multi-sig proposals. Auto-execute on quorum. Full audit trail on Flowscan.

---

### 7. WHAT I BUILT (2:30–2:50)

> Here's the full scope.
> Seven Cadence smart contracts.
> A Solidity ZK verifier on FlowEVM.
> A custom circom circuit.
> Four AI agents.
> Six Flow primitives used deeply — Actions, Resources, Agents, Scheduled Transactions, Sponsored Transactions, Passkeys.
>
> Existing tools like zkMe do identity. Chainalysis does monitoring. FlowShield does both — in one line.

---

### 8. CLOSE (2:50–3:00)

> FlowShield is the compliance layer every DeFi app on Flow needs.
> No identity on-chain. Just math and booleans.
> Try it right now — flowshield.netlify.app.

*(pause)*

> Thanks for watching.

---

## How to Remember This

**You don't memorize the script. You memorize 8 words.**

Write these on a sticky note next to your screen:

```
HOOK → ME → PROBLEM → ONBOARD → DASHBOARD → OPERATOR → BUILT → CLOSE
```

For each word, you know one thing to say:

| Word | The one thing you say |
|------|----------------------|
| HOOK | "DeFi can't do compliance without asking for identity" |
| ME | "I'm Wilsawn. I built this. It's live." |
| PROBLEM | "Add KYC, kill UX. Skip it, get shut down." |
| ONBOARD | *Do the demo.* "One fingerprint. User had no idea." |
| DASHBOARD | *Show it.* "Live data. Real deposit. Zero gas." |
| OPERATOR | *Show radar.* "One click. Gap fixed on-chain." |
| BUILT | "Seven contracts. Four agents. One line to integrate." |
| CLOSE | "Just math and booleans. Try it." |

**That's it.** The demo does the heavy lifting. You just narrate what's on screen.

### Practice Plan

1. **Tonight**: Read the script once while clicking through the app
2. **Before bed**: Say just the 8 words and one sentence for each, from memory
3. **Tomorrow morning**: Do a full run with just the sticky note — time yourself
4. **Before the demo**: Hit the backend to warm it up, open your 3 tabs, breathe

---

## Before the Demo — Setup Checklist

- [ ] **Tab 1**: Incognito browser → flowshield.netlify.app (for live onboarding)
- [ ] **Tab 2**: Already logged in with pre-created account (for dashboard)
- [ ] **Tab 3**: Flowscan open at contracts page
- [ ] **Screen recording backup** ready
- [ ] **Warm up backend**: `curl https://flowshield-production.up.railway.app/health`
- [ ] **Test the WiFi** you'll present on
- [ ] **Sticky note** on monitor: HOOK → ME → PROBLEM → ONBOARD → DASHBOARD → OPERATOR → BUILT → CLOSE
- [ ] **Clean desktop** — hide bookmarks bar, close other tabs

---

## Pause Points

These silences make you look confident, not lost:

- After "FlowShield fixes it" — *1 second*
- After "One fingerprint" — *1 second*
- After "The user had no idea. That's the point." — *2 seconds*
- After "Not mocked. Not hardcoded." — *1 second*
- After "Gap fixed on-chain" — *1 second*
- After "Just math and booleans" — *2 seconds, then "thanks for watching"*

---

## If You Forget What to Say

1. **Look at the screen.** Describe what you see. You built this — you know what it does.
2. **Glance at your sticky note.** Find the next word. Say one sentence about it.
3. **Never say "sorry" or "wait."** Just pause and keep going. Nobody knows what you planned to say.

---

## Likely Questions

| Question | Answer |
|---|---|
| "Is this actually on-chain?" | Yes — 7 contracts on Flow testnet. Open Flowscan right now. |
| "How's this different from zkMe?" | They do identity only. We're full-stack — credentials, rules, agents, governance, and one-line integration. |
| "Did you build the ZK circuit?" | Yes — custom circom circuit, five constraints, verified on FlowEVM via Groth16. |
| "What AI do you use?" | Claude Haiku 4.5 for copilot and radar. Risk scoring is deterministic — no LLM. |
| "What's the gas cost?" | Zero for users. Sponsored transactions. |
| "Can I try it?" | Yes — flowshield.netlify.app. Takes five seconds. |
| "How does the risk score work?" | Eight factors from public chain data. Points add up to 100. No personal info. |
| "What about privacy regulations?" | No personal data on-chain. Regulators see "verified: true." The ZK proof is the mechanism. |

---

## Backup Plan

If the live demo breaks:

1. **Switch to your screen recording** — don't fumble
2. **Show Flowscan** — contracts are on-chain regardless
3. **Run curl commands** from terminal:

```bash
curl https://flowshield-production.up.railway.app/health
curl https://flowshield-production.up.railway.app/api/compliance/rules/US
curl -X POST https://flowshield-production.up.railway.app/api/risk/score \
  -H "Content-Type: application/json" \
  -d '{"address": "0x93c691a98b975493"}'
```
