---
title: "SLICE-01 Slice Plan — Complete Restaurant SaaS Platform"
document_type: "SLICE_PLAN"
project: "Restaurant SaaS Platform"
project_owner: "Gopala Krishna"
slice: "SLICE-01"
status: "PROPOSED"
version: "2.0"
created: "2026-09-15"
last_updated: "2026-09-15"
owner: "Gopala Krishna (Project Owner)"
planned_start: "2026-09-15"
planned_finish: "Not scheduled — execution-order plan"
dependencies: ["prd.md","architecture.md","tasks.md"]
related_documents: ["README.md","roadmap.md","tasks.md","dependencies.md","prd.md","architecture.md","acceptance.md"]
related_decisions: ["RASOIOS-ADR-005","RASOIOS-ADR-006","RASOIOS-ADR-007","RASOIOS-ADR-008","RASOIOS-ADR-009","RASOIOS-ADR-010","RASOIOS-ADR-011"]
---

# SLICE-01 — Complete Restaurant SaaS Platform

**SLICE-01 is the only implementation slice** (RASOIOS-ADR-005). It delivers the entire approved product, from project foundation to production
release, through 29 ordered **phases**. Phases are not slices. Each phase lists its tasks (`tasks.md` has full detail), dates and exit criteria.

| Item | Value |
|---|---|
| Project | Restaurant SaaS Platform (codename RASOIOS) |
| Project Owner | Gopala Krishna |
| Slice | SLICE-01 — Complete Restaurant SaaS Platform |
| Commercial model | One-time software product/licence; **no subscription plans, tiers or recurring tenant billing** (ADR-002) |
| Planning start | 2026-09-15 |
| Scheduling | Execution-order plan: no computed dates (Project Owner instruction, 2026-09-15). Actual dates are recorded as work happens. |
| Starting point | Existing code at commit `18941a9`, audited in `baseline-audit.md` and treated as reusable baseline, not completed work |

## Slice structure

```
SLICE-01
  P01 Project Foundation            P16 Print Queue
  P02 Database Foundation           P17 Local Print Agent
  P03 Authentication                P18 Transactions
  P04 Multi-Tenant Authorization    P19 Reports
  P05 RBAC                          P20 Social Menu + Sharing
  P06 Super Admin                   P21 PWA
  P07 Restaurant Management         P22 Timezone + Live Clock
  P08 Design System + Frontend      P23 Audit Logging
  P09 Public Restaurant Website     P24 Security Hardening
  P10 Menu Management               P25 Testing + QA
  P11 Daily Menu                    P26 Observability
  P12 Orders                        P27 Railway Deployment
  P13 Customers                     P28 Production Readiness
  P14 KOT                           P29 Final Release
  P15 Kitchen Management
```

## Common Definition of Done (applies to every phase)

A phase is done only when **all** of the following hold:

1. Every task in the phase is `COMPLETED` (or `NOT_APPLICABLE` with a decision reference) and its acceptance criteria are verified.
2. `npm run lint`, `npm run typecheck`, unit, static and integration tests, and `npm run build` pass in CI. E2E specs added in the phase pass.
3. New tenant-owned endpoints have tenant isolation tests (TI) and RBAC matrix rows passing, with no `todo` rows left for the phase.
4. New mutations write the audit actions in `security.md` §7, inside the same transaction.
5. New UI meets `design.md`: tokens only, Lucide icons only, all states designed, responsive at the six viewports, and axe with zero serious/critical issues.
6. No fake data, placeholder screens or fabricated statuses were introduced.
7. Knowledge Base updated where the implementation clarified or changed something (tasks.md statuses and actual dates, data model, API, ADRs).
8. Staging deployment of `main` is healthy after merge.

## Phase index

| Phase | Name | Tasks | Effort (days) | Sequence range |
|---|---|---|---|---|
| P01 | Project Foundation | 10 | 15 | #1–#10 |
| P02 | Database Foundation | 11 | 24 | #11–#21 |
| P03 | Authentication | 9 | 17 | #22–#72 |
| P04 | Multi-Tenant Authorization | 10 | 21 | #29–#73 |
| P05 | RBAC | 7 | 13 | #38–#44 |
| P06 | Super Admin | 8 | 17 | #45–#67 |
| P07 | Restaurant Management | 9 | 24 | #47–#70 |
| P08 | Design System + Frontend Foundation | 13 | 27 | #53–#77 |
| P09 | Public Restaurant Website | 10 | 18 | #78–#87 |
| P10 | Menu Management | 8 | 21 | #88–#95 |
| P11 | Daily Menu | 5 | 10 | #96–#100 |
| P12 | Orders | 11 | 29 | #101–#111 |
| P13 | Customers | 5 | 9 | #112–#116 |
| P14 | KOT | 6 | 10 | #117–#122 |
| P15 | Kitchen Management | 5 | 10 | #123–#127 |
| P16 | Print Queue | 9 | 21 | #128–#136 |
| P17 | Local Print Agent | 10 | 22 | #137–#146 |
| P18 | Transactions | 9 | 19 | #147–#155 |
| P19 | Reports | 6 | 15 | #156–#161 |
| P20 | Social Menu + Sharing | 4 | 9 | #162–#165 |
| P21 | PWA | 4 | 5 | #166–#169 |
| P22 | Timezone + Live Clock | 4 | 6 | #170–#175 |
| P23 | Audit Logging | 4 | 8 | #172–#177 |
| P24 | Security Hardening | 9 | 14 | #178–#186 |
| P25 | Testing + QA | 12 | 31 | #187–#209 |
| P26 | Observability | 8 | 10 | #198–#205 |
| P27 | Railway Deployment | 9 | 14 | #206–#215 |
| P28 | Production Readiness | 7 | 12 | #216–#222 |
| P29 | Final Release | 5 | 10 | #223–#227 |

Some foundational work sits in earlier phases than its phase name suggests, because later phases depend on it. Examples: the audit writer (S1-P04-T010), time primitives
(S1-P02-T011), rate limiter (S1-P03-T007) and staging environment (S1-P01-T008). The later phase of the same name completes verification, UI and operations.

---

# Phase 01 — Project Foundation

## Objective
Make the repository a trustworthy base: verified build, commands aligned with CLAUDE.md, lint rules, environment validation, E2E tooling, CI, staging, and removal of fabricated UI states.

## Business Outcome
Every later change is measured and shipped through a safe pipeline, and nothing on screen claims a state that isn't real.

## Technical Outcome
ESLint flat config with security/money rules; `lib/env.ts` fail-fast validation; Playwright + axe; GitHub Actions CI with real PostgreSQL; Railway staging auto-deploy; README.

## Scope
Baseline verification, npm scripts, lint, env schema, Playwright, CI, removal of demo fallbacks and fake indicators, staging environment, developer guide, decision gate A.

## Non-Goals
Rewriting features, schema changes (P02), authentication changes (P03), visual redesign (P08), production infrastructure (P27).

## Dependencies
None (entry phase).

## Database Changes
None. A CI PostgreSQL service container is introduced.

## API Changes
None.

## Frontend Changes
Remove `/r/demo` fallback, static operational badges, fake "Publish Now", and the broken `/dashboard` link (S1-P01-T007).

## Design Changes
None.

## Security Requirements
SC-SEC-01 (env validation), SC-AUTH-02 (fail on placeholder keys), SC-DEP-01/03 (dependency audit and review), lint bans for `dangerouslySetInnerHTML`, `$queryRawUnsafe`, `parseFloat`.

## Testing Requirements
TC-FOUND-001…008, TC-QA-002, TC-OPS-001. CI runs lint, typecheck, unit, static, integration, e2e, build and audit.

## Documentation Requirements
README; `operations/railway.md` staging record; decision records for gate A.

## Tasks
| # | Task | Name | Owner | Effort | Priority |
|---|---|---|---|---|---|
| 1 | S1-P01-T001 | Verify and record the baseline scaffold | Backend Engineer | 1d | High |
| 2 | S1-P01-T002 | Align npm scripts with CLAUDE.md commands | Backend Engineer | 1d | High |
| 3 | S1-P01-T003 | Configure ESLint with security and money rules | Backend Engineer | 2d | High |
| 4 | S1-P01-T004 | Validate environment configuration at startup | Backend Engineer | 1d | Critical |
| 5 | S1-P01-T005 | Install and configure Playwright with accessibility tooling | QA Engineer | 2d | High |
| 6 | S1-P01-T006 | Continuous integration pipeline and PR template | DevOps Engineer | 2d | High |
| 7 | S1-P01-T007 | Remove fabricated indicators and demo fallbacks | Frontend Engineer | 1d | High |
| 8 | S1-P01-T008 | Provision Railway staging environment | DevOps Engineer | 2d | High |
| 9 | S1-P01-T009 | Developer setup guide | Backend Engineer | 1d | Medium |
| 10 | S1-P01-T010 | Decision gate A: approve schema-affecting decisions | Gopala Krishna (Project Owner) | 2d | Critical |

## Risks
R003 (migration failure — staging surfaces early), R007 (deployment failure), R016 (capacity not confirmed).

## Open Questions
Q-002, Q-004, Q-016, Q-017, Q-022, Q-029 (answered in S1-P01-T010).

## Acceptance Criteria
- CI is green on `main` with all jobs.
- Staging deploys automatically from `main`.
- No fabricated indicators or demo data remain (TC-FOUND-007).
- Decision gate A recorded.

## Definition of Done
Common DoD plus: branch protection requirements documented; README verified by a second person.

## Planned Start
— (not scheduled; record actual start when the first task begins)

## Planned Finish
— (not scheduled; record actual finish when the last task completes)

## Owner
Backend Engineer; QA Engineer; DevOps Engineer; Frontend Engineer; Gopala Krishna (Project Owner). Accountable: Gopala Krishna (Project Owner)

## Exit Criteria
M01 foundation items for P01 satisfied; P02 may start (gate A decided).

# Phase 02 — Database Foundation

## Objective
Implement the approved data model as a migrated PostgreSQL schema with database-enforced tenant integrity, a real-database test harness, a two-tenant seed, and money/time primitives.

## Business Outcome
Restaurant data is stored correctly from day one: exact money, restaurant-local business dates, and structural protection against cross-tenant corruption.

## Technical Outcome
`prisma/schema.prisma` v2 (27 entities, plus MEDIA_ASSET if Q-009 approves it), migration `0001_init` with CHECKs, partial uniques, composite FKs and the audit immutability trigger; `lib/db`, `lib/data` skeleton; static tenant-scope guard; seed; integration harness; `lib/money`; `lib/time`.

## Scope
Schema, migrations, constraints, data-access skeleton, static guard, seed, test harness, migration runbook, money and time libraries.

## Non-Goals
Feature services (later phases), production database (P27), media storage (gated Q-009).

## Dependencies
P01 Project Foundation. Task-level: S1-P01-T008, S1-P01-T010, S1-P01-T006.

## Database Changes
All entities in `data-model.md` §2; enums §1.6; invariants INV-01…INV-10; trigger `audit_logs_immutable`.

## API Changes
None (internal libraries only).

## Frontend Changes
None.

## Design Changes
None.

## Security Requirements
SC-TEN-02, SC-TEN-03, SC-TEN-05, SC-DB-03, SC-DB-04, SC-AUD-03, SC-TEN-10, SC-VAL-02.

## Testing Requirements
TC-DB-001…010, TC-AUDIT-003, TC-TENANT-002, TC-QA-001, TC-PRICE-001, TC-TZ-002, TC-TZ-004.

