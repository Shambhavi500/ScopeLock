---
version: 1.0
name: ScopeLock
description: "Design system for ScopeLock, a desktop-first agency cockpit that turns client change requests into PayPal sandbox invoices, gates work on payment and pays contractors. The visual language is borrowed from a modern fintech marketing style (calm white and warm-parchment surfaces, black ink, heavy tightly tracked headlines, pill controls, deep navy brand fields with a sky-cyan accent) and adapted for a dense, data-heavy product UI: a smaller type ladder, a real spacing scale, status colors, form fields, tables, a Gantt and a payment page."
colors:
  # Brand
  brand: "#002991"          # deep navy; fields and bands, never small text
  brand-accent: "#60CDFF"   # sky cyan; highlights on navy, AI badge fill
  brand-accent-soft: "#DDF3FF"
  # Ink and text
  ink: "#000000"
  ink-muted: "#686A6D"      # secondary text on white/parchment (AA)
  ink-subtle: "#8A8D91"     # placeholders, disabled labels, input borders (3:1)
  on-brand: "#FFFFFF"
  # Surfaces
  canvas: "#FFFFFF"
  surface-warm: "#F1EFEA"   # app background behind panels
  surface-sunken: "#ECE9E3" # locked rows, read-only fields
  surface-tint: "#05378214" # tab tracks, secondary buttons (8% navy)
  surface-tint-strong: "#05378227"
  surface-inverse: "#000000"
  surface-inverse-hover: "#333333"
  # Lines
  hairline: "#CFD3D8"       # decorative dividers only (1.5:1)
  border-control: "#8A8D91" # input and checkbox outlines (3:1)
  # Interactive
  link: "#0066F5"           # links on white
  link-strong: "#0057D1"    # links on parchment or tinted surfaces
  focus-ring: "#097FF5"
  # Status (text on its own soft fill, all >= 4.5:1)
  success: "#0E7A46"
  success-soft: "#E4F4EA"
  warning: "#8A5300"
  warning-soft: "#FFF1D1"
  danger: "#C0281C"
  danger-soft: "#FCE8E5"
  info: "#0057D1"
  info-soft: "#E7F0FE"
  locked: "#5A5C60"
  locked-soft: "#ECE9E3"
typography:
  display-xl:   { fontFamily: Figtree, fontSize: 64px, fontWeight: 900, lineHeight: 1.0, letterSpacing: -1.92px }
  display-lg:   { fontFamily: Figtree, fontSize: 48px, fontWeight: 900, lineHeight: 1.05, letterSpacing: -1.44px }
  headline:     { fontFamily: Figtree, fontSize: 36px, fontWeight: 900, lineHeight: 1.1, letterSpacing: -1.08px }
  title-lg:     { fontFamily: Figtree, fontSize: 26px, fontWeight: 900, lineHeight: 1.2, letterSpacing: -0.52px }
  title-md:     { fontFamily: Inter, fontSize: 18px, fontWeight: 700, lineHeight: 1.35, letterSpacing: -0.27px }
  body-lg:      { fontFamily: Inter, fontSize: 18px, fontWeight: 400, lineHeight: 1.5, letterSpacing: -0.27px }
  body:         { fontFamily: Inter, fontSize: 16px, fontWeight: 400, lineHeight: 1.5, letterSpacing: -0.24px }
  body-strong:  { fontFamily: Inter, fontSize: 16px, fontWeight: 700, lineHeight: 1.5, letterSpacing: -0.24px }
  body-sm:      { fontFamily: Inter, fontSize: 14px, fontWeight: 400, lineHeight: 1.45, letterSpacing: -0.14px }
  label:        { fontFamily: Inter, fontSize: 12px, fontWeight: 700, lineHeight: 16px, letterSpacing: -0.12px }
  numeric:      { fontFamily: Inter, fontSize: 14px, fontWeight: 400, lineHeight: 1.45, fontFeature: "tnum" }
  amount-hero:  { fontFamily: Figtree, fontSize: 56px, fontWeight: 900, lineHeight: 1.0, letterSpacing: -1.68px, fontFeature: "tnum" }
  mono:         { fontFamily: "JetBrains Mono", fontSize: 13px, fontWeight: 500, lineHeight: 1.4 }
spacing:
  base: 4px
  scale: [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96]
  gutter-page: 24px
  gap-panel: 16px
  pad-panel: 24px
  pad-card: 20px
rounded:
  sm: 8px     # inputs, small cards, toasts
  md: 16px    # panels, drawers, dropdowns
  lg: 24px    # pay card, modal, hero media
  track: 96px # segmented tabs
  full: 9999px
