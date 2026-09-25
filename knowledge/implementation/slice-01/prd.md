---
title: "SLICE-01 Product Requirements Document — Complete Restaurant SaaS Platform"
document_type: "PRD"
project: "Restaurant SaaS Platform"
project_owner: "Gopala Krishna"
slice: "SLICE-01"
status: "PROPOSED"
version: "2.0"
created: "2026-09-15"
last_updated: "2026-09-15"
owner: "Gopala Krishna (Project Owner / Product Owner)"
planned_start: "2026-09-15"
planned_finish: "Not scheduled — execution-order plan"
dependencies: []
related_documents: ["traceability.md", "acceptance.md", "open-questions.md", "../../product/scope.md", "../../product/terminology.md"]
related_decisions: ["RASOIOS-ADR-002", "RASOIOS-ADR-003", "RASOIOS-ADR-005", "RASOIOS-ADR-006", "RASOIOS-ADR-010"]
---

# SLICE-01 Product Requirements Document

This document covers **what** the product must do and **why**. How it is built is in `architecture.md`, `api.md`, `data-model.md` and
`frontend.md`. Every requirement maps to tasks and tests in `traceability.md`.

**Source codes used below:**

| Code | Source |
|---|---|
| `B§n` | SLICE-01 master planning brief from the Project Owner, 2026-09-15 |
| `IB§n` | Master implementation and UI/UX execution brief shared by the Project Owner, 2026-09-15 |
| `CL` | Repository `CLAUDE.md` |
| `KB1-PR-nnn` | Knowledge Base v1.0 PRD requirement |
| `ADR-nnn` | Decision record |
| `BA-nn` | Baseline audit finding |

Requirements sourced only from a PROPOSED ADR are marked *(proposed)* and become binding when that ADR is approved.

---

## 1. Product vision

A multi-tenant restaurant management platform. The platform owner licenses it to restaurants, and it gives each restaurant one
isolated, polished system for:
- its public website and menu
- daily menus
- staff and roles
- order entry
- kitchen tickets and a kitchen display
- reliable thermal printing
- payments recording and reconciliation
- reports and shareable menu content

Tenant A must never access Tenant B's private data (B§5).

## 2. Problem statement

Restaurants run on disconnected tools: a website builder for the menu, paper or ad-hoc systems for kitchen tickets,
standalone receipt printers, and spreadsheets or nothing for daily sales. Printing from cloud software to a USB/LAN
thermal printer behind a restaurant router is unreliable without a local component. Many restaurant software products also impose
subscription tiers that lock operational features (KB1 product thesis). This product is sold as a licence, with every approved feature
available to every tenant (ADR-002).

## 3. Target users and personas

| ID | Persona | Role | Goals | Pain points | Primary screens |
|---|---|---|---|---|---|
| PER-01 | Platform owner (Gopala Krishna or authorised administrator) | SUPER_ADMIN | Onboard restaurants, suspend/reactivate, keep the platform trustworthy | Tenant data leakage; manual onboarding | `/admin/*` |
| PER-02 | Restaurant owner / general manager | TENANT_ADMIN | Configure restaurant, website, menu, staff, printers; see sales | Complex setup; hidden plan limits | Dashboard, Settings, Website, Menu, Staff, Reports, Audit |
| PER-03 | Shift / operations manager | MANAGER | Run service: daily menu, orders, refunds, day close | Kitchen delays; cash mismatches | Dashboard, Orders, Daily menu, Transactions |
| PER-04 | Cashier | CASHIER | Enter orders fast, record payments, print receipts | Slow POS; wrong totals | New order, Orders, Order detail |
| PER-05 | Waiter / floor staff | WAITER | Take table orders on a tablet/phone, serve ready items | Walking to kitchen; lost tickets | New order, Orders, Kitchen (read) |
| PER-06 | Kitchen staff / chef | KITCHEN | See tickets clearly, mark preparing/ready | Unreadable tickets; missed orders | Kitchen |
| PER-07 | Diner (public) | none | See menu, today's specials, hours, contact | Outdated menus | `/r/[slug]` |

## 4. User journeys

| ID | Journey | Actor | Steps (happy path) | Key requirements |
|---|---|---|---|---|
| UJ-01 | Onboard a restaurant | PER-01 → PER-02 | Create tenant (name, slug, timezone, currency, admin email) → invitation email → admin signs in with OTP → onboarding checklist | REQ-ADMIN-003, REQ-AUTH-004, REQ-DASH-005 |
| UJ-02 | Set up restaurant | PER-02 | Profile → hours → kitchen sections → categories → items with variants/add-ons → publish website | REQ-REST-001…009, REQ-MENU-001…007, REQ-WEB-001 |
| UJ-03 | Invite staff | PER-02/03 | Staff → Invite (email, role) → staff accepts → appears Active | REQ-REST-010, REQ-RBAC-005 |
| UJ-04 | Publish today's menu | PER-03 | Daily menu → today → copy yesterday → adjust → publish → visible on website | REQ-DMENU-001…005 |
| UJ-05 | Dine-in order to kitchen | PER-05 | New order → Dine-in, table 4 → add items (choose Full, add butter) → Send to kitchen → KOT prints in kitchen and appears on board | REQ-ORDER-001…009, REQ-KOT-001…006, REQ-PRINT-001 |
| UJ-06 | Kitchen preparation | PER-06 | Kitchen board → card → Start → Ready → waiter marks Served | REQ-KITCH-001…006 |
| UJ-07 | Payment and receipt | PER-04 | Order detail → Record payment (cash, tendered 1000) → change shown → Complete → Print receipt | REQ-TXN-001…002, REQ-TXN-007, REQ-ORDER-004 |
| UJ-08 | Refund | PER-03 | Order detail → Refund (amount, reason) → ledger updated → audit | REQ-TXN-003, REQ-AUDIT-002 |
| UJ-09 | Close the day | PER-03 | Transactions → Day close → count cash → variance note → Close | REQ-TXN-005 |
| UJ-10 | Review performance | PER-02 | Reports → Last 7 days → Sales, Menu performance | REQ-RPT-001…006 |
| UJ-11 | Share menu | PER-02/03 | Social → Daily menu card → copy caption & link → post on Instagram manually → Mark as posted | REQ-SOC-001…005 |
| UJ-12 | Diner browses website | PER-07 | `/r/{slug}` → sees open-now, today's menu, categories, prices, contact | REQ-WEB-001…010 |
| UJ-13 | Printer offline recovery | PER-04 | Kitchen printer unplugged → job FAILED after retries → console shows "Printer unavailable" → reconnect → Retry → PRINTED | REQ-PRINT-005…008 |
| UJ-14 | Suspend a tenant | PER-01 | Tenant detail → Suspend (reason) → staff see suspended page; website offline → Reactivate later | REQ-ADMIN-005…006, REQ-TENANT-007 |

---

## 5. Functional requirements

Priority: **MUST** (release-blocking), **SHOULD** (planned in SLICE-01, may slip with owner approval), **COULD** (only if the gating open question approves it).

### 5.1 Platform and commercial model

