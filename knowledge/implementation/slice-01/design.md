---
title: "SLICE-01 Design Plan — Visual Language, Design System and UI Behaviour"
document_type: "DESIGN_PLAN"
project: "Restaurant SaaS Platform"
project_owner: "Gopala Krishna"
slice: "SLICE-01"
status: "PROPOSED"
version: "2.0"
created: "2026-09-15"
last_updated: "2026-09-15"
owner: "Frontend Engineer (UNASSIGNED) — approval: Gopala Krishna"
planned_start: "Not scheduled — execution-order plan"
planned_finish: "Not scheduled — execution-order plan"
dependencies: ["frontend.md"]
related_documents: ["frontend.md", "../../design/design-system.md", "../../design/accessibility.md", "../../design/responsive-design.md", "../../design/ux-principles.md"]
related_decisions: ["RASOIOS-ADR-001"]
---

# SLICE-01 Design Plan

**Direction:** premium traditional restaurant combined with modern SaaS. It should feel elegant, warm and polished,
with dark premium surfaces, an amber accent, emerald for success and live states, glassmorphism used selectively,
restrained gradients and purposeful motion.

**Avoid:** generic admin templates, Bootstrap/Material look-alikes, excessive blur, neon, excessive 3D, noisy
backgrounds, animating everything, random cards, emoji used as icons, mixed icon packs.

The whole product has **one** of each: typography system, icon system, spacing scale, radius scale, button system,
form system, card system, status system, colour system and motion system (§12 audit).

---

## 1. Surfaces and themes

**Brand v2 (RASOIOS-ADR-013, 2026-09-23)** replaces the amber/emerald v1 palette and the sidebar shell. The design
language is vibrant glassmorphism on near-black, desaturated surfaces, with four saturated brand hues used as accents.

| Surface | Theme | Rationale |
|---|---|---|
| Tenant console (`/restaurant/*`), Super Admin (`/admin/*`), kitchen | **Dark glass** (canvas `#0B1110`) | Brand v2; reduces glare on kitchen and POS screens; saturated accents read best on near-black |
| Platform landing (`/`), auth pages | **Dark glass**, lighter hero treatment | One brand impression from landing into the console |
| Public restaurant website (`{slug}.<domain>`, `/r/[slug]`) | **Tenant theme** — dark or light surface mode chosen by the restaurant, with its own primary/secondary/accent (ADR-013 §6) | The restaurant's brand, not the platform's |
| Receipts (screen + print) | Light, monochrome | Thermal/print fidelity |

The console theme is fixed (a per-user light console is Future Scope). Tenant themes apply to public pages only and
never leak into the console or another tenant.

## 2. Colour system

### 2.1 Tonal scales

Generated once from the four owner-supplied hues (ADR-013 §1) in OKLCH — hue held, lightness on a fixed ladder,
chroma tapered and gamut-fitted so no step clips. Raw hues appear only at the 500 step. These are the only colours in
the platform theme; anything else fails `tests/static/design-system.test.ts`.

Re-derived for the ADR-018 hues (2026-09-25) by holding each step's WCAG relative luminance and changing only hue, so
every pair in §2.3 still meets AA by construction. Secondary came back unchanged; the visible move is the accent.

| Step | Primary (green) | Secondary (blue) | Tertiary / danger (red) | Accent (cyan) | Surface (near-black) |
|---|---|---|---|---|---|
| 50 | `#E2FFDC` | `#F1F5FF` | `#FEF2F0` | `#E5FBFF` | `#F1F6F4` |
| 100 | `#BFFBB3` | `#DEE8FE` | `#FFDFDB` | `#C0F4FF` | `#DEE8E3` |
| 200 | `#91EB81` | `#BDD0FF` | `#FFBFB7` | `#66E7FE` | `#BFCEC7` |
| 300 | `#5FD648` | `#98B5FF` | `#FF968C` | `#00CFEA` | `#93A69D` |
| 400 | `#38BD15` | `#7498FF` | `#FE655C` | `#00B3CB` | `#6B8077` |
| 500 | `#2FA010` | `#5179FF` | `#F80F25` **(brand `#EF0E23`)** | `#0099AE` | `#4A5F57` |
| 600 | `#248508` | `#3253FF` | `#D0051B` | `#007E8F` | `#33453E` |
| 700 | `#1B6707` | `#2237D6` | `#A30112` | `#00626F` | `#25352F` |
| 750 | — | — | — | — | `#1D2A26` |
| 800 | `#124A04` | `#1624A1` | `#78010B` | `#004751` | `#16211E` |
| 850 | — | — | — | — | `#111917` |
| 900 | `#072D01` | `#090F6B` | `#4B0004` | `#002A31` | `#0B1110` |
| 950 | — | — | — | — | `#070B0A` |

