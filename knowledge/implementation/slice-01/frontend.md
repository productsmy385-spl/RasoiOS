---
title: "SLICE-01 Frontend Plan — Routes, Screens, Components and States"
document_type: "FRONTEND_PLAN"
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
dependencies: ["design.md", "api.md", "security.md"]
related_documents: ["design.md", "api.md", "security.md", "../../frontend/routing.md", "../../frontend/component-architecture.md", "../../design/accessibility.md"]
related_decisions: ["RASOIOS-ADR-001", "RASOIOS-ADR-006", "RASOIOS-ADR-009"]
---

# SLICE-01 Frontend Plan

This document covers routes, screens, interaction and components. Visual language (tokens, type, spacing, icons, motion) is in `design.md`.

## 1. Frontend principles

| # | Principle | Consequence |
|---|---|---|
| FE-01 | **Server Components by default.** Client Components only for interaction (forms with live validation, polling boards, dialogs, cart/order builder). | Smaller JS; data never fetched client-side on first render |
| FE-02 | **UI permission checks are UX only** (SC-RBAC-08). | Every control's action is enforced by the server; hidden ≠ secure |
| FE-03 | **No fake data, no placeholder screens, no "Coming soon"** for required functionality. | Baseline sample state (BA-26…BA-30) is removed |
| FE-04 | **Every major page implements all states** in §4. | Reusable state components; E2E asserts each state |
| FE-05 | **Money is displayed from decimal strings** with `formatMoney(amount, currencyCode, locale)` (`Intl.NumberFormat`). No `Number()` on money. | No `$` hard-coding (BA-24) |
| FE-06 | **Time is displayed in the restaurant timezone** with `formatInZone(iso, timezone)` (`Intl.DateTimeFormat`). | Live clock and all timestamps are timezone-aware (BA-32) |
| FE-07 | **No new UI framework.** Next.js, React 19, Tailwind CSS, lucide-react (all present in `package.json` [fact]). Dialogs use native `<dialog>`; forms use React 19 `useActionState` + shared Zod schemas; charts use accessible HTML/CSS bars. A new library needs an ADR. | Consistent with ADR-001 |
| FE-08 | **Client state never holds authorization or tenant identity.** No tenant IDs in localStorage/sessionStorage/hidden inputs. Permitted client persistence: kitchen section filter, table density preference, unsent order-draft (cleared on submit). | SC-TEN-01 |
| FE-09 | **Polling boards follow ADR-009** (cursor, visibility pause, stale banner). | `usePolling(url, intervalMs)` hook |

## 2. App structure

```
app/
  page.tsx                                  /                      product landing + sign-in entry
  offline/page.tsx                          /offline               PWA offline fallback
  sign-in/[[...sign-in]]/page.tsx           /sign-in
  sign-up/[[...sign-up]]/page.tsx           /sign-up               invitation acceptance only
  account/(no-access|select-tenant|suspended)/page.tsx
  r/[slug]/page.tsx | daily/page.tsx | opengraph-image.tsx | cards/[card]/route.tsx
  admin/layout.tsx  (requirePlatform)  page.tsx | tenants/page.tsx | tenants/new/page.tsx | tenants/[tenantId]/page.tsx | audit/page.tsx
  restaurant/layout.tsx       (requireTenant — resolves context once, provides SessionContext)
  restaurant/page.tsx         (role home redirect)
  restaurant/(console)/layout.tsx   AppShell: glass header nav + main (+ bottom bar < 768 px)
      dashboard/ menu/ menu/categories/ menu/items/ menu/items/new/ menu/items/[itemId]/ daily-menu/
      orders/ orders/new/ orders/[orderId]/ orders/[orderId]/receipt/
      transactions/ transactions/day-close/ customers/ customers/[customerId]/
      reports/ social/ website/ staff/ settings/ printing/ audit/
  restaurant/(focus)/layout.tsx     FocusShell: compact top bar only (kitchen)
      kitchen/
  api/…                              route handlers (api.md)
```

Baseline routes removed/redirected: `/restaurant/kds` → `/restaurant/kitchen` (301), `/restaurant/analytics` → `/restaurant/reports`,
`/restaurant/billing` → `/restaurant/transactions`, `/restaurant/billing/receipt/[orderId]` → `/restaurant/orders/[orderId]/receipt`,
home link `/dashboard` → `/restaurant` (BA-33, BA-34).

### 2.x Public hosts (ADR-012)

The public restaurant site is reachable two ways, both rendering the same loader:

- `{slug}.<PUBLIC_ROOT_DOMAIN>` (canonical) and `{slug}.localhost:3000` in development;
- `/r/{slug}` on the apex host (preview/fallback), which emits a canonical link to the subdomain when
  `PUBLIC_ROOT_DOMAIN` is set.

`middleware.ts` resolves the host to a slug, rejects reserved labels, and rewrites tenant-host requests to the public
route. Console, platform and auth routes are served only from the apex host; requesting them on a tenant host redirects
to the apex host. An unknown slug, an unpublished website and a suspended tenant all render the same public 404.

## 3. Navigation

### 3.1 Header navigation (console shell — ADR-013 §3)

**There is no desktop sidebar.** Both consoles use a sticky `glass-1` header: brand mark, primary navigation (icon +
label), context block, notifications, profile. Items that do not fit collapse into a **More** menu measured at runtime.
Items appear only when the user holds the capability; the server still authorises every page and action (SC-RBAC-08).

