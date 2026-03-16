# Design Components Implementation Guide

How to implement the SaaS design research findings using reusable components. Each pattern maps to a component you can build and compose on the landing page.

---

## 1. Component Map: Research → Implementation

| Research Pattern | Component | Location | Priority |
|------------------|-----------|----------|----------|
| Stats / metrics block | `StatsStrip` | After hero | High |
| Section label (uppercase) | `SectionLabel` | All sections | High |
| Feature icon cards | `FeatureCard` | Protocol surfaces, use cases | Medium |
| Trust / logo strip | `LogoStrip` | After protocol surfaces | Medium |
| Use-case tiles | `UseCaseGrid` | Alternative to protocol tabs | Medium |
| Testimonial quote | `TestimonialCard` | Later | Low |
| Customer story | `CustomerStory` | Later | Low |

---

## 2. Component Specifications

### 2.1 `StatsStrip` (Metrics Section)

**Source:** Seamless, Curvance, Stripe, Slack

**Purpose:** Display key protocol metrics in a horizontal strip. No card treatment—just numbers + labels.

**Props:**
```tsx
interface StatsStripProps {
  stats: Array<{
    value: string | number
    label: string
    sub?: string
  }>
  className?: string
}
```

**Structure:**
```
┌─────────────────────────────────────────────────────────────┐
│  7 contracts    ·    5 jurisdictions    ·    0% PII on-chain │
└─────────────────────────────────────────────────────────────┘
```

**Implementation:**
- Use `flex` or `grid` with `gap-8` or `gap-12`
- Each stat: `value` (large, bold) + `label` (small, muted)
- Optional: subtle `border-t border-b border-white/[0.06]` for separation
- No background card—transparent on page background

**Placement:** Right after hero, before protocol surfaces. Or inline in hero footer.

**Example data:**
```tsx
const stats = [
  { value: '7', label: 'Contracts deployed' },
  { value: '5', label: 'Jurisdictions' },
  { value: '0%', label: 'PII on-chain' },
]
```

---

### 2.2 `SectionLabel` (Uppercase Label)

**Source:** All companies—consistent small-caps section headers

**Purpose:** Reusable label for section headers. "PROTOCOL SURFACES", "HOW IT WORKS", etc.

**Props:**
```tsx
interface SectionLabelProps {
  children: React.ReactNode
  className?: string
}
```

**Styles:**
- `text-[11px]` or `text-[12px]`
- `font-medium tracking-[0.08em] uppercase`
- `text-white/35` or `text-white/30`
- `mb-3` or `mb-4`

**Implementation:** Single-line component. Use above every `h2` section heading.

---

### 2.3 `FeatureCard` (Icon + Title + Description)

**Source:** Curvance, ChainFund, Stripe product pillars

**Purpose:** Icon card for features. Used in protocol surfaces or a "Why FlowShield" grid.

**Props:**
```tsx
interface FeatureCardProps {
  icon: LucideIcon
  title: string
  description: string
  className?: string
}
```

**Structure:**
```
┌─────────────────────────┐
│  [icon]                 │
│  Title                  │
│  Short description.      │
└─────────────────────────┘
```

**Styles:**
- `rounded-xl border border-white/[0.06] bg-white/[0.02]`
- `p-5` or `p-6`
- Icon: `w-8 h-8 rounded-lg bg-white/[0.06]` or similar
- Title: `text-[14px] font-medium text-white/90`
- Description: `text-[13px] text-white/35 leading-[1.6]`

**Avoid:** Heavy gradients, multiple borders. Keep minimal.

---

### 2.4 `LogoStrip` (Trust Strip)

**Source:** Layzo, Aave, Notion, Slack

**Purpose:** "Trusted by" or "Built for" with logos. Horizontal scroll on mobile.

**Props:**
```tsx
interface LogoStripProps {
  title?: string  // e.g. "Built for Flow protocols"
  logos: Array<{
    name: string
    url?: string
    logo?: string | ReactNode  // image src or component
  }>
  className?: string
}
```

**Structure:**
```
Built for Flow protocols

[Flow] [Dapper] [Blocto] ... (grayscale, hover: full color)
```

**Styles:**
- Title: `text-[12px] font-medium text-white/30 uppercase tracking-wider`
- Logos: `opacity-40 hover:opacity-70` or grayscale filter
- `flex gap-8 items-center overflow-x-auto` for horizontal scroll

**Placement:** After protocol surfaces or before FAQ.

---

### 2.5 `UseCaseGrid` (Persona / Use Case Tiles)

**Source:** Seamless ("LTs for Loopers"), Notion (use-case tiles), Loom (Sales, Engineering, Support)

**Purpose:** "For protocols / For operators / For end users" — clickable tiles that scroll to section or filter content.