sizing:
  control-lg: 48px  # pay page, primary page CTAs, modal actions
  control-md: 40px  # default in the cockpit
  control-sm: 32px  # table row actions, chips
  header: 64px
  icon: 20px
  icon-sm: 16px
motion:
  fast: 150ms ease
  base: 200ms ease
  slide: 300ms cubic-bezier(0.22, 1, 0.36, 1)
  unlock: 450ms cubic-bezier(0.22, 1, 0.36, 1)
---

# ScopeLock Design System

## 1. Where this comes from

This file replaces the scraped marketing reference (`DESIGN (1).md`). That reference describes a consumer fintech website: giant 900-weight headlines up to ~180px, full-bleed navy bands, translucent pill buttons and very low density. ScopeLock is a working tool for one agency lead, so this system keeps the **character** of the reference and rebuilds the **structure** for a product UI.

**Kept from the reference**
- Black ink on white and warm parchment (`#F1EFEA`) surfaces, flat fills, no gradients.
- A deep navy (`#002991`) brand field with sky cyan (`#60CDFF`) as its accent.
- Heavy display type (900) with proportional negative tracking (about −3% of size).
- Pill buttons, segmented pill tabs, generous container radii, whisper-light shadows.
- A two-ring focus treatment that is never removed.
- Weights limited to 400, 700 and 900.

**Changed for ScopeLock**
- The display ladder is cut from eight steps (26–181px) to four (26–64px). A cockpit has no room for poster type.
- A text tier (`title-md`, 18/700) is added for panel titles. The reference avoided a middle tier, but a dashboard with six panels needs one.
- A 4px spacing scale, control heights and layout grid are defined. The reference had only button padding.
- Status colors (success, warning, danger, info, locked) are added, each paired with an icon and text.
- Inputs, tables, the Gantt, badges, checklists, toasts, drawers and the pay page are specified. None were captured in the reference.
- Proprietary fonts are replaced with open ones (Figtree, Inter, JetBrains Mono).
- Contrast is checked. `link` fails AA on parchment, so `link-strong` exists. `hairline` is too faint for form controls, so `border-control` exists.
- One-off radii (30px, 68.57px) and the white "shape mask" shadows are dropped.

**Brand boundary.** ScopeLock is our product, built on PayPal APIs. It uses its own name and wordmark. Never use the PayPal logo, wordmark or "PayPal" styling as ScopeLock's identity. PayPal's mark appears only where PayPal renders it (the JS SDK button) and in plain-text factual references ("Pay with PayPal", "PayPal invoice INV2-…").

## 2. Principles

1. **Money and state first.** Amounts, invoice numbers and status are the most legible things on every screen. Decoration never competes with them.
2. **Locked looks locked.** Gated work is visibly different (sunken fill, lock icon, muted text, tooltip naming the blocking invoice). The unlock is the hero moment of the demo, so it gets the only expressive animation.
3. **Never color alone.** Every status carries an icon and a word. This is a PRD requirement (§9).
4. **AI is labeled, humans approve.** Anything the model produced shows its provenance (AI, Fallback, Cached) and its source quote. Every button that moves money is solid black, explicit and never auto-triggered.
5. **Calm by default.** Most of the screen is white, parchment and black. Navy and cyan are rare, so they mean something.

## 3. Color

### 3.1 Roles

| Token | Hex | Use | Never |
|---|---|---|---|
| `brand` | #002991 | Judge-guide header band, pay-page header strip, ScopeLock wordmark tile, empty-state hero | Body text, small icons, button fills, borders |
| `brand-accent` | #60CDFF | Highlighted words on navy, the `AI` provenance badge, selected Gantt bar outline | Text on white (too light) |
| `brand-accent-soft` | #DDF3FF | Source-quote background, AI result panel tint | Status meaning |
| `ink` | #000000 | Headlines, body, labels, primary button fill | Softened to grey for paragraphs |
| `ink-muted` | #686A6D | Helper text, timestamps, secondary table columns | Long paragraphs |
| `ink-subtle` | #8A8D91 | Placeholders, disabled labels | Anything the user must read |
| `canvas` | #FFFFFF | Panels, cards, header, table body | — |
| `surface-warm` | #F1EFEA | App background behind panels; pay-page background | Panel fill (panels sit on it) |
| `surface-sunken` | #ECE9E3 | Locked task rows, read-only fields, code blocks | — |
| `surface-tint` | 8% navy | Segmented tab track, secondary buttons, hovered table row | — |
| `hairline` | #CFD3D8 | Panel borders, dividers, table row lines | Form-control outlines |
| `border-control` | #8A8D91 | Input, textarea, select and checkbox outlines | Decorative dividers |
| `link` / `link-strong` | #0066F5 / #0057D1 | Links. Use `link-strong` on parchment or tinted fills | Button fills |
| `focus-ring` | #097FF5 | Focus outline | — |