## Documentation Requirements
`database/database.md` (version, capabilities), `database/migration-strategy.md`, data-model.md corrections if implementation reveals issues.

## Tasks
| # | Task | Name | Owner | Effort | Priority |
|---|---|---|---|---|---|
| 11 | S1-P02-T001 | Confirm PostgreSQL version and capabilities | Database Engineer | 1d | High |
| 12 | S1-P02-T002 | Author Prisma schema v2 | Database Engineer | 4d | Critical |
| 13 | S1-P02-T003 | Create migration baseline 0001_init with raw SQL constraints | Database Engineer | 3d | Critical |
| 14 | S1-P02-T004 | Verify composite foreign-key tenant integrity | Database Engineer | 1d | Critical |
| 15 | S1-P02-T005 | Database client, data-access skeleton and statement timeout | Backend Engineer | 2d | Critical |
| 16 | S1-P02-T006 | Static tenant-scope guard | Security Engineer | 2d | Critical |
| 17 | S1-P02-T007 | Development seed with two isolated tenants | Backend Engineer | 3d | High |
| 18 | S1-P02-T008 | Integration test harness with real PostgreSQL | QA Engineer | 3d | Critical |
| 19 | S1-P02-T009 | Migration strategy and runbook | Database Engineer | 1d | High |
| 20 | S1-P02-T010 | Money primitives | Backend Engineer | 2d | Critical |
| 21 | S1-P02-T011 | Time and business-date primitives | Backend Engineer | 2d | Critical |

## Risks
R003 (migration failure), R001 (cross-tenant leak — mitigated structurally), R013 (documentation drift between data-model and schema).

## Open Questions
Q-002 (restaurants per tenant), Q-017 (existing data), Q-022 (dietary values), Q-009 (MEDIA_ASSET).

## Acceptance Criteria
- Migration applies cleanly on CI and staging with no drift.
- Every constraint has a negative test; composite FKs reject cross-tenant references.
- Seed creates Tenant A and Tenant B with every role.

## Definition of Done
Common DoD plus: data-model.md and schema verified field by field.

## Planned Start
— (not scheduled; record actual start when the first task begins)

## Planned Finish
— (not scheduled; record actual finish when the last task completes)

## Owner
Database Engineer; Backend Engineer; Security Engineer; QA Engineer. Accountable: Gopala Krishna (Project Owner)

## Exit Criteria
Schema frozen for P03–P12 (changes only via new migrations and data-model.md update).

# Phase 03 — Authentication

## Objective
Clerk Email OTP authentication that fails closed, maps identities to invited local users only, and handles inactive accounts, webhooks and log hygiene.

## Business Outcome
Only invited restaurant staff and platform administrators can sign in, without passwords.

## Technical Outcome
Configured Clerk instances; rewritten middleware; `lib/auth/session.ts`; Clerk admin client; styled auth pages; account state pages; PostgreSQL rate limiter; Svix-verified webhook; redaction verification.

## Scope
Login, OTP, session, logout, local user mapping, invitation linking, protected routes, unauthorized/no-access/inactive states, webhook sync, session revocation, rate limiter library.

## Non-Goals
Tenant selection and suspended-tenant handling (P04), staff invitation UI (P07), production Clerk instance (P27).

## Dependencies
P01 Project Foundation; P02 Database Foundation; P08 Design System + Frontend Foundation. Task-level: S1-P01-T004, S1-P02-T005, S1-P08-T004, S1-P08-T009.

## Database Changes
Uses USER, USER_TENANT, AUDIT_LOG, RATE_LIMIT_BUCKET (created in P02).

## API Changes
LD-AUTH-01 (partial), RH-AUTH-01.

## Frontend Changes
`/sign-in`, `/sign-up`, `/account/no-access`, `/account/suspended`.

## Design Changes
Clerk appearance mapped to design tokens (light theme).

## Security Requirements
SC-AUTH-01…11, SC-SESS-03, SC-SESS-04, SC-RL-01, SC-RL-02, SC-WH-01, SC-WH-02, SC-LOG-02.

## Testing Requirements
TC-AUTH-001…018, TC-SEC-013.

## Documentation Requirements
Clerk configuration checklist (DEP-CHK-04…06 inputs); redaction list in `operations/monitoring.md`.

## Tasks
| # | Task | Name | Owner | Effort | Priority |
|---|---|---|---|---|---|
| 22 | S1-P03-T001 | Configure Clerk Email OTP instances | Backend Engineer | 1d | Critical |
| 23 | S1-P03-T002 | Fail-closed middleware and protected route allowlist | Backend Engineer | 2d | Critical |
| 24 | S1-P03-T003 | Session resolver and invited-user linking | Backend Engineer | 3d | Critical |
| 25 | S1-P03-T004 | Clerk administration client | Backend Engineer | 2d | High |
| 57 | S1-P03-T005 | Sign-in, invitation sign-up and sign-out pages | Frontend Engineer | 2d | High |
| 72 | S1-P03-T006 | Account state pages | Frontend Engineer | 2d | High |
| 26 | S1-P03-T007 | PostgreSQL rate limiter | Security Engineer | 2d | High |
| 27 | S1-P03-T008 | Clerk webhook endpoint | Backend Engineer | 2d | Medium |
| 28 | S1-P03-T009 | Authentication log redaction verification | Security Engineer | 1d | High |

## Risks
R002 (authorization bypass via misconfiguration), R015 (Clerk dependency), T-017 (fail-open auth), T-019 (invitation hijack).

## Open Questions
Q-029 (session lifetime on shared devices).

## Acceptance Criteria
- No request reaches protected content without a Clerk session, in any environment.
- Uninvited Clerk users get no local account.
- Logs from auth flows contain no OTP, token or cookie values.

## Definition of Done
Common DoD plus: E2E sign-in runs in CI with Clerk testing tokens.

## Planned Start
— (not scheduled; record actual start when the first task begins)

## Planned Finish
— (not scheduled; record actual finish when the last task completes)

## Owner
Backend Engineer; Frontend Engineer; Security Engineer. Accountable: Gopala Krishna (Project Owner)

## Exit Criteria
Session resolver stable for P04 context resolution; baseline `lib/auth/clerk.ts` removed.

# Phase 04 — Multi-Tenant Authorization

## Objective
Server-derived tenant and platform context, mandatory guards, safe error model, strict input validation, closure of known cross-tenant leaks, the isolation test harness and the transactional audit writer.

## Business Outcome
A restaurant's data is structurally unreachable by any other restaurant's staff.

## Technical Outcome
`lib/auth/context.ts`, `lib/auth/guards.ts`, active-membership cookie, 404 parity, `ActionResult`/route wrappers, strict Zod helpers, retrofit of baseline actions, deletion of the unauthenticated print poll route, `lib/audit`.

## Scope
Everything in tenant-isolation.md §2–§5 for authenticated users; baseline leak fixes BA-01…BA-03, BA-07, BA-09…BA-13.

## Non-Goals
Permission catalogue v2 (P05), agent authentication (P16), public projections (P09).

## Dependencies
P02 Database Foundation; P03 Authentication; P08 Design System + Frontend Foundation. Task-level: S1-P03-T003, S1-P08-T009, S1-P02-T008, S1-P02-T005.

## Database Changes
None (uses P02 schema).

## API Changes
SA-AUTH-01; all baseline actions lose tenant parameters; `/api/print-jobs/poll` removed.

## Frontend Changes
`/account/select-tenant`; error and not-found pages.

## Design Changes
None beyond state components from P08.

## Security Requirements
SC-TEN-01, SC-TEN-02, SC-TEN-04, SC-TEN-06, SC-SESS-02, SC-AUTH-04, SC-RBAC-01, SC-API-01, SC-VAL-01, SC-VAL-08, SC-AUD-02, SC-AUD-04.

## Testing Requirements
TC-TENANT-001…006, TC-AUTH-008, TC-AUTH-013, TC-SEC-001, TC-SEC-005, TC-SEC-007, TC-SEC-018, TC-QA-003, TC-AUDIT-002, TC-AUDIT-004.

## Documentation Requirements
baseline-audit.md follow-up notes for resolved findings; tenant-isolation.md corrections.

## Tasks
| # | Task | Name | Owner | Effort | Priority |
|---|---|---|---|---|---|
| 29 | S1-P04-T001 | Tenant and platform context resolution | Backend Engineer | 3d | Critical |
| 30 | S1-P04-T002 | Authorization guards and guard coverage check | Security Engineer | 2d | Critical |
| 73 | S1-P04-T003 | Active tenant selection | Backend Engineer | 2d | Medium |
| 31 | S1-P04-T004 | Suspended tenant and membership state enforcement | Backend Engineer | 1d | Critical |
| 32 | S1-P04-T005 | Error model and not-found parity | Backend Engineer | 2d | Critical |
| 33 | S1-P04-T006 | Strict input validation conventions | Security Engineer | 2d | Critical |
| 34 | S1-P04-T007 | Retrofit baseline server actions to guards and data layer | Backend Engineer | 3d | Critical |
| 35 | S1-P04-T008 | Close critical baseline leaks | Security Engineer | 1d | Critical |
| 36 | S1-P04-T009 | Tenant isolation test framework | QA Engineer | 3d | Critical |
| 37 | S1-P04-T010 | Transactional audit writer and redaction | Backend Engineer | 2d | Critical |

## Risks
R001 (cross-tenant leak), R002 (authorization bypass), R018 (baseline rework larger than estimated).

## Open Questions
None blocking (ADR-006 and ADR-008 approved in gate A).

## Acceptance Criteria
- No action, route handler or loader accepts a tenant identifier.
- Cross-tenant and missing resources return identical 404.
- BA-01, BA-02, BA-03 closed with passing tests.

## Definition of Done
Common DoD plus: static guard shows zero baseline violations in retrofitted files.

## Planned Start
— (not scheduled; record actual start when the first task begins)

## Planned Finish
— (not scheduled; record actual finish when the last task completes)

## Owner
Backend Engineer; Security Engineer; QA Engineer. Accountable: Gopala Krishna (Project Owner)

## Exit Criteria
M02 achieved together with P03.

# Phase 05 — RBAC

## Objective
Implement the 50-permission catalogue, the role matrix, the role hierarchy, transition authorization, role-based projections and the UI capability map, verified by a matrix test driver.

## Business Outcome
Each staff member can do exactly their job. Cashiers cannot refund, kitchens cannot see customer phone numbers, and managers cannot create owners.

## Technical Outcome
`lib/auth/permissions.ts` v2, `lib/auth/transitions.ts`, `lib/services/staff-rules.ts`, `lib/data/projections.ts`, capability context, RBAC matrix driver.

## Scope
security.md §3 in full.

## Non-Goals
Staff management UI (P07); feature endpoints (their phases add matrix rows).

## Dependencies
P04 Multi-Tenant Authorization. Task-level: S1-P04-T001, S1-P04-T009.

## Database Changes
None.

## API Changes
Guards across all endpoints use v2 codes.

## Frontend Changes
Sidebar and controls filtered by capabilities.

## Design Changes
None.

## Security Requirements
SC-RBAC-01…08.

## Testing Requirements
TC-RBAC-001, 002, 010…016, TC-RBAC-101…150 (progressively).

## Documentation Requirements
security.md matrix fixture kept in sync with code.

