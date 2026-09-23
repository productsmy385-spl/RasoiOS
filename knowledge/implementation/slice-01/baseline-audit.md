---
title: "SLICE-01 Baseline Audit — Repository and Knowledge Base State on 2026-09-15"
document_type: "BASELINE_AUDIT"
project: "Restaurant SaaS Platform"
project_owner: "Gopala Krishna"
slice: "SLICE-01"
status: "FINAL"
version: "1.0"
created: "2026-09-15"
last_updated: "2026-09-15"
owner: "Gopala Krishna (Project Owner)"
planned_start: "2026-09-15"
planned_finish: "2026-09-15"
dependencies: []
related_documents: ["README.md", "slice-plan.md", "tasks.md", "risks.md", "threat-model.md", "open-questions.md"]
related_decisions: ["RASOIOS-ADR-003", "RASOIOS-ADR-004", "RASOIOS-ADR-005"]
---

# SLICE-01 Baseline Audit

This is the evidence record the whole SLICE-01 plan starts from. It was produced on
2026-09-15 by reading every file under `knowledge/`, reading the application source,
running the type checker and test suite, and comparing what the documentation claims with
what the code does.

Tag convention: **[fact]** = verified in code/config/command output (cited),
**[assumption]** = inferred, must be verified by the named task. Git baseline: commit
`18941a9` ("feat: complete production-grade RASOIOS restaurant platform", 2026-09-15,
163 files, 21,400 insertions) [fact].

---

## 1. Verification commands run

| Command | Result | Date |
|---|---|---|
| `npx tsc --noEmit` | Exit 0, no errors [fact] | 2026-09-15 |
| `npx vitest run` | 13 files, **42 tests passed** [fact] | 2026-09-15 |
| `npm run lint` | Not run — no ESLint config file at repo root (`eslint.config.*` / `.eslintrc*` absent) [fact]; `next lint` would prompt for setup [assumption] | 2026-09-15 |
| `npm run build` | Not run in this audit — verified in S1-P01-T001 | — |

All 42 tests replace Prisma with `vi.mock("@/lib/db/prisma")` [fact: e.g.
`tests/unit/orders-engine.test.ts:13`, `tests/unit/printing-architecture.test.ts:11`]. No test
touches a real PostgreSQL database, no E2E suite exists, Playwright is not installed
(`package.json` devDependencies) [fact].

---

## 2. What exists (reusable baseline)

| Area | Evidence | Assessment |
|---|---|---|
| Next.js 15 App Router, React 19, TypeScript strict | `package.json`, `tsconfig.json` (`"strict": true`) [fact] | Keep |
| Prisma schema — 15 models incl. `KOTTicket` | `prisma/schema.prisma:96-393` [fact] | Rework (see §4.4). **No `prisma/migrations/` directory** — schema never migrated [fact] |
| Clerk integration | `middleware.ts`, `lib/auth/clerk.ts`, sign-in/up pages [fact] | Rework (fail-open, see §4.1) |
| Tenant context resolver | `lib/auth/tenant-context.ts:31-77` validates session, user status, membership, tenant status [fact] | Keep the checks; change how the tenant is selected (ADR-006) |
| Ownership helper | `assertTenantOwnership` `lib/auth/tenant-context.ts:93-107` [fact] | Replace with 404-on-miss scoped queries (ADR-008) |
| RBAC matrix (12 permissions, 6 roles) | `lib/auth/permissions.ts:9-67` [fact] | Replace with permission catalogue v2 (`security.md` §3) |
| Structured logger with key redaction | `lib/logger.ts:3-47` [fact] | Keep; extend with request IDs |
| Error classes | `lib/errors.ts` [fact] | Keep; add safe-error mapping |
| Services: orders, KOT, payments, printing, analytics, social, public restaurant | `lib/services/*.ts` [fact] | Rework — logic defects listed in §4.3 |
| Menu category/item/daily-menu server actions with audit writes | `app/restaurant/menu/*-actions.ts` [fact] | Keep pattern; rework data model |
| Decimal arithmetic for order totals | `lib/services/orders.ts:94-130` uses `Prisma.Decimal` [fact] | Keep |
| Order item snapshots (name, price, tax rate) | `prisma/schema.prisma:284-299`, `lib/services/orders.ts:121-129` [fact] | Keep; extend to variants/add-ons |
| Order & KOT state-machine guards | `lib/services/orders.ts:32-40`, `lib/services/kot.ts:11-16` [fact] | Keep concept; correct transitions |
| Public restaurant field projection | `lib/services/public-restaurant.ts:41-97` [fact] | Keep projection approach |
| UI primitives: Button, Card, Badge, Input, Select, Dialog | `components/ui/*` [fact] | Rework into design system |
| Design tokens in CSS variables | `app/globals.css` `:root` [fact] | Rework (tonal scale, next/font) |
| PWA manifest + service worker | `public/manifest.json`, `public/sw.js` [fact] | Rework (see §4.6) |

