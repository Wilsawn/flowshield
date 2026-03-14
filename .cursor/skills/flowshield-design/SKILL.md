---
name: flowshield-design
description: >
  Establishes FlowShield’s product design system and web3/DeFi protocol visual language.
  Use when modifying frontend UI, layout, or copy (especially landing, dashboards, and
  marketing surfaces) to keep the app feeling like a serious on-chain compliance protocol
  instead of generic AI SaaS.
---

# FlowShield Design System (Protocol Web3)

## When to use this skill

Use these instructions whenever:

- Editing or creating React/Tailwind UI in `frontend/` (pages, components, dashboards).
- Changing layout, sections, or visuals on:
  - Landing page (`frontend/src/pages/index.jsx`).
  - Dashboard / operator views.
  - Product / marketing sections that describe agents, ZK, or contracts.
- Writing or rewriting UI copy, headings, or CTAs related to FlowShield’s product.

Do **not** use this for backend-only or Cadence-only changes unless you are also touching UI.

---

## Core vibe

- **Primary identity**: FlowShield is a **DeFi / fintech protocol for on-chain compliance**, not a generic AI tool.
- **Audience**: protocol teams, DeFi founders, compliance / risk operators, not retail traders.
- **Tone**: calm, precise, technical, and confident. Never hypey or vague.
- **High-level promise**: “Privacy-preserving compliance for DeFi on Flow. One on-chain boolean, no identity data.”

Whenever you design or rewrite something visual, ask:

- “Does this look like a protocol / dashboard a serious DeFi team would trust?”
- “Is the main story clear: on-chain rules + ZK + agents, not generic ‘AI magic’?”

---

## Layout & information architecture

### Landing page structure

Prefer this structure (you can reorder or merge, but keep the intent):

1. **Hero** – Promise + proof + wallet/dApp CTA  
   - Promise: DeFi compliance, privacy-preserving, on Flow.  
   - Proof: live testnet contracts, on-chain boolean, 0% PII.
2. **dApp preview** – A compact “app window” that looks like the real product:
   - Shows compliance status, risk score, jurisdiction, and network.
   - Includes a “Launch dApp / Connect / Create” button using existing onboarding logic.
3. **Protocol surfaces** – What ships with FlowShield:
   - Regulatory Radar, Compliance Scanner, ZK Verification, Builder Copilot, A2A orchestrator.
   - For each, indicate the surface type: `Protocol`, `AI Agent`, `Dashboard`, `ZK`.
4. **How it works** – 3–4 concise steps from onboarding → ZK proof → on-chain check.
5. **Architecture** – Diagram / canvas (already present via `ProductShowcase`).
6. **Integration snippet** – Show the single Cadence import + `verify()` line.
7. **Final CTA** – Restate promise, link to dashboard, docs, and contracts.

When adding new sections, choose one of these buckets (Protocol surfaces, How it works, Architecture, For operators, Integration) so the page doesn’t feel like a random assortment of AI feature cards.

### Dashboards & operator views

Group dashboards into clear blocks instead of many free-floating cards:

- **Overview** – Wallet, credential status, high-level risk score.
- **Risk & anomalies** – Risk factors, anomaly monitor, AI summaries.
- **Rules & jurisdiction** – RuleEngine state, jurisdictions, regulatory radar.
- **Automation & agents** – Flow agents, scheduled transactions, A2A orchestrations.
- **Audit & export** – Logs, exports, compliance evidence.

Use headings and small caps labels (e.g. “ON-CHAIN DATA”, “AI ANALYSIS”, “FLOW PRIMITIVES”) to clarify each block.

---

## Visual system

### Color & theme

- **Base**: Dark background (`#060e09` / `#050b08`), high contrast text where needed.
- **Primary accent (emerald)** – On-chain, cryptography, compliance:
  - Credentials, compliance status, contracts, Flow primitives.
  - Buttons and chips related to “real protocol actions”.
- **Secondary accent (violet)** – AI & agents only:
  - Agent orchestration, Copilot, AI anomaly summaries.
  - Do **not** apply violet globally; keep it scoped to “agent” surfaces.
- **Status colors**:
  - Green: compliant / healthy / live.
  - Amber: warning, gaps, “monitor”.
  - Red: critical issues, anomalies, failed checks.

Never introduce random additional accent colors. If you must add emphasis, vary opacity, borders, or subtle gradients of existing accents.