## Tasks
| # | Task | Name | Owner | Effort | Priority |
|---|---|---|---|---|---|
| 38 | S1-P05-T001 | Permission catalogue v2 | Backend Engineer | 2d | Critical |
| 39 | S1-P05-T002 | RBAC matrix integration test driver | QA Engineer | 3d | Critical |
| 40 | S1-P05-T003 | Role hierarchy and staff rules | Backend Engineer | 2d | Critical |
| 41 | S1-P05-T004 | Transition authorization table | Backend Engineer | 1d | High |
| 42 | S1-P05-T005 | Role-based response projections | Backend Engineer | 2d | High |
| 43 | S1-P05-T006 | UI capability map and navigation filtering | Frontend Engineer | 2d | High |
| 44 | S1-P05-T007 | RBAC security review | Security Engineer | 1d | High |

## Risks
R002 (authorization bypass), T-003 (role escalation), T-027 (stale privileges).

## Open Questions
Q-019 (SUPER_ADMIN support access).

## Acceptance Criteria
- Matrix code equals documentation (drift test).
- Role escalation cases rejected.
- Security review has no open High/Critical findings.

## Definition of Done
Common DoD.

## Planned Start
— (not scheduled; record actual start when the first task begins)

## Planned Finish
— (not scheduled; record actual finish when the last task completes)

## Owner
Backend Engineer; QA Engineer; Frontend Engineer; Security Engineer. Accountable: Gopala Krishna (Project Owner)

## Exit Criteria
M03 RBAC portion achieved.

# Phase 06 — Super Admin

## Objective
Complete, audited platform administration: dashboard, tenant list, creation, configuration, suspension, reactivation, inspection, administrator invitations and platform audit.

## Business Outcome
The platform owner can onboard and govern restaurant tenants without database access.

## Technical Outcome
`lib/services/tenants.ts`, `lib/data/platform.ts`, admin shell and pages, bootstrap command.

## Scope
Brief §18 in full.

## Non-Goals
Support access to tenant operational data (Q-019); platform billing (prohibited by ADR-002).

## Dependencies
P02 Database Foundation; P03 Authentication; P04 Multi-Tenant Authorization; P05 RBAC; P08 Design System + Frontend Foundation. Task-level: S1-P05-T001, S1-P03-T004, S1-P04-T010, S1-P04-T002, S1-P08-T008, S1-P08-T007, S1-P08-T005, S1-P02-T007.

## Database Changes
Uses TENANT, RESTAURANT, RESTAURANT_HOURS, USER, USER_TENANT, AUDIT_LOG.

## API Changes
LD-ADM-01…04, SA-ADM-01…06.

## Frontend Changes
`/admin`, `/admin/tenants`, `/admin/tenants/new`, `/admin/tenants/[tenantId]`, `/admin/audit`.

## Design Changes
AdminShell on dark theme.

## Security Requirements
SC-RBAC-03, SC-RBAC-07, SC-AUD-01, SC-AUD-05.

## Testing Requirements
TC-ADMIN-001…012.

## Documentation Requirements
First-run bootstrap steps in `operations/deployment.md`.

## Tasks
| # | Task | Name | Owner | Effort | Priority |
|---|---|---|---|---|---|
| 45 | S1-P06-T001 | Platform tenant services | Backend Engineer | 4d | Critical |
| 62 | S1-P06-T002 | Admin shell and platform guard | Frontend Engineer | 1d | Critical |
| 63 | S1-P06-T003 | Platform dashboard page | Frontend Engineer | 2d | High |
| 64 | S1-P06-T004 | Tenant list page | Frontend Engineer | 2d | High |
| 65 | S1-P06-T005 | Create tenant flow | Frontend Engineer | 2d | Critical |
| 66 | S1-P06-T006 | Tenant inspection and lifecycle page | Frontend Engineer | 3d | Critical |
| 67 | S1-P06-T007 | Platform audit page | Frontend Engineer | 2d | High |
| 46 | S1-P06-T008 | SUPER_ADMIN bootstrap command | Backend Engineer | 1d | High |

## Risks
T-026 (SUPER_ADMIN account compromise), R015 (Clerk invitation failures).

## Open Questions
Q-005 (default timezone/currency), Q-019.

## Acceptance Criteria
- SUPER_ADMIN creates, suspends and reactivates a tenant end to end.
- Non-platform users cannot see any platform page or data.
- Every platform action audited.

## Definition of Done
Common DoD.

## Planned Start
— (not scheduled; record actual start when the first task begins)

## Planned Finish
— (not scheduled; record actual finish when the last task completes)

## Owner
Backend Engineer; Frontend Engineer. Accountable: Gopala Krishna (Project Owner)

## Exit Criteria
M03 achieved together with P05.

# Phase 07 — Restaurant Management

## Objective
Restaurant identity, branding, contact, opening hours, timezone, currency, website settings, operational settings, kitchen sections and staff management, all loading real data.

## Business Outcome
Restaurant owners configure their business and team themselves.

## Technical Outcome
`lib/services/restaurant.ts`, kitchen sections, staff services, settings/staff/website UIs, image URL allowlist, gated media uploads.

## Scope
Brief §19 plus `/restaurant/staff` and `/restaurant/website`.

## Non-Goals
Public site rendering (P09); menu (P10).

## Dependencies
P01 Project Foundation; P02 Database Foundation; P03 Authentication; P04 Multi-Tenant Authorization; P05 RBAC; P08 Design System + Frontend Foundation. Task-level: S1-P05-T001, S1-P04-T010, S1-P02-T011, S1-P04-T006, S1-P05-T003, S1-P03-T004, S1-P08-T005, S1-P08-T006, S1-P08-T008, S1-P08-T007, S1-P01-T010.

## Database Changes
Uses RESTAURANT, RESTAURANT_HOURS, KITCHEN_SECTION, USER_TENANT; MEDIA_ASSET migration only if Q-009 approves.

## API Changes
LD-RST-01, SA-RST-01…06, SA-KSEC-01…04, LD-STF-01, SA-STF-01…06, RH-MEDIA-01, SA-MEDIA-01 (gated).

## Frontend Changes
`/restaurant/settings`, `/restaurant/staff`, `/restaurant/website`.

## Design Changes
Hours editor, contrast feedback for accent colour.

## Security Requirements
SC-VAL-01, SC-VAL-04, SC-RBAC-04, SC-RBAC-05, SC-AUTH-08, SC-FILE-01, SC-FILE-02.

## Testing Requirements
TC-REST-001…008, TC-STAFF-001…004, TC-KOT-007, TC-SEC-003, TC-SEC-016, TC-SEC-017, TC-TZ-001, TC-WEB-006, TC-WEB-007.

## Documentation Requirements
Image allowlist per environment; staff onboarding help text.

## Tasks
| # | Task | Name | Owner | Effort | Priority |
|---|---|---|---|---|---|
| 48 | S1-P07-T001 | Restaurant settings services | Backend Engineer | 3d | Critical |
| 47 | S1-P07-T002 | Image URL allowlist validation | Security Engineer | 1d | High |
| 49 | S1-P07-T003 | Kitchen sections services and actions | Backend Engineer | 2d | High |
| 50 | S1-P07-T004 | Staff management services | Backend Engineer | 3d | Critical |
| 68 | S1-P07-T005 | Restaurant settings UI | Frontend Engineer | 4d | High |
| 69 | S1-P07-T006 | Staff management UI | Frontend Engineer | 3d | High |
| 70 | S1-P07-T007 | Website and branding UI | Frontend Engineer | 3d | High |
| 51 | S1-P07-T008 | Decision: media storage for images | Gopala Krishna (Project Owner) | 1d | Medium |
| 52 | S1-P07-T009 | Media uploads (decision-gated by Q-009) | Backend Engineer | 4d | Medium |

## Risks
T-014 (SSRF via images), T-005 (malicious file), R009 (storage integration).

## Open Questions
Q-005, Q-009.

## Acceptance Criteria
- Settings pages never show demo data (BA-27 closed).
- Staff invitation and hierarchy work end to end.
- Website publish blocked until ready.

## Definition of Done
Common DoD.

## Planned Start
— (not scheduled; record actual start when the first task begins)

## Planned Finish
— (not scheduled; record actual finish when the last task completes)

## Owner
Backend Engineer; Security Engineer; Frontend Engineer; Gopala Krishna (Project Owner). Accountable: Gopala Krishna (Project Owner)

## Exit Criteria
Restaurant configuration complete for P09 public site and P10 menu.

# Phase 08 — Design System + Frontend Foundation

## Objective
Build the single design system and application shells defined in design.md and frontend.md before feature UIs are rebuilt.

## Business Outcome
The product looks and behaves like one premium restaurant product on every screen and device.

## Technical Outcome
Tokens, typography via next/font, Lucide icon system, primitives, forms, overlays, data table, shells, state components, polling hook, accessibility baseline, design static checks, responsive suite, landing page.

## Scope
Brief §21–§23 and implementation brief §27–§48 foundations.

## Non-Goals
Feature screens (their phases); light console theme (Future Scope).

## Dependencies
P01 Project Foundation; P05 RBAC. Task-level: S1-P01-T003, S1-P05-T006, S1-P01-T005.

## Database Changes
None.

## API Changes
None (consumes LD-AUTH-01 capabilities).

## Frontend Changes
Route groups `(console)` and `(focus)`; AppShell, FocusShell, AdminShell; `/`; redirects for legacy routes.

## Design Changes
Entire design system.

## Security Requirements
SC-RBAC-08 (UI is not authorization), SC-HDR-02 (no external font origins), SC-VAL-02 (money inputs as strings).

## Testing Requirements
TC-DS-001…015.

## Documentation Requirements
`design/accessibility.md` checklist; component usage notes in frontend.md §6 if APIs change.

## Tasks
| # | Task | Name | Owner | Effort | Priority |
|---|---|---|---|---|---|
| 53 | S1-P08-T001 | Design tokens and Tailwind theme | Frontend Engineer | 2d | High |
| 54 | S1-P08-T002 | Typography with self-hosted fonts | Frontend Engineer | 1d | High |
| 55 | S1-P08-T003 | Icon system | Frontend Engineer | 1d | High |
| 56 | S1-P08-T004 | Core primitives | Frontend Engineer | 3d | High |
| 58 | S1-P08-T005 | Form system | Frontend Engineer | 3d | High |
| 59 | S1-P08-T006 | Overlays, tabs, sortable lists, filters, pagination | Frontend Engineer | 4d | High |
| 60 | S1-P08-T007 | Data table | Frontend Engineer | 2d | High |
| 61 | S1-P08-T008 | Application shells and navigation | Frontend Engineer | 3d | High |
| 71 | S1-P08-T009 | State components and polling hook | Frontend Engineer | 2d | High |
| 74 | S1-P08-T010 | Accessibility baseline | Frontend Engineer | 2d | High |
| 75 | S1-P08-T011 | Design-token static checks and baseline cleanup | Frontend Engineer | 1d | Medium |
| 76 | S1-P08-T012 | Responsive viewport suite | QA Engineer | 2d | High |
| 77 | S1-P08-T013 | Landing page rebuild | Frontend Engineer | 1d | Low |

## Risks
R012 (insufficient testing of accessibility), R011 (scope creep in visual polish).

## Open Questions
Q-026 (browser/device matrix), Q-028 (languages).

## Acceptance Criteria
- Design static checks ratchet in place.
- Shells and primitives pass axe and keyboard tests.
- Primary buttons meet contrast (5.60:1 console, 5.02:1 public).

## Definition of Done
Common DoD.

## Planned Start
— (not scheduled; record actual start when the first task begins)