| ID | Requirement | Priority | Source | Acceptance criteria |
|---|---|---|---|---|
| REQ-PLAT-001 | The product is sold as a software product/licence: no subscription plans (Starter/Professional/Business/Enterprise), membership tiers, monthly/annual subscriptions, recurring tenant billing or plan-based feature gating anywhere in schema, code, UI or docs | MUST | B§4, CL, ADR-002 | Consistency scan finds no plan/tier/subscription constructs; every feature available to every ACTIVE tenant |
| REQ-PLAT-002 | USER_TENANT is described and implemented only as an authorization membership | MUST | B§4 | No commercial fields on USER_TENANT; docs/UI never call it a subscription |
| REQ-PLAT-003 | The platform owner can create and manage multiple restaurant tenants | MUST | B§5 | SUPER_ADMIN creates ≥2 tenants and manages each from `/admin` |
| REQ-PLAT-004 | Each tenant receives an isolated environment: website, dashboard, staff, roles, menu, daily menu, orders, customers, kitchen, KOT, printing, transactions, reports, social menu, audit logs, PWA | MUST | B§5 | Each listed capability works for Tenant A and Tenant B independently |
| REQ-PLAT-005 | No fake, mock or placeholder functionality ships: no demo data fallbacks, fabricated status indicators, fake publishing, fake printing or fake payments | MUST | CL, IB§62, BA-26…30 | Code review + VQA-20 find none; baseline placeholders removed |

### 5.2 Multi-tenancy

| ID | Requirement | Priority | Source | Acceptance criteria |
|---|---|---|---|---|
| REQ-TENANT-001 | Every tenant-owned record carries `tenant_id` | MUST | CL, B§12 | Schema review: all tenant-owned tables have NOT NULL `tenant_id` |
| REQ-TENANT-002 | Tenant context is resolved strictly server-side; tenant identifiers in URL, body, query, headers or client state are never trusted | MUST | CL, B§15, ADR-003 | Inputs containing `tenantId` rejected; ADV-001 passes |
| REQ-TENANT-003 | A user of Tenant A cannot read, create, update, delete, export, report, print or audit Tenant B data, including customers, transactions, menu, orders, staff and settings | MUST | B§41 | TI-001…TI-062 pass |
| REQ-TENANT-004 | Missing and cross-tenant resources are indistinguishable (not found) | MUST | ADR-008 | TC-TENANT-003 passes |
| REQ-TENANT-005 | The database prevents cross-tenant references | MUST | ADR-008 | TC-DB-004: inserting a child with another tenant's parent fails |
| REQ-TENANT-006 | A user with several memberships selects the active restaurant deterministically, server-validated | SHOULD | ADR-006, BA-07 | TC-TENANT-004 passes |
| REQ-TENANT-007 | A suspended tenant's staff lose access on the next request and its public website returns not found | MUST | B§18 | TC-AUTH-008, TC-WEB-004 pass |
| REQ-TENANT-008 | A print agent can access only its own tenant's printers and jobs | MUST | B§30 | TI-041…TI-046, ADV-012 pass |
| REQ-TENANT-009 | Reports and dashboards never aggregate across tenants | MUST | B§32 | TI-047, TI-048, TC-RPT-006 pass |
| REQ-TENANT-010 | Development/test seed contains at least two tenants with distinct users and data; isolation suite runs in CI | MUST | IB§63–64 | `prisma/seed.ts` creates Tenant A/B; CI job green |

### 5.3 Authentication

| ID | Requirement | Priority | Source | Acceptance criteria |
|---|---|---|---|---|
| REQ-AUTH-001 | Authentication uses Clerk Email OTP only; no passwords are stored | MUST | B§16, CL | Clerk config has only email code; DB has no password columns; TC-AUTH-001/002 pass |
| REQ-AUTH-002 | Users can sign in (email → OTP), keep a session, and sign out | MUST | B§16 | E2E sign-in and sign-out pass |
| REQ-AUTH-003 | The authenticated Clerk user maps to a local USER | MUST | B§16 | TC-AUTH-005 passes |
| REQ-AUTH-004 | Access is invite-only; uninvited Clerk accounts receive no local account or data | MUST | ADR-006, BA-05 | TC-AUTH-006 passes |
| REQ-AUTH-005 | Protected routes require authentication; pages redirect to sign-in and APIs return 401 | MUST | B§16 | TC-AUTH-003/004 pass |
| REQ-AUTH-006 | Inactive or suspended users are denied with a clear account state | MUST | B§16 | TC-AUTH-007 passes |
| REQ-AUTH-007 | Authentication fails closed when configuration is missing or invalid | MUST | BA-04, ADR-006 | TC-AUTH-009 passes |
| REQ-AUTH-008 | OTPs, secrets and session tokens are never logged or persisted by the application | MUST | B§16, B§44 | TC-AUTH-011 passes |
| REQ-AUTH-009 | Authentication infrastructure failures are reported as errors, not as signed-out | SHOULD | BA-06 | TC-AUTH-010 passes |
| REQ-AUTH-010 | Clerk user changes/deletions sync via signature-verified webhooks | SHOULD | B§38 | TC-AUTH-016/017 pass |
| REQ-AUTH-011 | Deactivating a user's last membership or suspending a user revokes their sessions | SHOULD | B§16 (suspended account) | TC-AUTH-014 passes |

### 5.4 Authorization and RBAC

| ID | Requirement | Priority | Source | Acceptance criteria |
|---|---|---|---|---|
| REQ-RBAC-001 | Six roles exist: SUPER_ADMIN, TENANT_ADMIN, MANAGER, CASHIER, KITCHEN, WAITER | MUST | B§17, CL | Role enums match; seed covers each |
| REQ-RBAC-002 | Authorization is enforced on the server for every loader, action and route handler; UI visibility is not authorization | MUST | B§17, CL | TC-AUTH-013 static check + TC-RBAC-013 pass |
| REQ-RBAC-003 | The role → resource → action → permission matrix (security.md §3.3) is implemented as code constants | MUST | B§17 | TC-RBAC-101…TC-RBAC-150 pass |
| REQ-RBAC-004 | SUPER_ADMIN is a platform role with no access to tenant operational data | MUST | ADR-006 | TC-RBAC-002, TC-ADMIN-006 pass |
| REQ-RBAC-005 | Users cannot escalate privilege: role assignment hierarchy, no self role change | MUST | B§39 (role escalation) | TC-RBAC-010, ADV-005 pass |
| REQ-RBAC-006 | A tenant always retains at least one active TENANT_ADMIN | MUST | security.md §3.3 | TC-RBAC-012 passes |
| REQ-RBAC-007 | Each order and KOT transition is permitted only to the roles in security.md §3.4 | MUST | B§26 | TC-ORDER-006, TC-KOT-004 pass |
| REQ-RBAC-008 | Kitchen views exclude customer personal data and monetary amounts | SHOULD | B§27 (privacy) | TC-RBAC-011 passes |

### 5.5 Super Admin

| ID | Requirement | Priority | Source | Acceptance criteria |
|---|---|---|---|---|
| REQ-ADMIN-001 | Platform dashboard with active/suspended tenant counts, recent tenants and recent platform events | MUST | B§18, IB§10 | TC-ADMIN-001 passes; no fabricated indicators |
| REQ-ADMIN-002 | Tenant list with search, status filter and pagination | MUST | B§18 | TC-ADMIN-002 passes |
| REQ-ADMIN-003 | Create tenant with restaurant, timezone, currency and first TENANT_ADMIN invitation | MUST | B§18 | TC-ADMIN-003 passes |
| REQ-ADMIN-004 | Configure tenant name and slug | MUST | B§18 | TC-ADMIN-004 passes |
| REQ-ADMIN-005 | Suspend a tenant with a mandatory reason | MUST | B§18 | TC-ADMIN-005 passes |
| REQ-ADMIN-006 | Reactivate a suspended tenant | MUST | B§18 | TC-ADMIN-005 passes |
| REQ-ADMIN-007 | Inspect a tenant: metadata, restaurant summary, members, counts | MUST | B§18 | TC-ADMIN-006 passes |
| REQ-ADMIN-008 | Authorised administration: invite and revoke tenant administrators | MUST | B§18 | TC-ADMIN-003, TC-ADMIN-007 pass |
| REQ-ADMIN-009 | Platform audit log viewer | MUST | B§18 | TC-ADMIN-008 passes |
| REQ-ADMIN-010 | Every platform operation writes an audit event | MUST | B§18 | TC-AUDIT-001 covers platform actions |