### 3.2 Status

| Status | Text/icon | Fill | Icon (lucide) | Used for |
|---|---|---|---|---|
| Success | `success` #0E7A46 | `success-soft` #E4F4EA | `circle-check` | Invoice PAID, capture COMPLETED, payout SUCCESS, check passed |
| Warning | `warning` #8A5300 | `warning-soft` #FFF1D1 | `clock` / `triangle-alert` | Invoice SENT and unpaid, payout PENDING/PROCESSING, overdue, low AI confidence |
| Danger | `danger` #C0281C | `danger-soft` #FCE8E5 | `circle-x` | INSTRUMENT_DECLINED, check failed, duplicate blocked |
| Info | `info` #0057D1 | `info-soft` #E7F0FE | `info` | DRAFT, neutral notices, demo hints |
| Locked | `locked` #5A5C60 | `locked-soft` #ECE9E3 | `lock` | Tasks gated behind an unpaid invoice |

All five text/fill pairs measure at least 4.5:1. Measured ratios: success 4.74, warning 5.65, danger 5.00, info 5.57, locked 5.53, `ink-muted` on white 5.42, `ink-muted` on parchment 4.72, white on navy 12.17, cyan on navy 6.76.

### 3.3 Status mapping

| Domain value | Badge |
|---|---|
| milestone `planned` | Info · "Planned" |
| milestone `invoiced` / invoice `SENT` | Warning · "Awaiting payment" |
| milestone `paid` / invoice `PAID` | Success · "Paid" |
| milestone `paid_out` | Success · "Paid out" |
| invoice `DRAFT` | Info · "Draft" |
| payment failed | Danger · "Declined" |
| payout `PENDING` / `PROCESSING` | Warning · "Processing" (with spinner) |
| payout `SUCCESS` | Success · "Sent" |
| task locked | Locked · "Locked by INV2-…" |

## 4. Typography

### 4.1 Families

| Role | Family | Weights | Fallback |
|---|---|---|---|
| Display | **Figtree** (Google Fonts, OFL) | 900 | "Helvetica Neue", Arial, sans-serif |
| Text and UI | **Inter** (Google Fonts, OFL) | 400, 700 | Helvetica, Arial, sans-serif |
| IDs and code | **JetBrains Mono** (Google Fonts, OFL) | 500 | ui-monospace, Consolas, monospace |

Load through `next/font/google` so there is no layout shift and nothing hits a third-party CDN at runtime. If Figtree 900 looks clogged at small sizes, use 800 rather than loosening the tracking.

### 4.2 Scale

| Token | Size / line height | Weight | Tracking | Where |
|---|---|---|---|---|
| `display-xl` | 64 / 1.0 | 900 | −1.92px | Judge-guide hero only |
| `display-lg` | 48 / 1.05 | 900 | −1.44px | Pay-page heading, empty-state hero |
| `amount-hero` | 56 / 1.0 | 900 tnum | −1.68px | Invoice total on the pay page |
| `headline` | 36 / 1.1 | 900 | −1.08px | Project name in the cockpit header (desktop) |
| `title-lg` | 26 / 1.2 | 900 | −0.52px | Panel-level hero numbers (change-order total, payout total), modal titles |
| `title-md` | 18 / 1.35 | 700 | −0.27px | Panel titles, section heads inside panels |
| `body-lg` | 18 / 1.5 | 400 | −0.27px | Pay-page intro, judge-guide steps |
| `body` | 16 / 1.5 | 400 | −0.24px | Default text, button labels (700) |
| `body-sm` | 14 / 1.45 | 400 | −0.14px | Table cells, helper text, Gantt labels |
| `label` | 12 / 16px | 700 | −0.12px | Badges, tab labels, column headers, field labels |
| `numeric` | 14 / 1.45 | 400 tnum | 0 | Every amount, hour count and date in tables |
| `mono` | 13 / 1.4 | 500 | 0 | PayPal IDs (`INV2-…`, order, capture, batch IDs), debug IDs |

