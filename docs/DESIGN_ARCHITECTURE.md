# FlowShield — Design architecture

Single reference for how design is structured: design system, tokens, components, and where to change things.

---

## 1. Design system (source of truth)

**Location:** `.cursor/skills/flowshield-design/SKILL.md`

- **Vibe:** DeFi/protocol compliance, not generic AI SaaS. Audience: protocol teams, operators, compliance.
- **Colors:**
  - **Primary (emerald):** Compliance, on-chain, credentials, protocol actions. `#34d399` / Tailwind `emerald-500`.
  - **Secondary (violet):** AI & agents only (Copilot, Regulatory Radar AI, A2A, ZK badge). Scoped, not global.
  - **Status:** Green = compliant/live, Amber = warning, Red = critical.
- **Surfaces:** Dark base `#060e09` / `#050b08`; panels/cards `#0a1410`. Glass/card patterns with emerald borders and blur.
- **Motion:** Restrained (Framer Motion for hero/section; no bouncy or noisy animation).
- **Copy:** Concrete (Flow, Cadence, ZK, RuleEngine); avoid vague AI fluff.

Use this skill when editing landing, dashboards, or marketing UI so changes stay on-brand.

---

## 2. Tokens & CSS layers

**File:** `frontend/src/index.css`

### 2.1 `:root` variables

| Token | Purpose |
|-------|--------|
| `--background`, `--foreground` | Body and text (Tailwind `bg-background`, `text-foreground`) |
| `--card`, `--card-foreground` | Cards (Tailwind `bg-card`) |
| `--primary`, `--primary-foreground` | Primary actions (emerald) |
| `--border`, `--input`, `--ring` | Borders, inputs, focus ring |
| `--radius` | Base radius (0.75rem); Tailwind `rounded-lg/md/sm` derive from it |
| `--emerald`, `--cyan` | Raw accent hex for gradients |
| `--flowshield-bg` | Page background `#060e09` |
| `--flowshield-bg-darker` | Darker areas `#050b08` |
| `--flowshield-panel` | Panels/modals `#0a1410` |
| `--elevation-surface` | Subtle surface lift (e.g. cards on page) |
| `--elevation-card` | Card shadow |
| `--elevation-dropdown` | Dropdowns, popovers |
| `--elevation-modal` | Modals, dialogs |
| `--elevation-toast` | Toasts, floating notices |

Prefer these (or Tailwind’s `bg-background`, `bg-card`, etc.) for new code instead of hardcoding `#060e09` / `#0a1410`.

### 2.2 Layers

- **@layer base:** `:root`, `body` (Inter, antialiased), `.font-display` (Syne for hero/section titles), number-input reset.
- **@layer components:** `.gradient-border`, `.bento-card`, `.code-window`, etc.
- **@layer utilities:** `.glass`, `.glass-subtle`, `.glass-card`, `.glow-green`, `.gradient-text`, typography (`.text-display`, `.text-headline`, `.text-body-lg`, `.text-caption`, `.text-mono-sm`), `.mesh-gradient`, `.flowshield-pattern`, animations (e.g. `scan-pulse`, `marquee-scroll`).

**Global pattern:** `.flowshield-pattern` — subtle emerald grid (e.g. landing sections).

---

## 3. Tailwind theme

**File:** `frontend/tailwind.config.js`

- **Colors:** All semantic colors map to `hsl(var(--…))` (background, foreground, primary, card, border, etc.).
- **Border radius:** `lg` / `md` / `sm` from `var(--radius)`.
- **Animations:** `float`, `scan-pulse`, `slide-in-right` (keyframes in `index.css`).
- **Plugins:** `@tailwindcss/typography`.

No extra accent colors in theme; use Tailwind’s `emerald-*` and `violet-*` as per the skill.

---

## 4. Typography & fonts

**Loaded in:** `frontend/index.html` (Google Fonts)

- **Inter:** Body (400–800). Used in `body` in `index.css`.
- **Syne:** Display/headlines. Applied via `.font-display` in `index.css`; use on hero and section titles (e.g. landing, 404, Pricing).
- **JetBrains Mono:** Code. Used by `.text-mono-sm` and code blocks.

**Presets in `index.css`:** `.text-display`, `.text-headline`, `.text-title`, `.text-body-lg`, `.text-caption`, `.text-mono-sm`.

---

## 5. Component structure