## Planned Finish
— (not scheduled; record actual finish when the last task completes)

## Owner
Frontend Engineer; QA Engineer. Accountable: Gopala Krishna (Project Owner)

## Exit Criteria
Feature phases can build UI exclusively from the design system.

# Phase 09 — Public Restaurant Website

## Objective
A real, fast, SEO-ready restaurant website per tenant that exposes only public data.

## Business Outcome
Diners find the menu, today's specials, hours and contact details on a site the restaurant is proud of.

## Technical Outcome
`lib/data/public.ts` projections, `/r/[slug]` and `/r/[slug]/daily`, metadata, JSON-LD, sitemap/robots, OG image, caching policy, public response-shape guard, public ordering resolution.

## Scope
Brief §20; hostname strategy per Q-013; ordering per Q-001.

## Non-Goals
Online payments; delivery logistics; subdomain routing unless Q-013 approves it.

## Dependencies
P01 Project Foundation; P02 Database Foundation; P04 Multi-Tenant Authorization; P07 Restaurant Management; P08 Design System + Frontend Foundation. Task-level: S1-P01-T010, S1-P02-T011, S1-P04-T005, S1-P08-T004, S1-P08-T009, S1-P07-T002, S1-P08-T012.

## Database Changes
None.

## API Changes
LD-PUB-01…03, RH-PUB-01, SA-PUB-01 (gated/removed).

## Frontend Changes
Public pages on light theme.

## Design Changes
Public editorial layout (design.md §11).

## Security Requirements
SC-PUB-01…03, SC-TEN-06, SC-TEN-09, SC-VAL-03, SC-VAL-04, SC-HDR-03.

## Testing Requirements
TC-WEB-001…011, TC-DMENU-005, TC-SEC-002, TC-SEC-006, TC-ORDER-012.

## Documentation Requirements
Public data whitelist in api.md kept exact; decision outcomes Q-001/Q-013 reflected.

## Tasks
| # | Task | Name | Owner | Effort | Priority |
|---|---|---|---|---|---|
| 78 | S1-P09-T001 | Decision gate: public hostname and public ordering | Gopala Krishna (Project Owner) | 1d | Critical |
| 79 | S1-P09-T002 | Public data loader and projection | Backend Engineer | 3d | Critical |
| 80 | S1-P09-T003 | Public restaurant page | Frontend Engineer | 4d | Critical |
| 81 | S1-P09-T004 | Today's menu share page | Frontend Engineer | 1d | Medium |
| 82 | S1-P09-T005 | SEO metadata, JSON-LD, sitemap and robots | Frontend Engineer | 2d | High |
| 83 | S1-P09-T006 | Open Graph image route | Backend Engineer | 2d | Medium |
| 84 | S1-P09-T007 | Caching and revalidation policy | Backend Engineer | 1d | High |
| 85 | S1-P09-T008 | Public response-shape guard | Security Engineer | 1d | Critical |
| 86 | S1-P09-T009 | Public ordering resolution (decision-gated by Q-001) | Backend Engineer | 2d | High |
| 87 | S1-P09-T010 | Public site accessibility and responsive verification | QA Engineer | 1d | High |

## Risks
T-010 (data leakage), T-023 (cache leak), T-029 (enumeration), T-030 (public order spam if approved).

## Open Questions
Q-001, Q-013.

## Acceptance Criteria
- Public site renders real tenant data; no demo fallback.
- Response-shape guard proves no private data.
- Lighthouse budgets met.

## Definition of Done
Common DoD.

## Planned Start
— (not scheduled; record actual start when the first task begins)

## Planned Finish
— (not scheduled; record actual finish when the last task completes)

## Owner
Gopala Krishna (Project Owner); Backend Engineer; Frontend Engineer; Security Engineer; QA Engineer. Accountable: Gopala Krishna (Project Owner)

## Exit Criteria
M04 achieved together with P07 and P08.

# Phase 10 — Menu Management

## Objective
Categories, items, variants and add-ons with Decimal prices, publish/unpublish, availability, reorder and archive, all tenant-scoped and audited.

## Business Outcome
Restaurants maintain an accurate menu that feeds the website, order entry and kitchen.

## Technical Outcome
`lib/data/menu.ts`, category/item/modifier services, categories list, items list, item editor.

## Scope
Brief §24.

## Non-Goals
Add-on groups with min/max rules, inventory, recipe costing (out of scope).

## Dependencies
P02 Database Foundation; P04 Multi-Tenant Authorization; P08 Design System + Frontend Foundation. Task-level: S1-P04-T005, S1-P02-T010, S1-P04-T010, S1-P08-T006, S1-P08-T008, S1-P08-T007, S1-P08-T005, S1-P04-T009.

## Database Changes
Uses MENU_CATEGORY, MENU_ITEM, MENU_ITEM_VARIANT, MENU_ITEM_ADDON.

## API Changes
LD-MENU-01…03, SA-MENU-01…13.

## Frontend Changes
`/restaurant/menu`, `/restaurant/menu/categories`, `/restaurant/menu/items`, `/restaurant/menu/items/new`, `/restaurant/menu/items/[itemId]`.

## Design Changes
Icon picker (MENU_ICON_KEYS), dietary marks, live public preview.

## Security Requirements
SC-TEN-02, SC-VAL-02, SC-VAL-04, SC-AUD-01.

## Testing Requirements
TC-MENU-001…017; TI-001…TI-010.

## Documentation Requirements
data-model.md updates if modifier rules change.

## Tasks
| # | Task | Name | Owner | Effort | Priority |
|---|---|---|---|---|---|
| 88 | S1-P10-T001 | Menu data layer | Backend Engineer | 3d | Critical |
| 89 | S1-P10-T002 | Category services and actions | Backend Engineer | 2d | Critical |
| 90 | S1-P10-T003 | Menu item services and actions | Backend Engineer | 3d | Critical |
| 91 | S1-P10-T004 | Variants and add-ons | Backend Engineer | 2d | Critical |
| 92 | S1-P10-T005 | Categories UI | Frontend Engineer | 2d | High |
| 93 | S1-P10-T006 | Menu items list UI | Frontend Engineer | 3d | High |
| 94 | S1-P10-T007 | Menu item editor | Frontend Engineer | 4d | High |
| 95 | S1-P10-T008 | Menu authorization and isolation tests | QA Engineer | 2d | Critical |

## Risks
R013 (docs drift), T-006 (price manipulation — modifiers).

## Open Questions
Q-022 (dietary values), Q-004 (tax model).

## Acceptance Criteria
- Sample menu state removed (BA-26 closed); JSON price storage gone (BA-17 closed).
- Item with variants/add-ons appears correctly on public site.

## Definition of Done
Common DoD.

## Planned Start
— (not scheduled; record actual start when the first task begins)

## Planned Finish
— (not scheduled; record actual finish when the last task completes)

## Owner
Backend Engineer; Frontend Engineer; QA Engineer. Accountable: Gopala Krishna (Project Owner)

## Exit Criteria
M05 menu portion achieved.

# Phase 11 — Daily Menu

## Objective
Date-specific daily menus with ordering, copy, scheduling by business date, publish/unpublish and public display.

## Business Outcome
Managers publish today's specials in minutes and plan ahead.

## Technical Outcome
Daily menu services and loaders, editor UI, timezone schedule tests.

## Scope
Brief §25.

## Non-Goals
Restricting ordering to daily menu items (Q-021 recommendation: not restricted); price overrides per day.

## Dependencies
P02 Database Foundation; P08 Design System + Frontend Foundation; P09 Public Restaurant Website; P10 Menu Management. Task-level: S1-P10-T003, S1-P02-T011, S1-P08-T006, S1-P08-T008, S1-P09-T002.

## Database Changes
Uses DAILY_MENU, DAILY_MENU_ITEM.

## API Changes
LD-DMENU-01, LD-DMENU-02, SA-DMENU-01…05.

## Frontend Changes
`/restaurant/daily-menu`.

## Design Changes
Date navigator and status strip.

## Security Requirements
SC-TEN-02, SC-AUD-01.

## Testing Requirements
TC-DMENU-001…008, TC-TZ-003; TI-011…TI-013.

## Documentation Requirements
None beyond task statuses.

## Tasks
| # | Task | Name | Owner | Effort | Priority |
|---|---|---|---|---|---|
| 96 | S1-P11-T001 | Daily menu services | Backend Engineer | 3d | Critical |
| 97 | S1-P11-T002 | Daily menu loaders | Backend Engineer | 1d | High |
| 98 | S1-P11-T003 | Daily menu editor UI | Frontend Engineer | 4d | High |
| 99 | S1-P11-T004 | Daily menu scheduling across timezones | QA Engineer | 1d | High |
| 100 | S1-P11-T005 | Daily menu audit and isolation tests | QA Engineer | 1d | High |

## Risks
R013.

## Open Questions
Q-021.

## Acceptance Criteria
- Future-dated menus appear exactly at restaurant-local midnight.
- Copy previous works and reports skipped items.

## Definition of Done
Common DoD.

## Planned Start
— (not scheduled; record actual start when the first task begins)

## Planned Finish
— (not scheduled; record actual finish when the last task completes)

## Owner
Backend Engineer; Frontend Engineer; QA Engineer. Accountable: Gopala Krishna (Project Owner)

## Exit Criteria
M05 achieved.

# Phase 12 — Orders

## Objective
Atomic, idempotent order creation with authoritative server pricing and snapshots; the complete order lifecycle with role rules; POS entry, order board and order detail.

## Business Outcome
Staff take orders quickly and accurately; totals are always right.

## Technical Outcome
`lib/pricing`, counters, order service and state machine, loaders and polling route, POS UI, board, detail, gated add-items.

## Scope
Brief §26 steps 1–12 and lifecycle table.

## Non-Goals
Discounts (Q-006), public ordering (Q-001), table management, payment gateway.

## Dependencies
P01 Project Foundation; P02 Database Foundation; P04 Multi-Tenant Authorization; P05 RBAC; P08 Design System + Frontend Foundation; P10 Menu Management. Task-level: S1-P01-T010, S1-P02-T010, S1-P02-T003, S1-P02-T011, S1-P10-T004, S1-P04-T010, S1-P05-T004, S1-P05-T005, S1-P08-T006, S1-P08-T008, S1-P08-T009, S1-P04-T009.

## Database Changes
Uses ORDER, ORDER_ITEM, ORDER_ITEM_ADDON, TENANT_COUNTER, CUSTOMER.

## API Changes
LD-ORD-01…03, RH-ORD-01, SA-ORD-01…06 (SA-ORD-05 in P13, SA-ORD-06 in P15).

## Frontend Changes
`/restaurant/orders`, `/restaurant/orders/new`, `/restaurant/orders/[orderId]`.

## Design Changes
Touch-first POS layout (design.md §11).

## Security Requirements
SC-VAL-02, SC-API-02, SC-API-03, SC-RBAC-06, SC-RBAC-07, SC-TEN-02.

## Testing Requirements
TC-ORDER-001…019, TC-PRICE-002, TC-KOT-002, TC-CUST-007; TI-021…TI-027; ADV-007, ADV-008, ADV-010.

## Documentation Requirements
Business rules BR-ORD-* updated from gate decisions.