### 4.3 Rules
- **Three weights.** 900 belongs to Figtree only. Inter uses 400 for reading and 700 for emphasis, labels and buttons. No 500 or 600.
- **Tracking scales with size.** Display ≈ −3%, titles ≈ −2%, body ≈ −1.5%, labels −1%. Never positive tracking. Never uppercase plus wide tracking; labels stay sentence case.
- **Numbers line up.** Any column of money, hours or dates uses `font-variant-numeric: tabular-nums` and is right-aligned. Amounts always show currency and two decimals (`$1,045.00`), formatted by `formatUSD`.
- **IDs are mono and copyable.** A PayPal reference is always `mono`, truncated in the middle if long (`INV2-8F3K…Q2LM`), with a copy button.

## 5. Layout

### 5.1 Spacing
Base unit 4px. Use only these steps: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96.

| Context | Value |
|---|---|
| Page gutter (cockpit) | 24px |
| Gap between panels | 16px |
| Panel padding | 24px (20px below 1280px) |
| Card padding | 20px |
| Stack inside a form | 16px between fields, 8px label-to-field |
| Button group gap | 12px |
| Table cell padding | 12px horizontal, row height 44px (40px compact) |
| Section separation on the pay page | 32–48px |

### 5.2 Cockpit grid (`/projects/[projectId]`)

```
┌──────────────────────────────────────────────────────────────────┐
│ Header 64px · wordmark · project name · milestone chips · Reset   │  canvas, hairline bottom
├───────────────────────────────────────┬──────────────────────────┤
│ Timeline panel (Gantt)                │ Side panel               │
│ ~60% · min 640px                      │ ~40% · min 400px         │  surface-warm behind,
│                                       │ [Change request|Invoices │  panels on canvas
│                                       │  |Payouts] segmented tabs│
├───────────────────────────────────────┴──────────────────────────┤
│ Ledger panel (AG Grid) · full width · quick filter · totals row  │
└──────────────────────────────────────────────────────────────────┘
          Activity drawer slides in from the right (420px)
```

- CSS grid: `grid-template-columns: minmax(640px, 3fr) minmax(400px, 2fr)`, `gap: 16px`, `padding: 24px`.
- Timeline and side panel share a height (`min(640px, 60vh)`), each scrolling internally. The ledger sits below at its own height (about 420px).
- Max content width: none. The cockpit uses the full window; it is a tool, not a page of reading.

### 5.3 Pay page (`/pay/[invoiceId]`)
- Background `surface-warm`. A 72px `brand` strip at the top holds the ScopeLock wordmark in white and "Invoice from Acme Agency" in `brand-accent`.
- One centered column, max width 560px, top margin 48px.
- A single `canvas` card (`rounded.lg`, 32px padding): agency and invoice number, line items, divider, `amount-hero` total, the PayPal button container, then the result state.
- The demo-controls box sits below the card, outside it, so it is clearly not part of the client's experience.

### 5.4 Breakpoints
Desktop-first, as the PRD says. It must not break on a laptop.

| Width | Behavior |
|---|---|
| ≥ 1280px | Full grid as drawn |
| 1100–1279px | Panel padding 20px; header milestone chips collapse to icons with tooltips |
| < 1100px | Timeline, side panel and ledger stack in one column, each full width (from implementation §10) |
| < 640px | Pay page only: card padding 20px, `amount-hero` drops to 44px. The cockpit shows a "best viewed on a laptop" notice but still works |

## 6. Shape and elevation

### 6.1 Radius

| Token | Value | Use |
|---|---|---|
| `rounded.sm` | 8px | Inputs, textareas, selects, toasts, small cards, Gantt bars (4px is fine inside the Gantt) |
| `rounded.md` | 16px | Cockpit panels, drawers, dropdown menus, checklist container |
| `rounded.lg` | 24px | Pay card, judge-guide modal |
| `rounded.track` | 96px | Segmented tab track (88px on the inner indicator) |
| `rounded.full` | 9999px | Every button, badge, chip and avatar |

Square corners only on full-bleed bands (header, pay-page strip).

### 6.2 Elevation
Separation comes from surface color first (parchment behind, white panels on top, hairline edge). Shadows are for things that float.

| Level | Treatment | Use |
|---|---|---|
| 0 Flat | none | Default |
| 1 Panel | `1px solid hairline` | Cockpit panels, cards, table |
| 2 Raised | `0 1px 2px rgb(0 0 0 / 0.04), 0 4px 16px rgb(0 0 0 / 0.06)` | Pay card, popovers, dropdown menus, Gantt tooltip |
| 3 Overlay | `0 24px 48px rgb(0 0 0 / 0.12)` | Modal, activity drawer, toasts |
| Scrim | `rgb(0 0 0 / 0.40)` | Behind modal and drawer |