The brand hues `#41E012`, `#2015EB` and `#0CD9F5` are the *inputs* to the ramp; their in-gamut 400–500 steps are what
the UI paints, because the raw values fail text contrast and vibrate at full-surface scale. A tenant's own theme
colours (ADR-013 §6) are separate and apply only to that restaurant's public site.

### 2.2 Semantic tokens (CSS variables in `app/globals.css`, mapped in `tailwind.config.ts`)

Tokens hold RGB channels (`--primary: 64 189 6`) so Tailwind can apply opacity and a tenant theme can override them
on the public page.

| Token | Console / dark | Public light mode (tenant themes override the brand three) |
|---|---|---|
| `--surface` | surface-900 `#0B1110` | surface-50 `#F1F6F4` |
| `--surface-2` (card) | surface-850 `#111917` | `#FFFFFF` |
| `--surface-3` (raised, menus) | surface-800 `#16211E` | surface-100 `#DEE8E3` |
| `--border` | surface-700 `#25352F` | surface-200 `#BFCEC7` |
| `--border-strong` | surface-600 `#33453E` | surface-300 `#93A69D` |
| `--text` | surface-100 `#DEE8E3` (15.21:1) | surface-900 `#0B1110` (17.45:1) |
| `--text-muted` | surface-300 `#93A69D` (7.43:1) | surface-500 `#4A5F57` |
| `--primary` / `--on-primary` | primary-400 `#38BD15` / surface-950 `#070B0A` (7.97:1) | primary-600 `#248508` / `#FFFFFF` (4.74:1) |
| `--primary-hover` | primary-300 `#5FD648` | primary-700 `#1B6707` |
| `--secondary` / `--on-secondary` | secondary-500 `#5179FF` / surface-950 (5.21:1) | secondary-600 `#3253FF` / `#FFFFFF` (5.50:1) |
| `--danger` / `--on-danger` | tertiary-500 `#F80F23` / surface-950 (4.79:1) | tertiary-600 `#D0051A` / `#FFFFFF` (5.65:1) |
| `--accent` / `--on-accent` | accent-400 `#00B3CB` / surface-950 (7.83:1) | accent-600 `#007E8F` / `#FFFFFF` (4.79:1) |
| `--success` | accent-400 `#00B3CB` | accent-700 `#00626F` (accent-600 is below AA as text on surface-50) |
| `--warning` | `#F5B301` (10.28:1 on surface-900) | `#8A5A00` |
| `--text-accent` (coloured text) | primary-300 `#5FD648` (10.16:1) | primary-700 `#1B6707` |
| `--focus-ring` | accent-300 `#00CFEA`, 2 px + 2 px offset (10.09:1) | secondary-600, 2 px + 2 px offset |

### 2.3 Verified contrast (WCAG 2.1, computed 2026-09-23 from the scales above)

| Pair | Ratio | Result |
|---|---|---|
| Body text `#DEE8E3` on canvas `#0B1110` | 15.21 | AAA |
| Muted text `#93A69D` on canvas | 7.43 | AAA |
| Dark `#070B0A` on primary-400 (console primary button) | 8.01 | AAA |
| White on primary-600 (public primary button) | 4.72 | AA |
| Dark on secondary-500 / white on secondary-600 | 5.21 / 5.50 | AA |
| Dark on tertiary-500 / white on tertiary-600 (danger) | 4.79 / 5.65 | AA |
| Dark on accent-400 / white on accent-600 | 7.87 / 4.79 | AAA / AA |
| primary-300 text on canvas | 10.20 | AAA |
| secondary-300 / tertiary-300 / accent-300 text on canvas | 9.43 / 9.06 / 10.12 | AAA |
| Raw brand `#41E012` with white text | 1.77 | **Fails** — never a text background |
| Border `#25352F` on canvas | 1.48 | Decorative only; interactive boundaries use `--border-strong` or the control fill + focus ring |

