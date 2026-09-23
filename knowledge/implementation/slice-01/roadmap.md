---
title: "SLICE-01 Roadmap — Phase Order and Milestones"
document_type: "ROADMAP"
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
dependencies: ["tasks.md","dependencies.md"]
related_documents: ["slice-plan.md","tasks.md","dependencies.md","acceptance.md","risks.md"]
related_decisions: ["RASOIOS-ADR-005"]
---

# SLICE-01 Roadmap

This is the phase roadmap **inside one slice**. On 2026-09-15 the Project Owner decided that the plan is **not date-scheduled**: work proceeds in
the execution order of `tasks.md`, and dates are recorded as *actual* dates when phases and milestones really start and finish.
If the Project Owner sets target dates later, add them to the *Target* columns. Do not derive them from assumed team capacity.

- **Planning start:** 2026-09-15
- **Phases:** 29 · **Tasks:** 227 · **Estimated effort:** 461 ideal engineering days (sizing only)

## 1. Phases

| Phase | Name | Tasks | Effort (days) | Depends on phases | Owner roles | Target | Actual Start | Actual Finish | Status | Milestone |
|---|---|---|---|---|---|---|---|---|---|---|
| P01 | Project Foundation | 10 | 15 | — | Backend Engineer; QA Engineer; DevOps Engineer; Frontend Engineer; Gopala Krishna (Project Owner) | — | — | — | PLANNED | M01 |
| P02 | Database Foundation | 11 | 24 | P01 | Database Engineer; Backend Engineer; Security Engineer; QA Engineer | — | — | — | PLANNED | M01 |
| P03 | Authentication | 9 | 17 | P01, P02, P08 | Backend Engineer; Frontend Engineer; Security Engineer | — | — | — | PLANNED | M02 |
| P04 | Multi-Tenant Authorization | 10 | 21 | P02, P03, P08 | Backend Engineer; Security Engineer; QA Engineer | — | — | — | PLANNED | M02 |
| P05 | RBAC | 7 | 13 | P04 | Backend Engineer; QA Engineer; Frontend Engineer; Security Engineer | — | — | — | PLANNED | M03 |
| P06 | Super Admin | 8 | 17 | P02, P03, P04, P05, P08 | Backend Engineer; Frontend Engineer | — | — | — | PLANNED | M03 |
| P07 | Restaurant Management | 9 | 24 | P01, P02, P03, P04, P05, P08 | Backend Engineer; Security Engineer; Frontend Engineer; Gopala Krishna (Project Owner) | — | — | — | PLANNED | M04 |
| P08 | Design System + Frontend Foundation | 13 | 27 | P01, P05 | Frontend Engineer; QA Engineer | — | — | — | PLANNED | M04 |
| P09 | Public Restaurant Website | 10 | 18 | P01, P02, P04, P07, P08 | Gopala Krishna (Project Owner); Backend Engineer; Frontend Engineer; Security Engineer; QA Engineer | — | — | — | PLANNED | M04 |
| P10 | Menu Management | 8 | 21 | P02, P04, P08 | Backend Engineer; Frontend Engineer; QA Engineer | — | — | — | PLANNED | M05 |
| P11 | Daily Menu | 5 | 10 | P02, P08, P09, P10 | Backend Engineer; Frontend Engineer; QA Engineer | — | — | — | PLANNED | M05 |
| P12 | Orders | 11 | 29 | P01, P02, P04, P05, P08, P10 | Gopala Krishna (Project Owner); Backend Engineer; Database Engineer; Frontend Engineer; QA Engineer | — | — | — | PLANNED | M06 |
| P13 | Customers | 5 | 9 | P04, P08, P12 | Backend Engineer; Frontend Engineer; QA Engineer | — | — | — | PLANNED | M06 |
| P14 | KOT | 6 | 10 | P12 | Backend Engineer; Frontend Engineer; QA Engineer | — | — | — | PLANNED | M07 |
| P15 | Kitchen Management | 5 | 10 | P05, P08, P12, P14 | Backend Engineer; Frontend Engineer; QA Engineer | — | — | — | PLANNED | M07 |
| P16 | Print Queue | 9 | 21 | P02, P03, P04, P08, P14, P15 | Backend Engineer; Frontend Engineer; Security Engineer | — | — | — | PLANNED | M08 |
| P17 | Local Print Agent | 10 | 22 | P01, P16 | Gopala Krishna (Project Owner); Backend Engineer; QA Engineer; DevOps Engineer; Security Engineer | — | — | — | PLANNED | M08 |
| P18 | Transactions | 9 | 19 | P04, P08, P12, P16 | Backend Engineer; Frontend Engineer; QA Engineer | — | — | — | PLANNED | M09 |
| P19 | Reports | 6 | 15 | P02, P08, P11, P15, P16, P18 | Backend Engineer; Frontend Engineer; Database Engineer | — | — | — | PLANNED | M09 |
| P20 | Social Menu + Sharing | 4 | 9 | P04, P08, P09 | Backend Engineer; Frontend Engineer; QA Engineer | — | — | — | PLANNED | M10 |
| P21 | PWA | 4 | 5 | P08 | Frontend Engineer; QA Engineer | — | — | — | PLANNED | M11 |
| P22 | Timezone + Live Clock | 4 | 6 | P07, P08, P18, P19, P23 | Frontend Engineer; Backend Engineer; QA Engineer | — | — | — | PLANNED | M11 |
| P23 | Audit Logging | 4 | 8 | P04, P06, P07, P08, P16, P18, P20 | Security Engineer; Frontend Engineer; Backend Engineer; Database Engineer | — | — | — | PLANNED | M12 |
| P24 | Security Hardening | 9 | 14 | P01, P03, P04, P08, P12, P16, P19, P23 | Security Engineer | — | — | — | PLANNED | M12 |
| P25 | Testing + QA | 12 | 31 | P02, P05, P06, P07, P10, P13, P14, P17, P18, P19, P20, P21, P23, P27 | QA Engineer; Frontend Engineer; Gopala Krishna (Project Owner) | — | — | — | PLANNED | M12 |
| P26 | Observability | 8 | 10 | P02, P03, P16 | Backend Engineer; Security Engineer; DevOps Engineer; Database Engineer | — | — | — | PLANNED | M12 |
| P27 | Railway Deployment | 9 | 14 | P01, P02, P03, P09, P25 | DevOps Engineer; Database Engineer; Backend Engineer; QA Engineer | — | — | — | PLANNED | M13 |
| P28 | Production Readiness | 7 | 12 | P24, P25, P27 | QA Engineer; Backend Engineer; Security Engineer; DevOps Engineer; Gopala Krishna (Project Owner) | — | — | — | PLANNED | M13 |
| P29 | Final Release | 5 | 10 | P28 | DevOps Engineer; Gopala Krishna (Project Owner); Backend Engineer | — | — | — | PLANNED | M14 |