Groups below describe *ordering and overflow priority*: Main and Operations items stay in the header as long as they
fit, Management/Reports/Settings items move into **More** first.

| Group | Item | Route | Icon (lucide) | Capability |
|---|---|---|---|---|
| Brand | RASOIOS wordmark | `/restaurant` | `UtensilsCrossed` | — |
| Context | Restaurant switcher (name + role; switch if multiple memberships) | `/account/select-tenant` | `Store` + `ChevronsUpDown` | session |
| Main | Dashboard | `/restaurant/dashboard` | `LayoutDashboard` | `dashboard:read` |
| Operations | Orders | `/restaurant/orders` | `ClipboardList` | `order:read` |
| Operations | New order | `/restaurant/orders/new` | `SquarePlus` | `order:create` |
| Operations | Kitchen | `/restaurant/kitchen` | `ChefHat` | `kot:read` |
| Operations | Transactions | `/restaurant/transactions` | `Receipt` | `transaction:read` |
| Operations | Customers | `/restaurant/customers` | `Users` | `customer:read` |
| Management | Menu | `/restaurant/menu/items` | `BookOpen` | `menu:read` |
| Management | Daily menu | `/restaurant/daily-menu` | `CalendarDays` | `daily_menu:read` |
| Management | Website | `/restaurant/website` | `Globe` | `website:update` |
| Management | Social | `/restaurant/social` | `Share2` | `social:manage` |
| Management | Staff | `/restaurant/staff` | `UserCog` | `staff:read` |
| Reports | Reports | `/restaurant/reports` | `ChartColumn` | `report:read` |
| Reports | Audit log | `/restaurant/audit` | `ScrollText` | `audit:read` |
| Settings | Printing | `/restaurant/printing` | `Printer` | `print_job:read` |
| Settings | Settings | `/restaurant/settings` | `Settings` | `restaurant:read` |
| Footer | User profile menu (Clerk `UserButton`) + sign out | — | avatar | session |

The active item carries a tinted glass pill, the brand-gradient underline and `aria-current="page"`, so it is signalled
by more than colour. Below 768 px the header keeps brand + notifications + profile and primary navigation moves to a
`glass-1` bottom bar: the role's four most relevant destinations (e.g. WAITER: Orders, Kitchen, Customers, More) plus a
centre action button for the role's main action (New order / Start ticket). The **More** sheet lists everything else the
role may reach. No off-canvas sidebar drawer exists.

### 3.2 Header (console shell)

Page title (h1) + breadcrumb (where depth > 1) · restaurant name · **live clock in restaurant timezone** (`LiveClock`, updates every second, shows zone
abbreviation, `aria-live="off"`) · printing health indicator (agents offline / failed jobs count, links to `/restaurant/printing`) · user menu.
Notifications are limited to these operational indicators (no notification centre in SLICE-01).

### 3.3 Role home (`/restaurant`)

TENANT_ADMIN, MANAGER → `/restaurant/dashboard` · CASHIER, WAITER → `/restaurant/orders` · KITCHEN → `/restaurant/kitchen`.

## 4. Standard page states

| State | Implementation | Visual (design.md §9) |
|---|---|---|
| **Loading** | `loading.tsx` per route segment with skeleton that matches final layout (no layout shift); button pending state via `useFormStatus` | Skeleton blocks, shimmer disabled under reduced motion |
| **Empty** | `EmptyState` with contextual icon, title, one-sentence description, primary action when the user may act | e.g. `BookOpen` "No menu items yet" → "Add your first menu item" |
| **Error** | `error.tsx` boundary with `ErrorState` ("Something went wrong", request id, Retry → `reset()`); action errors inline near the control + toast | `TriangleAlert` |
| **Unauthorized** (no session) | Middleware redirect to `/sign-in?redirect_url=` — page never renders | — |
| **Forbidden** (no permission / no membership / suspended) | Guard renders `ForbiddenState` ("You don't have access to this page", role shown, link to role home) or `/account/*` pages | `ShieldX` / `Store` |
| **Not found** | `notFound()` → `not-found.tsx` with `NotFoundState` (also used for cross-tenant IDs — identical) | `SearchX` |
| **Success** | Inline confirmation + toast (`role="status"`); button label transitions "Save" → "Saving…" → "Saved" with check icon | `CircleCheck` |
| **Disabled** | Controls disabled with `aria-disabled` and tooltip explaining why (e.g. "Day closed") | — |
| **Stale / offline** (polling boards) | Banner "Connection lost — retrying" after 3 missed polls; last-updated time | `WifiOff` |

## 5. Route specifications

Abbreviations: **Perm** = required permission (security.md §3.3). **L** loading · **E** empty · **Err** error · **U** unauthorized · **F** forbidden · **NF** not found · **S** success.
Responsive breakpoints: `sm` 640, `md` 768, `lg` 1024, `xl` 1280 (design.md §6). Accessibility requirements add to the baseline in design.md §8.

### 5.1 Public and account