## Tasks
| # | Task | Name | Owner | Effort | Priority |
|---|---|---|---|---|---|
| 101 | S1-P12-T001 | Decision gate: order rules | Gopala Krishna (Project Owner) | 1d | Critical |
| 102 | S1-P12-T002 | Pricing engine | Backend Engineer | 2d | Critical |
| 103 | S1-P12-T003 | Race-free sequential numbering | Database Engineer | 1d | Critical |
| 104 | S1-P12-T004 | Order creation service | Backend Engineer | 4d | Critical |
| 105 | S1-P12-T005 | Order state machine service | Backend Engineer | 3d | Critical |
| 106 | S1-P12-T006 | Order loaders and polling route | Backend Engineer | 2d | High |
| 107 | S1-P12-T007 | Order entry (POS) UI | Frontend Engineer | 5d | Critical |
| 108 | S1-P12-T008 | Order board UI | Frontend Engineer | 3d | High |
| 109 | S1-P12-T009 | Order detail UI | Frontend Engineer | 3d | High |
| 110 | S1-P12-T010 | Add items to an open order (decision-gated by Q-003) | Backend Engineer | 3d | Medium |
| 111 | S1-P12-T011 | Order authorization and isolation tests | QA Engineer | 2d | Critical |

## Risks
T-006 (price manipulation), R010 (performance at peak), R018 (baseline rework).

## Open Questions
Q-003, Q-006, Q-007, Q-008, Q-021.

## Acceptance Criteria
- Client cannot influence price, total, tax, discount or tenant.
- Numbers unique under concurrency; replays create one order.
- Order lifecycle transitions enforced per role.

## Definition of Done
Common DoD.

## Planned Start
— (not scheduled; record actual start when the first task begins)

## Planned Finish
— (not scheduled; record actual finish when the last task completes)

## Owner
Gopala Krishna (Project Owner); Backend Engineer; Database Engineer; Frontend Engineer; QA Engineer. Accountable: Gopala Krishna (Project Owner)

## Exit Criteria
M06 orders portion achieved.

# Phase 13 — Customers

## Objective
Minimal-data customer records with lookup, history, privacy controls and POS integration.

## Business Outcome
Staff recognise returning customers without over-collecting personal data.

## Technical Outcome
Customer services, loaders, lookup route, customers UI, POS lookup.

## Scope
Brief §27.

## Non-Goals
Marketing, loyalty, messaging, exports.

## Dependencies
P04 Multi-Tenant Authorization; P08 Design System + Frontend Foundation; P12 Orders. Task-level: S1-P04-T005, S1-P04-T010, S1-P08-T007, S1-P08-T008, S1-P12-T007.

## Database Changes
Uses CUSTOMER.

## API Changes
LD-CUS-01, LD-CUS-02, RH-CUS-01, SA-CUS-01…04, SA-ORD-05.

## Frontend Changes
`/restaurant/customers`, `/restaurant/customers/[customerId]`, POS customer lookup.

## Design Changes
Masked phone presentation.

## Security Requirements
SC-PII-01…03, SC-RL-01, SC-TEN-02.

## Testing Requirements
TC-CUST-001…010; TI-031…TI-034.

## Documentation Requirements
Privacy notes per Q-020.

## Tasks
| # | Task | Name | Owner | Effort | Priority |
|---|---|---|---|---|---|
| 112 | S1-P13-T001 | Customer services | Backend Engineer | 3d | High |
| 113 | S1-P13-T002 | Customer loaders and lookup route | Backend Engineer | 1d | High |
| 114 | S1-P13-T003 | Customers UI | Frontend Engineer | 3d | Medium |
| 115 | S1-P13-T004 | Customer lookup in order entry | Frontend Engineer | 1d | Medium |
| 116 | S1-P13-T005 | Customer isolation tests | QA Engineer | 1d | Critical |

## Risks
T-010 (PII leakage), R008 (data loss via anonymisation misuse).

## Open Questions
Q-020 (retention/erasure policy).

## Acceptance Criteria
- Kitchen cannot access customers; lists mask phones.
- Order submissions never overwrite customers (BA-19 closed).

## Definition of Done
Common DoD.

## Planned Start
— (not scheduled; record actual start when the first task begins)

## Planned Finish
— (not scheduled; record actual finish when the last task completes)

## Owner
Backend Engineer; Frontend Engineer; QA Engineer. Accountable: Gopala Krishna (Project Owner)

## Exit Criteria
M06 achieved.

# Phase 14 — KOT

## Objective
Idempotent kitchen order tickets per section and round, generated in the acceptance transaction, with status progression, cancellation and print state.

## Business Outcome
Every accepted order reaches the right kitchen station exactly once.

## Technical Outcome
KOT generation and status services, order status derivation, print status derivation, order detail KOT section.

## Scope
Brief §28.

## Non-Goals
Printing (P16), kitchen board UI (P15).

## Dependencies
P12 Orders. Task-level: S1-P12-T005, S1-P12-T003, S1-P12-T009.

## Database Changes
Uses KOT_TICKET, KOT_ITEM, TENANT_COUNTER.

## API Changes
SA-KOT-01; internal generation used by SA-ORD-01/02.

## Frontend Changes
KOT status list in order detail.

## Design Changes
KOT status badges.

## Security Requirements
SC-RBAC-06, SC-TEN-02, SC-AUD-01.

## Testing Requirements
TC-KOT-001…010 (TC-KOT-005, TC-KOT-007 in other phases), TC-ORDER-019; TI-036…TI-039.

## Documentation Requirements
None beyond statuses.

## Tasks
| # | Task | Name | Owner | Effort | Priority |
|---|---|---|---|---|---|
| 117 | S1-P14-T001 | KOT generation service | Backend Engineer | 3d | Critical |
| 118 | S1-P14-T002 | KOT status service and order status derivation | Backend Engineer | 2d | Critical |
| 119 | S1-P14-T003 | KOT cancellation with order | Backend Engineer | 1d | High |
| 120 | S1-P14-T004 | KOT print state derivation | Backend Engineer | 1d | High |
| 121 | S1-P14-T005 | KOT section in order detail | Frontend Engineer | 2d | Medium |
| 122 | S1-P14-T006 | KOT audit and isolation tests | QA Engineer | 1d | Critical |

## Risks
R005 (duplicate printing originates from duplicate KOTs — fixed here).

## Open Questions
Q-003 (rounds).

## Acceptance Criteria
- BA-18 duplicate KOT defect closed.
- Multi-section orders produce one KOT per section.

## Definition of Done
Common DoD.

## Planned Start
— (not scheduled; record actual start when the first task begins)

## Planned Finish
— (not scheduled; record actual finish when the last task completes)

## Owner
Backend Engineer; Frontend Engineer; QA Engineer. Accountable: Gopala Krishna (Project Owner)

## Exit Criteria
KOT data ready for kitchen board and print queue.

# Phase 15 — Kitchen Management

## Objective
A dedicated, fast, readable kitchen display with sections, timers, priority and touch actions refreshing within 5 seconds.

## Business Outcome
Kitchens see new tickets immediately and staff know what is late.

## Technical Outcome
Kitchen loaders/polling route, kitchen board UI, priority action, field and load checks.

## Scope
Brief §29.

## Non-Goals
Push/SSE (ADR-009 alternative); recipe display.

## Dependencies
P05 RBAC; P08 Design System + Frontend Foundation; P12 Orders; P14 KOT. Task-level: S1-P14-T004, S1-P05-T005, S1-P08-T009, S1-P08-T008, S1-P12-T005.

## Database Changes
None.

## API Changes
LD-KOT-01, RH-KOT-01, SA-ORD-06.

## Frontend Changes
`/restaurant/kitchen` (FocusShell); removal of `/restaurant/kds`.

## Design Changes
Kitchen typography and overdue treatments.

## Security Requirements
SC-RBAC-07, SC-HDR-03.

## Testing Requirements
TC-KITCH-001…009.

## Documentation Requirements
Kitchen field test results in testing.md.

## Tasks
| # | Task | Name | Owner | Effort | Priority |
|---|---|---|---|---|---|
| 123 | S1-P15-T001 | Kitchen loaders and polling route | Backend Engineer | 2d | Critical |
| 124 | S1-P15-T002 | Kitchen board UI | Frontend Engineer | 5d | Critical |
| 125 | S1-P15-T003 | Order priority action | Backend Engineer | 1d | Medium |
| 126 | S1-P15-T004 | Kitchen field usability check | QA Engineer | 1d | Medium |
| 127 | S1-P15-T005 | Kitchen polling load check | QA Engineer | 1d | Medium |

## Risks
R010 (polling performance), R004 (printer failure — board is fallback).

## Open Questions
Q-026 (tablet devices).

## Acceptance Criteria
- New KOT visible ≤ 5 s; no PII on kitchen screens.
- Tablet field check passes.

## Definition of Done
Common DoD.

## Planned Start
— (not scheduled; record actual start when the first task begins)

## Planned Finish
— (not scheduled; record actual finish when the last task completes)

## Owner
Backend Engineer; Frontend Engineer; QA Engineer. Accountable: Gopala Krishna (Project Owner)

## Exit Criteria
M07 achieved together with P14.

# Phase 16 — Print Queue

## Objective
A concurrent-safe, tenant-bound cloud print queue with printer registration, agent credentials, routing, retries, deduplication and a printing console.

## Business Outcome
Tickets and receipts reach the right printer, and failures are visible and recoverable.

## Technical Outcome
Queue data layer (`FOR UPDATE SKIP LOCKED` leases), renderers, producers, printer/agent services, agent API, console UI, monitoring indicators.

## Scope
Brief §30 cloud side; ADR-007.

## Non-Goals
Agent program (P17); printer-side acknowledgements beyond ESC/POS.

## Dependencies
P02 Database Foundation; P03 Authentication; P04 Multi-Tenant Authorization; P08 Design System + Frontend Foundation; P14 KOT; P15 Kitchen Management. Task-level: S1-P02-T003, S1-P04-T008, S1-P14-T001, S1-P03-T007, S1-P08-T007, S1-P08-T008, S1-P15-T002.

## Database Changes
Uses PRINTER, PRINT_AGENT, PRINT_JOB.

## API Changes
RH-AGT-01…05, RH-PRN-01, LD-PRN-01, SA-PRN-01…06, SA-AGT-01, SA-AGT-02, SA-KOT-02.

## Frontend Changes
`/restaurant/printing`; print badges; header indicator.

## Design Changes
Print status system (design.md §7).

## Security Requirements
SC-PRINT-01…07, SC-PRINT-09, SC-TEN-07, SC-VAL-07, SC-RL-01.

## Testing Requirements
TC-PRINT-001…016, TC-AGENT-001…005, TC-KOT-005; TI-041…TI-046; ADV-012…ADV-015.

## Documentation Requirements
architecture.md §6 corrections; operations notes for agent pairing.

## Tasks
| # | Task | Name | Owner | Effort | Priority |
|---|---|---|---|---|---|
| 128 | S1-P16-T001 | Print queue data layer | Backend Engineer | 3d | Critical |
| 129 | S1-P16-T002 | Print document renderers | Backend Engineer | 2d | High |
| 130 | S1-P16-T003 | Print job producers and reprint | Backend Engineer | 3d | Critical |
| 131 | S1-P16-T004 | Printer and agent management services | Backend Engineer | 2d | Critical |
| 132 | S1-P16-T005 | Print agent API | Backend Engineer | 3d | Critical |
| 133 | S1-P16-T006 | Printing console UI | Frontend Engineer | 4d | High |
| 134 | S1-P16-T007 | Manual retry and lease recovery | Backend Engineer | 1d | High |
| 135 | S1-P16-T008 | Print isolation and adversarial tests | Security Engineer | 2d | Critical |
| 136 | S1-P16-T009 | Printing health indicators | Frontend Engineer | 1d | Medium |