Phases interleave: the design system (P08) is built in parallel with the backend of P02–P05 because feature screens need it,
and the Project Owner's decision gates sit immediately before the work they unblock (see `dependencies.md` §4).

## 2. Milestones

| ID | Milestone | Reached when | Depends on milestones | Owner | Target | Actual | Status |
|---|---|---|---|---|---|---|---|
| M01 | Foundation Ready | P01, P02 complete | — | Backend Engineer (UNASSIGNED) — accountable: Gopala Krishna | — | — | PLANNED |
| M02 | Authentication + Tenant Isolation Ready | P03, P04 complete | M01 | Backend Engineer (UNASSIGNED) — accountable: Gopala Krishna | — | — | PLANNED |
| M03 | RBAC + Super Admin Ready | P05, P06 complete | M02 | Backend Engineer (UNASSIGNED) — accountable: Gopala Krishna | — | — | PLANNED |
| M04 | Restaurant + Website Ready | P07, P08, P09 complete | M03 | Frontend Engineer (UNASSIGNED) — accountable: Gopala Krishna | — | — | PLANNED |
| M05 | Menu Ready | P10, P11 complete | M04 | Backend Engineer (UNASSIGNED) — accountable: Gopala Krishna | — | — | PLANNED |
| M06 | Orders + Customers Ready | P12, P13 complete | M05 | Backend Engineer (UNASSIGNED) — accountable: Gopala Krishna | — | — | PLANNED |
| M07 | KOT + Kitchen Ready | P14, P15 complete | M06 | Backend Engineer (UNASSIGNED) — accountable: Gopala Krishna | — | — | PLANNED |
| M08 | Printing Ready | P16, P17 complete | M07 | Backend Engineer (UNASSIGNED) — accountable: Gopala Krishna | — | — | PLANNED |
| M09 | Transactions + Reports Ready | P18, P19 complete | M06 | Backend Engineer (UNASSIGNED) — accountable: Gopala Krishna | — | — | PLANNED |
| M10 | Social Menu Ready | P20 complete | M04, M05 | Backend Engineer (UNASSIGNED) — accountable: Gopala Krishna | — | — | PLANNED |
| M11 | PWA + Timezone Ready | P21, P22 complete | M09 | Frontend Engineer (UNASSIGNED) — accountable: Gopala Krishna | — | — | PLANNED |
| M12 | Security + QA Ready | P23, P24, P25, P26 complete | M08, M09, M10, M11 | Security Engineer and QA Engineer (UNASSIGNED) — accountable: Gopala Krishna | — | — | PLANNED |
| M13 | Production Ready | P27, P28 complete | M12 | DevOps Engineer (UNASSIGNED) — accountable: Gopala Krishna | — | — | PLANNED |
| M14 | Production Launch | P29 complete | M13 | Gopala Krishna (Project Owner) | — | — | PLANNED |

