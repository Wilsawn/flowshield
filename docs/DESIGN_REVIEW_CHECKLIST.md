# Post-implementation design review (non–“AI slop” bar)

Run this **after every UI implementation or meaningful visual change** in FlowShield. Goal: ship pages that feel like **intentional product design** (Linear, Vercel, well-crafted B2B SaaS), not generic LLM template output.

**Sources of truth (read first):**

- `docs/UI_PRD.md` — non-negotiable palette, motion, surfaces, per-page specs.
- **[shadcn/ui](https://ui.shadcn.com)** — **component patterns** (Radix + Tailwind) when adding dialogs, menus, tabs, forms; re-theme to PRD §2 (see `UI_PRD.md` → “shadcn/ui (pattern reference)”).
- This checklist — **quality bar** and how to verify it in a real browser.

---

## 1. How to “browse” the design (required)

1. Start the app: from `frontend/`, `npm run dev` (or your usual command).
2. **Cursor Browser** (or your system browser): open the **exact routes you changed** (e.g. `/dashboard`, `/operator`, `/copilot`, `/pricing`).
3. Check **three widths**: ~390px, ~768px, ~1280px.
4. If you use **macOS “Reduce motion”** or equivalent: confirm nothing essential breaks (PRD requires respecting `prefers-reduced-motion`).

You cannot pass this review from code diff alone — you need a **rendered** pass.

---

## 2. Rubric: reads “premium startup” vs “AI slop”

Score each area **Pass / Fix**. If any **Fix**, iterate before merging.

| Area | Pass (startup-quality) | Slop (fix) |
|------|------------------------|------------|
| **Thesis** | One clear job per screen; hierarchy obvious in 3 seconds. | Walls of equal-weight cards; ten CTAs; buzzword soup. |
| **Color** | PRD tokens only; emerald = primary actions; amber/red = status only. | Extra purple/blue/cyan gradients; rainbow accents; neon glows. |
| **Type** | Clear scale: title → meta → body; `tabular-nums` on numbers. | Same size everywhere; mushy gray; no rhythm. |
| **Density** | Breathing room + aligned grid; data-forward where it’s a dashboard. | Cramped OR empty with decorative filler; random margins. |
| **Surfaces** | `border-white/[0.06]`, `bg-white/[0.02]`, `rounded-xl`; hover only on interactive things. | Glass on everything; hover glow on static blocks; inconsistent radii. |
| **Motion** | None or minimal per PRD §2.4; no infinite decorative loops. | Orbs, pulses, springs on cards, parallax, shimmer spam. |
| **Proof** | Real structure: rows, stats, tables, states that match the product. | Stock three-icon feature grid with “Seamless / Powerful / Scale”. |
| **Chrome** | Nav/sidebar consistent with Layout; one pattern for pills/buttons. | Mix of 5 button styles; mismatched icon sets. |

**Reference aesthetics (inspiration, not copy):** restrained marketing shells (Linkd-style calm), CRM/analytics clarity, Gumloop-level **structure** — not their colors unless PRD changes.

---

## 3. FlowShield-specific checks (from `UI_PRD.md`)

- [ ] **§2.1–2.3** Background `#060e09`, panels `#0a1410` where specified; **no** extra accent colors.
- [ ] **§2.3** No `backdrop-blur` on cards; only nav bar where allowed.
- [ ] **§2.4** No forbidden motion; dashboard stats = **numbers first**, not decorativeviz.
- [ ] **§3.2 Dashboard** Stats behave like CRM (big number, label, delta where applicable); empty states calm and actionable.
- [ ] **§3.3 Copilot** Centered column, step-style thinking states, no spinner-as-personality.
- [ ] **§3.4 Operator** Key/value discipline, structured monitoring.
- [ ] **§3.5 Pricing** Clear tiers, text bullets — no cheesy icon grids per PRD.

---

## 4. Completion record (for PRs)

In the PR description or a comment, add:

```text
Design review: [ ] Cursor Browser (or browser) pass at 390 / 768 / 1280
Routes checked: …
DESIGN_REVIEW_CHECKLIST.md: Pass | Fixes: …
UI_PRD.md violations (if any): None | See: …
```

---

## 5. When Cursor Agent implements UI

Agents should:

1. Implement against `UI_PRD.md`.
2. **Run this checklist** in Cursor Browser on `localhost` before signing off.
3. If automated fetch of external sites fails, **do not** substitute guessing — use this doc + PRD.