Every pair in this table is asserted in `tests/unit/ui-primitives.test.tsx` (TC-DS-009) and re-checked for a tenant
theme whenever a restaurant saves colours (TC-WEB-014).

### 2.4 Gradients and glow

Gradients are part of Brand v2, used sparingly and never behind body text:

1. **Brand gradient** `linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)` — brand mark, primary CTA hover
   and the active navigation indicator.
2. **Metric tile wash** — one per domain hue at 12–18% opacity over `--surface-2`, with the icon tile in that hue.
3. **Hero overlay** `linear-gradient(180deg, rgba(7,11,10,0) 40%, rgba(7,11,10,0.78) 100%)` over photography.
4. **Glow** — one `box-shadow` in the element's hue at ≤ 24% opacity on hover/active of primary controls and live
   indicators. No glow on text, tables or forms.

Page backgrounds may carry one very low-contrast radial wash (≤ 6% opacity) behind the header area; nothing more.

## 3. Typography

Fonts load through `next/font/google`, which self-hosts at build time with no runtime request to Google (replaces `@import url(...)` in `app/globals.css:5` [fact]).
Fallbacks: Playfair Display → Georgia, serif. Plus Jakarta Sans → system-ui, sans-serif.

| Role | Font | Weight | Size / line height (px) | Use |
|---|---|---|---|---|
| Display XL | Playfair Display | 700 | 56/64 (≥lg), 40/48 (<lg) | Public hero restaurant name |
| Display L | Playfair Display | 600 | 40/48 (≥lg), 32/40 | Public section titles, landing |
| Display M | Playfair Display | 600 | 30/38 | Console page title (h1), category titles on public site |
| Heading | Plus Jakarta Sans | 700 | 20/28 | Card and section headings (h2) |
| Subheading | Plus Jakarta Sans | 600 | 16/24 | Sub-sections (h3), table group headers |
| Body | Plus Jakarta Sans | 400 | 14/20 (console), 16/26 (public) | Paragraphs, table cells |
| Label | Plus Jakarta Sans | 600 | 13/18 | Form labels, button text (md), nav items (14/20) |
| Caption | Plus Jakarta Sans | 500 | 12/16 | Helper text, timestamps, badge text |
| Numeric | Plus Jakarta Sans | 600 | inherits, `font-variant-numeric: tabular-nums` | Money, quantities, timers, KOT numbers |
| Kitchen | Plus Jakarta Sans | 700 | KOT number 28/32, item line 18/26 | Kitchen board (readable at ~1.5 m) |

Rules: sentence case everywhere (no ALL-CAPS labels except KOT number prefix); no more than 3 type roles per card; minimum text size 12 px.

## 4. Spacing, layout grid, radius, elevation

### 4.1 Spacing scale (4 px base — Tailwind default units)

`1`=4 · `2`=8 · `3`=12 · `4`=16 · `5`=20 · `6`=24 · `8`=32 · `10`=40 · `12`=48 · `16`=64 · `20`=80.
**Arbitrary spacing values (`p-[13px]`, `mt-[7px]`) are prohibited.** Static test `tests/static/design-tokens.test.ts` fails on
arbitrary spacing, colour or radius classes (S1-P08-T011).

| Spacing use | Value |
|---|---|
| Icon ↔ label in buttons and badges | 8 (`gap-2`); badge 6 allowed only as `gap-1.5` for 16 px icons |
| Icon ↔ label in navigation | 12 (`gap-3`) |
| Label ↔ input | 6 (`gap-1.5`) |
| Between form fields | 16 (`gap-4`) |
| Card inner padding | 20 (`p-5`) standard, 16 (`p-4`) compact, 24 (`p-6`) feature |
| Gap between cards | 16 (<md), 24 (≥md) |
| Between page sections | 32 (console), 64 (public ≥md) / 48 (<md) |

