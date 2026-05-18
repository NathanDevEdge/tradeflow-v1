# TradeFlow — Design System

## Identity

TradeFlow is warm, confident, and direct. It looks like software built by someone who actually understands small business — not a generic SaaS template, not enterprise bloat. Every design decision should reinforce trust and speed.

**Slogan**: "Better than Spreadsheets, Cheaper than the rest"

---

## Colour System

All values use oklch for perceptual uniformity. Do not use hex values in components — use CSS tokens only.

### Brand Palette

| Name | oklch | Hex approx | Use |
|---|---|---|---|
| Teal 400 | `oklch(0.68 0.14 185)` | `#2dd4bf` | Hover, light accent |
| Teal 500 | `oklch(0.63 0.14 185)` | `#14b8a6` | Highlights |
| Teal 600 | `oklch(0.58 0.14 185)` | `#0d9488` | **Primary** — buttons, links, active |
| Teal 700 | `oklch(0.52 0.13 185)` | `#0f766e` | Primary hover |
| Teal 800 | `oklch(0.38 0.10 185)` | `#115e59` | Sidebar active |
| Teal 900 | `oklch(0.28 0.08 185)` | `#134e4a` | Sidebar hover |
| Teal 950 | `oklch(0.22 0.06 185)` | `#0d3b37` | **Sidebar background** |
| Amber 400 | `oklch(0.82 0.14 75)` | `#fbbf24` | Badges, highlights, warnings |
| Amber 500 | `oklch(0.76 0.16 75)` | `#f59e0b` | Accent hover |

### Semantic Tokens

```css
/* Light mode — the only mode for now */
--background:          oklch(0.99 0.004 70);   /* warm white, not pure white */
--foreground:          oklch(0.18 0.02 185);   /* teal-tinted near-black */
--card:                oklch(1 0 0);
--card-foreground:     oklch(0.18 0.02 185);
--popover:             oklch(1 0 0);
--popover-foreground:  oklch(0.18 0.02 185);
--primary:             oklch(0.58 0.14 185);   /* teal-600 */
--primary-foreground:  oklch(0.98 0.005 185);
--secondary:           oklch(0.94 0.008 185);
--secondary-foreground: oklch(0.35 0.06 185);
--muted:               oklch(0.96 0.005 185);
--muted-foreground:    oklch(0.52 0.04 185);
--accent:              oklch(0.94 0.008 185);
--accent-foreground:   oklch(0.22 0.06 185);
--destructive:         oklch(0.58 0.245 27);
--destructive-foreground: oklch(0.98 0 0);
--border:              oklch(0.90 0.006 185);
--input:               oklch(0.90 0.006 185);
--ring:                oklch(0.58 0.14 185);

/* Sidebar — dark teal */
--sidebar:             oklch(0.22 0.06 185);
--sidebar-foreground:  oklch(0.92 0.01 185);
--sidebar-primary:     oklch(0.58 0.14 185);
--sidebar-primary-foreground: oklch(0.98 0.005 185);
--sidebar-accent:      oklch(0.30 0.08 185);
--sidebar-accent-foreground:  oklch(0.95 0.01 185);
--sidebar-border:      oklch(0.30 0.07 185);
--sidebar-ring:        oklch(0.58 0.14 185);
```

---

## Typography

**Font**: [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans)
Rounded, confident, reads well at small sizes. Professional without being corporate.

| Role | Weight | Size | Notes |
|---|---|---|---|
| Page heading | 700 | 24px / 1.5rem | Dashboard section titles |
| Section heading | 600 | 18px / 1.125rem | Card headers |
| Body | 400 | 14px / 0.875rem | Default text |
| Label | 500 | 13px / 0.8125rem | Form labels, table headers |
| Small / Caption | 400 | 12px / 0.75rem | Timestamps, helper text |
| Monospace numbers | — | same as context | Use `tabular-nums` on all number columns |

**Rules**:
- Always use `tabular-nums` on price, quantity, and percentage columns so they align
- Line height: 1.5 for body, 1.2 for headings
- Letter spacing: -0.01em on headings 18px+

---

## Spacing & Layout

- **Base unit**: 4px (Tailwind default)
- **Card padding**: 24px (`p-6`)
- **Page padding**: 24px horizontal (`px-6`), 24px vertical (`py-6`)
- **Section gap**: 24px (`gap-6`)
- **Border radius**: `0.75rem` (12px) for cards, `0.5rem` (8px) for inputs/buttons

---

## Component Patterns

### Buttons
- **Primary**: Teal background, white text, slight shadow — `bg-primary text-primary-foreground`
- **Secondary**: Muted background, teal text — `bg-secondary text-secondary-foreground`
- **Destructive**: Red — only for permanent destructive actions (delete)
- **Ghost**: No background, teal text on hover
- Minimum height: 36px. Touch targets: 44px on mobile.

### Badges / Status
| Status | Style |
|---|---|
| Draft | Muted background, muted foreground |
| Sent | Amber background (`oklch(0.97 0.05 75)`), amber-900 text |
| Accepted | Teal-50 background, teal-700 text |
| Declined | Red-50 background, red-700 text |

### Tables
- Header: `bg-muted`, `text-muted-foreground`, `font-medium`, `text-xs uppercase tracking-wide`
- Row hover: `hover:bg-muted/50` — very subtle
- Clickable rows: cursor-pointer, row hover should be obvious
- Number columns: right-aligned, `tabular-nums`
- Always use `overflow-x-auto` wrapper for mobile

### Cards
- Subtle border: `border border-border`
- No `border-b-2` accent borders — they clash with rounded corners
- Shadow: `shadow-sm` at most — not floating cards

### Sidebar
- Dark teal background (`var(--sidebar)`)
- Logo/brand at top in white
- Nav items: muted teal text, active item gets teal-600 background with white text
- Collapsed state supported

### Loading States
- Always use `role="status"` and `aria-label="Loading..."` on spinners
- Prefer skeleton loaders for content areas over spinners

---

## Animation Guidelines

All animations via Framer Motion (already installed).

| Type | Duration | Easing | Use |
|---|---|---|---|
| Page entry | 200ms | ease-out | Fade + 8px slide up |
| Row hover | 100ms | ease | Background transition |
| Modal open | 150ms | ease-out | Fade + scale from 0.97 |
| Status badge | 200ms | ease | Colour cross-fade |
| Button press | 80ms | ease-in | Scale to 0.97 |

**Rules**:
- Never bounce easing on UI elements (only for delightful moments like empty states)
- Keep durations short — this is a business tool, not a marketing site
- `will-change: transform` on animated elements that move

---

## Anti-Patterns (never do)

- `bg-black` — use `oklch(0.12 0.02 185)` instead
- Hardcoded hex or RGB values in components — use tokens
- `text-gray-*` — use `text-foreground`, `text-muted-foreground`
- `border-b-2` accent on a rounded card
- Gradient text
- Glassmorphism (`backdrop-blur` on cards)
- More than 2 font weights on a single screen
- Nested cards (card inside card)