## Risks
R004, R005, R006, T-007, T-008.

## Open Questions
Q-011 (printer models).

## Acceptance Criteria
- BA-01 and BA-22 closed; PRINTED only via agent ack.
- Concurrent claims never duplicate jobs.

## Definition of Done
Common DoD.

## Planned Start
— (not scheduled; record actual start when the first task begins)

## Planned Finish
— (not scheduled; record actual finish when the last task completes)

## Owner
Backend Engineer; Frontend Engineer; Security Engineer. Accountable: Gopala Krishna (Project Owner)

## Exit Criteria
Agent API stable for P17.

# Phase 17 — Local Print Agent

## Objective
A secure, resilient local agent that pairs once, polls the queue and prints to USB and LAN ESC/POS printers.

## Business Outcome
Restaurants print kitchen tickets and receipts reliably without network configuration.

## Technical Outcome
`print-agent/` package, credential storage, loop with journal, ESC/POS encoder, transports, printer simulator, packaging, install guide.

## Scope
Brief §30 local side.

## Non-Goals
Auto-update (Future Scope), non-ESC/POS printers.

## Dependencies
P01 Project Foundation; P16 Print Queue. Task-level: S1-P01-T010, S1-P16-T002, S1-P16-T005, S1-P16-T003.

## Database Changes
None.

## API Changes
Client of RH-AGT-01…05.

## Frontend Changes
Install guide link from pairing dialog.

## Design Changes
None.

## Security Requirements
SC-PRINT-08, SC-VAL-06, SC-VAL-07, SC-LOG-04.

## Testing Requirements
TC-AGENT-006…016.

## Documentation Requirements
`operations/print-agent.md`.

## Tasks
| # | Task | Name | Owner | Effort | Priority |
|---|---|---|---|---|---|
| 137 | S1-P17-T001 | Decision gate: agent runtime and printers | Gopala Krishna (Project Owner) | 1d | Critical |
| 138 | S1-P17-T002 | Agent package scaffold | Backend Engineer | 2d | High |
| 139 | S1-P17-T003 | Pairing and credential storage | Backend Engineer | 2d | Critical |
| 140 | S1-P17-T004 | Poll, claim, acknowledge loop | Backend Engineer | 3d | Critical |
| 141 | S1-P17-T005 | ESC/POS encoder | Backend Engineer | 3d | Critical |
| 142 | S1-P17-T006 | Printer transports | Backend Engineer | 3d | Critical |
| 143 | S1-P17-T007 | ESC/POS printer simulator | QA Engineer | 2d | High |
| 144 | S1-P17-T008 | End-to-end printing verification | QA Engineer | 2d | Critical |
| 145 | S1-P17-T009 | Agent packaging and installation guide | DevOps Engineer | 3d | High |
| 146 | S1-P17-T010 | Agent security review | Security Engineer | 1d | High |

## Risks
R004 (printer failure), R006 (agent compromise), R017 (printer compatibility).

## Open Questions
Q-010, Q-011.

## Acceptance Criteria
- Physical USB and LAN printers verified.
- Crash-after-print does not reprint (journal).

## Definition of Done
Common DoD plus: install guide executed by a non-developer.

## Planned Start
— (not scheduled; record actual start when the first task begins)

## Planned Finish
— (not scheduled; record actual finish when the last task completes)

## Owner
Gopala Krishna (Project Owner); Backend Engineer; QA Engineer; DevOps Engineer; Security Engineer. Accountable: Gopala Krishna (Project Owner)

## Exit Criteria
M08 achieved together with P16.

# Phase 18 — Transactions

## Objective
An append-only payment ledger with validated payments, refunds, voids, day close reconciliation, transaction history and receipts.

## Business Outcome
Cash, card and UPI takings reconcile at the end of every day.

## Technical Outcome
Ledger, refund/void, day close services; transactions list; payment panel; day close UI; receipts.

## Scope
Brief §31.

## Non-Goals
Payment gateway (Q-015), accounting exports, tips.

## Dependencies
P04 Multi-Tenant Authorization; P08 Design System + Frontend Foundation; P12 Orders; P16 Print Queue. Task-level: S1-P12-T005, S1-P04-T010, S1-P08-T007, S1-P08-T008, S1-P12-T009, S1-P08-T005, S1-P16-T003.

## Database Changes
Uses TRANSACTION, BUSINESS_DAY_CLOSE, ORDER.

## API Changes
LD-TXN-01, LD-TXN-02, LD-RCPT-01, SA-TXN-01…04, SA-PRN-06.

## Frontend Changes
`/restaurant/transactions`, `/restaurant/transactions/day-close`, `/restaurant/orders/[orderId]/receipt`, payment panel.

## Design Changes
Right-aligned tabular money, voided presentation.

## Security Requirements
SC-API-02, SC-VAL-02, SC-TEN-04, SC-TEN-08, SC-AUD-01.

## Testing Requirements
TC-TXN-001…012; TI-028…TI-030, TI-035; ADV-011.

## Documentation Requirements
Business rules BR-TXN-* confirmed.

## Tasks
| # | Task | Name | Owner | Effort | Priority |
|---|---|---|---|---|---|
| 147 | S1-P18-T001 | Payment ledger service | Backend Engineer | 3d | Critical |
| 148 | S1-P18-T002 | Refunds and voids | Backend Engineer | 2d | Critical |
| 149 | S1-P18-T003 | Business day close | Backend Engineer | 2d | High |
| 150 | S1-P18-T004 | Transactions list loader | Backend Engineer | 1d | High |
| 151 | S1-P18-T005 | Transactions UI | Frontend Engineer | 3d | High |
| 152 | S1-P18-T006 | Payment panel in order detail | Frontend Engineer | 3d | Critical |
| 153 | S1-P18-T007 | Day close UI | Frontend Engineer | 2d | High |
| 154 | S1-P18-T008 | Receipt view and printing | Frontend Engineer | 2d | High |
| 155 | S1-P18-T009 | Transaction isolation and adversarial tests | QA Engineer | 1d | Critical |

## Risks
T-020 (insider refund/void fraud), R008 (financial data loss).

## Open Questions
Q-004 (receipt legal content), Q-015.

## Acceptance Criteria
- BA-20, BA-21, BA-24 closed.
- Day close totals exact; closed day immutable.

## Definition of Done
Common DoD.

## Planned Start
— (not scheduled; record actual start when the first task begins)

## Planned Finish
— (not scheduled; record actual finish when the last task completes)

## Owner
Backend Engineer; Frontend Engineer; QA Engineer. Accountable: Gopala Krishna (Project Owner)

## Exit Criteria
M09 transactions portion achieved.

# Phase 19 — Reports

## Objective
Exact, tenant-scoped, timezone-correct reports and a real operational dashboard.

## Business Outcome
Owners understand sales, menu performance and payments without spreadsheets.

## Technical Outcome
Report data layer, dashboard summary and polling route, reports UI, dashboard UI, performance indexes, removal of duplicate routes.

## Scope
Brief §32 and implementation brief §11.

## Non-Goals
Exports (Q-014), forecasting, cross-tenant analytics.

## Dependencies
P02 Database Foundation; P08 Design System + Frontend Foundation; P11 Daily Menu; P15 Kitchen Management; P16 Print Queue; P18 Transactions. Task-level: S1-P18-T003, S1-P02-T011, S1-P16-T005, S1-P11-T001, S1-P08-T007, S1-P08-T008, S1-P18-T005, S1-P15-T002.

## Database Changes
Report indexes if required.

## API Changes
LD-RPT-01…05, LD-DASH-01, RH-DASH-01.

## Frontend Changes
`/restaurant/reports`, `/restaurant/dashboard`; redirects for `/restaurant/analytics`, `/restaurant/billing`, `/restaurant/kds`.

## Design Changes
Accessible bar rows; KPI cards.

## Security Requirements
SC-TEN-08.

## Testing Requirements
TC-RPT-001…009, TC-DASH-001…004.

## Documentation Requirements
Query plans in `database/database.md`.

## Tasks
| # | Task | Name | Owner | Effort | Priority |
|---|---|---|---|---|---|
| 156 | S1-P19-T001 | Report aggregation data layer | Backend Engineer | 4d | Critical |
| 157 | S1-P19-T002 | Dashboard summary loader and polling route | Backend Engineer | 2d | High |
| 158 | S1-P19-T003 | Reports UI | Frontend Engineer | 4d | High |
| 159 | S1-P19-T004 | Dashboard UI | Frontend Engineer | 3d | High |
| 160 | S1-P19-T005 | Report performance and indexes | Database Engineer | 1d | Medium |
| 161 | S1-P19-T006 | Remove duplicate baseline reporting routes | Frontend Engineer | 1d | Low |

## Risks
R010 (performance), R001 (aggregation leak — tested).

## Open Questions
Q-014.

## Acceptance Criteria
- Reports exact to the paisa/cent on fixtures.
- Dashboard shows only real data.

## Definition of Done
Common DoD.

## Planned Start
— (not scheduled; record actual start when the first task begins)

## Planned Finish
— (not scheduled; record actual finish when the last task completes)

## Owner
Backend Engineer; Frontend Engineer; Database Engineer. Accountable: Gopala Krishna (Project Owner)

## Exit Criteria
M09 achieved.

# Phase 20 — Social Menu + Sharing

## Objective
Generated menu cards, shareable links, caption preparation and honest posting status.

## Business Outcome
Restaurants promote their menu on social media in minutes.

## Technical Outcome
Card image routes, social services, social UI, isolation tests.

## Scope
Brief §33 without automated publishing integrations (Q-012).

## Non-Goals
Meta/Instagram API publishing, scheduling posts, analytics.

## Dependencies
P04 Multi-Tenant Authorization; P08 Design System + Frontend Foundation; P09 Public Restaurant Website. Task-level: S1-P09-T006, S1-P04-T010, S1-P08-T006, S1-P08-T008.

## Database Changes
Uses SOCIAL_POST.

## API Changes
RH-PUB-02, LD-SOC-01, SA-SOC-01…05.

## Frontend Changes
`/restaurant/social`.

## Design Changes
Card layouts (4:5).

## Security Requirements
SC-PUB-01, SC-VAL-04, SC-AUD-01.

## Testing Requirements
TC-SOC-001…006; TI-053, TI-054.

## Documentation Requirements
Q-012 outcome.

## Tasks
| # | Task | Name | Owner | Effort | Priority |
|---|---|---|---|---|---|
| 162 | S1-P20-T001 | Menu card image generation | Backend Engineer | 3d | High |
| 163 | S1-P20-T002 | Social post services | Backend Engineer | 2d | High |
| 164 | S1-P20-T003 | Social UI | Frontend Engineer | 3d | Medium |
| 165 | S1-P20-T004 | Social isolation tests | QA Engineer | 1d | High |

## Risks
R009 (integration failure — avoided by manual model), T-010.

## Open Questions
Q-012.

## Acceptance Criteria
- No "Published successfully" message exists (BA-29 closed).
- Cards contain only public data.

## Definition of Done
Common DoD.

## Planned Start
— (not scheduled; record actual start when the first task begins)

## Planned Finish
— (not scheduled; record actual finish when the last task completes)

## Owner
Backend Engineer; Frontend Engineer; QA Engineer. Accountable: Gopala Krishna (Project Owner)