### M01 — Foundation Ready

- **Reached when:** all tasks of P01, P02 are COMPLETED (or NOT_APPLICABLE with decision reference)
- **Dependencies:** none
- **Owner:** Backend Engineer (UNASSIGNED) — accountable: Gopala Krishna
- **Deliverables:**
  - CI with lint, typecheck, unit, static, integration (real PostgreSQL), e2e, build, audit
  - Railway staging auto-deploying main
  - Prisma schema v2 and migration 0001_init with constraints and audit trigger
  - Two-tenant seed, integration harness, money and time libraries
  - Decision gate A recorded
- **Acceptance criteria:**
  - TC-DB-001…010, TC-TENANT-002, TC-QA-001 pass
  - No fabricated UI indicators remain (TC-FOUND-007)
  - ADR-006…011 no longer PROPOSED
- **Release gate:** G01 Architecture approval, G02 Database validation
- **Target date:** — · **Actual date:** —

### M02 — Authentication + Tenant Isolation Ready

- **Reached when:** all tasks of P03, P04 are COMPLETED (or NOT_APPLICABLE with decision reference)
- **Dependencies:** M01
- **Owner:** Backend Engineer (UNASSIGNED) — accountable: Gopala Krishna
- **Deliverables:**
  - Fail-closed Clerk Email OTP with invite-only linking
  - Tenant/platform context, guards, 404 parity, strict validation
  - Critical baseline leaks BA-01…BA-03 closed
  - Isolation test harness, audit writer
- **Acceptance criteria:**
  - TC-AUTH-001…018 and TC-TENANT-001…006 pass
  - TC-SEC-018 passes
  - No endpoint accepts a tenant identifier (TC-TENANT-006)
- **Release gate:** G03 Authentication validation, G04 Tenant isolation (partial)
- **Target date:** — · **Actual date:** —

### M03 — RBAC + Super Admin Ready

- **Reached when:** all tasks of P05, P06 are COMPLETED (or NOT_APPLICABLE with decision reference)
- **Dependencies:** M02
- **Owner:** Backend Engineer (UNASSIGNED) — accountable: Gopala Krishna
- **Deliverables:**
  - Permission catalogue v2 and matrix driver
  - Role hierarchy, transition authorization, projections, capability map
  - Super Admin console with tenant lifecycle and platform audit
