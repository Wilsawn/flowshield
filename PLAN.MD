# Implementation plan — Linkd design reference → FlowShield UI

**Reference:** [try-linkd.com](https://www.try-linkd.com)  
**Product spec:** `docs/UI_PRD.md` (non-negotiable palette, typography, single emerald accent)

**We are working on:** *[FEATURE/BUG — replace this line with your ticket title or short description]*

**Status:** Research framing below; execution steps are atomic checklists only (no implementation in this document).

---

## Assumptions

- Visual parity with try-linkd is **inspiration**, not a 1:1 clone—FlowShield must stay within `docs/UI_PRD.md` unless the PRD is formally updated first.
- If try-linkd uses colors, type, or patterns that conflict with the PRD, steps call out **PRD exception review** before any visual change ships.

---

## Phase A — Reference site research (try-linkd.com)

[ ] **Step A1:** Open [try-linkd.com](https://www.try-linkd.com) in a desktop browser at 100% zoom and record the browser + OS version in your notes.  
**Verification:** Notes file exists with URL, date, and environment.

[ ] **Step A2:** Capture full-page screenshots of the homepage (and any other primary routes reachable from the main nav) at viewport widths **375px**, **768px**, and **1440px**.  
**Verification:** Screenshots saved in a dated folder; filenames include breakpoint (e.g. `linkd-home-1440.png`).

[ ] **Step A3:** List all **above-the-fold** blocks in order (e.g. nav, hero, social proof, product preview, CTA).  
**Verification:** Ordered list matches what appears on the live site without scrolling.

[ ] **Step A4:** Document **navigation** behavior: sticky or static, logo placement, number of links, presence of primary/secondary CTAs, mobile menu pattern.  
**Verification:** Another person can reproduce the same behavior from your description only.

[ ] **Step A5:** Document **typography** on the reference site: perceived heading scale, body size, font families (inspect or font-fallback notes), line length, and letter spacing on hero vs body.  
**Verification:** Each element type (H1, H2, body, caption) has at least one concrete observation (relative size or px/rem if readable).

[ ] **Step A6:** Document **color usage**: background treatment, card/surface treatment, primary CTA color, secondary actions, borders/dividers, and any gradients or imagery overlays.  
**Verification:** Short table: “element → color/opacity → where used.”

[ ] **Step A7:** Document **spacing rhythm**: section vertical padding (qualitative vs reference component), grid/gap feel, and card internal padding vs FlowShield’s current marketing pages.  
**Verification:** At least three sections compared with “tighter / similar / looser” + one numeric estimate where valid.

[ ] **Step A8:** List **motion and interaction** patterns: scroll reveals, hover on cards/buttons, video or Lottie, cursor effects, page transitions.  
**Verification:** Each listed pattern states trigger (e.g. hover, in-view) and observed duration/behavior in words.

[ ] **Step A9:** Inventory **assets**: illustrations, photos, logos, icons style (stroke vs fill), and any 3D or abstract shapes.  
**Verification:** Checklist of asset categories with “present / absent” on try-linkd.

[ ] **Step A10:** Summarize **differentiators** in one paragraph: what makes try-linkd’s marketing feel cohesive (tone, density, clarity).  
**Verification:** Paragraph references at least two concrete observations from A3–A9.

---

## Phase B — FlowShield gap analysis vs PRD

[ ] **Step B1:** Open `docs/UI_PRD.md` and highlight every rule that could **conflict** with try-linkd-inspired changes (colors, gradients, typography, motion limits).  
**Verification:** Bullet list of PRD section references (e.g. “§2.1 Color palette”) with “compliant / needs exception.”

[ ] **Step B2:** For each PRD conflict from B1, decide **adopt reference / keep PRD / defer** and log the decision owner (role or name).  
**Verification:** Decision log has no “TBD” without a follow-up date.

[ ] **Step B3:** Map try-linkd sections (from A3) to FlowShield routes/pages where equivalent content should live (e.g. `/`, `/pricing`, `/docs`).  
**Verification:** Table: try-linkd block → FlowShield path → exists today (yes/no).

[ ] **Step B4:** List **components** on FlowShield that must change for *[FEATURE/BUG]*, referencing both try-linkd observations and `UI_PRD` (file paths only, no code).  
**Verification:** Each component has “current issue” + “target behavior” in one sentence each.

---

## Phase C — Design specification (no code)

[ ] **Step C1:** Write a **one-page visual spec** for the scope of *[FEATURE/BUG]*: section order, hierarchy, CTA labels intent, and responsive behavior at the three breakpoints.  
**Verification:** Designer or reviewer signs off with a comment or checkbox in the doc.

[ ] **Step C2:** Define **acceptance criteria** as user-visible outcomes (e.g. “Primary CTA visible without scroll on 375px,” “Focus order logical”).  
**Verification:** Each criterion is testable by a manual pass with pass/fail.

[ ] **Step C3:** If PRD exceptions are needed, add a short **PRD amendment checklist** (what changes, why, impact on other pages).  
**Verification:** `UI_PRD.md` update is either scheduled as its own task or explicitly marked out of scope.

---

## Phase D — Implementation checklist (engineering)

Complete in order unless steps are explicitly parallelizable. Replace *[FEATURE/BUG]* with your scoped work.

[ ] **Step D1:** Create a git branch named for *[FEATURE/BUG]* per team convention.  
**Verification:** `git status` shows the new branch; remote tracking set if required by team.

[ ] **Step D2:** Identify every file that **must** be touched for the UI change (React pages, layout, shared components, CSS tokens).  
**Verification:** List reviewed in PR description; no unrelated files.

[ ] **Step D3:** Apply layout/structure changes per C1 on the scoped page(s) only.  
**Verification:** Local dev server: page loads with no console errors; layout matches spec at 375 / 768 / 1440.

[ ] **Step D4:** Align typography and spacing with spec while respecting `UI_PRD.md` (Syne, clamp sizes, section rhythm).  
**Verification:** Side-by-side with spec: headings and body match intended scale; PRD font rules satisfied or exception documented.

[ ] **Step D5:** Align colors and surfaces with PRD tokens (`#060e09`, `#0a1410`, emerald accent only for primary actions).  
**Verification:** Visual spot-check against §2.1; no new accent colors unless PRD amended.

[ ] **Step D6:** Implement or adjust **responsive** nav and stacking order per C1.  
**Verification:** Keyboard-only navigation through nav works; mobile menu opens/closes accessibly if applicable.

[ ] **Step D7:** Add or adjust **motion** only within PRD limits; prefer reduced-motion respect if PRD specifies.  
**Verification:** OS “reduce motion” on: no essential information hidden; animations degrade gracefully.

[ ] **Step D8:** Run **accessibility** spot checks: contrast on text/CTAs, focus visible, heading order, alt text for new images.  
**Verification:** Document results (tool name + pass/fail) in PR or ticket comment.

[ ] **Step D9:** Cross-page **regression**: open adjacent routes (same layout shell) and confirm no global CSS/layout breakage.  
**Verification:** Checklist of URLs visited with OK/not OK.

[ ] **Step D10:** Update **docs**: if user-facing copy or IA changed, sync `docs/UI_PRD.md` or docs site per team process.  
**Verification:** Doc PR linked or same PR includes doc edits; reviewer confirms accuracy.

---

## Phase E — Verification & ship

[ ] **Step E1:** Run automated tests defined in the repo (`frontend` test script / CI) for the affected packages.  
**Verification:** CI green locally or on remote; failures triaged or fixed before merge.

[ ] **Step E2:** Peer review: at least one reviewer compares implementation to Phase C acceptance criteria.  
**Verification:** Approval on PR with explicit note that criteria were checked.

[ ] **Step E3:** Merge and deploy per release process; smoke-test production URL for scoped pages.  
**Verification:** Post-deploy checklist signed; rollback path known if failure.

---

## References

- [try-linkd.com](https://www.try-linkd.com) — visual reference (audit Phase A).
- `docs/UI_PRD.md` — FlowShield UI source of truth.