### 4.2 Layout grid

| Shell | Container | Page padding (x) | Columns / gutter |
|---|---|---|---|
| Console (`AppShell`) | Sidebar 264 px (≥lg); content `max-w-[1440px]` centred | 16 (<sm), 24 (sm–lg), 32 (≥lg) | 12 cols / 24 (≥lg), 8 / 16 (md), 4 / 16 (<md) |
| Kitchen (`FocusShell`) | Full width | 16 | Status columns equal width, gap 16 |
| Admin (`AdminShell`) | `max-w-[1280px]` | as console | as console |
| Public website | `max-w-[1200px]` | 16 (<sm), 24 (sm–lg), 40 (≥lg) | 12 / 24 |
| Auth / account pages | `max-w-[440px]` card centred | 16 | — |

The page header is aligned to the same left edge as the content grid, and the header height is fixed at 64 px. Card heights within a row are equal (`grid` +
`items-stretch`; card footer pinned with `mt-auto`).

### 4.3 Control dimensions

| Size | Height | Horizontal padding | Icon | Use |
|---|---|---|---|---|
| sm | 32 | 12 | 16 | Table row actions, filters |
| md | 40 | 16 | 18 | Default buttons, inputs, selects |
| lg | 48 | 20 | 20 | Primary page actions, dialogs, mobile |
| touch | 56–64 | 20 | 24 | POS tiles, kitchen action buttons (min target 48 × 48) |

Table rows are 48 px (comfortable) or 40 px (compact, user preference).

### 4.4 Radius scale

`rounded-md` 6 (badges inner, checkbox) · `rounded-xl` 12 (buttons, inputs, icon tiles, images in cards) · `rounded-2xl` 16 (cards, popovers) ·
`rounded-3xl` 24 (dialogs, public hero media) · `rounded-full` (pills, avatars, status dots). No other radii.

### 4.5 Elevation

| Level | Dark | Light | Use |
|---|---|---|---|
| e0 | none | none | Canvas |
| e1 | border `--border-subtle` + `0 1px 2px rgba(0,0,0,.30)` | border neutral-200 + `0 1px 2px rgba(26,23,21,.06)` | Cards, tables |
| e2 | `0 8px 24px rgba(0,0,0,.40)` | `0 8px 24px rgba(26,23,21,.10)` | Dropdowns, popovers, sticky bars |
| e3 | `0 24px 48px rgba(0,0,0,.50)` | `0 24px 48px rgba(26,23,21,.16)` | Dialogs, drawers |

Coloured glow shadows (e.g. amber glow `box-shadow`) are limited to the focused primary action on the POS submit button. Baseline `.text-amber-glow` and `.border-amber-glow` are removed.

### 4.6 Glass system (three levels — ADR-013 §2)

| Level | Used for | Recipe (dark console) |
|---|---|---|
| `glass-1` | Sticky header, mobile bottom bar | `rgb(var(--surface) / 0.72)`, blur 14 px, 1 px `rgb(var(--border) / 0.9)` hairline, shadow e1 |
| `glass-2` | Metric tiles, quick actions, contextual panels, menus, popovers | `rgb(var(--surface-2) / 0.78)`, blur 12 px, 1 px border, shadow e2, optional hue wash (§2.4) |
| `glass-3` | Modals, drawers, command palette, dialog backdrop | panel `rgb(var(--surface-2) / 0.86)`, blur 18 px, shadow e3; backdrop `rgb(var(--surface-950) / 0.62)` + blur 6 px |

Rules: opacity behind any text is at least 72%; blur never exceeds 18 px; glass is never nested inside glass; long text,
data tables, forms and the kitchen board stay on opaque surfaces. Every glass class ships an opaque fallback for
`@supports not (backdrop-filter: blur(1px))` and for `prefers-reduced-transparency: reduce`.

## 5. Icon system (single system: Lucide)