- **Acceptance criteria:**
  - Matrix drift test passes; RBAC review has no open High/Critical
  - TC-ADMIN-001…012 pass
- **Release gate:** G05 RBAC security (partial)
- **Target date:** — · **Actual date:** —

### M04 — Restaurant + Website Ready

- **Reached when:** all tasks of P07, P08, P09 are COMPLETED (or NOT_APPLICABLE with decision reference)
- **Dependencies:** M03
- **Owner:** Frontend Engineer (UNASSIGNED) — accountable: Gopala Krishna
- **Deliverables:**
  - Restaurant settings, staff management, website settings
  - Design system and shells
  - Public restaurant website with SEO and response-shape guard
- **Acceptance criteria:**
  - TC-REST-*, TC-STAFF-*, TC-DS-*, TC-WEB-* pass
  - Public site shows real data only (BA-27, BA-28 closed)
- **Release gate:** G08 Accessibility (partial)
- **Target date:** — · **Actual date:** —

### M05 — Menu Ready

- **Reached when:** all tasks of P10, P11 are COMPLETED (or NOT_APPLICABLE with decision reference)
- **Dependencies:** M04
- **Owner:** Backend Engineer (UNASSIGNED) — accountable: Gopala Krishna
- **Deliverables:**
  - Menu categories, items, variants, add-ons
  - Daily menu editor with publishing and scheduling
- **Acceptance criteria:**
  - TC-MENU-001…017, TC-DMENU-001…008, TC-TZ-003 pass
  - TI-001…TI-013 pass
- **Release gate:** G06 Core workflow (partial)
- **Target date:** — · **Actual date:** —

### M06 — Orders + Customers Ready

- **Reached when:** all tasks of P12, P13 are COMPLETED (or NOT_APPLICABLE with decision reference)
- **Dependencies:** M05
- **Owner:** Backend Engineer (UNASSIGNED) — accountable: Gopala Krishna
- **Deliverables:**
  - Pricing engine, numbering, order creation and lifecycle
  - POS order entry, order board, order detail
  - Customers and POS lookup
- **Acceptance criteria:**
  - TC-ORDER-001…019, TC-CUST-001…010 pass
  - ADV-007, ADV-008, ADV-010 pass
- **Release gate:** G06 Core workflow (partial)
- **Target date:** — · **Actual date:** —

### M07 — KOT + Kitchen Ready

- **Reached when:** all tasks of P14, P15 are COMPLETED (or NOT_APPLICABLE with decision reference)
- **Dependencies:** M06
- **Owner:** Backend Engineer (UNASSIGNED) — accountable: Gopala Krishna
- **Deliverables:**
  - Idempotent KOT generation and status progression
  - Kitchen board with sections, timers, priority
- **Acceptance criteria:**
  - TC-KOT-001…010, TC-KITCH-001…009 pass
  - New KOT visible within 5 s
- **Release gate:** G06 Core workflow
- **Target date:** — · **Actual date:** —

### M08 — Printing Ready

- **Reached when:** all tasks of P16, P17 are COMPLETED (or NOT_APPLICABLE with decision reference)
- **Dependencies:** M07
- **Owner:** Backend Engineer (UNASSIGNED) — accountable: Gopala Krishna
- **Deliverables:**
  - Cloud print queue, agent API, printing console
  - Local print agent with ESC/POS, installer and guide
- **Acceptance criteria:**
  - TC-PRINT-001…016, TC-AGENT-001…016 pass
  - Physical USB and LAN printers verified
- **Release gate:** G07 Printing
- **Target date:** — · **Actual date:** —

### M09 — Transactions + Reports Ready

- **Reached when:** all tasks of P18, P19 are COMPLETED (or NOT_APPLICABLE with decision reference)
- **Dependencies:** M06
- **Owner:** Backend Engineer (UNASSIGNED) — accountable: Gopala Krishna
- **Deliverables:**
  - Payment ledger, refunds, voids, day close, receipts
  - Reports and operational dashboard