### Chrome & on-chain cues

Always make it obvious that FlowShield is on-chain:

- Show **network + contract** in at least the nav and one hero/dApp surface:
  - Example: `Flow Testnet · 0x93c6…5493` linking to Flowscan.
- Use **live dots** sparingly:
  - One or two “LIVE” indicators (e.g. nav trust strip, operator Overview) are enough.
- Use **glass / card patterns** consistently:
  - Global glass token patterns similar to `glass` / `glassInner`.
  - Avoid inventing many new card styles.

If you add new chrome elements (e.g. sidebars, pill rows), align them with existing card radius, borders, and blur values.

### Motion & animation

- Motion should feel **restrained and purposeful**, not noisy.
- Use Framer Motion mostly for:
  - Hero entrance transitions.
  - Section fade/slide-in on scroll.
  - Small floating or pulsing indicators for “live” or agent activity.
- Avoid:
  - Excessive parallax.
  - Bouncy or playful easing curves.
  - Animations that distract from the headline or on-chain trust strip.

If adding new animations, prefer simple `opacity` + small `y` transitions with smooth ease.

---

## Copy & messaging

### Voice & style

- Be specific: mention **Flow, Cadence, FlowEVM, ZK, RuleEngine, ComplianceAction**.
- Avoid generic phrases like “AI-powered future of finance” without concrete tie-in.
- Use short, declarative sentences for key claims:
  - “Identity never touches the chain.”
  - “Smart contracts get a single on-chain boolean: compliant or not.”
  - “Agents keep rules synced with live regulations.”

### Hero & CTAs

- Hero subtitle should be a **single promise + single proof**, not a list of features.
- Primary CTA on landing = **“Launch dApp”** (or equivalent wallet/dApp language).
- Secondary CTA near hero = **“View live contracts”** (link to Flowscan) or **“Read the architecture”** (docs).
- Avoid “Get started with AI”, “Try the assistant”, or other generic AI CTAs as the primary action.

### Product naming on landing

When mentioning features:

- Always pair the name with its role:
  - “Regulatory Radar — On-chain rule engine + AI context.”
  - “Compliance Scanner — Static analysis for smart contracts.”
  - “ZK Verification — Client-side proof, on-chain boolean.”
  - “Builder Copilot — AI assistant with on-chain context.”
- Clarify **who** each is for when helpful:
  - Protocol dev, compliance operator, risk team, etc.

---

## Anti-patterns to avoid (“AI slop”)

Avoid these patterns when designing or editing FlowShield surfaces:

- **Vague, hypey copy**
  - Bad: “The AI future of DeFi compliance.”  
  - Better: “On-chain compliance checks with zero-knowledge proofs and Flow agents.”
- **Random gradients and blobs with no meaning**
  - Do not add generic gradient orbs that don’t tie to on-chain concepts.
  - Every major visual should correspond to something real: credentials, rules, agents, blocks, flows.
- **Fictional dashboards with impossible or inconsistent numbers**
  - Keep numbers realistic (e.g. risk scores 0–100, 5 jurisdictions, 7 contracts).
  - Ensure the same address, jurisdictions, and contract IDs line up across sections.
- **Overusing AI framing**
  - FlowShield is not “just an AI app”; it’s a compliance protocol plus AI agents.
  - Don’t let “AI” dominate headlines; the hero promise should be about **compliance, privacy, and DeFi**.

If you notice a proposed change drifting into “generic AI SaaS” territory, adjust:

- Increase references to real on-chain pieces (contracts, addresses, ZK pipeline).
- Reduce AI buzzwords and refocus on protocol mechanics.

---

## How to apply this in practice

When working on FlowShield UI:

1. **Identify the surface**
   - Landing hero, dApp frame, protocol surfaces, dashboards, or marketing copy.
2. **Check the core promise is visible**
   - Can a new visitor see “DeFi compliance on Flow, privacy-preserving, ZK + agents” in one glance?
3. **Ensure on-chain cues are present**
   - Network, contract, and/or live status visible in or near top-of-page/chrome.
4. **Align with color and motion rules**
   - Emerald for protocol/compliance, violet for agents, dark backgrounds, restrained motion.
5. **Sanity check copy**
   - Remove vague AI fluff; keep it concrete, protocol-oriented, and consistent with docs.

If in doubt between a more “flashy AI” design and a calmer “protocol dashboard” design, **choose the protocol dashboard version.**