#### `/` — Landing
- **Purpose:** Explain the product to restaurant owners; sign-in entry. **User:** anonymous, staff. **Perm:** none.
- **Layout:** marketing single column: hero, three capability sections (website & menu, orders & kitchen, printing), commercial line "Licensed restaurant software — no subscription plans", footer.
- **Components:** `SiteHeader`, `Hero`, `FeatureSection`, `SiteFooter`, `Button`. **Data/API:** none (static).
- **States:** L none (static) · E n/a · Err global boundary · U/F n/a · NF n/a · S n/a.
- **Responsive:** stacked sections < md. **Accessibility:** one h1, landmark regions, skip link.

#### `/sign-in` and `/sign-up`
- **Purpose:** Clerk Email OTP sign-in; sign-up only via invitation ticket. **User:** staff. **Perm:** none.
- **Layout:** centered auth card on warm canvas with brand mark. **Components:** Clerk `<SignIn>` / `<SignUp>` with appearance mapped to tokens.
- **Data/API:** Clerk. **States:** L Clerk skeleton · Err Clerk inline errors ("Incorrect code") · `/sign-up` without ticket shows "Access is by invitation" `EmptyState` · S redirect `/restaurant` or `/admin`.
- **Responsive:** full-width card < sm. **Accessibility:** labels from Clerk verified with axe; focus to first field.

#### `/account/no-access`, `/account/suspended`, `/account/select-tenant`
- **Purpose:** Explain access outcome; choose restaurant. **User:** signed-in. **Perm:** session.
- **Components:** `StatusPage`, `MembershipList` (select-tenant). **API:** LD-AUTH-01, SA-AUTH-01.
- **States:** E (select-tenant with 0 active) → redirect no-access · Err boundary · S redirect after switch.
- **Responsive:** single column. **Accessibility:** membership options are buttons in a list with role + restaurant name.

#### `/offline`
- **Purpose:** Shown by service worker when a navigation fails offline. **Content:** "You're offline. Orders and kitchen screens need a connection." + Retry. No cached tenant data (design.md §11, REQ-PWA-004).

#### `/r/[slug]` — Public restaurant website
- **Purpose:** Real restaurant website: identity, today's menu, full menu, hours, contact. **User:** public. **Perm:** none.
- **Layout:** light warm canvas (`#FBF9F5`): hero (cover image, logo, name, open-now badge, description) → "Today's menu" (if published) → category tabs (sticky) + menu grid → hours & location → contact → footer.
- **Components:** `PublicHero`, `OpenNowBadge`, `DailyMenuSection`, `CategoryTabs`, `MenuItemCard` (image/icon fallback, dietary mark, price or "from" price, variants/add-ons shown as text, "Unavailable today" state), `HoursTable`, `ContactBlock`, `PublicFooter`.
- **Data/API:** LD-PUB-01, LD-PUB-02. **SEO:** `generateMetadata` (seo_title/description, canonical), JSON-LD `Restaurant` + `Menu` (escaped serializer), OG image RH-PUB-01.
- **States:** L `loading.tsx` skeleton hero + grid · E "Menu coming soon" is **not** allowed — publishing requires ≥1 item (SA-RST-06); categories with 0 published items hidden · Err friendly boundary without internals · NF unknown/suspended/unpublished → branded 404 "Restaurant not found" · U/F n/a · S n/a.
- **Responsive:** 1 column cards < sm; 2 cols sm–lg; 3 cols ≥ lg; category tabs horizontally scrollable with scroll-snap. **Accessibility:** menu as headed sections, prices with currency in text, dietary mark has text label (not colour only), images have alt = item name, open-now text not colour only.
- **Ordering UI:** none unless Q-001 approved (then `CartDrawer` + checkout per SA-PUB-01).

#### `/r/[slug]/daily` — Today's menu share page
- **Purpose:** Shareable page for today's daily menu (social link target). **Data/API:** LD-PUB-02; OG image from RH-PUB-02 `daily-menu`.
- **States:** E no published menu today → "No daily menu today — see our full menu" link · NF as above. **Responsive/Accessibility:** as `/r/[slug]`.

### 5.2 Super Admin

Shared layout `AdminShell`: sticky `glass-1` header with the platform brand, nav (Overview, Restaurants, Audit), user menu and the toast region; no sidebar (ADR-013 §3). Guard `requirePlatform`. Non-SUPER_ADMIN → `/account/forbidden` (fixes BA-03).

The console says **restaurant**, not *tenant*, wherever a person reads it [fact: `lib/ui/navigation.ts`, `app/admin/**`, S1-P06-T003…T007]. "Tenant" stays in the schema, the permissions and these documents.

#### `/admin` — Platform dashboard
- **Purpose:** Platform health of tenancy at a glance. **User:** SUPER_ADMIN. **Perm:** `platform:tenant:read`.
- **Layout:** stat row (Active tenants, Suspended tenants) · recent tenants table · recent platform audit list. **No fabricated "100% Operational" indicator** (BA-30).
- **Components:** `StatCard`, `DataTable`, `AuditList`. **API:** LD-ADM-01.
- **States:** L skeleton · E "No tenants yet" → "Create tenant" · Err boundary · F ForbiddenState · S n/a.
- **Responsive:** stats 1→2 cols; tables → cards < md. **Accessibility:** table captions, status text labels.