- **Acceptance criteria:**
  - TC-TXN-001…012, TC-RPT-001…009, TC-DASH-001…004 pass
- **Release gate:** G06 Core workflow
- **Target date:** — · **Actual date:** —

### M10 — Social Menu Ready

- **Reached when:** all tasks of P20 are COMPLETED (or NOT_APPLICABLE with decision reference)
- **Dependencies:** M04, M05
- **Owner:** Backend Engineer (UNASSIGNED) — accountable: Gopala Krishna
- **Deliverables:**
  - Menu card images, share links, honest posting workflow
- **Acceptance criteria:**
  - TC-SOC-001…006 pass; no 'Published successfully' copy exists
- **Release gate:** —
- **Target date:** — · **Actual date:** —

### M11 — PWA + Timezone Ready

- **Reached when:** all tasks of P21, P22 are COMPLETED (or NOT_APPLICABLE with decision reference)
- **Dependencies:** M09
- **Owner:** Frontend Engineer (UNASSIGNED) — accountable: Gopala Krishna
- **Deliverables:**
  - Manifest, icons, safe service worker, update prompt
  - Restaurant live clock and timezone-correct displays
- **Acceptance criteria:**
  - TC-PWA-001…005, TC-TZ-005…009 pass
- **Release gate:** —
- **Target date:** — · **Actual date:** —

### M12 — Security + QA Ready

- **Reached when:** all tasks of P23, P24, P25, P26 are COMPLETED (or NOT_APPLICABLE with decision reference)
- **Dependencies:** M08, M09, M10, M11
- **Owner:** Security Engineer and QA Engineer (UNASSIGNED) — accountable: Gopala Krishna
- **Deliverables:**
  - Audit coverage and viewers
  - Security hardening and adversarial suite
  - Complete isolation, RBAC, E2E, accessibility, responsive, performance, visual QA; UAT
  - Observability
- **Acceptance criteria:**
  - TI-001…TI-062, ADV-001…ADV-030, TC-RBAC-101…150 all pass without skips
  - Threat register all VERIFIED/ACCEPTED
  - UAT signed
- **Release gate:** G04, G05, G07, G08, G09, G11, G12, G14
- **Target date:** — · **Actual date:** —

### M13 — Production Ready

- **Reached when:** all tasks of P27, P28 are COMPLETED (or NOT_APPLICABLE with decision reference)
- **Dependencies:** M12
- **Owner:** DevOps Engineer (UNASSIGNED) — accountable: Gopala Krishna
- **Deliverables:**
  - Production Railway environment and release pipeline
  - Backups, rollback, runbooks, smoke tests
  - Release gate evidence and Go decision
- **Acceptance criteria:**
  - DEP-CHK-01…13 recorded
  - All release gates PASS; Go decision recorded
- **Release gate:** G10, G13, G15
- **Target date:** — · **Actual date:** —

### M14 — Production Launch

- **Reached when:** all tasks of P29 are COMPLETED (or NOT_APPLICABLE with decision reference)
- **Dependencies:** M13
- **Owner:** Gopala Krishna (Project Owner)
- **Deliverables:**
  - Production release
  - First tenant live
  - Hypercare log
  - Final acceptance
- **Acceptance criteria:**
  - TC-REL-007…010 recorded
  - Definition of Done in acceptance.md fully checked
- **Release gate:** All gates; Project Owner sign-off
- **Target date:** — · **Actual date:** —

## 3. Recording progress

- When the first task of a phase moves to IN_PROGRESS, record the phase *Actual Start*. When its last task completes, record *Actual Finish*.
- A milestone's *Actual* date is the date its last phase finishes and its acceptance criteria are verified.
- If scope changes through a decision gate (Q-001, Q-003, Q-009, Q-010), update the affected tasks to NOT_APPLICABLE or add tasks, and record the change here.