No backdrop blur. No colored shadows.

### 6.3 Focus
Every interactive element: `outline: 2px solid var(--focus-ring); outline-offset: 2px; box-shadow: 0 0 0 2px #FFFFFF;`. Use `:focus-visible`, never remove it, and never let it be clipped by `overflow: hidden` (put focusable things inside a padded wrapper if a panel scrolls).

## 7. Components

Sizes use `control-md` (40px) in the cockpit and `control-lg` (48px) on the pay page and in the modal.

### 7.1 Buttons

| Variant | Fill | Text | Border | Hover | Use |
|---|---|---|---|---|---|
| **Primary** | `ink` #000 | white | none | `surface-inverse-hover` #333 | The one main action per panel: Analyze, Create invoice & send, Pay contractors |
| **Secondary** | `surface-tint` | `ink` | none | `surface-tint-strong` | Supporting actions: Add item, Send reminder, Refresh status |
| **Outline** | `canvas` | `ink` | `1px border-control` | `#F5F7FB` | Low-emphasis actions on white: Cancel, Export CSV |
| **Ghost / icon** | transparent | `ink-muted` | none | `#F5F7FB`, text to `ink` | Copy ID, close, row actions. Square-padded, circular, 40px (32px in tables) |
| **Danger** | `danger` | white | none | `#A12017` | Reset demo confirmation only |

- All pills: `border-radius: 9999px`, label `body` 700, horizontal padding 20px (md) or 24px (lg), icon 20px with 8px gap.
- **Disabled:** fill `surface-sunken`, text `ink-subtle`, `cursor: not-allowed`. A disabled money button always has a visible reason beside it ("2 checks failing"), not only a tooltip.
- **Loading:** keep the width, replace the icon with a 16px spinner, change the label ("Sending…"), set `aria-busy`.
- **Hover growth (from the reference):** primary and secondary may grow by 2px each side over 200ms. Turn this off under `prefers-reduced-motion`.

### 7.2 Segmented tabs
The side panel's Change request / Invoices / Payouts switch, and the pay page's demo toggle.
- Track: `surface-tint`, `rounded.track`, 2px padding, 40px tall.
- Item: `label` text, 10px × 16px padding. Inactive text `rgb(0 0 0 / 0.63)`; active text `ink` on a white indicator (`rounded` 88px, Level 2 shadow).
- The indicator slides between items with `motion.slide`.
- Built as `role="tablist"`, arrow keys move between tabs. An optional count badge sits after the label ("Invoices 3").

### 7.3 Badges and chips
- **Status badge:** pill, 24px tall, 4px × 10px padding, `label` text, 16px icon + text in the status color on its soft fill. See §3.2.
- **Provenance badge:** on every AI result. `AI` = `brand-accent` fill, `brand` text, `sparkles` icon. `Fallback` = `warning-soft` / `warning`, `life-buoy` icon. `Cached` = `info-soft` / `info`, `database` icon.
- **Milestone chip (header):** pill with status icon, milestone name and amount (`M2 Build · $6,800 · Awaiting payment`). 32px tall, `canvas` fill, `hairline` border.
- **Sample-message chip:** secondary button styled at 32px with a `message-square` icon; three in a row above the paste box.

### 7.4 Form fields
- Input, select, textarea: `canvas` fill, `1px solid border-control`, `rounded.sm`, 40px tall (textarea min 160px), 12px horizontal padding, `body` text.
- Label above in `label` style, 8px gap. Helper or error text below in `body-sm`.
- Hover: border `ink-muted`. Focus: the standard focus ring. Error: border and helper text `danger`, `circle-x` icon, `aria-invalid` and `aria-describedby`.
- The change-request textarea shows a live counter (`1,240 / 4,000`), turning `warning` at 90% and `danger` at the limit.
- Read-only fields use `surface-sunken` with no border.
- Inline numeric editors in the scope-items table (hours) are 32px tall, right-aligned, `numeric` text, step 0.5.

### 7.5 Panels and cards
- Panel: `canvas`, `rounded.md`, `1px hairline`, 24px padding. Header row: `title-md` title left, actions right, 16px below.
- Card (inside panels: invoice summary, split row group): `canvas` or `surface-warm` on white panels, `rounded.sm`, 20px padding, no shadow.
- Hero number blocks (change-order total, payout total): `label` caption in `ink-muted` above a `title-lg` amount.