| Rule | Value |
|---|---|
| Library | `lucide-react` only (present, v0.475.0 [fact]). No other icon packs, no inline third-party SVGs, **no emoji as UI icons** (baseline placeholder text in `app/restaurant/social/page.tsx:162` uses emoji in sample copy, and it is removed). |
| Sizes | **16** inline/compact (tables, badges, captions) · **18** small controls (sm/md buttons, inputs) · **20** navigation, lg buttons · **24** primary page actions, headers, kitchen buttons · **32** feature and empty-state icons |
| Stroke | `strokeWidth={1.75}` default; `2` at 16 px |
| Colour | Navigation and domain icons carry their domain hue (§5.2) through `IconTile`; icons inline in text inherit `currentColor`; status icons use the status token; never multi-colour |
| Alignment | Icons sit in a flex row with `items-center`. A button's icon is always at the start (`[Icon] Label`), except a trailing chevron for disclosure or an external-link icon |
| Accessibility | Decorative icons `aria-hidden="true"`; icon-only buttons require `aria-label` and a tooltip |
| Icon containers (`IconTile`) | sm 32 box / 16 icon · md 40 / 20 · lg 56 / 32; `rounded-xl`; tonal background (status or primary at 12% opacity) with icon in the 500/600 step; one tile style across dashboard, empty states and feature sections |
| Exception | `DietaryMark` (veg/non-veg/egg) is the standard food-marking symbol drawn with CSS (square outline + dot/triangle) plus a text label. It is a regulated marking, not an icon glyph. |

### 5.1 Domain icon map (all names verified to exist in lucide-react 0.475.0)

| Concept | Icon | Concept | Icon |
|---|---|---|---|
| Dashboard | `LayoutDashboard` | Kitchen / KOT board | `ChefHat` |
| Restaurant / context | `Store` | KOT ticket | `Ticket` |
| Menu | `BookOpen` | Printer | `Printer` / `PrinterCheck` |
| Food / dine-in | `UtensilsCrossed` | Transactions / receipt | `Receipt` |
| Categories | `LayoutList` | Customers | `Users` |
| Daily menu | `CalendarDays` | Reports | `ChartColumn` |
| Orders | `ClipboardList` | Social | `Share2` |
| New order | `SquarePlus` | Website | `Globe` |
| Takeaway | `ShoppingBag` | Staff | `UserCog` |
| Delivery | `Bike` | Settings | `Settings` |
| Priority HIGH | `Flame` | Audit | `ScrollText` |
| Timer / elapsed | `Timer` | Clock | `Clock` |
| Cooking / preparing | `CookingPot` | Notifications / ready | `Bell` / `BellRing` |
| Agent online / offline | `Wifi` / `WifiOff` | Location / phone / email | `MapPin` / `Phone` / `AtSign` |
| Drag handle | `GripVertical` | Image fallback | `ImageOff` |

### 5.2 Domain hues (ADR-013 §5)

| Domain | Hue token | Domain | Hue token |
|---|---|---|---|
| Dashboard | primary | Customers | tertiary-300 |
| Menu / food | warning | Reports | accent |
| Orders | secondary | Transactions | warning |
| Kitchen / KOT | secondary-300 | Website | accent-300 |
| Printing | accent | Settings / audit | text-muted |

A domain hue colours the icon and its tile wash only — never body text, table rows or large fills. Colour always comes
with a label (never colour alone).

**Curated `MENU_ICON_KEYS`** (category/item fallback icons): `Soup`, `Salad`, `Sandwich`, `Pizza`, `Beef`, `Drumstick`, `Fish`, `EggFried`,
`Croissant`, `CakeSlice`, `IceCreamCone`, `Coffee`, `CupSoda`, `Wine`, `Beer`, `GlassWater`, `Cookie`, `Popcorn`, `Wheat`, `Carrot`, `Apple`,
`Citrus`, `Flame`, `Leaf`, `UtensilsCrossed`, `CookingPot`. Food icons appear only as fallbacks and category identifiers, never as decoration.

## 6. Navigation and responsive behaviour

### 6.1 Console navigation (ADR-013 §3 — no desktop sidebar)