### 5.6 Restaurant management and staff

| ID | Requirement | Priority | Source | Acceptance criteria |
|---|---|---|---|---|
| REQ-REST-001 | Restaurant identity: name and description | MUST | B§19 | TC-REST-002 passes |
| REQ-REST-002 | Branding: logo, cover image, optional accent colour meeting contrast | MUST | B§19 | TC-REST-003 passes |
| REQ-REST-003 | Contact: phone, email, address | MUST | B§19 | TC-REST-002 passes |
| REQ-REST-004 | Structured weekly opening hours with split shifts and overnight closing | MUST | B§19 | TC-REST-004 passes |
| REQ-REST-005 | Restaurant IANA timezone is required and editable | MUST | B§19, B§35 | TC-REST-005, TC-TZ-001 pass |
| REQ-REST-006 | Restaurant currency (ISO 4217) drives money formatting and is locked once orders exist | MUST | BA-24 *(proposed; default per Q-005)* | TC-REST-006 passes |
| REQ-REST-007 | Public website settings: publish/unpublish, contact visibility, SEO title/description | MUST | B§19–20 | TC-WEB-006, TC-WEB-007 pass |
| REQ-REST-008 | Operational settings: default order type, automatic KOT printing, receipt footer | SHOULD | B§19 | TC-REST-005 passes |
| REQ-REST-009 | Kitchen sections can be created, renamed, reordered and archived | MUST | B§28–29 | TC-KOT-007 passes |
| REQ-REST-010 | Staff management: invite, resend/revoke invite, change role, deactivate/reactivate | MUST | B§5, B§22 (`/restaurant/staff`) | TC-STAFF-001…004 pass |
| REQ-REST-011 | All restaurant settings are validated server-side | MUST | IB§12 | TC-SEC-001 covers settings actions |

### 5.7 Tenant dashboard

| ID | Requirement | Priority | Source | Acceptance criteria |
|---|---|---|---|---|
| REQ-DASH-001 | Dashboard shows today's sales, order summary, active kitchen orders, menu status, daily menu status, payment summary, printing health and quick actions | MUST | IB§11 | TC-DASH-001 passes with seeded data |
| REQ-DASH-002 | Dashboard figures use the restaurant business date and timezone | MUST | B§35 | TC-DASH-002 passes across a UTC midnight boundary |
| REQ-DASH-003 | Every widget shows real data or an actionable empty state; no decorative charts | MUST | IB§11 | VQA-20 and review pass |
| REQ-DASH-004 | Dashboard refreshes automatically every 30 s | SHOULD | ADR-009 | TC-DASH-001 poll assertion |
| REQ-DASH-005 | New tenants see an onboarding checklist computed from their data | COULD | IB§11 (useful information) *(proposed)* | TC-DASH-003 passes |

### 5.8 Public restaurant website

| ID | Requirement | Priority | Source | Acceptance criteria |
|---|---|---|---|---|
| REQ-WEB-001 | Each tenant has a public website at `{slug}.<PUBLIC_ROOT_DOMAIN>` (`{slug}.localhost` in development), with `/r/[slug]` kept as a fallback (ADR-012) | MUST | B§20, KB1-PR-004, ADR-012 | TC-WEB-001, TC-WEB-018, TC-WEB-019 pass |
| REQ-WEB-002 | Unknown slugs, suspended tenants and unpublished websites return the same not-found page | MUST | B§20 | TC-WEB-004 passes |
| REQ-WEB-003 | Hero with restaurant identity and branding | MUST | B§20, IB§13 | E2E visual check TC-WEB-001 |
| REQ-WEB-004 | Menu presentation: categories, items, prices (incl. variant "from" prices), add-ons, availability, dietary marks | MUST | B§20 | TC-WEB-001 passes |
| REQ-WEB-005 | Today's published daily menu is shown | MUST | B§25 (public display) | TC-DMENU-005 passes |
| REQ-WEB-006 | Opening hours and an open-now indicator in restaurant timezone | MUST | B§20, B§35 | TC-TZ-002 passes |
| REQ-WEB-007 | Contact and location details shown according to visibility settings | MUST | B§20 | TC-WEB-006 passes |
| REQ-WEB-008 | Responsive design that feels like a real restaurant website, not an admin dashboard | MUST | B§20, IB§13 | VQA checklist passes on `/r/[slug]` |
| REQ-WEB-009 | SEO: metadata, canonical URL, JSON-LD, sitemap, robots, Open Graph image | MUST | B§20 | TC-WEB-008, TC-WEB-009 pass |
| REQ-WEB-010 | After handover a restaurant customises its own site: theme preset or custom colours, surface mode, branding, identity, contact and social links — validated and contrast-checked server-side (ADR-013 §6) | MUST | Owner brief 2026-09-23, ADR-013 | TC-WEB-014, TC-WEB-017 pass |
| REQ-WEB-011 | The sections of a restaurant's site (which, in what order, with what copy) are configurable from a fixed section list; tenant copy is rendered as text, never markup | MUST | Owner brief 2026-09-23, ADR-013 | TC-WEB-016, TC-WEB-020 pass |
| REQ-WEB-012 | Two restaurants never render the same page: theme, sections, copy and imagery all come from tenant data, and a newly provisioned tenant already renders a complete site | MUST | Owner brief 2026-09-23 | TC-WEB-020, TC-ADMIN-013 pass |
| REQ-WEB-010 | Public boundary: no staff, customer, transaction, audit, settings or internal data is exposed | MUST | B§20 | TC-WEB-002, TC-WEB-005, ADV-025 pass |
| REQ-WEB-011 | Diners can place orders from the website | COULD | KB1 user journey 1; gated **Q-001** | Implemented only if Q-001 approves; otherwise TC-ORDER-012 asserts disabled |

### 5.9 Design system and frontend foundation