#### `/admin/tenants` — Tenant list
- **Perm:** `platform:tenant:read`. **Components:** `FilterBar` (search, status, sort), `DataTable` (name, slug link to public site, status badge, members, website published, created), `Pagination`. **API:** LD-ADM-02.
- **States:** L · E "No tenants match your filters" / first-run CTA · Err (a tampered cursor offers "Start from the first page") · F · S n/a. **Responsive:** card list < md. **Accessibility:** search labelled.
- **Sorting** is a control in the filter bar, not a bidirectional column header [fact: `app/admin/tenants/page.tsx`, S1-P06-T004, 2026-09-23]. LD-ADM-02 offers exactly two orderings — name A–Z and newest first — so a header offering to reverse them would announce a sort the loader cannot perform. Supersedes "sortable headers `aria-sort`" for this page only; column sorting stays the pattern wherever a loader really sorts both ways.

#### `/admin/tenants/new` — Create tenant
- **Perm:** `platform:tenant:create`. **Layout:** two-section form (Tenant & restaurant; First administrator). **Components:** `Form`, `TextField`, `SlugField` (live pattern check, availability check on blur), `TimezoneSelect` (searchable, grouped by region), `CurrencySelect`, `CountrySelect`. **API:** SA-ADM-01.
- **States:** L pending button · Err field errors + form error summary (focus moves to summary) · S redirect to `/admin/tenants/{id}?created=1&invitation=sent|failed`, which greets the reader with an `Alert` naming the invited address (warning tone when the invitation failed) · F.
- The success confirmation is a **banner on the destination page, not a toast** [fact: `app/admin/tenants/[tenantId]/page.tsx`, S1-P06-T005, 2026-09-23]: it has to survive a navigation and a reload, which a 5-second toast does not. Toasts stay for actions that confirm themselves on the page they happened (the lifecycle dialogs).
- The form is three sections — the restaurant, its public address, its first administrator — because the address is what cannot be changed later (ADR-012 §4) and deserves its own decision, not a field among others.
- **Responsive:** single column < md. **Accessibility:** error summary links to fields; required indicators with text.

#### `/admin/tenants/[tenantId]` — Tenant inspection & lifecycle
- **Perm:** `platform:tenant:read` (+ update/suspend/reactivate/invite for actions). **Layout:** header (name, status badge, actions) · details card · restaurant summary · members table · counts · lifecycle history (from audit).
- **Components:** `DetailHeader`, `DescriptionList`, `DataTable`, `ConfirmDialog` (suspend requires reason textarea; reactivate confirm), `InviteAdminDialog`. **API:** LD-ADM-03, SA-ADM-02…SA-ADM-06.
- **States:** L · E members "No administrator yet — invite one" · Err · F · NF invalid/unknown id · S toast per action.
- **Responsive:** actions collapse into overflow menu < md. **Accessibility:** destructive dialog has explicit title, focus trapped (native dialog), Esc closes.

#### `/admin/audit` — Platform audit
- **Perm:** `platform:audit:read`. **Components:** `FilterBar`, `AuditTable` with expandable before/after diff. **API:** LD-ADM-04.
- **States:** L · E "No platform events for these filters" · Err · F. **Responsive:** stacked rows < md. **Accessibility:** expand buttons `aria-expanded`.

### 5.3 Tenant console

#### `/restaurant/dashboard`
- **Purpose:** Today's operational picture for the restaurant. **User:** TENANT_ADMIN, MANAGER. **Perm:** `dashboard:read`.
- **Layout (12-col grid):** header row with business date + live clock · KPI row (Net sales today, Orders today, Average order value, Active kitchen tickets) · Orders by status strip (NEW/ACCEPTED/PREPARING/READY with links) · Kitchen widget (queued/preparing/ready counts, oldest waiting minutes) · Menu status (published items, unavailable items → link) · Daily menu status (published/draft/none → action) · Payments today by method + refunds · Printing health (agents online/offline, failed jobs → link) · Quick actions (New order, Open kitchen, Publish daily menu, Close day).
- **Components:** `KpiCard`, `StatusStrip`, `WidgetCard`, `QuickActions`, `LiveClock`. **API:** LD-DASH-01, RH-DASH-01 (30 s).
- **States:** L skeleton grid · E brand-new tenant → onboarding checklist (restaurant profile, hours, categories, items, website publish, printer) — real progress computed from data · Err per-widget error with retry · F · S n/a.
- **Responsive:** KPIs 4→2→1 columns; widgets 3→2→1. **Accessibility:** KPI values announced with labels; trends not colour-only.
- **Rule:** every widget shows real data or an actionable empty state. There are no decorative charts.

#### `/restaurant/menu` → redirects to `/restaurant/menu/items`

#### `/restaurant/menu/categories`
- **Purpose:** Manage categories. **User:** TA, MGR (manage); CASHIER/KITCHEN/WAITER read-only. **Perm:** `menu:read` (+ `menu:manage`).
- **Layout:** toolbar (Add category, show archived) · sortable list (drag handle + keyboard "Move up/down" buttons) with name, icon, item count, published toggle.
- **Components:** `SortableList`, `CategoryFormDialog` (name, description, icon picker from curated Lucide set), `Switch`, `ConfirmDialog` (archive). **API:** LD-MENU-01, SA-MENU-01…SA-MENU-05.
- **States:** L · E "No categories yet" → "Add category" · Err inline + toast · F (manage controls hidden; direct action → 403 toast) · NF n/a · S "Category saved" / order saved.
- **Responsive:** full-width rows; drag replaced by move buttons on touch < md. **Accessibility:** reorder operable by keyboard; announcements via live region ("Moved Starters to position 2").