```
frontend/src/
├── App.jsx              # Routes, RequireAuth, ErrorBoundary, ToastProvider
├── main.jsx
├── index.css             # Tokens, layers, utilities, React Flow overrides
├── pages/                # Route-level pages (index, dashboard, copilot, operator, pricing, terms, privacy, NotFound)
├── components/
│   ├── Layout.jsx        # App chrome: sidebar, nav, backend status, mobile menu
│   ├── ui/               # Primitives: button (CVA), card (glass), input, badge, progress, marquee, spotlight-card, etc.
│   ├── dashboard/        # Dashboard-specific: StatsRow, ActionCards, ComplianceOverlay, modals, etc.
│   ├── VerificationPanel, OnboardingFlow, BuilderCopilot, OperatorDashboard
│   ├── ProductShowcase, RegulatoryRadar, FlowAutomation, GovernancePanel
│   ├── GlowOrbs, FlowShieldLogo, ErrorBoundary, Toast (via ToastContext)
│   └── ...
├── contexts/
│   └── ToastContext.jsx  # toast.success / toast.error, 4s dismiss
└── hooks/                # useDashboardData, useChainData, useOperatorData, etc.
```

- **UI primitives:** Prefer `components/ui/` (Button, Card, Input, Badge) and semantic tokens so new screens stay consistent.
- **Glass/cards:** CSS has `.glass`, `.glass-card`; landing also uses inline constants `glass` / `glassInner` in `pages/index.jsx`. For new sections, prefer the CSS classes or a shared constant so there’s one source of truth.
- **Violet:** Only in agent/AI surfaces (OnboardingFlow ZK badge, RegulatoryRadar AI source, OperatorDashboard “AI ANALYSIS”, ProductShowcase A2A node, landing agent block, FlowAutomation). Do not use violet for generic UI.

---

## 6. Page-level patterns

- **Landing (`index.jsx`):** Hero (Syne + promise + CTAs) → dApp preview → Protocol surfaces (emerald/violet by type) → How it works → Architecture (ProductShowcase) → Integration snippet → Testimonials/FAQ → Footer (legal, live metrics). Uses `glass` / `glassInner` and `.flowshield-pattern`.
- **Dashboard/Operator/Copilot:** Layout sidebar + main content; blocks for Overview, Risk, Rules, Automation, Audit. Headings and small caps (e.g. “ON-CHAIN DATA”, “AI ANALYSIS”) separate blocks.
- **Legal (terms, privacy):** Minimal chrome; back to `/`; same `#060e09` and typography.
- **404:** Compliance-themed copy, Syne, emerald CTA, `type="button"` on primary button.

---

## 7. Consistency checklist

When adding or changing UI:

1. **Color:** Emerald for protocol/compliance, violet only for agent/AI, status green/amber/red. No new accent colors.
2. **Backgrounds:** Prefer `var(--flowshield-bg)` / `var(--flowshield-panel)` or Tailwind `bg-background` / `bg-card`; avoid new hardcoded hex unless matching the skill.
3. **Cards/glass:** Use existing `.glass*` or the shared landing glass pattern; same radius and border style.
4. **Type:** Headlines use `.font-display` (Syne); body Inter; code JetBrains Mono.
5. **Motion:** Subtle opacity/y transitions; no bouncy or distracting animation.
6. **Copy:** Align with the skill (concrete, protocol-focused, no vague AI hype).
7. **Elevation:** Use `.elevation-card`, `.elevation-modal`, `.elevation-dropdown`, `.elevation-toast` (or `var(--elevation-*)`) instead of ad hoc shadows so hierarchy stays consistent.

### Component state coverage

Before marking a new or changed **interactive** component done, ensure these states are covered where relevant:

| State    | When required | Notes |
|----------|----------------|--------|
| Hover    | Clickable/tappable elements | Use existing transition patterns (e.g. `hover:bg-emerald-500/[0.08]`). |
| Focus    | Buttons, links, inputs, custom controls | Visible focus ring (e.g. `focus-visible:ring-2 focus-visible:ring-ring`). |
| Disabled | Buttons, inputs that can be disabled | Reduced opacity + `disabled:pointer-events-none`; clear visual difference. |
| Error    | Forms, destructive actions | Use `destructive` or red accent; pair with toast or inline message. |
| Loading  | Async actions (submit, fetch) | Spinner or skeleton; disable primary action while loading. |
| Empty    | Lists, dashboards, feeds | Empty-state copy + CTA (e.g. "No items yet" + "Add first"). |

If a core component (button, input, card link, modal trigger) is missing focus or disabled handling, treat it as draft until added.

---

## 8. Optional next steps

- **Unify glass:** Replace inline `glass` / `glassInner` in `index.jsx` with CSS classes (e.g. `.glass-flowshield`, `.glass-flowshield-inner`) in `index.css` so one place controls the pattern.
- **Use tokens in components:** Gradually replace remaining `#060e09` / `#0a1410` with `var(--flowshield-bg)` / `var(--flowshield-panel)` or Tailwind utilities that map to them (if you add those to `tailwind.config.js`).
- **Dark-only:** Design is dark-only; no theme toggle. If you add light mode later, move hex values into `[.dark]` or theme classes and keep tokens as the single source.