## Exit Criteria
M10 achieved.

# Phase 21 — PWA

## Objective
Valid manifest and icons, installability, a safe service worker with update handling, and honest offline behaviour.

## Business Outcome
Staff install the console on tablets and phones like an app.

## Technical Outcome
`app/manifest.ts`, icon set, service worker rewrite, update prompt, installability checks.

## Scope
Brief §34.

## Non-Goals
Offline order taking or offline kitchen operation (Q-027).

## Dependencies
P08 Design System + Frontend Foundation. Task-level: S1-P08-T003.

## Database Changes
None.

## API Changes
None.

## Frontend Changes
`/offline`; update toast.

## Design Changes
App icons.

## Security Requirements
SC-TEN-09 (no caching of authenticated responses).

## Testing Requirements
TC-PWA-001…005.

## Documentation Requirements
`operations/devices.md`.

## Tasks
| # | Task | Name | Owner | Effort | Priority |
|---|---|---|---|---|---|
| 166 | S1-P21-T001 | Web app manifest and icons | Frontend Engineer | 1d | High |
| 167 | S1-P21-T002 | Service worker rewrite | Frontend Engineer | 2d | High |
| 168 | S1-P21-T003 | Service worker update strategy | Frontend Engineer | 1d | Medium |
| 169 | S1-P21-T004 | Installability verification | QA Engineer | 1d | Medium |

## Risks
T-023 (cached data exposure on shared devices).

## Open Questions
Q-026, Q-027.

## Acceptance Criteria
- BA-36, BA-37 closed; installable on target devices.

## Definition of Done
Common DoD.

## Planned Start
— (not scheduled; record actual start when the first task begins)

## Planned Finish
— (not scheduled; record actual finish when the last task completes)

## Owner
Frontend Engineer; QA Engineer. Accountable: Gopala Krishna (Project Owner)

## Exit Criteria
M11 PWA portion achieved.

# Phase 22 — Timezone + Live Clock

## Objective
Restaurant-local live clock and verified timezone correctness across every display and date-dependent feature.

## Business Outcome
Every restaurant sees its own local time, regardless of server or device location.

## Technical Outcome
LiveClock, display sweep with static enforcement, timezone change safety, cross-timezone verification suite.

## Scope
Brief §35 (primitives delivered in S1-P02-T011).

## Non-Goals
Late-night business day cut-over (Future Scope).

## Dependencies
P07 Restaurant Management; P08 Design System + Frontend Foundation; P18 Transactions; P19 Reports; P23 Audit Logging. Task-level: S1-P08-T008, S1-P19-T003, S1-P18-T005, S1-P23-T002, S1-P07-T001, S1-P19-T001.

## Database Changes
None.

## API Changes
SA-RST-04 confirmation behaviour.

## Frontend Changes
Header and kitchen clock; all timestamp renderers.

## Design Changes
Zone labels.

## Security Requirements
None specific.

## Testing Requirements
TC-TZ-005…009.

## Documentation Requirements
architecture.md §7 confirmed.

## Tasks
| # | Task | Name | Owner | Effort | Priority |
|---|---|---|---|---|---|
| 170 | S1-P22-T001 | Restaurant live clock | Frontend Engineer | 1d | High |
| 174 | S1-P22-T002 | Timezone display sweep | Frontend Engineer | 2d | High |
| 171 | S1-P22-T003 | Timezone change safety | Backend Engineer | 1d | Medium |
| 175 | S1-P22-T004 | Cross-timezone verification suite | QA Engineer | 2d | High |

## Risks
R013 (docs drift), DST edge defects.

## Open Questions
Q-005.

## Acceptance Criteria
- BA-32 closed; static check forbids timezone-less formatting.

## Definition of Done
Common DoD.

## Planned Start
— (not scheduled; record actual start when the first task begins)

## Planned Finish
— (not scheduled; record actual finish when the last task completes)

## Owner
Frontend Engineer; Backend Engineer; QA Engineer. Accountable: Gopala Krishna (Project Owner)

## Exit Criteria
M11 achieved together with P21.

# Phase 23 — Audit Logging

## Objective
Proven audit coverage for every catalogued action, a tenant audit viewer, trustworthy request metadata and volume validation.

## Business Outcome
Owners can answer "who changed this, when, and what was it before?"

## Technical Outcome
Coverage test, tenant audit viewer, request metadata capture, volume test.

## Scope
Brief §36 (writer delivered in S1-P04-T010; platform viewer in S1-P06-T007).

## Non-Goals
SIEM integration; audit export (Q-014).

## Dependencies
P04 Multi-Tenant Authorization; P06 Super Admin; P07 Restaurant Management; P08 Design System + Frontend Foundation; P16 Print Queue; P18 Transactions; P20 Social Menu + Sharing. Task-level: S1-P20-T002, S1-P18-T003, S1-P16-T005, S1-P07-T004, S1-P06-T001, S1-P08-T007, S1-P08-T008, S1-P04-T010.

## Database Changes
Audit indexes verified.

## API Changes
LD-AUD-01.

## Frontend Changes
`/restaurant/audit`.

## Design Changes
Diff view with text markers.

## Security Requirements
SC-AUD-01, SC-AUD-05, SC-LOG-01.

## Testing Requirements
TC-AUDIT-001, TC-AUDIT-005…008.

## Documentation Requirements
security.md §7 catalogue kept exact.

## Tasks
| # | Task | Name | Owner | Effort | Priority |
|---|---|---|---|---|---|
| 172 | S1-P23-T001 | Audit coverage verification | Security Engineer | 3d | Critical |
| 173 | S1-P23-T002 | Tenant audit log viewer | Frontend Engineer | 3d | High |
| 176 | S1-P23-T003 | Request metadata capture | Backend Engineer | 1d | Medium |
| 177 | S1-P23-T004 | Audit volume and retention review | Database Engineer | 1d | Low |

## Risks
T-021 (audit tampering — trigger), R012.

## Open Questions
Q-024 (retention).

## Acceptance Criteria
- 100% catalogue coverage; BA-23 closed.

## Definition of Done
Common DoD.

## Planned Start
— (not scheduled; record actual start when the first task begins)

## Planned Finish
— (not scheduled; record actual finish when the last task completes)

## Owner
Security Engineer; Frontend Engineer; Backend Engineer; Database Engineer. Accountable: Gopala Krishna (Project Owner)

## Exit Criteria
M12 audit portion achieved.

# Phase 24 — Security Hardening

## Objective
Headers and CSP, CSRF/CORS verification, rate limit application, injection and XSS review, size limits, dependency and secret hygiene, projection audit, adversarial suite and threat model sign-off.

## Business Outcome
The platform withstands deliberate attempts to break tenant boundaries, roles and money rules.

## Technical Outcome
Enforced CSP, verified CSRF protections, complete ADV-001…ADV-030 suite, threat register fully verified.

## Scope
Brief §38, §39, §42.

## Non-Goals
External penetration test engagement (recommended post-launch; not in scope unless approved).

## Dependencies
P01 Project Foundation; P03 Authentication; P04 Multi-Tenant Authorization; P08 Design System + Frontend Foundation; P12 Orders; P16 Print Queue; P19 Reports; P23 Audit Logging. Task-level: S1-P08-T002, S1-P04-T002, S1-P03-T007, S1-P16-T005, S1-P16-T002, S1-P12-T006, S1-P01-T006, S1-P19-T002, S1-P16-T008, S1-P23-T001.

## Database Changes
None.

## API Changes
Size limits and rate limit policies across endpoints.

## Frontend Changes
CSP nonce propagation; 429 messaging.

## Design Changes
None.

## Security Requirements
SC-HDR-01…03, SC-CSRF-01…03, SC-RL-01, SC-RL-02, SC-VAL-03, SC-VAL-05, SC-API-04, SC-API-05, SC-DEP-01…03, SC-SEC-02.

## Testing Requirements
TC-SEC-004, 008…012, 014, 015, 019…023; ADV-001…ADV-030.

## Documentation Requirements
threat-model.md statuses; risks.md updates.

## Tasks
| # | Task | Name | Owner | Effort | Priority |
|---|---|---|---|---|---|
| 178 | S1-P24-T001 | Security headers and Content-Security-Policy | Security Engineer | 2d | Critical |
| 179 | S1-P24-T002 | CSRF and CORS verification | Security Engineer | 1d | High |
| 180 | S1-P24-T003 | Rate limit application and tuning | Security Engineer | 1d | High |
| 181 | S1-P24-T004 | Injection and XSS hardening review | Security Engineer | 2d | High |
| 182 | S1-P24-T005 | Request size and pagination limits | Security Engineer | 1d | Medium |
| 183 | S1-P24-T006 | Dependency and secret hygiene review | Security Engineer | 1d | High |
| 184 | S1-P24-T007 | Response projection audit | Security Engineer | 1d | High |
| 185 | S1-P24-T008 | Adversarial test suite completion | Security Engineer | 3d | Critical |
| 186 | S1-P24-T009 | Threat model verification and sign-off | Security Engineer | 2d | Critical |

## Risks
R001, R002, R006, R012.

## Open Questions
None blocking.

## Acceptance Criteria
- Every threat VERIFIED or ACCEPTED; adversarial suite required in CI.

## Definition of Done
Common DoD.

## Planned Start
— (not scheduled; record actual start when the first task begins)

## Planned Finish
— (not scheduled; record actual finish when the last task completes)

## Owner
Security Engineer. Accountable: Gopala Krishna (Project Owner)

## Exit Criteria
M12 security portion achieved.

# Phase 25 — Testing + QA

## Objective
Complete isolation and RBAC suites, end-to-end journeys, accessibility, responsive, regression, performance, database inventory, physical printing, visual QA, design consistency and owner UAT.

## Business Outcome
Evidence that the product works, is accessible, is secure and looks right, before any real restaurant uses it.

## Technical Outcome
TI-001…TI-062 and TC-RBAC-101…150 fully green; UJ-01…UJ-14 automated; VQA/DCA records; UAT sign-off.

## Scope
Brief §40–§42; implementation brief §52–§56.

## Non-Goals
Writing new features; external certification.

## Dependencies
P02 Database Foundation; P05 RBAC; P06 Super Admin; P07 Restaurant Management; P10 Menu Management; P13 Customers; P14 KOT; P17 Local Print Agent; P18 Transactions; P19 Reports; P20 Social Menu + Sharing; P21 PWA; P23 Audit Logging; P27 Railway Deployment. Task-level: S1-P23-T001, S1-P20-T004, S1-P18-T009, S1-P13-T005, S1-P14-T006, S1-P10-T008, S1-P05-T002, S1-P19-T004, S1-P20-T003, S1-P17-T008, S1-P21-T003, S1-P07-T006, S1-P06-T006, S1-P27-T003, S1-P02-T009, S1-P17-T009.

## Database Changes
None.

## API Changes
None.

## Frontend Changes
Visual QA fixes.

## Design Changes
Consistency fixes only.

## Security Requirements
SC-TEN-10, SC-RBAC-01, SC-DB-03.

## Testing Requirements
TC-QA-004…016.

## Documentation Requirements
testing.md results sections; acceptance.md evidence.