#### `/restaurant/menu/items`
- **Purpose:** Browse/manage items. **Perm:** `menu:read` (+ `menu:manage`, `menu:availability:update`).
- **Layout:** `FilterBar` (category, published, availability, search, archived) · `DataTable` (thumbnail/icon, name, category, price/from, tax, dietary, available switch, published switch, actions) · Add item button.
- **Components:** `DataTable`, `Switch`, `DietaryMark`, `MoneyText`, `RowActions` (Edit, Archive), `Pagination`. **API:** LD-MENU-02, SA-MENU-08, SA-MENU-10, SA-MENU-11.
- **States:** L · E "No menu items yet" → "Add your first menu item"; filtered-empty "No items match" + clear filters · Err · F · S toggles optimistic with rollback on error.
- **Responsive:** table → `MenuItemRowCard` list < md. **Accessibility:** switches have accessible names "Available: Butter Chicken".

#### `/restaurant/menu/items/new` and `/restaurant/menu/items/[itemId]`
- **Purpose:** Create/edit an item with variants and add-ons. **Perm:** `menu:manage` (read-only view for `menu:read`).
- **Layout:** two columns ≥ lg: form (Basics, Pricing & tax, Variants, Add-ons, Kitchen & preparation, Visibility) + sticky live preview card (public appearance).
- **Components:** `Form`, `TextField`, `TextArea`, `MoneyField` (decimal string, currency prefix), `PercentField`, `Select`, `IconPicker`, `ImageUrlField` (or `ImageUpload` if Q-009), `VariantEditor` (rows: name, price, default radio, available), `AddonEditor`, `PublicItemPreview`. **API:** LD-MENU-03, SA-MENU-06, SA-MENU-07, SA-MENU-12, SA-MENU-13.
- **States:** L · Err field-level + summary; 409 conflict "This item was changed by someone else — reload" · NF unknown/foreign id · F · S "Item saved" and stay.
- **Responsive:** preview moves below form < lg. **Accessibility:** variant rows as fieldsets with legends; add/remove row buttons labelled.

#### `/restaurant/daily-menu`
- **Purpose:** Curate, schedule, publish daily menus. **Perm:** `daily_menu:read` (+ `daily_menu:manage`).
- **Layout:** date navigator (prev/next, date picker, "Today" in restaurant tz) + 14-day status strip · left: selected items (ordered, drag/move) · right: searchable pickable items by category · action bar (Save draft, Publish/Unpublish, Copy from…, Delete draft).
- **Components:** `DateNavigator`, `StatusStrip`, `SortableList`, `ItemPicker`, `CopyMenuDialog`, `ConfirmDialog`, `Badge` (DRAFT/PUBLISHED/UNPUBLISHED). **API:** LD-DMENU-01, LD-DMENU-02, SA-DMENU-01…SA-DMENU-05.
- **States:** L · E no menu for date → "No daily menu for {date}" + "Start from scratch" / "Copy previous" · Err inline (e.g. unpublished item listed) · F read-only · S "Published — visible on your website on {date}".
- **Responsive:** picker becomes a drawer < lg. **Accessibility:** date picker keyboard-operable; status strip days are buttons with full date labels.