---

## 3. Knowledge Base claims that the code does not support

| KB claim | Where | Reality | Resolution |
|---|---|---|---|
| Slices 02–08 "IMPLEMENTED" / "IMPLEMENTED & VERIFIED", all completed 2026-09-15 | `implementation/slice-02..08/README.md` | Large parts are placeholders or unwired (§4.5); security-critical gaps (§4.1–4.2) | Superseded by ADR-005; all SLICE-01 tasks start `PLANNED` |
| "12 / 12 tests" pass | `implementation/slice-01/slice-01-acceptance.md` | 42 tests, all mocked | Superseded by `testing.md` |
| R-001 cross-tenant leakage "MITIGATED" | `risks.md` (v1.0) | Print poll endpoint and receipt page leak across tenants (§4.1) | `risks.md` R001 re-opened |
| "Server verifies agent API key maps strictly to Tenant A" | `security/threat-model.md` (v1.0) | No agent key exists; tenant taken from query string | ADR-007, T-007 |
| Health check at `/api/health` | `operations/railway.md` (v1.0), `middleware.ts:10` | No `app/api/health` route exists [fact: `find app/api` → only `print-jobs/poll/route.ts`] | S1-P26-T003 |
| PR-004 test "E2E routing test", PR-006 `app/api/categories/route.ts`, PR-009 `services/order-service.ts` | `traceability-matrix.md` (v1.0) | Those files/tests do not exist | Replaced by `traceability.md` |
| `services/`, `repositories/` layers | `architecture.md` (v1.0) | Only `lib/services/`; no repository layer | `architecture.md` v2.0 |
| Backups: "WAL archiving, RPO < 1 hour" | `operations/backup.md` (v1.0) | Not verified against the Railway plan in use | Q-025, S1-P27-T006 |
| Cancellation allowed only from NEW/ACCEPTED | `product/business-rules.md` §3 (v1.0) | Code allows CANCELLED from PREPARING and READY (`lib/services/orders.ts:35-36`) [fact] | Documented rule kept; Q-008 |
| Commands `test:e2e`, `prisma:gen` | `CLAUDE.md` Development Commands | Not in `package.json` (has `prisma:generate`) [fact] | S1-P01-T002 |

---

## 4. Defects and gaps found in code

### 4.1 Critical — tenant isolation and authentication

