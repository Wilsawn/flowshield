# FlowShield — UI PRD (All Pages)

Strict specification for every page and component in the FlowShield frontend. If it's not in this doc, it doesn't go on the page.

---

## 0. Product context

**FlowShield** is a compliance plugin for DeFi protocols on Flow blockchain. NOT a generic SaaS dashboard.

**Audience:**
- **Primary:** DeFi developers building on Flow (Cadence/FlowEVM)
- **Secondary:** Compliance operators at DeFi protocols
- **Tertiary:** End users (passkey onboarding)

---

## 1. Tech stack & documentation references

Use these docs as the source of truth when implementing. Always reference the latest API.

### Frontend

| Library | Version | Docs |
|---------|---------|------|
| React | 19.x | [react.dev](https://react.dev) |
| TypeScript | 5.9.x | [typescriptlang.org/docs](https://www.typescriptlang.org/docs/) |
| Vite | 6.x | [vite.dev](https://vite.dev) |
| Tailwind CSS | 3.4.x | [v3.tailwindcss.com/docs](https://v3.tailwindcss.com/docs/installation) |
| Framer Motion (Motion) | 12.x | [motion.dev/docs](https://motion.dev/docs) |
| React Router | 7.x | [reactrouter.com](https://reactrouter.com/) |
| Radix UI Primitives | latest | [radix-ui.com/primitives](https://www.radix-ui.com/primitives) |
| React Flow (@xyflow/react) | 12.x | [reactflow.dev](https://reactflow.dev) |
| Lucide React | 0.469.x | [lucide.dev](https://lucide.dev) |
| Recharts | 2.15.x | [recharts.org](https://recharts.org/) |
| class-variance-authority | 0.7.x | [cva.style](https://cva.style/docs) |
| tailwind-merge | 2.6.x | [github.com/dcastil/tailwind-merge](https://github.com/dcastil/tailwind-merge) |
| @onflow/fcl | 1.21.x | [developers.flow.com](https://developers.flow.com/) |
| @supabase/supabase-js | 2.98.x | [supabase.com/docs](https://supabase.com/docs) |

### shadcn/ui (pattern reference — use this when building UI)

FlowShield is **aligned with the shadcn/ui stack** in practice: **Tailwind + Radix primitives + `class-variance-authority` + `tailwind-merge` + `cn()`** (`frontend/src/lib/utils.ts`). We do **not** need to match shadcn’s default light/zinc theme; we **re-skin** every component to **§2** (dark `#060e09` / `#0a1410`, **emerald-only** accent).

| Resource | URL | How to use |
|----------|-----|------------|
| **Components & docs** | [ui.shadcn.com](https://ui.shadcn.com) | **Primary reference** for new pieces: Dialog, Dropdown, Tabs, Tooltip, Form patterns, accessibility defaults. Prefer **adapting** their markup/API to existing `frontend/src/components/ui/*` rather than inventing one-off patterns. |
| **Themes / charts** | [ui.shadcn.com/charts](https://ui.shadcn.com/charts) | Recharts-based examples; keep chart strokes minimal per §3.2 (no chartjunk). |
| **CLI (optional)** | [ui.shadcn.com/docs/installation](https://ui.shadcn.com/docs/installation) | If you add the CLI, point it at this Vite + React + Tailwind repo and **merge** generated files into `components/ui` — then replace colors with PRD tokens. |

**Rule:** Treat shadcn as the **implementation cookbook**; treat **`UI_PRD.md` §2–3** as the **brand and motion law**. Never ship shadcn’s default purple/slate accents on FlowShield surfaces without a PRD update.

### Backend

| Library | Version | Docs |
|---------|---------|------|
| Express | 4.21.x | [expressjs.com](https://expressjs.com/) |
| Helmet | 8.x | [helmetjs.github.io](https://helmetjs.github.io/) |
| Stripe | 20.x | [docs.stripe.com](https://docs.stripe.com/) |
| Anthropic SDK | 0.78.x | [docs.anthropic.com](https://docs.anthropic.com/) |
| @onflow/fcl | 1.13.x | [developers.flow.com](https://developers.flow.com/) |

### Icons

**Primary:** Lucide React — already installed, consistent stroke style, 1400+ icons.
**Rule:** Use Lucide for all icons. Do not add Heroicons, Phosphor, or Font Awesome. One icon library = consistency.
**Sizes:** `w-4 h-4` inline, `w-5 h-5` in feature cards, `w-3.5 h-3.5` in small labels. Never larger than `w-6 h-6`.
**Color:** `text-white/40` default, `text-emerald-400` for active states.

---

## 2. Design constraints (non-negotiable, all pages)

### 2.1 Color palette

| Token | Hex | Usage |
|-------|-----|-------|
| Background | `#060e09` | Page background. One color. No gradients on the body. |
| Panel | `#0a1410` | Cards, code blocks, elevated surfaces |
| Emerald | `#34d399` | Compliance actions, CTAs, status = compliant. The ONLY accent. |
| White at opacity | `white/90` → `white/15` | All text. No colored text except emerald for actions. |
| Status amber | `#fbbf24` | Warnings only |
| Status red | `#f87171` | Errors only |

**DO NOT:** Add violet, purple, blue, cyan, or any other accent color. Violet is only for agent badge labels inside the app (e.g. "AI ANALYSIS"), never as backgrounds or borders.

### 2.2 Typography

| Role | Font | Weight | Size |
|------|------|--------|------|
| Hero headline | Syne | 700 | `clamp(2.25rem, 5vw, 3.5rem)` |
| Section headlines | Syne | 600–700 | `clamp(1.5rem, 3.5vw, 2.25rem)` |
| Body text | Inter | 400 | 14–16px |
| Labels / captions | Inter | 500 | 11–12px, uppercase, tracked |
| Code | JetBrains Mono | 400 | 12–13px |
| Stats (numbers) | Inter | 600–700 | 20–28px |

### 2.3 Surfaces & borders

- Cards: `border border-white/[0.06] bg-white/[0.02] rounded-xl`
- Hover on interactive cards: `hover:border-white/[0.10] hover:bg-white/[0.04]`. No glow.
- No hover effects on non-interactive elements.
- Code blocks: `bg-[#0a0f0c] border border-white/[0.08] rounded-xl`
- No `backdrop-blur` on cards. Only on nav bar.

### 2.4 Motion

- **Allowed:** Scroll-triggered opacity + translateY reveals (CSS-based). Nav background transition on scroll.
- **NOT allowed:** Infinite animations, glow pulses, scan lines, letter shimmers, hover glows, scale animations, spring physics on cards, parallax, floating particles, animated background blobs.
- `prefers-reduced-motion: reduce` must disable all animation.

### 2.5 Layout

- Max content width: `max-w-5xl` (1024px) for landing. Dashboard pages use full width with sidebar.
- Section padding: `py-16 md:py-24`. Consistent.
- Horizontal padding: `px-4 sm:px-6`.

---

## 3. Page specs

### 3.1 Landing page (`/`)

**Reference:** Chatbase (text-left, product-right hero), Gumloop (agent showcase), CAIVX (typography-driven), Bird (editorial whitespace)

#### Hero
- Single column, centered
- Code snippet IS the hero visual (2-line Cadence import)
- Stats strip inline below (`7 contracts · 5 jurisdictions · 0% PII on-chain`)
- Badge: `Live on Flow Testnet` pill
- Background: DataGridHero subtle texture. NO GlowOrbs.

#### Sections (in order)
1. Hero (code-first)
2. Powered by Flow marquee
3. Protocol surfaces (Dovetail scroll pattern — left text, right sticky card)
4. How it works (3 steps, alternating grid)
5. Architecture diagram (React Flow, draggable)
6. Full code preview (8–12 line deposit function)
7. FAQ (accordion, `+`/`-` toggle, no chevron rotation)
8. CTA (centered headline + 2 buttons)
9. Footer (4-column links + copyright)

#### Delete from landing
- GlowOrbs component
- Hero "What your protocol gets" card
- `.ui-anim-btn` letter shimmer
- DisplayCards skew (`-skew-y-[8deg]`)
- Scan-line animation on landing
- `whileHover` scale/glow on non-interactive elements

---

### 3.2 Dashboard (`/dashboard`)

**Reference:** CRM dark dashboard (big number stats + delta badges), analytics light (clean bar charts), Linear (empty states)

#### Layout
- Sidebar (left, 224px) + main content area
- Stats row at top: 4 cards, each with: big number, label, delta badge (+9% green or -3% red)
- Data is the decoration — no icons wrapping stats, just numbers
- Charts: clean line/bar charts via Recharts. No grid noise. Colored lines only.
- Tables: tight rows, clear type hierarchy (bold name, muted metadata)

#### Empty state (no data yet)
**Reference:** Linear empty state
- Centered vertically in content area
- Small understated icon (not illustration)
- Bold title (e.g. "No compliance data yet")
- One short paragraph explaining what this page shows
- Primary CTA + secondary link

---

### 3.3 Builder Copilot (`/copilot`)

**Reference:** Gumloop chat (centered greeting + input + recent chats), AI thinking states (checkmarks + text steps)

#### Layout
- Centered main area, max-width ~720px
- Greeting: `Hey [name], how can I help?` — bold, centered
- Input box: bordered, with toolbar below (suggested prompts / actions)
- Recent chats as simple rows below (title + timestamp, no card treatment)

#### AI thinking states
- Show step-by-step progress: `Gathering context` → `Planning` → `Reasoning` → `Synthesizing`
- Each step: emerald checkmark when complete, animated dots when in progress
- Plain text, no decorative animation. No spinner — steps are informational.

#### Messages
- User messages: right-aligned, subtle panel background
- AI messages: left-aligned, no background, just text with good typography
- Code blocks in responses: dark panel, monospace, copy button

---

### 3.4 Operator (`/operator`)

**Reference:** Transaction confirmation UI (key/value rows, structured data), CRM dashboard (charts + tables)

#### Layout
- Full width with sidebar
- Sections: Jurisdiction rules, Monitoring, Anomaly detection, Audit log

#### Data display pattern
- Key/value rows: label left, value right, separated by subtle border
- Like the transaction confirmation UI: structured, no decoration
- Gas fee selector pattern → use for jurisdiction switching (pill toggles)

#### Monitoring results
- Stats as big numbers with `/max` notation (e.g. `2 /4 users`, `6 /10 hours`)
- Grid layout: `grid-cols-2 sm:grid-cols-3 md:grid-cols-6`

---

### 3.5 Pricing (`/pricing`)

**Reference:** Scribbitt pricing (3 cards, big price, bullet features, single CTA per card)

#### Layout
- Heading: "Choose your pricing plan" + subtitle
- 3 cards side by side (stack on mobile)
- Each card: Price in large bold text (`$0`, `$79`, `$299`), "Most Popular" badge on middle tier
- Feature list: simple bullet points. NO check/X icon grid — just text bullets
- Single CTA per card, styled consistently
- Contact sales modal: form stacks on mobile, email validation

#### Plan detail (Gumloop style)
- Show current plan as flat display: plan name (large), price (very large), usage stats as big number + `/max`
- `Credits Remaining` with progress bar
- `Upgrade Plan` button below

---

### 3.6 Onboarding (`/` modal)

**Reference:** LexiAI (split screen auth — branded left, form right)

#### Layout
- Split screen on desktop: left = branded panel (logo + headline + subtle visual), right = form
- On mobile: full-width form, branded panel becomes a small header

#### Flow
1. **Email step:** Email input + "Continue with Passkey" button. Social login options below with "or" divider (if applicable)
2. **Jurisdiction step:** Select jurisdiction (pill toggles or radio buttons, not dropdown)
3. **Passkey creation:** Single fingerprint icon (NOT oversized), "Touch to authenticate" text, subtle pulse (ONE animation, not three)
4. **Success:** Redirect to dashboard

#### Rules
- One question per step. No multi-field forms.
- Progress indicator: simple dots or step numbers at top
- No triple-animation on fingerprint. Single subtle pulse only.
- "Don't have an account? Create one" link at bottom (LexiAI pattern)

---

### 3.7 Docs (`/docs`)

**Reference:** Yellowcake (3-column, dark mode, TOC on right)

#### Layout
- Three columns: left sidebar (page nav), center (content), right (table of contents / on-page anchors)
- On mobile: single column, sidebar becomes hamburger, TOC hidden

#### Left sidebar
- Page list, collapsible sections
- Current page highlighted (emerald text or left border)
- Sticky, scrolls independently

#### Center content
- Breadcrumbs at top (`Home > Quickstart`)
- Large bold page title (Syne)
- Clean heading hierarchy (h1 > h2 > h3)
- Body text: Inter, readable, bold for emphasis
- Code blocks: dark panel, syntax highlighting, copy button
- Max width: ~720px for readability

#### Right sidebar (TOC)
- Lists all h2/h3 on current page
- Highlights current section as user scrolls (scroll spy)
- Sticky

---

### 3.8 Sidebar (all app pages)

**Reference:** Linear (collapsible sections, tight spacing), Gumloop bottom section (credits + user)

#### Structure
```
[Logo FlowShield]
─────────────────
Dashboard
Builder Copilot
Operator
Pricing
Docs
─────────────────
[flex spacer]
─────────────────
Credits Remaining  5.1k
[████████░░] progress bar
[Upgrade Plan] button
─────────────────
[WD] Wilsawn Dideh        ▾
     didehw@gmail.com
```

#### Bottom section (collapsed by default)
When user clicks the arrow/chevron, expand to show:
- Get Help (icon right)
- Resources (chevron right)
- Home Page (icon right)
- Sign out (icon right)

#### Rules
- Width: `w-56` (224px) on desktop, slide-in overlay on mobile
- Nav items: `text-[13px]`, icon + label, active state = `bg-white/[0.07]`
- Bottom section: credits bar + user info + collapsible menu
- No colored backgrounds on sidebar. Just borders + subtle hover.

---

### 3.9 Modals (all pages)

**Reference:** Transaction confirmation UI (key/value rows, two-button footer)

#### Rules
- Width: `max-w-lg` (512px). Centered with backdrop.
- Structure: Header (title) → Content (key/value rows or form) → Footer (Cancel + Primary action)
- Footer buttons: secondary left (outline), primary right (solid)
- Backdrop: `bg-black/60 backdrop-blur-sm`
- No animation beyond simple fade + slight translateY
- Close on backdrop click + escape key

---

### 3.10 Empty states (all pages)

**Reference:** Linear (centered, icon + title + description + CTA)

#### Pattern
```
        [small icon, w-12 h-12, muted]

        Section Title

        One sentence explaining what this
        section shows when there is data.

        [Primary CTA]    [Learn more]
```

#### Rules
- Centered vertically and horizontally in the content area
- Icon: subtle, outline style, `text-white/20`. NOT a large illustration.
- Title: `text-[16px] font-semibold text-white/90`
- Description: `text-[13px] text-white/40`, max-width ~320px, centered
- CTA: standard button, emerald or white depending on context
- No decoration. No gradients. No animation.

---

### 3.11 Legal pages (`/terms`, `/privacy`)

**Low priority.** Already minimal. Keep as-is: simple text pages with heading hierarchy, no sidebar.

---

## 4. Implementation checklist

Before any UI change merges:

- [ ] Uses only emerald + white/opacity? No new accent colors?
- [ ] Syne for headlines only? Inter for body? JetBrains Mono for code?
- [ ] Zero infinite animations?
- [ ] Zero hover effects on non-interactive elements?
- [ ] Works on 375px viewport without horizontal scroll?
- [ ] `prefers-reduced-motion: reduce` disables all animation?
- [ ] Would someone in this codebase for 6 months write this?
- [ ] Does every element serve the user (inform, guide, or enable action)?
- [ ] Uses Lucide icons only? Correct sizes (w-4 for inline, w-5 for cards)?
- [ ] Matches the reference design for that page (see section 3)?
- [ ] Data is the decoration (big numbers, real output, actual UI) — not glows or cards?

---

## 5. Anti-patterns (absolute DO NOTs)

| Pattern | Why it's wrong |
|---------|---------------|
| Purple/blue gradients | Vibe-coded giveaway #1 |
| GlowOrbs / animated blobs | Pure decoration, burns CPU |
| Letter shimmer buttons | Portfolio piece, not a product |
| Skewed cards | Makes text harder to read |
| Hover glow on non-clickable elements | Misleading affordance |
| Generic dashboard preview in hero | User hasn't signed up, it's meaningless |
| Check/X icon grids for features | SaaS template default — use text bullets |
| Oversized illustrations for empty states | Ages poorly, looks generic |
| Multiple icon libraries | Inconsistency. Lucide only. |
| `py-28` or `py-32` | Too much space. `py-16 md:py-24` max. |