Both consoles share one shell: a sticky `glass-1` header, 64 px tall, holding the brand mark, capability-filtered
primary navigation (icon + label; the active item carries the brand-gradient underline and a tinted glass pill), a
restaurant/clock context block (tenant console) or environment marker (platform console), notifications and the
profile menu. Items that do not fit collapse into a **More** menu, measured at runtime — never a horizontal scrollbar.
There is no persistent desktop sidebar anywhere in the product.

| Breakpoint | Width | Console navigation | Content |
|---|---|---|---|
| base | < 640 | Header keeps brand + profile; `glass-1` bottom bar with the role's four most-used destinations, a centre action button and **More** | single column; tables → cards |
| sm | ≥ 640 | as base | 2-col cards |
| md | ≥ 768 | Header navigation appears (icon + label, overflow into **More**); bottom bar hidden | tables return; 8-col grid |
| lg | ≥ 1024 | Full header navigation with context block | 12-col grid, content max 1440 |
| xl | ≥ 1280 | as lg, wider gutters | as lg |

Kitchen and POS stay focus modes: the header collapses to brand + status + exit, with no navigation competing for space.

### 6.2 Public website

| Breakpoint | Layout |
|---|---|
| < 640 | 1-col menu, sticky scrollable category tabs, floating call/directions actions |
| ≥ 768 | 2-col menu, sticky section nav |
| ≥ 1024 | 3-col menu, split hero, max width 1200 |

Desktop layouts are not shrunk phone layouts, and phone layouts are not squeezed desktop layouts: each breakpoint is an
intentional composition. The page body never scrolls horizontally; only `DataTable` in table mode scrolls inside its
container. Verified at 320/375/390/414/768/1024/1280/1440/1920 (TC-DS-012).

## 7. Status system (icon + label + tone; never colour alone)

| Domain | Status | Icon | Tone | Label |
|---|---|---|---|---|
| Order | NEW | `CircleDot` | primary | New |
| Order | ACCEPTED | `ClipboardCheck` | neutral | Accepted |
| Order | PREPARING | `CookingPot` | warning | Preparing |
| Order | READY | `BellRing` | success | Ready |
| Order | COMPLETED | `CircleCheckBig` | success (muted) | Completed |
| Order | CANCELLED | `CircleX` | danger | Cancelled |
| Order | REFUNDED | `Undo2` | neutral | Refunded |
| Payment | UNPAID / PARTIALLY_PAID / PAID / PARTIALLY_REFUNDED / REFUNDED | `CircleDashed` / `CircleDotDashed` / `BadgeCheck` / `Undo2` / `Undo2` | neutral / warning / success / warning / neutral | Unpaid / Part paid / Paid / Part refunded / Refunded |
| KOT | QUEUED / PREPARING / READY / SERVED / CANCELLED | `Clock` / `CookingPot` / `BellRing` / `HandPlatter` / `CircleX` | neutral / warning / success / neutral / danger | Queued / Preparing / Ready / Served / Cancelled |
| Print job | PENDING / PROCESSING / PRINTED / FAILED | `Clock` / `LoaderCircle` / `PrinterCheck` / `TriangleAlert` | neutral / primary / success / danger | Waiting / Printing / Printed / Failed |
| Daily menu | DRAFT / PUBLISHED / UNPUBLISHED | `FilePen` / `Globe` / `EyeOff` | neutral / success / neutral | Draft / Published / Unpublished |
| Tenant | ACTIVE / SUSPENDED | `CircleCheck` / `Ban` | success / danger | Active / Suspended |
| Membership | INVITED / ACTIVE / INACTIVE | `Mail` / `CircleCheck` / `UserX` | warning / success / neutral | Invited / Active / Inactive |
| Agent | online / offline / REVOKED | `Wifi` / `WifiOff` / `Ban` | success / danger / neutral | Online / Offline / Revoked |
| Social | DRAFT / READY / MARKED_POSTED / ARCHIVED | `FilePen` / `CircleCheck` / `Send` / `Archive` | neutral / primary / success / neutral | Draft / Ready / Marked posted / Archived |
| Transaction | SUCCESS / VOIDED | `BadgeCheck` / `Ban` | success / neutral (strikethrough amount) | Recorded / Voided |

