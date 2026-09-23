---
title: "SLICE-01 Testing Plan — Strategy, Suites, Gates and Test Catalogue"
document_type: "TEST_PLAN"
project: "Restaurant SaaS Platform"
project_owner: "Gopala Krishna"
slice: "SLICE-01"
status: "PROPOSED"
version: "2.0"
created: "2026-09-15"
last_updated: "2026-09-15"
owner: "QA Engineer (UNASSIGNED) — approval: Gopala Krishna"
planned_start: "2026-09-15"
planned_finish: "Not scheduled — execution-order plan"
dependencies: ["tasks.md", "security.md", "tenant-isolation-tests.md"]
related_documents: ["tenant-isolation-tests.md", "security.md", "threat-model.md", "acceptance.md", "../../testing/test-strategy.md"]
related_decisions: ["RASOIOS-ADR-005", "RASOIOS-ADR-008"]
---

# SLICE-01 Testing Plan

## 1. Principles

1. **Real systems over mocks.** Integration, isolation, RBAC, API and database tests run against a real PostgreSQL database with migrations
   applied (CLAUDE.md "No Mocking / Fake Features"). Mocks are allowed only at external boundaries (Clerk identity, Clerk Backend API HTTP calls,
   object storage) and for pure-function unit tests. The 42 baseline tests mock Prisma (`baseline-audit.md` §1). Each is replaced by its feature phase.
2. **Two tenants, always.** All test data contains Tenant A and Tenant B with identical-looking content, so leaks show up by content (SC-TEN-10).
3. **A feature is not complete without its tests.** A task is COMPLETED only when its listed tests pass (tasks.md).
4. **No skipped security tests.** Isolation (TI), adversarial (ADV) and RBAC matrix suites cannot contain skipped cases at release.
5. **Evidence is recorded.** Manual and review tests record results in §7–§8 and acceptance.md.

## 2. Test layers and tooling

| Layer | Tool | Location | Runs | Covers |
|---|---|---|---|---|
| Unit | Vitest (`unit` project) | `tests/unit/**` | every PR | Pure logic: pricing, money, time, validation, permissions, transitions, renderers, encoders |
| Static | Vitest (`static` project) + TypeScript compiler API | `tests/static/**` | every PR | Tenant-scope guard, guard coverage, strict schemas, design tokens, timezone formatting, projections, forbidden markers |
| Integration / API | Vitest (`integration` project) + PostgreSQL | `tests/integration/**` | every PR | Services, loaders, Server Actions, Route Handlers, constraints, triggers, audit, rate limits |
| Tenant isolation | Vitest integration | `tests/integration/isolation/**` | every PR (required) | TI-001…TI-062 |
| Adversarial | Vitest integration + Playwright | `tests/integration/adversarial/**`, `tests/e2e/adversarial/**` | every PR (required) | ADV-001…ADV-030 |
| RBAC matrix | Vitest integration driver | `tests/integration/rbac-matrix.test.ts` | every PR (required) | TC-RBAC-101…150 |
| Database | Vitest integration | `tests/integration/db/**` | every PR | Migrations, drift, composite FKs, CHECKs, triggers, inventory |
| E2E | Playwright (desktop, tablet, mobile projects) | `tests/e2e/**` | every PR (smoke subset), nightly (full) | Journeys UJ-01…UJ-14, states, flows |
| Accessibility | `@axe-core/playwright` + manual | `tests/e2e/a11y/**` | every PR (touched routes), nightly (all) | WCAG 2.1 AA |
| Responsive | Playwright viewport matrix | `tests/e2e/responsive/**` | PRs touching UI, nightly | 360/390/768/1024/1280/1440 |
| Printing | Printer simulator + physical printers | `tools/printer-simulator`, `tests/e2e/printing/**` | every PR (simulator), manual (physical) | Agent chain, ESC/POS bytes, failures |
| Performance | Node.js scripts (built-in fetch/undici) | `tests/perf/**` | before readiness gate | REQ-NFR-001/002 |
| Smoke | Playwright `@smoke` | `tests/e2e/smoke/**` | after every deploy | Health, sign-in, key screens, order create/cancel in smoke tenant |
| Regression | Playwright + Vitest `@regression` tags | tagged specs | release branches (required) | High-risk paths |
| Visual QA | Manual checklist (design.md §12) | §8 records | before readiness gate | VQA-01…VQA-20, DCA-01…DCA-10 |

**Line endings.** `.gitattributes` pins the repository to LF (`* text=auto eol=lf`) [fact: added 2026-09-23]. Git for
Windows defaults to `core.autocrlf=true`, so before that a checkout — or a `git stash` cycle — rewrote every text file
with CRLF while the index kept LF, and the two tests that read files byte for byte (`claude-md-commands`, and the
`@supports` blocks in `design-system`) failed for a reason no diff would show. If either fails on a fresh clone, check
the working tree's line endings before the assertion.

**Timing-sensitive static tests.** Three static tests run a real tool rather than a matcher — `lint-rules.test.ts` runs
ESLint on fixtures, `strict-schemas.test.ts` and the tenant-scope analyzer run the TypeScript compiler API over the
repository. Alone they take seconds; in a full `vitest run`, competing with the integration project for CPU, they have
taken ten times longer and have timed out [observed 2026-09-22 and 2026-09-23]. The `static` project's timeout is set
to 180 s for this reason. **A timeout in one of these is not a finding**: re-run the file on its own before believing
it, and only treat it as a real failure when it fails in isolation.

## 3. Environments and data

| Environment | Database | Identity | Data |
|---|---|---|---|
| Local | Docker PostgreSQL (same major as staging) | Clerk development instance | `npm run db:seed` (Tenant A "Spice Route", Asia/Kolkata, INR; Tenant B "Harbour Grill", America/New_York, USD) |
| CI | PostgreSQL service container, per-worker databases | Identity stubbed at `auth()` for integration; Clerk testing tokens for E2E | Seed + factories; deterministic UUIDs |
| Staging | Railway PostgreSQL | Clerk development instance | Seed plus perf dataset when load testing |
| Production | Railway PostgreSQL | Clerk production instance | Dedicated **smoke tenant** only for smoke tests; no seed |

Clock injection (`lib/time/clock.ts`) makes business-date and timer tests deterministic. The printer simulator provides a deterministic ESC/POS sink.

## 4. Suites by area

| Area | What must be proven | Test IDs |
|---|---|---|
| Foundation | Scripts, lint rules, env validation, CI audit, no fabricated UI | TC-FOUND-001…008, TC-QA-002, TC-OPS-001 |
| Database | Migration integrity, constraints, composite FKs, UTC timestamps, seed safety, drift | TC-DB-001…010, TC-AUDIT-003 |
| Authentication | OTP flows, fail-closed config, invited linking, inactive users, webhooks, redaction, safe redirects | TC-AUTH-001…018 |
| Tenant context | Server-derived tenant, 404 parity, active tenant cookie, no tenant params | TC-TENANT-001…006, TI-*, ADV-001…006 |
| RBAC | Deny-by-default, platform separation, hierarchy, transitions, projections, UI not authorization, full matrix | TC-RBAC-001, 002, 010…016, 101…150 |
| Super Admin | Lifecycle, inspection projection, platform audit scope, bootstrap | TC-ADMIN-001…012 |
| Restaurant & staff | Validation, hours, timezone, currency lock, website readiness, staff invitations | TC-REST-001…008, TC-STAFF-001…004 |
| Design system | Tokens, fonts, icons, primitives, states, accessibility, responsive | TC-DS-001…015 |
| Public website | Projection whitelist, not-found parity, SEO, OG, caching, response shape | TC-WEB-001…011, TC-SEC-002, TC-SEC-006 |
| Menu & daily menu | CRUD, modifiers, publish, scheduling across timezones | TC-MENU-001…017, TC-DMENU-001…008, TC-TZ-003 |
| Orders & customers | Server pricing, snapshots, idempotency, numbering, lifecycle, concurrency, privacy | TC-ORDER-001…019, TC-PRICE-001…002, TC-CUST-001…010 |
| KOT & kitchen | Idempotent generation, sections, transitions, derived order status, board latency, readability | TC-KOT-001…010, TC-KITCH-001…009 |
| Printing | Queue leasing, dedupe, ack ownership, routing, agent auth, encoder, transports, physical printers | TC-PRINT-001…016, TC-AGENT-001…016 |
| Transactions | Ledger rules, refunds, voids, day close, receipts | TC-TXN-001…012 |
| Reports & dashboard | Exact aggregation, timezone ranges, tenant scoping, performance | TC-RPT-001…009, TC-DASH-001…004 |
| Social | Cards from public data, honest statuses | TC-SOC-001…006 |
| PWA | Manifest, installability, safe caching, update prompt | TC-PWA-001…005 |
| Timezone | Validation, open-now, ranges, clock, display sweep, change safety, cross-tenant | TC-TZ-001…009 |
| Audit | Coverage, atomicity, immutability, redaction, viewer scope, metadata, volume | TC-AUDIT-001…008 |
| Security hardening | Validation, XSS, SSRF, SQLi, CSRF/CORS, headers, CSP, limits, dependencies, projections, threat sign-off | TC-SEC-001…023, ADV-001…030 |
| Observability | Correlation, redaction, health, security events, monitoring, errors | TC-OBS-001…008 |
| Deployment | Production reachability, DB roles/TLS, pipeline, secrets, Clerk prod, backup restore, rollback, runbooks | TC-OPS-001…009 |
| QA & release | Isolation/RBAC completeness, journeys, accessibility, responsive, regression, performance, printing, visual QA, UAT, release gates | TC-QA-001…016, TC-REL-001…010 |

## 5. Mandatory tenant isolation and adversarial testing

Fully specified in `tenant-isolation-tests.md`:

- **62 TI scenarios.** User A (Tenant A) attempts READ, CREATE, UPDATE, DELETE, EXPORT, REPORT, PRINT and AUDIT against Tenant B for customers,
  transactions, menu, orders, staff, settings, daily menu, KOT, printing, social, files, platform and public boundaries. Every attempt is denied.
- **30 ADV scenarios.** Changed tenantId, resource ID, role, membership; direct API access; URL and body manipulation; price, total and ownership
  manipulation; print-job and agent forgery; cache and export manipulation; webhook forgery.

## 6. CI gates

| Gate | Blocks merge to `main` | Blocks release |
|---|---|---|
| Lint, typecheck, unit, static | Yes | Yes |
| Integration (incl. database) | Yes | Yes |
| Tenant isolation (TI) | Yes | Yes (100%, no skips) |
| Adversarial (ADV) | Yes | Yes (100%, no skips) |
| RBAC matrix | Yes | Yes (no `todo` rows) |
| E2E smoke subset | Yes | — |
| E2E full journeys | Nightly | Yes |
| Accessibility (axe) | Touched routes | All routes zero serious/critical |
| Responsive | Touched UI | All routes |
| `npm audit --audit-level=high` | Yes | Yes |
| Build | Yes | Yes |
| Regression pack | Release branches | Yes |
| Performance | — | Targets met (TC-QA-005/TC-REL-002) |
| Visual QA / DCA / UAT | — | Signed records |