### 7.6 Change-request panel
Order top to bottom, matching the PRD flow:
1. Sample-message chips.
2. Paste textarea with counter.
3. Primary **Analyze** button. While running: spinner, "Reading the request…", disabled textarea.
4. Result header: summary sentence, provenance badge, "Is a scope change" yes/no badge.
5. **Scope-items table:** title, role (select), hours (inline number), rate (muted), line total (`numeric`, bold), confidence, in-scope flag, remove (ghost icon).
   - Confidence: a 48px bar plus percentage. Below 0.5, the bar and number use `warning` with a `triangle-alert` icon and a tooltip saying "Low confidence: check this estimate".
   - In original scope: `Already in scope` info badge. These rows default to excluded from the invoice.
   - The **source quote** sits under each title as `body-sm` italic on `brand-accent-soft` with a 3px `brand` left bar, `rounded` 4px.
6. Clarifying questions (P1): a list with `circle-help` icons in an `info-soft` card.
7. **Schedule preview:** a single line with `calendar-clock` icon: "+3 working days · Launch moves Nov 28 → Dec 3". Positive shift in `warning`.
8. Footer row: total in `title-lg` on the left, primary **Create invoice & send** on the right.

### 7.7 Timeline (SVAR Gantt, Willow theme)
Override the theme's CSS variables rather than restyling internals.
- Grid text `body-sm`, header `label` on `surface-warm`, row lines `hairline`, today line `danger` 2px.
- Bars: design `#7A5AF8`, dev `#0066F5`, qa `#0E9F6E`, pm `#E08A00`, each with white bar text where it fits. Role is also shown in the grid column, so color is not the only signal.
- Milestone summary rows: `brand` bar, `on-brand` text, `body-sm` 700.
- **Locked task:** bar fill `locked-soft` with a 1px dashed `locked` border, label prefixed with a `lock` icon (or 🔒 in plain text), grid row `surface-sunken`, text `locked`. Tooltip: "Locked until INV2-XXXX is paid ($1,045.00)". Drag and edit cancelled.
- **New change-order tasks** (before payment): same locked style plus a 2px `brand-accent` left marker so the lead can see what was just added.
- **Unlock animation:** the lock icon scales to 0 and fades (150ms), then the bar fill crossfades to its role color (`motion.unlock`), and the row gets a one-time `success-soft` flash that fades over 1.2s. With reduced motion: instant swap, no flash.
- Preview mode (before approval): shifted tasks shown as a ghost outline (1px dashed `ink-muted`) at the new dates.

### 7.8 Ledger (AG Grid Community, Quartz theme)
Configure through the theme API params, not CSS overrides:

| Param | Value |
|---|---|
| `fontFamily` | Inter |
| `fontSize` | 14px |
| `headerFontWeight` | 700 |
| `headerBackgroundColor` | `surface-warm` |
| `foregroundColor` | `ink` |
| `borderColor` / `rowBorder` | `hairline` |
| `rowHoverColor` | `surface-tint` |
| `selectedRowBackgroundColor` | `info-soft` |
| `accentColor` | `focus-ring` |
| `rowHeight` / `headerHeight` | 44px / 40px |
| `wrapperBorderRadius` | 16px |

- Columns: Date (`numeric`), Type (icon + word: `file-text` Invoice, `credit-card` Payment, `send` Payout), Reference (`mono`, copy button), Counterparty, Amount (right-aligned `numeric`, outgoing payouts shown as `−$420.00` in `ink`, never red), Status (status badge renderer).
- Pinned bottom totals row: `surface-warm`, `body-strong`.
- Quick filter input above the grid, left; Export CSV outline button right. The P1 natural-language filter shares the input with a `sparkles` toggle and shows the applied filter as removable chips.
- Empty state: "No transactions yet. Create a change-order invoice to get started."

### 7.9 Payouts panel
1. **Split table:** contractor (avatar initials circle on `surface-tint`), role, share %, amount (`numeric`). Agency margin as the last row in `ink-muted`. Total row bold; a `circle-check` with "Adds up to the cent" when shares + margin equal the capture.
2. **Pre-payout checklist:** a `rounded.md` container with one row per check: 20px status icon, label in `body`, detail in `body-sm` `ink-muted` (e.g. "Captured $1,045.00 = invoice $1,045.00"). Passing rows use `success` icons; failing rows get a `danger-soft` row fill and the fix hint.
3. **Pay contractors** primary button, `control-lg`, full width of the panel. Disabled until all checks pass, with the failing count beside it.
4. **Per-item status pills** below, updating while polling; a thin indeterminate progress bar in `info` across the top of the section while the batch is not final.