`StatusBadge`: height 24, `rounded-full`, 16 px icon, caption text, tonal background at 12% plus a text colour meeting AA. `LoaderCircle` spins only when motion is allowed.

## 8. Components — visual behaviour

| Component | Specification |
|---|---|
| **Buttons** | Variants: **Primary** (`--action-primary-*`), **Secondary** (surface-raised fill, border-strong, text-primary), **Ghost** (transparent, hover surface-raised), **Destructive** (danger-600 fill + white, 4.83:1), **Success** (tertiary-500 fill + neutral-900 text, 7.03:1). States: hover (one tone step), active (`scale-[0.98]` 120 ms, none under reduced motion), focus-visible ring, disabled (40% opacity, `aria-disabled`, no hover), loading (spinner replaces icon, label "Saving…", width locked to avoid shift). |
| **Forms** | Visible label above every field (placeholders are never labels); required marked with "*" + `aria-required`; helper text caption secondary; error text danger with `TriangleAlert` 16 and `aria-describedby`; field height md 40 (touch 48); consistent 16 gap; error summary at top on submit failure with focus moved to it. |
| **Cards** | `--surface-card`, e1, `rounded-2xl`, `p-5`; header row (icon tile optional, title Heading, action slot right-aligned); footer pinned bottom. |
| **Dashboard cards** | Title (Label, secondary) · `IconTile` md · primary value (Display M numeric, tabular) · supporting line (caption) · optional trend (icon `ArrowUp`/`ArrowDown` + text "12% vs yesterday"). Never oversized; `glass-2` with the domain hue wash (§4.6, ADR-013 §2). |
| **Tables** | Header row surface-raised, Label text, sticky within container; left-align text, **right-align numbers and money with tabular numerals**; dates as "15 Sep, 14:32" in restaurant tz with full timestamp in `title`; long text truncates with ellipsis + tooltip; status as `StatusBadge`; row actions in `IconButton` menu (`Ellipsis`); zebra off; hover surface-raised; <md becomes stacked cards keeping label/value pairs. |
| **Dialogs** | Native `<dialog>`, e3, `rounded-3xl`, max width 480 (confirm) / 640 (form) / 800 (options); title + description; primary action right; destructive dialogs name the object ("Archive 'Starters'?"); Esc and backdrop close unless the form is dirty (then confirm). |
| **Toasts** | Bottom-right (≥md) / top (<md), max 3 stacked, 5 s, pause on hover/focus, `role="status"` (errors `role="alert"`). |
| **Images** | Fixed aspect ratios: menu item 4:3, hero 16:9 (≥md) / 4:3 (<md), logo 1:1, social card 4:5. `object-fit: cover`, `rounded-xl`, skeleton placeholder while loading, `ImageOff` fallback tile on error. `next/image` with `sizes`. No generic corporate stock imagery; restaurants supply their own food photography. |
| **Empty states** | `IconTile` lg (32 px icon) · Heading · one-line description (secondary) · primary action (if permitted) · optional secondary link. Centred in the content area with 48 px vertical padding. |

## 9. States — visuals

| State | Pattern |
|---|---|
| Loading | Skeletons that mirror the final layout (same grid, heights). Shimmer 1.5 s linear, disabled under reduced motion (static surface-raised). Buttons show inline spinner. |
| Empty | §8 Empty states. Copy is specific ("No active orders", not "No data"). |
| Error | `ErrorState`: `TriangleAlert` tile (danger), "Something went wrong", "Try again" button, request id caption. |
| Forbidden | `ShieldX` tile, "You don't have access", role explanation, link to role home. |
| Not found | `SearchX` tile, "We couldn't find that", link back. |
| Success | Toast + inline `CircleCheck`; "Saved" label persists 2 s. |
| Stale connection | `StaleBanner` warning tone with `WifiOff`, "Connection lost — retrying (last updated 14:32:05)". |

## 10. Motion

| Token | Duration | Easing | Use |
|---|---|---|---|
| `motion-fast` | 120 ms | `cubic-bezier(0.2, 0, 0, 1)` | Hover, press, toggle |
| `motion-base` | 180 ms | same | Badge/status change, toast enter, card highlight |
| `motion-slow` | 240 ms | same | Dialog/drawer enter, page section entrance |
| exit | 120 ms | `cubic-bezier(0.4, 0, 1, 1)` | Dismissals |