Flaky tests are quarantined with a linked fix task and 48-hour SLA. Security suites may not be quarantined.

## 7. Manual and field test records

Record results here as tasks complete (date, tester, environment, outcome, evidence link).

| Test ID | Date | Tester | Environment / device | Outcome | Evidence |
|---|---|---|---|---|---|
| TC-FOUND-008 | — | — | — | — | — |
| TC-KITCH-008 | — | — | — | — | — |
| TC-AGENT-010 | — | — | — | — | — |
| TC-QA-013 | — | — | — | — | — |
| TC-OPS-007 | — | — | — | — | — |
| TC-OPS-008 | — | — | — | — | — |
| TC-REL-005 | — | — | — | — | — |
| TC-REL-006 | — | — | — | — | — |
| TC-REL-008 | — | — | — | — | — |
| TC-REL-009 (hypercare log) | — | — | — | — | — |

## 8. Visual QA records

| Page | VQA-01…VQA-20 result | Issues fixed | Screenshots |
|---|---|---|---|
| Dashboard, Menu (categories, items, editor), Daily menu, Orders, Order entry, Order detail, Receipt, Kitchen, Transactions, Day close, Customers, Reports, Social, Website, Staff, Settings, Printing, Audit, Super Admin (all), Public website, Sign-in/up, Account pages | — | — | — |

## 9. Test catalogue

The catalogue is generated from the **Tests** fields in `tasks.md`, the RBAC matrix in `security.md` §3.3 and `tenant-isolation-tests.md`.
Each test is defined exactly once.
Catalogue status values: `PLANNED` → `IMPLEMENTED` (the test exists in `tests/` and passes locally) → `VERIFIED_CI` (it has passed in GitHub Actions).

<!-- CATALOGUE:START -->
### 9.1 Counts

| Type | Count |
|---|---|
| build | 1 |
| ci | 6 |
| e2e | 63 |
| integration | 233 |
| manual | 12 |
| perf | 5 |
| review | 9 |
| smoke | 4 |
| static | 16 |
| unit | 30 |
| **Task-defined test cases (TC)** | **379** |
| Tenant isolation scenarios (TI) | 62 |
| Adversarial scenarios (ADV) | 30 |
| **Total** | **471** |

### 9.2 Test case catalogue