### 7.10 Pay page
- Line items: description left, `hours × rate` in `ink-muted`, line total right (`numeric`).
- Total: `label` "Total due" over `amount-hero`.
- **PayPal button:** rendered by the JS SDK v6 `<paypal-button>`. Do not restyle it, recolor it or wrap it in our button styles. Give it a full-width container, min height 48px, 24px above. Follow PayPal's own button guidelines for its colors and label.
- **Result states**, each replacing the button area in an alert card:
  - Success: `success-soft` card, `circle-check` 32px, "Payment received", capture ID in `mono`.
  - Declined: `danger-soft` card, `circle-x`, "Your card was declined. No money was taken. Try again with a different payment method." and a primary **Try again** button that restarts the session. The invoice and order context stay on screen.
  - Already paid: `info-soft` card, "This invoice has already been paid on {date}."
  - Cancelled: no card, a `body-sm` note under the button: "Payment cancelled. You can try again."
- **Demo controls box:** `2px dashed border-control`, `rounded.md`, `surface-warm` fill, `label` heading "Demo controls (not shown to real clients)" with a `flask-conical` icon, then a switch "Simulate declined card".

### 7.11 Alerts and toasts
- Inline alert: soft status fill, 16px padding, `rounded.sm`, 20px icon, `body-strong` title + `body-sm` text, optional action link.
- Toast: `surface-inverse` fill, white text, `rounded.sm`, Overlay shadow, bottom-right, 5s auto-dismiss (errors stay until closed), `aria-live="polite"` (errors `assertive`). Include the PayPal reference when there is one ("Invoice INV2-… sent").
- AI provider down: a persistent `warning` inline alert at the top of the change-request panel: "AI is unavailable. Using the rule-based extractor."

### 7.12 Modal and drawer
- **Judge-guide modal:** 640px wide, `rounded.lg`, no padding on the top band: a `brand` header (32px padding) with `display-lg` heading in white, one word highlighted in `brand-accent` ("Try it in *3 minutes*"). Body on `canvas`: five numbered steps (navy number circles, 28px, white `label` text), then the sandbox buyer login in a `surface-sunken` block with copy buttons, then a primary **Start the demo** button (`control-lg`). Shows on first visit; reopen from a `circle-help` ghost button in the header.
- **Activity drawer:** 420px from the right, Overlay shadow, scrim. Events in a vertical timeline: 8px dot in the event's status color on a 1px `hairline` rail, `body-sm` message, `ink-muted` timestamp, `mono` PayPal reference with copy. Newest first.
- Both trap focus, close on Escape, and return focus to the trigger.

### 7.13 Header
- 64px, `canvas`, `1px hairline` bottom, 24px horizontal padding.
- Left: ScopeLock wordmark (a 28px `brand` rounded-square tile with a white lock glyph + "ScopeLock" in Figtree 900 20px), a 1px divider, then the project name in `title-md` with client name in `ink-muted`.
- Center: milestone chips.
- Right: Activity (ghost icon with unread dot in `brand-accent`), Judge guide (ghost icon), Reset demo (outline button that opens a confirm dialog with the danger button).

### 7.14 Empty, loading and error states
- **Loading:** skeleton blocks in `surface-sunken` with a subtle shimmer (off under reduced motion). Gantt and grid show skeleton rows, never a blank panel.
- **Cold start:** if the first fetch takes over 3s, show a centered `brand` card: "Waking up the demo server (about a minute on the free tier)…" with an indeterminate bar.
- **Empty:** a 40px icon in `ink-subtle`, a `title-md` line and one `body-sm` sentence that tells the user what to do next. No illustrations.
- **Error:** inline alert in the panel that failed, with Retry. Include the `paypal-debug-id` in `mono` when PayPal returned one.

## 8. Iconography
- **lucide-react** only, 1.75px stroke, 20px default, 16px in tables and badges.
- Icons inherit `currentColor`. They take the status color in badges and `ink-muted` elsewhere.
- Icon-only buttons always have an `aria-label` and a tooltip.

## 9. Motion

| Token | Value | Use |
|---|---|---|
| `fast` | 150ms ease | Hover, color changes |
| `base` | 200ms ease | Button growth, dropdowns, toasts in |
| `slide` | 300ms cubic-bezier(0.22, 1, 0.36, 1) | Tab indicator, drawer, modal |
| `unlock` | 450ms cubic-bezier(0.22, 1, 0.36, 1) | Task unlock, ledger row status change |

Under `prefers-reduced-motion: reduce`, durations become 0 except opacity fades (keep 150ms), and the hover growth, shimmer and unlock flash are removed.