| ID | Requirement | Priority | Source | Acceptance criteria |
|---|---|---|---|---|
| REQ-DS-001 | Brand v2 tokens (#41E012, #2015EB, #EF0E23, #0CD9F5 — ADR-018) as contrast-checked tonal scales on near-black surfaces, exposed as semantic tokens (ADR-013) | MUST | B§21, IB§28, ADR-013 | design.md §2 implemented; TC-DS-001, TC-DS-009 pass |
| REQ-DS-002 | Typography: Playfair Display for display, Plus Jakarta Sans for UI, defined hierarchy | MUST | B§21, IB§28 | DCA-01 passes |
| REQ-DS-003 | One icon system (Lucide) with standard sizes; no emoji or mixed icon packs | MUST | IB§31–33 | DCA-02, VQA-05 pass |
| REQ-DS-004 | 4/8 px spacing scale and a consistent layout grid; no arbitrary spacing | MUST | IB§29–30 | TC-DS-002 static test passes |
| REQ-DS-005 | Reusable components: buttons (primary, secondary, ghost, destructive, success), forms, inputs, tables, cards, dialogs, drawers, tabs, badges, alerts, toasts, navigation (glass header + mobile bottom bar, no desktop sidebar), filters, pagination, menu cards, order cards, KOT cards, kitchen board, transaction tables, dashboard widgets | MUST | B§23, IB§34–39 | Component inventory frontend.md §6 exists and is used |
| REQ-DS-006 | Designed states for loading, empty, error, unauthorized, forbidden, not-found and success on every major page | MUST | B§22, IB§45 | TC-DS-003 E2E state checks pass |
| REQ-DS-007 | Statuses shown with icon + label, never colour alone | MUST | IB§40 | DCA-08 passes |
| REQ-DS-008 | Three-level glass system (navigation, panels, overlays) with opaque fallbacks; purposeful motion respecting reduced-motion (ADR-013 §2) | MUST | B§21, IB§41–42, ADR-013 | VQA-16, TC-DS-006 pass |
| REQ-DS-009 | WCAG 2.1 AA accessibility: semantics, keyboard, focus, labels, dialogs, contrast | MUST | B§22, IB§44 | TC-DS-004 (axe) zero serious/critical; keyboard E2E passes |
| REQ-DS-010 | Intentional responsive layouts for desktop, tablet and mobile | MUST | IB§43 | TC-DS-005 viewport suite passes |
| REQ-DS-011 | Visual QA checklist and design consistency audit pass for every major page | MUST | IB§55–56 | VQA-01…20 and DCA-01…10 recorded as pass |

### 5.10 Menu management

| ID | Requirement | Priority | Source | Acceptance criteria |
|---|---|---|---|---|
| REQ-MENU-001 | Categories can be created, read, updated and deleted (archived) | MUST | B§24 | TC-MENU-004/005 pass |
| REQ-MENU-002 | Categories can be reordered and published/unpublished | MUST | B§24 | TC-MENU-006/007 pass |
| REQ-MENU-003 | Items support name, description, price, image, icon, availability, dietary classification, tax, preparation metadata and display order | MUST | B§24 | TC-MENU-008 passes |
| REQ-MENU-004 | Items support variants with Decimal prices | MUST | B§24, CL | TC-MENU-012 passes |
| REQ-MENU-005 | Items support add-ons with Decimal prices | MUST | B§24, CL | TC-MENU-013 passes |
| REQ-MENU-006 | Items can be created, updated, deleted (archived), reordered, published and unpublished | MUST | B§24 | TC-MENU-009/010/006/007 pass |
| REQ-MENU-007 | Item availability can be toggled for the day (sold out) | MUST | B§24 | TC-MENU-011 passes |
| REQ-MENU-008 | Menu edits never change historical orders | MUST | CL | TC-ORDER-004 snapshot check passes |
| REQ-MENU-009 | All menu data is tenant scoped | MUST | B§24 | TI-001…TI-010 pass |
| REQ-MENU-010 | Destructive menu operations require confirmation | MUST | IB§14 | E2E confirms dialog |
| REQ-MENU-011 | Menu changes are audited, including price before/after | MUST | B§36 | TC-AUDIT-001 covers menu actions |

### 5.11 Daily menu

| ID | Requirement | Priority | Source | Acceptance criteria |
|---|---|---|---|---|
| REQ-DMENU-001 | A daily menu can be created for a date with selected items | MUST | B§25 | TC-DMENU-002 passes |
| REQ-DMENU-002 | Items in a daily menu can be ordered | MUST | B§25 | TC-DMENU-002 passes |
| REQ-DMENU-003 | Daily menus can be published and unpublished | MUST | B§25 | TC-DMENU-003 passes |
| REQ-DMENU-004 | A previous daily menu can be copied to another date | MUST | B§25 | TC-DMENU-004 passes |
| REQ-DMENU-005 | Scheduling: a published menu for a future date becomes visible when that date begins in the restaurant timezone | MUST | B§25 | TC-TZ-003 passes |
| REQ-DMENU-006 | Only published, non-archived items appear in a published daily menu | MUST | B§25 | TC-DMENU-003 passes |
| REQ-DMENU-007 | Draft daily menus can be deleted | SHOULD | B§25 | TC-DMENU-006 passes |
| REQ-DMENU-008 | Daily menu changes are audited | MUST | B§36 | TC-AUDIT-001 covers daily menu |

### 5.12 Orders

| ID | Requirement | Priority | Source | Acceptance criteria |
|---|---|---|---|---|
| REQ-ORDER-001 | Staff create orders through a fast, touch-friendly order entry screen | MUST | B§26, BA-31 | E2E UJ-05 passes |
| REQ-ORDER-002 | Order creation authenticates, resolves tenant, validates, verifies item ownership and availability, obtains authoritative prices, calculates totals server-side, creates order and items with snapshots, starts the KOT workflow and audits — atomically | MUST | B§26 | TC-ORDER-001, TC-ORDER-002 pass |
| REQ-ORDER-003 | The server never trusts client-provided tenant, price, total, tax, discount or ownership | MUST | B§26 | TC-ORDER-003, ADV-007, ADV-008, ADV-010 pass |
| REQ-ORDER-004 | Lifecycle NEW → ACCEPTED → PREPARING → READY → COMPLETED with CANCELLED and REFUNDED exceptions; invalid transitions rejected | MUST | B§26, KB1-PR-010 | TC-ORDER-005 passes |
| REQ-ORDER-005 | Each transition defines who, API, validation, database effect, audit, UI and test (security.md §3.4) | MUST | B§26 | TC-ORDER-006 passes |
| REQ-ORDER-006 | Order items snapshot name, variant, unit price, add-ons, tax rate and line amounts | MUST | CL | TC-ORDER-004 passes |
| REQ-ORDER-007 | Order numbers are sequential per business day and unique under concurrency | MUST | BA-14 | TC-ORDER-008 concurrency case passes |
| REQ-ORDER-008 | Duplicate submission of the same order attempt creates one order | MUST | B§37 (idempotency) | TC-ORDER-008 passes |
| REQ-ORDER-009 | Orders capture type (dine-in, takeaway, delivery), table, notes and priority | MUST | B§28–29 | TC-ORDER-001 passes |
| REQ-ORDER-010 | The order board refreshes automatically | MUST | B§29 | TC-ORDER-010 passes |
| REQ-ORDER-011 | Order detail shows lines, totals, KOTs, print status, payments and allowed actions | MUST | B§22 | TC-ORDER-011 passes |
| REQ-ORDER-012 | Cancellation requires a reason and follows role and payment rules | MUST | B§26 | TC-ORDER-007 passes |
| REQ-ORDER-013 | Concurrent updates to one order do not overwrite each other | SHOULD | B§37 | TC-ORDER-009 passes |
| REQ-ORDER-014 | Items can be added to an open order as a new kitchen round | COULD | gated **Q-003** | TC-ORDER-013 passes if approved |
| REQ-ORDER-015 | Discounts are applied server-side where approved | COULD | B§26 ("discount"), gated **Q-006** | Not implemented unless approved; `discount_amount` fixed at 0 |

### 5.13 Customers

| ID | Requirement | Priority | Source | Acceptance criteria |
|---|---|---|---|---|
| REQ-CUST-001 | Staff can create customers | MUST | B§27 | TC-CUST-001 passes |
| REQ-CUST-002 | Staff can look up and search customers | MUST | B§27 | TC-CUST-003 passes |
| REQ-CUST-003 | Staff can update customers | MUST | B§27 | TC-CUST-004 passes |
| REQ-CUST-004 | Customer detail shows order history | MUST | B§27 | TC-CUST-002 passes |
| REQ-CUST-005 | Only necessary personal data is collected; notes are staff-only; PII masked in logs and hidden from kitchen | MUST | B§27 | TC-CUST-005 passes |
| REQ-CUST-006 | Customer access is tenant isolated and permission controlled | MUST | B§27 | TI-031…TI-035 pass |
| REQ-CUST-007 | Submitting an order never overwrites an existing customer's stored details | MUST | BA-19 | TC-CUST-007 passes |
| REQ-CUST-008 | Customers can be archived and anonymised | SHOULD | B§27 (privacy), Q-020 | TC-CUST-006 passes |

### 5.14 KOT

| ID | Requirement | Priority | Source | Acceptance criteria |
|---|---|---|---|---|
| REQ-KOT-001 | A KOT originates only from a validated, accepted order | MUST | B§28 | TC-KOT-001 passes |
| REQ-KOT-002 | KOT numbers are sequential per business day and unique under concurrency | MUST | B§28 | TC-KOT-002 passes |
| REQ-KOT-003 | A KOT contains order/table context, kitchen section, items, quantities, instructions and timestamps | MUST | B§28 | TC-KOT-001 passes |
| REQ-KOT-004 | KOT status QUEUED → PREPARING → READY → SERVED, CANCELLED with the order | MUST | B§28 | TC-KOT-003 passes |
| REQ-KOT-005 | KOT print state is visible | MUST | B§28 | TC-KOT-006 passes |
| REQ-KOT-006 | KOT generation is idempotent (no duplicate tickets) | MUST | BA-18 | TC-KOT-001 duplicate case passes |
| REQ-KOT-007 | Staff can reprint a KOT | SHOULD | B§30 | TC-KOT-005 passes |
| REQ-KOT-008 | KOT events are audited | MUST | B§36 | TC-AUDIT-001 covers KOT |
| REQ-KOT-009 | KOTs are split per kitchen section | MUST | B§28–29 | TC-KOT-001 multi-section case passes |

### 5.15 Kitchen management

| ID | Requirement | Priority | Source | Acceptance criteria |
|---|---|---|---|---|
| REQ-KITCH-001 | Dedicated kitchen display | MUST | B§29, IB§19 | TC-KITCH-001 passes |
| REQ-KITCH-002 | Incoming tickets in a preparation queue by status | MUST | B§29 | TC-KITCH-001 passes |
| REQ-KITCH-003 | Filter by kitchen section | MUST | B§29 | TC-KITCH-003 passes |
| REQ-KITCH-004 | Elapsed timers against target preparation time and priority indication | MUST | B§29 | TC-KITCH-004 passes |
| REQ-KITCH-005 | Touch-friendly actions: start preparing, ready, served | MUST | B§29, IB§19 | E2E UJ-06 passes |
| REQ-KITCH-006 | New tickets appear within 5 seconds; stale connection is visible | MUST | B§29, ADR-009 | TC-KITCH-002 passes |
| REQ-KITCH-007 | Kitchen actions are permission controlled | MUST | B§29 | TC-RBAC-131…134 pass |
| REQ-KITCH-008 | Kitchen UI prioritises speed, clarity and readability with minimal decoration | MUST | IB§19 | VQA review of kitchen passes |

### 5.16 Print queue and local print agent

| ID | Requirement | Priority | Source | Acceptance criteria |
|---|---|---|---|---|
| REQ-PRINT-001 | Print jobs are created for KOTs, receipts and test prints | MUST | B§30, KB1-PR-014 | TC-PRINT-001 passes |
| REQ-PRINT-002 | Printers are registered and configured (USB/LAN, width, purpose, section, agent) | MUST | B§30 | TC-PRINT-011 passes |
| REQ-PRINT-003 | Job statuses PENDING, PROCESSING, PRINTED, FAILED | MUST | B§30 | TC-PRINT-002 passes |
| REQ-PRINT-004 | Agents poll for jobs and acknowledge results | MUST | B§30, ADR-004 | TC-PRINT-004/005 pass |
| REQ-PRINT-005 | Failed jobs retry automatically with backoff and can be retried manually | MUST | B§30 | TC-PRINT-013 passes |
| REQ-PRINT-006 | Failures are visible with reason in the console and on kitchen/order screens | MUST | B§30 | TC-PRINT-010 passes |
| REQ-PRINT-007 | Duplicate printing is prevented (dedupe, atomic claim, agent journal) | MUST | B§30 | TC-PRINT-003/004, TC-AGENT-008 pass |
| REQ-PRINT-008 | Offline agents and printers are detected and shown | MUST | B§30 | TC-AGENT-004 passes |
| REQ-PRINT-009 | Agents authenticate with per-device credentials; revocation is immediate | MUST | B§30, ADR-007 | TC-AGENT-001…003 pass |
| REQ-PRINT-010 | Print jobs are tenant isolated | MUST | B§30 | TI-041…TI-046 pass |
| REQ-PRINT-011 | A job is marked printed only after agent confirmation | MUST | IB§20 | TC-PRINT-006 passes |
| REQ-PRINT-012 | Receipts can be sent to a thermal printer | SHOULD | B§31 | TC-TXN-008 passes |
| REQ-AGENT-001 | A local agent prints queued jobs to USB and LAN ESC/POS thermal printers | MUST | B§30, ADR-004 | TC-AGENT-005/009 pass with simulator and one physical printer |
| REQ-AGENT-002 | The agent pairs using a one-time code and stores its credential securely | MUST | ADR-007 | TC-AGENT-002, TC-AGENT-007 pass |
| REQ-AGENT-003 | The agent reports heartbeat and printer health | MUST | B§30 | TC-AGENT-004 passes |
| REQ-AGENT-004 | The agent survives network loss and printer offline states without losing jobs | MUST | B§30 | TC-AGENT-009 passes |
| REQ-AGENT-005 | The agent is installable and documented for the restaurant's PC (OS per Q-010) | MUST | B§30 | Install guide verified on target OS (TC-AGENT-010) |

### 5.17 Transactions

| ID | Requirement | Priority | Source | Acceptance criteria |
|---|---|---|---|---|
| REQ-TXN-001 | Payments record amount, method (cash, card, UPI), reference and status against an order | MUST | B§31, KB1-PR-016 | TC-TXN-002 passes |
| REQ-TXN-002 | Payment amounts are validated server-side (no overpayment; cash tendered and change) | MUST | B§31 | TC-TXN-002, ADV-011 pass |
| REQ-TXN-003 | Partial and full refunds with mandatory reason | MUST | B§31 | TC-TXN-003 passes |
| REQ-TXN-004 | Same-day recording errors can be voided with reason | SHOULD | B§31 (status) *(proposed)* | TC-TXN-004 passes |
| REQ-TXN-005 | Business-day reconciliation (day close) with expected vs counted cash | MUST | B§31 | TC-TXN-006/007 pass |
| REQ-TXN-006 | Transaction history with filters | MUST | B§31 | TC-TXN-001 passes |
| REQ-TXN-007 | Receipt view per order, tenant-scoped | MUST | B§31, BA-02 | TC-TXN-008, TI-035 pass |
| REQ-TXN-008 | All money events are audited | MUST | B§31, B§36 | TC-AUDIT-001 covers money events |
| REQ-TXN-009 | Money is persisted as NUMERIC and calculated with Decimal arithmetic | MUST | CL | TC-DB-005, TC-ORDER-002 pass |
| REQ-TXN-010 | Order payment status is derived from the ledger | MUST | ADR-010 | TC-TXN-005 passes |
| REQ-TXN-011 | Receipts of a restaurant with a GSTIN print the GSTIN and split tax into CGST and SGST per tax rate; totals are unchanged | MUST | Q-004 (2026-09-15), ADR-010 §3 | TC-PRICE-003, TC-PRINT-017 pass |

### 5.18 Reports

| ID | Requirement | Priority | Source | Acceptance criteria |
|---|---|---|---|---|
| REQ-RPT-001 | Sales report | MUST | B§32 | TC-RPT-001 passes |
| REQ-RPT-002 | Orders report | MUST | B§32 | TC-RPT-002 passes |
| REQ-RPT-003 | Menu performance report | MUST | B§32 | TC-RPT-003 passes |
| REQ-RPT-004 | Transaction summary report | MUST | B§32 | TC-RPT-004 passes |
| REQ-RPT-005 | Daily summary report | MUST | IB§22 | TC-RPT-005 passes |
| REQ-RPT-006 | Date filtering by restaurant business dates | MUST | B§32, B§35 | TC-TZ-004 passes |
| REQ-RPT-007 | Aggregation is tenant scoped | MUST | B§32 | TC-RPT-006 passes |
| REQ-RPT-008 | Reports require `report:read` | MUST | B§32 | TC-RBAC-148 passes |
| REQ-RPT-009 | Report export | COULD | B§32 ("if approved"), gated **Q-014** | Not implemented unless approved; TI-049 |
| REQ-RPT-010 | Aggregates are Decimal-exact | MUST | CL, BA-24 | TC-RPT-001 exactness case passes |

### 5.19 Social menu and sharing

| ID | Requirement | Priority | Source | Acceptance criteria |
|---|---|---|---|---|
| REQ-SOC-001 | Menu card images are generated for daily menu, full menu and single items | MUST | B§33 | TC-SOC-003 passes |
| REQ-SOC-002 | Shareable public menu links | MUST | B§33 | TC-SOC-001 passes |
| REQ-SOC-003 | Social content (caption) preparation with copy actions | MUST | B§33 | TC-SOC-001 passes |
| REQ-SOC-004 | Posting status tracked honestly as staff-attested "marked posted" | MUST | B§33 | TC-SOC-002 passes |
| REQ-SOC-005 | The product never shows publishing success that did not happen | MUST | B§33, IB§23, BA-29 | TC-SOC-005 passes |
| REQ-SOC-006 | Automated publishing integrations | COULD | B§33 ("where approved"), gated **Q-012** | Not implemented unless approved |
| REQ-SOC-007 | Social actions are audited | MUST | B§33 | TC-AUDIT-001 covers social |

### 5.20 PWA

| ID | Requirement | Priority | Source | Acceptance criteria |
|---|---|---|---|---|
| REQ-PWA-001 | Web app manifest with correct icons (192, 512, maskable) | MUST | B§34 | TC-PWA-001 passes |
| REQ-PWA-002 | The console is installable | MUST | B§34 | TC-PWA-002 Lighthouse installability passes |
| REQ-PWA-003 | Service worker with an explicit update strategy | MUST | B§34 | TC-PWA-003 passes |
| REQ-PWA-004 | Offline behaviour is limited to an offline page; no unsupported offline claims | MUST | B§34 | TC-PWA-004 passes |
| REQ-PWA-005 | The service worker never caches authenticated pages or API responses | MUST | B§34 | TC-PWA-005 passes |

### 5.21 Timezone and live clock

| ID | Requirement | Priority | Source | Acceptance criteria |
|---|---|---|---|---|
| REQ-TZ-001 | Every restaurant has an IANA timezone | MUST | B§35 | TC-TZ-001 passes |
| REQ-TZ-002 | Timestamps are stored in UTC | MUST | B§35, KB1 database.md | TC-DB-007 passes |
| REQ-TZ-003 | Live clock shows restaurant-local time | MUST | B§35 | TC-TZ-005 passes |
| REQ-TZ-004 | Daily menu, opening hours, reports, order display, audit display and scheduling use the restaurant timezone | MUST | B§35 | TC-TZ-002…004, TC-TZ-006 pass |
| REQ-TZ-005 | No timezone is hard-coded in the application | MUST | B§35 | TC-TZ-007 static check passes |
| REQ-TZ-006 | Business-date ranges are correct across daylight-saving transitions | SHOULD | B§35 | TC-TZ-004 DST cases pass |

### 5.22 Audit logging

| ID | Requirement | Priority | Source | Acceptance criteria |
|---|---|---|---|---|
| REQ-AUDIT-001 | Audit records capture actor, tenant, action, resource, resource ID, before, after, timestamp and request metadata | MUST | B§36 | TC-AUDIT-001 passes |
| REQ-AUDIT-002 | Coverage: tenant changes, staff, roles, permissions, menus, daily menus, orders, KOT, transactions, settings, integrations, security-sensitive actions | MUST | B§36 | Catalogue security.md §7 fully covered by TC-AUDIT-001 |
| REQ-AUDIT-003 | Audit logs are append-only | MUST | CL | TC-AUDIT-003 passes |
| REQ-AUDIT-004 | Audit writes are atomic with the audited change | MUST | B§36 | TC-AUDIT-002 passes |
| REQ-AUDIT-005 | Audit state is redacted (no secrets; PII masked) | MUST | B§36, B§44 | TC-AUDIT-004 passes |
| REQ-AUDIT-006 | TENANT_ADMIN can view and filter the tenant audit log | MUST | B§22 (`/restaurant/audit`) | TC-AUDIT-005 passes |
| REQ-AUDIT-007 | SUPER_ADMIN can view platform audit events | MUST | B§18 | TC-ADMIN-008 passes |

## 6. Non-functional requirements

| ID | Requirement | Priority | Source | Acceptance criteria |
|---|---|---|---|---|
| REQ-SEC-001 | Every security control in security.md §5 is implemented and verified | MUST | B§38 | All SC "Verified by" tests pass |
| REQ-SEC-002 | Every threat in threat-model.md has an implemented mitigation and passing test | MUST | B§39 | Threat register all MITIGATED/VERIFIED |
| REQ-SEC-003 | Adversarial tests ADV-001…ADV-030 pass | MUST | B§42 | CI green |
| REQ-SEC-004 | Rate limiting on machine-facing and abuse-prone endpoints | MUST | B§38 | TC-SEC-013 passes |
| REQ-SEC-005 | Secure headers and CSP | MUST | B§38 | TC-SEC-014/015 pass |
| REQ-SEC-006 | All external input is validated at runtime | MUST | IB§51 | TC-SEC-001 passes |
| REQ-SEC-007 | Errors never expose stack traces, database details, secrets or tokens | MUST | IB§58 | TC-SEC-007 passes |
| REQ-SEC-008 | No known high or critical dependency vulnerabilities at release | MUST | B§38 | TC-FOUND-004 passes |
| REQ-SEC-009 | Secrets are managed outside the repository and rotatable | MUST | B§38 | DEP-CHK-01, DEP-CHK-12 pass |
| REQ-SEC-010 | Uploaded files are validated, re-encoded and tenant-isolated (if uploads approved) | MUST | B§38, gated Q-009 | TC-SEC-016/017 pass if approved |
| REQ-NFR-001 | Performance: p95 server time < 500 ms for console loaders/actions and < 300 ms for polling endpoints at target load; public page LCP < 2.5 s (mobile, 4G profile) | SHOULD | *(proposed targets)* | TC-QA-005 load test and Lighthouse pass |
| REQ-NFR-002 | Scale target: 50 tenants, 500 orders/day and 5 concurrent screens per tenant without breaching REQ-NFR-001 | SHOULD | *(proposed; confirm with owner)* | TC-QA-005 |
| REQ-NFR-003 | Availability target 99.5% monthly for the production service | SHOULD | *(proposed; Railway plan dependent)* | Measured post-launch from health checks |
| REQ-NFR-004 | Accessibility WCAG 2.1 AA across public site and console | MUST | B§22, IB§44 | TC-DS-004 passes |
| REQ-NFR-005 | Supported browsers per Q-026 (recommended: latest two versions of Chrome, Edge, Safari, Firefox; Chrome on Android tablets; Safari on iPadOS) | SHOULD | Q-026 | TC-DS-005 matrix |
| REQ-NFR-006 | Data durability: automated backups with a tested restore | MUST | B§43 | DEP-CHK-08 |
| REQ-NFR-007 | Maintainability: strict TypeScript, lint, tests and build pass on every change | MUST | CL | CI gates green |
| REQ-NFR-008 | English UI; currency and timezone per restaurant (other languages per Q-028) | SHOULD | Q-028 | Review |
| REQ-OBS-001 | Structured JSON logs with request/correlation IDs | MUST | B§44 | TC-OBS-001 passes |
| REQ-OBS-002 | Liveness and readiness health checks | MUST | B§44 | TC-OBS-004 passes |
| REQ-OBS-003 | Errors are captured with request context (tooling per Q-018) | MUST | B§44 | TC-OBS-005 passes |
| REQ-OBS-004 | Database health and slow queries are monitored | MUST | B§44 | DEP-CHK-10 |
| REQ-OBS-005 | Print queue and agent health are monitored with alerts on backlog/offline | MUST | B§44 | TC-OBS-006 passes |
| REQ-OBS-006 | OTPs, secrets, passwords, API keys and session tokens are never logged | MUST | B§44 | TC-OBS-002 passes |
| REQ-OBS-007 | Maintenance jobs (rate-limit cleanup) are monitored | SHOULD | B§44 (job monitoring) | TC-OBS-007 passes |
| REQ-OPS-001 | Railway application service and PostgreSQL for staging and production | MUST | B§43 | DEP-CHK-11 |
| REQ-OPS-002 | Environment variables are documented and validated at startup | MUST | B§43 | TC-FOUND-003 passes |
| REQ-OPS-003 | Migrations run with `prisma migrate deploy` as a controlled release step | MUST | B§43 | Release runbook executed on staging |
| REQ-OPS-004 | Build and start commands are defined and reproducible | MUST | B§43 | CI build + Railway deploy succeed |
| REQ-OPS-005 | Railway health check configured to `/api/ready` | MUST | B§43 | DEP-CHK-11 |
| REQ-OPS-006 | Rollback procedure documented and rehearsed | MUST | B§43 | DEP-CHK-13 |
| REQ-OPS-007 | Backup and restore procedure documented and rehearsed | MUST | B§43 | DEP-CHK-08 |
| REQ-OPS-008 | Staged deployment sequence (CI → staging → production) | MUST | B§43 | Release log |
| REQ-OPS-009 | Production smoke tests after every deploy | MUST | B§43 | TC-QA-006 passes |
| REQ-OPS-010 | Continuous integration runs lint, typecheck, unit, integration, isolation and build on every pull request | MUST | CL, B§25 | Workflow green |
| REQ-TEST-001 | Unit tests for pricing, time, state machines, validation, permissions | MUST | B§40 | Coverage report ≥ 90% lines in `lib/pricing`, `lib/time`, `lib/auth` |
| REQ-TEST-002 | Integration tests against real PostgreSQL | MUST | B§40, CL | CI integration job green |
| REQ-TEST-003 | API tests for route handlers and actions | MUST | B§40 | CI green |
| REQ-TEST-004 | Authentication tests | MUST | B§40 | TC-AUTH-* pass |
| REQ-TEST-005 | RBAC matrix tests | MUST | B§40 | TC-RBAC-* pass |
| REQ-TEST-006 | Tenant isolation and adversarial tests | MUST | B§41–42 | TI-*, ADV-* pass |
| REQ-TEST-007 | Database tests: constraints, triggers, migrations | MUST | B§40 | TC-DB-* pass |
| REQ-TEST-008 | End-to-end tests for journeys UJ-01…UJ-14 | MUST | B§40, CL | Playwright green |
| REQ-TEST-009 | Automated accessibility tests | MUST | B§40 | TC-DS-004 passes |
| REQ-TEST-010 | Responsive viewport tests | MUST | B§40 | TC-DS-005 passes |
| REQ-TEST-011 | Printing tests with agent simulator and physical printer | MUST | B§40 | TC-AGENT-009 passes |
| REQ-TEST-012 | Regression suite gating every release | MUST | B§40 | TC-QA-004 |
| REQ-TEST-013 | Production smoke tests | MUST | B§40 | TC-QA-006 |
| REQ-TEST-014 | Visual QA across every major page | MUST | IB§55 | VQA records complete |
| REQ-FOUND-001 | npm scripts match CLAUDE.md commands (`test:e2e`, `prisma:gen`, `prisma:migrate`, `test:unit`) | MUST | CL, baseline-audit §3 | TC-FOUND-001 passes |
| REQ-FOUND-002 | ESLint is configured and lint, typecheck and build pass | MUST | CL | TC-FOUND-002 passes |

## 7. Business rules

| ID | Rule | Source |
|---|---|---|
| BR-MONEY-01 | Money is `NUMERIC(12,2)`, rates `NUMERIC(5,2)`; arithmetic uses Decimal only | CL, ADR-010 |
| BR-MONEY-02 | Prices, taxes and totals are calculated on the server; client values are rejected | CL, B§26 |
| BR-MONEY-03 | Line tax = ROUND_HALF_UP(line subtotal × rate / 100, 2); order totals are sums of lines | ADR-010 |
| BR-MONEY-04 | Currency is per restaurant and cannot change once any order exists | ADR-010 |
| BR-TEN-01 | USER_TENANT is an authorization relationship, not a commercial subscription | B§4 |
| BR-TEN-02 | Tenants are never hard-deleted; suspension blocks staff and public access | B§18 |
| BR-MENU-01 | Categories and items referenced by history are archived, never deleted | CL (snapshots) |
| BR-MENU-02 | Unpublished or archived items are neither public nor orderable; unavailable items are not orderable | B§24 |
| BR-MENU-03 | If an item has active variants, an order line must choose exactly one; the variant price is the unit price | ADR-010 |
| BR-MENU-04 | An item can be published only in a published category | B§24 |
| BR-DMENU-01 | One daily menu per tenant per business date | B§25 |
| BR-DMENU-02 | Publishing requires ≥1 item, all published and not archived, and a date ≥ today | B§25 |
| BR-DMENU-03 | A published daily menu is publicly visible only on its business date (restaurant timezone) | B§25, B§35 |
| BR-DMENU-04 | Only DRAFT daily menus can be deleted | B§25 |
| BR-DMENU-05 | Ordering is not restricted to daily menu items (pending Q-021) | Q-021 |
| BR-ORD-01 | Creation validates: items/variants/add-ons belong to tenant, published, available, not archived; quantity 1–99; ≤100 lines | B§26 |
| BR-ORD-02 | Allowed transitions: NEW→ACCEPTED; ACCEPTED→PREPARING; PREPARING→READY; READY→COMPLETED; NEW/ACCEPTED→CANCELLED; COMPLETED→REFUNDED (automatic on full refund). All others rejected. | B§26, KB1 business-rules |
| BR-ORD-03 | KOTs are generated when an order becomes ACCEPTED ("Send to kitchen" creates and accepts in one step) | B§28 |
| BR-ORD-04 | Order moves to PREPARING when its first KOT starts and to READY when all KOTs of the latest round are READY or SERVED | B§29 |
| BR-ORD-05 | CASHIER/WAITER may cancel only NEW orders; TENANT_ADMIN/MANAGER may cancel NEW, ACCEPTED, PREPARING or READY orders; reason required; net paid must be zero | KB1 business-rules, Q-008 (B, 2026-09-22) |
| BR-ORD-06 | An order can be COMPLETED only when fully paid | Q-007 (A, 2026-09-22) |
| BR-ORD-07 | Order numbers `YYYYMMDD-NNNN` per business day; KOT numbers `K-NNN` per business day | ADR-010 |
| BR-ORD-08 | Order items and their add-ons are immutable after creation | CL |
| BR-ORD-09 | An order submission with a previously used idempotency key returns the original order | B§37 |
| BR-ORD-10 | Orders and payments cannot be recorded against a closed business day | B§31 |
| BR-KOT-01 | One KOT per (order, kitchen section, round) | B§28 |
| BR-KOT-02 | KOT transitions: QUEUED→PREPARING→READY→SERVED; any non-SERVED → CANCELLED when the order is cancelled | B§28 |
| BR-PRINT-01 | Only an agent acknowledgement sets PRINTED | IB§20, ADR-007 |
| BR-PRINT-02 | Automatic retries: up to 3 attempts with exponential backoff; then FAILED until manual retry | ADR-007 |
| BR-PRINT-03 | Each logical print has a unique dedupe key; reprints are explicit new jobs | ADR-007 |
| BR-PRINT-04 | KOTs route to the section's printer, falling back to an unsectioned KOT printer | architecture.md §6.2 |
| BR-TXN-01 | Payment amount > 0 and ≤ outstanding balance | ADR-010 |
| BR-TXN-02 | Cash may record tendered ≥ amount; change due = tendered − amount | B§31 |
| BR-TXN-03 | UPI requires a reference; references resembling card numbers are rejected | B§31 |
| BR-TXN-04 | Refund ≤ remaining refundable amount of the referenced payment; reason required | B§31 |
| BR-TXN-05 | Voids only for SUCCESS rows on the same business date before day close, with reason; payments with refunds cannot be voided | *(proposed)* |
| BR-TXN-06 | A closed business day accepts no new ledger rows or voids | B§31 |
| BR-TXN-07 | Payment status: UNPAID (paid=0), PARTIALLY_PAID (0<paid<total), PAID (paid≥total, refunded=0), PARTIALLY_REFUNDED (0<refunded<paid), REFUNDED (refunded=paid>0) | ADR-010 |
| BR-CUST-01 | Phone numbers (E.164) are unique per tenant | B§27 |
| BR-CUST-02 | Order submissions never modify existing customer records | BA-19 |
| BR-CUST-03 | Anonymisation is irreversible and keeps order history links | Q-020 |
| BR-STAFF-01 | MANAGER may manage only CASHIER, WAITER, KITCHEN; nobody changes their own role | security.md §3.3 |
| BR-STAFF-02 | The last active TENANT_ADMIN cannot be demoted or deactivated | security.md §3.3 |
| BR-SOC-01 | Menu cards use only published public data | B§33 |
| BR-SOC-02 | Social post status: DRAFT→READY→MARKED_POSTED; any→ARCHIVED | B§33 |
| BR-SOC-03 | No "published" state exists without an approved integration returning success | B§33 |
| BR-RPT-01 | Net sales = Σ total of COMPLETED/REFUNDED orders in range − Σ refunds recorded in range; cancelled orders excluded | *(proposed; confirm with owner)* |
| BR-RPT-02 | Report ranges are inclusive business dates in the restaurant timezone | B§35 |
| BR-AUD-01 | Audit records are never updated or deleted | CL |

## 8. Requirement coverage by brief section

| Brief section | Requirement IDs |
|---|---|
| §4 Commercial model | REQ-PLAT-001, REQ-PLAT-002 |
| §5 Vision | REQ-PLAT-003, REQ-PLAT-004 |
| §15 Tenant isolation | REQ-TENANT-001…010 |
| §16 Authentication | REQ-AUTH-001…011 |
| §17 RBAC | REQ-RBAC-001…008 |
| §18 Super Admin | REQ-ADMIN-001…010 |
| §19 Restaurant | REQ-REST-001…011 |
| §20 Public website | REQ-WEB-001…011 |
| §21–23 Design / frontend / components | REQ-DS-001…011 |
| §24 Menu | REQ-MENU-001…011 |
| §25 Daily menu | REQ-DMENU-001…008 |
| §26 Orders | REQ-ORDER-001…015 |
| §27 Customer | REQ-CUST-001…008 |
| §28 KOT | REQ-KOT-001…009 |
| §29 Kitchen | REQ-KITCH-001…008 |
| §30 Printing | REQ-PRINT-001…012, REQ-AGENT-001…005 |
| §31 Transactions | REQ-TXN-001…010 |
| §32 Reports | REQ-RPT-001…010 |
| §33 Social | REQ-SOC-001…007 |
| §34 PWA | REQ-PWA-001…005 |
| §35 Timezone | REQ-TZ-001…006 |
| §36 Audit | REQ-AUDIT-001…007 |
| §38–42 Security & testing | REQ-SEC-001…010, REQ-TEST-001…014 |
| §43–44 Deployment & observability | REQ-OPS-001…010, REQ-OBS-001…007 |
| IB§11 Dashboard | REQ-DASH-001…005 |

## 9. Acceptance criteria (product level)

The product is accepted when every MUST requirement's acceptance criteria are met, and every approved COULD requirement's criteria
are met, as recorded in `traceability.md`, together with the release gates in `acceptance.md`.

## 10. Non-goals

These are **not** part of SLICE-01 (full Future Scope list in `../../product/scope.md`):

- SaaS subscription plans, tiers, recurring tenant billing and plan-based feature gating (ADR-002).
- Native mobile applications (B§57).
- AI features (B§57).
- ERP, inventory, purchasing or advanced accounting (B§57).
- Microservices or additional runtime infrastructure (B§57, ADR-001).
- Payment gateway processing (Q-015), delivery logistics/driver tracking (KB1 scope), table/floor plan management, loyalty programmes.
- Automated social publishing (Q-012), report exports (Q-014), discounts (Q-006) and public online ordering (Q-001), each unless approved.
- Multi-outlet tenants (Q-002) and languages other than English (Q-028).