**Purposeful uses:**
- Card entrance: opacity plus 4 px translate, staggered by 30 ms, maximum 6 items.
- Kitchen new ticket: a single 1.2 s amber ring fade.
- Moving a KOT between columns: 150 ms.
- Order card status change: a background tone cross-fade.

**Not allowed:** parallax, looping decorative animation, number count-up on money, animated gradients.

`@media (prefers-reduced-motion: reduce)` removes transforms and opacity transitions (state changes become instant) and removes the shimmer and spinner rotation
(replaced by a static "Loading…" label). Tested in TC-DS-006.

## 11. Screen-specific direction

| Screen | Direction |
|---|---|
| **Public website** | Editorial restaurant feel: large cover photography with gradient overlay, Playfair headings, generous whitespace, warm light canvas, amber-700 accents, category tabs sticky under a slim glass bar, menu cards with photo or elegant icon fallback, prices in tabular numerals, clear "Open now · closes 23:00" badge. No dashboard widgets, no dark admin chrome. |
| **Kitchen** | Speed, clarity, readability. Near-black canvas, high-contrast cards, KOT number and table first, quantities first on item lines, instructions highlighted with an amber left border, one primary action per card at touch size, elapsed timer turns warning at target prep time and danger at +50% (icon + text "Overdue 6 min"). No decorative imagery or glass. |
| **POS order entry** | Big touch tiles, fast category switching, obvious variant choice, running estimate clearly labelled, one dominant "Send to kitchen" action. |
| **Dashboard** | Calm, informative; one KPI row, operational widgets with direct actions. |
| **Receipt** | Monochrome, 80 mm column, Jakarta for body, tabular numerals, dashed separators, tax lines and totals aligned right. |

## 12. Visual QA checklist (run per page in S1-P25-T010; results recorded in `testing.md` §8)

| ID | Check |
|---|---|
| VQA-01 | Content aligns to the shell grid; left edges of header, cards and tables line up |
| VQA-02 | Only spacing-scale values used; no arbitrary spacing classes (static test passes) |
| VQA-03 | Equal card heights within each row; footers aligned |
| VQA-04 | Buttons use the defined variants and sizes; icon at start with 8 px gap; no misaligned icons |
| VQA-05 | All icons are Lucide at 16/18/20/24/32; consistent stroke; no emoji icons |
| VQA-06 | Typography roles only from §3; no text < 12 px; sentence case |
| VQA-07 | Money right-aligned with tabular numerals and correct currency |
| VQA-08 | Timestamps shown in restaurant timezone |
| VQA-09 | Status shown with icon + label per §7 |
| VQA-10 | Loading, empty, error, forbidden, not-found and success states present and designed |
| VQA-11 | No horizontal page scroll at 360, 390, 768, 1024, 1280, 1440 px |
| VQA-12 | Images keep aspect ratio; fallback shown on broken URL |
| VQA-13 | Long names (60+ chars) truncate gracefully; no overflow |
| VQA-14 | Focus visible on every interactive element; logical tab order |
| VQA-15 | Contrast meets §2.3 (axe reports zero contrast violations) |
| VQA-16 | Glass used only where §4.6 allows |
| VQA-17 | Reduced-motion mode removes animation |
| VQA-18 | Touch targets ≥ 44 px on mobile, ≥ 48 px in kitchen/POS |
| VQA-19 | Dark console/light public themes applied correctly; no light-on-light or dark-on-dark |
| VQA-20 | No placeholder/demo content or fake status indicators |

### 12.1 Design consistency audit (S1-P25-T011)

One of each system is verified by review plus static tests. **DCA-01** typography · **DCA-02** icon · **DCA-03** spacing · **DCA-04** radius ·
**DCA-05** button · **DCA-06** form · **DCA-07** card · **DCA-08** status · **DCA-09** colour (no hex outside §2.1 in `app/`/`components/`) · **DCA-10** motion.
The static test `tests/static/design-tokens.test.ts` enforces DCA-03/04/09 automatically.