## 10. Accessibility checklist
- Text contrast ≥ 4.5:1, large text and UI boundaries ≥ 3:1. Use `link-strong` on parchment and `border-control` for inputs.
- Every status has icon + word; colors are reinforcement.
- All controls reachable by keyboard, in visual order. Gantt locked tasks are announced ("Locked until INV2-… is paid").
- Visible `:focus-visible` ring everywhere (§6.3).
- Hit targets ≥ 32px in the cockpit, ≥ 44px on the pay page.
- Live regions for: AI extraction result, payment result, payout polling status, toasts.
- Amounts read naturally: render `$1,045.00`, not split spans.
- Respect reduced motion (§9).

## 11. Implementation tokens

Put these in `app/globals.css`. With Tailwind v4, the `@theme` block generates utilities (`bg-brand`, `text-ink-muted`, `rounded-md`…); shadcn/ui components read the same variables.

```css
@import "tailwindcss";

@theme {
  --font-display: var(--font-figtree), "Helvetica Neue", Arial, sans-serif;
  --font-sans: var(--font-inter), Helvetica, Arial, sans-serif;
  --font-mono: var(--font-jetbrains-mono), ui-monospace, Consolas, monospace;

  --color-brand: #002991;
  --color-brand-accent: #60CDFF;
  --color-brand-accent-soft: #DDF3FF;
  --color-ink: #000000;
  --color-ink-muted: #686A6D;
  --color-ink-subtle: #8A8D91;
  --color-on-brand: #FFFFFF;
  --color-canvas: #FFFFFF;
  --color-surface-warm: #F1EFEA;
  --color-surface-sunken: #ECE9E3;
  --color-surface-tint: rgb(5 55 130 / 0.08);
  --color-surface-tint-strong: rgb(5 55 130 / 0.15);
  --color-hairline: #CFD3D8;
  --color-border-control: #8A8D91;
  --color-link: #0066F5;
  --color-link-strong: #0057D1;
  --color-focus-ring: #097FF5;
  --color-success: #0E7A46;  --color-success-soft: #E4F4EA;
  --color-warning: #8A5300;  --color-warning-soft: #FFF1D1;
  --color-danger: #C0281C;   --color-danger-soft: #FCE8E5;
  --color-info: #0057D1;     --color-info-soft: #E7F0FE;
  --color-locked: #5A5C60;   --color-locked-soft: #ECE9E3;

  --radius-sm: 8px;
  --radius-md: 16px;
  --radius-lg: 24px;
  --radius-track: 96px;

  --shadow-raised: 0 1px 2px rgb(0 0 0 / 0.04), 0 4px 16px rgb(0 0 0 / 0.06);
  --shadow-overlay: 0 24px 48px rgb(0 0 0 / 0.12);

  --ease-out-soft: cubic-bezier(0.22, 1, 0.36, 1);
}

body {
  background: var(--color-surface-warm);
  color: var(--color-ink);
  font-family: var(--font-sans);
  font-size: 16px;
  line-height: 1.5;
  letter-spacing: -0.015em;
}

:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
  box-shadow: 0 0 0 2px #FFFFFF;
}

.tabular { font-variant-numeric: tabular-nums; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

If the project ends up on Tailwind v3, move the same values into `theme.extend` in `tailwind.config.ts`; the token names stay the same.

## 12. Do and don't

**Do**
- Use one primary (black) button per panel, and make it the action that moves the story forward.
- Show the PayPal reference ID next to every invoice, payment and payout, in `mono` with copy.
- Pair every status color with its icon and word.
- Keep navy for bands and tiles; keep cyan for highlights on navy and the AI badge.
- Right-align and tabular-align every number.
- Label AI output with its provenance and show the source quote.

**Don't**
- Use `brand` navy as a button fill or for small text.
- Use weights other than 400, 700 (Inter) and 900 (Figtree).
- Show outgoing payouts in red; red means something failed.
- Restyle the PayPal button or use PayPal's logo as ScopeLock branding.
- Use the reference's 100–180px display sizes anywhere in the product.
- Put shadows on panels in normal flow, or add backdrop blur.
- Make a money action reachable without a visible, explicit button press.
- Hide the reason a button is disabled.

## 13. Open items
- **Wordmark:** the lock-tile wordmark is a placeholder; draw a proper SVG on polish day (Day 13).
- **Gantt role colors** need a contrast check against white bar text once SVAR's bar height is known; fall back to dark text on lighter fills if any fails.
- **Tailwind version** is not pinned yet. §11 assumes v4.
- **Dark mode** is out of scope for the hackathon. All tokens are named by role, so a dark set can be added later without renaming.