| Test ID | Type | Description | Defined in task | Phase | Status |
|---|---|---|---|---|---|
| TC-ADMIN-001 | e2e | Dashboard shows seeded active/suspended counts and recent tenants; empty database shows create CTA. | S1-P06-T003 | P06 | IMPLEMENTED |
| TC-ADMIN-002 | e2e | Search by name and filter SUSPENDED return expected rows; pagination moves through >25 tenants. | S1-P06-T004 | P06 | IMPLEMENTED |
| TC-ADMIN-003 | integration | Create tenant commits tenant, restaurant and INVITED admin atomically; invitation failure leaves tenant with resendable invite and warning. | S1-P06-T001 | P06 | IMPLEMENTED |
| TC-ADMIN-004 | integration | Slug validation rejects reserved words, bad patterns and duplicates; slug change requires confirmation and is audited. | S1-P06-T001 | P06 | IMPLEMENTED |
| TC-ADMIN-005 | integration | Suspend requires 10–500 char reason; staff denied next request; reactivate restores access. | S1-P06-T001 | P06 | IMPLEMENTED |
| TC-ADMIN-006 | integration | Inspection loader returns counts and members only — no order, customer, transaction or menu rows. | S1-P06-T006 | P06 | IMPLEMENTED |
| TC-ADMIN-007 | integration | Revoking a pending admin invitation marks membership INACTIVE and revokes the Clerk invitation. | S1-P06-T001 | P06 | IMPLEMENTED |
| TC-ADMIN-008 | integration | Platform audit returns tenant lifecycle and platform rows but not tenant operational events (e.g. `order.created`). | S1-P06-T007 | P06 | IMPLEMENTED |
| TC-ADMIN-009 | e2e | TENANT_ADMIN and MANAGER visiting `/admin`, `/admin/tenants` and `/admin/audit` see ForbiddenState with no tenant list in HTML. | S1-P06-T002 | P06 | IMPLEMENTED |
| TC-ADMIN-010 | e2e | Create tenant happy path lands on detail with invitation toast; duplicate slug shows field error without losing input. | S1-P06-T005 | P06 | IMPLEMENTED |
| TC-ADMIN-011 | e2e | Suspending a tenant with a reason makes that tenant's staff see the suspended page on next navigation. | S1-P06-T006 | P06 | IMPLEMENTED |
| TC-ADMIN-012 | integration | Command grants the role once, is idempotent, writes one audit row, and refuses without confirmation. | S1-P06-T008 | P06 | IMPLEMENTED |
| TC-ADMIN-013 | integration | Creating a tenant yields a restaurant, default website sections and a themed public site that renders before anyone edits it. | S1-P06-T009 | P06 | IMPLEMENTED |
| TC-ADMIN-014 | integration | Reserved labels and duplicate slugs are rejected; a tenant role cannot create a tenant or change a slug. | S1-P06-T009 | P06 | IMPLEMENTED |
| TC-AGENT-001 | integration | Pairing returns a token once; only its hash and prefix are stored; the token authenticates subsequent calls. | S1-P16-T005 | P16 | IMPLEMENTED |
| TC-AGENT-002 | integration | Pairing code is single-use, expires after 10 minutes, is stored hashed, and pairing creation is rate-limited. | S1-P16-T004 | P16 | IMPLEMENTED |
| TC-AGENT-003 | integration | After revocation, the next heartbeat or claim returns 401. | S1-P16-T005 | P16 | IMPLEMENTED |
| TC-AGENT-004 | integration | Heartbeat updates printer health; agent shown offline after 90 s without calls (injected clock). | S1-P16-T005 | P16 | IMPLEMENTED |
| TC-AGENT-005 | integration | Config returns only printers assigned to the calling agent. | S1-P16-T005 | P16 | IMPLEMENTED |
| TC-AGENT-006 | static | Agent source contains no `child_process`, `exec`, `spawn` or shell invocation using job data. | S1-P17-T005 | P17 | PLANNED |
| TC-AGENT-007 | integration | After pairing, token is retrievable from the credential store, absent from `config.json` and logs. | S1-P17-T003 | P17 | PLANNED |
| TC-AGENT-008 | integration | Agent killed after printing but before ack re-claims the job after lease expiry and acknowledges it without printing again. | S1-P17-T004 | P17 | PLANNED |
| TC-AGENT-009 | e2e | Order acceptance results in a printed KOT on the simulator within 10 s and PRINTED status in UI; physical printer runs recorded. | S1-P17-T008 | P17 | PLANNED |
| TC-AGENT-010 | manual | Clean install on each approved OS runs as a service after reboot, pairs, and prints a test page. | S1-P17-T009 | P17 | PLANNED |
| TC-AGENT-011 | unit | Config rejects `http://` server URLs and unknown keys; logger redacts token and payload fields. | S1-P17-T002 | P17 | PLANNED |
| TC-AGENT-012 | integration | With the server unreachable for 2 minutes the agent backs off, then resumes and prints queued jobs in order. | S1-P17-T004 | P17 | PLANNED |
| TC-AGENT-013 | unit | Golden byte sequences for KOT and receipt fixtures at 58 and 80 mm match expected output. | S1-P17-T005 | P17 | PLANNED |
| TC-AGENT-014 | integration | LAN transport delivers bytes to the TCP simulator; with the simulator stopped the job fails with PRINTER_OFFLINE and health reports OFFLINE. | S1-P17-T006 | P17 | PLANNED |
| TC-AGENT-015 | integration | Simulator decodes a golden KOT byte stream into expected text and supports each fault mode. | S1-P17-T007 | P17 | PLANNED |
| TC-AGENT-016 | review | Signed checklist with evidence; agent opens no listening sockets (verified with `netstat`). | S1-P17-T010 | P17 | PLANNED |
| TC-AUDIT-001 | integration | Every action in security.md §7 is produced by at least one endpoint with all required fields populated. | S1-P23-T001 | P23 | PLANNED |
| TC-AUDIT-002 | integration | When the business transaction rolls back, no audit row persists; when it commits, exactly one row exists. | S1-P04-T010 | P04 | IMPLEMENTED |
| TC-AUDIT-003 | integration | `UPDATE audit_logs` and `DELETE FROM audit_logs` raise an exception. | S1-P02-T003 | P02 | IMPLEMENTED |
| TC-AUDIT-004 | unit | Redaction removes token/secret/otp keys and masks customer phone and email in before/after states. | S1-P04-T010 | P04 | IMPLEMENTED |
| TC-AUDIT-005 | integration | TENANT_ADMIN sees only own-tenant rows; MANAGER receives FORBIDDEN; platform rows never included. | S1-P23-T002 | P23 | IMPLEMENTED |
| TC-AUDIT-006 | e2e | Filtering by action and date range shows matching entries; expanding a price change shows redacted before/after. | S1-P23-T002 | P23 | PLANNED |
| TC-AUDIT-007 | integration | Spoofed `X-Forwarded-For` values beyond the trusted hop count are ignored; request id matches the response header. | S1-P23-T003 | P23 | IMPLEMENTED |
| TC-AUDIT-008 | perf | Tenant audit list with filters over 1M rows returns in < 500 ms p95. | S1-P23-T004 | P23 | PLANNED |
| TC-AUTH-001 | e2e | Invited test user signs in with email code using Clerk testing tokens. | S1-P03-T001 | P03 | PLANNED |
| TC-AUTH-002 | e2e | Wrong code shows an error and no session is created. | S1-P03-T001 | P03 | PLANNED |
| TC-AUTH-003 | integration | Unauthenticated request to `/restaurant/orders` redirects to `/sign-in?redirect_url=%2Frestaurant%2Forders`. | S1-P03-T002 | P03 | IMPLEMENTED |
| TC-AUTH-004 | integration | Unauthenticated `GET /api/v1/orders` returns 401 JSON `UNAUTHENTICATED`. | S1-P03-T002 | P03 | IMPLEMENTED |
| TC-AUTH-005 | integration | Clerk user whose verified email matches an INVITED membership is linked and activated once. | S1-P03-T003 | P03 | IMPLEMENTED |
| TC-AUTH-006 | integration | Clerk user with no invitation gets no USER row and state NO_ACCOUNT. | S1-P03-T003 | P03 | IMPLEMENTED |
| TC-AUTH-007 | integration | USER with status INACTIVE or SUSPENDED resolves to INACTIVE and receives no data. | S1-P03-T003 | P03 | IMPLEMENTED |
| TC-AUTH-008 | integration | After suspension, a TENANT_ADMIN of that tenant receives the suspended page and 403 `TENANT_SUSPENDED` from `/api/v1/orders`. | S1-P04-T004 | P04 | IMPLEMENTED |
| TC-AUTH-009 | unit | App boot fails when Clerk keys are missing or placeholder. | S1-P03-T002 | P03 | IMPLEMENTED |
| TC-AUTH-010 | integration | Simulated database outage during session resolution returns 503, not 401. | S1-P03-T002 | P03 | IMPLEMENTED |
| TC-AUTH-011 | integration | Captured logs from sign-in resolution, webhook and invitation flows contain no OTP, bearer token, cookie or signature values. | S1-P03-T009 | P03 | IMPLEMENTED |
| TC-AUTH-012 | unit | `safeRedirect` accepts `/restaurant/orders`, rejects `https://evil.test`, `//evil.test`, `/\evil`. | S1-P03-T005 | P03 | PLANNED |
| TC-AUTH-013 | static | Every exported server action, route handler and loader calls a guard first or is on the reviewed public allow-list. | S1-P04-T002 | P04 | IMPLEMENTED |
| TC-AUTH-014 | integration | Deactivating a user's last active membership calls session revocation (Clerk Backend API stubbed at the HTTP boundary) and the next request is denied. | S1-P03-T004 | P03 | IMPLEMENTED |
| TC-AUTH-015 | e2e | Signing out removes the active tenant cookie and protected pages redirect to sign-in. | S1-P03-T005 | P03 | PLANNED |
| TC-AUTH-016 | integration | Invalid signature and timestamps older than 5 minutes return 400 and change nothing. | S1-P03-T008 | P03 | IMPLEMENTED |
| TC-AUTH-017 | integration | Replaying a valid `user.deleted` twice yields the same final state; unknown event type returns 200 without changes. | S1-P03-T008 | P03 | IMPLEMENTED |
| TC-AUTH-018 | e2e | Uninvited signed-in user lands on no-access page with no tenant data in the HTML. | S1-P03-T006 | P03 | PLANNED |
| TC-CUST-001 | integration | Create normalises phone to E.164; duplicate phone returns PHONE_EXISTS without revealing data to callers lacking `customer:read`. | S1-P13-T001 | P13 | IMPLEMENTED |
| TC-CUST-002 | integration | History paginates newest first; totals omitted for WAITER. | S1-P13-T002 | P13 | IMPLEMENTED |
| TC-CUST-003 | integration | Lookup by partial phone or name returns ≤ 10 masked results from the caller's tenant only; 61st call in a minute returns 429. | S1-P13-T002 | P13 | IMPLEMENTED |
| TC-CUST-004 | integration | Update changes fields with masked audit before/after; linking a customer to an order (SA-ORD-05) validates tenant ownership. | S1-P13-T001 | P13 | IMPLEMENTED |
| TC-CUST-005 | integration | KITCHEN is forbidden from all customer endpoints; list responses mask phone numbers; logs contain only masked values. | S1-P13-T002 | P13 | IMPLEMENTED |
| TC-CUST-006 | integration | Archive hides from lists; anonymise replaces name and clears phone/email/notes irreversibly while orders keep the link. | S1-P13-T001 | P13 | IMPLEMENTED |
| TC-CUST-007 | integration | Creating an order for an existing customer id or with a phone that already exists never changes the stored customer name or email. | S1-P12-T004 | P12 | IMPLEMENTED |
| TC-CUST-008 | e2e | Cashier searches, creates and edits a customer; TENANT_ADMIN anonymises with typed confirmation; phone-exists error links to the existing record. | S1-P13-T003 | P13 | IMPLEMENTED |
| TC-CUST-009 | e2e | Typing the last digits of a seeded phone selects the customer and the created order shows that customer. | S1-P13-T004 | P13 | PLANNED |
| TC-CUST-010 | integration | RBAC matrix rows TC-RBAC-135…TC-RBAC-138 pass; TI-031…TI-034 pass. | S1-P13-T005 | P13 | PLANNED |
| TC-DASH-001 | integration | Summary values equal direct queries on seed data for Tenant A. | S1-P19-T002 | P19 | PLANNED |
| TC-DASH-002 | integration | At 23:30 and 00:30 restaurant time, "today" figures switch business date correctly while UTC date differs. | S1-P19-T002 | P19 | PLANNED |
| TC-DASH-003 | e2e | A freshly created tenant sees the onboarding checklist; completing profile and publishing the website ticks items. | S1-P19-T004 | P19 | PLANNED |
| TC-DASH-004 | e2e | Seeded tenant dashboard shows correct KPI values and each widget links to its screen. | S1-P19-T004 | P19 | PLANNED |
| TC-DB-001 | integration | `prisma migrate deploy` applies to an empty database and `prisma migrate diff` shows no drift. | S1-P02-T003 | P02 | IMPLEMENTED |
| TC-DB-002 | integration | Seed runs twice without duplicates and creates two tenants with every tenant role. | S1-P02-T007 | P02 | IMPLEMENTED |
| TC-DB-003 | static | `prisma validate` passes; static test fails if any model/field/enum name matches `/plan\|tier\|subscription\|billing\|feature_?flag/i`. | S1-P02-T002 | P02 | IMPLEMENTED |
| TC-DB-004 | integration | For each composite FK, cross-tenant child insert fails with a foreign-key violation. | S1-P02-T004 | P02 | IMPLEMENTED |
| TC-DB-005 | integration | CHECK constraints reject negative money, inconsistent totals and non-zero discount. | S1-P02-T003 | P02 | IMPLEMENTED |
| TC-DB-006 | integration | A query exceeding the runtime statement timeout is cancelled with a mapped error. | S1-P02-T005 | P02 | IMPLEMENTED |
| TC-DB-007 | integration | All timestamp columns are `timestamptz`; inserted instants round-trip in UTC. | S1-P02-T003 | P02 | IMPLEMENTED |
| TC-DB-008 | integration | Feature probe script asserts `NULLS NOT DISTINCT` and `gen_random_uuid()` work on the CI database. | S1-P02-T001 | P02 | IMPLEMENTED |
| TC-DB-009 | unit | Seed exits non-zero when `NODE_ENV=production`. | S1-P02-T007 | P02 | IMPLEMENTED |
| TC-DB-010 | integration | CI round trip: reset, deploy, drift check returns empty. | S1-P02-T009 | P02 | IMPLEMENTED |
| TC-DMENU-001 | integration | Loader defaults to today in restaurant timezone and returns only the tenant's menus and pickable items. | S1-P11-T002 | P11 | IMPLEMENTED |
| TC-DMENU-002 | integration | Save draft creates or updates the menu for the business date with ordered items; foreign item ids return not-found; past dates rejected. | S1-P11-T001 | P11 | IMPLEMENTED |
| TC-DMENU-003 | integration | Publish requires ≥1 published item; unpublish hides it; republish restores. | S1-P11-T001 | P11 | IMPLEMENTED |
| TC-DMENU-004 | integration | Copy from a previous date skips archived/unpublished items and reports them. | S1-P11-T001 | P11 | IMPLEMENTED |
| TC-DMENU-005 | integration | Only the PUBLISHED daily menu whose business date equals today in the restaurant timezone is returned. | S1-P09-T002 | P09 | PLANNED |
| TC-DMENU-006 | integration | Only DRAFT menus can be deleted; PUBLISHED returns `NOT_DRAFT`. | S1-P11-T001 | P11 | IMPLEMENTED |
| TC-DMENU-007 | e2e | Manager copies yesterday's menu, reorders, publishes, and sees it on the public site today. | S1-P11-T003 | P11 | IMPLEMENTED |
| TC-DMENU-008 | integration | Every daily menu action writes its audit action with item set before/after. | S1-P11-T005 | P11 | IMPLEMENTED |
| TC-DS-001 | static | Tailwind resolved config exposes only the design.md §2.1 palette and radius scale. | S1-P08-T001 | P08 | IMPLEMENTED |
| TC-DS-002 | static | Test fails on new arbitrary values outside the allow-list. | S1-P08-T011 | P08 | IMPLEMENTED |
| TC-DS-003 | e2e | Reference route renders loading skeleton, empty, error (with retry), forbidden and not-found states via test switches. | S1-P08-T009 | P08 | PLANNED |
| TC-DS-004 | e2e | Axe reports zero serious/critical violations on reference pages in light and dark themes. | S1-P08-T010 | P08 | PLANNED |
| TC-DS-005 | e2e | Viewport matrix passes for routes built so far; route list extended by each feature phase. | S1-P08-T012 | P08 | PLANNED |
| TC-DS-006 | e2e | With `reducedMotion: 'reduce'`, computed transition durations are 0 and skeleton shimmer is static. | S1-P08-T010 | P08 | PLANNED |
| TC-DS-007 | e2e | Loading `/` and `/restaurant/dashboard` makes no requests to `fonts.googleapis.com` or `fonts.gstatic.com`. | S1-P08-T002 | P08 | IMPLEMENTED |
| TC-DS-008 | static | Source imports icons only from `lucide-react` via the wrapper or maps; JSX text in `app/` and `components/` contains no emoji code points. | S1-P08-T003 | P08 | IMPLEMENTED |
| TC-DS-009 | unit | Component tests: each Button variant renders token classes, loading sets `aria-busy` and keeps width, IconButton without label fails type-check, StatusBadge renders icon + text for every status. | S1-P08-T004 | P08 | IMPLEMENTED |
| TC-DS-010 | unit | MoneyField emits `"480.50"` strings, rejects `1e3`; field errors link via `aria-describedby`; ErrorSummary receives focus after failed submit. | S1-P08-T005 | P08 | IMPLEMENTED |
| TC-DS-011 | e2e | Dialog traps focus and returns it on close; Esc closes; Tabs switch with arrow keys; SortableList reorders via keyboard with announcement. | S1-P08-T006 | P08 | PLANNED |
| TC-DS-012 | e2e | Reference table renders cards at 390 px without horizontal page scroll; money column right-aligned at 1440 px. | S1-P08-T007 | P08 | PLANNED |
| TC-DS-013 | e2e | Each role sees only its capability nav items; active item has `aria-current="page"`; mobile bottom nav shows role preset. | S1-P08-T008 | P08 | PLANNED |
| TC-DS-014 | unit | `usePolling` pauses when hidden, resumes immediately, backs off on failure and flags stale after 3 misses. | S1-P08-T009 | P08 | IMPLEMENTED |
| TC-DS-015 | e2e | Every link on `/` resolves with a non-404 response. | S1-P08-T013 | P08 | IMPLEMENTED |
| TC-DS-016 | unit | Header navigation overflows into a More menu instead of scrolling; the bottom bar appears below 768 px with the role's destinations. | S1-P08-T014 | P08 | IMPLEMENTED |
| TC-DS-017 | integration | A role without `dashboard:read` sees no sales figures; an empty tenant sees empty states, not zeros presented as data. | S1-P08-T015 | P08 | IMPLEMENTED |
| TC-FOUND-001 | static | Each CLAUDE.md command exists in `package.json` and exits 0 on the baseline (static test reads CLAUDE.md command list). | S1-P01-T002 | P01 | IMPLEMENTED |
| TC-FOUND-002 | static | `npm run lint` exits 0; a fixture file using `dangerouslySetInnerHTML`, `$queryRawUnsafe` and `parseFloat` fails lint. | S1-P01-T003 | P01 | IMPLEMENTED |
| TC-FOUND-003 | unit | Missing, placeholder or malformed variables throw with the variable name (never the value); no server secret has a `NEXT_PUBLIC_` prefix. | S1-P01-T004 | P01 | IMPLEMENTED |
| TC-FOUND-004 | ci | A branch adding a package with a known high-severity advisory fails the `audit` job. | S1-P01-T006 | P01 | IMPLEMENTED |
| TC-FOUND-005 | static | PR template contains the dependency review section. | S1-P01-T006 | P01 | IMPLEMENTED |
| TC-FOUND-006 | build | Production build of the baseline completes; result and warnings recorded. | S1-P01-T001 | P01 | PLANNED |
| TC-FOUND-007 | static | Test fails if source contains `demo-tenant-id`, `System Operational`, `Agent API Status`, `100% Operational` or `SocialPostStatus.PUBLISHED` assignments in `app/`. | S1-P01-T007 | P01 | IMPLEMENTED |
| TC-FOUND-008 | manual | A fresh clone following README reaches a running app with seeded data (recorded by a second person or the owner). | S1-P01-T009 | P01 | PLANNED |
| TC-KITCH-001 | integration | Active tickets sorted by priority then age with no customer or money fields; section filter applied. | S1-P15-T001 | P15 | IMPLEMENTED |
| TC-KITCH-002 | integration | A KOT created after the cursor appears in the next poll; served/cancelled changes are delivered so clients can remove cards. | S1-P15-T001 | P15 | IMPLEMENTED |
| TC-KITCH-003 | e2e | Selecting the Tandoor section shows only Tandoor tickets; selection persists after reload. | S1-P15-T002 | P15 | IMPLEMENTED |
| TC-KITCH-004 | integration | CASHIER sets HIGH and open KOTs update; WAITER setting HIGH receives FORBIDDEN. | S1-P15-T003 | P15 | IMPLEMENTED |
| TC-KITCH-005 | e2e | Kitchen user presses Start, Ready; waiter presses Served; the order board reflects PREPARING then READY. | S1-P15-T002 | P15 | IMPLEMENTED |
| TC-KITCH-007 | e2e | Timer shows warning at target prep time and "Overdue n min" text at +50% using an injected clock; HIGH priority card shows flame icon and label. | S1-P15-T002 | P15 | PLANNED |
| TC-KITCH-008 | manual | Readability and touch checklist passes on a physical tablet (results recorded with device model). | S1-P15-T004 | P15 | PLANNED |
| TC-KITCH-009 | perf | p95 < 300 ms and zero errors for 20 simulated screens over 10 minutes. | S1-P15-T005 | P15 | PLANNED |
| TC-KOT-001 | integration | Accepting an order with items in two sections creates exactly two KOTs with correct items; repeating acceptance or retrying the transaction creates no duplicates; NEW orders have no KOTs. | S1-P14-T001 | P14 | IMPLEMENTED |
| TC-KOT-002 | integration | KOT counter behaves the same and resets per business date. | S1-P12-T003 | P12 | IMPLEMENTED |
| TC-KOT-003 | integration | Only QUEUED→PREPARING→READY→SERVED is allowed; repeated target is a no-op. | S1-P14-T002 | P14 | IMPLEMENTED |
| TC-KOT-004 | integration | CASHIER/WAITER cannot start or ready a KOT; WAITER can serve; KITCHEN can start, ready and serve. | S1-P14-T002 | P14 | IMPLEMENTED |
| TC-KOT-005 | integration | Reprint creates a new job with `is_reprint` and incremented dedupe suffix; returns NO_PRINTER_CONFIGURED when none. | S1-P16-T003 | P16 | IMPLEMENTED |
| TC-KOT-006 | integration | Print status reflects NONE without jobs, then PENDING, PRINTED and FAILED as seeded jobs change. | S1-P14-T004 | P14 | IMPLEMENTED |
| TC-KOT-007 | integration | Section CRUD with unique codes; archive blocked with `SECTION_IN_USE`; reorder rejects foreign or missing ids. | S1-P07-T003 | P07 | IMPLEMENTED |
| TC-KOT-008 | integration | Cancelling an ACCEPTED order cancels its QUEUED KOTs in the same transaction and audits each. | S1-P14-T003 | P14 | IMPLEMENTED |
| TC-KOT-009 | e2e | Order detail shows two KOTs for a two-section order with statuses updating after kitchen actions. | S1-P14-T005 | P14 | PLANNED |
| TC-KOT-010 | integration | `kot.generated` and `kot.status_changed` audit rows contain actor, from/to and KOT number; TI-036…TI-038 pass. | S1-P14-T006 | P14 | PLANNED |
| TC-MENU-001 | integration | Category list is tenant-scoped, ordered by sort_order and excludes archived unless requested. | S1-P10-T001 | P10 | IMPLEMENTED |
| TC-MENU-002 | integration | Item list filters by category, published, availability, search and archived with cursor pagination. | S1-P10-T001 | P10 | IMPLEMENTED |
| TC-MENU-003 | integration | Item detail returns variants/add-ons; a Tenant B item id returns not-found. | S1-P10-T001 | P10 | IMPLEMENTED |
| TC-MENU-004 | integration | Create and update validate names and uniqueness among non-archived categories; audit written. | S1-P10-T002 | P10 | IMPLEMENTED |
| TC-MENU-005 | integration | Archive fails with `CATEGORY_NOT_EMPTY` while items exist; succeeds after items archived. | S1-P10-T002 | P10 | IMPLEMENTED |
| TC-MENU-006 | integration | Reorder requires exactly the tenant's non-archived set; a Tenant B id returns not-found. | S1-P10-T002 | P10 | IMPLEMENTED |
| TC-MENU-007 | integration | Publish/unpublish toggles public visibility and triggers revalidation. | S1-P10-T002 | P10 | IMPLEMENTED |
| TC-MENU-008 | integration | Create validates all fields (money regex, tax 0–100, section and category ownership) and starts unpublished. | S1-P10-T003 | P10 | IMPLEMENTED |
| TC-MENU-009 | integration | Stale `expectedUpdatedAt` returns CONFLICT; price change writes before/after audit. | S1-P10-T003 | P10 | IMPLEMENTED |
| TC-MENU-010 | integration | Archive unpublishes the item and removes it from future daily menus but not past ones. | S1-P10-T003 | P10 | IMPLEMENTED |
| TC-MENU-011 | integration | Availability toggle blocks ordering of the item and shows "Unavailable today" publicly. | S1-P10-T003 | P10 | IMPLEMENTED |
| TC-MENU-012 | integration | Variant set replace upserts/archives correctly; two defaults rejected; a variant id from another item or tenant returns not-found. | S1-P10-T004 | P10 | IMPLEMENTED |
| TC-MENU-013 | integration | Add-on set replace validates prices and names and archives removed add-ons. | S1-P10-T004 | P10 | IMPLEMENTED |
| TC-MENU-014 | e2e | Create category, reorder via keyboard Move buttons, archive with confirmation, empty state for new tenant. | S1-P10-T005 | P10 | IMPLEMENTED |
| TC-MENU-015 | e2e | List loads seeded items; toggling availability updates the row and public page; filtered empty state offers clear filters. | S1-P10-T006 | P10 | IMPLEMENTED |
| TC-MENU-016 | e2e | Create an item with Half/Full variants and one add-on, publish it, and see "from" price on the public site. | S1-P10-T007 | P10 | IMPLEMENTED |
| TC-MENU-017 | integration | CASHIER, KITCHEN and WAITER receive FORBIDDEN for every `menu:manage` action; TI-001…TI-010 pass. | S1-P10-T008 | P10 | IMPLEMENTED |
| TC-OBS-001 | integration | A request produces log lines containing request_id, tenant_id, user_id, route, status and latency_ms; ids match the response header. | S1-P26-T001 | P26 | PLANNED |
| TC-OBS-002 | unit | Emails, phones, bearer tokens, OTP-like fields and card-like numbers in messages or metadata are masked; bodies are not logged. | S1-P26-T002 | P26 | PLANNED |
| TC-OBS-003 | integration | Triggering each condition emits the corresponding security event once with request id and without secrets. | S1-P26-T004 | P26 | PLANNED |
| TC-OBS-004 | integration | `/api/health` returns 200 minimal body; `/api/ready` returns 503 when the database is unreachable and 200 when restored. | S1-P26-T003 | P26 | IMPLEMENTED |
| TC-OBS-005 | integration | A thrown error in an action logs one `error.unhandled` event with stack and request id while the client receives a generic message. | S1-P26-T006 | P26 | PLANNED |
| TC-OBS-006 | integration | Seeded backlog, failures and offline agents emit the corresponding events once per interval with tenant id only. | S1-P26-T007 | P26 | PLANNED |
| TC-OBS-007 | integration | Maintenance script deletes only expired buckets and logs `maintenance.completed` with counts; failure logs `maintenance.failed`. | S1-P26-T005 | P26 | PLANNED |
| TC-OBS-008 | integration | A deliberately slow query emits `db.slow_query` with duration and without parameter values. | S1-P26-T008 | P26 | PLANNED |
| TC-OPS-001 | smoke | Staging URL serves the current `main` build over HTTPS after merge. | S1-P01-T008 | P01 | PLANNED |
| TC-OPS-002 | smoke | Production domain serves the application over HTTPS with a valid certificate and `/api/ready` returns 200. | S1-P27-T001 | P27 | PLANNED |
| TC-OPS-003 | integration | Runtime credentials cannot execute `CREATE TABLE` (if roles supported) and non-TLS connections are refused. | S1-P27-T002 | P27 | PLANNED |
| TC-OPS-004 | ci | A test tag deploys to production only after manual approval, with migration step logs and smoke results attached. | S1-P27-T003 | P27 | PLANNED |
| TC-OPS-005 | review | Inventory matches the env schema for staging and production; no secret values stored in the repository or docs. | S1-P27-T004 | P27 | PLANNED |
| TC-OPS-006 | smoke | Invited test account signs in with an email code on the production domain; webhook delivery succeeds. | S1-P27-T005 | P27 | PLANNED |
| TC-OPS-007 | manual | Restore drill completes; restored data verified by row counts and application smoke test; RPO/RTO measured and recorded. | S1-P27-T006 | P27 | PLANNED |
| TC-OPS-008 | manual | Rollback rehearsal completed within 15 minutes with steps recorded. | S1-P27-T007 | P27 | PLANNED |
| TC-OPS-009 | review | Runbook walkthrough by the Project Owner without assistance succeeds on staging. | S1-P27-T009 | P27 | PLANNED |
| TC-ORDER-001 | integration | Dine-in order with variant and add-on persists correct snapshots, totals, business date and order number. | S1-P12-T004 | P12 | IMPLEMENTED |
| TC-ORDER-002 | unit | Table-driven totals incl. mixed tax rates, add-ons, quantities up to 99 and `.005` rounding edges match hand-computed expectations. | S1-P12-T002 | P12 | IMPLEMENTED |
| TC-ORDER-003 | integration | Payloads containing `price`, `total`, `taxAmount`, `discount` or `tenantId` keys are rejected with VALIDATION_ERROR and nothing is written. | S1-P12-T004 | P12 | IMPLEMENTED |
| TC-ORDER-004 | integration | Editing the menu item price, name and tax after ordering leaves the order's snapshots and totals unchanged. | S1-P12-T004 | P12 | IMPLEMENTED |
| TC-ORDER-005 | unit | Every from/to pair not in BR-ORD-02 is rejected with INVALID_TRANSITION. | S1-P12-T005 | P12 | IMPLEMENTED |
| TC-ORDER-006 | integration | Each transition succeeds only for the roles in security.md §3.4 (e.g. KITCHEN cannot complete; WAITER cannot cancel ACCEPTED). | S1-P12-T005 | P12 | IMPLEMENTED |
| TC-ORDER-007 | integration | Cancel requires a 5–280 char reason, is blocked while net paid > 0 (`REFUND_REQUIRED`), and records reason in audit. | S1-P12-T005 | P12 | IMPLEMENTED |
| TC-ORDER-008 | integration | Replaying the same idempotency key returns the original order; two concurrent submissions with the same key create one order. | S1-P12-T004 | P12 | IMPLEMENTED |
| TC-ORDER-009 | integration | Two concurrent transitions with the same expected version: one succeeds, the other returns CONFLICT. | S1-P12-T005 | P12 | IMPLEMENTED |
| TC-ORDER-010 | integration | Polling with `since` returns only rows updated after the cursor, includes terminal transitions, applies kitchen projection for KITCHEN, and caps at 200. | S1-P12-T006 | P12 | IMPLEMENTED |
| TC-ORDER-011 | integration | Detail `allowedActions` differ correctly for CASHIER, WAITER, KITCHEN and MANAGER on the same order. | S1-P12-T006 | P12 | IMPLEMENTED |
| TC-ORDER-012 | integration | With Q-001 not approved, no public order submission endpoint exists (action id not exported, POST returns 404/405); if approved, rate limit and validation cases pass. | S1-P09-T009 | P09 | IMPLEMENTED |
| TC-ORDER-013 | integration | Adding items creates round 2 lines and KOTs, updates totals, sets PAID orders to PARTIALLY_PAID, and is idempotent. | S1-P12-T010 | P12 | PLANNED |
| TC-ORDER-014 | integration | 50 concurrent transactions obtain 50 distinct consecutive order numbers for the same tenant and business date; separate tenants have independent sequences. | S1-P12-T003 | P12 | IMPLEMENTED |
| TC-ORDER-015 | e2e | Waiter on tablet creates a dine-in order with a variant and add-on; server totals displayed; double-tapping submit creates one order; unavailable-item error lists items. | S1-P12-T007 | P12 | IMPLEMENTED |
| TC-ORDER-016 | e2e | An order created in a second browser appears on the board within 10 s; accepting it moves it to the Accepted tab. | S1-P12-T008 | P12 | IMPLEMENTED |
| TC-ORDER-017 | e2e | Manager cancels a NEW order with a reason; a Tenant B order id renders the not-found page. | S1-P12-T009 | P12 | IMPLEMENTED |
| TC-ORDER-018 | integration | RBAC matrix rows TC-RBAC-123…TC-RBAC-130 pass with real endpoints; TI-021…TI-027 and listed ADV cases pass. | S1-P12-T011 | P12 | PLANNED |
| TC-ORDER-019 | integration | Starting the first KOT moves the order to PREPARING; readying the last KOT moves it to READY. | S1-P14-T002 | P14 | IMPLEMENTED |
| TC-PRICE-001 | unit | Table-driven parse/round/format cases incl. `"0.005"` rounding, `"1e3"` rejected, `"-1"` rejected, INR and USD formatting. | S1-P02-T010 | P02 | IMPLEMENTED |
| TC-PRICE-002 | unit | Property test: for random valid carts, order total equals Σ line totals and tax equals Σ line tax. | S1-P12-T002 | P12 | IMPLEMENTED |
| TC-PRICE-003 | unit | GST breakup per tax rate: CGST = ROUND_HALF_UP(tax / 2, 2), SGST = tax − CGST, CGST + SGST equals the tax exactly including odd-paise totals. | S1-P12-T002 | P12 | IMPLEMENTED |
| TC-PRINT-001 | integration | Accepting an order creates one KOT job per section to the section printer, falls back to an unsectioned KOT printer, and creates none when no printer exists. | S1-P16-T003 | P16 | IMPLEMENTED |
| TC-PRINT-002 | unit | Job state machine allows only transitions in architecture.md §6.3. | S1-P16-T001 | P16 | IMPLEMENTED |
| TC-PRINT-003 | integration | Creating a job with an existing dedupe key returns the existing job and inserts nothing. | S1-P16-T001 | P16 | IMPLEMENTED |
| TC-PRINT-004 | integration | 10 concurrent claims by two agents never return the same job twice; expired leases become claimable. | S1-P16-T001 | P16 | IMPLEMENTED |
| TC-PRINT-005 | integration | Ack with wrong agent returns not-found, stale claim token returns 409, repeated identical ack returns 200 without change. | S1-P16-T001 | P16 | IMPLEMENTED |
| TC-PRINT-006 | integration | Static search finds no code setting `PRINTED` outside `ackJob`; integration confirms status stays PROCESSING until ack. | S1-P16-T005 | P16 | IMPLEMENTED |
| TC-PRINT-007 | unit | LAN address validation accepts `192.168.1.50:9100`, `10.0.0.7`, rejects public IPs, hostnames resolving externally, `localhost` and ports outside 1–65535. | S1-P16-T004 | P16 | IMPLEMENTED |
| TC-PRINT-008 | unit | Item names containing `\x1B`, `\x1D` and other control characters are stripped; long lines wrap at 32/48 columns. | S1-P16-T002 | P16 | IMPLEMENTED |
| TC-PRINT-009 | unit | KOT and receipt documents never contain customer phone, email or internal ids other than job-level references. | S1-P16-T002 | P16 | IMPLEMENTED |
| TC-PRINT-010 | e2e | Failed job shows "Printer unavailable" with error details and Retry; test print shows Waiting → Printed only after simulated agent ack; pairing code displayed once. | S1-P16-T006 | P16 | PLANNED |
| TC-PRINT-011 | integration | Printer CRUD validates ownership; deactivation marks PENDING jobs FAILED with `PRINTER_DEACTIVATED`. | S1-P16-T004 | P16 | IMPLEMENTED |
| TC-PRINT-012 | integration | Test print creates a TEST job for the chosen printer and is rate-limited to 6/min. | S1-P16-T003 | P16 | IMPLEMENTED |
| TC-PRINT-013 | integration | Retry resets attempts and schedules immediately; retrying a PRINTED job returns NOT_FAILED; a PROCESSING job with expired lease is re-claimed. | S1-P16-T007 | P16 | IMPLEMENTED |
| TC-PRINT-014 | integration | Print receipt targets a RECEIPT-capable printer with the rendered receipt document. | S1-P16-T003 | P16 | IMPLEMENTED |
| TC-PRINT-015 | integration | Tenant A agent token cannot claim, ack or read config for Tenant B jobs/printers; forged or truncated tokens return 401; TI-041…TI-046 pass. | S1-P16-T008 | P16 | IMPLEMENTED |
| TC-PRINT-016 | e2e | Stopping the simulated agent shows "1 agent offline" in the header within 2 minutes; restarting clears it. | S1-P16-T009 | P16 | PLANNED |
| TC-PRINT-017 | unit | Receipt document with a GSTIN prints the GSTIN and CGST/SGST lines per rate; without a GSTIN it prints one tax line; totals identical in both. | S1-P16-T002 | P16 | IMPLEMENTED |
| TC-PWA-001 | integration | `/manifest.webmanifest` is valid JSON with required fields and every icon URL returns 200 with correct dimensions. | S1-P21-T001 | P21 | PLANNED |
| TC-PWA-002 | ci | Lighthouse reports the app installable on staging. | S1-P21-T004 | P21 | PLANNED |
| TC-PWA-003 | e2e | Deploying a new service worker version shows the update prompt; accepting reloads onto the new version. | S1-P21-T003 | P21 | PLANNED |
| TC-PWA-004 | e2e | With the network offline, navigating shows `/offline` with the documented message; no order screens render from cache. | S1-P21-T002 | P21 | PLANNED |
| TC-PWA-005 | e2e | After browsing console pages and APIs, Cache Storage contains no HTML or JSON from authenticated routes. | S1-P21-T002 | P21 | PLANNED |
| TC-QA-001 | ci | Integration job runs on every PR against real PostgreSQL and fails the build on any failure. | S1-P02-T008 | P02 | PLANNED |
| TC-QA-002 | e2e | Smoke spec loads `/` and `/sign-in` in all three projects headless in CI. | S1-P01-T005 | P01 | IMPLEMENTED |
| TC-QA-003 | integration | Harness self-test: User A listing orders never returns any row whose tenant is B, verified against a direct database count. | S1-P04-T009 | P04 | IMPLEMENTED |
| TC-QA-004 | ci | Regression pack runs as a required check and completes in < 15 minutes. | S1-P25-T006 | P25 | PLANNED |
| TC-QA-005 | perf | REQ-NFR-001 targets met at REQ-NFR-002 scale with error rate < 0.1%. | S1-P25-T007 | P25 | PLANNED |
| TC-QA-006 | e2e | Smoke suite passes against staging and production in < 5 minutes. | S1-P27-T008 | P27 | PLANNED |
| TC-QA-007 | integration | TI-001…TI-062 all pass with zero skipped cases in CI. | S1-P25-T001 | P25 | PLANNED |
| TC-QA-008 | integration | Every LD/SA/RH endpoint in api.md is mapped to a matrix row and all TC-RBAC-101…TC-RBAC-150 pass. | S1-P25-T002 | P25 | PLANNED |
| TC-QA-009 | e2e | UJ-01…UJ-14 pass in CI on desktop and tablet projects. | S1-P25-T003 | P25 | PLANNED |
| TC-QA-010 | e2e | Axe reports zero serious/critical violations on every route; manual checklist completed with no open blockers. | S1-P25-T004 | P25 | PLANNED |
| TC-QA-011 | e2e | Viewport matrix passes for all routes and device checks recorded (VQA-11, VQA-18). | S1-P25-T005 | P25 | PLANNED |
| TC-QA-012 | integration | Inventory test fails when a constraint or trigger lacks a registered negative test. | S1-P25-T008 | P25 | PLANNED |
| TC-QA-013 | manual | Physical print matrix and failure scenarios recorded with outcomes; no lost KOTs. | S1-P25-T009 | P25 | PLANNED |
| TC-QA-014 | manual | VQA record shows pass for all 20 checks on every listed page with screenshots. | S1-P25-T010 | P25 | PLANNED |
| TC-QA-015 | review | DCA-01…DCA-10 signed off with evidence. | S1-P25-T011 | P25 | PLANNED |
| TC-QA-016 | manual | UAT record signed by the Project Owner with no open Critical/High issues. | S1-P25-T012 | P25 | PLANNED |
| TC-RBAC-001 | unit | Unknown permission and missing role deny; every code in the matrix fixture exists in `PERMISSIONS`. | S1-P05-T001 | P05 | IMPLEMENTED |
| TC-RBAC-002 | unit | No tenant role grants any `platform:*` permission; SUPER_ADMIN has no tenant permission. | S1-P05-T001 | P05 | IMPLEMENTED |
| TC-RBAC-010 | integration | MANAGER cannot invite or promote to MANAGER/TENANT_ADMIN, cannot change own role; TENANT_ADMIN can assign any tenant role. | S1-P05-T003 | P05 | IMPLEMENTED |
| TC-RBAC-011 | integration | KITCHEN responses for orders and KOTs contain no customer name/phone/email and no amount fields. | S1-P05-T005 | P05 | IMPLEMENTED |
| TC-RBAC-012 | integration | Concurrent demotion of the last two TENANT_ADMINs leaves at least one active TENANT_ADMIN. | S1-P05-T003 | P05 | IMPLEMENTED |
| TC-RBAC-013 | e2e | WAITER sees no Menu-manage controls; invoking `createCategoryAction` directly from the browser context returns FORBIDDEN. | S1-P05-T006 | P05 | PLANNED |
| TC-RBAC-014 | integration | Driver fails if a matrix row has no endpoint mapping after its feature phase is complete. | S1-P05-T002 | P05 | IMPLEMENTED |
| TC-RBAC-015 | unit | Transition table equals security.md §3.4 fixture; disallowed from/to pairs throw `INVALID_TRANSITION`. | S1-P05-T004 | P05 | IMPLEMENTED |
| TC-RBAC-016 | review | Signed review checklist covering every SC-RBAC control with evidence links. | S1-P05-T007 | P05 | PLANNED |
| TC-RBAC-101 | integration | RBAC matrix row 1: `platform:tenant:read` (list, inspect) allowed/denied per security.md §3.3 | S1-P05-T002 | P05 | IMPLEMENTED |
| TC-RBAC-102 | integration | RBAC matrix row 2: `platform:tenant:create` (create) allowed/denied per security.md §3.3 | S1-P05-T002 | P05 | PLANNED |
| TC-RBAC-103 | integration | RBAC matrix row 3: `platform:tenant:update` (update name/slug) allowed/denied per security.md §3.3 | S1-P05-T002 | P05 | PLANNED |
| TC-RBAC-104 | integration | RBAC matrix row 4: `platform:tenant:suspend` (suspend) allowed/denied per security.md §3.3 | S1-P05-T002 | P05 | PLANNED |
| TC-RBAC-105 | integration | RBAC matrix row 5: `platform:tenant:reactivate` (reactivate) allowed/denied per security.md §3.3 | S1-P05-T002 | P05 | PLANNED |
| TC-RBAC-106 | integration | RBAC matrix row 6: `platform:tenant_admin:invite` (invite/revoke first TENANT_ADMIN) allowed/denied per security.md §3.3 | S1-P05-T002 | P05 | PLANNED |
| TC-RBAC-107 | integration | RBAC matrix row 7: `platform:audit:read` (read platform events) allowed/denied per security.md §3.3 | S1-P05-T002 | P05 | PLANNED |
| TC-RBAC-108 | integration | RBAC matrix row 8: `dashboard:read` (view dashboard) allowed/denied per security.md §3.3 | S1-P05-T002 | P05 | PLANNED |
| TC-RBAC-109 | integration | RBAC matrix row 9: `restaurant:read` (read profile, hours, timezone) allowed/denied per security.md §3.3 | S1-P05-T002 | P05 | IMPLEMENTED |
| TC-RBAC-110 | integration | RBAC matrix row 10: `restaurant:update` (update profile, branding, hours) allowed/denied per security.md §3.3 | S1-P05-T002 | P05 | IMPLEMENTED |
| TC-RBAC-111 | integration | RBAC matrix row 11: `restaurant:settings:update` (timezone, currency, operational) allowed/denied per security.md §3.3 | S1-P05-T002 | P05 | PLANNED |
| TC-RBAC-112 | integration | RBAC matrix row 12: `website:update` (website visibility, SEO, publish) allowed/denied per security.md §3.3 | S1-P05-T002 | P05 | PLANNED |
| TC-RBAC-113 | integration | RBAC matrix row 13: `kitchen_section:manage` (create/update/archive/reorder) allowed/denied per security.md §3.3 | S1-P05-T002 | P05 | IMPLEMENTED |
| TC-RBAC-114 | integration | RBAC matrix row 14: `staff:read` (list staff) allowed/denied per security.md §3.3 | S1-P05-T002 | P05 | IMPLEMENTED |
| TC-RBAC-115 | integration | RBAC matrix row 15: `staff:invite` (invite, resend, revoke) allowed/denied per security.md §3.3 | S1-P05-T002 | P05 | PLANNED |
| TC-RBAC-116 | integration | RBAC matrix row 16: `staff:update_role` (change role) allowed/denied per security.md §3.3 | S1-P05-T002 | P05 | PLANNED |
| TC-RBAC-117 | integration | RBAC matrix row 17: `staff:deactivate` (deactivate/reactivate) allowed/denied per security.md §3.3 | S1-P05-T002 | P05 | PLANNED |
| TC-RBAC-118 | integration | RBAC matrix row 18: `menu:read` (read internal menu (incl. unpublished)) allowed/denied per security.md §3.3 | S1-P05-T002 | P05 | IMPLEMENTED |
| TC-RBAC-119 | integration | RBAC matrix row 19: `menu:manage` (create/update/archive/reorder/publish) allowed/denied per security.md §3.3 | S1-P05-T002 | P05 | IMPLEMENTED |
| TC-RBAC-120 | integration | RBAC matrix row 20: `menu:availability:update` (toggle available (sold out)) allowed/denied per security.md §3.3 | S1-P05-T002 | P05 | IMPLEMENTED |
| TC-RBAC-121 | integration | RBAC matrix row 21: `daily_menu:read` (read) allowed/denied per security.md §3.3 | S1-P05-T002 | P05 | IMPLEMENTED |
| TC-RBAC-122 | integration | RBAC matrix row 22: `daily_menu:manage` (save/publish/unpublish/copy/delete draft) allowed/denied per security.md §3.3 | S1-P05-T002 | P05 | IMPLEMENTED |
| TC-RBAC-123 | integration | RBAC matrix row 23: `order:read` (list/detail (KITCHEN: kitchen projection without customer PII)) allowed/denied per security.md §3.3 | S1-P05-T002 | P05 | IMPLEMENTED |
| TC-RBAC-124 | integration | RBAC matrix row 24: `order:create` (create) allowed/denied per security.md §3.3 | S1-P05-T002 | P05 | IMPLEMENTED |
| TC-RBAC-125 | integration | RBAC matrix row 25: `order:add_items` (add round (Q-003)) allowed/denied per security.md §3.3 | S1-P05-T002 | P05 | PLANNED |
| TC-RBAC-126 | integration | RBAC matrix row 26: `order:accept` (NEW→ACCEPTED) allowed/denied per security.md §3.3 | S1-P05-T002 | P05 | IMPLEMENTED |
| TC-RBAC-127 | integration | RBAC matrix row 27: `order:kitchen_update` (ACCEPTED→PREPARING, PREPARING→READY) allowed/denied per security.md §3.3 | S1-P05-T002 | P05 | IMPLEMENTED |
| TC-RBAC-128 | integration | RBAC matrix row 28: `order:complete` (READY→COMPLETED) allowed/denied per security.md §3.3 | S1-P05-T002 | P05 | IMPLEMENTED |
| TC-RBAC-129 | integration | RBAC matrix row 29: `order:cancel` (→CANCELLED) allowed/denied per security.md §3.3 | S1-P05-T002 | P05 | IMPLEMENTED |
| TC-RBAC-130 | integration | RBAC matrix row 30: `order:update_meta` (set customer, priority) allowed/denied per security.md §3.3 | S1-P05-T002 | P05 | PLANNED |
| TC-RBAC-131 | integration | RBAC matrix row 31: `kot:read` (kitchen board) allowed/denied per security.md §3.3 | S1-P05-T002 | P05 | IMPLEMENTED |
| TC-RBAC-132 | integration | RBAC matrix row 32: `kot:update_status` (QUEUED→PREPARING→READY) allowed/denied per security.md §3.3 | S1-P05-T002 | P05 | IMPLEMENTED |
| TC-RBAC-133 | integration | RBAC matrix row 33: `kot:serve` (READY→SERVED) allowed/denied per security.md §3.3 | S1-P05-T002 | P05 | IMPLEMENTED |
| TC-RBAC-134 | integration | RBAC matrix row 34: `kot:reprint` (reprint KOT) allowed/denied per security.md §3.3 | S1-P05-T002 | P05 | PLANNED |
| TC-RBAC-135 | integration | RBAC matrix row 35: `customer:read` (list/detail/lookup) allowed/denied per security.md §3.3 | S1-P05-T002 | P05 | IMPLEMENTED |
| TC-RBAC-136 | integration | RBAC matrix row 36: `customer:create` (create) allowed/denied per security.md §3.3 | S1-P05-T002 | P05 | PLANNED |
| TC-RBAC-137 | integration | RBAC matrix row 37: `customer:update` (update) allowed/denied per security.md §3.3 | S1-P05-T002 | P05 | PLANNED |
| TC-RBAC-138 | integration | RBAC matrix row 38: `customer:archive` (archive / anonymise) allowed/denied per security.md §3.3 | S1-P05-T002 | P05 | PLANNED |
| TC-RBAC-139 | integration | RBAC matrix row 39: `transaction:read` (list, receipt) allowed/denied per security.md §3.3 | S1-P05-T002 | P05 | IMPLEMENTED |
| TC-RBAC-140 | integration | RBAC matrix row 40: `payment:record` (record payment) allowed/denied per security.md §3.3 | S1-P05-T002 | P05 | IMPLEMENTED |
| TC-RBAC-141 | integration | RBAC matrix row 41: `refund:create` (refund) allowed/denied per security.md §3.3 | S1-P05-T002 | P05 | IMPLEMENTED |
| TC-RBAC-142 | integration | RBAC matrix row 42: `transaction:void` (void same-day entry) allowed/denied per security.md §3.3 | S1-P05-T002 | P05 | PLANNED |
| TC-RBAC-143 | integration | RBAC matrix row 43: `day_close:perform` (preview + close) allowed/denied per security.md §3.3 | S1-P05-T002 | P05 | PLANNED |
| TC-RBAC-144 | integration | RBAC matrix row 44: `printer:manage` (create/update/deactivate/test) allowed/denied per security.md §3.3 | S1-P05-T002 | P05 | IMPLEMENTED |
| TC-RBAC-145 | integration | RBAC matrix row 45: `print_agent:manage` (pair/revoke) allowed/denied per security.md §3.3 | S1-P05-T002 | P05 | PLANNED |
| TC-RBAC-146 | integration | RBAC matrix row 46: `print_job:read` (view queue) allowed/denied per security.md §3.3 | S1-P05-T002 | P05 | IMPLEMENTED |
| TC-RBAC-147 | integration | RBAC matrix row 47: `print_job:retry` (retry failed, print receipt) allowed/denied per security.md §3.3 | S1-P05-T002 | P05 | IMPLEMENTED |
| TC-RBAC-148 | integration | RBAC matrix row 48: `report:read` (reports) allowed/denied per security.md §3.3 | S1-P05-T002 | P05 | IMPLEMENTED |
| TC-RBAC-149 | integration | RBAC matrix row 49: `social:manage` (create/update/ready/mark posted/archive) allowed/denied per security.md §3.3 | S1-P05-T002 | P05 | IMPLEMENTED |
| TC-RBAC-150 | integration | RBAC matrix row 50: `audit:read` (read tenant audit) allowed/denied per security.md §3.3 | S1-P05-T002 | P05 | PLANNED |
| TC-REL-001 | review | All gates show PASS with evidence or are explicitly blocked. | S1-P28-T001 | P28 | PLANNED |
| TC-REL-002 | perf | Re-run confirms REQ-NFR-001 targets at REQ-NFR-002 scale. | S1-P28-T002 | P28 | PLANNED |
| TC-REL-003 | review | Security sign-off recorded; DEP-CHK-12 rotation drill evidence attached. | S1-P28-T003 | P28 | PLANNED |
| TC-REL-004 | static | Consistency scan passes with zero findings. | S1-P28-T004 | P28 | PLANNED |
| TC-REL-005 | manual | Tabletop exercise of the cross-tenant leak and printing outage runbooks completed and recorded. | S1-P28-T005 | P28 | PLANNED |
| TC-REL-006 | manual | Staging dry run completes the checklist end to end including a printed KOT. | S1-P28-T006 | P28 | PLANNED |
| TC-REL-007 | smoke | Production smoke suite TC-QA-006 passes after deployment; no error-level logs in the first hour attributable to the release. | S1-P29-T001 | P29 | PLANNED |
| TC-REL-008 | manual | Go-live checklist completed with the restaurant; first service orders printed and settled. | S1-P29-T002 | P29 | PLANNED |
| TC-REL-009 | manual | Hypercare log for 5 working days shows all Critical/High issues resolved or accepted. | S1-P29-T003 | P29 | PLANNED |
| TC-REL-010 | review | KB statuses match reality; consistency scan TC-REL-004 still passes. | S1-P29-T004 | P29 | PLANNED |
| TC-REST-001 | e2e | Settings page shows the seeded Tenant A profile (not demo values), edits and saves successfully, and persists after reload. | S1-P07-T005 | P07 | IMPLEMENTED |
| TC-REST-002 | integration | Profile update validates lengths/E.164/email and audits before/after. | S1-P07-T001 | P07 | IMPLEMENTED |
| TC-REST-003 | integration | Branding rejects non-allowlisted image hosts and low-contrast accent colours. | S1-P07-T001 | P07 | PLANNED |
| TC-REST-004 | integration | Hours replace rejects overlapping shifts, accepts overnight closing and split shifts. | S1-P07-T001 | P07 | PLANNED |
| TC-REST-005 | integration | Operational settings reject invalid IANA zones and persist valid ones with audit. | S1-P07-T001 | P07 | PLANNED |
| TC-REST-006 | integration | Currency change fails with `CURRENCY_LOCKED` once any order exists. | S1-P07-T001 | P07 | PLANNED |
| TC-REST-007 | e2e | MANAGER sees settings read-only; save controls absent. | S1-P07-T005 | P07 | IMPLEMENTED |
| TC-REST-008 | e2e | Owner sets branding and SEO, sees readiness checklist, publishes, and the public site becomes reachable. | S1-P07-T007 | P07 | PLANNED |
| TC-REST-009 | integration | Operational settings accept a valid GSTIN (stored uppercase), reject malformed values, allow clearing it, and audit the change. | S1-P07-T001 | P07 | IMPLEMENTED |
| TC-RPT-001 | integration | Sales summary for a fixture set equals hand-computed decimal totals exactly; cancelled orders excluded; refunds subtracted. | S1-P19-T001 | P19 | PLANNED |
| TC-RPT-002 | integration | Hourly distribution buckets use restaurant-local hours for both seeded timezones. | S1-P19-T001 | P19 | PLANNED |
| TC-RPT-003 | integration | Menu performance ranks by quantity and net sales and attributes renamed items to the same menu item. | S1-P19-T001 | P19 | PLANNED |
| TC-RPT-004 | integration | Transaction summary nets payments and refunds by method and counts voids separately. | S1-P19-T001 | P19 | PLANNED |
| TC-RPT-005 | integration | Daily summary includes day-close status and variance for the date. | S1-P19-T001 | P19 | PLANNED |
| TC-RPT-006 | integration | Identical seeded data in Tenant B never changes Tenant A report results. | S1-P19-T001 | P19 | PLANNED |
| TC-RPT-007 | e2e | Selecting "Last 7 days" updates all tabs; every bar row has matching table values; empty period shows designed empty state. | S1-P19-T003 | P19 | PLANNED |
| TC-RPT-008 | perf | Each report over 366 days with 10,000 orders completes in < 1 s p95. | S1-P19-T005 | P19 | PLANNED |
| TC-RPT-009 | e2e | `/restaurant/analytics`, `/restaurant/billing` and `/restaurant/kds` redirect (308) to reports, transactions and kitchen. | S1-P19-T006 | P19 | PLANNED |
| TC-SEC-001 | unit | Every exported schema rejects an extra `tenantId` key and an unknown key. | S1-P04-T006 | P04 | IMPLEMENTED |
| TC-SEC-002 | unit | JSON-LD serializer output with `</script><script>` in a restaurant name contains no closing script tag. | S1-P09-T005 | P09 | PLANNED |
| TC-SEC-003 | unit | Rejects `http:`, `https://169.254.169.254/`, `https://user:pass@host`, `https://evil.test`, `https://allowed.test:8443`; accepts allowlisted hosts. | S1-P07-T002 | P07 | IMPLEMENTED |
| TC-SEC-004 | static | No `$queryRawUnsafe`/`$executeRawUnsafe`; every `$queryRaw` is a tagged template inside `lib/data`. | S1-P24-T004 | P24 | PLANNED |
| TC-SEC-005 | integration | Invalid UUID, slug or date route params render the not-found page / 404. | S1-P04-T006 | P04 | IMPLEMENTED |
| TC-SEC-006 | integration | Authenticated pages and `/api/v1/*` send `Cache-Control: no-store`; public page responses contain no session-specific content. | S1-P09-T007 | P09 | IMPLEMENTED |
| TC-SEC-007 | integration | An unexpected exception yields 500 `INTERNAL` with request id and no stack, SQL or Prisma message. | S1-P04-T005 | P04 | IMPLEMENTED |
| TC-SEC-008 | integration | `limit=1000` is rejected or capped to 100; a 1 MB action body returns 413. | S1-P24-T005 | P24 | PLANNED |
| TC-SEC-009 | static | No action, route handler or loader returns an object spread from, or identical to, a Prisma model result. | S1-P24-T007 | P24 | PLANNED |
| TC-SEC-010 | integration | Server Action request with `Origin: https://evil.test` is rejected by the installed Next.js version. | S1-P24-T002 | P24 | PLANNED |
| TC-SEC-011 | integration | `assertSameOrigin` rejects missing or foreign Origin on non-GET cookie route handlers. | S1-P24-T002 | P24 | PLANNED |
| TC-SEC-012 | integration | No app API response includes permissive CORS headers; preflight from foreign origin is not allowed. | S1-P24-T002 | P24 | PLANNED |
| TC-SEC-013 | integration | 50 concurrent calls against limit 10 allow exactly 10; the 11th returns 429 with `Retry-After`; window reset allows again; raw identifier not stored. | S1-P03-T007 | P03 | IMPLEMENTED |
| TC-SEC-014 | integration | All listed headers present on page, API and public responses. | S1-P24-T001 | P24 | PLANNED |
| TC-SEC-015 | e2e | Sign-in, console, kitchen and public pages load with CSP enforced and zero violation reports. | S1-P24-T001 | P24 | PLANNED |
| TC-SEC-016 | integration | SVG, polyglot and >5 MB files are rejected; JPEG with GPS EXIF is re-encoded without metadata. | S1-P07-T009 | P07 | PLANNED |
| TC-SEC-017 | integration | Storage keys are tenant-prefixed; Tenant A cannot confirm or reference Tenant B asset ids. | S1-P07-T009 | P07 | PLANNED |
| TC-SEC-018 | integration | Tenant A user requesting Tenant B receipt gets 404; TENANT_ADMIN requesting `/admin` gets forbidden; `GET /api/print-jobs/poll?tenantId=…` returns 404. | S1-P04-T008 | P04 | IMPLEMENTED |
| TC-SEC-019 | integration | Each configured policy returns 429 after its limit with Retry-After and a `security.rate_limited` log event. | S1-P24-T003 | P24 | PLANNED |
| TC-SEC-020 | e2e | XSS payloads stored in menu, customer, order notes and social captions render as text on every screen and never execute. | S1-P24-T004 | P24 | PLANNED |
| TC-SEC-021 | ci | `npm audit --audit-level=high` clean and secret scan of full history reports no findings. | S1-P24-T006 | P24 | PLANNED |
| TC-SEC-022 | review | Threat register shows every threat VERIFIED or ACCEPTED with evidence links, reviewed by the Project Owner. | S1-P24-T009 | P24 | PLANNED |
| TC-SEC-023 | integration | Full ADV-001…ADV-030 suite passes in CI with no skipped cases. | S1-P24-T008 | P24 | PLANNED |
| TC-SOC-001 | integration | Create/update/archive validate sources and build share URLs server-side; client-supplied `shareUrl` is rejected. | S1-P20-T002 | P20 | IMPLEMENTED |
| TC-SOC-002 | integration | Status machine DRAFT→READY→MARKED_POSTED enforced; mark posted records attester and audit. | S1-P20-T002 | P20 | IMPLEMENTED |
| TC-SOC-003 | integration | Each card type returns a PNG of the expected size for a published tenant; unpublished item or website returns 404. | S1-P20-T001 | P20 | PLANNED |
| TC-SOC-004 | integration | Card generation reads only the public projection (spy on data layer) and output text contains no private marker strings. | S1-P20-T001 | P20 | PLANNED |
| TC-SOC-005 | e2e | Creating and marking a post as posted shows "Marked as posted by {name}"; the text "Published successfully" never appears anywhere in the flow. | S1-P20-T003 | P20 | PLANNED |
| TC-SOC-006 | integration | RBAC row TC-RBAC-149 passes; Tenant A cannot create a post from a Tenant B daily menu or item id (not-found). | S1-P20-T004 | P20 | PLANNED |
| TC-STAFF-001 | e2e | TENANT_ADMIN invites a CASHIER; MANAGER's role select offers only CASHIER, WAITER, KITCHEN; invited user accepts and appears Active. | S1-P07-T006 | P07 | IMPLEMENTED |
| TC-STAFF-002 | integration | Invite creates INVITED membership and a Clerk invitation; duplicate member returns `ALREADY_MEMBER`. | S1-P07-T004 | P07 | IMPLEMENTED |
| TC-STAFF-003 | integration | Revoking an invite deactivates membership and revokes the Clerk invitation. | S1-P07-T004 | P07 | IMPLEMENTED |
| TC-STAFF-004 | integration | Deactivate/reactivate change access on next request; deactivation of the user's last membership revokes sessions. | S1-P07-T004 | P07 | IMPLEMENTED |
| TC-STAFF-005 | integration | A Clerk invitation failure leaves no local user or membership behind (compensation). | S1-P07-T004 | P07 | IMPLEMENTED |
| TC-TENANT-001 | integration | Context tenant comes from the membership row; tenant identifiers in cookies other than a valid membership id, headers or query are ignored. | S1-P04-T001 | P04 | IMPLEMENTED |
| TC-TENANT-002 | static | Fixture with `db.order.findUnique({ where: { id } })` fails; scoped fixture passes; baseline violations are listed. | S1-P02-T006 | P02 | IMPLEMENTED |
| TC-TENANT-003 | integration | Requesting a random UUID and a Tenant B order id as Tenant A produce byte-identical 404 responses. | S1-P04-T005 | P04 | IMPLEMENTED |
| TC-TENANT-004 | integration | Cookie containing another user's membership id is ignored and the user is sent to selection; switching to own membership sets the cookie. | S1-P04-T003 | P04 | IMPLEMENTED |
| TC-TENANT-005 | integration | Role change and tenant suspension take effect on the next request without re-login. | S1-P04-T001 | P04 | IMPLEMENTED |
| TC-TENANT-006 | static | No exported server action or route handler has a parameter or schema field named `tenantId` or `requestedTenantId`. | S1-P04-T007 | P04 | IMPLEMENTED |
| TC-TXN-001 | integration | Filters return correct rows; totals by method are exact decimal strings; range > 92 days rejected. | S1-P18-T004 | P18 | IMPLEMENTED |
| TC-TXN-002 | integration | Overpayment rejected with AMOUNT_EXCEEDS_BALANCE; cash tendered 1000 for 840 records change 160; UPI without reference rejected; card-number-like reference rejected. | S1-P18-T001 | P18 | IMPLEMENTED |
| TC-TXN-003 | integration | Partial refund sets PARTIALLY_REFUNDED; refunding the remainder of a completed order sets order REFUNDED; exceeding refundable returns REFUND_EXCEEDS_PAID. | S1-P18-T002 | P18 | IMPLEMENTED |
| TC-TXN-004 | integration | Void allowed same day before close with reason; rejected after close, on another day, or for payments with refunds. | S1-P18-T002 | P18 | IMPLEMENTED |
| TC-TXN-005 | integration | Payment status transitions UNPAID → PARTIALLY_PAID → PAID; idempotent replay returns the same transaction; concurrent payments cannot exceed total. | S1-P18-T001 | P18 | IMPLEMENTED |
| TC-TXN-006 | integration | Expected totals equal Σ ledger by method for the business date across timezone boundaries; variance ≠ 0 requires notes. | S1-P18-T003 | P18 | IMPLEMENTED |
| TC-TXN-007 | integration | After close, new orders, payments and voids for that business date return DAY_CLOSED; closing twice returns ALREADY_CLOSED. | S1-P18-T003 | P18 | IMPLEMENTED |
| TC-TXN-008 | integration | Receipt totals reconcile to order and ledger; Tenant B order id returns not-found; KITCHEN is forbidden. | S1-P18-T008 | P18 | IMPLEMENTED |
| TC-TXN-009 | e2e | Manager filters by UPI for a date range and voids a same-day entry with reason; cashier sees no Void action. | S1-P18-T005 | P18 | IMPLEMENTED |
| TC-TXN-010 | e2e | Cashier records cash payment with tendered amount, sees change due, completes the order; manager issues a partial refund. | S1-P18-T006 | P18 | PLANNED |
| TC-TXN-011 | e2e | Manager closes the day with a variance note; a subsequent cash payment for that day is blocked with a clear message. | S1-P18-T007 | P18 | IMPLEMENTED |
| TC-TXN-012 | integration | RBAC matrix rows TC-RBAC-139…TC-RBAC-143 pass; TI-028…TI-030 and TI-035 pass. | S1-P18-T009 | P18 | PLANNED |
| TC-TZ-001 | unit | `isValidTimeZone` accepts `Asia/Kolkata`, rejects `IST` and `GMT+5:30`. | S1-P07-T001 | P07 | IMPLEMENTED |
| TC-TZ-002 | unit | `isOpenAt` handles split shifts, closed days and overnight closing. | S1-P02-T011 | P02 | IMPLEMENTED |
| TC-TZ-003 | integration | A PUBLISHED menu for tomorrow becomes public at 00:00 restaurant time and not one minute earlier, independently per tenant. | S1-P11-T004 | P11 | IMPLEMENTED |
| TC-TZ-004 | unit | `utcRangeForBusinessDates` correct for Asia/Kolkata, America/New_York and Europe/London including DST start/end days. | S1-P02-T011 | P02 | IMPLEMENTED |
| TC-TZ-005 | e2e | With the browser timezone set to UTC, Tenant A (Asia/Kolkata) clock shows IST time and Tenant B shows New York time. | S1-P22-T001 | P22 | PLANNED |
| TC-TZ-006 | e2e | Order detail, transactions list and audit log show the same instant in restaurant-local time with zone label for both tenants. | S1-P22-T002 | P22 | PLANNED |
| TC-TZ-007 | static | No `toLocale*String(` call lacks a `timeZone` option and no IANA zone literal appears outside allowed paths. | S1-P22-T002 | P22 | PLANNED |
| TC-TZ-008 | integration | Changing timezone leaves existing orders' and transactions' `business_date` unchanged and applies the new zone to new orders. | S1-P22-T003 | P22 | PLANNED |
| TC-TZ-009 | integration | At one UTC instant the two tenants have different business dates and every dependent feature uses its own tenant's date. | S1-P22-T004 | P22 | PLANNED |
| TC-WEB-001 | e2e | Tenant A site shows its hero, today's menu, categories and prices in INR; no Tenant B names appear; unavailable item labelled. | S1-P09-T003 | P09 | IMPLEMENTED |
| TC-WEB-002 | integration | Public DTO keys equal the documented whitelist exactly (snapshot of key paths). | S1-P09-T002 | P09 | IMPLEMENTED |
| TC-WEB-003 | integration | Unpublished categories, unpublished/archived items and unpublished daily menus are excluded. | S1-P09-T002 | P09 | IMPLEMENTED |
| TC-WEB-004 | integration | Unknown slug, suspended tenant and unpublished website produce identical not-found results. | S1-P09-T002 | P09 | IMPLEMENTED |
| TC-WEB-005 | integration | No staff, customer, transaction, audit, settings or tenant identifier values appear in any public response for either tenant. | S1-P09-T008 | P09 | IMPLEMENTED |
| TC-WEB-006 | integration | Contact visibility flags remove phone/email/address from the public projection. | S1-P07-T001 | P07 | PLANNED |
| TC-WEB-007 | integration | Publishing the website fails with `WEBSITE_NOT_READY` listing missing prerequisites. | S1-P07-T001 | P07 | PLANNED |
| TC-WEB-008 | integration | Sitemap lists only published ACTIVE tenants; robots disallows private paths. | S1-P09-T005 | P09 | IMPLEMENTED |
| TC-WEB-009 | integration | OG image returns PNG 1200×630 for a published tenant; a non-allowlisted logo URL is never fetched (network spy). | S1-P09-T006 | P09 | IMPLEMENTED |
| TC-WEB-010 | e2e | Without a published menu today the page shows the empty state with a link to the full menu. | S1-P09-T004 | P09 | IMPLEMENTED |
| TC-WEB-011 | e2e | Public pages pass axe (zero serious/critical), viewport matrix and Lighthouse budgets. | S1-P09-T010 | P09 | PLANNED |
| TC-WEB-014 | integration | A theme colour that fails contrast against the chosen surface mode is rejected with a field error and nothing is written. | S1-P07-T010 | P07 | IMPLEMENTED |
| TC-WEB-015 | integration | Tenant A cannot read or modify Tenant B's theme or sections (404 parity); section copy is stored and rendered as text, never markup. | S1-P07-T010 | P07 | IMPLEMENTED |
| TC-WEB-016 | integration | Disabling HERO is refused; reordering sections is audited; a missing section row falls back to its default. | S1-P07-T010 | P07 | IMPLEMENTED |
| TC-WEB-017 | e2e | A TENANT_ADMIN changes a colour and a section headline; the public site shows it and the console does not. | S1-P07-T011 | P07 | PLANNED |
| TC-WEB-018 | integration | Host `{slug}.example.test` resolves to that tenant; reserved labels, unknown slugs, unpublished sites and suspended tenants all 404 identically. | S1-P09-T011 | P09 | IMPLEMENTED |
| TC-WEB-019 | e2e | `{slug}.localhost` renders the site; `/restaurant` on a tenant host redirects to the apex host; `/r/{slug}` renders with a canonical link. | S1-P09-T011 | P09 | PLANNED |
| TC-WEB-020 | integration | Two tenants with different themes and sections render different documents; disabled sections are absent; tenant copy is escaped. | S1-P09-T012 | P09 | IMPLEMENTED |
| TC-WEB-021 | e2e | A public site is responsive at 320–1920, axe-clean, and shows empty states when the menu is empty. | S1-P09-T012 | P09 | IMPLEMENTED |
<!-- CATALOGUE:END -->