| ID | Finding | Evidence |
|---|---|---|
| BA-01 | Print agent endpoint accepts `tenantId` from the query string (GET) and request body (POST); no agent authentication. Anyone who reaches it can drain and acknowledge another tenant's print queue (orders, customer names). Violates ADR-003. | `app/api/print-jobs/poll/route.ts:8-18, 36-57` [fact] |
| BA-02 | Printable receipt page loads any order by UUID with `findUnique({ where: { id } })` — no session, tenant or permission check. Exposes customer name/phone, items, payments across tenants. | `app/restaurant/billing/receipt/[orderId]/page.tsx:12-28` [fact] |
| BA-03 | Super Admin pages query all tenants with no role check. Any signed-in user (any tenant, any role) sees the platform tenant list. | `app/admin/page.tsx:10-12`, `app/admin/tenants/page.tsx:8-10` [fact] |
| BA-04 | Authentication fails open: if `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is missing or contains "placeholder", middleware passes every request and the root layout drops `ClerkProvider`. A production misconfiguration disables auth silently. | `middleware.ts:15-30`, `app/layout.tsx:13-34` [fact] |
| BA-05 | Any Clerk account that signs up gets a local `User` row (open self-registration); `/sign-up` is public. | `lib/auth/clerk.ts:22-41`, `middleware.ts:9` [fact] |
| BA-06 | `getAuthenticatedSession` swallows every error (DB outage, unique-email conflict) and returns `null`, turning infrastructure failures into "unauthenticated". | `lib/auth/clerk.ts:55-58` [fact] |
| BA-07 | Tenant selection comes from a client-supplied `requestedTenantId` argument on every server action; with none supplied it silently uses the first membership in unspecified order. Membership is still verified, so this is not a bypass, but it contradicts the "never trust client tenantId" rule's intent and makes multi-membership nondeterministic. | `lib/auth/tenant-context.ts:47-49`; e.g. `app/restaurant/orders/actions.ts:41-46` [fact] |
| BA-08 | `SUPER_ADMIN` is modelled as a tenant membership role, so platform authority is scoped to a tenant row. | `prisma/schema.prisma:27`, `lib/auth/permissions.ts:24-29` [fact] |

### 4.2 High — missing server-side permission checks

| ID | Finding | Evidence |
|---|---|---|
| BA-09 | `getOrdersAction` has a comment "Check if role is allowed" but no check. | `app/restaurant/orders/actions.ts:48-50` [fact] |
| BA-10 | `getCustomersAction` has no permission check — KITCHEN role can read customer PII. | `app/restaurant/customers/actions.ts:7-13` [fact] |
| BA-11 | `getPrintJobsAction`, `getSocialPostsAction` have no permission check. | `app/restaurant/printing/actions.ts:23-32`, `app/restaurant/social/actions.ts:54-63` [fact] |
| BA-12 | KOT status mutation authorised with the read permission `kitchen:view_queue`, which CASHIER and WAITER hold. | `app/restaurant/kds/actions.ts:31` [fact] |
| BA-13 | Reports and transactions pages resolve tenant but check no permission. | `app/restaurant/reports/page.tsx:10-11`, `app/restaurant/transactions/page.tsx:11-12` [fact] |

### 4.3 High — business-logic and data-integrity defects

| ID | Finding | Evidence |
|---|---|---|
| BA-14 | Order and KOT numbers derive from `count()` of today's rows — concurrent orders get duplicate numbers; "today" uses server-local midnight, not restaurant timezone; `order_number`/`kot_number` have no unique constraint. | `lib/services/orders.ts:45-58`, `lib/services/kot.ts:21-33`, `prisma/schema.prisma:262,305` [fact] |
| BA-15 | Order creation is not atomic: customer upsert, order insert and KOT generation run as separate statements; KOT failure is logged and swallowed. | `lib/services/orders.ts:132-203` [fact] |
| BA-16 | Client-supplied `options` (variants/add-ons) are stored in `optionsSnapshot` without validation or pricing. | `lib/services/orders.ts:10,128` [fact] |
| BA-17 | Variant/add-on prices stored as strings inside JSON — violates CLAUDE.md rule 4 (Decimal/NUMERIC persistence). | `prisma/schema.prisma:200-201`, `app/restaurant/menu/items-actions.ts:18-19` [fact] |
| BA-18 | Accepting an order generates a second KOT: the idempotency lookup filters `kitchenSection: null` but the ticket is created with `"MAIN_KITCHEN"`. | `lib/services/kot.ts:53-55` vs `:68`; called from `lib/services/orders.ts:200,250` [fact, by reading — not executed] |
| BA-19 | Public checkout (unauthenticated) upserts customers by phone and overwrites the stored name/email of whoever owns that number. | `lib/services/orders.ts:139-159`, `app/r/[slug]/checkout-action.ts:58-70` [fact] |
| BA-20 | Payment amount is client-supplied with no over-payment guard; once paid, the order jumps to COMPLETED from any status, bypassing the state machine. | `lib/services/payments.ts:41-78` [fact] |
| BA-21 | Refund marks the whole transaction and order REFUNDED regardless of order state or amount; no audit record. | `lib/services/payments.ts:95-140` [fact] |
| BA-22 | Print poll is not atomic: `findMany` then `updateMany` by id without a status guard — two concurrent polls claim the same jobs (duplicate printing). Ack does not require PROCESSING; retry has no attempt limit; no print job is ever created for a KOT. | `lib/services/printing.ts:66-87, 118-125, 140-155` [fact] |
| BA-23 | Orders, KOT, payments, printing and social services write no `AuditLog` rows (only menu, daily menu and restaurant settings do). | `grep auditLog` → only `app/restaurant/menu/*`, `app/restaurant/settings/actions.ts` [fact] |
| BA-24 | Reports/transactions pages add money with `Number()` floats and hard-code `$`; the transactions page lists orders, not `Transaction` rows. | `app/restaurant/reports/page.tsx:18-24,43`, `app/restaurant/transactions/page.tsx:14-36` [fact] |
| BA-25 | `DailyMenuItem` and `OrderItem` have no `tenant_id`; child→parent FKs are single-column, so the DB cannot prevent cross-tenant references. | `prisma/schema.prisma:229-239,284-299` [fact] |

### 4.4 Schema gaps against the brief

No entities for printers, print agents, kitchen sections, KOT items, opening hours or
reconciliation; restaurant timezone lives on `Tenant` with default `"UTC"`
(`prisma/schema.prisma:100`); `Restaurant` is 1:N to `Tenant` but code reads `restaurants[0]`
(`lib/services/public-restaurant.ts:63`); `Order` stores only `totalAmount` (no subtotal/tax);
`AuditLog.tenant` is `onDelete: SetNull` (`:373`) [fact]. Full redesign in `data-model.md`.

### 4.5 Placeholder, fake or unwired UI (violates "No Mocking / Fake Features")

| ID | Finding | Evidence |
|---|---|---|
| BA-26 | Menu editor renders hard-coded sample categories/items; daily-menu tab calls no action. | `app/restaurant/menu/page.tsx:15-56,222-240` [fact] |
| BA-27 | Settings form initial state is hard-coded demo data, not the tenant's profile — saving overwrites real data. | `app/restaurant/settings/page.tsx:12-20` [fact] |
| BA-28 | `/r/demo` falls back to a hard-coded restaurant. | `app/r/[slug]/page.tsx:16-83` [fact] |
| BA-29 | "Publish Now" sets a social post to PUBLISHED with no integration — fake publishing. | `app/restaurant/social/page.tsx:274-276` [fact] |
| BA-30 | Static "System Operational", "Agent API Status: Ready", "100% Operational" indicators. | `app/restaurant/dashboard/page.tsx:19,78`, `app/admin/page.tsx:60` [fact] |
| BA-31 | Staff order entry (`createStaffOrderAction`) has no UI; `POSCheckout`, `MenuGrid`, `OrderCard`, `KitchenBoard` components are imported by no page. | grep across `app/`, `components/` [fact] |
| BA-32 | Live clock uses browser-local time, not restaurant timezone. | `components/layout/PortalNavbar.tsx:17-31` [fact] |
| BA-33 | Home page links to `/dashboard`, which does not exist. | `app/page.tsx:54` [fact] |
| BA-34 | Sidebar is not role-aware and has no Staff, Audit, Website or Daily Menu entries; `/restaurant/kds` and `/restaurant/kitchen` duplicate; `/restaurant/analytics` duplicates reports. | `components/layout/Sidebar.tsx:23-34`, `app/restaurant/kitchen/page.tsx:1-5` [fact] |
| BA-35 | Super Admin "Open Console" button has no handler wired; no tenant create/suspend UI or actions exist. | `components/admin/TenantList.tsx:64-70`, `app/admin/page.tsx:74` [fact] |

### 4.6 Platform / operations gaps

| ID | Finding | Evidence |
|---|---|---|
| BA-36 | Manifest references `/icon-192.png`, `/icon-512.png`; `public/` contains neither. | `public/manifest.json:4-15`, `ls public` [fact] |
| BA-37 | Service worker pre-caches `/globals.css`, which Next.js does not serve at that path; `cache.addAll` rejects on any failed request, so install is expected to fail. | `public/sw.js:2,7` [fact]; install failure [assumption — verify in S1-P21-T002] |
| BA-38 | No Railway configuration file, no CI workflow (`.github/` absent), no health route, no ESLint config. | repo root listing [fact] |
| BA-39 | Remote images allowed from `images.unsplash.com`, `img.clerk.com` only; menu/logo image fields accept any URL. | `next.config.ts`, `app/restaurant/menu/items-actions.ts:14` [fact] |

---

### 4.6 Resolution status (2026-09-22, after the S1-P04-T007/T008 retrofit)

The findings above describe commit 18941a9 and are kept as written. This table records which are now fixed in the
working tree, with the evidence checked on 2026-09-22. Anything not listed here is still open and is handled by the
task named in `tasks.md`.

| ID | Status | Evidence |
|---|---|---|
| BA-01 | Fixed — unauthenticated poll route deleted; agent claim/ack is rebuilt with `AgentContext` (S1-P16/P17) | `app/api/print-jobs/poll/route.ts` removed [fact] |
| BA-02 | Fixed — receipt page requires `transaction:read` in the resolved tenant | `app/restaurant/billing/receipt/[orderId]/page.tsx:18` [fact] |
| BA-03 | Fixed — admin layout and pages require `platform:tenant:read` | `app/admin/layout.tsx:12`, `app/admin/page.tsx:10`, `app/admin/tenants/page.tsx:8` [fact] |
| BA-04 | Fixed — middleware always runs Clerk and fails closed | `middleware.ts`; `tests/static/auth-fail-closed.test.ts` [fact] |
| BA-05, BA-06 | Fixed — invite-only linking; infrastructure errors propagate as 503 | `lib/auth/session.ts`; `tests/integration/auth/session.test.ts` [fact] |
| BA-07 | Fixed — active tenant from the `rasoi_active_membership` preference cookie, revalidated server-side; `lib/auth/tenant-context.ts` deleted | `lib/auth/context.ts`, `lib/auth/active-membership-cookie.ts` [fact] |
| BA-08 | Fixed — `USER.platform_role` | `prisma/schema.prisma` [fact] |
| BA-09 … BA-13 | Fixed — every server action, route and page starts with a guard | `tests/static/guard-coverage.test.ts` [fact] |
| BA-14 | Fixed — order and KOT numbers come from the TENANT_COUNTER upsert in the same transaction (S1-P12-T003), per tenant and business date in the restaurant timezone; 50 concurrent creations verified | `lib/data/counters.ts`; `tests/integration/orders/numbering.test.ts` [fact] |
| BA-18 | Fixed — KOT generation is idempotent per (order, section, round) and backed by a unique key; KOTs are generated only on NEW → ACCEPTED | `lib/services/kot.ts`, `lib/services/orders.ts`; `tests/integration/kitchen/kot-generation.test.ts` [fact] |
| BA-19 | Fixed — checkout links an existing customer and never overwrites a profile | `lib/data/orders.ts:200` [fact] |
| BA-20, BA-21 | Fixed — payments cannot exceed the balance and refunds cannot exceed the refundable amount (both audited); since S1-P12-T005 a payment no longer completes the order — READY → COMPLETED is an explicit transition that requires PAID | `lib/services/payments.ts`, `lib/services/orders.ts`; `tests/integration/money/payments.test.ts`, `tests/integration/orders/order-status.test.ts` [fact] |
| BA-22 | Partly fixed — the racy poll is gone; atomic claim is S1-P16 | as BA-01 [fact] |
| BA-23 | Fixed for orders, KOT, payments, printing, social, menu, daily menu and settings | `audit(tx, …)` calls in `lib/services/*.ts` and `lib/data/*.ts` [fact] |
| BA-25 | Fixed — tenant-scoped composite FKs | `tests/integration/db/composite-fk.test.ts` (TC-DB-004) [fact] |

## 5. Unresolved decisions discovered

Recorded with options and recommendations in `open-questions.md`: public online ordering
(Q-001), restaurants per tenant (Q-002), order amendments (Q-003), tax model (Q-004),
media storage (Q-009), print agent runtime (Q-010), public hostname strategy (Q-013),
capacity/staffing (Q-016), existing data preservation (Q-017), backups (Q-025), and others.

## 6. Linear

The Project Owner instructed on 2026-09-15 that this project is **not** connected to Linear.
Task status is tracked in `tasks.md` only.