## Tasks
| # | Task | Name | Owner | Effort | Priority |
|---|---|---|---|---|---|
| 187 | S1-P25-T001 | Tenant isolation suite completion | QA Engineer | 4d | Critical |
| 188 | S1-P25-T002 | RBAC matrix completion | QA Engineer | 2d | Critical |
| 189 | S1-P25-T003 | End-to-end journeys | QA Engineer | 5d | Critical |
| 190 | S1-P25-T004 | Accessibility audit | QA Engineer | 3d | High |
| 191 | S1-P25-T005 | Responsive QA | QA Engineer | 2d | High |
| 192 | S1-P25-T006 | Regression suite gating | QA Engineer | 1d | High |
| 209 | S1-P25-T007 | Load and performance test | QA Engineer | 3d | High |
| 193 | S1-P25-T008 | Database test inventory review | QA Engineer | 1d | Medium |
| 194 | S1-P25-T009 | Physical printing QA | QA Engineer | 2d | High |
| 195 | S1-P25-T010 | Visual QA pass | Frontend Engineer | 4d | High |
| 196 | S1-P25-T011 | Design consistency audit | Frontend Engineer | 1d | High |
| 197 | S1-P25-T012 | User acceptance testing with Project Owner | Gopala Krishna (Project Owner) | 3d | Critical |

## Risks
R012 (insufficient testing), R010 (performance).

## Open Questions
Q-026.

## Acceptance Criteria
- All required suites green without skips; UAT signed.

## Definition of Done
Common DoD.

## Planned Start
— (not scheduled; record actual start when the first task begins)

## Planned Finish
— (not scheduled; record actual finish when the last task completes)

## Owner
QA Engineer; Frontend Engineer; Gopala Krishna (Project Owner). Accountable: Gopala Krishna (Project Owner)

## Exit Criteria
M12 achieved together with P23, P24, P26.

# Phase 26 — Observability

## Objective
Request correlation, redaction, health/readiness, security events, maintenance job monitoring, error capture, print/agent monitoring and database monitoring.

## Business Outcome
Problems are detected and diagnosed quickly without exposing personal data.

## Technical Outcome
AsyncLocalStorage context, access logs, `/api/health`, `/api/ready`, event catalogue, maintenance script, monitoring checks.

## Scope
Brief §44.

## Non-Goals
Third-party APM unless Q-018 approves.

## Dependencies
P02 Database Foundation; P03 Authentication; P16 Print Queue. Task-level: S1-P03-T002, S1-P02-T005, S1-P03-T007, S1-P16-T005.

## Database Changes
None.

## API Changes
RH-OPS-01, RH-OPS-02; internal client error reporting.

## Frontend Changes
Error states show request id.

## Design Changes
None.

## Security Requirements
SC-LOG-01…04, SC-PII-03, SC-API-01.

## Testing Requirements
TC-OBS-001…008.

## Documentation Requirements
`operations/monitoring.md` log schema, event catalogue, thresholds.

## Tasks
| # | Task | Name | Owner | Effort | Priority |
|---|---|---|---|---|---|
| 198 | S1-P26-T001 | Request correlation and structured request logs | Backend Engineer | 2d | High |
| 199 | S1-P26-T002 | Log redaction and PII masking | Security Engineer | 1d | High |
| 200 | S1-P26-T003 | Health and readiness endpoints | Backend Engineer | 1d | Critical |
| 201 | S1-P26-T004 | Security event logging | Security Engineer | 1d | High |
| 202 | S1-P26-T005 | Maintenance job for rate-limit buckets | DevOps Engineer | 1d | Medium |
| 203 | S1-P26-T006 | Error capture | Backend Engineer | 1d | High |
| 204 | S1-P26-T007 | Print queue and agent monitoring | Backend Engineer | 2d | High |
| 205 | S1-P26-T008 | Database monitoring | Database Engineer | 1d | Medium |

## Risks
R010, R004.

## Open Questions
Q-018.

## Acceptance Criteria
- Every request traceable; no secrets or unmasked PII in logs; health checks drive Railway.

## Definition of Done
Common DoD.

## Planned Start
— (not scheduled; record actual start when the first task begins)

## Planned Finish
— (not scheduled; record actual finish when the last task completes)

## Owner
Backend Engineer; Security Engineer; DevOps Engineer; Database Engineer. Accountable: Gopala Krishna (Project Owner)

## Exit Criteria
M12 observability portion achieved.

# Phase 27 — Railway Deployment

## Objective
Production environment, database security, release pipeline, secrets inventory, Clerk production, backups, rollback, smoke tests and runbooks.

## Business Outcome
The platform can be deployed, recovered and rolled back safely.

## Technical Outcome
Railway production, release workflow with approval and pre-migration backup, verified restore and rollback, smoke suite.

## Scope
Brief §43.

## Non-Goals
Multi-region, autoscaling policies beyond Railway defaults.

## Dependencies
P01 Project Foundation; P02 Database Foundation; P03 Authentication; P09 Public Restaurant Website; P25 Testing + QA. Task-level: S1-P01-T008, S1-P09-T001, S1-P02-T009, S1-P03-T008, S1-P25-T003.

## Database Changes
Production database provisioning; roles if supported.

## API Changes
None.

## Frontend Changes
None.

## Design Changes
None.

## Security Requirements
SC-DB-01, SC-DB-02, SC-BAK-01, SC-BAK-02, SC-SEC-01…03, SC-AUTH-01, SC-SESS-01, SC-WH-01.

## Testing Requirements
TC-OPS-002…009, TC-QA-006.

## Documentation Requirements
deployment.md, `operations/railway.md`, `operations/backups.md`, `operations/deployment.md`.

## Tasks
| # | Task | Name | Owner | Effort | Priority |
|---|---|---|---|---|---|
| 206 | S1-P27-T001 | Production Railway environment | DevOps Engineer | 2d | Critical |
| 207 | S1-P27-T002 | Database credentials, TLS and roles | Database Engineer | 1d | High |
| 208 | S1-P27-T003 | Release pipeline | DevOps Engineer | 3d | Critical |
| 210 | S1-P27-T004 | Environment variable and secret inventory | DevOps Engineer | 1d | High |
| 211 | S1-P27-T005 | Clerk production configuration | Backend Engineer | 1d | Critical |
| 212 | S1-P27-T006 | Backups and restore drill | Database Engineer | 2d | Critical |
| 213 | S1-P27-T007 | Rollback rehearsal | DevOps Engineer | 1d | Critical |
| 214 | S1-P27-T008 | Production smoke test suite | QA Engineer | 2d | Critical |
| 215 | S1-P27-T009 | Deployment runbooks | DevOps Engineer | 1d | High |

## Risks
R007 (deployment failure), R008 (data loss), R003 (migration failure).

## Open Questions
Q-013 (domain), Q-025 (backups).

## Acceptance Criteria
- DEP-CHK-01…13 recorded; restore and rollback rehearsed.

## Definition of Done
Common DoD.

## Planned Start
— (not scheduled; record actual start when the first task begins)

## Planned Finish
— (not scheduled; record actual finish when the last task completes)

## Owner
DevOps Engineer; Database Engineer; Backend Engineer; QA Engineer. Accountable: Gopala Krishna (Project Owner)

## Exit Criteria
M13 deployment portion achieved.

# Phase 28 — Production Readiness

## Objective
Release gate evidence, performance tuning, security sign-off, Knowledge Base synchronisation, incident runbooks, first tenant plan and the Go/No-Go decision.

## Business Outcome
A deliberate, evidence-based decision to launch.

## Technical Outcome
Completed acceptance.md gates, consistency scan script, rehearsed runbooks.

## Scope
Everything required by acceptance.md before launch.

## Non-Goals
New features.

## Dependencies
P24 Security Hardening; P25 Testing + QA; P27 Railway Deployment. Task-level: S1-P25-T012, S1-P24-T009, S1-P27-T008, S1-P25-T007, S1-P27-T004, S1-P27-T009, S1-P27-T005.

## Database Changes
Index tuning if required.

## API Changes
None expected.

## Frontend Changes
None expected.

## Design Changes
None.

## Security Requirements
SC-SEC-03, SC-RL-01.

## Testing Requirements
TC-REL-001…006.

## Documentation Requirements
All KB files synchronised with code; incident response and onboarding runbooks.

## Tasks
| # | Task | Name | Owner | Effort | Priority |
|---|---|---|---|---|---|
| 216 | S1-P28-T001 | Release gate evidence review | QA Engineer | 2d | Critical |
| 217 | S1-P28-T002 | Performance tuning to targets | Backend Engineer | 2d | High |
| 218 | S1-P28-T003 | Security sign-off and secret rotation drill | Security Engineer | 2d | Critical |
| 219 | S1-P28-T004 | Knowledge Base synchronisation and consistency scan | Backend Engineer | 2d | High |
| 220 | S1-P28-T005 | Incident response and support runbooks | DevOps Engineer | 1d | High |
| 221 | S1-P28-T006 | First tenant onboarding plan | Gopala Krishna (Project Owner) | 2d | High |
| 222 | S1-P28-T007 | Go / No-Go decision | Gopala Krishna (Project Owner) | 1d | Critical |

## Risks
R013, R011, R016.

## Open Questions
Any remaining OPEN questions must be ANSWERED or explicitly deferred.

## Acceptance Criteria
- All gates PASS; Go decision recorded.

## Definition of Done
Common DoD.

## Planned Start
— (not scheduled; record actual start when the first task begins)

## Planned Finish
— (not scheduled; record actual finish when the last task completes)

## Owner
QA Engineer; Backend Engineer; Security Engineer; DevOps Engineer; Gopala Krishna (Project Owner). Accountable: Gopala Krishna (Project Owner)

## Exit Criteria
M13 achieved.

# Phase 29 — Final Release

## Objective
Deploy to production, take the first restaurant live, run hypercare, update knowledge and obtain final acceptance.

## Business Outcome
The first restaurant runs real service on the platform.

## Technical Outcome
Production release record, go-live checklist, hypercare log, synchronised KB.

## Scope
Launch and stabilisation.

## Non-Goals
Onboarding additional tenants beyond the first (continues after SLICE-01).

## Dependencies
P28 Production Readiness. Task-level: S1-P28-T007.

## Database Changes
Production migrations.

## API Changes
None.

## Frontend Changes
None.

## Design Changes
None.

## Security Requirements
SC-BAK-02, SC-LOG-03.

## Testing Requirements
TC-REL-007…010.

## Documentation Requirements
Final task statuses, CHANGELOG, known issues, global Knowledge Base project entry.

## Tasks
| # | Task | Name | Owner | Effort | Priority |
|---|---|---|---|---|---|
| 223 | S1-P29-T001 | Production deployment | DevOps Engineer | 1d | Critical |
| 224 | S1-P29-T002 | First tenant go-live | Gopala Krishna (Project Owner) | 2d | Critical |
| 225 | S1-P29-T003 | Hypercare | Backend Engineer | 5d | High |
| 226 | S1-P29-T004 | Post-release Knowledge Base update | Backend Engineer | 1d | High |
| 227 | S1-P29-T005 | Project Owner final acceptance | Gopala Krishna (Project Owner) | 1d | Critical |

## Risks
R007, R004, R015.

## Open Questions
None.

## Acceptance Criteria
- First tenant live; no open Critical issues after hypercare; owner sign-off.

## Definition of Done
Common DoD plus acceptance.md Definition of Done fully checked.

## Planned Start
— (not scheduled; record actual start when the first task begins)

## Planned Finish
— (not scheduled; record actual finish when the last task completes)

## Owner
DevOps Engineer; Gopala Krishna (Project Owner); Backend Engineer. Accountable: Gopala Krishna (Project Owner)

## Exit Criteria
M14 achieved; SLICE-01 status COMPLETED.