**Props:**
```tsx
interface UseCaseGridProps {
  cases: Array<{
    id: string
    label: string
    description: string
    onClick?: () => void
  }>
  className?: string
}
```

**Structure:**
```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ For protocols │ │ For operators │ │ For end users │
│ Lending, DEXs │ │ Compliance    │ │ Passkey       │
└──────────────┘ └──────────────┘ └──────────────┘
```

**Styles:**
- Grid: `grid grid-cols-1 md:grid-cols-3 gap-4`
- Each tile: `rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 text-left`
- Hover: `hover:border-white/[0.08] hover:bg-white/[0.04]`
- No heavy card treatment

---

### 2.6 `TestimonialCard` (Quote Card)

**Source:** Linear, Loom, Slack

**Purpose:** Customer quote with name, title, optional avatar.

**Props:**
```tsx
interface TestimonialCardProps {
  quote: string
  author: string
  title: string
  company?: string
  avatar?: string
  className?: string
}
```

**Placement:** Later, when you have real testimonials. After FAQ or before final CTA.

---

## 3. File Structure

```
frontend/src/components/
├── landing/
│   ├── StatsStrip.tsx       # Metrics section
│   ├── SectionLabel.tsx    # Uppercase section label
│   ├── FeatureCard.tsx     # Icon + title + description
│   ├── LogoStrip.tsx       # Trust strip
│   ├── UseCaseGrid.tsx     # Persona tiles
│   └── TestimonialCard.tsx # Quote (later)
├── ui/
│   ├── button.tsx          # existing
│   ├── card.tsx            # existing
│   └── ...
```

---

## 4. Implementation Order

### Phase 1: Quick wins (1–2 hours)
1. **SectionLabel** — Extract the repeated `motion.p` pattern into a component.
2. **StatsStrip** — Add metrics section after hero with "7 contracts · 5 jurisdictions · 0% PII".

### Phase 2: Structure (2–3 hours)
3. **FeatureCard** — Use for a "Why FlowShield" grid or refine protocol surface cards.
4. **UseCaseGrid** — Add "For protocols / operators / end users" section.

### Phase 3: Trust (1–2 hours)
5. **LogoStrip** — Add Flow ecosystem logos when you have them.

### Phase 4: Later
6. **TestimonialCard** — When you have quotes from protocol teams.

---

## 5. Page Integration (index.tsx)

**Current order:**
```
Hero → Protocol surfaces → How it works → Architecture → Integration → FAQ → CTA
```

**With new components:**
```
Hero
StatsStrip          ← NEW
Protocol surfaces
UseCaseGrid        ← NEW (optional, or merge with protocol surfaces)
How it works
Architecture
Integration
LogoStrip          ← NEW (optional)
FAQ
CTA
```

---

## 6. Design Tokens (Reuse)

Use existing FlowShield tokens:

| Token | Value | Use |
|-------|-------|-----|
| `bg-page` | `#070c09` | Section backgrounds |
| `border-subtle` | `border-white/[0.06]` | Cards, dividers |
| `text-primary` | `text-white/90` | Headlines |
| `text-secondary` | `text-white/35` | Body |
| `text-muted` | `text-white/20` | Labels |
| `accent` | `text-emerald-400` | Status, CTAs |

---

## 7. Anti-Patterns (Avoid)

- **Card overload** — StatsStrip should NOT be in cards. Just numbers + labels.
- **Gradient blobs** — No random gradients. Use `emerald` only where it means something.
- **New accent colors** — Stick to emerald + white/opacity.
- **Heavy borders** — `white/[0.06]` to `white/[0.12]` max.
- **Bouncy motion** — Use `opacity` + small `y` only.

---

## 8. Example: StatsStrip Implementation

```tsx
// frontend/src/components/landing/StatsStrip.tsx
import { motion } from 'framer-motion'

interface Stat {
  value: string
  label: string
}

export default function StatsStrip({ stats }: { stats: Stat[] }) {
  return (
    <motion.div
      className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4 py-8 border-y border-white/[0.06]"
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      {stats.map((stat, i) => (
        <div key={i} className="flex items-baseline gap-2">
          <span className="text-[20px] font-semibold tracking-tight text-white/90">
            {stat.value}
          </span>
          <span className="text-[13px] text-white/35">{stat.label}</span>
        </div>
      ))}
    </motion.div>
  )
}
```

**Usage in index.tsx:**
```tsx
<StatsStrip
  stats={[
    { value: '7', label: 'contracts deployed' },
    { value: '5', label: 'jurisdictions' },
    { value: '0%', label: 'PII on-chain' },
  ]}
/>
```

---

## 9. Next Steps

1. Create `frontend/src/components/landing/` directory.
2. Implement `SectionLabel` and `StatsStrip` first.
3. Add `StatsStrip` to index.tsx after hero.
4. Iterate: `FeatureCard`, `UseCaseGrid`, `LogoStrip` as needed.