#### `/restaurant/orders`
- **Purpose:** Live order board and history. **Perm:** `order:read`.
- **Layout:** status tabs with counts (Active, New, Accepted, Preparing, Ready, Completed today, Cancelled today) · search (order #, table, customer) · `OrderCard` grid (active) / `DataTable` (closed) · New order button.
- **Components:** `Tabs`, `OrderCard` (number, type/table, age timer, items count, total (not KITCHEN), payment badge, status badge, primary next action), `DataTable`, `StaleBanner`. **API:** LD-ORD-01, RH-ORD-01 (10 s), SA-ORD-02.
- **States:** L · E "No active orders" (`ClipboardList`) + New order · Err · F · S action toast; card updates in place with subtle highlight (reduced-motion: no animation).
- **Responsive:** cards 1/2/3/4 columns. **Accessibility:** new orders announced politely ("New order 20260915-0042, table 4").

#### `/restaurant/orders/new` — Order entry (POS)
- **Purpose:** Fast, touch-first order creation. **Perm:** `order:create`.
- **Layout ≥ lg:** left category rail · center item grid (daily-menu items highlighted) · right order panel (type, table, customer lookup, lines with quantity steppers, instructions, server-quoted totals, Send to kitchen / Save as new). < lg: item grid full-screen with sticky "View order (n) · total" bar opening the order panel as a drawer.
- **Components:** `CategoryRail`, `PosItemTile` (≥ 64 px touch target), `ItemOptionsDialog` (variant required radio group, add-on checkboxes, quantity, instructions), `OrderLineList`, `QuantityStepper`, `CustomerLookup` (RH-CUS-01), `TotalsPanel`. **API:** LD-ORD-03, SA-ORD-01, RH-CUS-01, SA-CUS-01.
- **Totals:** the panel shows a **client estimate labelled "Estimate"** for responsiveness. The authoritative totals come from the server response and appear on the confirmation (ADR-010; client never sends prices).
- **States:** L catalogue skeleton · E no published available items → "No items available to order" + link to Menu (if permitted) · Err item became unavailable → dialog listing items to remove · F · S "Order 20260915-0042 sent to kitchen" with links (View, New order); idempotency key prevents double submit.
- **Responsive:** as layout. **Accessibility:** item tiles are buttons with name + price; dialog radio group has legend "Choose size"; quantity steppers labelled.

#### `/restaurant/orders/[orderId]`
- **Purpose:** Order detail: lines, status, KOTs, payments, actions. **Perm:** `order:read` (+ action permissions).
- **Layout:** header (number, status + payment badges, timers, next-action buttons) · lines table with snapshots/add-ons/instructions · totals (subtotal, tax, total, paid, balance) · KOT section (per section/round with status + print status + reprint) · payments ledger (record payment, refund, void) · activity (audit excerpt) · customer card.
- **Components:** `DetailHeader`, `OrderLinesTable`, `TotalsSummary`, `KotStatusList`, `PaymentPanel` (`RecordPaymentDialog`: method segmented control, amount prefilled with balance, cash tendered + change, UPI reference), `RefundDialog`, `CancelOrderDialog` (reason), `ActivityTimeline`. **API:** LD-ORD-02, SA-ORD-02…SA-ORD-06, SA-TXN-01…SA-TXN-03, SA-KOT-02, SA-PRN-06.
- **States:** L · Err 409 conflict → auto refresh + message · NF unknown/foreign → 404 · F action hidden/403 · S toasts; payment success shows change due prominently.
- **Responsive:** sections stack; action bar sticky bottom < md. **Accessibility:** status changes announced; dialogs labelled; amounts read with currency.

#### `/restaurant/orders/[orderId]/receipt`
- **Purpose:** Printable/browser receipt and "Send to printer". **Perm:** `transaction:read`.
- **Layout:** 80 mm-width receipt preview centred; print stylesheet hides chrome. **Components:** `ReceiptView`, `Button` (Print in browser, Send to receipt printer). **API:** LD-RCPT-01, SA-PRN-06.
- **States:** L · NF · F · Err "No receipt printer configured" (with link) · S "Receipt sent to {printer}" — shows print job status, not assumed success.
- **Accessibility:** receipt is a semantic table; print button labelled.

#### `/restaurant/kitchen` (focus shell)
- **Purpose:** Fast, legible kitchen workflow. **User:** KITCHEN, TA, MGR (+ read for CASHIER/WAITER). **Perm:** `kot:read`.
- **Layout:** compact top bar (restaurant, live clock, section selector, connection status, sound toggle) · three columns QUEUED | PREPARING | READY (≥ lg); single column with segmented status filter (< lg).
- **Components:** `KitchenBoard`, `KotCard` (large KOT number, table/type, priority flag, elapsed timer vs target prep time with amber/red thresholds + text, items with quantity first "2 × Butter Chicken (Full)", add-ons, instructions highlighted, print status icon, primary action button "Start" / "Ready" / "Served", reprint in overflow), `SectionSelector`, `StaleBanner`. **API:** LD-KOT-01, RH-KOT-01 (5 s), SA-KOT-01, SA-KOT-02.
- **States:** L skeleton columns · E "No tickets in queue" (`ChefHat`) per column · Err action failure toast + card revert · F · S card moves column with 150 ms transition (none under reduced motion); new ticket chime optional (off by default; user gesture to enable).
- **Responsive:** tablet landscape 3 columns; phone 1 column. Touch targets ≥ 48 px. **Accessibility:** readable at 1.5 m (KOT number ≥ 28 px, items ≥ 18 px); priority and overdue conveyed by icon + text; no decorative imagery.

#### `/restaurant/transactions`
- **Purpose:** Ledger of payments/refunds, voids. **Perm:** `transaction:read`.
- **Layout:** `FilterBar` (business date range, type, method, status, search) · summary strip (payments, refunds, net, by method) · `DataTable` (time, order #, type, method, amount right-aligned tabular numerals, reference, recorded by, status, actions: Void) · link to Day close.
- **API:** LD-TXN-01, SA-TXN-03. **States:** L · E "No transactions for these dates" · Err · F · S "Transaction voided".
- **Responsive:** table → cards < md with amount prominent. **Accessibility:** amounts include currency text; void dialog requires reason.

#### `/restaurant/transactions/day-close`
- **Purpose:** Reconcile cash and close the business day. **Perm:** `day_close:perform`.
- **Layout:** date selector · expected totals card · counted cash field with live variance · open orders warning list · notes · Close day button (confirm).
- **API:** LD-TXN-02, SA-TXN-04. **States:** L · E n/a · Err "Day already closed" · F · S closed summary (read-only) with printable view.
- **Accessibility:** variance announced; confirm dialog restates totals.

#### `/restaurant/customers` and `/restaurant/customers/[customerId]`
- **Purpose:** Find, create, update customers; view history. **Perm:** `customer:read` (+ create/update/archive).
- **Layout:** list: search + `DataTable` (name, masked phone, email, orders, last order) + New customer · detail: profile card with edit, notes (staff-only label), order history table, archive/anonymise in danger zone.
- **Components:** `SearchField`, `DataTable`, `CustomerFormDialog`, `ConfirmDialog` (anonymise requires typing ANONYMISE). **API:** LD-CUS-01, LD-CUS-02, SA-CUS-01…SA-CUS-04.
- **States:** L · E "No customers yet — customers are added when you create orders" · Err 409 phone exists → link to existing · NF · F · S.
- **Responsive:** cards < md. **Accessibility:** masked phone has visually hidden "ending in 3366".

#### `/restaurant/reports`
- **Purpose:** Useful restaurant reports. **Perm:** `report:read`.
- **Layout:** date range picker with presets (Today, Yesterday, Last 7 days, This month) in restaurant tz · tabs: Sales · Orders · Menu performance · Transactions · Daily summary. Each tab: KPI row + accessible bar rows (HTML) + data table.
- **API:** LD-RPT-01…LD-RPT-05. **States:** L · E "No completed orders in this period" · Err · F · S n/a.
- **Responsive:** tables → cards < md. **Accessibility:** every visual has an equivalent table; bars have text values.

#### `/restaurant/social`
- **Purpose:** Prepare shareable menu content and track manual posting honestly. **Perm:** `social:manage`.
- **Layout:** card generator (choose Daily menu / Full menu / Item → live card image preview from RH-PUB-02) · caption editor with character count · actions: Copy caption, Copy link, Download card image (from public URL), Mark ready, Mark as posted (optional post URL) · posts list with statuses.
- **Components:** `CardPreview`, `CaptionEditor`, `CopyButton`, `SocialPostCard`, `Badge`. **API:** LD-SOC-01, SA-SOC-01…SA-SOC-05, RH-PUB-02.
- **States:** L · E "No posts yet — create a menu card to share" · Err card unavailable when website unpublished → "Publish your website to share menu cards" · F · S "Marked as posted by {name}" (never "Published successfully").
- **Accessibility:** card preview has alt text summarising content.

#### `/restaurant/website`
- **Purpose:** Branding and public website configuration. **Perm:** `website:update`.
- **Layout:** status header (Published/Unpublished, public URL with copy/open) · Branding (logo, cover, accent with contrast feedback) · Visibility (show phone/email/address) · SEO (title/description with counters, search preview) · Publish readiness checklist · live preview link.
- **API:** LD-RST-01, SA-RST-02, SA-RST-05, SA-RST-06 (RH-MEDIA-01/SA-MEDIA-01 if Q-009). **States:** L · Err `WEBSITE_NOT_READY` shows checklist items · F · S "Website published".

#### `/restaurant/staff`
- **Purpose:** Invite and manage staff. **Perm:** `staff:read` (+ invite/update/deactivate).
- **Layout:** Invite button · tabs Active / Invited / Inactive · `DataTable` (name, email, role select (only assignable roles), status, invited/accepted, actions).
- **API:** LD-STF-01, SA-STF-01…SA-STF-06. **States:** L · E "Only you so far — invite your team" · Err `LAST_TENANT_ADMIN` explained · F · S "Invitation sent to {email}".
- **Accessibility:** role select labelled per row; own row actions disabled with explanation.

#### `/restaurant/settings`
- **Purpose:** Restaurant profile, hours, operations, kitchen sections. **Perm:** `restaurant:read` (+ update permissions per tab).
- **Layout:** tabs: Profile · Opening hours (7-day editor with split shifts, copy to all days) · Operations (timezone with current local time preview, currency (locked after first order), country, default order type, auto-print KOT, receipt footer) · Kitchen sections (sortable list).
- **API:** LD-RST-01, SA-RST-01, SA-RST-03, SA-RST-04, SA-KSEC-01…SA-KSEC-04. **States:** L · Err per tab · F read-only fields · S "Settings saved". **Fixes BA-27:** the form loads real data.

#### `/restaurant/printing`
- **Purpose:** Printers, agents, and the print queue. **Perm:** `print_job:read` (+ `printer:manage`, `print_agent:manage`).
- **Layout:** tabs: Queue (filters, jobs table with status badges icon+label, retry) · Printers (cards with health, section, agent; add/edit/test/deactivate) · Agents (list with online indicator, last seen, version; Pair new agent dialog showing the one-time code and steps; revoke).
- **Components:** `DataTable`, `PrinterCard`, `PairAgentDialog` (code in large monospace, expiry countdown), `ConfirmDialog`. **API:** LD-PRN-01, RH-PRN-01 (10 s), SA-PRN-01…SA-PRN-05, SA-AGT-01, SA-AGT-02.
- **States:** L · E Queue "No print jobs yet" / Printers "No printers — add your kitchen printer" (`Printer`) / Agents "No agent paired" · Err "Printer unavailable — Retry" per job · F · S "Test print queued" then live status (PRINTED only after agent ack).

#### `/restaurant/audit`
- **Purpose:** Tenant audit trail. **Perm:** `audit:read`.
- **Layout:** `FilterBar` (action, resource type, actor, date range) · `AuditTable` with expandable redacted before/after diff. **API:** LD-AUD-01.
- **States:** L · E "No activity for these filters" · Err · F. **Responsive:** stacked < md. **Accessibility:** diff uses text markers (added/removed), not colour only.

## 6. Component architecture

Location convention: `components/ui/*` primitives (no data access) · `components/layout/*` shells · `components/domain/<area>/*` feature components ·
`components/states/*` state components · `lib/ui/*` formatting and hooks. Baseline components are reworked (BA-31); unused ones are deleted after replacement.

| Component | Location | Responsibility | Used by | Baseline |
|---|---|---|---|---|
| `Button` (primary, secondary, ghost, destructive, success; sizes sm/md/lg; `icon`, `iconPosition="start"`, `loading`) | `ui/button.tsx` | Actions with consistent icon gap and pending state | all | rework `components/ui/button.tsx` |
| `IconButton` | `ui/icon-button.tsx` | Icon-only with required `aria-label` | tables, headers | new |
| `Form`, `FormField`, `FieldError`, `ErrorSummary` | `ui/form/*` | `useActionState` wiring, labels, help, errors | forms | new |
| `TextField`, `TextArea`, `Select`, `Checkbox`, `RadioGroup`, `Switch`, `MoneyField`, `PercentField`, `SearchField`, `DateField`, `TimeField` | `ui/inputs/*` | Accessible inputs with consistent height (40 px md, 48 px touch) | forms | rework `input.tsx`, `select.tsx` |
| `DataTable` (+ `ColumnHeader` sortable, `RowActions`, responsive card mode) | `ui/data-table/*` | Aligned columns, numeric right-align, truncation with title | lists | new |
| `Card`, `CardHeader`, `CardBody`, `CardFooter` | `ui/card.tsx` | Surface containers (standard / glass variant) | all | rework |
| `Dialog`, `ConfirmDialog` | `ui/dialog.tsx` | Native `<dialog>` modal, focus return, Esc | CRUD, destructive | rework |
| `Drawer` | `ui/drawer.tsx` | Side sheet (mobile nav, pickers) | responsive layouts | new |
| `Tabs` | `ui/tabs.tsx` | ARIA tabs pattern with arrow-key navigation | settings, reports | new |
| `Badge`, `StatusBadge` | `ui/badge.tsx`, `ui/status-badge.tsx` | Icon + label statuses (design.md §7) | orders, KOT, print, txn | rework `badge.tsx` |
| `Alert`, `Banner`, `StaleBanner` | `ui/alert.tsx` | Inline messages | forms, boards | new |
| `Toast`, `Toaster` | `ui/toast.tsx` | `role="status"` live region, 5 s, pause on hover | mutations | new |
| `Pagination` | `ui/pagination.tsx` | Cursor next/prev | lists | new |
| `FilterBar` | `ui/filter-bar.tsx` | URL-synced filters (search params) | lists | new |
| `SortableList` | `ui/sortable-list.tsx` | Pointer drag + keyboard move buttons + live announcements | categories, daily menu, sections | new |
| `AppShell`, `HeaderNav`, `NavItem`, `MoreMenu`, `BottomNav`, `FocusShell`, `AdminShell` | `layout/*` | Navigation shells (§3, ADR-013 §3) | layouts | replaces `Sidebar.tsx`/`sidebar-nav.tsx` and `PortalNavbar.tsx` |
| `LiveClock` | `layout/live-clock.tsx` | Restaurant-timezone clock | header, kitchen | rework (BA-32) |
| `EmptyState`, `ErrorState`, `ForbiddenState`, `NotFoundState`, `PageSkeleton` | `states/*` | Standard states (§4) | all | new |
| `KpiCard`, `WidgetCard`, `StatusStrip`, `QuickActions` | `domain/dashboard/*` | Dashboard widgets | dashboard | new |
| `MenuItemCard` (public), `PosItemTile`, `ItemOptionsDialog`, `VariantEditor`, `AddonEditor`, `DietaryMark`, `IconPicker` | `domain/menu/*` | Menu cards and editors | public, POS, menu | rework `MenuGrid.tsx`, `item-modal.tsx`, `category-modal.tsx` |
| `OrderCard`, `OrderLinesTable`, `TotalsSummary`, `OrderLineList`, `QuantityStepper`, `CustomerLookup` | `domain/orders/*` | Order cards and POS | orders | rework `OrderCard.tsx`, `POSCheckout.tsx` |
| `KitchenBoard`, `KotCard`, `KotStatusList`, `SectionSelector` | `domain/kitchen/*` | Kitchen board | kitchen, order detail | rework `KitchenBoard.tsx`, `KOTCard.tsx` |
| `PaymentPanel`, `RecordPaymentDialog`, `RefundDialog`, `TransactionTable`, `ReceiptView` | `domain/transactions/*` | Money UI | order detail, transactions | rework `print-receipt-client.tsx` |
| `PrinterCard`, `PairAgentDialog`, `PrintJobTable` | `domain/printing/*` | Printing console | printing | new |
| `PublicHero`, `DailyMenuSection`, `CategoryTabs`, `HoursTable`, `ContactBlock`, `OpenNowBadge` | `domain/public/*` | Public website | `/r/[slug]` | rework `public-menu-client.tsx` |
| `CardPreview`, `CaptionEditor`, `SocialPostCard` | `domain/social/*` | Social | social | new |
| `AuditTable`, `DiffView` | `domain/audit/*` | Audit | audit pages | new |
| `usePolling`, `useIdempotencyKey`, `formatMoney`, `formatInZone`, `useCapabilities` | `lib/ui/*` | Hooks and formatters | many | new |
