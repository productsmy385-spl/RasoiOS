---
title: "SLICE-01 Master Task Register"
document_type: "TASK_REGISTER"
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
dependencies: ["slice-plan.md","dependencies.md"]
related_documents: ["slice-plan.md","roadmap.md","dependencies.md","traceability.md","testing.md"]
related_decisions: ["RASOIOS-ADR-005"]
---

# SLICE-01 Master Task Register

The complete engineering task list for **SLICE-01 — Complete Restaurant SaaS Platform**, in **execution order**.
This project is **not tracked in Linear** (Project Owner instruction, 2026-09-15). This file is the task system of record.

## How to use this register

- **Work in sequence order (#).** The sequence is a dependency-respecting order: a task never appears before a task it depends on. Tasks may run in parallel when their dependencies are complete.
- **No computed schedule.** Per Project Owner instruction (2026-09-15), planned dates are not forecast. *Planned Start/Finish* stay blank unless the Project Owner sets a target. *Actual Start/Finish* are filled in when work really starts and finishes, never back-filled.
- **Status values:** `PLANNED` → `IN_PROGRESS` → `COMPLETED`; also `BLOCKED` (with reason) and `NOT_APPLICABLE` (decision-gated tasks whose gate was declined, with the decision reference). Set `COMPLETED` **only** when every acceptance criterion is verified and the listed tests pass.
- **Effort** is a relative size estimate in ideal engineering days, useful for sizing, not a date commitment.
- **Baseline** records what already exists at commit `18941a9`, with [fact] evidence. Existing code is reused where correct and reworked where `baseline-audit.md` found defects.
- When a task completes, fill **Implementation notes** and **Affected files (actual)**.
- Test IDs are defined inside each task; the full catalogue is in `testing.md` §9.

All 227 original tasks start as **PLANNED**; 7 tasks (#228–#234) were added on 2026-09-23 for RASOIOS-ADR-012 and ADR-013 (tenant subdomains, Brand v2, tenant websites). Estimated total effort: 461 ideal engineering days.

## Execution order

| # | Task ID | Task | Phase | Owner | Effort | Priority | Depends on | Status |
|---|---|---|---|---|---|---|---|---|
| 1 | S1-P01-T001 | Verify and record the baseline scaffold | P01 | Backend Engineer | 1d | High | — | COMPLETED |
| 2 | S1-P01-T002 | Align npm scripts with CLAUDE.md commands | P01 | Backend Engineer | 1d | High | S1-P01-T001 | COMPLETED |
| 3 | S1-P01-T003 | Configure ESLint with security and money rules | P01 | Backend Engineer | 2d | High | S1-P01-T002 | COMPLETED |
| 4 | S1-P01-T004 | Validate environment configuration at startup | P01 | Backend Engineer | 1d | Critical | S1-P01-T002 | COMPLETED |
| 5 | S1-P01-T005 | Install and configure Playwright with accessibility tooling | P01 | QA Engineer | 2d | High | S1-P01-T002 | COMPLETED |
| 6 | S1-P01-T006 | Continuous integration pipeline and PR template | P01 | DevOps Engineer | 2d | High | S1-P01-T003, S1-P01-T005 | IN_PROGRESS |
| 7 | S1-P01-T007 | Remove fabricated indicators and demo fallbacks | P01 | Frontend Engineer | 1d | High | S1-P01-T001 | COMPLETED |
| 8 | S1-P01-T008 | Provision Railway staging environment | P01 | DevOps Engineer | 2d | High | S1-P01-T004 | BLOCKED |
| 9 | S1-P01-T009 | Developer setup guide | P01 | Backend Engineer | 1d | Medium | S1-P01-T002, S1-P01-T004 | IN_PROGRESS |
| 10 | S1-P01-T010 | Decision gate A: approve schema-affecting decisions | P01 | Gopala Krishna (Project Owner) | 2d | Critical | — | COMPLETED |
| 11 | S1-P02-T001 | Confirm PostgreSQL version and capabilities | P02 | Database Engineer | 1d | High | S1-P01-T008 | IN_PROGRESS |
| 12 | S1-P02-T002 | Author Prisma schema v2 | P02 | Database Engineer | 4d | Critical | S1-P01-T010, S1-P02-T001 | COMPLETED |
| 13 | S1-P02-T003 | Create migration baseline 0001_init with raw SQL constraints | P02 | Database Engineer | 3d | Critical | S1-P02-T002 | IN_PROGRESS |
| 14 | S1-P02-T004 | Verify composite foreign-key tenant integrity | P02 | Database Engineer | 1d | Critical | S1-P02-T003 | COMPLETED |
| 15 | S1-P02-T005 | Database client, data-access skeleton and statement timeout | P02 | Backend Engineer | 2d | Critical | S1-P02-T003 | COMPLETED |
| 16 | S1-P02-T006 | Static tenant-scope guard | P02 | Security Engineer | 2d | Critical | S1-P02-T005 | COMPLETED |
| 17 | S1-P02-T007 | Development seed with two isolated tenants | P02 | Backend Engineer | 3d | High | S1-P02-T003 | COMPLETED |
| 18 | S1-P02-T008 | Integration test harness with real PostgreSQL | P02 | QA Engineer | 3d | Critical | S1-P02-T003, S1-P01-T006 | IN_PROGRESS |
| 19 | S1-P02-T009 | Migration strategy and runbook | P02 | Database Engineer | 1d | High | S1-P02-T003 | IN_PROGRESS |
| 20 | S1-P02-T010 | Money primitives | P02 | Backend Engineer | 2d | Critical | S1-P02-T005 | COMPLETED |
| 21 | S1-P02-T011 | Time and business-date primitives | P02 | Backend Engineer | 2d | Critical | S1-P02-T005 | COMPLETED |
| 22 | S1-P03-T001 | Configure Clerk Email OTP instances | P03 | Backend Engineer | 1d | Critical | S1-P01-T004 | BLOCKED |
| 23 | S1-P03-T002 | Fail-closed middleware and protected route allowlist | P03 | Backend Engineer | 2d | Critical | S1-P03-T001 | COMPLETED |
| 24 | S1-P03-T003 | Session resolver and invited-user linking | P03 | Backend Engineer | 3d | Critical | S1-P03-T002, S1-P02-T005 | COMPLETED |
| 25 | S1-P03-T004 | Clerk administration client | P03 | Backend Engineer | 2d | High | S1-P03-T003 | COMPLETED |
| 26 | S1-P03-T007 | PostgreSQL rate limiter | P03 | Security Engineer | 2d | High | S1-P02-T005 | COMPLETED |
| 27 | S1-P03-T008 | Clerk webhook endpoint | P03 | Backend Engineer | 2d | Medium | S1-P03-T003, S1-P03-T007 | IN_PROGRESS |
| 28 | S1-P03-T009 | Authentication log redaction verification | P03 | Security Engineer | 1d | High | S1-P03-T003 | COMPLETED |
| 29 | S1-P04-T001 | Tenant and platform context resolution | P04 | Backend Engineer | 3d | Critical | S1-P03-T003 | COMPLETED |
| 30 | S1-P04-T002 | Authorization guards and guard coverage check | P04 | Security Engineer | 2d | Critical | S1-P04-T001 | COMPLETED |
| 31 | S1-P04-T004 | Suspended tenant and membership state enforcement | P04 | Backend Engineer | 1d | Critical | S1-P04-T001 | COMPLETED |
| 32 | S1-P04-T005 | Error model and not-found parity | P04 | Backend Engineer | 2d | Critical | S1-P04-T002 | COMPLETED |
| 33 | S1-P04-T006 | Strict input validation conventions | P04 | Security Engineer | 2d | Critical | S1-P04-T005 | COMPLETED |
| 34 | S1-P04-T007 | Retrofit baseline server actions to guards and data layer | P04 | Backend Engineer | 3d | Critical | S1-P04-T002, S1-P04-T006 | COMPLETED |
| 35 | S1-P04-T008 | Close critical baseline leaks | P04 | Security Engineer | 1d | Critical | S1-P04-T002, S1-P04-T005 | COMPLETED |
| 36 | S1-P04-T009 | Tenant isolation test framework | P04 | QA Engineer | 3d | Critical | S1-P02-T008, S1-P04-T007 | COMPLETED |
| 37 | S1-P04-T010 | Transactional audit writer and redaction | P04 | Backend Engineer | 2d | Critical | S1-P02-T005 | COMPLETED |
| 38 | S1-P05-T001 | Permission catalogue v2 | P05 | Backend Engineer | 2d | Critical | S1-P04-T001 | COMPLETED |
| 39 | S1-P05-T002 | RBAC matrix integration test driver | P05 | QA Engineer | 3d | Critical | S1-P05-T001, S1-P04-T009 | COMPLETED |
| 40 | S1-P05-T003 | Role hierarchy and staff rules | P05 | Backend Engineer | 2d | Critical | S1-P05-T001 | COMPLETED |
| 41 | S1-P05-T004 | Transition authorization table | P05 | Backend Engineer | 1d | High | S1-P05-T001 | COMPLETED |
| 42 | S1-P05-T005 | Role-based response projections | P05 | Backend Engineer | 2d | High | S1-P05-T001 | COMPLETED |
| 43 | S1-P05-T006 | UI capability map and navigation filtering | P05 | Frontend Engineer | 2d | High | S1-P05-T001, S1-P04-T001 | IN_PROGRESS |
| 44 | S1-P05-T007 | RBAC security review | P05 | Security Engineer | 1d | High | S1-P05-T002, S1-P05-T003, S1-P05-T005 | PLANNED |
| 45 | S1-P06-T001 | Platform tenant services | P06 | Backend Engineer | 4d | Critical | S1-P05-T001, S1-P03-T004, S1-P04-T010 | COMPLETED |
| 46 | S1-P06-T008 | SUPER_ADMIN bootstrap command | P06 | Backend Engineer | 1d | High | S1-P02-T007 | COMPLETED |
| 47 | S1-P07-T002 | Image URL allowlist validation | P07 | Security Engineer | 1d | High | S1-P04-T006 | COMPLETED |
| 48 | S1-P07-T001 | Restaurant settings services | P07 | Backend Engineer | 3d | Critical | S1-P05-T001, S1-P04-T010, S1-P02-T011, S1-P07-T002 | COMPLETED |
| 49 | S1-P07-T003 | Kitchen sections services and actions | P07 | Backend Engineer | 2d | High | S1-P07-T001 | COMPLETED |
| 50 | S1-P07-T004 | Staff management services | P07 | Backend Engineer | 3d | Critical | S1-P05-T003, S1-P03-T004 | COMPLETED |
| 51 | S1-P07-T008 | Decision: media storage for images | P07 | Gopala Krishna (Project Owner) | 1d | Medium | S1-P01-T010 | COMPLETED |
| 52 | S1-P07-T009 | Media uploads (decision-gated by Q-009) | P07 | Backend Engineer | 4d | Medium | S1-P07-T008, S1-P07-T002 | NOT_APPLICABLE |
| 53 | S1-P08-T001 | Design tokens and Tailwind theme | P08 | Frontend Engineer | 2d | High | S1-P01-T003 | COMPLETED |
| 54 | S1-P08-T002 | Typography with self-hosted fonts | P08 | Frontend Engineer | 1d | High | S1-P08-T001 | COMPLETED |
| 55 | S1-P08-T003 | Icon system | P08 | Frontend Engineer | 1d | High | S1-P08-T001 | COMPLETED |
| 56 | S1-P08-T004 | Core primitives | P08 | Frontend Engineer | 3d | High | S1-P08-T002, S1-P08-T003 | COMPLETED |
| 57 | S1-P03-T005 | Sign-in, invitation sign-up and sign-out pages | P03 | Frontend Engineer | 2d | High | S1-P03-T001, S1-P08-T004 | COMPLETED |
| 58 | S1-P08-T005 | Form system | P08 | Frontend Engineer | 3d | High | S1-P08-T004 | COMPLETED |
| 59 | S1-P08-T006 | Overlays, tabs, sortable lists, filters, pagination | P08 | Frontend Engineer | 4d | High | S1-P08-T004 | COMPLETED |
| 60 | S1-P08-T007 | Data table | P08 | Frontend Engineer | 2d | High | S1-P08-T004 | COMPLETED |
| 61 | S1-P08-T008 | Application shells and navigation | P08 | Frontend Engineer | 3d | High | S1-P08-T006, S1-P05-T006 | COMPLETED |
| 62 | S1-P06-T002 | Admin shell and platform guard | P06 | Frontend Engineer | 1d | Critical | S1-P04-T002, S1-P08-T008 | COMPLETED |
| 63 | S1-P06-T003 | Platform dashboard page | P06 | Frontend Engineer | 2d | High | S1-P06-T001, S1-P06-T002 | COMPLETED |
| 64 | S1-P06-T004 | Tenant list page | P06 | Frontend Engineer | 2d | High | S1-P06-T003, S1-P08-T007 | COMPLETED |
| 65 | S1-P06-T005 | Create tenant flow | P06 | Frontend Engineer | 2d | Critical | S1-P06-T004, S1-P08-T005 | COMPLETED |
| 66 | S1-P06-T006 | Tenant inspection and lifecycle page | P06 | Frontend Engineer | 3d | Critical | S1-P06-T005 | COMPLETED |
| 67 | S1-P06-T007 | Platform audit page | P06 | Frontend Engineer | 2d | High | S1-P06-T006, S1-P04-T010 | COMPLETED |
| 68 | S1-P07-T005 | Restaurant settings UI | P07 | Frontend Engineer | 4d | High | S1-P07-T001, S1-P07-T003, S1-P08-T005, S1-P08-T006, S1-P08-T008 | COMPLETED |
| 69 | S1-P07-T006 | Staff management UI | P07 | Frontend Engineer | 3d | High | S1-P07-T004, S1-P08-T006, S1-P08-T007, S1-P08-T008 | COMPLETED |
| 70 | S1-P07-T007 | Website and branding UI | P07 | Frontend Engineer | 3d | High | S1-P07-T001, S1-P07-T002, S1-P08-T005, S1-P08-T008 | PLANNED |
| 71 | S1-P08-T009 | State components and polling hook | P08 | Frontend Engineer | 2d | High | S1-P08-T004 | IN_PROGRESS |
| 72 | S1-P03-T006 | Account state pages | P03 | Frontend Engineer | 2d | High | S1-P03-T003, S1-P08-T009 | IN_PROGRESS |
| 73 | S1-P04-T003 | Active tenant selection | P04 | Backend Engineer | 2d | Medium | S1-P04-T001, S1-P08-T009 | COMPLETED |
| 74 | S1-P08-T010 | Accessibility baseline | P08 | Frontend Engineer | 2d | High | S1-P08-T006, S1-P01-T005 | PLANNED |
| 75 | S1-P08-T011 | Design-token static checks and baseline cleanup | P08 | Frontend Engineer | 1d | Medium | S1-P08-T001 | COMPLETED |
| 76 | S1-P08-T012 | Responsive viewport suite | P08 | QA Engineer | 2d | High | S1-P08-T008, S1-P01-T005 | PLANNED |
| 77 | S1-P08-T013 | Landing page rebuild | P08 | Frontend Engineer | 1d | Low | S1-P08-T004 | COMPLETED |
| 78 | S1-P09-T001 | Decision gate: public hostname and public ordering | P09 | Gopala Krishna (Project Owner) | 1d | Critical | S1-P01-T010 | IN_PROGRESS |
| 79 | S1-P09-T002 | Public data loader and projection | P09 | Backend Engineer | 3d | Critical | S1-P02-T011, S1-P04-T005, S1-P09-T001 | COMPLETED |
| 80 | S1-P09-T003 | Public restaurant page | P09 | Frontend Engineer | 4d | Critical | S1-P09-T002, S1-P08-T004, S1-P08-T009 | COMPLETED |
| 81 | S1-P09-T004 | Today's menu share page | P09 | Frontend Engineer | 1d | Medium | S1-P09-T003 | COMPLETED |
| 82 | S1-P09-T005 | SEO metadata, JSON-LD, sitemap and robots | P09 | Frontend Engineer | 2d | High | S1-P09-T003 | COMPLETED |
| 83 | S1-P09-T006 | Open Graph image route | P09 | Backend Engineer | 2d | Medium | S1-P09-T002, S1-P07-T002 | COMPLETED |
| 84 | S1-P09-T007 | Caching and revalidation policy | P09 | Backend Engineer | 1d | High | S1-P09-T002 | COMPLETED |
| 85 | S1-P09-T008 | Public response-shape guard | P09 | Security Engineer | 1d | Critical | S1-P09-T003, S1-P09-T006 | COMPLETED |
| 86 | S1-P09-T009 | Public ordering resolution (decision-gated by Q-001) | P09 | Backend Engineer | 2d | High | S1-P09-T001 | COMPLETED |
| 87 | S1-P09-T010 | Public site accessibility and responsive verification | P09 | QA Engineer | 1d | High | S1-P09-T003, S1-P09-T005, S1-P08-T012 | PLANNED |
| 88 | S1-P10-T001 | Menu data layer | P10 | Backend Engineer | 3d | Critical | S1-P04-T005, S1-P02-T010 | COMPLETED |
| 89 | S1-P10-T002 | Category services and actions | P10 | Backend Engineer | 2d | Critical | S1-P10-T001, S1-P04-T010 | COMPLETED |
| 90 | S1-P10-T003 | Menu item services and actions | P10 | Backend Engineer | 3d | Critical | S1-P10-T002 | COMPLETED |
| 91 | S1-P10-T004 | Variants and add-ons | P10 | Backend Engineer | 2d | Critical | S1-P10-T003 | COMPLETED |
| 92 | S1-P10-T005 | Categories UI | P10 | Frontend Engineer | 2d | High | S1-P10-T002, S1-P08-T006, S1-P08-T008 | COMPLETED |
| 93 | S1-P10-T006 | Menu items list UI | P10 | Frontend Engineer | 3d | High | S1-P10-T003, S1-P08-T007, S1-P08-T008 | COMPLETED |
| 94 | S1-P10-T007 | Menu item editor | P10 | Frontend Engineer | 4d | High | S1-P10-T004, S1-P08-T005, S1-P08-T006 | COMPLETED |
| 95 | S1-P10-T008 | Menu authorization and isolation tests | P10 | QA Engineer | 2d | Critical | S1-P10-T004, S1-P04-T009 | COMPLETED |
| 96 | S1-P11-T001 | Daily menu services | P11 | Backend Engineer | 3d | Critical | S1-P10-T003, S1-P02-T011 | COMPLETED |
| 97 | S1-P11-T002 | Daily menu loaders | P11 | Backend Engineer | 1d | High | S1-P11-T001 | COMPLETED |
| 98 | S1-P11-T003 | Daily menu editor UI | P11 | Frontend Engineer | 4d | High | S1-P11-T002, S1-P08-T006, S1-P08-T008 | COMPLETED |
| 99 | S1-P11-T004 | Daily menu scheduling across timezones | P11 | QA Engineer | 1d | High | S1-P11-T001, S1-P09-T002 | COMPLETED |
| 100 | S1-P11-T005 | Daily menu audit and isolation tests | P11 | QA Engineer | 1d | High | S1-P11-T001 | COMPLETED |
| 101 | S1-P12-T001 | Decision gate: order rules | P12 | Gopala Krishna (Project Owner) | 1d | Critical | S1-P01-T010 | COMPLETED |
| 102 | S1-P12-T002 | Pricing engine | P12 | Backend Engineer | 2d | Critical | S1-P02-T010 | COMPLETED |
| 103 | S1-P12-T003 | Race-free sequential numbering | P12 | Database Engineer | 1d | Critical | S1-P02-T003, S1-P02-T011 | COMPLETED |
| 104 | S1-P12-T004 | Order creation service | P12 | Backend Engineer | 4d | Critical | S1-P12-T001, S1-P12-T002, S1-P12-T003, S1-P10-T004, S1-P04-T010 | COMPLETED |
| 105 | S1-P12-T005 | Order state machine service | P12 | Backend Engineer | 3d | Critical | S1-P12-T004, S1-P05-T004 | COMPLETED |
| 106 | S1-P12-T006 | Order loaders and polling route | P12 | Backend Engineer | 2d | High | S1-P12-T005, S1-P05-T005 | COMPLETED |
| 107 | S1-P12-T007 | Order entry (POS) UI | P12 | Frontend Engineer | 5d | Critical | S1-P12-T006, S1-P08-T006, S1-P08-T008 | COMPLETED |
| 108 | S1-P12-T008 | Order board UI | P12 | Frontend Engineer | 3d | High | S1-P12-T006, S1-P08-T009 | COMPLETED |
| 109 | S1-P12-T009 | Order detail UI | P12 | Frontend Engineer | 3d | High | S1-P12-T008 | COMPLETED |
| 110 | S1-P12-T010 | Add items to an open order (decision-gated by Q-003) | P12 | Backend Engineer | 3d | Medium | S1-P12-T005, S1-P12-T001 | PLANNED |
| 111 | S1-P12-T011 | Order authorization and isolation tests | P12 | QA Engineer | 2d | Critical | S1-P12-T006, S1-P04-T009 | PLANNED |
| 112 | S1-P13-T001 | Customer services | P13 | Backend Engineer | 3d | High | S1-P04-T005, S1-P04-T010 | COMPLETED |
| 113 | S1-P13-T002 | Customer loaders and lookup route | P13 | Backend Engineer | 1d | High | S1-P13-T001 | COMPLETED |
| 114 | S1-P13-T003 | Customers UI | P13 | Frontend Engineer | 3d | Medium | S1-P13-T002, S1-P08-T007, S1-P08-T008 | COMPLETED |
| 115 | S1-P13-T004 | Customer lookup in order entry | P13 | Frontend Engineer | 1d | Medium | S1-P13-T002, S1-P12-T007 | PLANNED |
| 116 | S1-P13-T005 | Customer isolation tests | P13 | QA Engineer | 1d | Critical | S1-P13-T002 | PLANNED |
| 117 | S1-P14-T001 | KOT generation service | P14 | Backend Engineer | 3d | Critical | S1-P12-T005, S1-P12-T003 | COMPLETED |
| 118 | S1-P14-T002 | KOT status service and order status derivation | P14 | Backend Engineer | 2d | Critical | S1-P14-T001 | COMPLETED |
| 119 | S1-P14-T003 | KOT cancellation with order | P14 | Backend Engineer | 1d | High | S1-P14-T002 | COMPLETED |
| 120 | S1-P14-T004 | KOT print state derivation | P14 | Backend Engineer | 1d | High | S1-P14-T001 | COMPLETED |
| 121 | S1-P14-T005 | KOT section in order detail | P14 | Frontend Engineer | 2d | Medium | S1-P14-T002, S1-P12-T009 | PLANNED |
| 122 | S1-P14-T006 | KOT audit and isolation tests | P14 | QA Engineer | 1d | Critical | S1-P14-T002 | PLANNED |
| 123 | S1-P15-T001 | Kitchen loaders and polling route | P15 | Backend Engineer | 2d | Critical | S1-P14-T004, S1-P05-T005 | COMPLETED |
| 124 | S1-P15-T002 | Kitchen board UI | P15 | Frontend Engineer | 5d | Critical | S1-P15-T001, S1-P08-T009, S1-P08-T008 | COMPLETED |
| 125 | S1-P15-T003 | Order priority action | P15 | Backend Engineer | 1d | Medium | S1-P12-T005 | COMPLETED |
| 126 | S1-P15-T004 | Kitchen field usability check | P15 | QA Engineer | 1d | Medium | S1-P15-T002 | PLANNED |
| 127 | S1-P15-T005 | Kitchen polling load check | P15 | QA Engineer | 1d | Medium | S1-P15-T001 | PLANNED |
| 128 | S1-P16-T001 | Print queue data layer | P16 | Backend Engineer | 3d | Critical | S1-P02-T003, S1-P04-T008 | COMPLETED |
| 129 | S1-P16-T002 | Print document renderers | P16 | Backend Engineer | 2d | High | S1-P14-T001 | COMPLETED |
| 130 | S1-P16-T003 | Print job producers and reprint | P16 | Backend Engineer | 3d | Critical | S1-P16-T001, S1-P16-T002 | COMPLETED |
| 131 | S1-P16-T004 | Printer and agent management services | P16 | Backend Engineer | 2d | Critical | S1-P16-T001, S1-P03-T007 | COMPLETED |
| 132 | S1-P16-T005 | Print agent API | P16 | Backend Engineer | 3d | Critical | S1-P16-T004, S1-P03-T007 | COMPLETED |
| 133 | S1-P16-T006 | Printing console UI | P16 | Frontend Engineer | 4d | High | S1-P16-T005, S1-P08-T007, S1-P08-T008 | COMPLETED |
| 134 | S1-P16-T007 | Manual retry and lease recovery | P16 | Backend Engineer | 1d | High | S1-P16-T001 | COMPLETED |
| 135 | S1-P16-T008 | Print isolation and adversarial tests | P16 | Security Engineer | 2d | Critical | S1-P16-T005 | COMPLETED |
| 136 | S1-P16-T009 | Printing health indicators | P16 | Frontend Engineer | 1d | Medium | S1-P16-T006, S1-P15-T002 | COMPLETED |
| 137 | S1-P17-T001 | Decision gate: agent runtime and printers | P17 | Gopala Krishna (Project Owner) | 1d | Critical | S1-P01-T010 | PLANNED |
| 138 | S1-P17-T002 | Agent package scaffold | P17 | Backend Engineer | 2d | High | S1-P17-T001, S1-P16-T002 | PLANNED |
| 139 | S1-P17-T003 | Pairing and credential storage | P17 | Backend Engineer | 2d | Critical | S1-P17-T002, S1-P16-T005 | PLANNED |
| 140 | S1-P17-T004 | Poll, claim, acknowledge loop | P17 | Backend Engineer | 3d | Critical | S1-P17-T003 | PLANNED |
| 141 | S1-P17-T005 | ESC/POS encoder | P17 | Backend Engineer | 3d | Critical | S1-P17-T002 | PLANNED |
| 142 | S1-P17-T006 | Printer transports | P17 | Backend Engineer | 3d | Critical | S1-P17-T005 | PLANNED |
| 143 | S1-P17-T007 | ESC/POS printer simulator | P17 | QA Engineer | 2d | High | S1-P17-T002 | PLANNED |
| 144 | S1-P17-T008 | End-to-end printing verification | P17 | QA Engineer | 2d | Critical | S1-P17-T004, S1-P17-T006, S1-P17-T007, S1-P16-T003 | PLANNED |
| 145 | S1-P17-T009 | Agent packaging and installation guide | P17 | DevOps Engineer | 3d | High | S1-P17-T006 | PLANNED |
| 146 | S1-P17-T010 | Agent security review | P17 | Security Engineer | 1d | High | S1-P17-T009 | PLANNED |
| 147 | S1-P18-T001 | Payment ledger service | P18 | Backend Engineer | 3d | Critical | S1-P12-T005, S1-P04-T010 | COMPLETED |
| 148 | S1-P18-T002 | Refunds and voids | P18 | Backend Engineer | 2d | Critical | S1-P18-T001 | COMPLETED |
| 149 | S1-P18-T003 | Business day close | P18 | Backend Engineer | 2d | High | S1-P18-T002 | COMPLETED |
| 150 | S1-P18-T004 | Transactions list loader | P18 | Backend Engineer | 1d | High | S1-P18-T002 | COMPLETED |
| 151 | S1-P18-T005 | Transactions UI | P18 | Frontend Engineer | 3d | High | S1-P18-T004, S1-P08-T007, S1-P08-T008 | COMPLETED |
| 152 | S1-P18-T006 | Payment panel in order detail | P18 | Frontend Engineer | 3d | Critical | S1-P18-T002, S1-P12-T009 | PLANNED |
| 153 | S1-P18-T007 | Day close UI | P18 | Frontend Engineer | 2d | High | S1-P18-T003, S1-P08-T005 | COMPLETED |
| 154 | S1-P18-T008 | Receipt view and printing | P18 | Frontend Engineer | 2d | High | S1-P18-T001, S1-P16-T003 | PLANNED |
| 155 | S1-P18-T009 | Transaction isolation and adversarial tests | P18 | QA Engineer | 1d | Critical | S1-P18-T003 | PLANNED |
| 156 | S1-P19-T001 | Report aggregation data layer | P19 | Backend Engineer | 4d | Critical | S1-P18-T003, S1-P02-T011 | PLANNED |
| 157 | S1-P19-T002 | Dashboard summary loader and polling route | P19 | Backend Engineer | 2d | High | S1-P19-T001, S1-P16-T005, S1-P11-T001 | PLANNED |
| 158 | S1-P19-T003 | Reports UI | P19 | Frontend Engineer | 4d | High | S1-P19-T001, S1-P08-T007, S1-P08-T008 | PLANNED |
| 159 | S1-P19-T004 | Dashboard UI | P19 | Frontend Engineer | 3d | High | S1-P19-T002, S1-P08-T008 | PLANNED |
| 160 | S1-P19-T005 | Report performance and indexes | P19 | Database Engineer | 1d | Medium | S1-P19-T001 | PLANNED |
| 161 | S1-P19-T006 | Remove duplicate baseline reporting routes | P19 | Frontend Engineer | 1d | Low | S1-P19-T003, S1-P18-T005, S1-P15-T002 | PLANNED |
| 162 | S1-P20-T001 | Menu card image generation | P20 | Backend Engineer | 3d | High | S1-P09-T006 | PLANNED |
| 163 | S1-P20-T002 | Social post services | P20 | Backend Engineer | 2d | High | S1-P20-T001, S1-P04-T010 | PLANNED |
| 164 | S1-P20-T003 | Social UI | P20 | Frontend Engineer | 3d | Medium | S1-P20-T002, S1-P08-T006, S1-P08-T008 | PLANNED |
| 165 | S1-P20-T004 | Social isolation tests | P20 | QA Engineer | 1d | High | S1-P20-T002 | PLANNED |
| 166 | S1-P21-T001 | Web app manifest and icons | P21 | Frontend Engineer | 1d | High | S1-P08-T003 | PLANNED |
| 167 | S1-P21-T002 | Service worker rewrite | P21 | Frontend Engineer | 2d | High | S1-P21-T001 | PLANNED |
| 168 | S1-P21-T003 | Service worker update strategy | P21 | Frontend Engineer | 1d | Medium | S1-P21-T002 | PLANNED |
| 169 | S1-P21-T004 | Installability verification | P21 | QA Engineer | 1d | Medium | S1-P21-T003 | PLANNED |
| 170 | S1-P22-T001 | Restaurant live clock | P22 | Frontend Engineer | 1d | High | S1-P08-T008 | PLANNED |
| 171 | S1-P22-T003 | Timezone change safety | P22 | Backend Engineer | 1d | Medium | S1-P07-T001 | PLANNED |
| 172 | S1-P23-T001 | Audit coverage verification | P23 | Security Engineer | 3d | Critical | S1-P20-T002, S1-P18-T003, S1-P16-T005, S1-P07-T004, S1-P06-T001 | PLANNED |
| 173 | S1-P23-T002 | Tenant audit log viewer | P23 | Frontend Engineer | 3d | High | S1-P23-T001, S1-P08-T007, S1-P08-T008 | COMPLETED |
| 174 | S1-P22-T002 | Timezone display sweep | P22 | Frontend Engineer | 2d | High | S1-P19-T003, S1-P18-T005, S1-P23-T002 | PLANNED |
| 175 | S1-P22-T004 | Cross-timezone verification suite | P22 | QA Engineer | 2d | High | S1-P22-T002, S1-P19-T001 | PLANNED |
| 176 | S1-P23-T003 | Request metadata capture | P23 | Backend Engineer | 1d | Medium | S1-P04-T010 | COMPLETED |
| 177 | S1-P23-T004 | Audit volume and retention review | P23 | Database Engineer | 1d | Low | S1-P23-T001 | PLANNED |
| 178 | S1-P24-T001 | Security headers and Content-Security-Policy | P24 | Security Engineer | 2d | Critical | S1-P08-T002 | PLANNED |
| 179 | S1-P24-T002 | CSRF and CORS verification | P24 | Security Engineer | 1d | High | S1-P04-T002 | PLANNED |
| 180 | S1-P24-T003 | Rate limit application and tuning | P24 | Security Engineer | 1d | High | S1-P03-T007, S1-P16-T005 | PLANNED |
| 181 | S1-P24-T004 | Injection and XSS hardening review | P24 | Security Engineer | 2d | High | S1-P16-T002 | PLANNED |
| 182 | S1-P24-T005 | Request size and pagination limits | P24 | Security Engineer | 1d | Medium | S1-P12-T006 | PLANNED |
| 183 | S1-P24-T006 | Dependency and secret hygiene review | P24 | Security Engineer | 1d | High | S1-P01-T006 | PLANNED |
| 184 | S1-P24-T007 | Response projection audit | P24 | Security Engineer | 1d | High | S1-P19-T002 | PLANNED |
| 185 | S1-P24-T008 | Adversarial test suite completion | P24 | Security Engineer | 3d | Critical | S1-P24-T002, S1-P24-T003, S1-P16-T008, S1-P23-T001 | PLANNED |
| 186 | S1-P24-T009 | Threat model verification and sign-off | P24 | Security Engineer | 2d | Critical | S1-P24-T001, S1-P24-T004, S1-P24-T005, S1-P24-T006, S1-P24-T007, S1-P24-T008 | PLANNED |
| 187 | S1-P25-T001 | Tenant isolation suite completion | P25 | QA Engineer | 4d | Critical | S1-P23-T001, S1-P20-T004, S1-P18-T009, S1-P13-T005, S1-P14-T006, S1-P10-T008 | PLANNED |
| 188 | S1-P25-T002 | RBAC matrix completion | P25 | QA Engineer | 2d | Critical | S1-P05-T002, S1-P23-T001 | PLANNED |
| 189 | S1-P25-T003 | End-to-end journeys | P25 | QA Engineer | 5d | Critical | S1-P19-T004, S1-P20-T003, S1-P17-T008, S1-P21-T003, S1-P07-T006, S1-P06-T006 | PLANNED |
| 190 | S1-P25-T004 | Accessibility audit | P25 | QA Engineer | 3d | High | S1-P25-T003 | PLANNED |
| 191 | S1-P25-T005 | Responsive QA | P25 | QA Engineer | 2d | High | S1-P25-T003 | PLANNED |
| 192 | S1-P25-T006 | Regression suite gating | P25 | QA Engineer | 1d | High | S1-P25-T003 | PLANNED |
| 193 | S1-P25-T008 | Database test inventory review | P25 | QA Engineer | 1d | Medium | S1-P02-T009 | PLANNED |
| 194 | S1-P25-T009 | Physical printing QA | P25 | QA Engineer | 2d | High | S1-P17-T009 | PLANNED |
| 195 | S1-P25-T010 | Visual QA pass | P25 | Frontend Engineer | 4d | High | S1-P25-T003 | PLANNED |
| 196 | S1-P25-T011 | Design consistency audit | P25 | Frontend Engineer | 1d | High | S1-P25-T010 | PLANNED |
| 197 | S1-P25-T012 | User acceptance testing with Project Owner | P25 | Gopala Krishna (Project Owner) | 3d | Critical | S1-P25-T003, S1-P25-T010 | PLANNED |
| 198 | S1-P26-T001 | Request correlation and structured request logs | P26 | Backend Engineer | 2d | High | S1-P03-T002 | PLANNED |
| 199 | S1-P26-T002 | Log redaction and PII masking | P26 | Security Engineer | 1d | High | S1-P26-T001 | PLANNED |
| 200 | S1-P26-T003 | Health and readiness endpoints | P26 | Backend Engineer | 1d | Critical | S1-P02-T005 | PLANNED |
| 201 | S1-P26-T004 | Security event logging | P26 | Security Engineer | 1d | High | S1-P26-T001 | PLANNED |
| 202 | S1-P26-T005 | Maintenance job for rate-limit buckets | P26 | DevOps Engineer | 1d | Medium | S1-P03-T007 | PLANNED |
| 203 | S1-P26-T006 | Error capture | P26 | Backend Engineer | 1d | High | S1-P26-T001 | PLANNED |
| 204 | S1-P26-T007 | Print queue and agent monitoring | P26 | Backend Engineer | 2d | High | S1-P16-T005, S1-P26-T001 | PLANNED |
| 205 | S1-P26-T008 | Database monitoring | P26 | Database Engineer | 1d | Medium | S1-P26-T001 | PLANNED |
| 206 | S1-P27-T001 | Production Railway environment | P27 | DevOps Engineer | 2d | Critical | S1-P01-T008, S1-P09-T001 | PLANNED |
| 207 | S1-P27-T002 | Database credentials, TLS and roles | P27 | Database Engineer | 1d | High | S1-P27-T001 | PLANNED |
| 208 | S1-P27-T003 | Release pipeline | P27 | DevOps Engineer | 3d | Critical | S1-P27-T001, S1-P02-T009 | PLANNED |
| 209 | S1-P25-T007 | Load and performance test | P25 | QA Engineer | 3d | High | S1-P25-T003, S1-P27-T003 | PLANNED |
| 210 | S1-P27-T004 | Environment variable and secret inventory | P27 | DevOps Engineer | 1d | High | S1-P27-T001 | PLANNED |
| 211 | S1-P27-T005 | Clerk production configuration | P27 | Backend Engineer | 1d | Critical | S1-P27-T001, S1-P03-T008 | PLANNED |
| 212 | S1-P27-T006 | Backups and restore drill | P27 | Database Engineer | 2d | Critical | S1-P27-T002 | PLANNED |
| 213 | S1-P27-T007 | Rollback rehearsal | P27 | DevOps Engineer | 1d | Critical | S1-P27-T003 | PLANNED |
| 214 | S1-P27-T008 | Production smoke test suite | P27 | QA Engineer | 2d | Critical | S1-P27-T003, S1-P25-T003 | PLANNED |
| 215 | S1-P27-T009 | Deployment runbooks | P27 | DevOps Engineer | 1d | High | S1-P27-T007 | PLANNED |
| 216 | S1-P28-T001 | Release gate evidence review | P28 | QA Engineer | 2d | Critical | S1-P25-T012, S1-P24-T009, S1-P27-T008 | PLANNED |
| 217 | S1-P28-T002 | Performance tuning to targets | P28 | Backend Engineer | 2d | High | S1-P25-T007 | PLANNED |
| 218 | S1-P28-T003 | Security sign-off and secret rotation drill | P28 | Security Engineer | 2d | Critical | S1-P24-T009, S1-P27-T004 | PLANNED |
| 219 | S1-P28-T004 | Knowledge Base synchronisation and consistency scan | P28 | Backend Engineer | 2d | High | S1-P28-T001 | PLANNED |
| 220 | S1-P28-T005 | Incident response and support runbooks | P28 | DevOps Engineer | 1d | High | S1-P27-T009 | PLANNED |
| 221 | S1-P28-T006 | First tenant onboarding plan | P28 | Gopala Krishna (Project Owner) | 2d | High | S1-P27-T005 | PLANNED |
| 222 | S1-P28-T007 | Go / No-Go decision | P28 | Gopala Krishna (Project Owner) | 1d | Critical | S1-P28-T001, S1-P28-T002, S1-P28-T003, S1-P28-T004, S1-P28-T005, S1-P28-T006 | PLANNED |
| 223 | S1-P29-T001 | Production deployment | P29 | DevOps Engineer | 1d | Critical | S1-P28-T007 | PLANNED |
| 224 | S1-P29-T002 | First tenant go-live | P29 | Gopala Krishna (Project Owner) | 2d | Critical | S1-P29-T001 | PLANNED |
| 225 | S1-P29-T003 | Hypercare | P29 | Backend Engineer | 5d | High | S1-P29-T002 | PLANNED |
| 226 | S1-P29-T004 | Post-release Knowledge Base update | P29 | Backend Engineer | 1d | High | S1-P29-T003 | PLANNED |
| 227 | S1-P29-T005 | Project Owner final acceptance | P29 | Gopala Krishna (Project Owner) | 1d | Critical | S1-P29-T004 | PLANNED |
| 228 | S1-P08-T014 | Brand v2 tokens, glass system and header navigation shells | P08 | Frontend Engineer | 4d | Critical | S1-P08-T004 | COMPLETED |
| 229 | S1-P08-T015 | Dashboard composition (fewer, larger sections) | P08 | Frontend Engineer | 2d | High | S1-P08-T014 | COMPLETED |
| 230 | S1-P06-T009 | Tenant provisioning and handover flow | P06 | Backend Engineer | 3d | Critical | S1-P06-T005 | COMPLETED |
| 231 | S1-P07-T010 | Website theme and section services | P07 | Backend Engineer | 4d | Critical | S1-P07-T001 | COMPLETED |
| 232 | S1-P07-T011 | Website and theme customisation UI | P07 | Frontend Engineer | 3d | High | S1-P07-T010 | PLANNED |
| 233 | S1-P09-T011 | Tenant subdomain routing | P09 | Backend Engineer | 3d | Critical | S1-P09-T002 | IN_PROGRESS |
| 234 | S1-P09-T012 | Dynamic themed restaurant website | P09 | Frontend Engineer | 4d | Critical | S1-P09-T011 | COMPLETED |

## P01 — Project Foundation

10 tasks · 15 ideal days of effort · sequence #1–#10 (interleaved with other phases where dependencies allow)

### S1-P01-T001 — Verify and record the baseline scaffold

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | P01 Project Foundation | Backend Engineer | High | 1d | — | — | 2026-09-15 | 2026-09-15 | COMPLETED |

- **Dependencies:** none
- **Requirements:** REQ-FOUND-002, REQ-NFR-007
- **Baseline:** [fact] `npx tsc --noEmit` exit 0 and 42/42 Vitest tests pass (baseline-audit §1); `npm run build` and `npm run lint` not yet verified.
- **Objective:** Establish a verified starting point so later tasks measure real change, not assumed state.
- **Technical work:**
  - Run `npm ci`, `npx prisma generate`, `npm run typecheck`, `npm run test`, `npm run build` on a clean clone; record Node/npm versions.
  - Record build output (route list, warnings) and any failures in the task's implementation notes.
  - Confirm `.env` is untracked (`git ls-files .env` empty) and `.gitignore` covers `.env*`.
  - Inventory unused baseline components (`POSCheckout`, `MenuGrid`, `OrderCard`, `KitchenBoard`) for later replacement (BA-31).
- **Files/modules:** `package.json`, `package-lock.json`, `.gitignore`
- **Database:** None.
- **API:** None.
- **Frontend:** None.
- **Security:** SC-SEC-02 (verify secrets untracked).
- **Tests:**
  - `TC-FOUND-006` [build] Production build of the baseline completes; result and warnings recorded.
- **Acceptance criteria:**
  - Build, typecheck and unit test results are recorded with command output.
  - Any build failure is logged as a follow-up inside the owning phase, not silently fixed here.
- **Implementation notes:** Verified 2026-09-15 on branch slice-01/p01-foundation (Node v24.18.0, npm 11.16.0). TC-FOUND-006: `npm run build` exit 0 on Next.js 15.5.25; 22 app routes + middleware (85.7 kB) built, 16 static pages generated; one webpack cache warning (large string serialization), no lint/type errors reported (no ESLint config present, see S1-P01-T003). Typecheck exit 0 and 42/42 Vitest tests recorded in baseline-audit §1. `.env` untracked (`git ls-files .env` empty). `npx prisma generate` failed with EPERM renaming query_engine-windows.dll.node because another node process holds the DLL (existing generated client used by build) — follow-up: stop dev servers before generating (documented in README task S1-P01-T009). Unused baseline components confirmed: POSCheckout, MenuGrid, OrderCard, KitchenBoard (BA-31).
- **Affected files (actual):** None (verification only)

### S1-P01-T002 — Align npm scripts with CLAUDE.md commands

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 2 | P01 Project Foundation | Backend Engineer | High | 1d | — | — | 2026-09-15 | 2026-09-15 | COMPLETED |

- **Dependencies:** S1-P01-T001
- **Requirements:** REQ-FOUND-001
- **Baseline:** [fact] `package.json` lacks `test:e2e` and `prisma:gen`; has `prisma:generate` (baseline-audit §3).
- **Objective:** Every command documented in CLAUDE.md exists and does what it says.
- **Technical work:**
  - Add scripts: `prisma:gen` (`prisma generate`), keep `prisma:generate` as alias, `prisma:migrate` (`prisma migrate dev`), `prisma:deploy` (`prisma migrate deploy`), `db:seed` (`prisma db seed`), `test:unit` (`vitest run --project unit`), `test:integration` (`vitest run --project integration`), `test:static` (`vitest run --project static`), `test:e2e` (`playwright test`), `lint` (`eslint .`).
  - Configure Vitest projects `unit`, `integration`, `static` in `vitest.config.ts` (directories `tests/unit`, `tests/integration`, `tests/static`).
  - Add `"prisma": { "seed": "tsx prisma/seed.ts" }` (tsx as devDependency, reviewed per SC-DEP-03).
- **Files/modules:** `package.json`, `vitest.config.ts`
- **Database:** None.
- **API:** None.
- **Frontend:** None.
- **Security:** SC-DEP-03 (review note for `tsx`).
- **Tests:**
  - `TC-FOUND-001` [static] Each CLAUDE.md command exists in `package.json` and exits 0 on the baseline (static test reads CLAUDE.md command list).
- **Acceptance criteria:**
  - `npm run test:unit`, `npm run typecheck`, `npm run prisma:gen` succeed.
  - CLAUDE.md and `package.json` list the same commands.
- **Implementation notes:** Scripts added: test:unit/test:static/test:integration (Vitest 3.2 projects unit/static/integration; integration uses --passWithNoTests until S1-P02-T008), test:e2e (playwright, installed in S1-P01-T005), prisma:gen (alias of prisma:generate kept), prisma:deploy, db:seed with prisma.seed = tsx prisma/seed.ts; tsx 4.23.13 added as devDependency (review note: TypeScript runner for seed/CLI scripts, MIT, used instead of ts-node). lint became eslint . --max-warnings=0 in S1-P01-T003. Verified: TC-FOUND-001 static test 11/11; npm run test:unit 50/50; npm run typecheck exit 0; npm run prisma:gen exit 0 (Prisma Client 6.19.3) after the owner-approved stop of 5 local next dev servers that locked the query engine DLL (2026-09-15).
- **Affected files (actual):** package.json, package-lock.json, vitest.config.ts, tests/static/claude-md-commands.test.ts

### S1-P01-T003 — Configure ESLint with security and money rules

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 3 | P01 Project Foundation | Backend Engineer | High | 2d | — | — | 2026-09-15 | 2026-09-15 | COMPLETED |

- **Dependencies:** S1-P01-T002
- **Requirements:** REQ-FOUND-002, REQ-SEC-007, REQ-TXN-009
- **Baseline:** [fact] No ESLint config file exists; `next lint` script only.
- **Objective:** Automated enforcement of code rules that protect security and money correctness.
- **Technical work:**
  - Create `eslint.config.mjs` (flat config) with `next/core-web-vitals`, `@typescript-eslint` strict-type-checked subset.
  - `no-restricted-syntax`/`no-restricted-properties` rules: ban `dangerouslySetInnerHTML` (allow-list file `lib/seo/json-ld.tsx`), `$queryRawUnsafe`, `$executeRawUnsafe`, `parseFloat`, `Decimal#toNumber()`, `new Function`, `child_process` imports.
  - Ban `@/lib/db/prisma` imports outside `lib/data/**`, `lib/db/**`, `prisma/**`, `tests/**` via `no-restricted-imports` (complements static test S1-P02-T006).
  - Fix or explicitly suppress (with reason) existing violations; CI treats warnings as errors.
- **Files/modules:** `eslint.config.mjs`, `package.json`
- **Database:** None.
- **API:** None.
- **Frontend:** Lint coverage for `app/`, `components/`.
- **Security:** SC-VAL-03, SC-VAL-05, SC-VAL-06, SC-TEN-03.
- **Tests:**
  - `TC-FOUND-002` [static] `npm run lint` exits 0; a fixture file using `dangerouslySetInnerHTML`, `$queryRawUnsafe` and `parseFloat` fails lint.
- **Acceptance criteria:**
  - Lint passes on the repository with zero errors and zero warnings.
  - Each banned construct is proven to fail with a fixture.
- **Implementation notes:** Flat config eslint.config.mjs (next/core-web-vitals + next/typescript via FlatCompat) with no-restricted-syntax bans (dangerouslySetInnerHTML JSX/props, $queryRawUnsafe/$executeRawUnsafe, parseFloat, Decimal#toNumber, new Function) and no-restricted-imports (child_process everywhere; @/lib/db/prisma outside lib/data, lib/db, prisma, tests, scripts). Baseline: 105 problems found; 30 unused imports/variables fixed; remaining baseline violations suppressed ONLY via two explicit, commented file lists naming the task that removes each file (Prisma imports: 12 files pending S1-P04-T007/T008 and feature rebuilds; any/exhaustive-deps/parseFloat: 13 client pages and services pending their rebuild tasks). lint script is now 'eslint . --max-warnings=0'. Verified: npm run lint exit 0 (0 warnings); TC-FOUND-002 static test 4/4 (each banned construct fails; lib/data may import Prisma); typecheck exit 0; unit 42/42.
- **Affected files (actual):** eslint.config.mjs, package.json, tests/static/lint-rules.test.ts, app/r/[slug]/page.tsx, app/restaurant/{analytics,billing,customers,kds,orders,printing,social,menu}/page.tsx, app/restaurant/menu/{categories,items}-actions.ts, components/public/public-menu-client.tsx, components/restaurant/{KitchenBoard,MenuGrid,OrderCard,POSCheckout}.tsx, lib/auth/clerk.ts, lib/services/orders.ts, tests/unit/{kds-kot,menu-management,payments-billing,permissions,social-analytics,tenant-context}.test.ts

### S1-P01-T004 — Validate environment configuration at startup

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 4 | P01 Project Foundation | Backend Engineer | Critical | 1d | — | — | 2026-09-15 | 2026-09-15 | COMPLETED |

- **Dependencies:** S1-P01-T002
- **Requirements:** REQ-OPS-002, REQ-AUTH-007, REQ-SEC-009
- **Baseline:** [fact] Env read ad hoc; placeholder Clerk key silently disables auth (`middleware.ts:15-30`, BA-04).
- **Objective:** Misconfiguration fails fast and loudly instead of weakening security.
- **Technical work:**
  - Create `lib/env.ts` (server-only) with Zod schema: `DATABASE_URL`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_WEBHOOK_SIGNING_SECRET`, `NEXT_PUBLIC_APP_URL`, `ALLOWED_IMAGE_HOSTS`, `LOG_LEVEL`, `SUPER_ADMIN_BOOTSTRAP_EMAIL` (optional), `NODE_ENV`.
  - Reject values containing `placeholder`, `example`, `changeme`; require `sslmode=require` in production `DATABASE_URL`.
  - Import `lib/env.ts` from `instrumentation.ts` so the server fails at boot.
  - Update `.env.example` with descriptions and safe dummy formats that do not pass validation.
- **Files/modules:** `lib/env.ts`, `instrumentation.ts`, `.env.example`
- **Database:** None.
- **API:** None.
- **Frontend:** Only `NEXT_PUBLIC_*` values exposed to client bundles.
- **Security:** SC-SEC-01, SC-AUTH-02, SC-DB-01.
- **Tests:**
  - `TC-FOUND-003` [unit] Missing, placeholder or malformed variables throw with the variable name (never the value); no server secret has a `NEXT_PUBLIC_` prefix.
- **Acceptance criteria:**
  - Starting the server with a placeholder Clerk key fails with a clear error.
  - `.env.example` documents every variable in the schema.
- **Implementation notes:** lib/env.ts: Zod schema with pure parseEnv() (errors name variable + rule, never values), getEnv() memoised, assertEnv() called from new instrumentation.ts register() (nodejs runtime). Rules: required DATABASE_URL (postgres URL), Clerk pk_/sk_ key formats, placeholder/example/changeme rejection, NEXT_PUBLIC_APP_URL absolute URL (https in production), production DATABASE_URL requires sslmode=require except *.railway.internal hosts [assumption to verify in S1-P27-T002], NEXT_PUBLIC_* keys named like secrets or holding sk_/whsec_ values rejected, optional CLERK_WEBHOOK_SIGNING_SECRET (whsec_, required from S1-P03-T008), ALLOWED_IMAGE_HOSTS, TRUSTED_PROXY_HOPS, LOG_LEVEL, SUPER_ADMIN_BOOTSTRAP_EMAIL. Verified: TC-FOUND-003 8/8; next dev with CLERK_SECRET_KEY=sk_test_placeholder_key logs 'Invalid server environment: CLERK_SECRET_KEY: contains a placeholder value' and serves nothing (curl HTTP 000); with the real local .env the server boots and returns HTTP 200. .env.example rewritten with documentation and failing dummy values (NODE_ENV removed — managed by Next.js). Middleware/layout auth bypass itself is removed in S1-P03-T002.
- **Affected files (actual):** lib/env.ts, instrumentation.ts, tests/unit/env.test.ts, .env.example

### S1-P01-T005 — Install and configure Playwright with accessibility tooling

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 5 | P01 Project Foundation | QA Engineer | High | 2d | — | — | 2026-09-15 | 2026-09-15 | COMPLETED |

- **Dependencies:** S1-P01-T002
- **Requirements:** REQ-TEST-008, REQ-TEST-009, REQ-TEST-010
- **Baseline:** [fact] Playwright not installed; no `tests/e2e`.
- **Objective:** E2E, accessibility and responsive testing infrastructure exists before features are rebuilt.
- **Technical work:**
  - Add `@playwright/test` and `@axe-core/playwright` (dependency review notes).
  - `playwright.config.ts` projects: `desktop-chromium` (1440×900), `tablet` (1024×768 touch), `mobile` (390×844 touch); `webServer` runs `next build && next start` against the integration database.
  - Clerk testing token setup (`@clerk/testing`) for authenticated E2E; helper `signInAs(role, tenant)`.
  - Fixtures: `axeCheck(page)` failing on serious/critical violations; trace on retry.
- **Files/modules:** `playwright.config.ts`, `tests/e2e/fixtures/*`, `package.json`
- **Database:** Uses seeded integration database (S1-P02-T007 when available).
- **API:** None.
- **Frontend:** None.
- **Security:** SC-DEP-03.
- **Tests:**
  - `TC-QA-002` [e2e] Smoke spec loads `/` and `/sign-in` in all three projects headless in CI.
- **Acceptance criteria:**
  - `npm run test:e2e` runs locally and in CI.
  - Axe fixture fails the smoke spec when a known violation is injected.
- **Implementation notes:** Added devDependencies @playwright/test 1.63.0, @axe-core/playwright 4.13.0, @clerk/testing 2.2.34 (review: official Playwright runner; Deque axe bindings for WCAG checks; Clerk's official testing-token helpers) and Chromium headless shell. playwright.config.ts: projects desktop-chromium (1440x900), tablet (1024x768 touch), mobile (Pixel 7, 390x844) + clerk-setup project (clerkSetup) for authenticated specs; webServer runs next dev locally on port 3100 and build+start in CI; PLAYWRIGHT_BASE_URL override for staging/prod smoke. Fixtures: tests/e2e/fixtures/axe.ts (axeCheck fails on serious/critical WCAG 2.0/2.1 A/AA), tests/e2e/fixtures/auth.ts (signInWithEmail via Clerk ticket strategy; role/tenant helpers arrive with seed users in S1-P03-T001). Verified: TC-QA-002 9/9 passed (landing and sign-in load in all 3 projects; axe fixture rejects an injected image-alt violation). Dev server logs benign ECONNRESET when browsers close pages. .gitignore covers playwright-report/test-results/blob-report. CI execution is wired in S1-P01-T006.
- **Affected files (actual):** package.json, package-lock.json, playwright.config.ts, tests/e2e/global.setup.ts, tests/e2e/fixtures/axe.ts, tests/e2e/fixtures/auth.ts, tests/e2e/smoke.spec.ts, eslint.config.mjs, .gitignore

### S1-P01-T006 — Continuous integration pipeline and PR template

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 6 | P01 Project Foundation | DevOps Engineer | High | 2d | — | — | 2026-09-15 | — | IN_PROGRESS |

- **Dependencies:** S1-P01-T003, S1-P01-T005
- **Requirements:** REQ-OPS-010, REQ-SEC-008
- **Baseline:** [fact] No `.github/` directory.
- **Objective:** Every pull request is gated by lint, typecheck, tests, build and dependency audit.
- **Technical work:**
  - `.github/workflows/ci.yml`: jobs `lint`, `typecheck`, `unit`, `static`, `integration` (PostgreSQL service container, `prisma migrate deploy`, seed), `e2e` (Playwright, uploads traces), `build`, `audit` (`npm audit --audit-level=high`).
  - Cache npm and Playwright browsers; required status checks documented for branch protection on `main`.
  - `.github/pull_request_template.md` with sections: linked task ID, tests run, KB updated, **new dependency review** (purpose, maintainer, licence, alternatives).
- **Files/modules:** `.github/workflows/ci.yml`, `.github/pull_request_template.md`
- **Database:** CI PostgreSQL service.
- **API:** None.
- **Frontend:** None.
- **Security:** SC-DEP-01, SC-DEP-03.
- **Tests:**
  - `TC-FOUND-004` [ci] A branch adding a package with a known high-severity advisory fails the `audit` job.
  - `TC-FOUND-005` [static] PR template contains the dependency review section.
- **Acceptance criteria:**
  - CI runs on pull requests and `main`; all jobs green on the baseline (integration/e2e jobs may target baseline smoke until later phases).
  - Branch protection requirements recorded in `operations/deployment.md`.
- **Implementation notes:** Added .github/workflows/ci.yml (jobs lint, typecheck, unit, static, integration with postgres:16 service + conditional migrate/seed, e2e Playwright with report artifact, build, audit --audit-level=high; Node 24 via .nvmrc; npm cache; explicit prisma generate because npm 11 blocks install scripts) and .github/pull_request_template.md (task IDs, tests, security checklist, New dependency review table, KB update). Audit gate evidence: before fixes `npm audit --audit-level=high` exited 1 (4 high: postcss via next, deepmerge-ts via @prisma/config) — proves the gate fails on high advisories (TC-FOUND-004); fixed with package.json overrides next→postcss@8.5.28 and @prisma/config→deepmerge-ts@8.0.2 (no major upgrades; prisma validate OK; npm run build exit 0; unit 50/50) and audit now exits 0 (3 moderate vitest advisories remain, below gate). Static TC-FOUND-004/005 13/13; workflow YAML parses (js-yaml) with 8 jobs. Branch protection, secrets and override rationale recorded in knowledge/operations/deployment.md. OPEN: first real GitHub Actions run — requires pushing the branch and adding CLERK_SECRET_KEY / NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY (dev instance) repository secrets, then enabling branch protection (repository owner action).
- **Affected files (actual):** .github/workflows/ci.yml, .github/pull_request_template.md, .nvmrc, tests/static/ci-gates.test.ts, package.json (overrides), package-lock.json, knowledge/operations/deployment.md

### S1-P01-T007 — Remove fabricated indicators and demo fallbacks

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 7 | P01 Project Foundation | Frontend Engineer | High | 1d | — | — | 2026-09-15 | 2026-09-15 | COMPLETED |

- **Dependencies:** S1-P01-T001
- **Requirements:** REQ-PLAT-005, REQ-SOC-005
- **Baseline:** [fact] BA-28 `/r/demo` hard-coded restaurant; BA-29 "Publish Now" sets PUBLISHED; BA-30 static "System Operational", "Agent API Status: Ready", "100% Operational"; BA-33 `/dashboard` link.
- **Objective:** The product never shows states that are not true, even before the rebuilt screens land.
- **Technical work:**
  - Delete the demo fallback block in `app/r/[slug]/page.tsx:16-83`; unknown slugs render not-found.
  - Remove static operational badges in `app/restaurant/dashboard/page.tsx:19,78` and `app/admin/page.tsx:57-63`.
  - Remove "Publish Now" button in `app/restaurant/social/page.tsx:268-279` (replaced in S1-P20-T003).
  - Fix home link `/dashboard` → `/restaurant` in `app/page.tsx:54`; remove `/r/demo` links.
- **Files/modules:** `app/r/[slug]/page.tsx`, `app/restaurant/dashboard/page.tsx`, `app/admin/page.tsx`, `app/restaurant/social/page.tsx`, `app/page.tsx`
- **Database:** None.
- **API:** None.
- **Frontend:** Listed pages.
- **Security:** None.
- **Tests:**
  - `TC-FOUND-007` [static] Test fails if source contains `demo-tenant-id`, `System Operational`, `Agent API Status`, `100% Operational` or `SocialPostStatus.PUBLISHED` assignments in `app/`.
- **Acceptance criteria:**
  - No fabricated status or demo data remains in `app/` or `components/`.
  - `/r/demo` returns not-found when no tenant with slug `demo` exists.
- **Implementation notes:** Removed the /r/demo hard-coded tenant fallback (public page now rethrows everything except NotFoundError); removed fabricated badges (System Operational, Agent API Status, Platform Health 100% Operational, Live Instance, Tenant Isolated / RBAC Active, Strict DB Isolation, Foundation Active, Compliance & Security claim) and the fake social Publish Now action. Landing page security guarantees reworded as feature descriptions; broken /dashboard link fixed to /restaurant/dashboard; 'Active License(s)' renamed to Active / Active Tenants (no licence entity exists). TC-FOUND-007 static test scans app/ and components/ for 12 markers; mutation-checked (fails when a marker is added). lint 0, tsc 0, static 41/41, unit 50/50, e2e 10/10.
- **Affected files (actual):** app/page.tsx; app/r/[slug]/page.tsx; app/restaurant/dashboard/page.tsx; app/restaurant/reports/page.tsx; app/restaurant/social/page.tsx; app/admin/page.tsx; components/admin/TenantList.tsx; components/layout/Sidebar.tsx; components/layout/PortalNavbar.tsx; tests/static/no-fabricated-ui.test.ts

### S1-P01-T008 — Provision Railway staging environment

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 8 | P01 Project Foundation | DevOps Engineer | High | 2d | — | — | 2026-09-15 | — | BLOCKED |

- **Dependencies:** S1-P01-T004
- **Requirements:** REQ-OPS-001, REQ-OPS-008
- **Baseline:** [fact] No Railway configuration in repository; deployment docs are v1.0 statements only.
- **Objective:** A continuously deployed staging environment exists from the first weeks so integration issues surface early.
- **Technical work:**
  - Create Railway project `rasoios` with environment `staging`: Next.js service (Nixpacks or Dockerfile — record choice), PostgreSQL service.
  - Configure build `npm ci && npm run prisma:gen && npm run build`, start `npm run start`, pre-deploy `npm run prisma:deploy` (once migrations exist).
  - Set staging variables from `lib/env.ts` schema using Clerk development instance keys.
  - Connect GitHub `main` for auto-deploy to staging; record service URLs in `operations/railway.md`.
- **Files/modules:** `railway.json` (or `railway.toml`), `operations/railway.md`
- **Database:** Staging PostgreSQL.
- **API:** None.
- **Frontend:** None.
- **Security:** SC-SEC-02, SC-DB-01.
- **Tests:**
  - `TC-OPS-001` [smoke] Staging URL serves the current `main` build over HTTPS after merge.
- **Acceptance criteria:**
  - Merge to `main` deploys to staging without manual steps.
  - No secret values are committed.
- **Implementation notes:** Repo side done: railway.json (Railpack builder, build 'npm run prisma:gen && npm run build', start 'npm run start', interim health check '/', ON_FAILURE restart x3); pre-deploy migrate deferred to S1-P02-T003 (no migrations yet); /api/ready switch stays in S1-P26-T003. tests/static/deploy-config.test.ts verifies scripts exist, prisma gen precedes build, no secrets. Provisioning runbook in knowledge/operations/railway.md. BLOCKED: creating the Railway project is outward-facing and possibly billable; the CLI (v5.43.1) is signed in to an account whose workspaces include another person's, and no rasoios project exists — Project Owner must confirm workspace/plan and connect GitHub main (repo not yet pushed). TC-OPS-001 not run.
- **Affected files (actual):** railway.json; tests/static/deploy-config.test.ts; knowledge/operations/railway.md; knowledge/implementation/slice-01/tasks.md (S1-P02-T003 pre-deploy note)

### S1-P01-T009 — Developer setup guide

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 9 | P01 Project Foundation | Backend Engineer | Medium | 1d | — | — | 2026-09-15 | — | IN_PROGRESS |

- **Dependencies:** S1-P01-T002, S1-P01-T004
- **Requirements:** REQ-NFR-007
- **Baseline:** [fact] Repository has no `README.md`.
- **Objective:** A new developer or AI agent can run the project locally without guessing.
- **Technical work:**
  - Write `README.md`: prerequisites (Node LTS, PostgreSQL 16 or Docker), `docker-compose.yml` for local PostgreSQL, env setup from `.env.example`, Clerk development instance setup, commands, test layers, link to `knowledge/README.md`.
  - Add `docker-compose.yml` with PostgreSQL service matching staging major version.
- **Files/modules:** `README.md`, `docker-compose.yml`
- **Database:** Local PostgreSQL definition.
- **API:** None.
- **Frontend:** None.
- **Security:** None.
- **Tests:**
  - `TC-FOUND-008` [manual] A fresh clone following README reaches a running app with seeded data (recorded by a second person or the owner).
- **Acceptance criteria:**
  - README steps complete without undocumented actions.
- **Implementation notes:** README.md (prerequisites, three PostgreSQL options incl. owner-chosen embedded 'npm run db:local' via embedded-postgres 16.14.0-beta.17 [MIT; dev-only; SC-DEP-03 note in database.md], Clerk dev instance, env, prisma, commands, test layers, CI/deploy, troubleshooting incl. Windows prisma EPERM); docker-compose.yml postgres:16 loopback; scripts/db-local.ts; CLAUDE.md commands updated (db:local, db:seed); .env.example updated. Static checks in tests/static/deploy-config.test.ts. Verified path on this machine: db:local → cluster created → prisma:gen → integration probe green. Remaining: TC-FOUND-008 fresh-clone run by a second person or the owner.
- **Affected files (actual):** README.md; docker-compose.yml; scripts/db-local.ts; package.json; .gitignore; CLAUDE.md; .env.example; tests/static/deploy-config.test.ts

### S1-P01-T010 — Decision gate A: approve schema-affecting decisions

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 10 | P01 Project Foundation | Gopala Krishna (Project Owner) | Critical | 2d | — | — | 2026-09-15 | 2026-09-15 | COMPLETED |

- **Dependencies:** none
- **Requirements:** REQ-PLAT-001, REQ-TENANT-005
- **Baseline:** ADR-006…ADR-011 are PROPOSED; Q-002, Q-004, Q-016, Q-017, Q-022, Q-029 open.
- **Objective:** Resolve decisions that change the database schema or plan capacity before P02 starts.
- **Technical work:**
  - Review and set status (ACCEPTED / REJECTED / AMENDED) for RASOIOS-ADR-006, 007, 008, 009, 010, 011.
  - Answer Q-002 (restaurants per tenant), Q-004 (tax model), Q-016 (capacity), Q-017 (existing data), Q-022 (dietary values), Q-029 (session lifetime).
  - Record decisions in `decisions/` and `open-questions.md`; if any answer differs from the recommendation, update affected docs before P02 starts.
- **Files/modules:** `knowledge/decisions/*`, `knowledge/implementation/slice-01/open-questions.md`
- **Database:** Determines `data-model.md` final shape.
- **API:** None.
- **Frontend:** None.
- **Security:** None.
- **Tests:**
  - None — decision record.
- **Acceptance criteria:**
  - Each listed ADR has a non-PROPOSED status with date.
  - Each listed question has status ANSWERED with the decision text.
- **Implementation notes:** Project Owner accepted all gate A recommendations on 2026-09-15 (AskUserQuestion in the implementation session). ADR-006, 007, 008, 009, 010, 011 set APPROVED (v1.1). Q-002 A (1 restaurant per tenant), Q-004 A + C (tax-exclusive per-item rate; CGST/SGST receipt split when RESTAURANT.gstin set — added to ADR-010 §3, data-model E02 gstin, api SA-RST-04, new REQ-TXN-011, tests TC-REST-009, TC-PRICE-003, TC-PRINT-017 in S1-P07-T001/S1-P12-T002/S1-P16-T002, S1-P18-T008), Q-016 A (AI agents supervised by owner; README §Governance), Q-017 A (verified: only DATABASE_URL is localhost, no PostgreSQL installed, no Railway project), Q-022 A (VEG/NON_VEG/EGG), Q-029 A (12 h / 2 h; security.md). Owner also chose embedded PostgreSQL for local/test databases (no Docker/PostgreSQL on the machine).
- **Affected files (actual):** knowledge/decisions/RASOIOS-ADR-003,004,006-011.md; knowledge/decisions.md; knowledge/README.md; knowledge/KNOWLEDGE-BASE.md; knowledge/implementation/slice-01/{open-questions,data-model,security,api,prd,traceability,testing,tasks,README}.md

## P02 — Database Foundation

11 tasks · 24 ideal days of effort · sequence #11–#21 (interleaved with other phases where dependencies allow)

### S1-P02-T001 — Confirm PostgreSQL version and capabilities

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 11 | P02 Database Foundation | Database Engineer | High | 1d | — | — | 2026-09-15 | — | IN_PROGRESS |

- **Dependencies:** S1-P01-T008
- **Requirements:** REQ-OPS-001, REQ-TENANT-005
- **Baseline:** [assumption] Railway PostgreSQL ≥ 15 (needed for `UNIQUE NULLS NOT DISTINCT`).
- **Objective:** Verify database features the schema relies on before writing migrations.
- **Technical work:**
  - Query `SELECT version()` on staging; check support for `NULLS NOT DISTINCT`, `gen_random_uuid()`, role creation privileges.
  - Pin local Docker and CI service image to the same major version.
  - Record results in `database/database.md`; if < 15, switch KOT unique constraint to the COALESCE expression index documented in data-model E17.
- **Files/modules:** `docker-compose.yml`, `.github/workflows/ci.yml`, `knowledge/database/database.md`
- **Database:** Version probe only.
- **API:** None.
- **Frontend:** None.
- **Security:** None.
- **Tests:**
  - `TC-DB-008` [integration] Feature probe script asserts `NULLS NOT DISTINCT` and `gen_random_uuid()` work on the CI database.
- **Acceptance criteria:**
  - Staging, CI and local use the same PostgreSQL major version, recorded with evidence.
- **Implementation notes:** Local (embedded, npm run db:local) is PostgreSQL 16.14 (server_version_num 160014, UTF8); docker-compose.yml and CI service pinned to postgres:16. TC-DB-008 tests/integration/db/feature-probe.test.ts passes 4/4 locally: version 16.x, UNIQUE NULLS NOT DISTINCT enforced (verified inside one transaction), gen_random_uuid() present, UTF8. Evidence recorded in knowledge/database/database.md. Remaining: staging Railway PostgreSQL major version (depends on S1-P01-T008, BLOCKED by owner).
- **Affected files (actual):** tests/integration/db/feature-probe.test.ts; knowledge/database/database.md; knowledge/operations/railway.md

### S1-P02-T002 — Author Prisma schema v2

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 12 | P02 Database Foundation | Database Engineer | Critical | 4d | — | — | 2026-09-15 | 2026-09-22 | COMPLETED |

- **Dependencies:** S1-P01-T010, S1-P02-T001
- **Requirements:** REQ-TENANT-001, REQ-TXN-009, REQ-ORDER-006, REQ-PLAT-001, REQ-TZ-002
- **Baseline:** [fact] `prisma/schema.prisma` has 15 models; gaps listed in erd.md §7.
- **Objective:** Implement `data-model.md` exactly as the single schema source.
- **Technical work:**
  - Rewrite `prisma/schema.prisma` with entities E01–E27 (E28 only if Q-009 approved), all enums from data-model §1.6, `@@map`/`@map` snake_case, `@db.Uuid`, `@db.Timestamptz(6)`, `@db.Decimal(12,2)`, `@db.Decimal(5,2)`, `@db.VarChar(n)`.
  - Composite uniques `@@unique([tenantId, id])` on referenced models; composite relations `@relation(fields: [tenantId, parentId], references: [tenantId, id], onDelete: Restrict)`.
  - Indexes exactly as data-model tables; `version Int @default(0)` on Order.
  - Review schema against INV-10: no plan, tier, subscription, billing or feature-flag fields.
- **Files/modules:** `prisma/schema.prisma`
- **Database:** TENANT, RESTAURANT, RESTAURANT_HOURS, KITCHEN_SECTION, USER, USER_TENANT, MENU_CATEGORY, MENU_ITEM, MENU_ITEM_VARIANT, MENU_ITEM_ADDON, DAILY_MENU, DAILY_MENU_ITEM, CUSTOMER, ORDER, ORDER_ITEM, ORDER_ITEM_ADDON, KOT_TICKET, KOT_ITEM, TRANSACTION, BUSINESS_DAY_CLOSE, PRINTER, PRINT_AGENT, PRINT_JOB, AUDIT_LOG, SOCIAL_POST, TENANT_COUNTER, RATE_LIMIT_BUCKET.
- **API:** None.
- **Frontend:** None.
- **Security:** SC-TEN-05, SC-DB-03.
- **Tests:**
  - `TC-DB-003` [static] `prisma validate` passes; static test fails if any model/field/enum name matches `/plan|tier|subscription|billing|feature_?flag/i`.
- **Acceptance criteria:**
  - Every entity and field in data-model.md exists with the specified type, nullability and default.
  - `npx prisma generate` succeeds and TypeScript compiles.
- **Implementation notes:** prisma/schema.prisma v2: 27 models (E01–E27; E28 MEDIA_ASSET omitted pending Q-009), 27 enums, snake_case @@map/@map, UUID ids via gen_random_uuid(), NUMERIC(12,2)/(5,2), TIMESTAMPTZ(6), DATE business dates, @@unique([tenantId, id]) on all 22 tenant-owned models with ids, composite (tenantId, parentId) relations with Restrict (two documented Cascades). Independent field-by-field audit 2026-09-22: 27 tables / 372 columns / 27 enums match data-model.md; 3 blocking findings resolved (E11 copied_from stays RESTRICT because Prisma cannot express column-list SET NULL — documented, service clears references; E15 line_subtotal formula CHECK added; E17 queued_at doc corrected to NOT NULL) and minor doc corrections applied. TC-DB-003 static naming test passes; prisma generate and tsc pass. Baseline code was retrofitted to compile against v2.
- **Affected files (actual):** prisma/schema.prisma; tests/static/schema-names.test.ts; knowledge/implementation/slice-01/data-model.md; knowledge/implementation/slice-01/erd.md; app/**, lib/services/**, components/** (retrofit)

### S1-P02-T003 — Create migration baseline 0001_init with raw SQL constraints

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 13 | P02 Database Foundation | Database Engineer | Critical | 3d | — | — | 2026-09-15 | — | IN_PROGRESS |

- **Dependencies:** S1-P02-T002
- **Requirements:** REQ-TENANT-005, REQ-AUDIT-003, REQ-TXN-009, REQ-TZ-002, REQ-OPS-003
- **Baseline:** [fact] No `prisma/migrations/` directory.
- **Objective:** A reproducible migration that enforces invariants Prisma cannot express.
- **Technical work:**
  - `prisma migrate dev --create-only --name init`, then append SQL: partial unique indexes (`lower(name)` + `archived_at IS NULL`), `UNIQUE NULLS NOT DISTINCT` for KOT_TICKET, CHECK constraints (money ≥ 0, `total_amount = subtotal_amount + tax_amount - discount_amount`, `line_total = line_subtotal + line_tax`, `refunded_amount <= paid_amount`, tax 0–100, `discount_amount = 0`).
  - Trigger function `audit_logs_immutable()` raising on UPDATE/DELETE; trigger on `audit_logs`.
  - If Q-017 reports existing data: add data-preservation steps (child `tenant_id` backfill, JSON variants → rows); otherwise document "no data preserved".
  - Add `"preDeployCommand": ["npm run prisma:deploy"]` to `railway.json` in the same change (deferred from S1-P01-T008 because no migrations existed).
- **Files/modules:** `prisma/migrations/0001_init/migration.sql`, `railway.json`
- **Database:** All tables; constraints; trigger.
- **API:** None.
- **Frontend:** None.
- **Security:** SC-AUD-03, SC-DB-03, SC-TEN-05.
- **Tests:**
  - `TC-DB-001` [integration] `prisma migrate deploy` applies to an empty database and `prisma migrate diff` shows no drift.
  - `TC-DB-005` [integration] CHECK constraints reject negative money, inconsistent totals and non-zero discount.
  - `TC-AUDIT-003` [integration] `UPDATE audit_logs` and `DELETE FROM audit_logs` raise an exception.
  - `TC-DB-007` [integration] All timestamp columns are `timestamptz`; inserted instants round-trip in UTC.
- **Acceptance criteria:**
  - Migration applies cleanly in CI and staging.
  - Every constraint listed in data-model.md has a passing negative test.
- **Implementation notes:** prisma/migrations/0001_init: generated DDL plus hand-written SQL — 8 partial/expression unique indexes (lower(name) where archived_at IS NULL, default variant, customer phone, printer/agent names, KOT U-KOT-2 recreated with NULLS NOT DISTINCT under the schema-declared name so drift stays empty), 51 CHECK constraints (money >= 0, total = subtotal + tax - discount, discount = 0, line_total = subtotal + tax, line_subtotal = (unit + add-ons) x qty, refunded <= paid, tax 0–100, ledger/void/refund/tender rules, PRINTED implies printed_at, KOT job implies kot_ticket_id, …), audit_logs_immutable() trigger for UPDATE/DELETE plus a statement-level guard against emptying the table. Q-017: no data preserved. railway.json preDeployCommand npm run prisma:deploy added (+ static test). Local tests pass: TC-DB-001 (deploy on empty DB, migrate diff empty), TC-DB-005 (negative case for every CHECK — a meta-test enumerates pg_constraint — and every hand-written unique index), TC-AUDIT-003, TC-DB-007. REMAINING: acceptance 'applies cleanly in CI and staging' needs the first GitHub Actions run (S1-P01-T006) and Railway staging (S1-P01-T008, deferred by the owner).
- **Affected files (actual):** prisma/migrations/0001_init/migration.sql; prisma/migrations/migration_lock.toml; railway.json; tests/integration/db/migration.test.ts; tests/integration/db/constraints.test.ts; tests/static/deploy-config.test.ts

### S1-P02-T004 — Verify composite foreign-key tenant integrity

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 14 | P02 Database Foundation | Database Engineer | Critical | 1d | — | — | 2026-09-22 | 2026-09-22 | COMPLETED |

- **Dependencies:** S1-P02-T003
- **Requirements:** REQ-TENANT-005, REQ-TENANT-003
- **Baseline:** [fact] BA-25 single-column child FKs.
- **Objective:** Prove the database rejects cross-tenant references for every parent–child pair.
- **Technical work:**
  - Generate a table of every composite FK from `pg_constraint`; for each, insert a child with Tenant A `tenant_id` and a Tenant B parent id and assert failure.
- **Files/modules:** `tests/integration/db/composite-fk.test.ts`
- **Database:** All composite FKs.
- **API:** None.
- **Frontend:** None.
- **Security:** SC-TEN-05.
- **Tests:**
  - `TC-DB-004` [integration] For each composite FK, cross-tenant child insert fails with a foreign-key violation.
- **Acceptance criteria:**
  - Test enumerates FKs from the catalogue (new FKs are covered automatically) and all pass.
- **Implementation notes:** tests/integration/db/composite-fk.test.ts reads every FK from pg_constraint: 29 composite (tenant_id, parent_id) FKs; for each, a Tenant A row is pointed at a Tenant B parent and must fail with 23503 naming that FK (all 29 do). Also asserts no single-column FK between tenant-owned tables, parent columns always (tenant_id, id), ON DELETE RESTRICT except the two documented cascades, and direct cross-tenant inserts fail. createFullTenant() fills every optional tenant FK so new FKs are covered automatically. The composite FKs also caught a real seed bug (an order pointing at another tenant's customer).
- **Affected files (actual):** tests/integration/db/composite-fk.test.ts; tests/factories/index.ts

### S1-P02-T005 — Database client, data-access skeleton and statement timeout

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 15 | P02 Database Foundation | Backend Engineer | Critical | 2d | — | — | 2026-09-22 | 2026-09-22 | COMPLETED |

- **Dependencies:** S1-P02-T003
- **Requirements:** REQ-TENANT-002, REQ-SEC-001
- **Baseline:** [fact] `lib/db/prisma.ts` singleton exists; no `lib/data`.
- **Objective:** Create the only sanctioned path to tenant-owned data (ADR-008).
- **Technical work:**
  - Keep singleton; add `import "server-only"`; set `statement_timeout=10000` via connection `options` for runtime; log query events > 500 ms.
  - Create `lib/data/` with `index.ts` conventions, DTO mapper helpers, `NotFoundError` mapping, transaction helper `withTx(ctx, fn)`.
  - Create `lib/auth/context-types.ts` (`TenantContext`, `PlatformContext`, `AgentContext` types from tenant-isolation.md §2.1).
- **Files/modules:** `lib/db/prisma.ts`, `lib/data/*`, `lib/auth/context-types.ts`
- **Database:** Connection settings.
- **API:** None.
- **Frontend:** None.
- **Security:** SC-TEN-02, SC-DB-04.
- **Tests:**
  - `TC-DB-006` [integration] A query exceeding the runtime statement timeout is cancelled with a mapped error.
- **Acceptance criteria:**
  - `lib/data` exists with documented patterns from tenant-isolation.md §3.1.
- **Implementation notes:** lib/db/prisma.ts: import server-only; createPrismaClient() adds -c statement_timeout=10000 via the connection options parameter (verified SHOW statement_timeout = 10s) and logs queries >= 500 ms (duration + statement text, never parameters). lib/data: index.ts conventions (7 rules from tenant-isolation.md §3.1), scope.ts (tenantScope, tenantKey, required, notFoundOrConflict), dto.ts, errors.ts (P2025→404, P2002/P2034→409, 57014→503 SERVICE_UNAVAILABLE with no SQL in messages), tx.ts withTx(ctx, fn). lib/auth/context-types.ts (Tenant/Platform/Agent/System contexts). lib/errors.ts gains ConflictError and ServiceUnavailableError. server-only 0.0.1 added as an explicit dependency; Vitest aliases it to its empty module. TC-DB-006 passes (a 5 s pg_sleep under a 300 ms timeout is cancelled and mapped to 503); lib/data helpers 100% line coverage.
- **Affected files (actual):** lib/db/prisma.ts; lib/data/index.ts; lib/data/scope.ts; lib/data/dto.ts; lib/data/errors.ts; lib/data/tx.ts; lib/auth/context-types.ts; lib/errors.ts; vitest.config.ts; package.json; tests/integration/db/client.test.ts; tests/unit/data-layer.test.ts

### S1-P02-T006 — Static tenant-scope guard

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 16 | P02 Database Foundation | Security Engineer | Critical | 2d | — | — | 2026-09-22 | 2026-09-22 | COMPLETED |

- **Dependencies:** S1-P02-T005
- **Requirements:** REQ-TENANT-002, REQ-TENANT-003
- **Baseline:** [fact] Unscoped `findUnique({ where: { id } })` in `app/restaurant/billing/receipt/[orderId]/page.tsx:12`.
- **Objective:** Unscoped tenant queries fail CI before review.
- **Technical work:**
  - `tests/static/tenant-scope.test.ts` using the TypeScript compiler API: (a) imports of `@/lib/db/prisma` outside allowed paths fail; (b) in `lib/data/**`, calls on tenant-owned model delegates with `findUnique|update|delete|upsert` whose `where` lacks `tenantId` or `tenantId_id` fail; (c) allow-list with justification comments.
  - Tenant-owned model list derived from Prisma DMMF (fields named `tenantId`).
- **Files/modules:** `tests/static/tenant-scope.test.ts`
- **Database:** None.
- **API:** None.
- **Frontend:** None.
- **Security:** SC-TEN-03.
- **Tests:**
  - `TC-TENANT-002` [static] Fixture with `db.order.findUnique({ where: { id } })` fails; scoped fixture passes; baseline violations are listed.
- **Acceptance criteria:**
  - Guard runs in the `static` CI job; known baseline violations tracked until P04 retrofit removes them.
- **Implementation notes:** tests/static/lib/tenant-scope-analyzer.ts (TypeScript compiler API) flags calls on tenant-owned delegates (derived from the Prisma DMMF: 24 models with tenantId) for findUnique/First/Many, update(Many), delete(Many), upsert, count, aggregate and groupBy whose where lacks tenantId, tenantId_id, tenantScope() or tenantKey(); an exemption needs '// tenant-scope-exempt: <reason>'. tests/static/tenant-scope.test.ts (TC-TENANT-002): fixtures prove unscoped calls fail and accepted forms pass; lib/data has 0 violations; the baseline is tracked exactly (34 unscoped queries in 11 files; 19 files importing Prisma outside lib/data) and may only shrink — this is the P04-T007/T008 retrofit worklist. Runs in the static CI job.
- **Affected files (actual):** tests/static/lib/tenant-scope-analyzer.ts; tests/static/tenant-scope.test.ts

### S1-P02-T007 — Development seed with two isolated tenants

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 17 | P02 Database Foundation | Backend Engineer | High | 3d | — | — | 2026-09-22 | 2026-09-22 | COMPLETED |

- **Dependencies:** S1-P02-T003
- **Requirements:** REQ-TENANT-010, REQ-RBAC-001
- **Baseline:** [fact] No seed script.
- **Objective:** Realistic data for development and tests, designed to expose isolation defects.
- **Technical work:**
  - `prisma/seed.ts`: SUPER_ADMIN from `SUPER_ADMIN_BOOTSTRAP_EMAIL`; Tenant A "Spice Route" (`Asia/Kolkata`, INR) and Tenant B "Harbour Grill" (`America/New_York`, USD) with restaurants, hours (incl. split and overnight shift), kitchen sections, one user per tenant role per tenant (distinct emails), categories, items with variants/add-ons, daily menus (past/today/future), customers, orders across every status, KOTs, transactions (payments, refunds, void), printers, agents (pending/active/revoked), print jobs in every status, social posts, audit rows.
  - Deterministic IDs via fixed UUIDs for tests; idempotent upserts; refuses to run when `NODE_ENV=production` or database host matches production.
- **Files/modules:** `prisma/seed.ts`, `prisma/seed-data/*`
- **Database:** All entities.
- **API:** None.
- **Frontend:** None.
- **Security:** SC-TEN-10.
- **Tests:**
  - `TC-DB-002` [integration] Seed runs twice without duplicates and creates two tenants with every tenant role.
  - `TC-DB-009` [unit] Seed exits non-zero when `NODE_ENV=production`.
- **Acceptance criteria:**
  - Same-name entities exist in both tenants (e.g. category "Starters") so leaks are detectable by content.
- **Implementation notes:** prisma/seed.ts + prisma/seed-data/{guard,ids,tenants,build}.ts. Tenant A Spice Route (Asia/Kolkata, INR, GSTIN, website published) and Tenant B Harbour Grill (America/New_York, USD, unpublished): split and overnight hours, sections, one ACTIVE user per tenant role (+clerk_test emails, Clerk dev code 424242) plus an INVITED waiter, categories Starters/Mains/Beverages in both, variants and add-ons, daily menus (yesterday/today published, tomorrow draft copy), customers ('Sam Taylor' in both), 10 orders per tenant covering all 7 order statuses and all 5 payment statuses, KOTs in all 5 statuses, payments/refunds/void, a day close, agents PENDING_PAIRING/ACTIVE/REVOKED (hashes only), printers, print jobs PENDING/PROCESSING/PRINTED/FAILED and KOT/RECEIPT/TEST, social posts, counters and audit rows. Deterministic UUID v5 ids; createMany skipDuplicates, so a second run inserts 0 rows and never updates audit_logs. Optional SUPER_ADMIN from SUPER_ADMIN_BOOTSTRAP_EMAIL. The guard refuses NODE_ENV=production and non-local hosts (unless SEED_ALLOW_REMOTE=1) before any connection. Local run: 339 rows, rerun 0. TC-DB-002 (11 checks incl. INV-02/03/04/05 and counters) and TC-DB-009 (guard + CLI exit 1) pass.
- **Affected files (actual):** prisma/seed.ts; prisma/seed-data/guard.ts; prisma/seed-data/ids.ts; prisma/seed-data/tenants.ts; prisma/seed-data/build.ts; tests/integration/db/seed.test.ts; tests/unit/seed-guard.test.ts

### S1-P02-T008 — Integration test harness with real PostgreSQL

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 18 | P02 Database Foundation | QA Engineer | Critical | 3d | — | — | 2026-09-22 | — | IN_PROGRESS |

- **Dependencies:** S1-P02-T003, S1-P01-T006
- **Requirements:** REQ-TEST-002, REQ-TENANT-010
- **Baseline:** [fact] All 42 tests mock Prisma.
- **Objective:** Tests exercise real SQL, constraints and transactions.
- **Technical work:**
  - Vitest `integration` project with global setup: create database per worker (`rasoios_test_<worker>`), `prisma migrate deploy`, seed fixtures; per-test transaction rollback helper or truncate strategy.
  - Factories for each entity; `tenantA`/`tenantB` fixture handles; clock injection helper for business-date tests.
  - Keep existing unit tests for pure logic; mark baseline mocked service tests for replacement.
- **Files/modules:** `vitest.config.ts`, `tests/integration/setup/*`, `tests/factories/*`
- **Database:** Test databases.
- **API:** None.
- **Frontend:** None.
- **Security:** SC-TEN-10.
- **Tests:**
  - `TC-QA-001` [ci] Integration job runs on every PR against real PostgreSQL and fails the build on any failure.
- **Acceptance criteria:**
  - Integration suite runs in < 5 minutes in CI at baseline size.
- **Implementation notes:** Vitest integration project: global setup creates a run-scoped template database, applies prisma migrate deploy and provides it to workers; per-worker setup copies it (rasoios_it_<run>_w<n>) and sets DATABASE_URL before imports; teardown drops all run databases; refuses non-local servers unless ALLOW_REMOTE_TEST_DATABASE=1. Helpers testDb, resetDatabase, withRollback, sqlState, freezeTime; factories for every entity, createTenantPair, createFullTenant. tests/README.md lists the baseline Prisma-mocking unit tests with the tasks that replace them. Local: 8 integration files, ~100 tests, ~17 s. CI integration job: migrate deploy on an empty DB, drift check, seed twice, test:integration. REMAINING: TC-QA-001 and the '< 5 minutes in CI' criterion need the first GitHub Actions run (S1-P01-T006).
- **Affected files (actual):** vitest.config.ts; tests/integration/setup/*; tests/integration/harness.test.ts; tests/factories/index.ts; tests/README.md; .github/workflows/ci.yml; eslint.config.mjs

### S1-P02-T009 — Migration strategy and runbook

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 19 | P02 Database Foundation | Database Engineer | High | 1d | — | — | 2026-09-22 | — | IN_PROGRESS |

- **Dependencies:** S1-P02-T003
- **Requirements:** REQ-OPS-003, REQ-OPS-007
- **Baseline:** [fact] `database/migration-strategy.md` v1.0 has three bullet rules.
- **Objective:** Safe, repeatable schema evolution across environments.
- **Technical work:**
  - Document dev (`migrate dev`), CI (`migrate deploy` + drift check), staging/production (`migrate deploy` pre-deploy with backup), expand–contract for renames/drops, forbidden manual DDL, seed never in production.
  - CI step `prisma migrate diff --from-migrations --to-schema-datamodel` fails on drift.
- **Files/modules:** `knowledge/database/migration-strategy.md`, `.github/workflows/ci.yml`
- **Database:** Process only.
- **API:** None.
- **Frontend:** None.
- **Security:** SC-BAK-02.
- **Tests:**
  - `TC-DB-010` [integration] CI round trip: reset, deploy, drift check returns empty.
- **Acceptance criteria:**
  - Runbook reviewed; drift check active in CI.
- **Implementation notes:** knowledge/database/migration-strategy.md v2.1: verified local/test/CI steps, how to add hand-written SQL without drift, rules (no edits after a migration leaves your machine — the single pre-release amendment of 0001_init is recorded; no manual DDL; expand–contract; roll forward; seed never in production) and a command table. The CI integration job runs prisma migrate diff --from-url … --to-schema-datamodel … --exit-code. TC-DB-010 passes (migrations replayed into an empty shadow database diff to empty). REMAINING: owner review of the runbook; the drift check first executes in GitHub Actions on the first push.
- **Affected files (actual):** knowledge/database/migration-strategy.md; .github/workflows/ci.yml; tests/integration/db/migration.test.ts

### S1-P02-T010 — Money primitives

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 20 | P02 Database Foundation | Backend Engineer | Critical | 2d | — | — | 2026-09-22 | 2026-09-22 | COMPLETED |

- **Dependencies:** S1-P02-T005
- **Requirements:** REQ-TXN-009, REQ-ORDER-003, REQ-NFR-008, REQ-TEST-001
- **Baseline:** [fact] Decimal used in `lib/services/orders.ts:94-130`; `Number()` used for money in reports (BA-24).
- **Objective:** One tested library for parsing, rounding and formatting money.
- **Technical work:**
  - `lib/money/index.ts`: `parseMoney(str)` (regex `^\d{1,10}(\.\d{1,2})?$`, rejects exponent, sign, >2 dp), `roundHalfUp(d, 2)`, `sumMoney`, `toMoneyString(d)`, `zodMoney` schema; `formatMoney(amountStr, currency, locale)` in `lib/ui/format.ts` (client-safe, `Intl.NumberFormat`).
  - Decimal configured with `ROUND_HALF_UP` explicitly per call (no global mutation).
- **Files/modules:** `lib/money/index.ts`, `lib/ui/format.ts`
- **Database:** None.
- **API:** Used by all money inputs.
- **Frontend:** `formatMoney`.
- **Security:** SC-VAL-02.
- **Tests:**
  - `TC-PRICE-001` [unit] Table-driven parse/round/format cases incl. `"0.005"` rounding, `"1e3"` rejected, `"-1"` rejected, INR and USD formatting.
- **Acceptance criteria:**
  - 100% line coverage of `lib/money`.
- **Implementation notes:** lib/money/index.ts: parseMoney (up to 10 integer digits and 2 decimals; rejects sign, exponent, more than 2 dp, spaces, grouping and non-strings), roundHalfUp (explicit ROUND_HALF_UP per call, immune to the global Decimal mode), sumMoney, toMoneyString, percentOf, zodMoney({positive,min,max}), zodTaxRate. lib/ui/format.ts formatMoney passes the decimal string to Intl.NumberFormat (exact, no float) and localeForCountry. TC-PRICE-001: 45 table-driven cases incl. 0.005→0.01, 2.675→2.68, 1e3 and -1 rejected, INR (₹12,34,567.50) and USD formatting. Coverage lib/money 100% lines and branches.
- **Affected files (actual):** lib/money/index.ts; lib/ui/format.ts; tests/unit/money.test.ts

### S1-P02-T011 — Time and business-date primitives

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 21 | P02 Database Foundation | Backend Engineer | Critical | 2d | — | — | 2026-09-22 | 2026-09-22 | COMPLETED |

- **Dependencies:** S1-P02-T005
- **Requirements:** REQ-TZ-002, REQ-TZ-004, REQ-TZ-006, REQ-WEB-006, REQ-TEST-001
- **Baseline:** [fact] Business day computed at server-local midnight (`lib/services/orders.ts:47-53`, BA-14).
- **Objective:** Correct restaurant-local dates and ranges independent of server timezone.
- **Technical work:**
  - `lib/time/business-date.ts` `businessDateFor(instant, tz)`; `lib/time/zoned-range.ts` `utcRangeForBusinessDates(from, to, tz)` resolving local midnight offsets; `lib/time/opening-hours.ts` `isOpenAt(hours, instant, tz)` with overnight shifts and `nextChange`; `lib/ui/format.ts` `formatInZone(iso, tz, style)`; `isValidTimeZone(tz)` via `Intl.supportedValuesOf`.
  - Injectable clock (`lib/time/clock.ts`) for tests.
- **Files/modules:** `lib/time/*`, `lib/ui/format.ts`
- **Database:** None.
- **API:** Used by services.
- **Frontend:** `formatInZone`.
- **Security:** None.
- **Tests:**
  - `TC-TZ-004` [unit] `utcRangeForBusinessDates` correct for Asia/Kolkata, America/New_York and Europe/London including DST start/end days.
  - `TC-TZ-002` [unit] `isOpenAt` handles split shifts, closed days and overnight closing.
- **Acceptance criteria:**
  - Tests pass with process `TZ` set to `UTC`, `Asia/Kolkata` and `America/Los_Angeles`.
- **Implementation notes:** lib/time: zone.ts (isValidTimeZone = IANA shape + Intl.DateTimeFormat — not Intl.supportedValuesOf, which omits Asia/Kolkata and UTC on Node 24; localParts, offsetMs, zonedTimeToUtc with DST gap moved forward by the gap and overlap resolved to the earlier instant), business-date.ts (businessDateFor, parseIsoDate, addDays), zoned-range.ts utcRangeForBusinessDates [start, end), opening-hours.ts isOpenAt/nextChange (split, overnight, closed days, back-to-back shifts), clock.ts (now, fixedClock, overrideClock — test only); lib/ui/format.ts formatInZone and formatBusinessDate. TC-TZ-004 (Kolkata; New York incl. 23 h and 25 h DST days; London DST), TC-TZ-002 and TC-TZ-001 pass, each scenario under process TZ UTC, Asia/Kolkata and America/Los_Angeles. Coverage lib/time 97.7% lines. data-model E02 timezone rule corrected.
- **Affected files (actual):** lib/time/*; lib/ui/format.ts; tests/unit/time.test.ts; knowledge/implementation/slice-01/data-model.md

## P03 — Authentication

9 tasks · 17 ideal days of effort · sequence #22–#72 (interleaved with other phases where dependencies allow)

### S1-P03-T001 — Configure Clerk Email OTP instances

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 22 | P03 Authentication | Backend Engineer | Critical | 1d | — | — | 2026-09-22 | — | BLOCKED |

- **Dependencies:** S1-P01-T004
- **Requirements:** REQ-AUTH-001, REQ-AUTH-002, REQ-AUTH-004
- **Baseline:** [fact] `@clerk/nextjs` installed; sign-in/up pages exist; instance configuration not recorded.
- **Objective:** Clerk is configured for passwordless email code sign-in with invitation-only access.
- **Technical work:**
  - Development and production Clerk applications: enable email address identifier + email verification code; disable password, magic link, social, phone; set sign-up mode Restricted; configure session lifetime per Q-029.
  - Configure allowed redirect origins (staging, production, localhost).
  - Record configuration checklist in `operations/railway.md` / deployment.md DEP-CHK-04.
- **Files/modules:** Clerk dashboard; `knowledge/implementation/slice-01/deployment.md`
- **Database:** None.
- **API:** None.
- **Frontend:** Clerk components pick up strategies.
- **Security:** SC-AUTH-01, SC-AUTH-05, SC-SESS-04.
- **Tests:**
  - `TC-AUTH-001` [e2e] Invited test user signs in with email code using Clerk testing tokens.
  - `TC-AUTH-002` [e2e] Wrong code shows an error and no session is created.
- **Acceptance criteria:**
  - Password and social sign-in options do not appear on `/sign-in`.
  - Configuration checklist recorded for both instances.
- **Implementation notes:** Observed the development instance through its public Frontend API (GET /v1/environment) on 2026-09-22: email code enabled, but password ON, Google social sign-in ON and sign-up mode PUBLIC — all three contradict SC-AUTH-01/SC-AUTH-05. These are Clerk dashboard settings (not changeable from code). Exact checklist recorded in deployment.md §11a (DEP-CHK-04/06), README step 3 updated. The app already enforces invite-only access regardless (TC-AUTH-006). BLOCKED: Project Owner to apply §11a in the Clerk dashboard (dev now, prod at S1-P27-T005). TC-AUTH-001/002 (Clerk testing-token sign-in E2E) then need test users to exist in the Clerk dev instance — creating them via the Backend API is a write to the owner's Clerk account and awaits approval.
- **Affected files (actual):** knowledge/implementation/slice-01/deployment.md; README.md

### S1-P03-T002 — Fail-closed middleware and protected route allowlist

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 23 | P03 Authentication | Backend Engineer | Critical | 2d | — | — | 2026-09-22 | 2026-09-22 | COMPLETED |

- **Dependencies:** S1-P03-T001
- **Requirements:** REQ-AUTH-005, REQ-AUTH-007, REQ-AUTH-009, REQ-TEST-004
- **Baseline:** [fact] `middleware.ts:15-30` and `app/layout.tsx:13-34` bypass auth when key looks like a placeholder (BA-04).
- **Objective:** Every non-public route requires a Clerk session in every environment.
- **Technical work:**
  - Rewrite `middleware.ts`: always `clerkMiddleware`; public matcher per security.md §2.2; `/api/v1/*` (session) returns 401 JSON instead of redirect; `/api/v1/print-agent/*` and `/api/webhooks/clerk` bypass Clerk session (own auth); set `x-request-id` (UUID) if absent.
  - Remove placeholder branches from `app/layout.tsx`, `components/layout/PortalNavbar.tsx`, `components/admin/SuperAdminNav.tsx`.
  - Map Clerk/DB failures during resolution to 503 with request id.
- **Files/modules:** `middleware.ts`, `app/layout.tsx`, `components/layout/PortalNavbar.tsx`, `components/admin/SuperAdminNav.tsx`
- **Database:** None.
- **API:** All protected endpoints (401 behaviour).
- **Frontend:** Root layout always wraps `ClerkProvider`.
- **Security:** SC-AUTH-02, SC-AUTH-03, SC-AUTH-09.
- **Tests:**
  - `TC-AUTH-003` [integration] Unauthenticated request to `/restaurant/orders` redirects to `/sign-in?redirect_url=%2Frestaurant%2Forders`.
  - `TC-AUTH-004` [integration] Unauthenticated `GET /api/v1/orders` returns 401 JSON `UNAUTHENTICATED`.
  - `TC-AUTH-009` [unit] App boot fails when Clerk keys are missing or placeholder.
  - `TC-AUTH-010` [integration] Simulated database outage during session resolution returns 503, not 401.
- **Acceptance criteria:**
  - No code path disables authentication based on key contents.
- **Implementation notes:** middleware.ts always runs clerkMiddleware; lib/auth/route-policy.ts (pure) classifies public / agent / webhook / api / page routes per security.md §2.2 and decides: signed-out page → 30x /sign-in?redirect_url=<relative path+query>; signed-out API → 401 {error:{code:UNAUTHENTICATED,requestId}}; agent and webhook routes authenticate in their handlers. x-request-id kept if well-formed else generated, forwarded to handlers and returned. Clerk verification failure → 503 SERVICE_UNAVAILABLE (never 'signed out'). Placeholder-key branches removed from app/layout.tsx (always ClerkProvider), PortalNavbar and SuperAdminNav. Tests: route-policy unit (TC-AUTH-003/004 decision table incl. look-alike paths), e2e against the real middleware (TC-AUTH-003 redirect, TC-AUTH-004 401 JSON with request id, public routes, request-id passthrough — 7/7 desktop), static auth-fail-closed test (no key-content checks anywhere), TC-AUTH-009 (boot fails on missing/placeholder/misplaced Clerk keys), TC-AUTH-010 (DB outage → 503, in session tests). Note: first e2e run hit OneDrive-corrupted .next cache (renamed to .next-stale-onedrive; README troubleshooting added).
- **Affected files (actual):** middleware.ts; lib/auth/route-policy.ts; app/layout.tsx; components/layout/PortalNavbar.tsx; components/admin/SuperAdminNav.tsx; tests/unit/route-policy.test.ts; tests/e2e/auth-gate.spec.ts; tests/static/auth-fail-closed.test.ts; tests/unit/env.test.ts; .gitignore; eslint.config.mjs

### S1-P03-T003 — Session resolver and invited-user linking

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 24 | P03 Authentication | Backend Engineer | Critical | 3d | — | — | 2026-09-22 | 2026-09-22 | COMPLETED |

- **Dependencies:** S1-P03-T002, S1-P02-T005
- **Requirements:** REQ-AUTH-003, REQ-AUTH-004, REQ-AUTH-006, REQ-AUTH-009
- **Baseline:** [fact] `lib/auth/clerk.ts:22-41` upserts any Clerk user; `:55-58` swallows errors (BA-05, BA-06).
- **Objective:** Map Clerk identity to local USER per ADR-006 without creating accounts for uninvited people.
- **Technical work:**
  - `lib/auth/session.ts#getSessionUser()`: `auth()` → `clerk_user_id` lookup; else invited-email linking (verified primary email, lowercase) in a transaction setting `clerk_user_id`, memberships INVITED→ACTIVE, `accepted_at`; audits `user.linked`, `staff.activated`.
  - Uninvited → return `{ state: "NO_ACCOUNT" }` (no DB write); inactive → `{ state: "INACTIVE" }`.
  - Throttled `last_sign_in_at` update (≤1 write per 15 min); wrap in React `cache()`.
  - Delete `lib/auth/clerk.ts` baseline upsert behaviour.
- **Files/modules:** `lib/auth/session.ts`, `lib/data/users.ts`, `lib/auth/clerk.ts` (removed)
- **Database:** USER, USER_TENANT, AUDIT_LOG.
- **API:** LD-AUTH-01 (partial).
- **Frontend:** None.
- **Security:** SC-AUTH-04, SC-AUTH-05, SC-AUTH-06, SC-AUTH-07, SC-AUTH-09.
- **Tests:**
  - `TC-AUTH-005` [integration] Clerk user whose verified email matches an INVITED membership is linked and activated once.
  - `TC-AUTH-006` [integration] Clerk user with no invitation gets no USER row and state NO_ACCOUNT.
  - `TC-AUTH-007` [integration] USER with status INACTIVE or SUSPENDED resolves to INACTIVE and receives no data.
- **Acceptance criteria:**
  - Unverified email addresses are never used for linking.
  - Errors propagate (no blanket catch returning null).
- **Implementation notes:** lib/auth/session.ts: resolveSession(identity, requestId) and getSessionUser() (React cache). Known clerk_user_id → USER (ACTIVE, or INACTIVE for INACTIVE/SUSPENDED); unknown → Clerk-verified primary email (lowercased; unverified never used) → lib/data/users.ts linkInvitedUser links only a USER with an INVITED membership or SUPER_ADMIN platform role (ADR-006 §2), in one transaction: guarded clerk_user_id update, memberships INVITED→ACTIVE with accepted_at, audits user.linked + staff.activated with request id; a USER already linked to another Clerk id is never re-pointed (security.identity_conflict). Uninvited → NO_ACCOUNT with no write. last_sign_in_at throttled to one conditional UPDATE per 15 min. Errors propagate; mapDatabaseError maps unreachable DB (P1001/P1002/P1008/P1017, initialization errors) to 503. lib/auth/clerk.ts is now a read-only adapter for baseline actions (no upsert, no blanket catch). Tests TC-AUTH-005/006/007/010 pass (11 cases).
- **Affected files (actual):** lib/auth/session.ts; lib/data/users.ts; lib/auth/clerk.ts; lib/data/errors.ts; tests/integration/auth/session.test.ts

### S1-P03-T004 — Clerk administration client

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 25 | P03 Authentication | Backend Engineer | High | 2d | — | — | 2026-09-22 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P03-T003
- **Requirements:** REQ-AUTH-011, REQ-ADMIN-008, REQ-REST-010
- **Baseline:** [fact] No invitation or session-revocation code.
- **Objective:** Server-only wrapper for Clerk invitations and session revocation with explicit failure handling.
- **Technical work:**
  - `lib/auth/clerk-admin.ts`: `createInvitation(email, redirectUrl)`, `revokeInvitation(id)`, `revokeUserSessions(clerkUserId)` using `@clerk/nextjs/server` `clerkClient`; timeouts; typed errors `INVITATION_FAILED`; no PII in logs beyond masked email.
- **Files/modules:** `lib/auth/clerk-admin.ts`
- **Database:** None directly.
- **API:** Used by SA-ADM-01, SA-ADM-05, SA-ADM-06, SA-STF-01…SA-STF-05.
- **Frontend:** None.
- **Security:** SC-AUTH-08.
- **Tests:**
  - `TC-AUTH-014` [integration] Deactivating a user's last active membership calls session revocation (Clerk Backend API stubbed at the HTTP boundary) and the next request is denied.
- **Acceptance criteria:**
  - Clerk failures return typed errors and never leave partially-committed local state without a retry path.
- **Implementation notes:** lib/auth/clerk-admin.ts (invitations, revocation, session revocation) with typed errors, 8 s timeout and masked logging. The remaining half of TC-AUTH-014 — 'the next request is denied' after deactivation — is now covered by tests/integration/staff/staff.test.ts, so the task is complete.
- **Affected files (actual):** lib/auth/clerk-admin.ts, tests/integration/auth/clerk-admin.test.ts, tests/integration/staff/staff.test.ts

### S1-P03-T005 — Sign-in, invitation sign-up and sign-out pages

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 57 | P03 Authentication | Frontend Engineer | High | 2d | — | — | 2026-09-22 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P03-T001, S1-P08-T004
- **Requirements:** REQ-AUTH-002, REQ-DS-006
- **Baseline:** [fact] `app/sign-in/[[...sign-in]]/page.tsx` styled with hard-coded hex classes.
- **Objective:** Branded, accessible authentication pages with safe redirects.
- **Technical work:**
  - Restyle `<SignIn>`/`<SignUp>` appearance with design tokens (light warm theme); `/sign-up` without invitation ticket shows "Access is by invitation" state.
  - Validate `redirect_url` to same-origin relative paths only.
  - Sign-out flow clears `rasoi_active_membership` cookie (route handler `app/sign-out/route.ts` or Clerk `afterSignOut` hook).
- **Files/modules:** `app/sign-in/[[...sign-in]]/page.tsx`, `app/sign-up/[[...sign-up]]/page.tsx`, `lib/auth/redirect.ts`
- **Database:** None.
- **API:** None.
- **Frontend:** `/sign-in`, `/sign-up`.
- **Security:** SC-AUTH-11, SC-SESS-03.
- **Tests:**
  - `TC-AUTH-012` [unit] `safeRedirect` accepts `/restaurant/orders`, rejects `https://evil.test`, `//evil.test`, `/\evil`.
  - `TC-AUTH-015` [e2e] Signing out removes the active tenant cookie and protected pages redirect to sign-in.
- **Acceptance criteria:**
  - Pages pass axe with zero serious/critical issues.
- **Implementation notes:** Sign-in, invitation sign-up and sign-out on the Clerk components with the Brand v2 dark theme (components/layout/auth-layout.tsx, lib/ui/clerk-appearance.ts). Sign-up proceeds only from a Clerk invitation ticket, and the auth pages load no runtime web fonts. Covered by tests/e2e/auth-gate.spec.ts and the redirect cases in tests/unit/route-policy.test.ts.
- **Affected files (actual):** app/sign-in/**, app/sign-up/**, components/layout/auth-layout.tsx, lib/ui/clerk-appearance.ts

### S1-P03-T006 — Account state pages

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 72 | P03 Authentication | Frontend Engineer | High | 2d | — | — | 2026-09-22 | — | IN_PROGRESS |

- **Dependencies:** S1-P03-T003, S1-P08-T009
- **Requirements:** REQ-AUTH-006, REQ-DS-006
- **Baseline:** [fact] No account state pages; failures throw.
- **Objective:** Clear, data-free explanations for no access and suspended accounts.
- **Technical work:**
  - `/account/no-access` with reasons `NO_ACCOUNT`, `ACCOUNT_INACTIVE`, `NO_ACTIVE_MEMBERSHIP`; `/account/suspended`; both using `StatusPage` with sign-out action.
- **Files/modules:** `app/account/no-access/page.tsx`, `app/account/suspended/page.tsx`
- **Database:** None.
- **API:** LD-AUTH-01.
- **Frontend:** `/account/no-access`, `/account/suspended`.
- **Security:** SC-AUTH-07.
- **Tests:**
  - `TC-AUTH-018` [e2e] Uninvited signed-in user lands on no-access page with no tenant data in the HTML.
- **Acceptance criteria:**
  - Pages render without querying tenant data.
- **Implementation notes:** Done: /account/no-access, /account/suspended, /account/forbidden and /account/select-tenant render from the session only (no tenant queries), on components/states/status-page.tsx. REMAINING: TC-AUTH-018 is an e2e test with a signed-in uninvited Clerk user — needs Clerk test users approved by the Project Owner (S1-P03-T001).
- **Affected files (actual):** app/account/{no-access,suspended,forbidden,select-tenant}/*, components/states/status-page.tsx

### S1-P03-T007 — PostgreSQL rate limiter

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 26 | P03 Authentication | Security Engineer | High | 2d | — | — | 2026-09-22 | 2026-09-22 | COMPLETED |

- **Dependencies:** S1-P02-T005
- **Requirements:** REQ-SEC-004
- **Baseline:** [fact] No rate limiting.
- **Objective:** Implement ADR-011 limiter for reuse by webhook, agent and mutation endpoints.
- **Technical work:**
  - `lib/security/rate-limit.ts#consume(scope, identifier, limit, windowSec, { failOpen })` with atomic upsert on RATE_LIMIT_BUCKET, SHA-256 keyed buckets, opportunistic cleanup (1%).
  - `rateLimited()` helper returning 429 with `Retry-After` and logging `security.rate_limited`.
- **Files/modules:** `lib/security/rate-limit.ts`, `lib/data/rate-limit.ts`
- **Database:** RATE_LIMIT_BUCKET.
- **API:** Used by RH-AUTH-01, RH-AGT-01…05, SA-* mutations.
- **Frontend:** None.
- **Security:** SC-RL-01, SC-RL-02.
- **Tests:**
  - `TC-SEC-013` [integration] 50 concurrent calls against limit 10 allow exactly 10; the 11th returns 429 with `Retry-After`; window reset allows again; raw identifier not stored.
- **Acceptance criteria:**
  - Fail-open/closed behaviour configurable per scope and tested.
- **Implementation notes:** lib/security/rate-limit.ts: consume(scope, identifier, policy) with ADR-011 fixed windows, bucket key scope:sha256(identifier), RATE_LIMITS per scope (agent.pair 5/15 min, agent.api 120/min, webhook.clerk 60/min, public.order.submit 5/10 min — all fail closed; session.mutation 120/min fail open), rateLimitedResponse() → 429 RATE_LIMITED with Retry-After and no bucket details, security.rate_limited log. lib/data/rate-limit.ts: one atomic INSERT … ON CONFLICT DO UPDATE per hit, opportunistic (1%) deletion of expired buckets in batches. TC-SEC-013 passes: 50 concurrent calls vs limit 10 → exactly 10 allowed, 11th 429 with Retry-After 55, next window allows again, raw identifier never stored; fail-closed → 503 and fail-open → allowed with the database unreachable.
- **Affected files (actual):** lib/security/rate-limit.ts; lib/data/rate-limit.ts; tests/integration/security/rate-limit.test.ts

### S1-P03-T008 — Clerk webhook endpoint

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 27 | P03 Authentication | Backend Engineer | Medium | 2d | — | — | 2026-09-22 | — | IN_PROGRESS |

- **Dependencies:** S1-P03-T003, S1-P03-T007
- **Requirements:** REQ-AUTH-010
- **Baseline:** [fact] No webhook route.
- **Objective:** Keep local USER consistent with Clerk safely.
- **Technical work:**
  - `app/api/webhooks/clerk/route.ts` (RH-AUTH-01): read raw body, verify with `svix` `Webhook.verify`, 5-minute tolerance, handle `user.updated` (email/name sync with uniqueness conflict logging) and `user.deleted` (USER INACTIVE, memberships INACTIVE), ignore others; rate limit `webhook.clerk` fail-closed.
  - Add `svix` dependency with review note.
- **Files/modules:** `app/api/webhooks/clerk/route.ts`, `lib/services/users.ts`
- **Database:** USER, USER_TENANT, AUDIT_LOG.
- **API:** RH-AUTH-01.
- **Frontend:** None.
- **Security:** SC-WH-01, SC-WH-02, SC-RL-01.
- **Tests:**
  - `TC-AUTH-016` [integration] Invalid signature and timestamps older than 5 minutes return 400 and change nothing.
  - `TC-AUTH-017` [integration] Replaying a valid `user.deleted` twice yields the same final state; unknown event type returns 200 without changes.
- **Acceptance criteria:**
  - Webhook configured in Clerk development instance and verified end to end on staging.
- **Implementation notes:** app/api/webhooks/clerk/route.ts (RH-AUTH-01, nodejs runtime): webhook.clerk rate limit per source IP (fail closed → 503), 503 when CLERK_WEBHOOK_SIGNING_SECRET is unset, Clerk's first-party verifyWebhook (Svix/Standard Webhooks signature over the raw body, ±5 min timestamp tolerance) instead of adding the svix package — recorded in ADR-011 implementation notes; invalid → 400 INVALID_SIGNATURE + security.webhook_rejected; lib/services/users.ts applyClerkUserEvent: user.updated syncs name and verified primary email (conflicting email not applied, logged), user.deleted sets USER and ACTIVE/INVITED memberships INACTIVE with audits; other types 200 ignored; processing errors → 5xx so Clerk retries (handlers idempotent). TC-AUTH-016 and TC-AUTH-017 pass (9 cases). REMAINING: configure the endpoint in the Clerk development instance (deployment.md §11a) and verify end to end on staging (Railway deferred).
- **Affected files (actual):** app/api/webhooks/clerk/route.ts; lib/services/users.ts; lib/data/users.ts; knowledge/decisions/RASOIOS-ADR-011.md; tests/integration/auth/clerk-webhook.test.ts

### S1-P03-T009 — Authentication log redaction verification

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 28 | P03 Authentication | Security Engineer | High | 1d | — | — | 2026-09-22 | 2026-09-22 | COMPLETED |

- **Dependencies:** S1-P03-T003
- **Requirements:** REQ-AUTH-008, REQ-OBS-006
- **Baseline:** [fact] `lib/logger.ts:3-13` redacts keys containing password/otp/secret/token/authorization/cookie.
- **Objective:** Prove the authentication path never logs OTPs, tokens or cookies.
- **Technical work:**
  - Extend redaction keys (`session`, `__session`, `clerk`, `pairingcode`, `apikey`, `set-cookie`, `svix-signature`); ensure headers objects are sanitised.
  - Log-capture test harness capturing stdout during sign-in and webhook flows.
- **Files/modules:** `lib/logger.ts`, `tests/integration/auth/log-redaction.test.ts`
- **Database:** None.
- **API:** None.
- **Frontend:** None.
- **Security:** SC-AUTH-10, SC-LOG-02.
- **Tests:**
  - `TC-AUTH-011` [integration] Captured logs from sign-in resolution, webhook and invitation flows contain no OTP, bearer token, cookie or signature values.
- **Acceptance criteria:**
  - Redaction list documented in `operations/monitoring.md`.
- **Implementation notes:** lib/logger.ts: key redaction extended (session, clerk, pairingcode, apikey, set-cookie, svix-signature, signature, ticket, cardnumber; separators ignored), Headers/Map/Error sanitised, value scrubbing for Bearer tokens, sk_/rk_ keys, whsec_ secrets, v1,<base64> signatures, __session/__client_uat cookies, rsa_ agent tokens and JWTs, masking of emails, E.164 phones and card-like numbers, message scrubbed too. Redaction list documented in operations/monitoring.md. TC-AUTH-011 captures all console output across invited-user linking, valid and forged webhooks, a failed Clerk invitation and a direct log of request headers, and asserts no email, webhook secret, Clerk secret, signature, cookie, bearer token or OTP value appears; unit tests cover each pattern (11 cases).
- **Affected files (actual):** lib/logger.ts; tests/unit/logger.test.ts; tests/integration/auth/log-redaction.test.ts; knowledge/operations/monitoring.md

## P04 — Multi-Tenant Authorization

10 tasks · 21 ideal days of effort · sequence #29–#73 (interleaved with other phases where dependencies allow)

### S1-P04-T001 — Tenant and platform context resolution

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 29 | P04 Multi-Tenant Authorization | Backend Engineer | Critical | 3d | — | — | 2026-09-22 | 2026-09-22 | COMPLETED |

- **Dependencies:** S1-P03-T003
- **Requirements:** REQ-TENANT-002, REQ-TENANT-006, REQ-TENANT-007
- **Baseline:** [fact] `lib/auth/tenant-context.ts:31-77` accepts `requestedTenantId`, defaults to first membership (BA-07).
- **Objective:** Implement ADR-006 §3–4 resolution with fresh authorization data every request.
- **Technical work:**
  - `lib/auth/context.ts`: `getTenantContext()` and `getPlatformContext()` cached per request; load ACTIVE memberships joined to ACTIVE tenants and restaurant timezone/currency; apply single/multiple membership rules and cookie re-validation; outcomes `OK | NO_MEMBERSHIP | SUSPENDED | SELECT_REQUIRED`.
  - Remove `requestedTenantId` from resolver API; keep baseline checks for user, membership and tenant status.
- **Files/modules:** `lib/auth/context.ts`, `lib/data/memberships.ts`, `lib/auth/tenant-context.ts` (removed)
- **Database:** USER, USER_TENANT, TENANT, RESTAURANT.
- **API:** LD-AUTH-01.
- **Frontend:** None.
- **Security:** SC-TEN-01, SC-SESS-02, SC-RBAC-03.
- **Tests:**
  - `TC-TENANT-001` [integration] Context tenant comes from the membership row; tenant identifiers in cookies other than a valid membership id, headers or query are ignored.
  - `TC-TENANT-005` [integration] Role change and tenant suspension take effect on the next request without re-login.
- **Acceptance criteria:**
  - No function in `lib/auth` accepts a tenant id argument from callers.
- **Implementation notes:** lib/auth/context.ts resolveTenant/resolvePlatform (per-request cache via getTenantResolution/getPlatformResolution) over lib/data/memberships.ts activeMembershipsOfUser: ACTIVE memberships joined to ACTIVE tenants plus restaurant timezone/currency/GSTIN; outcomes OK / NO_MEMBERSHIP / SUSPENDED / SELECT_REQUIRED; the rasoi_active_membership cookie is a preference only and is re-validated against the caller's memberships. lib/auth/tenant-context.ts and lib/auth/clerk.ts deleted; no lib/auth function accepts a tenant id. TC-TENANT-001 and TC-TENANT-005 pass (tests/integration/auth/context.test.ts).
- **Affected files (actual):** lib/auth/context.ts, lib/auth/context-types.ts, lib/auth/active-membership-cookie.ts, lib/data/memberships.ts, lib/data/session-switch.ts; deleted lib/auth/tenant-context.ts, lib/auth/clerk.ts, tests/unit/tenant-context.test.ts

### S1-P04-T002 — Authorization guards and guard coverage check

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 30 | P04 Multi-Tenant Authorization | Security Engineer | Critical | 2d | — | — | 2026-09-22 | 2026-09-22 | COMPLETED |

- **Dependencies:** S1-P04-T001
- **Requirements:** REQ-RBAC-002, REQ-TENANT-002
- **Baseline:** [fact] Guards called inconsistently; several actions lack permission checks (BA-09…BA-13).
- **Objective:** One mandatory entry pattern for every server entry point.
- **Technical work:**
  - `lib/auth/guards.ts`: `requireTenant(permission)`, `requirePlatform(permission)`, `requireAgent()` (implemented in S1-P16-T005), each returning context or throwing typed errors; page variants redirect to account pages.
  - Static test enumerating every `app/**/actions.ts`, `app/**/route.ts`, and loader in `lib/services/*/loaders.ts` asserting a guard call precedes other awaits (public/agent/webhook allow-list).
- **Files/modules:** `lib/auth/guards.ts`, `tests/static/guard-coverage.test.ts`
- **Database:** None.
- **API:** All LD/SA/RH.
- **Frontend:** None.
- **Security:** SC-AUTH-04, SC-RBAC-01.
- **Tests:**
  - `TC-AUTH-013` [static] Every exported server action, route handler and loader calls a guard first or is on the reviewed public allow-list.
- **Acceptance criteria:**
  - Static test green; allow-list entries each carry a justification comment.
- **Implementation notes:** lib/auth/guards.ts: requireTenant/requirePlatform (actions, routes), requireTenantPage/requirePlatformPage (pages; redirect to /sign-in or /account/*), requirePermission, requireSessionUser. tests/static/guard-coverage.test.ts (TC-AUTH-013) parses every server action, route handler and page with the TypeScript compiler API and requires a guard as the first statement; allow-list entries (health, ready, webhook, public pages, account pages) each carry a justification comment.
- **Affected files (actual):** lib/auth/guards.ts, tests/static/guard-coverage.test.ts

### S1-P04-T003 — Active tenant selection

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 73 | P04 Multi-Tenant Authorization | Backend Engineer | Medium | 2d | — | — | 2026-09-22 | 2026-09-22 | COMPLETED |

- **Dependencies:** S1-P04-T001, S1-P08-T009
- **Requirements:** REQ-TENANT-006
- **Baseline:** [fact] No tenant switching.
- **Objective:** Multi-membership users choose their restaurant through a server-validated preference.
- **Technical work:**
  - `app/account/select-tenant/page.tsx` listing memberships; `SA-AUTH-01 switchActiveTenantAction` validating membership ownership and status; cookie `rasoi_active_membership` HttpOnly, Secure, SameSite=Lax, 30-day max-age; audit `session.tenant_switched`.
  - Sidebar restaurant switcher links to page when multiple memberships.
- **Files/modules:** `app/account/select-tenant/*`, `lib/auth/active-membership-cookie.ts`
- **Database:** USER_TENANT, AUDIT_LOG.
- **API:** SA-AUTH-01, LD-AUTH-01.
- **Frontend:** `/account/select-tenant`.
- **Security:** SC-SESS-02.
- **Tests:**
  - `TC-TENANT-004` [integration] Cookie containing another user's membership id is ignored and the user is sent to selection; switching to own membership sets the cookie.
- **Acceptance criteria:**
  - Choosing a restaurant never accepts a tenant id; only the caller's membership ids.
- **Implementation notes:** /account/select-tenant lists only the caller's ACTIVE memberships; switchActiveTenantAction takes a membership id, re-validates it server-side and sets the preference cookie — never a tenant id. TC-TENANT-004 passes.
- **Affected files (actual):** app/account/select-tenant/page.tsx, app/account/select-tenant/actions.ts, app/account/select-tenant/select-tenant-list.tsx, lib/data/session-switch.ts

### S1-P04-T004 — Suspended tenant and membership state enforcement

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 31 | P04 Multi-Tenant Authorization | Backend Engineer | Critical | 1d | — | — | 2026-09-22 | 2026-09-22 | COMPLETED |

- **Dependencies:** S1-P04-T001
- **Requirements:** REQ-TENANT-007, REQ-AUTH-006
- **Baseline:** [fact] `TenantSuspendedError` thrown but no page handling.
- **Objective:** Suspension and inactive memberships block access consistently for pages and APIs.
- **Technical work:**
  - Page guards redirect to `/account/suspended` or `/account/no-access`; API guards return 403 `TENANT_SUSPENDED` / `NO_ACTIVE_MEMBERSHIP`; multi-tenant users with another active tenant are offered selection.
- **Files/modules:** `lib/auth/guards.ts`, `app/restaurant/layout.tsx`
- **Database:** None.
- **API:** All tenant endpoints.
- **Frontend:** Restaurant layout.
- **Security:** SC-TEN-06.
- **Tests:**
  - `TC-AUTH-008` [integration] After suspension, a TENANT_ADMIN of that tenant receives the suspended page and 403 `TENANT_SUSPENDED` from `/api/v1/orders`.
- **Acceptance criteria:**
  - No tenant data is rendered for suspended tenants.
- **Implementation notes:** Suspended tenants and inactive memberships resolve to SUSPENDED / NO_MEMBERSHIP before any tenant query; pages redirect to /account/suspended or /account/no-access, actions return 403 TENANT_SUSPENDED / NO_ACTIVE_MEMBERSHIP. TC-AUTH-008 passes.
- **Affected files (actual):** lib/auth/context.ts, lib/auth/guards.ts, app/account/suspended/page.tsx, app/account/no-access/page.tsx

### S1-P04-T005 — Error model and not-found parity

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 32 | P04 Multi-Tenant Authorization | Backend Engineer | Critical | 2d | — | — | 2026-09-22 | 2026-09-22 | COMPLETED |

- **Dependencies:** S1-P04-T002
- **Requirements:** REQ-TENANT-004, REQ-SEC-007
- **Baseline:** [fact] `lib/errors.ts` classes; cross-tenant returns 403 `TenantAccessDeniedError` (existence oracle).
- **Objective:** Safe, consistent errors across actions, route handlers and pages.
- **Technical work:**
  - `ActionResult` helper `action(handler)` catching `AppError` → `{ok:false,error}`, unknown → `INTERNAL` with request id; route handler wrapper `route(handler)` mapping to JSON envelope; `app/error.tsx`, `app/not-found.tsx`, `app/restaurant/not-found.tsx`.
  - Replace `TenantAccessDeniedError` for resource lookups with `NotFoundError`; keep 403 only for permission failures before lookup.
- **Files/modules:** `lib/errors.ts`, `lib/http/action.ts`, `lib/http/route.ts`, `app/error.tsx`, `app/not-found.tsx`
- **Database:** None.
- **API:** All endpoints.
- **Frontend:** Error and not-found pages.
- **Security:** SC-TEN-04, SC-API-01.
- **Tests:**
  - `TC-TENANT-003` [integration] Requesting a random UUID and a Tenant B order id as Tenant A produce byte-identical 404 responses.
  - `TC-SEC-007` [integration] An unexpected exception yields 500 `INTERNAL` with request id and no stack, SQL or Prisma message.
- **Acceptance criteria:**
  - No endpoint returns 403 for a resource that exists in another tenant.
- **Implementation notes:** lib/errors.ts error model (UNAUTHENTICATED 401, NO_ACTIVE_MEMBERSHIP/TENANT_SUSPENDED/FORBIDDEN 403, NOT_FOUND 404, TENANT_SELECTION_REQUIRED/CONFLICT 409, VALIDATION_ERROR 422, RATE_LIMITED 429, SERVICE_UNAVAILABLE 503); lib/http/action.ts and lib/http/route.ts map every error to the envelope with a request id; lib/data/errors.ts maps Prisma/PostgreSQL errors. Deprecated UnauthorizedError/TenantAccessDeniedError aliases removed. New tests/integration/tenancy/not-found-parity.test.ts (TC-TENANT-003): order transition, KOT transition, payment, refund and receipt page answer a Tenant B id byte-identically to a random UUID (request id blanked). TC-SEC-007 passes.
- **Affected files (actual):** lib/errors.ts, lib/http/action.ts, lib/http/route.ts, lib/data/errors.ts, tests/integration/tenancy/not-found-parity.test.ts, tests/integration/http/error-envelopes.test.ts

### S1-P04-T006 — Strict input validation conventions

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 33 | P04 Multi-Tenant Authorization | Security Engineer | Critical | 2d | — | — | 2026-09-22 | 2026-09-22 | COMPLETED |

- **Dependencies:** S1-P04-T005
- **Requirements:** REQ-SEC-006, REQ-TENANT-002
- **Baseline:** [fact] Zod schemas are non-strict (e.g. `app/restaurant/orders/actions.ts:17-39`).
- **Objective:** Unknown input keys, including tenant identifiers and prices, are rejected everywhere.
- **Technical work:**
  - `lib/validation/core.ts`: `strictObject`, `uuidParam`, `slugParam`, `businessDateParam`, `boundedText(max)`, `emailField`, `e164Field`; route segment parsers calling `notFound()` on invalid params.
  - Lint/static check that exported schemas in `lib/validation/**` use `strictObject`.
- **Files/modules:** `lib/validation/core.ts`, `tests/static/strict-schemas.test.ts`
- **Database:** None.
- **API:** All endpoints.
- **Frontend:** Shared schemas for forms.
- **Security:** SC-VAL-01, SC-VAL-08, SC-TEN-01.
- **Tests:**
  - `TC-SEC-001` [unit] Every exported schema rejects an extra `tenantId` key and an unknown key.
  - `TC-SEC-005` [integration] Invalid UUID, slug or date route params render the not-found page / 404.
- **Acceptance criteria:**
  - Static check lists zero non-strict exported schemas.
- **Implementation notes:** lib/validation/core.ts (strictObject, uuidParam, slugParam, businessDateParam, boundedText, optionalText, emailField, e164Field, parseInput, parseParamOrNotFound) and per-domain schema files; tests/unit/strict-schemas.test.ts finds zero non-strict exported schemas. TC-SEC-001 and TC-SEC-005 pass.
- **Affected files (actual):** lib/validation/core.ts, lib/validation/{orders,kot,payments,menu,printing,social,reports,settings}.ts, tests/unit/strict-schemas.test.ts

### S1-P04-T007 — Retrofit baseline server actions to guards and data layer

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 34 | P04 Multi-Tenant Authorization | Backend Engineer | Critical | 3d | — | — | 2026-09-22 | 2026-09-22 | COMPLETED |

- **Dependencies:** S1-P04-T002, S1-P04-T006
- **Requirements:** REQ-TENANT-002, REQ-RBAC-002
- **Baseline:** [fact] Baseline actions accept `requestedTenantId` and some lack permissions (BA-07, BA-09…BA-13).
- **Objective:** Remove client tenant parameters and missing checks from existing code before it is rebuilt feature by feature.
- **Technical work:**
  - For each baseline action/page in `app/restaurant/**`: drop `requestedTenantId`, call `requireTenant` with the v2 permission code (security.md §3.2 mapping), route queries through interim `lib/data` functions, return `ActionResult`.
  - Add missing checks: orders read (`order:read`), customers (`customer:read`), print jobs (`print_job:read`), social (`social:manage`), reports/transactions pages (`report:read`/`transaction:read`), KOT update (`kot:update_status`).
- **Files/modules:** `app/restaurant/**/actions.ts`, `app/restaurant/reports/page.tsx`, `app/restaurant/transactions/page.tsx`
- **Database:** Reads/writes through `lib/data`.
- **API:** Baseline actions (interim until rebuilt).
- **Frontend:** Callers updated to new signatures.
- **Security:** SC-TEN-01, SC-RBAC-01.
- **Tests:**
  - `TC-TENANT-006` [static] No exported server action or route handler has a parameter or schema field named `tenantId` or `requestedTenantId`.
- **Acceptance criteria:**
  - Static guard (TC-TENANT-002) baseline violations reduced to zero for retrofitted files.
- **Implementation notes:** Every baseline server action, loader and page now starts with a guard and reaches the database only through lib/data (orders, customers, search, kot, menu, daily-menu, payments, transactions, receipts, reports, restaurant, platform-tenants, public-restaurant). TC-TENANT-002 baseline violations 34 → 0; direct Prisma importers outside lib/data reduced to lib/services/printing.ts and lib/services/social.ts (both already scoped; rebuilt in S1-P16/S1-P20). All baseline Prisma-mocking unit tests deleted and replaced by integration suites. KOTs are now generated only on NEW → ACCEPTED (security.md §3.4) and the KOT service uses lib/auth/transitions.ts. TC-TENANT-006 passes.
- **Affected files (actual):** app/**/actions.ts, app/**/page.tsx (retrofitted), lib/data/*.ts, lib/services/{orders,kot,payments,users,staff-rules,analytics,public-restaurant}.ts, eslint.config.mjs, tests/static/tenant-scope.test.ts, tests/integration/{orders,kitchen,money,menu,printing,social,reports,settings,platform,public}/**

### S1-P04-T008 — Close critical baseline leaks

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 35 | P04 Multi-Tenant Authorization | Security Engineer | Critical | 1d | — | — | 2026-09-22 | 2026-09-22 | COMPLETED |

- **Dependencies:** S1-P04-T002, S1-P04-T005
- **Requirements:** REQ-TENANT-003, REQ-TENANT-008, REQ-RBAC-004, REQ-TXN-007
- **Baseline:** [fact] BA-01 unauthenticated print poll with client tenantId; BA-02 unscoped receipt page; BA-03 unguarded admin pages.
- **Objective:** Eliminate the three known cross-tenant exposures immediately.
- **Technical work:**
  - Delete `app/api/print-jobs/poll/route.ts` (printing unavailable until P16 — documented in release notes of staging).
  - Receipt page: `requireTenant("transaction:read")` + scoped lookup → 404.
  - `app/admin/**`: `requirePlatform("platform:tenant:read")` in a new `app/admin/layout.tsx`.
- **Files/modules:** `app/api/print-jobs/poll/route.ts` (deleted), `app/restaurant/billing/receipt/[orderId]/page.tsx`, `app/admin/layout.tsx`
- **Database:** None.
- **API:** Removes baseline poll endpoint.
- **Frontend:** Receipt and admin guarded.
- **Security:** SC-TEN-02, SC-TEN-07, SC-RBAC-03.
- **Tests:**
  - `TC-SEC-018` [integration] Tenant A user requesting Tenant B receipt gets 404; TENANT_ADMIN requesting `/admin` gets forbidden; `GET /api/print-jobs/poll?tenantId=…` returns 404.
- **Acceptance criteria:**
  - BA-01, BA-02, BA-03 marked resolved in baseline-audit follow-up notes with test evidence.
- **Implementation notes:** BA-01: unauthenticated app/api/print-jobs/poll/route.ts deleted. BA-02: receipt page requires transaction:read. BA-03: app/admin/layout.tsx and pages require platform:tenant:read. Recorded with evidence in baseline-audit.md §4.6. TC-SEC-018 passes.
- **Affected files (actual):** app/admin/layout.tsx, app/admin/page.tsx, app/admin/tenants/page.tsx, app/restaurant/billing/receipt/[orderId]/page.tsx, knowledge/implementation/slice-01/baseline-audit.md

### S1-P04-T009 — Tenant isolation test framework

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 36 | P04 Multi-Tenant Authorization | QA Engineer | Critical | 3d | — | — | 2026-09-22 | 2026-09-22 | COMPLETED |

- **Dependencies:** S1-P02-T008, S1-P04-T007
- **Requirements:** REQ-TENANT-003, REQ-TEST-006
- **Baseline:** [fact] `tests/unit/tenant-context.test.ts` tests the resolver with mocks only.
- **Objective:** Reusable harness to call loaders, actions and route handlers as a specific user and tenant against real data.
- **Technical work:**
  - Helpers: `asUser({ tenant: "A", role })`, `asPlatformAdmin()`, `asAgent(tenant)`, `asAnonymous()` that stub only the Clerk identity boundary (`auth()`), not the database or services.
  - `invokeAction(actionFn, input)`, `invokeRoute(method, path, body)`, `invokeLoader(fn, params)`.
  - TI test file structure mirroring tenant-isolation-tests.md; implement TI cases for retrofitted endpoints.
- **Files/modules:** `tests/integration/helpers/actors.ts`, `tests/integration/isolation/*`
- **Database:** Seeded Tenant A/B.
- **API:** All.
- **Frontend:** None.
- **Security:** SC-TEN-10.
- **Tests:**
  - `TC-QA-003` [integration] Harness self-test: User A listing orders never returns any row whose tenant is B, verified against a direct database count.
- **Acceptance criteria:**
  - Adding a TI case requires ≤ 10 lines using the helpers.
- **Implementation notes:** tests/integration/helpers/actors.ts: seedOnce, asSeedUser, asPlatformAdmin, asUninvited, asAnonymous, invokeAction/invokeLoader/invokeRoute, seeded(tenant, label), tenantIdOf; clerk-boundary mock of @clerk/nextjs/server and next/headers only. A TI case is under 10 lines (see tests/integration/tenancy/not-found-parity.test.ts). TC-QA-003 passes.
- **Affected files (actual):** tests/integration/helpers/actors.ts, tests/integration/helpers/actor-state.ts, tests/integration/setup/clerk-boundary.ts

### S1-P04-T010 — Transactional audit writer and redaction

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 37 | P04 Multi-Tenant Authorization | Backend Engineer | Critical | 2d | — | — | 2026-09-22 | 2026-09-22 | COMPLETED |

- **Dependencies:** S1-P02-T005
- **Requirements:** REQ-AUDIT-001, REQ-AUDIT-004, REQ-AUDIT-005
- **Baseline:** [fact] Direct `prisma.auditLog.create` calls outside transactions in menu/settings actions; no redaction.
- **Objective:** One audit API used inside business transactions from P06 onward.
- **Technical work:**
  - `lib/audit/actions.ts` (`AUDIT_ACTIONS` from security.md §7), `lib/audit/write.ts#audit(tx, ctx, { action, resourceType, resourceId, before, after, reason })` capturing actor type/role, request id; `lib/audit/redact.ts` removing secret-like keys and masking email/phone/name fields per resource type; 16 KB cap.
- **Files/modules:** `lib/audit/*`
- **Database:** AUDIT_LOG.
- **API:** Used by all mutations.
- **Frontend:** None.
- **Security:** SC-AUD-02, SC-AUD-04, SC-PII-03.
- **Tests:**
  - `TC-AUDIT-002` [integration] When the business transaction rolls back, no audit row persists; when it commits, exactly one row exists.
  - `TC-AUDIT-004` [unit] Redaction removes token/secret/otp keys and masks customer phone and email in before/after states.
- **Acceptance criteria:**
  - Writing an action not in `AUDIT_ACTIONS` fails type-checking.
- **Implementation notes:** lib/audit/actions.ts (AUDIT_ACTIONS from security.md §7, typed union), lib/audit/redact.ts (key redaction, 16 KB cap), lib/audit/write.ts audit(tx, ctx, entry) inside the caller's transaction. An action outside AUDIT_ACTIONS fails type-checking. TC-AUDIT-002 and TC-AUDIT-004 pass.
- **Affected files (actual):** lib/audit/actions.ts, lib/audit/redact.ts, lib/audit/write.ts, tests/integration/audit/audit-writer.test.ts, tests/unit/audit-redact.test.ts

## P05 — RBAC

7 tasks · 13 ideal days of effort · sequence #38–#44 (interleaved with other phases where dependencies allow)

### S1-P05-T001 — Permission catalogue v2

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 38 | P05 RBAC | Backend Engineer | Critical | 2d | — | — | 2026-09-22 | 2026-09-22 | COMPLETED |

- **Dependencies:** S1-P04-T001
- **Requirements:** REQ-RBAC-001, REQ-RBAC-003, REQ-RBAC-004
- **Baseline:** [fact] `lib/auth/permissions.ts:9-67` — 12 permissions; SUPER_ADMIN in tenant roles.
- **Objective:** Implement security.md §3.2–3.3 as the single permission source.
- **Technical work:**
  - Rewrite `lib/auth/permissions.ts`: `PERMISSIONS` const (50 codes + agent scopes), `TENANT_ROLE_PERMISSIONS`, `PLATFORM_ROLE_PERMISSIONS`, `ROLE_RANK`, `hasPermission(ctx, code)` deny-by-default.
  - Generate `tests/fixtures/rbac-matrix.json` from the security.md §3.3 table to keep docs and code aligned.
- **Files/modules:** `lib/auth/permissions.ts`, `tests/fixtures/rbac-matrix.json`
- **Database:** None.
- **API:** All guards.
- **Frontend:** Capability map source.
- **Security:** SC-RBAC-02, SC-RBAC-03.
- **Tests:**
  - `TC-RBAC-001` [unit] Unknown permission and missing role deny; every code in the matrix fixture exists in `PERMISSIONS`.
  - `TC-RBAC-002` [unit] No tenant role grants any `platform:*` permission; SUPER_ADMIN has no tenant permission.
- **Acceptance criteria:**
  - Code matrix equals the security.md matrix fixture (test fails on drift).
- **Implementation notes:** lib/auth/permissions.ts v2: 7 platform + 43 tenant permissions, agent scopes, TENANT_ROLE_PERMISSIONS, PLATFORM_ROLE_PERMISSIONS, ROLE_RANK, deny-by-default hasPermission. Deprecated Role and BASELINE_PERMISSION_ALIASES removed. tests/static/rbac-matrix.test.ts compares the code matrix with security.md §3.3 (fixture tests/fixtures/rbac-matrix.json). TC-RBAC-001 and TC-RBAC-002 pass.
- **Affected files (actual):** lib/auth/permissions.ts, tests/static/rbac-matrix.test.ts, tests/fixtures/rbac-matrix.json, tests/unit/permissions.test.ts

### S1-P05-T002 — RBAC matrix integration test driver

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 39 | P05 RBAC | QA Engineer | Critical | 3d | — | — | 2026-09-22 | 2026-09-22 | COMPLETED |

- **Dependencies:** S1-P05-T001, S1-P04-T009
- **Requirements:** REQ-RBAC-003, REQ-TEST-005
- **Baseline:** [fact] `tests/unit/permissions.test.ts` checks the constant table only.
- **Objective:** For every permission row, prove each role is allowed or denied at a real endpoint.
- **Technical work:**
  - `tests/integration/rbac-matrix.test.ts`: reads matrix fixture; for each row, maps to a representative endpoint invocation (registry `tests/integration/rbac/endpoint-registry.ts`); for each of six roles asserts success or 403; rows whose endpoints are not yet built are `todo` and tracked (must be zero by S1-P25-T002).
- **Files/modules:** `tests/integration/rbac-matrix.test.ts`, `tests/integration/rbac/endpoint-registry.ts`
- **Database:** Seed data.
- **API:** All endpoints (progressively).
- **Frontend:** None.
- **Security:** SC-RBAC-01.
- **Tests:**
  - `TC-RBAC-101`…`TC-RBAC-150` [integration] Per-permission allow/deny matrix cases as defined in security.md §3.3.
  - `TC-RBAC-014` [integration] Driver fails if a matrix row has no endpoint mapping after its feature phase is complete.
- **Acceptance criteria:**
  - Rows for endpoints existing at P05 completion pass; remaining rows tracked as `todo` with owning task IDs.
- **Implementation notes:** tests/integration/rbac-matrix.test.ts reads tests/fixtures/rbac-matrix.json (security.md §3.3) and, for each row, runs a side-effect-free probe of a real endpoint as each of the six roles (random-UUID target → an allowed role gets NOT_FOUND past the guard; extra key → VALIDATION_ERROR; denied → FORBIDDEN / NO_ACTIVE_MEMBERSHIP / account redirect). 26 rows probed and passing; 24 rows tracked as todo with their owning task in tests/integration/rbac/endpoint-registry.ts. TC-RBAC-014 fails when a todo row's owning task is COMPLETED in tasks.md, and when the registry and matrix disagree.
- **Affected files (actual):** tests/integration/rbac-matrix.test.ts, tests/integration/rbac/endpoint-registry.ts

### S1-P05-T003 — Role hierarchy and staff rules

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 40 | P05 RBAC | Backend Engineer | Critical | 2d | — | — | 2026-09-22 | 2026-09-22 | COMPLETED |

- **Dependencies:** S1-P05-T001
- **Requirements:** REQ-RBAC-005, REQ-RBAC-006
- **Baseline:** [fact] No role assignment logic.
- **Objective:** Prevent privilege escalation through staff management.
- **Technical work:**
  - `lib/services/staff-rules.ts`: `assignableRoles(actorRole)`, `canManageMembership(actor, target)`, `assertNotSelf`, `assertNotLastTenantAdmin(tx, tenantId, membershipId, nextRole|deactivate)` using `SELECT … FOR UPDATE` on active TENANT_ADMIN memberships.
- **Files/modules:** `lib/services/staff-rules.ts`
- **Database:** USER_TENANT.
- **API:** SA-STF-01…SA-STF-06.
- **Frontend:** Role select options.
- **Security:** SC-RBAC-04, SC-RBAC-05.
- **Tests:**
  - `TC-RBAC-010` [integration] MANAGER cannot invite or promote to MANAGER/TENANT_ADMIN, cannot change own role; TENANT_ADMIN can assign any tenant role.
  - `TC-RBAC-012` [integration] Concurrent demotion of the last two TENANT_ADMINs leaves at least one active TENANT_ADMIN.
- **Acceptance criteria:**
  - Rules enforced in services, independent of UI.
- **Implementation notes:** lib/services/staff-rules.ts enforces the role hierarchy (ROLE_RANK), last-TENANT_ADMIN protection and self-change rules in the service layer. TC-RBAC-010 and TC-RBAC-012 pass (tests/integration/rbac/staff-rules.test.ts).
- **Affected files (actual):** lib/services/staff-rules.ts, tests/integration/rbac/staff-rules.test.ts

### S1-P05-T004 — Transition authorization table

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 41 | P05 RBAC | Backend Engineer | High | 1d | — | — | 2026-09-22 | 2026-09-22 | COMPLETED |

- **Dependencies:** S1-P05-T001
- **Requirements:** REQ-RBAC-007
- **Baseline:** [fact] `lib/services/orders.ts:32-40` transitions without role rules.
- **Objective:** Encode security.md §3.4 once for order and KOT services.
- **Technical work:**
  - `lib/auth/transitions.ts`: `ORDER_TRANSITIONS` and `KOT_TRANSITIONS` with required permission and role restrictions (e.g. CASHIER/WAITER cancel only NEW); `assertTransitionAllowed(ctx, entity, from, to)`.
- **Files/modules:** `lib/auth/transitions.ts`
- **Database:** None.
- **API:** SA-ORD-02, SA-ORD-03, SA-KOT-01.
- **Frontend:** Allowed next actions for UI.
- **Security:** SC-RBAC-06.
- **Tests:**
  - `TC-RBAC-015` [unit] Transition table equals security.md §3.4 fixture; disallowed from/to pairs throw `INVALID_TRANSITION`.
- **Acceptance criteria:**
  - Order and KOT services import only this table for transition rules.
- **Implementation notes:** lib/auth/transitions.ts ORDER_TRANSITIONS/KOT_TRANSITIONS with assertTransitionAllowed, allowedNextStatuses and permissionForTarget. lib/services/orders.ts and lib/services/kot.ts now import only this table (the KOT service's private table was removed). TC-RBAC-015 passes.
- **Affected files (actual):** lib/auth/transitions.ts, lib/services/orders.ts, lib/services/kot.ts, tests/unit/transitions.test.ts

### S1-P05-T005 — Role-based response projections

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 42 | P05 RBAC | Backend Engineer | High | 2d | — | — | 2026-09-22 | 2026-09-22 | COMPLETED |

- **Dependencies:** S1-P05-T001
- **Requirements:** REQ-RBAC-008, REQ-CUST-005
- **Baseline:** [fact] Services `include` whole related rows (e.g. `lib/services/kot.ts:72-79` includes customer).
- **Objective:** Field-level data minimisation by role.
- **Technical work:**
  - `lib/data/projections.ts`: `orderSelectFor(role)`, `kotSelectFor(role)`, `platformTenantInspectionSelect`; KITCHEN excludes customer and money fields; DTO mappers never spread rows.
- **Files/modules:** `lib/data/projections.ts`
- **Database:** None.
- **API:** LD-ORD-*, RH-ORD-01, LD-KOT-01, RH-KOT-01, LD-ADM-03.
- **Frontend:** None.
- **Security:** SC-RBAC-07, SC-API-05, SC-PII-01.
- **Tests:**
  - `TC-RBAC-011` [integration] KITCHEN responses for orders and KOTs contain no customer name/phone/email and no amount fields.
- **Acceptance criteria:**
  - Projection functions used by all order/KOT/platform loaders.
- **Implementation notes:** Kitchen projection: order loaders strip amounts, payment state and customer for KITCHEN (lib/services/orders.ts kitchenProjection); KOT DTOs carry only kitchen fields (lib/data/kot.ts). Platform loaders return tenant DTOs without tenant content (lib/data/platform-tenants.ts). TC-RBAC-011 passes.
- **Affected files (actual):** lib/services/orders.ts, lib/data/kot.ts, lib/data/platform-tenants.ts, lib/data/dto.ts

### S1-P05-T006 — UI capability map and navigation filtering

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 43 | P05 RBAC | Frontend Engineer | High | 2d | — | — | 2026-09-22 | — | IN_PROGRESS |

- **Dependencies:** S1-P05-T001, S1-P04-T001
- **Requirements:** REQ-RBAC-002
- **Baseline:** [fact] `components/layout/Sidebar.tsx:23-34` shows all items to everyone.
- **Objective:** UI reflects permissions while the server remains authoritative.
- **Technical work:**
  - `LD-AUTH-01` returns `capabilities`; `SessionProvider` context; `useCapabilities()`; `<Can permission>` helper; sidebar items filtered per frontend.md §3.1.
- **Files/modules:** `lib/ui/capabilities.tsx`, `components/layout/Sidebar.tsx`
- **Database:** None.
- **API:** LD-AUTH-01.
- **Frontend:** Console navigation.
- **Security:** SC-RBAC-08.
- **Tests:**
  - `TC-RBAC-013` [e2e] WAITER sees no Menu-manage controls; invoking `createCategoryAction` directly from the browser context returns FORBIDDEN.
- **Acceptance criteria:**
  - No hidden control remains callable without server authorization.
- **Implementation notes:** Done: lib/ui/session-context.tsx (SessionProvider, useCapabilities, Can), lib/ui/navigation.ts navItemsFor filters the sidebar by permission (tests/unit/navigation.test.ts). REMAINING: TC-RBAC-013 is an e2e test that signs in as WAITER — needs Clerk test users in the development instance, which the Project Owner must approve (S1-P03-T001).
- **Affected files (actual):** lib/ui/session-context.tsx, lib/ui/navigation.ts, components/layout/Sidebar.tsx, tests/unit/navigation.test.ts

### S1-P05-T007 — RBAC security review

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 44 | P05 RBAC | Security Engineer | High | 1d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P05-T002, S1-P05-T003, S1-P05-T005
- **Requirements:** REQ-RBAC-003, REQ-SEC-001
- **Baseline:** None.
- **Objective:** Independent review of RBAC code against the matrix and threats T-003, T-026, T-027.
- **Technical work:**
  - Review guards, permissions, transitions, staff rules, projections; record findings as fixes or tasks.
- **Files/modules:** `lib/auth/*`, `lib/services/staff-rules.ts`
- **Database:** None.
- **API:** All.
- **Frontend:** None.
- **Security:** SC-RBAC-01…SC-RBAC-08.
- **Tests:**
  - `TC-RBAC-016` [review] Signed review checklist covering every SC-RBAC control with evidence links.
- **Acceptance criteria:**
  - No open High/Critical findings.
- **Implementation notes:** —
- **Affected files (actual):** —

## P06 — Super Admin

8 tasks · 17 ideal days of effort · sequence #45–#67 (interleaved with other phases where dependencies allow)

### S1-P06-T001 — Platform tenant services

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 45 | P06 Super Admin | Backend Engineer | Critical | 4d | — | — | 2026-09-22 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P05-T001, S1-P03-T004, S1-P04-T010
- **Requirements:** REQ-ADMIN-003, REQ-ADMIN-004, REQ-ADMIN-005, REQ-ADMIN-006, REQ-ADMIN-008, REQ-ADMIN-010, REQ-PLAT-003
- **Baseline:** [fact] `app/admin/*` pages list tenants only; no create/suspend logic (BA-35).
- **Objective:** Complete, audited tenant lifecycle for SUPER_ADMIN.
- **Technical work:**
  - `lib/data/platform.ts`: tenant list (cursor, search with escaped ILIKE, status), inspection projection (counts only), member list.
  - `lib/services/tenants.ts`: `createTenant` (TENANT + RESTAURANT with timezone/currency/country + closed hours rows + INVITED TENANT_ADMIN in one transaction; Clerk invitation after commit; `INVITATION_FAILED` warning path), `updateTenant` (slug reserved list, uniqueness, `confirmSlugChange`), `suspendTenant` (reason), `reactivateTenant`, `inviteTenantAdmin`, `revokeTenantAdminInvite`; audits per security.md §7.
  - Server actions SA-ADM-01…SA-ADM-06 with `requirePlatform`.
- **Files/modules:** `lib/data/platform.ts`, `lib/services/tenants.ts`, `app/admin/**/actions.ts`
- **Database:** TENANT, RESTAURANT, RESTAURANT_HOURS, USER, USER_TENANT, AUDIT_LOG.
- **API:** SA-ADM-01, SA-ADM-02, SA-ADM-03, SA-ADM-04, SA-ADM-05, SA-ADM-06, LD-ADM-01, LD-ADM-02, LD-ADM-03.
- **Frontend:** Consumed by S1-P06-T003…T006.
- **Security:** SC-RBAC-03, SC-RBAC-07, SC-AUD-01.
- **Tests:**
  - `TC-ADMIN-003` [integration] Create tenant commits tenant, restaurant and INVITED admin atomically; invitation failure leaves tenant with resendable invite and warning.
  - `TC-ADMIN-004` [integration] Slug validation rejects reserved words, bad patterns and duplicates; slug change requires confirmation and is audited.
  - `TC-ADMIN-005` [integration] Suspend requires 10–500 char reason; staff denied next request; reactivate restores access.
  - `TC-ADMIN-007` [integration] Revoking a pending admin invitation marks membership INACTIVE and revokes the Clerk invitation.
- **Acceptance criteria:**
  - Every platform action writes the audit action listed in security.md §7.
  - Platform services cannot be called with a `TenantContext` (type check).
- **Implementation notes:** Platform tenant services on lib/data/platform-tenants.ts + lib/services/platform-tenants.ts with app/admin/actions.ts: tenant list/inspection reads, create tenant (restaurant, timezone/currency/country required), update, suspend/reactivate, TENANT_ADMIN invite/revoke through lib/auth/clerk-admin.ts with compensation. Every action starts with requirePlatform; tenant roles are refused before anything is read. Integration suites in tests/integration/platform (create/update/suspend/invites/reads/authz) run against a local HTTP stub of the Clerk Backend API — the real Clerk API is never called.
- **Affected files (actual):** lib/data/platform-tenants.ts, lib/services/platform-tenants.ts, lib/validation/platform.ts, app/admin/actions.ts, tests/integration/platform/**

### S1-P06-T002 — Admin shell and platform guard

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 62 | P06 Super Admin | Frontend Engineer | Critical | 1d | — | — | 2026-09-23 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P04-T002, S1-P08-T008
- **Requirements:** REQ-RBAC-004, REQ-ADMIN-001
- **Baseline:** [fact] `components/admin/SuperAdminNav.tsx` without guard.
- **Objective:** Platform console layout available only to SUPER_ADMIN.
- **Technical work:**
  - `app/admin/layout.tsx` with `requirePlatform("platform:tenant:read")`, `AdminShell` (nav: Dashboard, Tenants, Audit; user menu); ForbiddenState for others.
- **Files/modules:** `app/admin/layout.tsx`, `components/layout/AdminShell.tsx`
- **Database:** None.
- **API:** None.
- **Frontend:** `/admin/*` shell.
- **Security:** SC-RBAC-03.
- **Tests:**
  - `TC-ADMIN-009` [e2e] TENANT_ADMIN and MANAGER visiting `/admin`, `/admin/tenants` and `/admin/audit` see ForbiddenState with no tenant list in HTML.
- **Acceptance criteria:**
  - Baseline `SuperAdminNav` removed.
- **Implementation notes:** Already delivered by S1-P08-T008 under ADR-013: app/admin/layout.tsx calls requirePlatformPage('platform:tenant:read') and components/layout/admin-shell.tsx is the header-navigation shell — one sticky glass-1 header, no sidebar, platform brand context and user menu. The baseline components/admin/SuperAdminNav.tsx is gone. Verified here rather than rebuilt: TC-ADMIN-009 now drives every admin page (overview, restaurants, new, detail, audit and the layout) with TENANT_ADMIN and MANAGER and asserts the /account/forbidden redirect with no restaurant name in the result. Toaster was added to the shell so the lifecycle actions of T006 can confirm themselves.
- **Affected files (actual):** app/admin/layout.tsx, components/layout/admin-shell.tsx, tests/integration/platform/admin-console.test.ts

### S1-P06-T003 — Platform dashboard page

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 63 | P06 Super Admin | Frontend Engineer | High | 2d | — | — | 2026-09-23 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P06-T001, S1-P06-T002
- **Requirements:** REQ-ADMIN-001
- **Baseline:** [fact] `app/admin/page.tsx` counts tenants and shows static cards.
- **Objective:** Honest platform overview.
- **Technical work:**
  - Stat cards (active, suspended), recent tenants table, recent platform audit list; empty state "No tenants yet" → Create tenant.
- **Files/modules:** `app/admin/page.tsx`
- **Database:** None.
- **API:** LD-ADM-01.
- **Frontend:** `/admin`.
- **Security:** None.
- **Tests:**
  - `TC-ADMIN-001` [e2e] Dashboard shows seeded active/suspended counts and recent tenants; empty database shows create CTA.
- **Acceptance criteria:**
  - All widgets reflect database values; loading/empty/error states present.
- **Implementation notes:** app/admin/page.tsx rewritten on LD-ADM-01 (getPlatformDashboard): three sections rather than a wall of tiles (ADR-013 §4) — active/suspended/total restaurants, the newest restaurants as a DataTable linking to each one, and the recent platform trail with a link to the full log. Every number is a count read this request; there is no uptime or 'operational' badge (BA-30), and a test asserts the page text never says one. The empty table carries the create action, which is what a platform with no restaurants sees.
- **Affected files (actual):** app/admin/page.tsx, components/admin/public-address.tsx, tests/integration/platform/admin-pages.test.ts

### S1-P06-T004 — Tenant list page

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 64 | P06 Super Admin | Frontend Engineer | High | 2d | — | — | 2026-09-23 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P06-T003, S1-P08-T007
- **Requirements:** REQ-ADMIN-002
- **Baseline:** [fact] `components/admin/TenantList.tsx` "Open Console" has no handler.
- **Objective:** Searchable, filterable tenant list.
- **Technical work:**
  - `FilterBar` (search, status) synced to URL; `DataTable` columns per frontend.md; cursor pagination; row links to detail.
- **Files/modules:** `app/admin/tenants/page.tsx`
- **Database:** None.
- **API:** LD-ADM-02.
- **Frontend:** `/admin/tenants`.
- **Security:** None.
- **Tests:**
  - `TC-ADMIN-002` [e2e] Search by name and filter SUSPENDED return expected rows; pagination moves through >25 tenants.
- **Acceptance criteria:**
  - Responsive card mode below 768 px.
- **Implementation notes:** app/admin/tenants/page.tsx rewritten on LD-ADM-02 (listTenantsForPlatform): FilterBar (search, status, sort) whose values live in the URL, DataTable (restaurant, public address, status, website, staff, created) that becomes cards below 768 px, and cursor Pagination. Only the four keys the loader owns are read from the query; anything else is ignored. The baseline components/admin/TenantList.tsx and its dead 'Open Console' button are deleted (BA-35), along with the interim listPlatformTenants/countPlatformTenants readers nothing calls any more. Deviation from frontend.md §5.2: sorting is a control in the filter bar, not a bidirectional column header, because LD-ADM-02 offers exactly two orderings (name A–Z, newest first) and a reversible header would announce a sort the loader cannot perform.
- **Affected files (actual):** app/admin/tenants/page.tsx, components/admin/public-address.tsx, lib/data/platform-tenants.ts, components/admin/TenantList.tsx (deleted), tests/integration/platform/admin-pages.test.ts

### S1-P06-T005 — Create tenant flow

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 65 | P06 Super Admin | Frontend Engineer | Critical | 2d | — | — | 2026-09-23 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P06-T004, S1-P08-T005
- **Requirements:** REQ-ADMIN-003, REQ-REST-005
- **Baseline:** None.
- **Objective:** SUPER_ADMIN onboards a restaurant in one form.
- **Technical work:**
  - Form sections (tenant & restaurant; first administrator); `SlugField` pattern + availability hint; `TimezoneSelect` (searchable IANA list grouped by region, default per Q-005); `CurrencySelect`; `CountrySelect`; error summary; success redirect with toast.
- **Files/modules:** `app/admin/tenants/new/page.tsx`, `components/domain/admin/*`
- **Database:** None.
- **API:** SA-ADM-01.
- **Frontend:** `/admin/tenants/new`.
- **Security:** SC-VAL-01.
- **Tests:**
  - `TC-ADMIN-010` [e2e] Create tenant happy path lands on detail with invitation toast; duplicate slug shows field error without losing input.
- **Acceptance criteria:**
  - Keyboard-only completion possible; axe clean.
- **Implementation notes:** app/admin/tenants/new/page.tsx + components/admin/create-tenant-form.tsx on SA-ADM-01. Three sections: the restaurant, its public address, its first administrator. Time zone, currency and country are required, visible and prefilled Asia/Kolkata / INR / IN — Q-005 A, answered 2026-09-22; the stale 'Q-005 is OPEN' note in lib/validation/platform.ts is corrected. The option lists are built on the server from Intl (lib/ui/locale-options.ts), so they cannot drift from what the schema accepts and the form works before JavaScript loads; the canonical ICU spellings Intl returns (Asia/Calcutta, Europe/Kiev) are shown and stored under their modern IANA names. The slug is suggested from the restaurant name (lib/ui/slug.ts), checked for availability as it is typed through checkTenantSlugAction, and shown as the address it will become; it is a hint only — a collision that races it comes back as a SLUG_TAKEN field error, which TC-ADMIN-010 proves. Success lands on the new restaurant's page with ?created=1&invitation=…; the confirmation is a dismissible Alert on that page rather than a toast, because it has to survive the navigation and a reload.
- **Affected files (actual):** app/admin/tenants/new/page.tsx, components/admin/create-tenant-form.tsx, lib/ui/locale-options.ts, lib/ui/slug.ts, lib/validation/platform.ts

### S1-P06-T006 — Tenant inspection and lifecycle page

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 66 | P06 Super Admin | Frontend Engineer | Critical | 3d | — | — | 2026-09-23 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P06-T005
- **Requirements:** REQ-ADMIN-004, REQ-ADMIN-005, REQ-ADMIN-006, REQ-ADMIN-007, REQ-ADMIN-008
- **Baseline:** None.
- **Objective:** Inspect tenant metadata and perform lifecycle operations safely.
- **Technical work:**
  - Detail header with status badge and actions (Edit, Suspend, Reactivate); description list; restaurant summary; members table with invite/revoke; counts; lifecycle history from audit.
  - `ConfirmDialog` for suspend (reason textarea 10–500) and reactivate; `InviteAdminDialog`.
- **Files/modules:** `app/admin/tenants/[tenantId]/page.tsx`, `components/domain/admin/*`
- **Database:** None.
- **API:** LD-ADM-03, SA-ADM-02, SA-ADM-03, SA-ADM-04, SA-ADM-05, SA-ADM-06.
- **Frontend:** `/admin/tenants/[tenantId]`.
- **Security:** SC-RBAC-07.
- **Tests:**
  - `TC-ADMIN-006` [integration] Inspection loader returns counts and members only — no order, customer, transaction or menu rows.
  - `TC-ADMIN-011` [e2e] Suspending a tenant with a reason makes that tenant's staff see the suspended page on next navigation.
- **Acceptance criteria:**
  - Invalid or unknown tenantId renders not-found.
- **Implementation notes:** app/admin/tenants/[tenantId]/page.tsx on LD-ADM-03 with SA-ADM-02/03/04/05/06/07: header with status and provisioning badges, details list, counts, members table and lifecycle history from the audit trail. components/admin/tenant-lifecycle.tsx holds rename, suspend (reason 10–500), reactivate and handover; components/admin/tenant-members.tsx holds invite, resend and revoke. Each action is a form inside a dialog rather than a bare confirm, so a refused reason or a stale state lands on the field that caused it, and only the actions the caller's permissions allow are rendered — the server re-checks every one. The slug is deliberately not editable (ADR-012 §4). An unknown id and a malformed id both render not-found, so the URL is no oracle. TC-ADMIN-006 asserts the loader returns counts and members and no order, customer, transaction or menu row; TC-ADMIN-011 suspends a restaurant and shows its cashier being sent to /account/suspended on the next navigation while the other restaurant is untouched. New shared primitive: components/ui/description-list.tsx.
- **Affected files (actual):** app/admin/tenants/[tenantId]/page.tsx, components/admin/tenant-lifecycle.tsx, components/admin/tenant-members.tsx, components/ui/description-list.tsx, components/layout/admin-shell.tsx

### S1-P06-T007 — Platform audit page

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 67 | P06 Super Admin | Frontend Engineer | High | 2d | — | — | 2026-09-23 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P06-T006, S1-P04-T010
- **Requirements:** REQ-ADMIN-009, REQ-AUDIT-007
- **Baseline:** None.
- **Objective:** SUPER_ADMIN reviews platform-level events.
- **Technical work:**
  - `lib/data/audit.ts#listPlatformAudit` (tenant_id NULL or tenant lifecycle actions); `app/admin/audit/page.tsx` with filters and expandable redacted diffs.
- **Files/modules:** `lib/data/audit.ts`, `app/admin/audit/page.tsx`
- **Database:** AUDIT_LOG.
- **API:** LD-ADM-04.
- **Frontend:** `/admin/audit`.
- **Security:** SC-AUD-05.
- **Tests:**
  - `TC-ADMIN-008` [integration] Platform audit returns tenant lifecycle and platform rows but not tenant operational events (e.g. `order.created`).
- **Acceptance criteria:**
  - Timestamps shown in UTC with zone label (platform context has no restaurant timezone).
- **Implementation notes:** lib/data/audit.ts#listPlatformAudit + platformAuditFilterOptions and app/admin/audit/page.tsx on LD-ADM-04. PLATFORM_AUDIT_WHERE now lives in lib/data/audit.ts and the dashboard reads the same clause, so the two views cannot drift: platform rows plus tenant lifecycle and tenant_admin rows, never a restaurant's operational trail — TC-ADMIN-008 proves order.created exists for tenant A and never reaches the page. Filters (action, restaurant, date range) live in the URL, entries expand to the redacted before/after diff through the existing DiffView, and times are UTC with the zone named because a platform page has no one restaurant's time zone. /admin/audit joined ADMIN_NAV_ITEMS.
- **Affected files (actual):** lib/data/audit.ts, lib/data/platform-tenants.ts, app/admin/audit/page.tsx, lib/ui/navigation.ts, tests/unit/navigation.test.tsx

### S1-P06-T008 — SUPER_ADMIN bootstrap command

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 46 | P06 Super Admin | Backend Engineer | High | 1d | — | — | 2026-09-22 | 2026-09-22 | COMPLETED |

- **Dependencies:** S1-P02-T007
- **Requirements:** REQ-RBAC-004, REQ-PLAT-003
- **Baseline:** [fact] No mechanism to create a platform administrator.
- **Objective:** A controlled, audited way to grant the first SUPER_ADMIN in any environment.
- **Technical work:**
  - `scripts/grant-super-admin.ts` (`npm run platform:grant-super-admin -- --email x --confirm`): creates/links USER with `platform_role = SUPER_ADMIN`, sends Clerk invitation if new, writes `platform.role_changed` (actor SYSTEM); refuses without `--confirm`; prints no secrets.
- **Files/modules:** `scripts/grant-super-admin.ts`, `package.json`
- **Database:** USER, AUDIT_LOG.
- **API:** None.
- **Frontend:** None.
- **Security:** SC-RBAC-03.
- **Tests:**
  - `TC-ADMIN-012` [integration] Command grants the role once, is idempotent, writes one audit row, and refuses without confirmation.
- **Acceptance criteria:**
  - Documented in `operations/deployment.md` first-run steps.
- **Implementation notes:** npm run platform:grant-super-admin -- --email <email> --confirm [--no-invite]: sets USER.platform_role = SUPER_ADMIN (creating an INVITED user when needed), sends a Clerk invitation unless --no-invite, audits platform.super_admin_granted. Documented in operations/deployment.md first-run steps. TC-ADMIN-012 passes.
- **Affected files (actual):** lib/platform/grant-super-admin.ts, scripts/grant-super-admin.ts, package.json, knowledge/operations/deployment.md, tests/integration/platform-cli/grant-super-admin.test.ts

### S1-P06-T009 — Tenant provisioning and handover flow

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 230 | P06 Super Admin | Backend Engineer | Critical | 3d | — | — | 2026-09-23 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P06-T005, S1-P07-T010
- **Requirements:** REQ-TENANT-001, REQ-REST-001
- **Baseline:** None — tenant creation exists, provisioning of website defaults does not.
- **Objective:** Creating a tenant produces a working restaurant: slug, restaurant record with timezone/currency/country (prefilled Asia/Kolkata, INR, IN per Q-005), default website sections, default theme and the first TENANT_ADMIN invitation — then handover.
- **Technical work:**
  - Extend the create-tenant service to seed `WEBSITE_SECTION` defaults and a `PLATFORM` theme in the same transaction.
  - Record handover: `tenant.handed_over` audit action written when the Super Admin marks the tenant handed over; the platform console shows provisioning vs handed-over state.
  - Slug is immutable after creation (ADR-012 §4) and validated against the reserved-label list.
- **Files/modules:** `lib/services/platform-tenants.ts`, `lib/data/platform-tenants.ts`, `app/admin/**`
- **Database:** TENANT, RESTAURANT, WEBSITE_SECTION, USER_TENANT, AUDIT_LOG.
- **API:** SA-ADM-01, SA-ADM-05.
- **Frontend:** Create-tenant flow.
- **Security:** SC-RBAC-03, SC-TEN-01.
- **Tests:**
  - `TC-ADMIN-013` [integration] Creating a tenant yields a restaurant, default sections and a themed public site that renders before anyone edits it.
  - `TC-ADMIN-014` [integration] Reserved labels (`app`, `admin`, `api`, `www`, …) and duplicate slugs are rejected; a tenant role cannot create a tenant.
- **Acceptance criteria:**
  - A newly created tenant's public site renders with no manual editing.
  - Nothing outside the platform console can create a tenant or change a slug.
- **Implementation notes:** Creating a tenant now seeds the eleven default website sections and an explicit PLATFORM/DARK theme inside the tenant's own transaction (proved by matching xmin), so a new restaurant's public site renders before anyone edits it. The slug is immutable after provisioning (422 SLUG_IMMUTABLE) and validated against the reserved host list shared with lib/tenancy/hostnames.ts. Handover is handOverTenantAction (platform:tenant:update): it requires an ACTIVE TENANT_ADMIN (409 HANDOVER_NOT_READY), is idempotent, and is recorded as the append-only tenant.handed_over audit row that inspectTenant derives provisioningState/handedOverAt from — no schema change. Tests: tests/integration/platform/provisioning.test.ts (TC-ADMIN-013/014).
- **Affected files (actual):** lib/data/platform-tenants.ts, lib/services/platform-tenants.ts, app/admin/actions.ts, lib/validation/platform.ts, tests/integration/platform/provisioning.test.ts

## P07 — Restaurant Management

9 tasks · 24 ideal days of effort · sequence #47–#70 (interleaved with other phases where dependencies allow)

### S1-P07-T001 — Restaurant settings services

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 48 | P07 Restaurant Management | Backend Engineer | Critical | 3d | — | — | 2026-09-22 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P05-T001, S1-P04-T010, S1-P02-T011, S1-P07-T002
- **Requirements:** REQ-REST-001, REQ-REST-002, REQ-REST-003, REQ-REST-004, REQ-REST-005, REQ-REST-006, REQ-REST-007, REQ-REST-008, REQ-REST-011, REQ-TZ-001, REQ-TXN-011
- **Baseline:** [fact] `app/restaurant/settings/actions.ts` updates profile only; `openingHours` stored as free text JSON.
- **Objective:** Server-side, validated, audited restaurant configuration.
- **Technical work:**
  - `lib/data/restaurant.ts` and `lib/services/restaurant.ts`: profile, branding (URL allowlist, accent contrast ≥ 4.5:1 vs `#FBF9F5`), hours replace-set (non-overlapping shifts, overnight), operational settings (IANA validation, currency lock INV-09, optional GSTIN format validation stored uppercase — Q-004), website settings and publish readiness checks (name, timezone, ≥1 published category with ≥1 published item).
  - Actions SA-RST-01…SA-RST-06; loader LD-RST-01; `revalidatePath` for public site on website/branding changes.
- **Files/modules:** `lib/data/restaurant.ts`, `lib/services/restaurant.ts`, `app/restaurant/(console)/settings/actions.ts`, `app/restaurant/(console)/website/actions.ts`
- **Database:** RESTAURANT, RESTAURANT_HOURS, AUDIT_LOG.
- **API:** LD-RST-01, SA-RST-01, SA-RST-02, SA-RST-03, SA-RST-04, SA-RST-05, SA-RST-06.
- **Frontend:** Consumed by S1-P07-T005, S1-P07-T007.
- **Security:** SC-VAL-01, SC-VAL-04, SC-AUD-01.
- **Tests:**
  - `TC-REST-002` [integration] Profile update validates lengths/E.164/email and audits before/after.
  - `TC-REST-003` [integration] Branding rejects non-allowlisted image hosts and low-contrast accent colours.
  - `TC-REST-004` [integration] Hours replace rejects overlapping shifts, accepts overnight closing and split shifts.
  - `TC-REST-005` [integration] Operational settings reject invalid IANA zones and persist valid ones with audit.
  - `TC-REST-006` [integration] Currency change fails with `CURRENCY_LOCKED` once any order exists.
  - `TC-REST-009` [integration] Operational settings accept a valid GSTIN (stored uppercase), reject malformed values, allow clearing it, and audit the change.
  - `TC-TZ-001` [unit] `isValidTimeZone` accepts `Asia/Kolkata`, rejects `IST` and `GMT+5:30`.
  - `TC-WEB-006` [integration] Contact visibility flags remove phone/email/address from the public projection.
  - `TC-WEB-007` [integration] Publishing the website fails with `WEBSITE_NOT_READY` listing missing prerequisites.
- **Acceptance criteria:**
  - All inputs validated server-side with strict schemas; every change audited.
- **Implementation notes:** Restaurant settings services (LD-RST-01, SA-RST-01…06) on lib/data/restaurant.ts + lib/services/restaurant-settings.ts, split into app/restaurant/settings/{actions,website-actions,sections-actions}.ts by permission. Profile, branding, opening hours (split shifts, overnight), operational settings with the currency lock (INV-09), website settings and publish readiness. Audited before/after in the same transaction with PII masked. tests/integration/settings/settings.test.ts green after aligning it with the SA-RST-01 contract (profile only; branding is SA-RST-02).
- **Affected files (actual):** lib/data/restaurant.ts, lib/services/restaurant-settings.ts, lib/validation/settings.ts, app/restaurant/settings/*.ts, tests/integration/settings/settings.test.ts

### S1-P07-T002 — Image URL allowlist validation

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 47 | P07 Restaurant Management | Security Engineer | High | 1d | — | — | 2026-09-22 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P04-T006
- **Requirements:** REQ-SEC-006, REQ-REST-002
- **Baseline:** [fact] Image URLs accept any URL (`app/restaurant/menu/items-actions.ts:14`, BA-39).
- **Objective:** Image URLs cannot be used for SSRF, tracking hosts or mixed content.
- **Technical work:**
  - `lib/validation/url.ts#imageUrl()`: `https:` only, host in `ALLOWED_IMAGE_HOSTS` (env, comma-separated) or media store host, no credentials, no IP literals, no non-default ports, ≤ 2048 chars.
  - `next.config.ts` `images.remotePatterns` generated from the same allowlist.
- **Files/modules:** `lib/validation/url.ts`, `next.config.ts`
- **Database:** None.
- **API:** SA-RST-02, SA-MENU-06, SA-MENU-07.
- **Frontend:** `next/image` allowlist.
- **Security:** SC-VAL-04.
- **Tests:**
  - `TC-SEC-003` [unit] Rejects `http:`, `https://169.254.169.254/`, `https://user:pass@host`, `https://evil.test`, `https://allowed.test:8443`; accepts allowlisted hosts.
- **Acceptance criteria:**
  - Allowlist is configured per environment and documented.
- **Implementation notes:** Image URLs are restricted to https on an allow-list of hosts (Q-009 A) before they reach the database, with unit coverage in tests/unit/image-url.test.ts and tests/unit/settings-validation.test.ts. The database backs this up: migration 0002 adds https-only CHECKs on every website URL column.
- **Affected files (actual):** lib/validation/settings.ts, tests/unit/image-url.test.ts, tests/unit/settings-validation.test.ts, prisma/migrations/0002_tenant_website_theme/migration.sql

### S1-P07-T003 — Kitchen sections services and actions

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 49 | P07 Restaurant Management | Backend Engineer | High | 2d | — | — | 2026-09-22 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P07-T001
- **Requirements:** REQ-REST-009, REQ-KOT-009
- **Baseline:** [fact] Stations hard-coded in `app/restaurant/kds/page.tsx:130`.
- **Objective:** Tenant-defined kitchen sections for KOT routing and printers.
- **Technical work:**
  - `lib/services/kitchen-sections.ts`: create, update, archive (blocked when active printer routes to it or open KOTs exist), reorder full set; SA-KSEC-01…04 with audit.
- **Files/modules:** `lib/data/kitchen-sections.ts`, `lib/services/kitchen-sections.ts`, `app/restaurant/(console)/settings/sections-actions.ts`
- **Database:** KITCHEN_SECTION, AUDIT_LOG.
- **API:** SA-KSEC-01, SA-KSEC-02, SA-KSEC-03, SA-KSEC-04.
- **Frontend:** Settings Kitchen sections tab.
- **Security:** SC-TEN-02.
- **Tests:**
  - `TC-KOT-007` [integration] Section CRUD with unique codes; archive blocked with `SECTION_IN_USE`; reorder rejects foreign or missing ids.
- **Acceptance criteria:**
  - Sections used by menu items, printers and KOTs across later phases.
- **Implementation notes:** Kitchen sections (SA-KSEC-01…04) in lib/services/kitchen-sections.ts + app/restaurant/settings/sections-actions.ts: create with per-tenant unique code (422 CODE_TAKEN), rename, archive refused while menu items still use the section (409 SECTION_IN_USE), reorder over exactly the active set, all audited. New tests/integration/settings/kitchen-sections.test.ts covers TC-KOT-007, TC-RBAC-113 (TENANT_ADMIN only) and TI-019 404 parity.
- **Affected files (actual):** lib/data/kitchen-sections.ts, lib/services/kitchen-sections.ts, app/restaurant/settings/sections-actions.ts, tests/integration/settings/kitchen-sections.test.ts

### S1-P07-T004 — Staff management services

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 50 | P07 Restaurant Management | Backend Engineer | Critical | 3d | — | — | 2026-09-22 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P05-T003, S1-P03-T004
- **Requirements:** REQ-REST-010, REQ-RBAC-005, REQ-RBAC-006, REQ-AUTH-011
- **Baseline:** [fact] No staff management.
- **Objective:** Invite and manage tenant staff with hierarchy rules and Clerk invitations.
- **Technical work:**
  - `lib/services/staff.ts`: invite (create USER if needed, USER_TENANT INVITED, Clerk invitation, rate limit 30/hour per tenant), resend, revoke, change role, deactivate (revoke sessions if no other active membership), reactivate; audits.
  - Loader LD-STF-01 with assignable roles.
- **Files/modules:** `lib/data/staff.ts`, `lib/services/staff.ts`, `app/restaurant/(console)/staff/actions.ts`
- **Database:** USER, USER_TENANT, AUDIT_LOG.
- **API:** LD-STF-01, SA-STF-01, SA-STF-02, SA-STF-03, SA-STF-04, SA-STF-05, SA-STF-06.
- **Frontend:** Consumed by S1-P07-T006.
- **Security:** SC-RBAC-04, SC-RBAC-05, SC-AUTH-08.
- **Tests:**
  - `TC-STAFF-002` [integration] Invite creates INVITED membership and a Clerk invitation; duplicate member returns `ALREADY_MEMBER`.
  - `TC-STAFF-003` [integration] Revoking an invite deactivates membership and revokes the Clerk invitation.
  - `TC-STAFF-004` [integration] Deactivate/reactivate change access on next request; deactivation of the user's last membership revokes sessions.
- **Acceptance criteria:**
  - Hierarchy and last-TENANT_ADMIN rules enforced for every action.
- **Implementation notes:** Staff management (LD-STF-01, SA-STF-01…06) in lib/services/staff.ts on lib/services/staff-rules.ts: invite with hierarchy and rate limit, resend/revoke invitation, role change with last-TENANT_ADMIN and self-change protection, deactivate/reactivate with Clerk session revocation. New tests/integration/staff/staff.test.ts (10 cases) proves a deactivated member is denied on the very next request — the outstanding half of TC-AUTH-014 — plus Clerk-failure compensation and 404 parity for another tenant's membership id.
- **Affected files (actual):** lib/data/staff.ts, lib/services/staff.ts, lib/validation/staff.ts, app/restaurant/staff/actions.ts, tests/integration/staff/staff.test.ts

### S1-P07-T005 — Restaurant settings UI

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 68 | P07 Restaurant Management | Frontend Engineer | High | 4d | — | — | 2026-09-23 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P07-T001, S1-P07-T003, S1-P08-T005, S1-P08-T006, S1-P08-T008
- **Requirements:** REQ-REST-001, REQ-REST-003, REQ-REST-004, REQ-REST-005, REQ-REST-008, REQ-REST-009, REQ-PLAT-005
- **Baseline:** [fact] `app/restaurant/settings/page.tsx:12-20` initialises with hard-coded demo values (BA-27).
- **Objective:** Settings screens load and save real tenant data.
- **Technical work:**
  - Tabs: Profile, Opening hours (7-day editor with split shifts and "copy to all days"), Operations (timezone with live local time preview, currency locked indicator, country, default order type, auto-print KOT, receipt footer), Kitchen sections (SortableList).
  - Read-only rendering for roles without update permissions.
- **Files/modules:** `app/restaurant/(console)/settings/page.tsx`, `components/domain/settings/*`
- **Database:** None.
- **API:** LD-RST-01, SA-RST-01, SA-RST-03, SA-RST-04, SA-KSEC-01, SA-KSEC-02, SA-KSEC-03, SA-KSEC-04.
- **Frontend:** `/restaurant/settings`.
- **Security:** SC-RBAC-08.
- **Tests:**
  - `TC-REST-001` [e2e] Settings page shows the seeded Tenant A profile (not demo values), edits and saves successfully, and persists after reload.
  - `TC-REST-007` [e2e] MANAGER sees settings read-only; save controls absent.
- **Acceptance criteria:**
  - All designed states present; axe clean; responsive at all breakpoints.
- **Implementation notes:** app/restaurant/settings/page.tsx rewritten as a Server Component on LD-RST-01, with four tabs in components/settings/: Profile (SA-RST-01), Opening hours (SA-RST-03), Operations (SA-RST-04) and Kitchen sections (SA-KSEC-01…04). The baseline's hard-coded demo profile (BA-27) is gone — the saved values are read on the server and are what the first paint shows. Each tab saves on its own, because a time-zone change should not depend on the address being valid. Without the matching permission a tab renders as a description list rather than a disabled form: a disabled form invites an edit that cannot be saved, and MANAGER (who holds restaurant:read only) should not have to discover the refusal — the server still re-checks every save, which TC-REST-007 proves by calling the action directly. The hours editor runs the server's own openingHoursIssues in the browser, so an overlap is caught before the round trip and a refusal that still arrives lands on the shift that caused it; a shift closing earlier than it opens is labelled 'After midnight' rather than treated as a mistake. The currency select is disabled with its reason when orders exist (INV-09) and its current value is still submitted, so the rest of the form saves. The time-zone field shows the time it is there now instead of an offset. Branding and the public website stay on /restaurant/website (S1-P07-T011), linked from the header. Option lists come from lib/ui/locale-options.ts, and a test asserts they offer exactly what the schema accepts (Asia/Kolkata, never Intl's canonical Asia/Calcutta).
- **Affected files (actual):** app/restaurant/settings/page.tsx, components/settings/settings-tabs.tsx, components/settings/profile-form.tsx, components/settings/hours-editor.tsx, components/settings/operations-form.tsx, components/settings/kitchen-sections-editor.tsx, tests/integration/settings/settings-ui.test.ts

### S1-P07-T006 — Staff management UI

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 69 | P07 Restaurant Management | Frontend Engineer | High | 3d | — | — | 2026-09-23 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P07-T004, S1-P08-T006, S1-P08-T007, S1-P08-T008
- **Requirements:** REQ-REST-010
- **Baseline:** None.
- **Objective:** Owners and managers manage their team.
- **Technical work:**
  - `/restaurant/staff`: Invite dialog (email, name, role limited to assignable roles), tabs Active/Invited/Inactive, DataTable with role select, resend/revoke/deactivate/reactivate actions, own-row disabled with explanation, `LAST_TENANT_ADMIN` messaging.
- **Files/modules:** `app/restaurant/(console)/staff/page.tsx`, `components/domain/staff/*`
- **Database:** None.
- **API:** LD-STF-01, SA-STF-01, SA-STF-02, SA-STF-03, SA-STF-04, SA-STF-05, SA-STF-06.
- **Frontend:** `/restaurant/staff`.
- **Security:** SC-RBAC-08.
- **Tests:**
  - `TC-STAFF-001` [e2e] TENANT_ADMIN invites a CASHIER; MANAGER's role select offers only CASHIER, WAITER, KITCHEN; invited user accepts and appears Active.
- **Acceptance criteria:**
  - Invitation acceptance verified end to end with Clerk testing tokens.
- **Implementation notes:** app/restaurant/staff/page.tsx + components/staff/staff-board.tsx on LD-STF-01 and SA-STF-01…06. Three tabs — active, invited, deactivated — with their counts, a role select on each row, and invite / resend / revoke / deactivate / reactivate behind confirmation. A control appears only when the caller may use it: assignableRoles comes from the server and is the list the server enforces, canManage is decided per member by the role hierarchy, and the caller's own row explains why its role cannot be changed here. A rule refusal (LAST_TENANT_ADMIN, ROLE_NOT_ASSIGNABLE, SELF_CHANGE_NOT_ALLOWED) is shown as the server worded it and stays on the page until the next attempt — the UI never predicts these. A deactivated person who never accepted is offered 'Invite again' rather than 'Reactivate', because reactivation is for someone who had accepted. The page reads the whole team once (a bounded 200-row read of one restaurant) and groups it here, so every tab shows its count without a second query; LD-STF-01's status filter stays for API callers. /restaurant/staff joined NAV_ITEMS as Management → Staff, which is where frontend.md §3.1 puts it. TC-STAFF-001 renders the page for TENANT_ADMIN and MANAGER, checks the role lists and canManage flags, refuses CASHIER/KITCHEN/WAITER, and invites a cashier who then signs in for the first time — the session resolver links the identity and the person appears ACTIVE, which is the real acceptance path, not a database edit.
- **Affected files (actual):** app/restaurant/staff/page.tsx, components/staff/staff-board.tsx, lib/ui/navigation.ts, tests/integration/staff/staff-ui.test.ts, tests/unit/navigation.test.tsx

### S1-P07-T007 — Website and branding UI

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 70 | P07 Restaurant Management | Frontend Engineer | High | 3d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P07-T001, S1-P07-T002, S1-P08-T005, S1-P08-T008
- **Requirements:** REQ-REST-002, REQ-REST-007, REQ-WEB-009
- **Baseline:** None.
- **Objective:** Owners control branding and public website publication.
- **Technical work:**
  - `/restaurant/website`: status header with public URL copy/open; Branding (logo/cover URL fields or uploads if Q-009, accent picker with live contrast result); Visibility toggles; SEO fields with counters and search preview; readiness checklist; Publish/Unpublish.
- **Files/modules:** `app/restaurant/(console)/website/page.tsx`, `components/domain/website/*`
- **Database:** None.
- **API:** LD-RST-01, SA-RST-02, SA-RST-05, SA-RST-06.
- **Frontend:** `/restaurant/website`.
- **Security:** SC-VAL-04.
- **Tests:**
  - `TC-REST-008` [e2e] Owner sets branding and SEO, sees readiness checklist, publishes, and the public site becomes reachable.
- **Acceptance criteria:**
  - Publish button disabled with explanation until readiness passes.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P07-T008 — Decision: media storage for images

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 51 | P07 Restaurant Management | Gopala Krishna (Project Owner) | Medium | 1d | — | — | 2026-09-22 | 2026-09-22 | COMPLETED |

- **Dependencies:** S1-P01-T010
- **Requirements:** REQ-SEC-010
- **Baseline:** Q-009 open.
- **Objective:** Decide whether SLICE-01 supports image uploads and which storage provider.
- **Technical work:**
  - Answer Q-009; if uploads approved, create ADR for the storage provider (bucket, region, cost, data residency) before S1-P07-T009 starts.
- **Files/modules:** `knowledge/implementation/slice-01/open-questions.md`, `knowledge/decisions/*`
- **Database:** Determines whether MEDIA_ASSET is created.
- **API:** RH-MEDIA-01, SA-MEDIA-01 gated.
- **Frontend:** Upload vs URL fields.
- **Security:** None.
- **Tests:**
  - None — decision record.
- **Acceptance criteria:**
  - Q-009 status ANSWERED; ADR created if uploads approved.
- **Implementation notes:** Q-009 answered A by the Project Owner on 2026-09-22: allow-listed HTTPS image URLs only in SLICE-01; no uploads, so no storage ADR is needed.
- **Affected files (actual):** knowledge/implementation/slice-01/open-questions.md

### S1-P07-T009 — Media uploads (decision-gated by Q-009)

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 52 | P07 Restaurant Management | Backend Engineer | Medium | 4d | — | — | 2026-09-22 | 2026-09-22 | NOT_APPLICABLE |

- **Dependencies:** S1-P07-T008, S1-P07-T002
- **Requirements:** REQ-SEC-010, REQ-REST-002, REQ-MENU-003
- **Baseline:** None.
- **Objective:** If approved, secure tenant-isolated image uploads; otherwise record the task as not applicable.
- **Technical work:**
  - Storage adapter `lib/media/storage.ts` (signed PUT URL, 5 min; private bucket; key `tenants/{tenantId}/{uuid}.{ext}`).
  - RH-MEDIA-01 (same-origin check, size/type pre-check, rate limit), SA-MEDIA-01 (fetch from own bucket by key, magic-byte sniff, re-encode with `sharp`, strip metadata, ≤4096 px, set READY), migration adding MEDIA_ASSET.
  - Upload components for logo, cover and menu item images.
- **Files/modules:** `lib/media/*`, `app/api/v1/media/uploads/route.ts`, `components/ui/image-upload.tsx`, `prisma/migrations/*_media_assets`
- **Database:** MEDIA_ASSET.
- **API:** RH-MEDIA-01, SA-MEDIA-01.
- **Frontend:** `ImageUpload` in website and menu editors.
- **Security:** SC-FILE-01, SC-FILE-02, SC-CSRF-02.
- **Tests:**
  - `TC-SEC-016` [integration] SVG, polyglot and >5 MB files are rejected; JPEG with GPS EXIF is re-encoded without metadata.
  - `TC-SEC-017` [integration] Storage keys are tenant-prefixed; Tenant A cannot confirm or reference Tenant B asset ids.
- **Acceptance criteria:**
  - If Q-009 rejects uploads, task status set to COMPLETED with note "Not applicable — URL allowlist retained" and TC-SEC-016/017 marked N/A in testing.md.
- **Implementation notes:** Not applicable: Q-009 answered A (2026-09-22) — no image uploads in SLICE-01. Images are allow-listed HTTPS URLs (S1-P07-T002). MEDIA_ASSET, RH-MEDIA-01 and SA-MEDIA-01 are Future Scope.
- **Affected files (actual):** —

### S1-P07-T010 — Website theme and section services

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 231 | P07 Restaurant Management | Backend Engineer | Critical | 4d | — | — | 2026-09-23 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P07-T001, S1-P07-T002
- **Requirements:** REQ-WEB-010, REQ-WEB-011
- **Baseline:** None — theme and section tables added by migration `0002_tenant_website_theme` (ADR-013 §6).
- **Objective:** Let a restaurant own its public appearance and copy, safely: presets or custom colours, surface mode, gradients, identity, social links and per-section content.
- **Technical work:**
  - `lib/data/website.ts` (theme + sections, tenant-scoped) and `lib/services/website-theme.ts`: preset resolution, `#RRGGBB` validation, server-side contrast check against the chosen surface mode (reject with field errors), https allow-list for every URL, section enable/reorder/edit with HERO always enabled.
  - Server actions under `app/restaurant/website/` guarded by `website:update`; audit `restaurant.theme_updated` / `restaurant.website_updated` in the same transaction.
  - Theme resolution helper shared with the public renderer: preset or custom → CSS custom properties.
- **Files/modules:** `lib/data/website.ts`, `lib/services/website-theme.ts`, `lib/validation/website.ts`, `app/restaurant/website/actions.ts`
- **Database:** RESTAURANT (theme columns), WEBSITE_SECTION, AUDIT_LOG.
- **API:** SA-RST-05, SA-RST-06, SA-WEB-01…03.
- **Frontend:** Consumed by S1-P07-T011 and the public site.
- **Security:** SC-VAL-02, SC-VAL-03, SC-TEN-02.
- **Tests:**
  - `TC-WEB-014` [integration] A colour that fails contrast against the chosen surface mode is rejected with a field error and nothing is written.
  - `TC-WEB-015` [integration] Tenant A cannot read or modify Tenant B's theme or sections (404 parity); section bodies are stored and rendered as text, never markup.
  - `TC-WEB-016` [integration] Disabling HERO is refused; reordering is audited; a missing section row falls back to its default.
- **Acceptance criteria:**
  - No tenant input can change another tenant's site, inject markup, or produce an unreadable colour pair.
- **Implementation notes:** lib/services/website-theme.ts resolves the four presets or CUSTOM colours per surface mode and enforces WCAG server-side before any write — each colour must clear 4.5:1 on its surface and carry a readable on-colour — returning field errors with the measured ratio. lib/data/website.ts holds the tenant-scoped reads and writes plus the unauthenticated public projection; section copy is stored and returned as plain text and HERO can never be disabled (409). Actions in app/restaurant/website/actions.ts are guarded by website:update and audited. Tests: tests/integration/website/theme.test.ts (13 cases, TC-WEB-014/015/016).
- **Affected files (actual):** lib/validation/website.ts, lib/data/website.ts, lib/services/website-theme.ts, app/restaurant/website/actions.ts, prisma/seed-data/**, tests/integration/website/theme.test.ts

### S1-P07-T011 — Website and theme customisation UI

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 232 | P07 Restaurant Management | Frontend Engineer | High | 3d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P07-T010, S1-P08-T014
- **Requirements:** REQ-WEB-010, REQ-DS-005
- **Baseline:** None.
- **Objective:** The restaurant edits its own site: colours (presets or custom), branding, details, sections and preview — the screen a client uses after handover.
- **Technical work:**
  - `/restaurant/website` with tabs Colours · Branding · Details · Sections, live preview of the tenant theme, and per-field validation errors from the server.
  - Every control is wired to a real action; saving shows success only after the server confirms.
- **Files/modules:** `app/restaurant/website/**`, `components/website/**`
- **Database:** None (through services).
- **API:** SA-WEB-01…03.
- **Frontend:** Website settings.
- **Security:** UI hides what the role cannot use; the server re-checks.
- **Tests:**
  - `TC-WEB-017` [e2e] A TENANT_ADMIN changes a colour and a section headline; the public site shows the change and the console does not.
- **Acceptance criteria:**
  - No dead controls, no fake success, no colour picker that can save an unreadable theme.
- **Implementation notes:** —
- **Affected files (actual):** —

## P08 — Design System + Frontend Foundation

13 tasks · 27 ideal days of effort · sequence #53–#77 (interleaved with other phases where dependencies allow)

### S1-P08-T001 — Design tokens and Tailwind theme

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 53 | P08 Design System + Frontend Foundation | Frontend Engineer | High | 2d | — | — | 2026-09-22 | 2026-09-22 | COMPLETED |

- **Dependencies:** S1-P01-T003
- **Requirements:** REQ-DS-001, REQ-DS-004
- **Baseline:** [fact] `tailwind.config.ts` overrides `amber-500` with `#D97706`; `app/globals.css` defines 7 variables and glow utilities.
- **Objective:** Implement design.md §2 and §4 as the only colour, radius, shadow and motion source.
- **Technical work:**
  - `app/globals.css`: semantic CSS variables for dark (console) and light (public) themes via `[data-theme]`; remove `.text-amber-glow`, `.border-amber-glow`; keep glass recipes only as named utilities `glass-header`, `glass-bar`.
  - `tailwind.config.ts`: full `primary`, `tertiary`, `neutral` (incl. 750/850), `danger` scales; semantic colour aliases mapped to variables; radius scale; shadows e1–e3; transition durations and easings; remove default palette colours not in design.md (`colors` replaced, not extended).
- **Files/modules:** `app/globals.css`, `tailwind.config.ts`
- **Database:** None.
- **API:** None.
- **Frontend:** Global.
- **Security:** None.
- **Tests:**
  - `TC-DS-001` [static] Tailwind resolved config exposes only the design.md §2.1 palette and radius scale.
- **Acceptance criteria:**
  - Baseline pages still compile (visual regressions tracked for rebuild tasks).
- **Implementation notes:** tailwind.config.ts exposes only design.md tokens (primary/tertiary/neutral/danger scales, semantic CSS variables for dark and light themes, radius md…full, shadows e1–e3); Tailwind's default palette dropped. Baseline pages compile (npm run build green). TC-DS-001 passes.
- **Affected files (actual):** tailwind.config.ts, app/globals.css, lib/ui/tokens.ts, tests/static/design-system.test.ts

### S1-P08-T002 — Typography with self-hosted fonts

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 54 | P08 Design System + Frontend Foundation | Frontend Engineer | High | 1d | — | — | 2026-09-22 | 2026-09-22 | COMPLETED |

- **Dependencies:** S1-P08-T001
- **Requirements:** REQ-DS-002, REQ-SEC-005
- **Baseline:** [fact] Google Fonts `@import url(...)` at `app/globals.css:5`.
- **Objective:** Brand typography without runtime third-party font requests.
- **Technical work:**
  - `next/font/google` Playfair Display (600, 700) and Plus Jakarta Sans (400, 500, 600, 700) with `display: swap`, CSS variables `--font-display`, `--font-sans`; type role utilities (`text-display-xl` … `text-caption`, `text-kitchen-*`), `tabular-nums` utility.
- **Files/modules:** `app/layout.tsx`, `app/globals.css`, `tailwind.config.ts`
- **Database:** None.
- **API:** None.
- **Frontend:** Global.
- **Security:** SC-HDR-02 (no external font origins needed).
- **Tests:**
  - `TC-DS-007` [e2e] Loading `/` and `/restaurant/dashboard` makes no requests to `fonts.googleapis.com` or `fonts.gstatic.com`.
- **Acceptance criteria:**
  - Type roles match design.md §3 sizes and weights.
- **Implementation notes:** next/font self-hosts Playfair Display (600/700, --font-display) and Plus Jakarta Sans (400–700, --font-sans); type roles in app/globals.css follow design.md §3. No runtime request to Google Fonts. TC-DS-007 passes (static and e2e).
- **Affected files (actual):** app/layout.tsx, app/globals.css

### S1-P08-T003 — Icon system

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 55 | P08 Design System + Frontend Foundation | Frontend Engineer | High | 1d | — | — | 2026-09-22 | 2026-09-22 | COMPLETED |

- **Dependencies:** S1-P08-T001
- **Requirements:** REQ-DS-003
- **Baseline:** [fact] `lucide-react` 0.475.0 installed; icons sized ad hoc (`w-3.5 h-3.5`, `w-8 h-8`).
- **Objective:** One icon API with fixed sizes and containers.
- **Technical work:**
  - `components/ui/icon.tsx` wrapper enforcing sizes 16/18/20/24/32 and stroke rules; `IconTile` (sm/md/lg); `lib/ui/icons.ts` domain icon map and `MENU_ICON_KEYS` from design.md §5.1; `STATUS_ICONS` map from design.md §7.
- **Files/modules:** `components/ui/icon.tsx`, `components/ui/icon-tile.tsx`, `lib/ui/icons.ts`
- **Database:** None.
- **API:** None.
- **Frontend:** Global.
- **Security:** None.
- **Tests:**
  - `TC-DS-008` [static] Source imports icons only from `lucide-react` via the wrapper or maps; JSX text in `app/` and `components/` contains no emoji code points.
- **Acceptance criteria:**
  - All names in `lib/ui/icons.ts` resolve at type-check time.
- **Implementation notes:** lib/ui/icons.ts (DOMAIN_ICONS, 26 MENU_ICONS, STATUS_ICONS with tone and label), components/ui/icon.tsx and icon-tile.tsx; all icons from lucide-react; the last three emoji (KDS note and instructions, orders table label) replaced with Lucide icons. TC-DS-008 passes.
- **Affected files (actual):** lib/ui/icons.ts, components/ui/icon.tsx, components/ui/icon-tile.tsx, app/restaurant/kds/kitchen-display.tsx, app/restaurant/orders/page.tsx

### S1-P08-T004 — Core primitives

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 56 | P08 Design System + Frontend Foundation | Frontend Engineer | High | 3d | — | — | 2026-09-22 | 2026-09-22 | COMPLETED |

- **Dependencies:** S1-P08-T002, S1-P08-T003
- **Requirements:** REQ-DS-005, REQ-DS-007
- **Baseline:** [fact] `components/ui/button.tsx`, `badge.tsx`, `card.tsx` with hard-coded hex classes; white-on-amber buttons fail contrast (design.md §2.3).
- **Objective:** Accessible, token-based primitives used everywhere.
- **Technical work:**
  - `Button` (primary, secondary, ghost, destructive, success; sm/md/lg/touch; `icon`; `loading` with width lock), `IconButton` (required `aria-label`), `Badge`, `StatusBadge` (icon + label from STATUS_ICONS), `Card` (+ header/body/footer), `Alert`, `Banner`, `Toast`/`Toaster` (live region).
- **Files/modules:** `components/ui/button.tsx`, `icon-button.tsx`, `badge.tsx`, `status-badge.tsx`, `card.tsx`, `alert.tsx`, `toast.tsx`
- **Database:** None.
- **API:** None.
- **Frontend:** Global.
- **Security:** None.
- **Tests:**
  - `TC-DS-009` [unit] Component tests: each Button variant renders token classes, loading sets `aria-busy` and keeps width, IconButton without label fails type-check, StatusBadge renders icon + text for every status.
- **Acceptance criteria:**
  - Console primary button contrast 5.60:1 and public primary 5.02:1 verified in tests.
- **Implementation notes:** components/ui: button (primary/secondary/ghost/destructive/success; sm/md/lg/touch/icon; loading with aria-busy), icon-button, badge, status-badge (icon + label, never colour alone), card, alert/banner, toast. Contrast verified in tests (lib/ui/contrast.ts). TC-DS-009 passes (tests/unit/ui-primitives.test.tsx).
- **Affected files (actual):** components/ui/{button,icon-button,badge,status-badge,card,alert,toast}.tsx, lib/ui/contrast.ts, tests/unit/ui-primitives.test.tsx

### S1-P08-T005 — Form system

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 58 | P08 Design System + Frontend Foundation | Frontend Engineer | High | 3d | — | — | 2026-09-22 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P08-T004
- **Requirements:** REQ-DS-005, REQ-DS-009, REQ-TXN-009
- **Baseline:** [fact] `components/ui/input.tsx`, `select.tsx` without error/help wiring.
- **Objective:** Consistent, accessible forms bound to server actions and shared Zod schemas.
- **Technical work:**
  - `Form` wrapper using React 19 `useActionState`; `FormField` (label, required marker, help, error with `aria-describedby`); `ErrorSummary` with focus management; inputs: TextField, TextArea, Select, Checkbox, RadioGroup, Switch, MoneyField (decimal string, currency prefix, inputmode decimal), PercentField, DateField, TimeField, SearchField; control heights md 40 / touch 48.
- **Files/modules:** `components/ui/form/*`, `components/ui/inputs/*`
- **Database:** None.
- **API:** Works with `ActionResult`.
- **Frontend:** Global.
- **Security:** SC-VAL-02 (client never converts money to number).
- **Tests:**
  - `TC-DS-010` [unit] MoneyField emits `"480.50"` strings, rejects `1e3`; field errors link via `aria-describedby`; ErrorSummary receives focus after failed submit.
- **Acceptance criteria:**
  - Placeholders never used as labels (lint/static check on `placeholder` without `label`).
- **Implementation notes:** components/ui/form: Form, FormField, FormContext and ErrorSummary bind label, description, error and aria-describedby together, surface server field errors and render a pending-aware submit button. TC-DS-010 in tests/unit/form-system.test.tsx.
- **Affected files (actual):** components/ui/form/**, components/ui/inputs/**, tests/unit/form-system.test.tsx

### S1-P08-T006 — Overlays, tabs, sortable lists, filters, pagination

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 59 | P08 Design System + Frontend Foundation | Frontend Engineer | High | 4d | — | — | 2026-09-22 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P08-T004
- **Requirements:** REQ-DS-005, REQ-DS-009
- **Baseline:** [fact] `components/ui/dialog.tsx` custom div-based dialog used only by unused `POSCheckout`.
- **Objective:** Accessible interaction primitives without a new UI library.
- **Technical work:**
  - `Dialog`/`ConfirmDialog` on native `<dialog>` (focus return, Esc, dirty-form guard); `Drawer`; `Tabs` (ARIA tabs, roving tabindex); `SortableList` (pointer drag + Move up/down buttons + live announcements); `FilterBar` synced to `searchParams`; cursor `Pagination`.
- **Files/modules:** `components/ui/dialog.tsx`, `drawer.tsx`, `tabs.tsx`, `sortable-list.tsx`, `filter-bar.tsx`, `pagination.tsx`
- **Database:** None.
- **API:** None.
- **Frontend:** Global.
- **Security:** None.
- **Tests:**
  - `TC-DS-011` [e2e] Dialog traps focus and returns it on close; Esc closes; Tabs switch with arrow keys; SortableList reorders via keyboard with announcement.
- **Acceptance criteria:**
  - Keyboard-only operation for every primitive.
- **Implementation notes:** Overlays and list controls: dialog, drawer (with a bottom sheet for the mobile More menu), menu/popover, tabs, filter bar, pagination and sortable list, all keyboard- and focus-managed on the three-level glass system. Covered by tests/unit/overlays.test.tsx.
- **Affected files (actual):** components/ui/{dialog,drawer,menu,tabs,filter-bar,pagination,sortable-list}.tsx, components/ui/use-modal.ts, tests/unit/overlays.test.tsx

### S1-P08-T007 — Data table

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 60 | P08 Design System + Frontend Foundation | Frontend Engineer | High | 2d | — | — | 2026-09-22 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P08-T004
- **Requirements:** REQ-DS-005, REQ-DS-010
- **Baseline:** [fact] Tables hand-built per page (e.g. `app/restaurant/transactions/page.tsx:94-139`).
- **Objective:** One table implementation with aligned numbers and responsive card mode.
- **Technical work:**
  - `DataTable` with column definitions (align, numeric with tabular numerals, truncate with title), sortable headers with `aria-sort`, row actions menu (`Ellipsis`), empty slot, compact/comfortable density, card mode < 768 px preserving label/value pairs.
- **Files/modules:** `components/ui/data-table/*`
- **Database:** None.
- **API:** None.
- **Frontend:** Global.
- **Security:** None.
- **Tests:**
  - `TC-DS-012` [e2e] Reference table renders cards at 390 px without horizontal page scroll; money column right-aligned at 1440 px.
- **Acceptance criteria:**
  - Used by every list page from P06 onward.
- **Implementation notes:** components/ui/data-table: column definitions, sortable headers, row actions, and a card layout below 768 px that keeps every label and value pair. Covered by tests/unit/data-table.test.tsx.
- **Affected files (actual):** components/ui/data-table/**, tests/unit/data-table.test.tsx

### S1-P08-T008 — Application shells and navigation

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 61 | P08 Design System + Frontend Foundation | Frontend Engineer | High | 3d | — | — | 2026-09-22 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P08-T006, S1-P05-T006
- **Requirements:** REQ-DS-005, REQ-DS-010, REQ-RBAC-002
- **Baseline:** [fact] `app/restaurant/layout.tsx` with `Sidebar` hidden below md and no mobile navigation.
- **Objective:** Console, focus and admin shells per frontend.md §2–3.
- **Technical work:**
  - Route groups `app/restaurant/(console)` and `(focus)`; `AppShell` (Sidebar grouped per frontend.md §3.1 with restaurant switcher and user menu; Header with title/breadcrumb/clock slot/printing indicator slot; `MobileNav` drawer; `BottomNav` role presets); `FocusShell`; `AdminShell`; role home redirect `app/restaurant/page.tsx`.
  - Move existing pages into route groups; add redirects for `/restaurant/kds`, `/restaurant/analytics`, `/restaurant/billing`.
- **Files/modules:** `components/layout/*`, `app/restaurant/layout.tsx`, `app/restaurant/(console)/layout.tsx`, `app/restaurant/(focus)/layout.tsx`, `app/restaurant/page.tsx`, `next.config.ts` (redirects)
- **Database:** None.
- **API:** LD-AUTH-01.
- **Frontend:** All console routes.
- **Security:** SC-RBAC-08.
- **Tests:**
  - `TC-DS-013` [e2e] Each role sees only its capability nav items; active item has `aria-current="page"`; mobile bottom nav shows role preset.
- **Acceptance criteria:**
  - Layout grid and page padding match design.md §4.2 at all breakpoints.
- **Implementation notes:** Application shells: AppShell, AdminShell and FocusShell, rebuilt for Brand v2 in S1-P08-T014 as glass header navigation with a mobile bottom bar and no desktop sidebar (ADR-013 §3). Navigation is capability-filtered from lib/ui/navigation.ts; the server still authorises every page and action.
- **Affected files (actual):** components/layout/{app-shell,admin-shell,focus-shell,header-nav,bottom-nav,context-block,notifications}.tsx, tests/unit/navigation.test.tsx

### S1-P08-T009 — State components and polling hook

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 71 | P08 Design System + Frontend Foundation | Frontend Engineer | High | 2d | — | — | 2026-09-22 | — | IN_PROGRESS |

- **Dependencies:** S1-P08-T004
- **Requirements:** REQ-DS-006, REQ-KITCH-006, REQ-ORDER-010
- **Baseline:** [fact] Pages render inline red text on errors; no loading.tsx files.
- **Objective:** Designed states and ADR-009 polling behaviour reusable across screens.
- **Technical work:**
  - `EmptyState`, `ErrorState` (request id, retry), `ForbiddenState`, `NotFoundState`, `PageSkeleton` variants, `StaleBanner`, `StatusPage` (account pages).
  - `usePolling({ url, intervalMs, onData })`: cursor `since`, visibility pause, immediate refetch on focus, backoff to 30 s, stale after 3 misses, `refetch()` after mutations.
- **Files/modules:** `components/states/*`, `lib/ui/use-polling.ts`
- **Database:** None.
- **API:** Used with RH-ORD-01, RH-KOT-01, RH-PRN-01, RH-DASH-01.
- **Frontend:** Global.
- **Security:** None.
- **Tests:**
  - `TC-DS-003` [e2e] Reference route renders loading skeleton, empty, error (with retry), forbidden and not-found states via test switches.
  - `TC-DS-014` [unit] `usePolling` pauses when hidden, resumes immediately, backs off on failure and flags stale after 3 misses.
- **Acceptance criteria:**
  - No page uses ad hoc error text after its rebuild task.
- **Implementation notes:** Done: components/states (status-page, empty-state, error-state, access-states, page-skeleton, stale-banner), lib/ui/poller.ts and use-polling.ts (cursor polling, back-off, stale banner). TC-DS-014 passes. REMAINING: TC-DS-003 needs a reference route with test switches exercised in e2e.
- **Affected files (actual):** components/states/*.tsx, lib/ui/poller.ts, lib/ui/use-polling.ts, tests/unit/poller.test.ts

### S1-P08-T010 — Accessibility baseline

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 74 | P08 Design System + Frontend Foundation | Frontend Engineer | High | 2d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P08-T006, S1-P01-T005
- **Requirements:** REQ-DS-008, REQ-DS-009, REQ-NFR-004
- **Baseline:** [fact] Muted text `text-gray-500` on cards has 3.34:1 contrast (design.md §2.3).
- **Objective:** Built-in accessibility for every later screen.
- **Technical work:**
  - Skip link in shells; focus ring tokens; `prefers-reduced-motion` global rules; landmark structure; component contrast verification for interactive boundaries (WCAG 1.4.11); axe fixture on reference pages; document manual screen-reader checklist in `design/accessibility.md`.
- **Files/modules:** `app/globals.css`, `components/layout/*`, `tests/e2e/a11y/*`, `knowledge/design/accessibility.md`
- **Database:** None.
- **API:** None.
- **Frontend:** Global.
- **Security:** None.
- **Tests:**
  - `TC-DS-004` [e2e] Axe reports zero serious/critical violations on reference pages in light and dark themes.
  - `TC-DS-006` [e2e] With `reducedMotion: 'reduce'`, computed transition durations are 0 and skeleton shimmer is static.
- **Acceptance criteria:**
  - Accessibility checklist published and linked from design.md.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P08-T011 — Design-token static checks and baseline cleanup

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 75 | P08 Design System + Frontend Foundation | Frontend Engineer | Medium | 1d | — | — | 2026-09-22 | 2026-09-22 | COMPLETED |

- **Dependencies:** S1-P08-T001
- **Requirements:** REQ-DS-004, REQ-DS-011
- **Baseline:** [fact] Arbitrary classes such as `bg-[#24201D]`, `text-[11px]` throughout `app/` and `components/`.
- **Objective:** Prevent design drift automatically.
- **Technical work:**
  - `tests/static/design-tokens.test.ts` scanning `className` strings for arbitrary spacing (`p-[..]`, `m-[..]`, `gap-[..]`), hex colours, arbitrary radius and font sizes below 12 px; allow-list for documented exceptions (e.g. `max-w-[1440px]`).
  - Record current violation count; violations must reach zero by S1-P25-T011.
- **Files/modules:** `tests/static/design-tokens.test.ts`
- **Database:** None.
- **API:** None.
- **Frontend:** Global.
- **Security:** None.
- **Tests:**
  - `TC-DS-002` [static] Test fails on new arbitrary values outside the allow-list.
- **Acceptance criteria:**
  - Baseline violation count recorded; ratchet prevents increases.
- **Implementation notes:** tests/static/design-tokens.test.ts ratchet over app/ and components/: arbitrary spacing, hex colours, arbitrary radii, text below 12 px. Baseline recorded in tests/fixtures/design-token-baseline.json on 2026-09-22 (arbitrary spacing 1, hex colour 435, arbitrary radius 0, text below 12px 33); regenerate with UPDATE_DESIGN_BASELINE=1 only when a rebuild lowers it. New design-system folders must have zero. Reaching zero overall is S1-P25-T011. TC-DS-002 passes.
- **Affected files (actual):** tests/static/design-tokens.test.ts, tests/fixtures/design-token-baseline.json

### S1-P08-T012 — Responsive viewport suite

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 76 | P08 Design System + Frontend Foundation | QA Engineer | High | 2d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P08-T008, S1-P01-T005
- **Requirements:** REQ-DS-010, REQ-TEST-010
- **Baseline:** None.
- **Objective:** Automated responsive checks for every route.
- **Technical work:**
  - Playwright spec iterating route list × viewports 360, 390, 768, 1024, 1280, 1440: assert no horizontal page scroll, no element overflow beyond viewport, touch target ≥ 44 px for interactive elements on mobile, screenshots attached.
- **Files/modules:** `tests/e2e/responsive/*`
- **Database:** Seed.
- **API:** None.
- **Frontend:** All routes.
- **Security:** None.
- **Tests:**
  - `TC-DS-005` [e2e] Viewport matrix passes for routes built so far; route list extended by each feature phase.
- **Acceptance criteria:**
  - Suite runs in CI nightly and on PRs touching `app/` or `components/`.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P08-T013 — Landing page rebuild

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 77 | P08 Design System + Frontend Foundation | Frontend Engineer | Low | 1d | — | — | 2026-09-22 | 2026-09-22 | COMPLETED |

- **Dependencies:** S1-P08-T004
- **Requirements:** REQ-PLAT-001, REQ-PLAT-005
- **Baseline:** [fact] `app/page.tsx` dark portal page with links to `/r/demo` and `/dashboard`.
- **Objective:** Honest product landing on the light theme.
- **Technical work:**
  - Hero, three capability sections, commercial line "Licensed restaurant software — no subscription plans", sign-in CTA, footer; no demo links.
- **Files/modules:** `app/page.tsx`, `components/domain/landing/*`
- **Database:** None.
- **API:** None.
- **Frontend:** `/`.
- **Security:** None.
- **Tests:**
  - `TC-DS-015` [e2e] Every link on `/` resolves with a non-404 response.
- **Acceptance criteria:**
  - No subscription, plan or tier language on the page.
- **Implementation notes:** app/page.tsx rebuilt on the light theme with licence language (no plan, tier or subscription wording); every link resolves; axe clean. TC-DS-015 passes (tests/e2e/landing.spec.ts, 4/4).
- **Affected files (actual):** app/page.tsx, tests/e2e/landing.spec.ts

### S1-P08-T014 — Brand v2 tokens, glass system and header navigation shells

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 228 | P08 Design System + Frontend Foundation | Frontend Engineer | Critical | 4d | — | — | 2026-09-23 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P08-T004, S1-P08-T008
- **Requirements:** REQ-DS-001, REQ-DS-005, REQ-DS-008
- **Baseline:** [fact] Brand v1 (amber/emerald) tokens and the 264 px sidebar shell shipped on 2026-09-22 (S1-P08-T001/T008).
- **Objective:** Replace the v1 palette and sidebar shell with Brand v2 (ADR-013): four-hue tonal scales on near-black surfaces, a three-level glass system, and header navigation with a mobile bottom bar in both consoles.
- **Technical work:**
  - Rewrite `lib/ui/tokens.ts`, `app/globals.css` and `tailwind.config.ts` to the scales and semantic tokens of design.md §2.1–2.3 (RGB-channel variables so a tenant theme can override them on public pages).
  - Implement `glass-1/2/3` (design.md §4.6) with opaque fallbacks for `prefers-reduced-transparency` and browsers without `backdrop-filter`.
  - Replace the sidebar shell with `AppShell` header navigation + `MoreMenu` overflow + `BottomNav` (< 768 px) for the tenant console and the platform console; delete `sidebar-nav.tsx`.
  - Apply domain hues through `IconTile` (design.md §5.2); restyle landing and auth pages.
- **Files/modules:** `lib/ui/tokens.ts`, `app/globals.css`, `tailwind.config.ts`, `components/layout/*`, `components/ui/*`, `app/page.tsx`
- **Database:** None.
- **API:** None.
- **Frontend:** All console and public shells.
- **Security:** SC-RBAC-08 (navigation is filtered, the server still authorises).
- **Tests:**
  - `TC-DS-001` [static] Theme exposes only Brand v2 tokens; no colour outside the scales.
  - `TC-DS-009` [unit] Every contrast pair of design.md §2.3 meets AA.
  - `TC-DS-016` [unit] Header navigation overflows into More instead of scrolling; bottom bar appears below 768 px with the role's items.
- **Acceptance criteria:**
  - No desktop sidebar remains in the product.
  - Design-token ratchet does not increase; hex-colour count falls as baseline pages adopt tokens.
- **Implementation notes:** Brand v2 (ADR-013) implemented: lib/ui/tokens.ts holds the five design.md §2.1 ramps plus a warning scale and a semanticTokens table that app/globals.css is generated from (a static test asserts every --token line matches); the raw brand hues are exported as documentation only and never painted. Three glass levels with opaque fallbacks for prefers-reduced-transparency and for browsers without backdrop-filter; glass is opt-in per card, so tables and forms stay opaque. The sidebar is gone from the product: components/layout/header-nav.tsx measures real item widths against a hidden ruler and overflows the tail into a More menu, bottom-nav.tsx is the glass bar below 768 px with a real primary action, and both consoles share the shell. The header bell reads actual printer health. Domain hues are applied only through IconTile. Every §2.3 contrast pair recomputes exactly, and the tests additionally prove every text token, filled control (including hover) and the focus ring clear AA on all three surfaces in both themes.
- **Affected files (actual):** lib/ui/tokens.ts, app/globals.css, tailwind.config.ts, components/ui/**, components/layout/**, app/layout.tsx, app/page.tsx, app/admin/layout.tsx, app/restaurant/layout.tsx, tests/unit/{ui-primitives,navigation,form-system}.test.tsx, tests/static/design-system.test.ts

### S1-P08-T015 — Dashboard composition (fewer, larger sections)

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 229 | P08 Design System + Frontend Foundation | Frontend Engineer | High | 2d | — | — | 2026-09-23 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P08-T014, S1-P19-T002
- **Requirements:** REQ-DS-005, REQ-DASH-001
- **Baseline:** [fact] Baseline dashboard is a grid of small cards (`app/restaurant/dashboard/page.tsx`).
- **Objective:** Rebuild the dashboard as a context header, one metric row, one quick-actions block and live operational panels (ADR-013 §4).
- **Technical work:**
  - Compose the page from at most five sections; metrics come from `lib/data/reports.ts` for `dashboard:read` holders only.
  - Every panel has a real empty state; no fabricated numbers, no dead controls.
- **Files/modules:** `app/restaurant/dashboard/page.tsx`, `components/dashboard/*`
- **Database:** ORDER, KOT_TICKET, TRANSACTION (reads).
- **API:** LD-DASH-01.
- **Frontend:** Dashboard.
- **Security:** SC-RBAC-07 (role projections).
- **Tests:**
  - `TC-DS-017` [integration] A role without `dashboard:read` sees no sales figures; an empty tenant sees empty states, not zeros presented as data.
- **Acceptance criteria:**
  - The dashboard renders correctly for a tenant with no orders, no menu and no printers.
- **Implementation notes:** The dashboard is four sections: context header (business date and timezone), one metric row (net sales, sales-order count, average order value, shown only with dashboard:read and replaced by an empty state when the tenant has no orders), one quick-actions block derived from NAV_ITEMS so a tile can never point at a route navigation does not know, and live order and kitchen panels. Every figure is a real tenant-scoped query; money goes through Intl and times through the restaurant timezone. Covered by TC-DS-017 and the dashboard cases in tests/integration/reports/reports.test.ts.
- **Affected files (actual):** app/restaurant/dashboard/page.tsx, lib/ui/navigation.ts, tests/integration/reports/reports.test.ts

## P09 — Public Restaurant Website

10 tasks · 18 ideal days of effort · sequence #78–#87 (interleaved with other phases where dependencies allow)

### S1-P09-T001 — Decision gate: public hostname and public ordering

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 78 | P09 Public Restaurant Website | Gopala Krishna (Project Owner) | Critical | 1d | — | — | 2026-09-22 | — | IN_PROGRESS |

- **Dependencies:** S1-P01-T010
- **Requirements:** REQ-WEB-001, REQ-WEB-011
- **Baseline:** Q-001, Q-013 open; baseline has unauthenticated public checkout (`app/r/[slug]/checkout-action.ts`).
- **Objective:** Fix public routing and ordering scope before the public site is rebuilt.
- **Technical work:**
  - Answer Q-013 (path `/r/[slug]` vs subdomain vs custom domains; production domain) and Q-001 (public ordering in SLICE-01).
  - If subdomains are approved, create an ADR and update api.md/frontend.md routes before S1-P09-T003.
- **Files/modules:** `knowledge/implementation/slice-01/open-questions.md`, `knowledge/decisions/*`
- **Database:** None.
- **API:** SA-PUB-01 gating.
- **Frontend:** Public routing.
- **Security:** None.
- **Tests:**
  - None — decision record.
- **Acceptance criteria:**
  - Q-001 and Q-013 ANSWERED.
- **Implementation notes:** Q-001 answered A on 2026-09-22 (no public ordering; S1-P09-T009 removes the checkout). REMAINING: Q-013 (public hostname strategy and production domain) is still OPEN.
- **Affected files (actual):** knowledge/implementation/slice-01/open-questions.md

### S1-P09-T002 — Public data loader and projection

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 79 | P09 Public Restaurant Website | Backend Engineer | Critical | 3d | — | — | 2026-09-23 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P02-T011, S1-P04-T005, S1-P09-T001
- **Requirements:** REQ-WEB-002, REQ-WEB-004, REQ-WEB-005, REQ-WEB-006, REQ-WEB-007, REQ-WEB-010, REQ-TENANT-007
- **Baseline:** [fact] `lib/services/public-restaurant.ts` returns `tenantId` and all available items; ignores daily menu and published flags.
- **Objective:** Public data served only through explicit projections.
- **Technical work:**
  - `lib/data/public.ts#getPublicRestaurant(slug)` (TENANT ACTIVE, `website_published`, published categories/items, variants/add-ons available and not archived, hours, `openNow` via `lib/time`), `#getPublicDailyMenu(slug, now)`; DTOs without internal ids except item ids (needed only if Q-001 approved; otherwise omitted).
  - Single not-found result for unknown, suspended and unpublished.
- **Files/modules:** `lib/data/public.ts`, `lib/services/public-restaurant.ts` (replaced)
- **Database:** TENANT, RESTAURANT, RESTAURANT_HOURS, MENU_CATEGORY, MENU_ITEM, MENU_ITEM_VARIANT, MENU_ITEM_ADDON, DAILY_MENU, DAILY_MENU_ITEM.
- **API:** LD-PUB-01, LD-PUB-02.
- **Frontend:** Consumed by S1-P09-T003.
- **Security:** SC-PUB-01, SC-PUB-02, SC-TEN-06.
- **Tests:**
  - `TC-WEB-002` [integration] Public DTO keys equal the documented whitelist exactly (snapshot of key paths).
  - `TC-WEB-003` [integration] Unpublished categories, unpublished/archived items and unpublished daily menus are excluded.
  - `TC-WEB-004` [integration] Unknown slug, suspended tenant and unpublished website produce identical not-found results.
  - `TC-DMENU-005` [integration] Only the PUBLISHED daily menu whose business date equals today in the restaurant timezone is returned.
- **Acceptance criteria:**
  - Loader issues ≤ 3 queries per page render.
- **Implementation notes:** lib/data/public-restaurant.ts + lib/services/public-restaurant.ts: LD-PUB-01/02 project only what a diner may see, selected by slug, and only while the tenant is ACTIVE and the website published. TC-WEB-002/003/004 pass. Audited and recorded here after the agent that built it ended without reporting; verified by running the suite rather than by taking its word.
- **Affected files (actual):** lib/data/public-restaurant.ts, lib/services/public-restaurant.ts, tests/integration/public/public-restaurant.test.ts

### S1-P09-T003 — Public restaurant page

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 80 | P09 Public Restaurant Website | Frontend Engineer | Critical | 4d | — | — | 2026-09-23 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P09-T002, S1-P08-T004, S1-P08-T009
- **Requirements:** REQ-WEB-003, REQ-WEB-012, REQ-WEB-004, REQ-WEB-005, REQ-WEB-006, REQ-WEB-007, REQ-WEB-008
- **Baseline:** [fact] `components/public/public-menu-client.tsx` dark theme with cart.
- **Objective:** A real restaurant website on the light theme.
- **Technical work:**
  - Components `PublicHero`, `OpenNowBadge`, `DailyMenuSection`, `CategoryTabs` (sticky, scroll-snap), `MenuItemCard` (image with 4:3 ratio and `ImageOff` fallback, icon fallback, `DietaryMark`, price/"from", variants and add-ons as text, "Unavailable today"), `HoursTable`, `ContactBlock`, `PublicFooter`; ISR `revalidate = 60`.
  - Remove cart UI unless Q-001 approved (S1-P09-T009).
- **Files/modules:** `app/r/[slug]/page.tsx`, `app/r/[slug]/loading.tsx`, `app/r/[slug]/not-found.tsx`, `components/domain/public/*`
- **Database:** None.
- **API:** LD-PUB-01, LD-PUB-02.
- **Frontend:** `/r/[slug]`.
- **Security:** SC-VAL-03.
- **Tests:**
  - `TC-WEB-001` [e2e] Tenant A site shows its hero, today's menu, categories and prices in INR; no Tenant B names appear; unavailable item labelled.
- **Acceptance criteria:**
  - VQA checklist passes for public page at all breakpoints.
- **Implementation notes:** app/r/[slug]/page.tsx with app/r/[slug]/load-site.ts and app/r/[slug]/not-found.tsx. An unknown slug, a suspended tenant and an unpublished website all render the identical 404, so the URL is no oracle for which restaurants exist. TC-WEB-001 passes.
- **Affected files (actual):** app/r/[slug]/page.tsx, app/r/[slug]/load-site.ts, app/r/[slug]/not-found.tsx, components/public/**

### S1-P09-T004 — Today's menu share page

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 81 | P09 Public Restaurant Website | Frontend Engineer | Medium | 1d | — | — | 2026-09-23 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P09-T003
- **Requirements:** REQ-WEB-005, REQ-SOC-002
- **Baseline:** None.
- **Objective:** Shareable daily menu URL.
- **Technical work:**
  - `app/r/[slug]/daily/page.tsx` using `DailyMenuSection`; metadata with daily-menu card image (RH-PUB-02 once built).
- **Files/modules:** `app/r/[slug]/daily/page.tsx`
- **Database:** None.
- **API:** LD-PUB-02.
- **Frontend:** `/r/[slug]/daily`.
- **Security:** SC-PUB-01.
- **Tests:**
  - `TC-WEB-010` [e2e] Without a published menu today the page shows the empty state with a link to the full menu.
- **Acceptance criteria:**
  - Page reachable only for published websites.
- **Implementation notes:** app/r/[slug]/daily/page.tsx — today's published daily menu in the restaurant's own time zone, with a link back to the full menu when there is none. TC-WEB-010 and TC-DMENU-005 pass; TC-TZ-002/003 cover the midnight boundary at both seeded tenants.
- **Affected files (actual):** app/r/[slug]/daily/page.tsx

### S1-P09-T005 — SEO metadata, JSON-LD, sitemap and robots

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 82 | P09 Public Restaurant Website | Frontend Engineer | High | 2d | — | — | 2026-09-23 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P09-T003
- **Requirements:** REQ-WEB-009
- **Baseline:** [fact] Only root metadata in `app/layout.tsx:6-11`.
- **Objective:** Discoverable public sites without leaking private routes.
- **Technical work:**
  - `generateMetadata` (title, description, canonical, Open Graph); `lib/seo/json-ld.tsx` escaping `<`, `>`, `&`, U+2028/2029; `Restaurant` + `Menu` schema; `app/sitemap.ts` (published ACTIVE tenants), `app/robots.ts` disallowing `/restaurant`, `/admin`, `/account`, `/api`.
- **Files/modules:** `app/r/[slug]/page.tsx`, `lib/seo/json-ld.tsx`, `app/sitemap.ts`, `app/robots.ts`
- **Database:** None.
- **API:** LD-PUB-03.
- **Frontend:** Metadata.
- **Security:** SC-VAL-03.
- **Tests:**
  - `TC-WEB-008` [integration] Sitemap lists only published ACTIVE tenants; robots disallows private paths.
  - `TC-SEC-002` [unit] JSON-LD serializer output with `</script><script>` in a restaurant name contains no closing script tag.
- **Acceptance criteria:**
  - Lighthouse SEO score ≥ 95 on seeded public page.
- **Implementation notes:** lib/seo/json-ld.tsx, app/sitemap.ts and app/robots.ts. The sitemap lists published public websites only, and the JSON-LD is emitted through an escaped serializer rather than dangerouslySetInnerHTML, which lint bans repository-wide (SC-VAL-03). TC-WEB-008 and TC-SEC-002 pass.
- **Affected files (actual):** lib/seo/json-ld.tsx, app/sitemap.ts, app/robots.ts, tests/integration/website/sitemap.test.ts

### S1-P09-T006 — Open Graph image route

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 83 | P09 Public Restaurant Website | Backend Engineer | Medium | 2d | — | — | 2026-09-23 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P09-T002, S1-P07-T002
- **Requirements:** REQ-WEB-009, REQ-SEC-006
- **Baseline:** None.
- **Objective:** Branded social preview images generated from public data only.
- **Technical work:**
  - `app/r/[slug]/opengraph-image.tsx` with `ImageResponse`; bundled fonts; remote logo/cover fetched only if allowlisted with 3 s timeout and 2 MB cap, otherwise icon fallback; `Cache-Control` public 1 h.
- **Files/modules:** `app/r/[slug]/opengraph-image.tsx`, `lib/media/fetch-allowlisted.ts`
- **Database:** None.
- **API:** RH-PUB-01.
- **Frontend:** OG image.
- **Security:** SC-VAL-04.
- **Tests:**
  - `TC-WEB-009` [integration] OG image returns PNG 1200×630 for a published tenant; a non-allowlisted logo URL is never fetched (network spy).
- **Acceptance criteria:**
  - Route returns 404 for unpublished or suspended tenants.
- **Implementation notes:** app/r/[slug]/opengraph-image.tsx renders a 1200×630 card from the same public projection the page uses — the restaurant's name, its tagline and its own resolved theme colours — so the preview can contain nothing a diner cannot already see. An unknown slug, a suspended tenant and an unpublished website all fail identically to the page (ADR-012 §7). Cached an hour at the edge.

lib/media/fetch-allowlisted.ts is the only place the server fetches an address that came from a tenant's own data, so the limits live there rather than at the call site: the host allowlist is re-checked immediately before the request (a stored row outlives the setting that accepted it), redirects are refused because the destination would never be checked, the body is capped at 2 MB while streaming so a lying Content-Length cannot make the server buffer arbitrarily, non-image content types are rejected so an HTML error page never reaches the renderer, and a 3 s timeout stops a hanging host holding an invocation open. Any failure falls back to the restaurant's initial on its brand colour — a preview is never worth an error page.

TC-WEB-009 is split: the security half is a unit test with a network spy asserting fetch is never *called* for an off-allowlist host, an IP literal, http://, an embedded credential, a port or a look-alike domain; the route half renders for a published restaurant signed out and refuses the three not-found cases.
- **Affected files (actual):** app/r/[slug]/opengraph-image.tsx, lib/media/fetch-allowlisted.ts, tests/unit/fetch-allowlisted.test.ts, tests/integration/public/og-image.test.ts

### S1-P09-T007 — Caching and revalidation policy

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 84 | P09 Public Restaurant Website | Backend Engineer | High | 1d | — | — | 2026-09-23 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P09-T002
- **Requirements:** REQ-TENANT-003, REQ-WEB-010
- **Baseline:** [fact] Pages use `force-dynamic` ad hoc; no cache headers policy.
- **Objective:** Public pages cached safely; authenticated responses never cached.
- **Technical work:**
  - `lib/cache/revalidate.ts#revalidatePublic(slug)` called from publishing mutations; `export const dynamic = "force-dynamic"` + `Cache-Control: no-store` on console/admin/API responses via middleware headers; no `unstable_cache` for tenant data.
- **Files/modules:** `lib/cache/revalidate.ts`, `middleware.ts`
- **Database:** None.
- **API:** All authenticated endpoints; LD-PUB-01.
- **Frontend:** None.
- **Security:** SC-TEN-09, SC-HDR-03.
- **Tests:**
  - `TC-SEC-006` [integration] Authenticated pages and `/api/v1/*` send `Cache-Control: no-store`; public page responses contain no session-specific content.
- **Acceptance criteria:**
  - Publishing a menu change is visible on the public page within 60 s or immediately after revalidation.
- **Implementation notes:** Public pages are ISR with `revalidate = 60`, and lib/services/public-revalidate.ts drops a restaurant's page from the cache the moment a publishing mutation commits, so a menu change is visible immediately rather than up to a minute later.

The other half of this task was missing when I audited it, and it is the security-relevant half: nothing set `Cache-Control: no-store` on authenticated responses. Route handlers set it themselves (lib/http/route.ts), but console and admin *pages* did not, so a shared cache — a corporate proxy, a CDN placed in front of the app, the back/forward cache — could hold a page rendered for one person and serve it to the next. The middleware now sets it for every route `classifyRoute` does not call public, via `mustNotBeStored` in lib/auth/route-policy.ts; `/r/{slug}` is deliberately excluded so the restaurant sites keep their ISR window. TC-SEC-006 covers both halves of that decision table.
- **Affected files (actual):** middleware.ts, lib/auth/route-policy.ts, lib/services/public-revalidate.ts, tests/unit/route-policy.test.ts

### S1-P09-T008 — Public response-shape guard

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 85 | P09 Public Restaurant Website | Security Engineer | Critical | 1d | — | — | 2026-09-23 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P09-T003, S1-P09-T006
- **Requirements:** REQ-WEB-010, REQ-TENANT-003
- **Baseline:** None.
- **Objective:** Automated proof that public routes never serialize private data.
- **Technical work:**
  - Test renders public routes for seeded tenants and scans HTML, RSC payload and JSON for forbidden keys/values: emails of staff, customer names/phones, transaction amounts, audit actions, `tenant_id`, `clerk`, internal settings fields.
- **Files/modules:** `tests/integration/public/response-shape.test.ts`
- **Database:** Seed.
- **API:** LD-PUB-01, LD-PUB-02, RH-PUB-01.
- **Frontend:** None.
- **Security:** SC-PUB-03.
- **Tests:**
  - `TC-WEB-005` [integration] No staff, customer, transaction, audit, settings or tenant identifier values appear in any public response for either tenant.
- **Acceptance criteria:**
  - Test seeded with unique marker strings for every private field.
- **Implementation notes:** TC-WEB-005 renders the public routes for both seeded tenants and scans the result for staff emails, customer names and phone numbers, transaction amounts, audit actions and tenant identifiers — none appear. The case lives in tests/integration/public/public-site-render.test.ts rather than the response-shape.test.ts the task named; the substance is what the acceptance criterion asks for, so the filename is left as built.
- **Affected files (actual):** tests/integration/public/public-site-render.test.ts

### S1-P09-T009 — Public ordering resolution (decision-gated by Q-001)

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 86 | P09 Public Restaurant Website | Backend Engineer | High | 2d | — | — | 2026-09-23 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P09-T001
- **Requirements:** REQ-WEB-011, REQ-CUST-007
- **Baseline:** [fact] `app/r/[slug]/checkout-action.ts` creates orders unauthenticated and overwrites customer data (BA-19).
- **Objective:** Remove or harden public ordering according to the owner's decision.
- **Technical work:**
  - If Q-001 = not approved (recommended): delete `checkout-action.ts`, `components/public/cart-drawer.tsx` and cart state; record in release notes.
  - If approved: implement SA-PUB-01 per api.md (rate limit, idempotency, channel PUBLIC_WEB, no customer overwrite, server pricing via order service after S1-P12-T004).
- **Files/modules:** `app/r/[slug]/checkout-action.ts`, `components/public/cart-drawer.tsx`
- **Database:** ORDER (only if approved).
- **API:** SA-PUB-01.
- **Frontend:** Public cart (only if approved).
- **Security:** SC-RL-01, SC-VAL-02.
- **Tests:**
  - `TC-ORDER-012` [integration] With Q-001 not approved, no public order submission endpoint exists (action id not exported, POST returns 404/405); if approved, rate limit and validation cases pass.
- **Acceptance criteria:**
  - Decision reflected in code, api.md and frontend.md.
- **Implementation notes:** Q-001 was answered A (no public ordering), so the branch this task gates was removed rather than built: app/r/[slug]/checkout-action.ts and components/public/cart-drawer.tsx are deleted (commit ef4c437) and no public order submission endpoint is exported. TC-ORDER-012 asserts that absence, which is the only way a removed feature can be proved gone.
- **Affected files (actual):** app/r/[slug]/checkout-action.ts (deleted), components/public/cart-drawer.tsx (deleted)

### S1-P09-T010 — Public site accessibility and responsive verification

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 87 | P09 Public Restaurant Website | QA Engineer | High | 1d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P09-T003, S1-P09-T005, S1-P08-T012
- **Requirements:** REQ-WEB-008, REQ-NFR-004
- **Baseline:** None.
- **Objective:** Public website meets accessibility and responsive requirements.
- **Technical work:**
  - Add public routes to axe and viewport suites; Lighthouse CI budget (LCP < 2.5 s mobile profile, CLS < 0.1).
- **Files/modules:** `tests/e2e/public/*`, `.github/workflows/ci.yml`
- **Database:** Seed.
- **API:** None.
- **Frontend:** `/r/[slug]`, `/r/[slug]/daily`.
- **Security:** None.
- **Tests:**
  - `TC-WEB-011` [e2e] Public pages pass axe (zero serious/critical), viewport matrix and Lighthouse budgets.
- **Acceptance criteria:**
  - Budgets enforced in CI.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P09-T011 — Tenant subdomain routing

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 233 | P09 Public Restaurant Website | Backend Engineer | Critical | 3d | — | — | 2026-09-23 | — | IN_PROGRESS |

- **Dependencies:** S1-P09-T002
- **Requirements:** REQ-WEB-001, REQ-WEB-002
- **Baseline:** [fact] Public site served only at `/r/[slug]`.
- **Objective:** Serve each restaurant from its own host (ADR-012) without a second deployment and without trusting the client.
- **Technical work:**
  - `lib/tenancy/hostnames.ts`: parse host → slug, reserved-label list, apex detection, `PUBLIC_ROOT_DOMAIN` from `lib/env.ts` (optional).
  - `middleware.ts`: rewrite tenant-host requests to the public route, redirect console/auth/platform paths on a tenant host to the apex host, keep `/r/[slug]` working with a canonical link to the subdomain.
  - Unknown slug, unpublished website and suspended tenant all render the same public 404.
- **Files/modules:** `middleware.ts`, `lib/tenancy/hostnames.ts`, `lib/env.ts`, `app/r/[slug]/**`
- **Database:** TENANT, RESTAURANT (reads).
- **API:** LD-PUB-01.
- **Frontend:** Public site.
- **Security:** SC-TEN-01, SC-AUTH-03.
- **Tests:**
  - `TC-WEB-018` [integration] Host `{slug}.example.test` resolves to that tenant; reserved labels and unknown slugs 404; a suspended tenant 404s identically.
  - `TC-WEB-019` [e2e] `{slug}.localhost` renders the site; `/restaurant` on a tenant host redirects to the apex host; `/r/{slug}` renders with a canonical link.
- **Acceptance criteria:**
  - No tenant data is reachable from a host alone beyond the published public projection.
- **Implementation notes:** Done: lib/tenancy/hostnames.ts classifies a Host header as apex/tenant/invalid against the optional PUBLIC_ROOT_DOMAIN plus *.localhost, sharing its reserved-label list with tenant-slug validation so a slug can never shadow an operator host. middleware.ts redirects apex-only paths (console, admin, account, auth, /r/*) from a tenant host with a 308 and rewrites everything else to /r/{slug}, always setting or deleting the internal slug header so a client-supplied one cannot survive; lib/tenancy/request.ts re-validates it and the page refuses a header/path mismatch. Unknown slug, reserved label, unpublished site and suspended tenant all render the same 404. With PUBLIC_ROOT_DOMAIN unset everything still works on the apex host and *.localhost. TC-WEB-018 covered by tests/unit/hostnames.test.ts (22 cases) and tests/integration/website/host-resolution.test.ts (8). REMAINING: TC-WEB-019 (e2e against {slug}.localhost with a running server).
- **Affected files (actual):** lib/tenancy/hostnames.ts, lib/tenancy/request.ts, middleware.ts, lib/env.ts, next.config.ts, app/r/[slug]/page.tsx, .env.example, knowledge/operations/deployment.md, tests/unit/hostnames.test.ts, tests/integration/website/host-resolution.test.ts

### S1-P09-T012 — Dynamic themed restaurant website

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 234 | P09 Public Restaurant Website | Frontend Engineer | Critical | 4d | — | — | 2026-09-23 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P09-T011, S1-P07-T010
- **Requirements:** REQ-WEB-001, REQ-WEB-003
- **Baseline:** [fact] One generic public page for every restaurant.
- **Objective:** Render each restaurant's site from its own data and theme — sections, order, copy, images, hours, contact and links — so two restaurants do not look alike.
- **Technical work:**
  - Server-rendered sections driven by `WEBSITE_SECTION` (enabled + order), theme applied as CSS custom properties on the page root only.
  - Sections: hero, about, featured menu, categories, popular items, info, hours, gallery, location, contact, CTA — each with a real empty state and no placeholder copy.
  - SEO per tenant (title, description, canonical, Open Graph image), and no console assets or platform branding on the public page.
- **Files/modules:** `app/r/[slug]/**`, `components/public/**`
- **Database:** Reads through `lib/data/public-restaurant.ts`.
- **API:** LD-PUB-01.
- **Frontend:** Public website.
- **Security:** SC-VAL-03 (no HTML from tenant copy), SC-TEN-04.
- **Tests:**
  - `TC-WEB-020` [integration] Two tenants with different themes and sections render different documents; disabled sections are absent; tenant copy is escaped.
  - `TC-WEB-021` [e2e] The site is responsive at 320–1920, axe-clean, and shows empty states when the menu is empty.
- **Acceptance criteria:**
  - Nothing on a public page is hard-coded to one restaurant, and no demo content appears anywhere.
- **Implementation notes:** Each restaurant's public site is generated from its own stored configuration — theme, branding, hero, sections, hours, contact and footer — through components/public/** and lib/services/website-theme.ts, so no two restaurants render alike and nothing is a fixed preview. TC-WEB-020 and TC-WEB-021 pass, and TC-WEB-017 covers a tenant's own edit reaching the public site without touching the console.
- **Affected files (actual):** components/public/**, lib/services/website-theme.ts, lib/data/website.ts, tests/integration/website/theme.test.ts, tests/integration/website/customisation.test.ts

## P10 — Menu Management

8 tasks · 21 ideal days of effort · sequence #88–#95 (interleaved with other phases where dependencies allow)

### S1-P10-T001 — Menu data layer

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 88 | P10 Menu Management | Backend Engineer | Critical | 3d | — | — | 2026-09-23 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P04-T005, S1-P02-T010
- **Requirements:** REQ-MENU-009, REQ-MENU-003
- **Baseline:** [fact] Menu actions use `prisma.menuCategory.findUnique` then ownership assert (`app/restaurant/menu/categories-actions.ts:99-103`).
- **Objective:** Scoped, projected menu queries for all menu features.
- **Technical work:**
  - `lib/data/menu.ts`: list categories (item counts), list items (filters, cursor), item detail with variants/add-ons/section options; all `WHERE tenant_id = ctx.tenantId`; DTOs with money strings.
- **Files/modules:** `lib/data/menu.ts`
- **Database:** MENU_CATEGORY, MENU_ITEM, MENU_ITEM_VARIANT, MENU_ITEM_ADDON, KITCHEN_SECTION.
- **API:** LD-MENU-01, LD-MENU-02, LD-MENU-03.
- **Frontend:** Consumed by menu UI.
- **Security:** SC-TEN-02, SC-API-05.
- **Tests:**
  - `TC-MENU-001` [integration] Category list is tenant-scoped, ordered by sort_order and excludes archived unless requested.
  - `TC-MENU-002` [integration] Item list filters by category, published, availability, search and archived with cursor pagination.
  - `TC-MENU-003` [integration] Item detail returns variants/add-ons; a Tenant B item id returns not-found.
- **Acceptance criteria:**
  - No menu query in the codebase bypasses `lib/data/menu.ts`.
- **Implementation notes:** lib/data/menu.ts is the only menu data path: LD-MENU-01/02/03 (categories, items with filters and keyset paging, item detail with variants, add-ons and sections), every query through tenantScope/tenantKey, money out as two-decimal strings, plus loadOrderCatalogue which keeps Prisma.Decimal for the pricing engine. TC-MENU-001/002/003.
- **Affected files (actual):** lib/data/menu.ts, tests/integration/menu/{categories,items}.test.ts

### S1-P10-T002 — Category services and actions

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 89 | P10 Menu Management | Backend Engineer | Critical | 2d | — | — | 2026-09-23 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P10-T001, S1-P04-T010
- **Requirements:** REQ-MENU-001, REQ-MENU-002, REQ-MENU-011
- **Baseline:** [fact] `app/restaurant/menu/categories-actions.ts` create/update/deactivate without reorder or publish.
- **Objective:** Complete category management with audit.
- **Technical work:**
  - `lib/services/menu-categories.ts`: create (append sort order, unique name), update, archive (blocked when non-archived items exist), reorder (full-set validation), publish/unpublish (revalidate public); actions SA-MENU-01…05.
- **Files/modules:** `lib/services/menu-categories.ts`, `app/restaurant/(console)/menu/categories/actions.ts`
- **Database:** MENU_CATEGORY, AUDIT_LOG.
- **API:** SA-MENU-01, SA-MENU-02, SA-MENU-03, SA-MENU-04, SA-MENU-05.
- **Frontend:** Consumed by S1-P10-T005.
- **Security:** SC-TEN-02, SC-AUD-01.
- **Tests:**
  - `TC-MENU-004` [integration] Create and update validate names and uniqueness among non-archived categories; audit written.
  - `TC-MENU-005` [integration] Archive fails with `CATEGORY_NOT_EMPTY` while items exist; succeeds after items archived.
  - `TC-MENU-006` [integration] Reorder requires exactly the tenant's non-archived set; a Tenant B id returns not-found.
  - `TC-MENU-007` [integration] Publish/unpublish toggles public visibility and triggers revalidation.
- **Acceptance criteria:**
  - Baseline categories-actions file replaced.
- **Implementation notes:** lib/services/menu-categories.ts implements SA-MENU-01 to 05: create appends after the last active category, update patches only real changes, archive is refused while non-archived items remain (CATEGORY_NOT_EMPTY), reorder locks and validates the whole active set, and publish/unpublish revalidates the public site. Each write is one transaction with its audit row and a row lock, so concurrent archive and reorder serialise; duplicate names surface as 422 NAME_TAKEN from the partial unique index. TC-MENU-004 to 007, TI-003, TI-004.
- **Affected files (actual):** lib/services/menu-categories.ts, app/restaurant/menu/categories-actions.ts, tests/integration/menu/categories.test.ts

### S1-P10-T003 — Menu item services and actions

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 90 | P10 Menu Management | Backend Engineer | Critical | 3d | — | — | 2026-09-23 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P10-T002
- **Requirements:** REQ-MENU-003, REQ-MENU-006, REQ-MENU-007, REQ-MENU-008, REQ-MENU-011
- **Baseline:** [fact] `app/restaurant/menu/items-actions.ts` treats delete as `isAvailable=false`.
- **Objective:** Full item lifecycle with price-change audit and optimistic concurrency.
- **Technical work:**
  - `lib/services/menu-items.ts`: create (unpublished), update with `expectedUpdatedAt`, archive (also unpublish; remove from future daily menus), reorder within category, publish (requires published category and price), set availability; `menu_item.price_changed` when price/tax change.
- **Files/modules:** `lib/services/menu-items.ts`, `app/restaurant/(console)/menu/items/actions.ts`
- **Database:** MENU_ITEM, DAILY_MENU_ITEM, AUDIT_LOG.
- **API:** SA-MENU-06, SA-MENU-07, SA-MENU-08, SA-MENU-09, SA-MENU-10, SA-MENU-11.
- **Frontend:** Consumed by S1-P10-T006, S1-P10-T007.
- **Security:** SC-VAL-02, SC-VAL-04, SC-AUD-01.
- **Tests:**
  - `TC-MENU-008` [integration] Create validates all fields (money regex, tax 0–100, section and category ownership) and starts unpublished.
  - `TC-MENU-009` [integration] Stale `expectedUpdatedAt` returns CONFLICT; price change writes before/after audit.
  - `TC-MENU-010` [integration] Archive unpublishes the item and removes it from future daily menus but not past ones.
  - `TC-MENU-011` [integration] Availability toggle blocks ordering of the item and shows "Unavailable today" publicly.
- **Acceptance criteria:**
  - Historical order snapshots unaffected by any item change (verified in TC-ORDER-004).
- **Implementation notes:** lib/services/menu-items.ts implements SA-MENU-06 to 11 and the item loaders: parent category and kitchen section are verified and locked inside the transaction, expectedUpdatedAt gives 409 CONFLICT, and a price or tax change writes its own menu_item.price_changed audit row. Archiving unpublishes, marks unavailable and removes the item from daily menus dated today or later in the restaurant timezone (past menus keep it), renumbering survivors and auditing each affected menu. The keyset cursor is opaque and a tampered cursor is 422. TC-MENU-002/003/008 to 011, TI-001/002/005 to 008/010.
- **Affected files (actual):** lib/services/menu-items.ts, app/restaurant/menu/items-actions.ts, tests/integration/menu/items.test.ts

### S1-P10-T004 — Variants and add-ons

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 91 | P10 Menu Management | Backend Engineer | Critical | 2d | — | — | 2026-09-23 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P10-T003
- **Requirements:** REQ-MENU-004, REQ-MENU-005, REQ-TXN-009
- **Baseline:** [fact] Variants/add-ons JSON with string prices (BA-17).
- **Objective:** Relational, Decimal-priced modifiers with safe replace-set semantics.
- **Technical work:**
  - `lib/services/menu-modifiers.ts`: replace variants (≤20, unique names, ≤1 default, ids must belong to the item, archive omitted) and add-ons (≤30); audit set before/after.
- **Files/modules:** `lib/services/menu-modifiers.ts`
- **Database:** MENU_ITEM_VARIANT, MENU_ITEM_ADDON, AUDIT_LOG.
- **API:** SA-MENU-12, SA-MENU-13.
- **Frontend:** Consumed by S1-P10-T007.
- **Security:** SC-TEN-02.
- **Tests:**
  - `TC-MENU-012` [integration] Variant set replace upserts/archives correctly; two defaults rejected; a variant id from another item or tenant returns not-found.
  - `TC-MENU-013` [integration] Add-on set replace validates prices and names and archives removed add-ons.
- **Acceptance criteria:**
  - No JSON price storage remains in schema or code.
- **Implementation notes:** lib/services/menu-modifiers.ts implements SA-MENU-12/13 as replace-sets: listed ids must belong to the item (else 404), omitted rows are archived and new rows inserted. The write order works around three partial unique indexes, so two variants can swap names in one call. Prices are relational NUMERIC(12,2) and a test asserts no json column survives on the three menu tables. TC-MENU-012/013, TI-009.
- **Affected files (actual):** lib/services/menu-modifiers.ts, app/restaurant/menu/items-actions.ts, tests/integration/menu/modifiers.test.ts

### S1-P10-T005 — Categories UI

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 92 | P10 Menu Management | Frontend Engineer | High | 2d | — | — | 2026-09-23 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P10-T002, S1-P08-T006, S1-P08-T008
- **Requirements:** REQ-MENU-001, REQ-MENU-002, REQ-MENU-010
- **Baseline:** [fact] `components/restaurant/category-modal.tsx` called from sample-state page.
- **Objective:** Category management on real data.
- **Technical work:**
  - `/restaurant/menu/categories`: toolbar, SortableList with published Switch and item counts, `CategoryFormDialog` with IconPicker (MENU_ICON_KEYS), archive ConfirmDialog, read-only mode.
- **Files/modules:** `app/restaurant/(console)/menu/categories/page.tsx`, `components/domain/menu/*`
- **Database:** None.
- **API:** LD-MENU-01, SA-MENU-01, SA-MENU-02, SA-MENU-03, SA-MENU-04, SA-MENU-05.
- **Frontend:** `/restaurant/menu/categories`.
- **Security:** SC-RBAC-08.
- **Tests:**
  - `TC-MENU-014` [e2e] Create category, reorder via keyboard Move buttons, archive with confirmation, empty state for new tenant.
- **Acceptance criteria:**
  - All states designed; axe clean.
- **Implementation notes:** /restaurant/menu/categories is a Server Component guarding menu:read and loading LD-MENU-01, with a client board for the edits. A manager gets a SortableList (drag handle, Arrow Up/Down, Move buttons, live-region announcements), an item-count badge, a publish switch and row actions; every change goes through SA-MENU-01…05 and rolls back on refusal, and a 409 CATEGORY_NOT_EMPTY is shown inside the archive dialog in the server's own words. The form dialog uses the shared <Form>, so 422 NAME_TAKEN lands on the Name field with the summary above it, and the icon picker is a native radio group over MENU_ICON_KEYS. Read-only roles see badges instead of switches and no drag handles.
- **Affected files (actual):** app/restaurant/menu/categories/page.tsx, components/menu/categories-board.tsx, components/menu/category-form-dialog.tsx, components/menu/icon-picker.tsx, tests/integration/menu/menu-ui.test.ts

### S1-P10-T006 — Menu items list UI

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 93 | P10 Menu Management | Frontend Engineer | High | 3d | — | — | 2026-09-23 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P10-T003, S1-P08-T007, S1-P08-T008
- **Requirements:** REQ-MENU-006, REQ-MENU-007, REQ-PLAT-005
- **Baseline:** [fact] `app/restaurant/menu/page.tsx:15-56` sample state (BA-26).
- **Objective:** Real menu item list with quick toggles.
- **Technical work:**
  - `/restaurant/menu/items` with FilterBar, DataTable (thumbnail/icon, name, category, price or "from", tax, DietaryMark, availability and published Switches with optimistic update + rollback, row actions), card mode on mobile; `/restaurant/menu` redirect.
  - Delete baseline `app/restaurant/menu/page.tsx` sample state and unused `MenuGrid`.
- **Files/modules:** `app/restaurant/(console)/menu/items/page.tsx`, `app/restaurant/(console)/menu/page.tsx`
- **Database:** None.
- **API:** LD-MENU-02, SA-MENU-08, SA-MENU-10, SA-MENU-11.
- **Frontend:** `/restaurant/menu/items`, `/restaurant/menu`.
- **Security:** SC-RBAC-08.
- **Tests:**
  - `TC-MENU-015` [e2e] List loads seeded items; toggling availability updates the row and public page; filtered empty state offers clear filters.
- **Acceptance criteria:**
  - No sample or hard-coded menu data remains.
- **Implementation notes:** /restaurant/menu/items renders FilterBar (search, category, visibility, availability, archived — all in the URL) over DataTable, which becomes stacked cards below 768 px. Rows show a thumbnail or curated icon, the dietary mark with its text label, 'from …' pricing when a variant undercuts the base price, the tax rate, and the two optimistic switches that roll back with a toast when the server refuses. Cursor pagination, a first-run empty state, a filtered empty state with 'Clear filters', and a tampered cursor answered with a way back to the first page. /restaurant/menu is now a guarded redirect to the items page; the baseline sample page and both baseline modals are gone, and the page left the ESLint baseline exception list.
- **Affected files (actual):** app/restaurant/menu/items/page.tsx, app/restaurant/menu/page.tsx, components/menu/item-row-actions.tsx, components/menu/item-toggles.tsx, components/menu/menu-image.tsx, components/menu/dietary-mark.tsx

### S1-P10-T007 — Menu item editor

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 94 | P10 Menu Management | Frontend Engineer | High | 4d | — | — | 2026-09-23 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P10-T004, S1-P08-T005, S1-P08-T006
- **Requirements:** REQ-MENU-003, REQ-MENU-004, REQ-MENU-005, REQ-MENU-006
- **Baseline:** [fact] `components/restaurant/item-modal.tsx` without variants/add-ons editing.
- **Objective:** Rich item editing with live public preview.
- **Technical work:**
  - `/restaurant/menu/items/new` and `/[itemId]`: sections Basics, Pricing & tax, Variants (`VariantEditor`), Add-ons (`AddonEditor`), Kitchen & preparation, Visibility; `PublicItemPreview`; conflict handling; unsaved changes guard.
- **Files/modules:** `app/restaurant/(console)/menu/items/new/page.tsx`, `app/restaurant/(console)/menu/items/[itemId]/page.tsx`, `components/domain/menu/*`
- **Database:** None.
- **API:** LD-MENU-03, SA-MENU-06, SA-MENU-07, SA-MENU-12, SA-MENU-13.
- **Frontend:** `/restaurant/menu/items/new`, `/restaurant/menu/items/[itemId]`.
- **Security:** SC-VAL-02.
- **Tests:**
  - `TC-MENU-016` [e2e] Create an item with Half/Full variants and one add-on, publish it, and see "from" price on the public site.
- **Acceptance criteria:**
  - Foreign or invalid item ids render not-found.
- **Implementation notes:** One editor serves /restaurant/menu/items/new (menu:manage) and /[itemId] (menu:read, read-only without manage): Basics, Pricing & tax, Variants, Add-ons, Kitchen & preparation, Visibility, and a sticky live preview that recomputes the 'from' price from decimal strings in components/menu/price.ts — no floats, because lib/money is server-side. Saving runs SA-MENU-06/07 and then SA-MENU-12/13 only when those sets actually changed, since each replace-set writes its own audit row and bumps updatedAt; each result is adopted as the new expectedUpdatedAt. A 409 CONFLICT shows a banner with a Reload action and no field noise. Unknown, malformed and another tenant's id all render the same not-found page.
- **Affected files (actual):** app/restaurant/menu/items/new/page.tsx, app/restaurant/menu/items/[itemId]/page.tsx, components/menu/item-editor.tsx, components/menu/option-editor.tsx, components/menu/price.ts

### S1-P10-T008 — Menu authorization and isolation tests

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 95 | P10 Menu Management | QA Engineer | Critical | 2d | — | — | 2026-09-23 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P10-T004, S1-P04-T009
- **Requirements:** REQ-MENU-009, REQ-TENANT-003
- **Baseline:** [fact] `tests/unit/menu-management.test.ts` mocks Prisma.
- **Objective:** Prove menu endpoints respect roles and tenants.
- **Technical work:**
  - Implement TI-001…TI-010 and RBAC matrix rows 18–20 endpoints; replace mocked menu unit tests with integration tests.
- **Files/modules:** `tests/integration/isolation/menu.test.ts`, `tests/integration/rbac/endpoint-registry.ts`
- **Database:** Seed.
- **API:** LD-MENU-01…03, SA-MENU-01…13.
- **Frontend:** None.
- **Security:** SC-TEN-02, SC-RBAC-01.
- **Tests:**
  - `TC-MENU-017` [integration] CASHIER, KITCHEN and WAITER receive FORBIDDEN for every `menu:manage` action; TI-001…TI-010 pass.
- **Acceptance criteria:**
  - Baseline mocked menu tests removed.
- **Implementation notes:** tests/integration/menu/authorization.test.ts drives all 18 managing endpoints as CASHIER, KITCHEN and WAITER, asserting FORBIDDEN and a byte-identical snapshot of every menu, daily-menu and audit table afterwards, and proving the guard runs before the lookup (real, foreign, random and malformed ids all give the same answer). TC-MENU-017; the baseline Prisma-mocking unit test is gone.
- **Affected files (actual):** tests/integration/menu/authorization.test.ts

## P11 — Daily Menu

5 tasks · 10 ideal days of effort · sequence #96–#100 (interleaved with other phases where dependencies allow)

### S1-P11-T001 — Daily menu services

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 96 | P11 Daily Menu | Backend Engineer | Critical | 3d | — | — | 2026-09-23 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P10-T003, S1-P02-T011
- **Requirements:** REQ-DMENU-001, REQ-DMENU-002, REQ-DMENU-003, REQ-DMENU-004, REQ-DMENU-006, REQ-DMENU-007, REQ-DMENU-008
- **Baseline:** [fact] `app/restaurant/menu/daily-actions.ts` upsert + publish only; not wired to UI; uses `new Date(date)`.
- **Objective:** Complete daily menu lifecycle on restaurant business dates.
- **Technical work:**
  - `lib/services/daily-menu.ts`: save draft (items ordered, date ≥ today in restaurant tz, ownership), publish (≥1 item, all published & not archived), unpublish, copy (skip archived/unpublished with report), delete draft; audits; public revalidation.
- **Files/modules:** `lib/data/daily-menu.ts`, `lib/services/daily-menu.ts`, `app/restaurant/(console)/daily-menu/actions.ts`
- **Database:** DAILY_MENU, DAILY_MENU_ITEM, AUDIT_LOG.
- **API:** SA-DMENU-01, SA-DMENU-02, SA-DMENU-03, SA-DMENU-04, SA-DMENU-05.
- **Frontend:** Consumed by S1-P11-T003.
- **Security:** SC-TEN-02, SC-AUD-01.
- **Tests:**
  - `TC-DMENU-002` [integration] Save draft creates or updates the menu for the business date with ordered items; foreign item ids return not-found; past dates rejected.
  - `TC-DMENU-003` [integration] Publish requires ≥1 published item; unpublish hides it; republish restores.
  - `TC-DMENU-004` [integration] Copy from a previous date skips archived/unpublished items and reports them.
  - `TC-DMENU-006` [integration] Only DRAFT menus can be deleted; PUBLISHED returns `NOT_DRAFT`.
- **Acceptance criteria:**
  - Business date validation uses the restaurant timezone, not server time.
- **Implementation notes:** lib/services/daily-menu.ts implements SA-DMENU-01 to 05 with today always taken from the restaurant timezone: save-draft upserts by (tenant, business date) under a row lock, publish requires at least one published non-archived item, copy skips archived or unpublished items and reports them by name and reason, and delete only touches a DRAFT after clearing copies' source reference. TC-DMENU-002/003/004/006.
- **Affected files (actual):** lib/services/daily-menu.ts, app/restaurant/menu/daily-actions.ts, tests/integration/menu/daily-menu.test.ts

### S1-P11-T002 — Daily menu loaders

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 97 | P11 Daily Menu | Backend Engineer | High | 1d | — | — | 2026-09-23 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P11-T001
- **Requirements:** REQ-DMENU-001
- **Baseline:** None.
- **Objective:** Editor and calendar data.
- **Technical work:**
  - LD-DMENU-01 (menu for date, pickable items, recent menus) and LD-DMENU-02 (range ≤ 62 days).
- **Files/modules:** `lib/data/daily-menu.ts`
- **Database:** DAILY_MENU, DAILY_MENU_ITEM, MENU_ITEM.
- **API:** LD-DMENU-01, LD-DMENU-02.
- **Frontend:** Consumed by S1-P11-T003.
- **Security:** SC-TEN-02.
- **Tests:**
  - `TC-DMENU-001` [integration] Loader defaults to today in restaurant timezone and returns only the tenant's menus and pickable items.
- **Acceptance criteria:**
  - Range > 62 days rejected.
- **Implementation notes:** LD-DMENU-01 editor view (business date, today, menu, pickable items, previous menus) defaulting to today in the restaurant timezone, and LD-DMENU-02 calendar over an inclusive range capped at 62 days. TC-DMENU-001.
- **Affected files (actual):** lib/services/daily-menu.ts, lib/data/daily-menu.ts, app/restaurant/menu/daily-actions.ts

### S1-P11-T003 — Daily menu editor UI

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 98 | P11 Daily Menu | Frontend Engineer | High | 4d | — | — | 2026-09-23 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P11-T002, S1-P08-T006, S1-P08-T008
- **Requirements:** REQ-DMENU-001, REQ-DMENU-002, REQ-DMENU-003, REQ-DMENU-004, REQ-DMENU-005
- **Baseline:** [fact] Daily tab in `app/restaurant/menu/page.tsx:222-240` without actions.
- **Objective:** Fast daily curation and publishing.
- **Technical work:**
  - `/restaurant/daily-menu`: DateNavigator + 14-day StatusStrip, selected items SortableList, ItemPicker (drawer on < lg), CopyMenuDialog, publish/unpublish/delete actions with states.
- **Files/modules:** `app/restaurant/(console)/daily-menu/page.tsx`, `components/domain/daily-menu/*`
- **Database:** None.
- **API:** LD-DMENU-01, LD-DMENU-02, SA-DMENU-01, SA-DMENU-02, SA-DMENU-03, SA-DMENU-04, SA-DMENU-05.
- **Frontend:** `/restaurant/daily-menu`.
- **Security:** SC-RBAC-08.
- **Tests:**
  - `TC-DMENU-007` [e2e] Manager copies yesterday's menu, reorders, publishes, and sees it on the public site today.
- **Acceptance criteria:**
  - Read-only view for CASHIER, KITCHEN, WAITER.
- **Implementation notes:** /restaurant/daily-menu (daily_menu:read, editable with daily_menu:manage) has a date navigator, a 14-day status strip from LD-DMENU-02, the ordered selection as a SortableList, an item picker (sticky panel from lg, drawer below), title and note, and Save draft / Publish / Unpublish / Copy from… / Delete draft. 'Today' always comes from the server in the restaurant's time zone, a malformed ?date= falls back to today, and past dates render read-only. Publish saves first, so what is on screen is what goes live. DAILY_MENU_EMPTY, ITEM_NOT_PUBLISHED, NOT_DRAFT, NOT_PUBLISHED, DATE_IN_PAST, TARGET_PUBLISHED and DAILY_MENU_IN_USE are shown verbatim, and a copy lists every skipped item with its reason.
- **Affected files (actual):** app/restaurant/daily-menu/page.tsx, components/menu/daily-menu-editor.tsx, lib/ui/navigation.ts, tests/integration/menu/daily-menu-ui.test.ts

### S1-P11-T004 — Daily menu scheduling across timezones

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 99 | P11 Daily Menu | QA Engineer | High | 1d | — | — | 2026-09-23 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P11-T001, S1-P09-T002
- **Requirements:** REQ-DMENU-005, REQ-TZ-004
- **Baseline:** None.
- **Objective:** Prove future-dated menus appear exactly at local midnight.
- **Technical work:**
  - Clock-injected integration test for Tenant A (Asia/Kolkata) and Tenant B (America/New_York) at instants just before and after each local midnight.
- **Files/modules:** `tests/integration/daily-menu/schedule.test.ts`
- **Database:** Seed.
- **API:** LD-PUB-02.
- **Frontend:** None.
- **Security:** None.
- **Tests:**
  - `TC-TZ-003` [integration] A PUBLISHED menu for tomorrow becomes public at 00:00 restaurant time and not one minute earlier, independently per tenant.
- **Acceptance criteria:**
  - Test passes with server process timezone UTC and Asia/Kolkata.
- **Implementation notes:** tests/integration/menu/daily-menu-schedule.test.ts pins the clock either side of midnight in Asia/Kolkata (18:29:59Z and 18:30:00Z) and America/New_York (03:59:59Z and 04:00:00Z) and asserts each restaurant's daily menu flips at its own midnight and not the other's, through the published-menu-for-today projection. TC-TZ-003 at the service boundary; the public-route half waits for S1-P09-T002.
- **Affected files (actual):** tests/integration/menu/daily-menu-schedule.test.ts, lib/services/daily-menu.ts

### S1-P11-T005 — Daily menu audit and isolation tests

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 100 | P11 Daily Menu | QA Engineer | High | 1d | — | — | 2026-09-23 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P11-T001
- **Requirements:** REQ-DMENU-008, REQ-TENANT-003
- **Baseline:** [fact] `tests/unit/daily-menu.test.ts` mocked.
- **Objective:** Verify audit and tenant boundaries for daily menus.
- **Technical work:**
  - Implement TI-011…TI-013; assert audit rows for each daily menu action; remove mocked tests.
- **Files/modules:** `tests/integration/isolation/daily-menu.test.ts`
- **Database:** Seed.
- **API:** SA-DMENU-01…05, LD-DMENU-01, LD-DMENU-02.
- **Frontend:** None.
- **Security:** SC-AUD-01.
- **Tests:**
  - `TC-DMENU-008` [integration] Every daily menu action writes its audit action with item set before/after.
- **Acceptance criteria:**
  - TI-011…TI-013 pass.
- **Implementation notes:** Every daily-menu action's audit row is asserted with the item set before and after (created, items_updated, published, unpublished, copied, deleted), including the no-op cases that must not write a second row. TI-011 (a date both tenants use), TI-012 (foreign item ids alone and mixed in) and TI-013 (publish, unpublish, delete and copy of another tenant's menu) assert 404 parity and an unchanged Tenant B. TC-DMENU-008.
- **Affected files (actual):** tests/integration/menu/daily-menu.test.ts

## P12 — Orders

11 tasks · 29 ideal days of effort · sequence #101–#111 (interleaved with other phases where dependencies allow)

### S1-P12-T001 — Decision gate: order rules

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 101 | P12 Orders | Gopala Krishna (Project Owner) | Critical | 1d | — | — | 2026-09-22 | 2026-09-22 | COMPLETED |

- **Dependencies:** S1-P01-T010
- **Requirements:** REQ-ORDER-004, REQ-ORDER-012, REQ-ORDER-014, REQ-ORDER-015
- **Baseline:** Q-003, Q-006, Q-007, Q-008, Q-021 open.
- **Objective:** Settle order behaviour that changes services and UI.
- **Technical work:**
  - Answer Q-003 (add items to open orders), Q-006 (discounts), Q-007 (completion requires payment), Q-008 (manager cancellation from PREPARING/READY), Q-021 (ordering restricted to daily menu).
  - Update prd.md BR-ORD-05/06, security.md §3.4 and api.md if answers differ from recommendations.
- **Files/modules:** `knowledge/implementation/slice-01/open-questions.md`, `prd.md`, `security.md`
- **Database:** None.
- **API:** SA-ORD-02, SA-ORD-03, SA-ORD-04.
- **Frontend:** Order detail actions.
- **Security:** None.
- **Tests:**
  - None — decision record.
- **Acceptance criteria:**
  - All listed questions ANSWERED before S1-P12-T004 starts.
- **Implementation notes:** Project Owner answered on 2026-09-22: Q-003 A (add items as a new KOT round), Q-006 A (no discounts), Q-007 A (COMPLETED requires PAID), Q-008 B (TENANT_ADMIN/MANAGER may cancel PREPARING/READY with a reason), Q-021 A (no daily-menu restriction). Recorded in open-questions.md; prd.md BR-ORD-05/06, security.md §3.3 row 29 and §3.4, api.md SA-ORD-03 and business-rules.md updated. lib/auth/transitions.ts gained PREPARING/READY → CANCELLED for TENANT_ADMIN/MANAGER, covered by tests/unit/transitions.test.ts and tests/integration/orders/order-status.test.ts.
- **Affected files (actual):** knowledge/implementation/slice-01/{open-questions,prd,security,api}.md, knowledge/product/business-rules.md, lib/auth/transitions.ts, tests/unit/transitions.test.ts, tests/integration/orders/order-status.test.ts

### S1-P12-T002 — Pricing engine

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 102 | P12 Orders | Backend Engineer | Critical | 2d | — | — | 2026-09-22 | 2026-09-22 | COMPLETED |

- **Dependencies:** S1-P02-T010
- **Requirements:** REQ-ORDER-002, REQ-ORDER-003, REQ-ORDER-006, REQ-TXN-009, REQ-TEST-001, REQ-TXN-011
- **Baseline:** [fact] Totals computed inline in `lib/services/orders.ts:94-130` without rounding or modifiers.
- **Objective:** Pure, exhaustively tested pricing per ADR-010.
- **Technical work:**
  - `lib/pricing/price-order.ts#priceLines(lines, catalogue)` returning per-line unit, add-on total, subtotal, tax (ROUND_HALF_UP), total and order totals; throws `VARIANT_REQUIRED`, `INVALID_ADDON`, `ITEM_UNAVAILABLE` with item references.
  - `lib/pricing/gst.ts#gstBreakup(lines)` groups snapshotted lines by tax rate and returns taxable value, CGST/SGST rates and amounts (`cgst = ROUND_HALF_UP(tax / 2, 2)`, `sgst = tax − cgst`) per ADR-010 §3.
- **Files/modules:** `lib/pricing/*`
- **Database:** None.
- **API:** Used by SA-ORD-01, SA-ORD-04.
- **Frontend:** Client estimate helper shares types only (labelled Estimate).
- **Security:** SC-VAL-02.
- **Tests:**
  - `TC-ORDER-002` [unit] Table-driven totals incl. mixed tax rates, add-ons, quantities up to 99 and `.005` rounding edges match hand-computed expectations.
  - `TC-PRICE-003` [unit] GST breakup per tax rate: CGST = ROUND_HALF_UP(tax / 2, 2), SGST = tax − CGST, CGST + SGST equals the tax exactly including odd-paise totals.
  - `TC-PRICE-002` [unit] Property test: for random valid carts, order total equals Σ line totals and tax equals Σ line tax.
- **Acceptance criteria:**
  - 100% branch coverage of `lib/pricing`.
- **Implementation notes:** lib/pricing/price-order.ts priceLines(lines, catalogue): pure ADR-010 §2–3 pricing (variant price or base price + Σ add-ons, × quantity, per-line ROUND_HALF_UP tax, order totals, discount 0 per Q-006 A) with line snapshots; collects problems across lines and throws PricingError (422) with the contract codes ITEM_UNAVAILABLE / VARIANT_REQUIRED / INVALID_ADDON and items.<i>.<field> references. lib/pricing/gst.ts gstBreakup(lines): per tax rate taxable value, CGST = ROUND_HALF_UP(tax/2, 2), SGST = tax − CGST, rates tax_rate/2. ValidationError now takes an optional specific 422 code (also used by LedgerRuleError). tests/unit/pricing.test.ts: 19 tests incl. table-driven totals with .005/.004 edges and per-line rounding, 500-cart property test, 1000-case GST exactness; 100% statement/branch coverage of lib/pricing. Wired into order creation by S1-P12-T004.
- **Affected files (actual):** lib/pricing/price-order.ts, lib/pricing/gst.ts, lib/errors.ts, lib/services/payments.ts, tests/unit/pricing.test.ts

### S1-P12-T003 — Race-free sequential numbering

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 103 | P12 Orders | Database Engineer | Critical | 1d | — | — | 2026-09-22 | 2026-09-22 | COMPLETED |

- **Dependencies:** S1-P02-T003, S1-P02-T011
- **Requirements:** REQ-ORDER-007, REQ-KOT-002
- **Baseline:** [fact] Count-based numbering (`lib/services/orders.ts:45-58`, `lib/services/kot.ts:21-33`, BA-14).
- **Objective:** Unique daily order and KOT numbers under concurrency.
- **Technical work:**
  - `lib/data/counters.ts#nextNumber(tx, tenantId, type, businessDate)` using the ADR-010 upsert; formatters `formatOrderNumber`, `formatKotNumber`; overflow error.
- **Files/modules:** `lib/data/counters.ts`
- **Database:** TENANT_COUNTER.
- **API:** Internal.
- **Frontend:** None.
- **Security:** None.
- **Tests:**
  - `TC-ORDER-014` [integration] 50 concurrent transactions obtain 50 distinct consecutive order numbers for the same tenant and business date; separate tenants have independent sequences.
  - `TC-KOT-002` [integration] KOT counter behaves the same and resets per business date.
- **Acceptance criteria:**
  - Unique constraints never violated in the concurrency test.
- **Implementation notes:** lib/data/counters.ts nextNumber(tx, ctx, type, businessDate): one INSERT … ON CONFLICT DO UPDATE … RETURNING on tenant_counters inside the caller's transaction (ADR-010 §6); business date passed as an ISO date string so the session time zone cannot shift it; limits 9,999 orders / 999 KOTs per business day raise 409 DAILY_NUMBER_LIMIT and roll the increment back. formatOrderNumber (YYYYMMDD-NNNN) and formatKotNumber (K-NNN) per BR-ORD-07; order and KOT creation now use them (the count-based ORD-/KOT- numbering is gone). tests/integration/orders/numbering.test.ts: 50 concurrent order creations get 50 distinct consecutive numbers with no unique violation, tenants independent, rollback returns the number, overflow; KOT counter race-free and per business date.
- **Affected files (actual):** lib/data/counters.ts, lib/data/orders.ts, lib/data/kot.ts, tests/integration/orders/numbering.test.ts, tests/integration/orders/create-order.test.ts, tests/integration/kitchen/kot-generation.test.ts

### S1-P12-T004 — Order creation service

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 104 | P12 Orders | Backend Engineer | Critical | 4d | — | — | 2026-09-23 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P12-T001, S1-P12-T002, S1-P12-T003, S1-P10-T004, S1-P04-T010
- **Requirements:** REQ-ORDER-002, REQ-ORDER-003, REQ-ORDER-006, REQ-ORDER-008, REQ-ORDER-009, REQ-CUST-007, REQ-MENU-008, REQ-TENANT-003
- **Baseline:** [fact] `lib/services/orders.ts:63-214` non-atomic, trusts options, overwrites customers (BA-15, BA-16, BA-19).
- **Objective:** Implement brief §26 steps 1–12 atomically and idempotently.
- **Technical work:**
  - `lib/services/orders.ts#createOrder(ctx, input)`: idempotency lookup; load catalogue rows scoped to tenant (published, available, not archived) for items, variants and add-ons; price via `lib/pricing`; counter; insert ORDER, ORDER_ITEM (snapshots, section snapshot, kot_round 1), ORDER_ITEM_ADDON; link existing customer by id or create new customer (never update existing); reject when business day closed; optional `sendToKitchen` → accept transition hook (KOT generation added in S1-P14-T001); audit `order.created`.
  - Strict input schema `lib/validation/orders.ts` rejecting price/total/tax/discount/tenant keys.
  - SA-ORD-01 action.
- **Files/modules:** `lib/services/orders.ts`, `lib/data/orders.ts`, `lib/validation/orders.ts`, `app/restaurant/(console)/orders/new/actions.ts`
- **Database:** ORDER, ORDER_ITEM, ORDER_ITEM_ADDON, CUSTOMER, TENANT_COUNTER, AUDIT_LOG.
- **API:** SA-ORD-01.
- **Frontend:** Consumed by S1-P12-T007.
- **Security:** SC-VAL-02, SC-API-02, SC-TEN-02, SC-PII-01.
- **Tests:**
  - `TC-ORDER-001` [integration] Dine-in order with variant and add-on persists correct snapshots, totals, business date and order number.
  - `TC-ORDER-003` [integration] Payloads containing `price`, `total`, `taxAmount`, `discount` or `tenantId` keys are rejected with VALIDATION_ERROR and nothing is written.
  - `TC-ORDER-004` [integration] Editing the menu item price, name and tax after ordering leaves the order's snapshots and totals unchanged.
  - `TC-ORDER-008` [integration] Replaying the same idempotency key returns the original order; two concurrent submissions with the same key create one order.
  - `TC-CUST-007` [integration] Creating an order for an existing customer id or with a phone that already exists never changes the stored customer name or email.
- **Acceptance criteria:**
  - Any failure leaves no partial rows (verified by row counts).
- **Implementation notes:** createOrder (lib/services/orders.ts) implements SA-ORD-01 in one transaction: idempotency lookup by (tenant, key) → business-day-closed check (409 DAY_CLOSED) → tenant catalogue via lib/data/menu.ts loadOrderCatalogue → server pricing through lib/pricing (variants, add-ons, per-line ROUND_HALF_UP tax) → order number from the tenant counter → order, lines with full snapshots and ORDER_ITEM_ADDON rows → customer linked by id or by phone/email without ever overwriting a profile → optional sendToKitchen (accept + round-1 tickets) → order.created audit. A lost idempotency race replays the winner's order instead of failing. HIGH priority is limited to TENANT_ADMIN/MANAGER/CASHIER and a new customer needs customer:create. Input contract rebuilt in lib/validation/orders.ts (idempotencyKey, tableLabel, priority, customerId, sendToKitchen, per-line variantId and addonIds ≤ 10). tests/integration/orders/create-order.test.ts: 12 cases covering TC-ORDER-001/003/004/008, TC-CUST-007, TI-024 and the catalogue rules.
- **Affected files (actual):** lib/services/orders.ts, lib/data/orders.ts, lib/validation/orders.ts, app/restaurant/orders/actions.ts, tests/integration/orders/create-order.test.ts

### S1-P12-T005 — Order state machine service

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 105 | P12 Orders | Backend Engineer | Critical | 3d | — | — | 2026-09-22 | 2026-09-22 | COMPLETED |

- **Dependencies:** S1-P12-T004, S1-P05-T004
- **Requirements:** REQ-ORDER-004, REQ-ORDER-005, REQ-ORDER-012, REQ-ORDER-013, REQ-RBAC-007
- **Baseline:** [fact] Transitions allow CANCELLED from PREPARING/READY and payment bypass to COMPLETED (BA-20).
- **Objective:** Correct lifecycle with role rules, payment rule, concurrency control and audit.
- **Technical work:**
  - `transitionOrder(ctx, { orderId, toStatus, expectedVersion })` and `cancelOrder(ctx, { orderId, reason, expectedVersion })` using `lib/auth/transitions.ts`, `updateMany` with version, timestamps, derived-status hooks (for P14), COMPLETED requires PAID (per Q-007), cancel requires net paid 0; audit `order.status_changed` / `order.cancelled`.
  - SA-ORD-02, SA-ORD-03 actions.
- **Files/modules:** `lib/services/orders.ts`, `app/restaurant/(console)/orders/actions.ts`
- **Database:** ORDER, AUDIT_LOG.
- **API:** SA-ORD-02, SA-ORD-03.
- **Frontend:** Consumed by order board and detail.
- **Security:** SC-RBAC-06, SC-API-03.
- **Tests:**
  - `TC-ORDER-005` [unit] Every from/to pair not in BR-ORD-02 is rejected with INVALID_TRANSITION.
  - `TC-ORDER-006` [integration] Each transition succeeds only for the roles in security.md §3.4 (e.g. KITCHEN cannot complete; WAITER cannot cancel ACCEPTED).
  - `TC-ORDER-007` [integration] Cancel requires a 5–280 char reason, is blocked while net paid > 0 (`REFUND_REQUIRED`), and records reason in audit.
  - `TC-ORDER-009` [integration] Two concurrent transitions with the same expected version: one succeeds, the other returns CONFLICT.
- **Acceptance criteria:**
  - No code path sets order status outside this service.
- **Implementation notes:** lib/services/orders.ts updateOrderStatus is the single requested-transition path: shared table (lib/auth/transitions.ts), COMPLETED requires PAID (422 PAYMENT_REQUIRED, Q-007 A), cancel requires reason and net paid 0 (409 REFUND_REQUIRED), same-target no-op (api.md idempotency), compare-and-set on version (409 CONFLICT), audit in the same transaction. The automatic COMPLETED → REFUNDED rule moved to the order service (statusAfterRefund) and the payment service applies it; the baseline auto-complete on full payment was removed (BA-20). Tests: TC-ORDER-006 (every requestable transition × every tenant role, expectations from the spec fixture), TC-ORDER-007, TC-ORDER-009 (concurrent transitions), idempotent retry, Q-008 B cancellation; money tests now complete orders explicitly. KOT cancellation with the order is S1-P14-T003.
- **Affected files (actual):** lib/services/orders.ts, lib/data/orders.ts, lib/services/payments.ts, tests/integration/orders/order-status.test.ts, tests/integration/money/payments.test.ts, tests/integration/money/refunds.test.ts

### S1-P12-T006 — Order loaders and polling route

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 106 | P12 Orders | Backend Engineer | High | 2d | — | — | 2026-09-23 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P12-T005, S1-P05-T005
- **Requirements:** REQ-ORDER-010, REQ-ORDER-011, REQ-RBAC-008
- **Baseline:** [fact] Orders read via server action polling every 15 s (`app/restaurant/orders/page.tsx:89`).
- **Objective:** Efficient board and detail data per ADR-009.
- **Technical work:**
  - LD-ORD-01 board, RH-ORD-01 `GET /api/v1/orders?since=&status=` (cursor on `updated_at`, max 200, `hasMore`, `serverTime`, `no-store`), LD-ORD-02 detail with allowed actions computed for the caller, LD-ORD-03 order entry catalogue.
- **Files/modules:** `lib/data/orders.ts`, `app/api/v1/orders/route.ts`, `lib/services/orders-loaders.ts`
- **Database:** ORDER, ORDER_ITEM, ORDER_ITEM_ADDON, KOT_TICKET, TRANSACTION.
- **API:** LD-ORD-01, LD-ORD-02, LD-ORD-03, RH-ORD-01.
- **Frontend:** Consumed by S1-P12-T007…T009.
- **Security:** SC-RBAC-07, SC-API-04, SC-HDR-03.
- **Tests:**
  - `TC-ORDER-010` [integration] Polling with `since` returns only rows updated after the cursor, includes terminal transitions, applies kitchen projection for KITCHEN, and caps at 200.
  - `TC-ORDER-011` [integration] Detail `allowedActions` differ correctly for CASHIER, WAITER, KITCHEN and MANAGER on the same order.
- **Acceptance criteria:**
  - p95 < 300 ms for polling at seed scale ×10.
- **Implementation notes:** orderBoard (LD-ORD-01 / RH-ORD-01) returns the active queue urgent-first then today's closed orders, with a since cursor on updated_at, a 200 cap, hasMore and the server clock; findOrderDetail and orderTimeline (LD-ORD-02) add snapshot lines with add-ons, tickets with print status, payment state and audit activity; getOrderEntryCatalogue (LD-ORD-03) feeds the POS. GET /api/v1/orders exposes the poll. KITCHEN receives the kitchen projection on both board and detail and cannot search by customer name, so the board is no existence oracle for PII. The transitions a role may perform are computed server-side from the shared table and sent to the client, never inferred in the browser.
- **Affected files (actual):** lib/data/orders.ts, lib/services/orders.ts, app/api/v1/orders/route.ts, app/restaurant/orders/actions.ts, tests/integration/orders/order-board.test.ts

### S1-P12-T007 — Order entry (POS) UI

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 107 | P12 Orders | Frontend Engineer | Critical | 5d | — | — | 2026-09-23 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P12-T006, S1-P08-T006, S1-P08-T008
- **Requirements:** REQ-ORDER-001, REQ-ORDER-009, REQ-ORDER-008
- **Baseline:** [fact] `createStaffOrderAction` has no UI; `components/restaurant/POSCheckout.tsx` unused (BA-31).
- **Objective:** Fast, touch-first order entry for cashiers and waiters.
- **Technical work:**
  - `/restaurant/orders/new`: CategoryRail, PosItemTile grid with daily-menu highlight, ItemOptionsDialog (required variant radio group, add-on checkboxes, quantity, instructions), OrderLineList with QuantityStepper, order type/table/notes/priority, estimated totals labelled "Estimate", submit with `useIdempotencyKey`, success panel with authoritative totals; < lg drawer layout with sticky order bar.
  - Delete unused `POSCheckout.tsx`.
- **Files/modules:** `app/restaurant/(console)/orders/new/page.tsx`, `components/domain/orders/*`, `lib/ui/use-idempotency-key.ts`
- **Database:** None.
- **API:** LD-ORD-03, SA-ORD-01.
- **Frontend:** `/restaurant/orders/new`.
- **Security:** SC-VAL-02, SC-API-02.
- **Tests:**
  - `TC-ORDER-015` [e2e] Waiter on tablet creates a dine-in order with a variant and add-on; server totals displayed; double-tapping submit creates one order; unavailable-item error lists items.
- **Acceptance criteria:**
  - Order of 5 items can be entered in under 30 seconds by a trained user (timed usability check recorded).
- **Implementation notes:** /restaurant/orders/new: category rail, item tiles with the day's menu highlighted, an options dialog (required variant radio, add-on checkboxes, quantity stepper, instructions), and an order panel for type, table, notes, urgency and customer. The running total is a server quote (quoteOrderAction) — no money arithmetic runs in the browser — and each submit carries one idempotency key that is reused on retry, so a double tap replays the original order instead of creating a second one. Below lg the panel becomes a bottom sheet above the console's own bottom bar.
- **Affected files (actual):** app/restaurant/orders/new/**, components/orders/**, app/restaurant/orders/actions.ts, tests/integration/orders/order-screens.test.ts

### S1-P12-T008 — Order board UI

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 108 | P12 Orders | Frontend Engineer | High | 3d | — | — | 2026-09-23 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P12-T006, S1-P08-T009
- **Requirements:** REQ-ORDER-010, REQ-ORDER-004
- **Baseline:** [fact] `app/restaurant/orders/page.tsx` board with 15 s server action polling.
- **Objective:** Live order board with status actions.
- **Technical work:**
  - `/restaurant/orders`: status tabs with counts, search, OrderCard grid for active orders, DataTable for closed orders, `usePolling` 10 s, stale banner, polite announcements for new orders, primary next action per card via SA-ORD-02.
  - Delete unused `components/restaurant/OrderCard.tsx` baseline after replacement.
- **Files/modules:** `app/restaurant/(console)/orders/page.tsx`, `components/domain/orders/order-card.tsx`
- **Database:** None.
- **API:** LD-ORD-01, RH-ORD-01, SA-ORD-02.
- **Frontend:** `/restaurant/orders`.
- **Security:** SC-RBAC-08.
- **Tests:**
  - `TC-ORDER-016` [e2e] An order created in a second browser appears on the board within 10 s; accepting it moves it to the Accepted tab.
- **Acceptance criteria:**
  - Kitchen role board shows no totals or customer names.
- **Implementation notes:** The order board has status tabs with counts, search, a card grid for active orders and a data table for closed ones, 10 s cursor polling that merges by id, the stale banner when polling falls behind, and polite announcements for new orders. Only the transitions the role holds are offered, and the server re-checks each one.
- **Affected files (actual):** app/restaurant/orders/page.tsx, components/orders/**, tests/integration/orders/order-board.test.ts

### S1-P12-T009 — Order detail UI

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 109 | P12 Orders | Frontend Engineer | High | 3d | — | — | 2026-09-23 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P12-T008
- **Requirements:** REQ-ORDER-011, REQ-ORDER-012
- **Baseline:** None.
- **Objective:** One place to see and act on an order.
- **Technical work:**
  - `/restaurant/orders/[orderId]`: DetailHeader with status/payment badges and timers, OrderLinesTable, TotalsSummary, KOT section slot (filled in S1-P14-T005), payments slot (S1-P18-T006), CancelOrderDialog, customer card, activity timeline from audit; conflict auto-refresh.
- **Files/modules:** `app/restaurant/(console)/orders/[orderId]/page.tsx`, `components/domain/orders/*`
- **Database:** None.
- **API:** LD-ORD-02, SA-ORD-02, SA-ORD-03.
- **Frontend:** `/restaurant/orders/[orderId]`.
- **Security:** SC-TEN-04.
- **Tests:**
  - `TC-ORDER-017` [e2e] Manager cancels a NEW order with a reason; a Tenant B order id renders the not-found page.
- **Acceptance criteria:**
  - Allowed actions come from the server, not client role checks.
- **Implementation notes:** /restaurant/orders/[orderId]: status and payment badges with timers, snapshot lines and totals, the KOT section, a payment panel gated on transaction:read, the customer panel, and an activity timeline. Cancelling asks for a 5–280 character reason, and every transition sends expectedVersion so a concurrent change refreshes the screen instead of overwriting someone else's work.
- **Affected files (actual):** app/restaurant/orders/[orderId]/**, components/orders/**, tests/integration/orders/order-screens.test.ts

### S1-P12-T010 — Add items to an open order (decision-gated by Q-003)

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 110 | P12 Orders | Backend Engineer | Medium | 3d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P12-T005, S1-P12-T001
- **Requirements:** REQ-ORDER-014, REQ-KOT-009
- **Baseline:** None.
- **Objective:** If approved, support additional kitchen rounds on open orders.
- **Technical work:**
  - `addOrderItems(ctx, { orderId, idempotencyKey, expectedVersion, items })`: status ACCEPTED/PREPARING/READY, new `kot_round`, totals recomputed, payment status recomputed, KOTs for the new round; SA-ORD-04; "Add items" UI entry on order detail reusing POS components.
- **Files/modules:** `lib/services/orders.ts`, `app/restaurant/(console)/orders/[orderId]/actions.ts`
- **Database:** ORDER, ORDER_ITEM, ORDER_ITEM_ADDON, KOT_TICKET, KOT_ITEM, AUDIT_LOG.
- **API:** SA-ORD-04.
- **Frontend:** Order detail "Add items".
- **Security:** SC-API-02, SC-API-03.
- **Tests:**
  - `TC-ORDER-013` [integration] Adding items creates round 2 lines and KOTs, updates totals, sets PAID orders to PARTIALLY_PAID, and is idempotent.
- **Acceptance criteria:**
  - If Q-003 is not approved, task set to COMPLETED with note "Not applicable" and SA-ORD-04 removed from api.md.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P12-T011 — Order authorization and isolation tests

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 111 | P12 Orders | QA Engineer | Critical | 2d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P12-T006, S1-P04-T009
- **Requirements:** REQ-TENANT-003, REQ-ORDER-003, REQ-TEST-006
- **Baseline:** [fact] `tests/unit/orders-engine.test.ts` mocked.
- **Objective:** Prove order endpoints resist cross-tenant and manipulation attacks.
- **Technical work:**
  - Implement TI-021…TI-027 and ADV-007, ADV-008, ADV-010; register order endpoints for RBAC rows 23–30; remove mocked order tests.
- **Files/modules:** `tests/integration/isolation/orders.test.ts`, `tests/integration/adversarial/orders.test.ts`
- **Database:** Seed.
- **API:** LD-ORD-01…03, RH-ORD-01, SA-ORD-01…06.
- **Frontend:** None.
- **Security:** SC-TEN-02, SC-VAL-02.
- **Tests:**
  - `TC-ORDER-018` [integration] RBAC matrix rows TC-RBAC-123…TC-RBAC-130 pass with real endpoints; TI-021…TI-027 and listed ADV cases pass.
- **Acceptance criteria:**
  - No order-related `todo` rows remain in the RBAC driver.
- **Implementation notes:** —
- **Affected files (actual):** —

## P13 — Customers

5 tasks · 9 ideal days of effort · sequence #112–#116 (interleaved with other phases where dependencies allow)

### S1-P13-T001 — Customer services

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 112 | P13 Customers | Backend Engineer | High | 3d | — | — | 2026-09-23 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P04-T005, S1-P04-T010
- **Requirements:** REQ-CUST-001, REQ-CUST-002, REQ-CUST-003, REQ-CUST-008, REQ-CUST-005
- **Baseline:** [fact] `getTenantCustomers` in `lib/services/orders.ts:306-334`; no create/update UI actions.
- **Objective:** Minimal-data customer management with privacy controls.
- **Technical work:**
  - `lib/services/customers.ts`: create (E.164 normalisation, phone uniqueness → `PHONE_EXISTS`), update, archive, anonymise (TENANT_ADMIN, confirm phrase, irreversible), lookup normalisation; audits with masked PII; SA-CUS-01…04.
- **Files/modules:** `lib/data/customers.ts`, `lib/services/customers.ts`, `app/restaurant/(console)/customers/actions.ts`
- **Database:** CUSTOMER, AUDIT_LOG.
- **API:** SA-CUS-01, SA-CUS-02, SA-CUS-03, SA-CUS-04, SA-ORD-05.
- **Frontend:** Consumed by S1-P13-T003.
- **Security:** SC-PII-01, SC-PII-02, SC-PII-03.
- **Tests:**
  - `TC-CUST-001` [integration] Create normalises phone to E.164; duplicate phone returns PHONE_EXISTS without revealing data to callers lacking `customer:read`.
  - `TC-CUST-004` [integration] Update changes fields with masked audit before/after; linking a customer to an order (SA-ORD-05) validates tenant ownership.
  - `TC-CUST-006` [integration] Archive hides from lists; anonymise replaces name and clears phone/email/notes irreversibly while orders keep the link.
- **Acceptance criteria:**
  - Customer PII never appears unmasked in logs or audit.
- **Implementation notes:** lib/services/customers.ts with lib/data/customers.ts and lib/validation/customers.ts: create with E.164 normalisation and the duplicate-phone rule (409 PHONE_EXISTS, existing id revealed only to callers with customer:read), update that touches only the fields sent (an omitted field can never wipe data a form did not show; an empty string clears), archive, and TENANT_ADMIN-only irreversible anonymisation behind a confirmation phrase that keeps the order history intact. Audit rows and logs carry masked values only (S. T., +91*****45, r***@example.com — SC-PII-03). tests/integration/customers/customers.test.ts covers TC-CUST-001/004/006 and 404 parity for another tenant's customer.
- **Affected files (actual):** lib/data/customers.ts, lib/services/customers.ts, lib/validation/customers.ts, app/restaurant/customers/actions.ts, tests/integration/customers/customers.test.ts

### S1-P13-T002 — Customer loaders and lookup route

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 113 | P13 Customers | Backend Engineer | High | 1d | — | — | 2026-09-23 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P13-T001
- **Requirements:** REQ-CUST-002, REQ-CUST-004, REQ-CUST-005, REQ-CUST-006
- **Baseline:** None.
- **Objective:** List, detail with history, and POS lookup.
- **Technical work:**
  - LD-CUS-01 (masked phones), LD-CUS-02 (history cursor; totals only with `transaction:read`), RH-CUS-01 `GET /api/v1/customers/lookup?q=` (3–40 chars, max 10, rate limit 60/min).
- **Files/modules:** `lib/data/customers.ts`, `app/api/v1/customers/lookup/route.ts`
- **Database:** CUSTOMER, ORDER.
- **API:** LD-CUS-01, LD-CUS-02, RH-CUS-01.
- **Frontend:** Consumed by customers UI and POS.
- **Security:** SC-RL-01, SC-PII-01.
- **Tests:**
  - `TC-CUST-002` [integration] History paginates newest first; totals omitted for WAITER.
  - `TC-CUST-003` [integration] Lookup by partial phone or name returns ≤ 10 masked results from the caller's tenant only; 61st call in a minute returns 429.
  - `TC-CUST-005` [integration] KITCHEN is forbidden from all customer endpoints; list responses mask phone numbers; logs contain only masked values.
- **Acceptance criteria:**
  - Lookup p95 < 150 ms at seed scale ×10.
- **Implementation notes:** LD-CUS-01 list, LD-CUS-02 history (cursor paging, newest first, amounts only for holders of transaction:read) and RH-CUS-01 GET /api/v1/customers/lookup?q= — at most 10 active customers of the caller's tenant matched on partial name, phone or email, guarded by customer:read and rate limited to 60 lookups a minute per user (SC-RL-01). Search terms are escaped, so a % is matched literally. Covered by TC-CUST-002/003/005 in tests/integration/customers/customers.test.ts.
- **Affected files (actual):** lib/data/customers.ts, lib/services/customers.ts, app/api/v1/customers/lookup/route.ts, app/restaurant/customers/actions.ts, tests/integration/customers/customers.test.ts

### S1-P13-T003 — Customers UI

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 114 | P13 Customers | Frontend Engineer | Medium | 3d | — | — | 2026-09-23 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P13-T002, S1-P08-T007, S1-P08-T008
- **Requirements:** REQ-CUST-001, REQ-CUST-003, REQ-CUST-004, REQ-CUST-008
- **Baseline:** [fact] `app/restaurant/customers/page.tsx` list only.
- **Objective:** Find and manage customers.
- **Technical work:**
  - `/restaurant/customers` list with search and New customer dialog; `/restaurant/customers/[customerId]` profile, staff-only notes label, history table, archive/anonymise danger zone.
- **Files/modules:** `app/restaurant/(console)/customers/page.tsx`, `app/restaurant/(console)/customers/[customerId]/page.tsx`, `components/domain/customers/*`
- **Database:** None.
- **API:** LD-CUS-01, LD-CUS-02, SA-CUS-01, SA-CUS-02, SA-CUS-03, SA-CUS-04.
- **Frontend:** `/restaurant/customers`, `/restaurant/customers/[customerId]`.
- **Security:** SC-RBAC-08.
- **Tests:**
  - `TC-CUST-008` [e2e] Cashier searches, creates and edits a customer; TENANT_ADMIN anonymises with typed confirmation; phone-exists error links to the existing record.
- **Acceptance criteria:**
  - Designed states on both pages; axe clean.
- **Implementation notes:** app/restaurant/customers/page.tsx and app/restaurant/customers/[customerId]/page.tsx rebuilt as Server Components on LD-CUS-01 and LD-CUS-02, with components/customers/ holding the create, edit, archive and erase controls. The baseline list fetched on the client and printed a dollar sign whatever the restaurant charged in; money is now formatted from the loader's decimal strings in the restaurant's own currency (ADR-010 §1). Notes are labelled staff-only wherever they appear. Order amounts are absent for a role without transaction:read — the loader decides that, and a WAITER test proves the page shows no totals rather than zeros. Another restaurant's customer id renders the same not-found page as an unknown one (TI-034).

Three contract gaps this work closed:
1. LD-CUS-01 accepted `includeArchived` and ignored it, so an archived customer could not be found again from the console. listCustomers now honours it and the DTO carries `isArchived`, which the list badges.
2. SA-CUS-01 promises the existing customer's id with PHONE_EXISTS, but the action envelope dropped every field except code/message/fieldErrors, so the promised id could never arrive. AppError now carries an optional `details` that toActionError copies through (api.md §1.2 updated), and the create dialog offers to open the existing record instead of leaving someone to search for a name they have not been told.
3. updateCustomerSchema used optionalText for `notes`, which turns an omitted field into null: editing a customer through any client that did not send notes erased them. It now uses `clearable`, like phone and email — the same defect that was fixed for those fields earlier. TC-CUST-008 asserts an omitted field keeps its value.
- **Affected files (actual):** app/restaurant/customers/page.tsx, app/restaurant/customers/[customerId]/page.tsx, components/customers/customer-dialogs.tsx, components/customers/customer-actions.tsx, lib/data/customers.ts, lib/services/customers.ts, lib/validation/customers.ts, lib/errors.ts, lib/http/action.ts, tests/integration/customers/customers-ui.test.ts

### S1-P13-T004 — Customer lookup in order entry

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 115 | P13 Customers | Frontend Engineer | Medium | 1d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P13-T002, S1-P12-T007
- **Requirements:** REQ-CUST-002, REQ-ORDER-001
- **Baseline:** None.
- **Objective:** Attach or create a customer while taking an order.
- **Technical work:**
  - `CustomerLookup` combobox (debounced RH-CUS-01), "New customer" inline fields sending `newCustomer` in SA-ORD-01.
- **Files/modules:** `components/domain/orders/customer-lookup.tsx`
- **Database:** None.
- **API:** RH-CUS-01, SA-ORD-01.
- **Frontend:** `/restaurant/orders/new`.
- **Security:** None.
- **Tests:**
  - `TC-CUST-009` [e2e] Typing the last digits of a seeded phone selects the customer and the created order shows that customer.
- **Acceptance criteria:**
  - Combobox follows ARIA combobox pattern.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P13-T005 — Customer isolation tests

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 116 | P13 Customers | QA Engineer | Critical | 1d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P13-T002
- **Requirements:** REQ-CUST-006, REQ-TENANT-003
- **Baseline:** [fact] `tests/unit/customer-crm.test.ts` mocked.
- **Objective:** Customer data cannot cross tenants.
- **Technical work:**
  - Implement TI-031…TI-035 (TI-035 receipt covered in P18); register RBAC rows 35–38; remove mocked tests.
- **Files/modules:** `tests/integration/isolation/customers.test.ts`
- **Database:** Seed.
- **API:** LD-CUS-01, LD-CUS-02, RH-CUS-01, SA-CUS-01…04.
- **Frontend:** None.
- **Security:** SC-TEN-02.
- **Tests:**
  - `TC-CUST-010` [integration] RBAC matrix rows TC-RBAC-135…TC-RBAC-138 pass; TI-031…TI-034 pass.
- **Acceptance criteria:**
  - No customer `todo` rows remain in the RBAC driver.
- **Implementation notes:** —
- **Affected files (actual):** —

## P14 — KOT

6 tasks · 10 ideal days of effort · sequence #117–#122 (interleaved with other phases where dependencies allow)

### S1-P14-T001 — KOT generation service

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 117 | P14 KOT | Backend Engineer | Critical | 3d | — | — | 2026-09-23 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P12-T005, S1-P12-T003
- **Requirements:** REQ-KOT-001, REQ-KOT-002, REQ-KOT-003, REQ-KOT-006, REQ-KOT-009, REQ-KOT-008
- **Baseline:** [fact] `lib/services/kot.ts:38-90` creates one ticket, duplicates on accept (BA-18), no items.
- **Objective:** Idempotent KOTs per section and round, created in the acceptance transaction.
- **Technical work:**
  - `lib/services/kot.ts#generateKotsForAcceptance(tx, ctx, order)`: group order lines of the round by `kitchen_section_id` (NULL group), upsert KOT_TICKET using U-KOT-2 (on conflict do nothing + select), KOT number via counter, KOT_ITEM snapshots (label, add-ons, instructions, quantity), priority/type/table/notes snapshots; audit `kot.generated`.
  - Wire into ACCEPTED transition and `sendToKitchen`.
- **Files/modules:** `lib/services/kot.ts`, `lib/data/kot.ts`
- **Database:** KOT_TICKET, KOT_ITEM, TENANT_COUNTER, AUDIT_LOG.
- **API:** Internal to SA-ORD-01, SA-ORD-02.
- **Frontend:** None.
- **Security:** SC-TEN-02.
- **Tests:**
  - `TC-KOT-001` [integration] Accepting an order with items in two sections creates exactly two KOTs with correct items; repeating acceptance or retrying the transaction creates no duplicates; NEW orders have no KOTs.
- **Acceptance criteria:**
  - KOT and order acceptance commit or roll back together.
- **Implementation notes:** lib/services/kot.ts generateKotsForRound(tx, ctx, orderId, round) runs inside the order's acceptance transaction: it groups the round's lines by kitchen section (lines without a section share one ticket), takes a K-NNN number from the tenant counter, writes immutable item snapshots (label with variant, add-ons, instructions) and audits kot.generated per ticket. Idempotent per (order, section, round) via U-KOT-2, so a retried acceptance creates nothing. tests/integration/kitchen/kot-generation.test.ts proves the two-section case, xmin-identical commit with the order, no duplicates on repeat, and that a counter overflow rolls the whole acceptance back.
- **Affected files (actual):** lib/services/kot.ts, lib/data/kot.ts, lib/data/orders.ts, lib/services/orders.ts, tests/integration/kitchen/kot-generation.test.ts

### S1-P14-T002 — KOT status service and order status derivation

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 118 | P14 KOT | Backend Engineer | Critical | 2d | — | — | 2026-09-23 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P14-T001
- **Requirements:** REQ-KOT-004, REQ-RBAC-007, REQ-ORDER-004
- **Baseline:** [fact] `lib/services/kot.ts:11-16` allows QUEUED→READY skip; no order derivation.
- **Objective:** Sequential KOT progression that drives order status.
- **Technical work:**
  - `updateKotStatus(ctx, { kotId, toStatus })` with transitions table and permissions (`kot:update_status`, `kot:serve`), timestamps, derive order ACCEPTED→PREPARING on first start, PREPARING→READY when all latest-round KOTs READY/SERVED; audits; SA-KOT-01.
- **Files/modules:** `lib/services/kot.ts`, `app/restaurant/(focus)/kitchen/actions.ts`
- **Database:** KOT_TICKET, ORDER, AUDIT_LOG.
- **API:** SA-KOT-01.
- **Frontend:** Consumed by kitchen board and order detail.
- **Security:** SC-RBAC-06.
- **Tests:**
  - `TC-KOT-003` [integration] Only QUEUED→PREPARING→READY→SERVED is allowed; repeated target is a no-op.
  - `TC-KOT-004` [integration] CASHIER/WAITER cannot start or ready a KOT; WAITER can serve; KITCHEN can start, ready and serve.
  - `TC-ORDER-019` [integration] Starting the first KOT moves the order to PREPARING; readying the last KOT moves it to READY.
- **Acceptance criteria:**
  - Derived order transitions are audited with actor SYSTEM-derived from the KOT actor.
- **Implementation notes:** updateKOTStatus moves one step along the shared transition table with a compare-and-set, audits the step, and then derives the order: lib/services/order-derivation.ts syncOrderWithKitchen sets ACCEPTED → PREPARING when the first ticket starts and PREPARING → READY when every non-cancelled ticket of the latest round is READY/SERVED. Derived changes are audited with actorType SYSTEM naming the ticket and the user who triggered them, in the same transaction. A manual order → READY is refused while tickets are unfinished (409 INVALID_TRANSITION). Tests: tests/integration/kitchen/order-derivation.test.ts (TC-ORDER-019, TC-KOT-003/004) and kitchen-board.test.ts.
- **Affected files (actual):** lib/services/kot.ts, lib/services/order-derivation.ts, lib/services/orders.ts, lib/data/kot.ts, lib/data/orders.ts, tests/integration/kitchen/order-derivation.test.ts

### S1-P14-T003 — KOT cancellation with order

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 119 | P14 KOT | Backend Engineer | High | 1d | — | — | 2026-09-23 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P14-T002
- **Requirements:** REQ-KOT-004
- **Baseline:** None.
- **Objective:** Cancelled orders cancel their open kitchen tickets.
- **Technical work:**
  - In `cancelOrder`, set non-SERVED KOTs to CANCELLED with timestamps; kitchen board shows cancelled state briefly then removes.
- **Files/modules:** `lib/services/orders.ts`, `lib/services/kot.ts`
- **Database:** KOT_TICKET, AUDIT_LOG.
- **API:** SA-ORD-03.
- **Frontend:** Kitchen card cancelled state.
- **Security:** None.
- **Tests:**
  - `TC-KOT-008` [integration] Cancelling an ACCEPTED order cancels its QUEUED KOTs in the same transaction and audits each.
- **Acceptance criteria:**
  - Served KOTs are never altered.
- **Implementation notes:** Cancelling an order cancels its open tickets in the same transaction (cancelKotsWithOrder → cancelOpenKotsOfOrder), stamping cancelledAt and auditing kot.status_changed per ticket; SERVED tickets are never altered. Covered by TC-KOT-008 in tests/integration/kitchen/kot-generation.test.ts, including the xmin check that the tickets and the order commit together.
- **Affected files (actual):** lib/services/kot.ts, lib/data/kot.ts, lib/services/orders.ts, tests/integration/kitchen/kot-generation.test.ts

### S1-P14-T004 — KOT print state derivation

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 120 | P14 KOT | Backend Engineer | High | 1d | — | — | 2026-09-23 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P14-T001
- **Requirements:** REQ-KOT-005
- **Baseline:** None.
- **Objective:** Expose each KOT's printing status.
- **Technical work:**
  - `lib/data/kot.ts#printStatusFor(kotIds)` using the latest non-reprint job per KOT (lateral join); values NONE, PENDING, PROCESSING, PRINTED, FAILED.
- **Files/modules:** `lib/data/kot.ts`
- **Database:** KOT_TICKET, PRINT_JOB.
- **API:** LD-KOT-01, RH-KOT-01, LD-ORD-02.
- **Frontend:** Print badges.
- **Security:** None.
- **Tests:**
  - `TC-KOT-006` [integration] Print status reflects NONE without jobs, then PENDING, PRINTED and FAILED as seeded jobs change.
- **Acceptance criteria:**
  - One query for a board of 50 tickets.
- **Implementation notes:** lib/data/kot.ts printStatusFor(ctx, kotIds) returns each ticket's print state from the newest non-reprint KOT job, using one lateral-join query for the whole board (one index scan per ticket) and scoped to the caller's tenant; tickets without a job read as NONE. tests/integration/kitchen/print-status.test.ts (TC-KOT-006) covers NONE → PENDING → PRINTED → FAILED, that a reprint never changes the state, the board-wide call and that another tenant's tickets return nothing.
- **Affected files (actual):** lib/data/kot.ts, tests/integration/kitchen/print-status.test.ts

### S1-P14-T005 — KOT section in order detail

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 121 | P14 KOT | Frontend Engineer | Medium | 2d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P14-T002, S1-P12-T009
- **Requirements:** REQ-KOT-003, REQ-KOT-005
- **Baseline:** None.
- **Objective:** Staff see KOTs per section and round from the order.
- **Technical work:**
  - `KotStatusList` in order detail: KOT number, section, round, status badge, print status, serve action where permitted.
- **Files/modules:** `components/domain/kitchen/kot-status-list.tsx`
- **Database:** None.
- **API:** LD-ORD-02, SA-KOT-01.
- **Frontend:** `/restaurant/orders/[orderId]`.
- **Security:** SC-RBAC-08.
- **Tests:**
  - `TC-KOT-009` [e2e] Order detail shows two KOTs for a two-section order with statuses updating after kitchen actions.
- **Acceptance criteria:**
  - Status and print badges use icon + label.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P14-T006 — KOT audit and isolation tests

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 122 | P14 KOT | QA Engineer | Critical | 1d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P14-T002
- **Requirements:** REQ-KOT-008, REQ-TENANT-003
- **Baseline:** [fact] `tests/unit/kds-kot.test.ts` mocked.
- **Objective:** KOT boundaries and audit verified.
- **Technical work:**
  - Implement TI-036…TI-039 (TI-039 reprint after P16); register RBAC rows 31–34; remove mocked tests.
- **Files/modules:** `tests/integration/isolation/kot.test.ts`
- **Database:** Seed.
- **API:** SA-KOT-01, LD-KOT-01, RH-KOT-01.
- **Frontend:** None.
- **Security:** SC-AUD-01.
- **Tests:**
  - `TC-KOT-010` [integration] `kot.generated` and `kot.status_changed` audit rows contain actor, from/to and KOT number; TI-036…TI-038 pass.
- **Acceptance criteria:**
  - Mocked KDS tests removed.
- **Implementation notes:** —
- **Affected files (actual):** —

## P15 — Kitchen Management

5 tasks · 10 ideal days of effort · sequence #123–#127 (interleaved with other phases where dependencies allow)

### S1-P15-T001 — Kitchen loaders and polling route

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 123 | P15 Kitchen Management | Backend Engineer | Critical | 2d | — | — | 2026-09-23 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P14-T004, S1-P05-T005
- **Requirements:** REQ-KITCH-002, REQ-KITCH-006, REQ-KITCH-007, REQ-RBAC-008
- **Baseline:** [fact] `getKOTTicketsAction` server action polled every 10 s including customer rows.
- **Objective:** Kitchen data within 5 s without PII.
- **Technical work:**
  - LD-KOT-01 and RH-KOT-01 `GET /api/v1/kitchen/tickets?since=&section=` with kitchen projection (items, notes, priority, type/table, timestamps, target prep = max item prep minutes, printStatus), sort priority desc then queued_at asc, cursor semantics, cap 200.
- **Files/modules:** `lib/data/kitchen.ts`, `app/api/v1/kitchen/tickets/route.ts`
- **Database:** KOT_TICKET, KOT_ITEM, MENU_ITEM, PRINT_JOB.
- **API:** LD-KOT-01, RH-KOT-01.
- **Frontend:** Consumed by S1-P15-T002.
- **Security:** SC-RBAC-07, SC-HDR-03.
- **Tests:**
  - `TC-KITCH-001` [integration] Active tickets sorted by priority then age with no customer or money fields; section filter applied.
  - `TC-KITCH-002` [integration] A KOT created after the cursor appears in the next poll; served/cancelled changes are delivered so clients can remove cards.
- **Acceptance criteria:**
  - p95 < 300 ms with 100 active tickets.
- **Implementation notes:** lib/data/kitchen.ts kitchenBoard(ctx, query) is the kitchen projection for LD-KOT-01 and RH-KOT-01: ticket, items, timings, priority, target prep minutes (max of the items' prep times) and print status — no customer or money fields. The board sorts priority desc then queued_at asc; a poll with `since` (the previous response's serverTime, so the cursor is the server's clock) returns every ticket changed at or after it, including SERVED and CANCELLED ones so cards can be removed. Pages cap at 200 with hasMore. GET /api/v1/kitchen/tickets guards with kot:read first and validates the query strictly (kitchenPollSchema). tests/integration/kitchen/kitchen-poll.test.ts covers TC-KITCH-001/002 plus 401 for anonymous, 422 for a bad filter or a tenantId in the query, and TI-037 for another tenant's section.
- **Affected files (actual):** lib/data/kitchen.ts, app/api/v1/kitchen/tickets/route.ts, lib/validation/kot.ts, tests/integration/kitchen/kitchen-poll.test.ts

### S1-P15-T002 — Kitchen board UI

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 124 | P15 Kitchen Management | Frontend Engineer | Critical | 5d | — | — | 2026-09-23 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P15-T001, S1-P08-T009, S1-P08-T008
- **Requirements:** REQ-KITCH-001, REQ-KITCH-002, REQ-KITCH-003, REQ-KITCH-004, REQ-KITCH-005, REQ-KITCH-006, REQ-KITCH-008
- **Baseline:** [fact] `app/restaurant/kds/page.tsx` dark board with hard-coded stations; `app/restaurant/kitchen/page.tsx` re-exports it.
- **Objective:** Fast, legible, touch-friendly kitchen display.
- **Technical work:**
  - `/restaurant/kitchen` in FocusShell: section selector (persisted locally), columns QUEUED/PREPARING/READY (single column + segmented control < lg), `KotCard` (large KOT number, table/type, HIGH priority `Flame` + text, elapsed timer vs target with warning/overdue text, quantity-first items, highlighted instructions, print status icon, one primary action), stale banner, optional chime toggle (off by default), card transitions respecting reduced motion.
  - Delete `app/restaurant/kds/*` and unused baseline `KitchenBoard`/`KOTCard`.
- **Files/modules:** `app/restaurant/(focus)/kitchen/page.tsx`, `components/domain/kitchen/*`
- **Database:** None.
- **API:** LD-KOT-01, RH-KOT-01, SA-KOT-01.
- **Frontend:** `/restaurant/kitchen`.
- **Security:** SC-RBAC-08.
- **Tests:**
  - `TC-KITCH-003` [e2e] Selecting the Tandoor section shows only Tandoor tickets; selection persists after reload.
  - `TC-KITCH-007` [e2e] Timer shows warning at target prep time and "Overdue n min" text at +50% using an injected clock; HIGH priority card shows flame icon and label.
  - `TC-KITCH-005` [e2e] Kitchen user presses Start, Ready; waiter presses Served; the order board reflects PREPARING then READY.
- **Acceptance criteria:**
  - Touch targets ≥ 48 px; KOT number ≥ 28 px; axe clean.
- **Implementation notes:** The kitchen board runs in the focus shell: section selector remembered per device, three columns from lg and a segmented single column below, ticket cards with a 28 px number, quantity-first item lines, an elapsed timer that warns at targetPrepMinutes and reads Overdue past +50 %, a flame and the word Urgent for priority, the print-status badge and one 56 px primary action. It polls every 5 s and shows the stale banner when the connection drops. /restaurant/kds is now a guarded redirect. Deferred: the optional new-ticket chime, because there is no audio asset in the repo and a toggle that plays nothing would be a dead control.
- **Affected files (actual):** app/restaurant/kitchen/**, components/kitchen/**, app/restaurant/kds/page.tsx, tests/integration/kitchen/kitchen-screen.test.ts

### S1-P15-T003 — Order priority action

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 125 | P15 Kitchen Management | Backend Engineer | Medium | 1d | — | — | 2026-09-23 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P12-T005
- **Requirements:** REQ-KITCH-004
- **Baseline:** None.
- **Objective:** Staff can flag urgent orders for the kitchen.
- **Technical work:**
  - `setOrderPriority(ctx, { orderId, priority })` updating order and open KOT snapshots; WAITER cannot set HIGH; audit `order.priority_changed`; SA-ORD-06; control on order detail.
- **Files/modules:** `lib/services/orders.ts`, `app/restaurant/(console)/orders/[orderId]/actions.ts`
- **Database:** ORDER, KOT_TICKET, AUDIT_LOG.
- **API:** SA-ORD-06.
- **Frontend:** Order detail priority control.
- **Security:** SC-RBAC-06.
- **Tests:**
  - `TC-KITCH-004` [integration] CASHIER sets HIGH and open KOTs update; WAITER setting HIGH receives FORBIDDEN.
- **Acceptance criteria:**
  - Kitchen board reorders on next poll.
- **Implementation notes:** setOrderPriority (SA-ORD-06) updates the order and every open ticket in one transaction and audits order.priority_changed; HIGH is refused for a WAITER. setOrderCustomer (SA-ORD-05) links or unlinks a customer and audits order.customer_linked without ever writing the customer profile. Both need order:update_meta, and linking also needs customer:read. The RBAC matrix driver now probes order:update_meta through setOrderPriorityAction.
- **Affected files (actual):** lib/services/orders.ts, lib/data/orders.ts, lib/validation/orders.ts, app/restaurant/orders/actions.ts, tests/integration/orders/order-meta.test.ts, tests/integration/rbac/endpoint-registry.ts

### S1-P15-T004 — Kitchen field usability check

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 126 | P15 Kitchen Management | QA Engineer | Medium | 1d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P15-T002
- **Requirements:** REQ-KITCH-008, REQ-KITCH-005
- **Baseline:** None.
- **Objective:** Validate the board on real kitchen hardware conditions.
- **Technical work:**
  - Test on a 10–11" tablet in landscape and portrait under bright light at ~1.5 m; gloved/wet-hand tap simulation (large targets); record issues and fixes.
- **Files/modules:** `knowledge/implementation/slice-01/testing.md` (results section)
- **Database:** Staging seed.
- **API:** None.
- **Frontend:** `/restaurant/kitchen`.
- **Security:** None.
- **Tests:**
  - `TC-KITCH-008` [manual] Readability and touch checklist passes on a physical tablet (results recorded with device model).
- **Acceptance criteria:**
  - All High issues fixed before M07.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P15-T005 — Kitchen polling load check

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 127 | P15 Kitchen Management | QA Engineer | Medium | 1d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P15-T001
- **Requirements:** REQ-NFR-001, REQ-KITCH-006
- **Baseline:** None.
- **Objective:** Confirm ADR-009 load assumptions.
- **Technical work:**
  - Node script using built-in `fetch`/`undici` simulating 20 kitchen screens across 5 tenants polling every 5 s against staging for 10 minutes; capture p50/p95 and DB CPU.
- **Files/modules:** `tests/perf/kitchen-polling.mjs`
- **Database:** Staging.
- **API:** RH-KOT-01.
- **Frontend:** None.
- **Security:** None.
- **Tests:**
  - `TC-KITCH-009` [perf] p95 < 300 ms and zero errors for 20 simulated screens over 10 minutes.
- **Acceptance criteria:**
  - Results recorded; ADR-009 intervals confirmed or adjusted by amendment.
- **Implementation notes:** —
- **Affected files (actual):** —

## P16 — Print Queue

9 tasks · 21 ideal days of effort · sequence #128–#136 (interleaved with other phases where dependencies allow)

### S1-P16-T001 — Print queue data layer

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 128 | P16 Print Queue | Backend Engineer | Critical | 3d | — | — | 2026-09-23 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P02-T003, S1-P04-T008
- **Requirements:** REQ-PRINT-003, REQ-PRINT-004, REQ-PRINT-005, REQ-PRINT-007, REQ-PRINT-010, REQ-PRINT-011
- **Baseline:** [fact] `lib/services/printing.ts:66-87` non-atomic poll; ack without state check (BA-22).
- **Objective:** Correct, concurrent-safe queue operations per ADR-007.
- **Technical work:**
  - `lib/data/print-jobs.ts`: `createJob` (dedupe on conflict return existing), `claimJobs(agentCtx, max)` (single transaction `FOR UPDATE SKIP LOCKED`, lease 60 s, attempt+1, claim token), `ackJob(agentCtx, jobId, claimToken, result)` (ownership, PROCESSING, token; idempotent same result; backoff `10s × 2^(n-1)`; terminal FAILED), `retryJob(ctx, jobId)`, `failPendingForPrinter`.
  - Delete baseline `lib/services/printing.ts` functions and mocked tests.
- **Files/modules:** `lib/data/print-jobs.ts`, `lib/print/state-machine.ts`
- **Database:** PRINT_JOB, PRINTER, PRINT_AGENT.
- **API:** Used by RH-AGT-03, RH-AGT-04, SA-PRN-05.
- **Frontend:** None.
- **Security:** SC-PRINT-03, SC-PRINT-04, SC-PRINT-05.
- **Tests:**
  - `TC-PRINT-002` [unit] Job state machine allows only transitions in architecture.md §6.3.
  - `TC-PRINT-003` [integration] Creating a job with an existing dedupe key returns the existing job and inserts nothing.
  - `TC-PRINT-004` [integration] 10 concurrent claims by two agents never return the same job twice; expired leases become claimable.
  - `TC-PRINT-005` [integration] Ack with wrong agent returns not-found, stale claim token returns 409, repeated identical ack returns 200 without change.
- **Acceptance criteria:**
  - Queue operations pass under a 1,000-job concurrency test.
- **Implementation notes:** lib/data/printing.ts is the only path to PRINT_JOB / PRINTER / PRINT_AGENT, with the pure rules in lib/print/state-machine.ts. Claiming is one statement — a FOR UPDATE SKIP LOCKED CTE feeding the leasing UPDATE … RETURNING — so the baseline's read-then-update race (BA-22) cannot happen; TC-PRINT-004 fires ten concurrent claims from two agents at one printer and each job is claimed once. Creation is INSERT … ON CONFLICT (tenant_id, dedupe_key) DO NOTHING, so a duplicate can never abort the order-acceptance transaction it rides in. Acknowledgement locks the row and checks tenant, owning agent, PROCESSING and the current claim token; it is the only writer of PRINTED.
- **Affected files (actual):** lib/data/printing.ts, lib/print/state-machine.ts, tests/unit/print-queue-rules.test.ts, tests/integration/printing/queue.test.ts

### S1-P16-T002 — Print document renderers

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 129 | P16 Print Queue | Backend Engineer | High | 2d | — | — | 2026-09-23 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P14-T001
- **Requirements:** REQ-PRINT-001, REQ-KOT-003, REQ-TXN-011
- **Baseline:** [fact] Print payload arbitrary JSON (`lib/services/printing.ts:10`).
- **Objective:** Printer-agnostic, sanitised print documents shared with the agent.
- **Technical work:**
  - `lib/print/types.ts` (`PrintDocument` v1 + Zod schema), `render-kot.ts`, `render-receipt.ts`, `render-test.ts`; text sanitiser (strip C0/C1 control chars incl. ESC/GS, normalise whitespace), width-aware wrapping for 32/48 columns, 64 KB cap, restaurant-timezone timestamps; receipt prints GSTIN and the `gstBreakup` CGST/SGST table when the restaurant has a GSTIN, otherwise one tax line.
- **Files/modules:** `lib/print/*`
- **Database:** None.
- **API:** Internal.
- **Frontend:** None.
- **Security:** SC-VAL-07, SC-PRINT-07.
- **Tests:**
  - `TC-PRINT-008` [unit] Item names containing `\x1B`, `\x1D` and other control characters are stripped; long lines wrap at 32/48 columns.
  - `TC-PRINT-017` [unit] Receipt document with a GSTIN prints the GSTIN and CGST/SGST lines per rate; without a GSTIN it prints one tax line; totals identical in both.
  - `TC-PRINT-009` [unit] KOT and receipt documents never contain customer phone, email or internal ids other than job-level references.
- **Acceptance criteria:**
  - Golden JSON fixtures reviewed for KOT and receipt layouts.
- **Implementation notes:** lib/print/{types,text,format,render-kot,render-receipt,render-test}.ts. Every string passes sanitizeText first — ESC (0x1B), GS (0x1D), all C0/C1, DEL and zero-width characters are removed so no menu name can inject a printer command, and tab/newline become a space so words do not fuse — then width-aware wrapping at 32 or 48 columns and a 64 KB cap. A receipt prints the GSTIN and a CGST/SGST pair per rate through lib/pricing/gst.ts, or one tax line without a GSTIN; the totals are identical either way.
- **Affected files (actual):** lib/print/types.ts, lib/print/text.ts, lib/print/format.ts, lib/print/render-kot.ts, lib/print/render-receipt.ts, lib/print/render-test.ts, tests/unit/print-document.test.ts

### S1-P16-T003 — Print job producers and reprint

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 130 | P16 Print Queue | Backend Engineer | Critical | 3d | — | — | 2026-09-23 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P16-T001, S1-P16-T002
- **Requirements:** REQ-PRINT-001, REQ-KOT-007, REQ-PRINT-012
- **Baseline:** [fact] No job created for KOTs.
- **Objective:** Jobs created automatically and on demand with correct routing.
- **Technical work:**
  - `lib/services/printing.ts`: on KOT generation (if `auto_print_kot`), route per architecture.md §6.2 and create job in the same transaction; `reprintKot` (SA-KOT-02, dedupe `:reprint:n`, rate limit); `printReceipt` (SA-PRN-06); `sendTestPrint` (SA-PRN-04, rate limit); audits for manual jobs.
- **Files/modules:** `lib/services/printing.ts`, `app/restaurant/(console)/printing/actions.ts`, `app/restaurant/(focus)/kitchen/actions.ts`
- **Database:** PRINT_JOB, PRINTER, AUDIT_LOG.
- **API:** SA-KOT-02, SA-PRN-04, SA-PRN-06.
- **Frontend:** Reprint and print receipt buttons.
- **Security:** SC-PRINT-05, SC-RL-01.
- **Tests:**
  - `TC-PRINT-001` [integration] Accepting an order creates one KOT job per section to the section printer, falls back to an unsectioned KOT printer, and creates none when no printer exists.
  - `TC-KOT-005` [integration] Reprint creates a new job with `is_reprint` and incremented dedupe suffix; returns NO_PRINTER_CONFIGURED when none.
  - `TC-PRINT-012` [integration] Test print creates a TEST job for the chosen printer and is rate-limited to 6/min.
  - `TC-PRINT-014` [integration] Print receipt targets a RECEIPT-capable printer with the rendered receipt document.
- **Acceptance criteria:**
  - Job creation rolls back with the business transaction.
- **Implementation notes:** enqueueKotPrintJobs runs inside generateKotsForRound's transaction — the ticket and its job share one xmin, so a queued job without a ticket is not a state the database can be in. Routing follows architecture.md §6.2: the section's printer, else an unsectioned KOT printer, else no job at all rather than a job nobody will print. reprintKot, printReceipt and sendTestPrint are explicit, rate limited and audited. SA-KOT-02 lives in app/restaurant/printing/actions.ts rather than the kitchen actions file; the kitchen board does not call it yet, which is left to the kitchen screen's own task.
- **Affected files (actual):** lib/services/printing.ts, lib/services/kot.ts, app/restaurant/printing/actions.ts, tests/integration/printing/producers.test.ts

### S1-P16-T004 — Printer and agent management services

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 131 | P16 Print Queue | Backend Engineer | Critical | 2d | — | — | 2026-09-23 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P16-T001, S1-P03-T007
- **Requirements:** REQ-PRINT-002, REQ-PRINT-009
- **Baseline:** None.
- **Objective:** Register printers and create/revoke agent credentials.
- **Technical work:**
  - `lib/services/printers.ts`: create/update/deactivate (LAN private range validation, section/agent ownership, deactivation fails PENDING jobs).
  - `lib/services/print-agents.ts`: create pairing (8-char code from unambiguous alphabet, SHA-256, 10-min expiry, rate limit 10/hour per tenant), revoke; audits. Actions SA-PRN-01…03, SA-AGT-01, SA-AGT-02.
- **Files/modules:** `lib/services/printers.ts`, `lib/services/print-agents.ts`, `lib/validation/printer.ts`
- **Database:** PRINTER, PRINT_AGENT, PRINT_JOB, AUDIT_LOG.
- **API:** SA-PRN-01, SA-PRN-02, SA-PRN-03, SA-AGT-01, SA-AGT-02.
- **Frontend:** Consumed by S1-P16-T006.
- **Security:** SC-PRINT-02, SC-PRINT-06.
- **Tests:**
  - `TC-PRINT-007` [unit] LAN address validation accepts `192.168.1.50:9100`, `10.0.0.7`, rejects public IPs, hostnames resolving externally, `localhost` and ports outside 1–65535.
  - `TC-PRINT-011` [integration] Printer CRUD validates ownership; deactivation marks PENDING jobs FAILED with `PRINTER_DEACTIVATED`.
  - `TC-AGENT-002` [integration] Pairing code is single-use, expires after 10 minutes, is stored hashed, and pairing creation is rate-limited.
- **Acceptance criteria:**
  - Pairing codes and tokens never appear in logs or audit rows.
- **Implementation notes:** Printer CRUD with private-IPv4-only LAN addresses, ownership checks that answer 404 identically for a foreign and an unknown id, and deactivation that fails the printer's PENDING jobs with PRINTER_DEACTIVATED instead of leaving them to wait for a printer that is gone. Pairing issues an 8-character code from a 32-symbol unambiguous alphabet, stores only its SHA-256, expires in 10 minutes, is single-use and is rate limited 10/hour per tenant.
- **Affected files (actual):** lib/services/printing.ts, lib/validation/printing.ts, tests/integration/printing/management.test.ts

### S1-P16-T005 — Print agent API

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 132 | P16 Print Queue | Backend Engineer | Critical | 3d | — | — | 2026-09-23 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P16-T004, S1-P03-T007
- **Requirements:** REQ-PRINT-004, REQ-PRINT-008, REQ-PRINT-009, REQ-PRINT-010, REQ-PRINT-011, REQ-TENANT-008
- **Baseline:** [fact] Baseline poll route deleted in S1-P04-T008.
- **Objective:** Authenticated, tenant-bound machine API per ADR-007.
- **Technical work:**
  - `lib/auth/agent.ts#requireAgent(request)` (bearer → SHA-256 → ACTIVE agent → AgentContext with printer ids; update `last_seen_at`/IP throttled; 401 `INVALID_AGENT_TOKEN`).
  - Route handlers RH-AGT-01 pair, RH-AGT-02 heartbeat (printer health), RH-AGT-03 claim, RH-AGT-04 ack, RH-AGT-05 config; strict schemas; rate limits `agent.pair` (fail closed), `agent.api`.
- **Files/modules:** `lib/auth/agent.ts`, `app/api/v1/print-agent/**/route.ts`
- **Database:** PRINT_AGENT, PRINTER, PRINT_JOB, RATE_LIMIT_BUCKET, AUDIT_LOG.
- **API:** RH-AGT-01, RH-AGT-02, RH-AGT-03, RH-AGT-04, RH-AGT-05.
- **Frontend:** None.
- **Security:** SC-PRINT-01, SC-PRINT-04, SC-PRINT-09, SC-TEN-07, SC-RL-01.
- **Tests:**
  - `TC-AGENT-001` [integration] Pairing returns a token once; only its hash and prefix are stored; the token authenticates subsequent calls.
  - `TC-AGENT-003` [integration] After revocation, the next heartbeat or claim returns 401.
  - `TC-AGENT-004` [integration] Heartbeat updates printer health; agent shown offline after 90 s without calls (injected clock).
  - `TC-AGENT-005` [integration] Config returns only printers assigned to the calling agent.
  - `TC-PRINT-006` [integration] Static search finds no code setting `PRINTED` outside `ackJob`; integration confirms status stays PROCESSING until ack.
- **Acceptance criteria:**
  - A request containing any tenant field is rejected with VALIDATION_ERROR.
- **Implementation notes:** lib/auth/agent.ts#requireAgent is fail-closed: a missing, malformed, unknown or revoked token and a database error all produce one 401 INVALID_AGENT_TOKEN, so the endpoint is no oracle. The tenant comes from the PRINT_AGENT row the token hash resolves to — no agent request carries a tenant. last_seen_at is throttled to one write per 20 s so a 3 s claim poll does not write on every request. Five route handlers under app/api/v1/print-agent/**; the path is ADR-007's, not the brief's /api/v1/agent/**, because lib/auth/route-policy.ts already classifies that prefix as agent traffic.

Reviewed and corrected after the agent reported: agentSourceIp took the LEFT-most X-Forwarded-For entry, which the caller writes. Keying the pairing brute-force limit on it would have let an attacker mint a fresh bucket per attempt and defeat the control ADV-015 exists to prove. The trusted-hops rule now lives once in lib/http/client-ip.ts and is used by both the audit trail and this limiter: only the entry our own proxies added counts, and with no trusted proxy every caller shares one bucket. The three printing test files that relied on per-address budgets now stub TRUSTED_PROXY_HOPS=1, which is how staging and production run.
- **Affected files (actual):** lib/auth/agent.ts, lib/http/client-ip.ts, lib/http/request-meta.ts, app/api/v1/print-agent/**, tests/unit/print-agent-token.test.ts, tests/integration/printing/agent-api.test.ts

### S1-P16-T006 — Printing console UI

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 133 | P16 Print Queue | Frontend Engineer | High | 4d | — | — | 2026-09-23 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P16-T005, S1-P08-T007, S1-P08-T008
- **Requirements:** REQ-PRINT-002, REQ-PRINT-006, REQ-PRINT-008
- **Baseline:** [fact] `app/restaurant/printing/page.tsx` lists jobs and creates test jobs with `targetPrinter` strings.
- **Objective:** Manage printers, agents and the queue with honest statuses.
- **Technical work:**
  - `/restaurant/printing` tabs: Queue (filters, PrintJobTable with StatusBadge, error code/message, retry), Printers (PrinterCard with health, section, agent; add/edit/test/deactivate dialogs), Agents (online indicator, last seen, version; PairAgentDialog with one-time code, expiry countdown, install steps link; revoke).
  - LD-PRN-01 loader and RH-PRN-01 polling (10 s).
- **Files/modules:** `app/restaurant/(console)/printing/page.tsx`, `app/api/v1/print-jobs/route.ts`, `components/domain/printing/*`
- **Database:** None.
- **API:** LD-PRN-01, RH-PRN-01, SA-PRN-01, SA-PRN-02, SA-PRN-03, SA-PRN-04, SA-PRN-05, SA-AGT-01, SA-AGT-02.
- **Frontend:** `/restaurant/printing`.
- **Security:** SC-RBAC-08.
- **Tests:**
  - `TC-PRINT-010` [e2e] Failed job shows "Printer unavailable" with error details and Retry; test print shows Waiting → Printed only after simulated agent ack; pairing code displayed once.
- **Acceptance criteria:**
  - No UI path shows "Printed" without server PRINTED status.
- **Implementation notes:** /restaurant/printing rebuilt server-first on the design system with Queue, Printers and Agents tabs, 10 s RH-PRN-01 polling, real retry and test print, printer dialogs, and a pairing dialog that shows the code once with a live expiry countdown. LD-PRN-01's projection nulls a printer's connectionAddress for callers without printer:manage and the agent token prefix for callers without print_agent:manage, because print_job:read reaches KITCHEN and CASHIER — the same pattern as the KITCHEN order projection. The page left both eslint baseline exception lists.
- **Affected files (actual):** app/restaurant/printing/page.tsx, app/restaurant/printing/printing-console.tsx, app/restaurant/printing/printer-dialog.tsx, app/restaurant/printing/pair-agent-dialog.tsx

### S1-P16-T007 — Manual retry and lease recovery

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 134 | P16 Print Queue | Backend Engineer | High | 1d | — | — | 2026-09-23 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P16-T001
- **Requirements:** REQ-PRINT-005
- **Baseline:** [fact] `retryPrintJob` resets without attempt limits (`lib/services/printing.ts:140-163`).
- **Objective:** Staff can recover failed jobs; crashed agents do not strand jobs.
- **Technical work:**
  - SA-PRN-05 retry (FAILED only, attempts reset, audit `print_job.retried`); lease-expiry reclaim covered by claim query; failed terminal transitions audited `print_job.failed`.
- **Files/modules:** `lib/services/printing.ts`, `app/restaurant/(console)/printing/actions.ts`
- **Database:** PRINT_JOB, AUDIT_LOG.
- **API:** SA-PRN-05.
- **Frontend:** Retry buttons.
- **Security:** SC-RBAC-01.
- **Tests:**
  - `TC-PRINT-013` [integration] Retry resets attempts and schedules immediately; retrying a PRINTED job returns NOT_FAILED; a PROCESSING job with expired lease is re-claimed.
- **Acceptance criteria:**
  - Terminal failures visible on kitchen card print badge.
- **Implementation notes:** retryJob is FAILED-only (409 NOT_FAILED otherwise), resets the attempt count, schedules the job now and audits print_job.retried. An expired lease is reclaimed by the claim query itself with a fresh claim token, so a crashed agent that comes back with the old token is refused rather than acknowledging a job someone else is printing.
- **Affected files (actual):** lib/services/printing.ts, lib/data/printing.ts, tests/integration/printing/retry.test.ts

### S1-P16-T008 — Print isolation and adversarial tests

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 135 | P16 Print Queue | Security Engineer | Critical | 2d | — | — | 2026-09-23 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P16-T005
- **Requirements:** REQ-TENANT-008, REQ-PRINT-010, REQ-SEC-003
- **Baseline:** [fact] BA-01 historical exposure.
- **Objective:** Prove agents and staff cannot cross tenant print boundaries.
- **Technical work:**
  - Implement TI-041…TI-046 and ADV-012…ADV-015; register RBAC rows 44–47.
- **Files/modules:** `tests/integration/isolation/printing.test.ts`, `tests/integration/adversarial/print-agent.test.ts`
- **Database:** Seed.
- **API:** RH-AGT-01…05, SA-PRN-01…06, SA-AGT-01, SA-AGT-02, RH-PRN-01.
- **Frontend:** None.
- **Security:** SC-TEN-07, SC-PRINT-01…05.
- **Tests:**
  - `TC-PRINT-015` [integration] Tenant A agent token cannot claim, ack or read config for Tenant B jobs/printers; forged or truncated tokens return 401; TI-041…TI-046 pass.
- **Acceptance criteria:**
  - All listed ADV cases pass.
- **Implementation notes:** TI-041…046 and ADV-012…015 in tests/integration/printing/isolation.test.ts: an agent's tenant comes from its token's PRINT_AGENT row and nothing a caller sends — a body field, a path id, a claim token, a printer id — can move it. ADV-015 (pairing brute force) now proves what it claims to: with one trusted proxy, five guesses exhaust one address's budget while another address still has its own.
- **Affected files (actual):** tests/integration/printing/isolation.test.ts

### S1-P16-T009 — Printing health indicators

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 136 | P16 Print Queue | Frontend Engineer | Medium | 1d | — | — | 2026-09-23 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P16-T006, S1-P15-T002
- **Requirements:** REQ-PRINT-006, REQ-PRINT-008
- **Baseline:** [fact] Static "Agent API Status: Ready" removed in S1-P01-T007.
- **Objective:** Printing problems visible where staff work.
- **Technical work:**
  - Header indicator (agents offline / failed jobs count linking to printing console) from session context poll; print status badge on KotCard and order detail.
- **Files/modules:** `components/layout/header-printing-indicator.tsx`, `components/domain/kitchen/kot-card.tsx`
- **Database:** None.
- **API:** RH-DASH-01 (printing section) or RH-PRN-01.
- **Frontend:** Header, kitchen, order detail.
- **Security:** None.
- **Tests:**
  - `TC-PRINT-016` [e2e] Stopping the simulated agent shows "1 agent offline" in the header within 2 minutes; restarting clears it.
- **Acceptance criteria:**
  - Indicator hidden for roles without `print_job:read`.
- **Implementation notes:** A printer's health is only ever what its agent last reported — UNKNOWN reads 'Not reported yet' rather than pretending to be OK — and an agent counts as online only while last_seen_at is inside the 90 s window. The agents-offline indicator was added to the existing header notification surface instead of a new component, because that surface already exists and a second one would compete with it.
- **Affected files (actual):** lib/services/printing.ts, app/restaurant/layout.tsx

## P17 — Local Print Agent

10 tasks · 22 ideal days of effort · sequence #137–#146 (interleaved with other phases where dependencies allow)

### S1-P17-T001 — Decision gate: agent runtime and printers

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 137 | P17 Local Print Agent | Gopala Krishna (Project Owner) | Critical | 1d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P01-T010
- **Requirements:** REQ-AGENT-005, REQ-AGENT-001
- **Baseline:** Q-010, Q-011 open.
- **Objective:** Fix agent operating systems, packaging and target printers.
- **Technical work:**
  - Answer Q-010 (OS targets, installer/service model) and Q-011 (printer models to verify); procure or identify one USB and one LAN ESC/POS printer for testing.
- **Files/modules:** `knowledge/implementation/slice-01/open-questions.md`
- **Database:** None.
- **API:** None.
- **Frontend:** None.
- **Security:** None.
- **Tests:**
  - None — decision record.
- **Acceptance criteria:**
  - Q-010 and Q-011 ANSWERED; test printers available.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P17-T002 — Agent package scaffold

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 138 | P17 Local Print Agent | Backend Engineer | High | 2d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P17-T001, S1-P16-T002
- **Requirements:** REQ-AGENT-001
- **Baseline:** [fact] No agent code.
- **Objective:** Buildable, testable agent package in the repository.
- **Technical work:**
  - `print-agent/` with its own `package.json`, `tsconfig.json`, build to Node LTS bundle; shared `PrintDocument` types imported from `lib/print/types.ts` via path mapping; `config.json` schema (server URL https only, intervals); structured logger without payload/token; CLI commands `pair`, `run`, `status`.
- **Files/modules:** `print-agent/**`
- **Database:** None.
- **API:** Client of RH-AGT-*.
- **Frontend:** None.
- **Security:** SC-LOG-04.
- **Tests:**
  - `TC-AGENT-011` [unit] Config rejects `http://` server URLs and unknown keys; logger redacts token and payload fields.
- **Acceptance criteria:**
  - `npm run build` inside `print-agent/` produces a runnable artifact in CI.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P17-T003 — Pairing and credential storage

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 139 | P17 Local Print Agent | Backend Engineer | Critical | 2d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P17-T002, S1-P16-T005
- **Requirements:** REQ-AGENT-002
- **Baseline:** None.
- **Objective:** Agent pairs once and protects its token.
- **Technical work:**
  - `print-agent pair <code>` calls RH-AGT-01 and stores token in the OS credential store per Q-010 (Windows Credential Manager/DPAPI; Linux secret service or root-only file 0600 fallback documented); never writes token to config or logs; re-pair replaces credential.
- **Files/modules:** `print-agent/src/credentials.ts`, `print-agent/src/commands/pair.ts`
- **Database:** None.
- **API:** RH-AGT-01.
- **Frontend:** None.
- **Security:** SC-PRINT-08.
- **Tests:**
  - `TC-AGENT-007` [integration] After pairing, token is retrievable from the credential store, absent from `config.json` and logs.
- **Acceptance criteria:**
  - Pairing error messages distinguish invalid code from network failure without revealing server details.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P17-T004 — Poll, claim, acknowledge loop

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 140 | P17 Local Print Agent | Backend Engineer | Critical | 3d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P17-T003
- **Requirements:** REQ-AGENT-001, REQ-AGENT-003, REQ-AGENT-004, REQ-PRINT-007
- **Baseline:** None.
- **Objective:** Reliable at-least-once processing with duplicate mitigation.
- **Technical work:**
  - Loop: heartbeat 30 s; claim every 3 s ± 1 s; backoff to 15 s after 10 empty polls; exponential backoff on network errors (max 60 s); per-job print → ack; local journal of printed job ids (24 h, fsync) consulted before printing; graceful shutdown finishing in-flight job.
- **Files/modules:** `print-agent/src/loop.ts`, `print-agent/src/journal.ts`
- **Database:** None.
- **API:** RH-AGT-02, RH-AGT-03, RH-AGT-04, RH-AGT-05.
- **Frontend:** None.
- **Security:** SC-PRINT-04.
- **Tests:**
  - `TC-AGENT-008` [integration] Agent killed after printing but before ack re-claims the job after lease expiry and acknowledges it without printing again.
  - `TC-AGENT-012` [integration] With the server unreachable for 2 minutes the agent backs off, then resumes and prints queued jobs in order.
- **Acceptance criteria:**
  - CPU idle < 2% and memory < 150 MB during a 1-hour idle run.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P17-T005 — ESC/POS encoder

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 141 | P17 Local Print Agent | Backend Engineer | Critical | 3d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P17-T002
- **Requirements:** REQ-AGENT-001
- **Baseline:** None.
- **Objective:** Correct thermal output for 58 and 80 mm printers.
- **Technical work:**
  - `print-agent/src/escpos.ts`: init (ESC @), align (ESC a), bold (ESC E), double size (GS !), line feed, codepage selection, partial cut (GS V 1), 32/48 column layout, `row` block left/right padding, transliteration for unsupported characters (e.g. ₹ → "Rs" when codepage lacks it).
- **Files/modules:** `print-agent/src/escpos.ts`
- **Database:** None.
- **API:** None.
- **Frontend:** None.
- **Security:** SC-VAL-06, SC-VAL-07.
- **Tests:**
  - `TC-AGENT-013` [unit] Golden byte sequences for KOT and receipt fixtures at 58 and 80 mm match expected output.
  - `TC-AGENT-006` [static] Agent source contains no `child_process`, `exec`, `spawn` or shell invocation using job data.
- **Acceptance criteria:**
  - Encoder handles every `PrintDocument` block type.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P17-T006 — Printer transports

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 142 | P17 Local Print Agent | Backend Engineer | Critical | 3d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P17-T005
- **Requirements:** REQ-AGENT-001, REQ-AGENT-004, REQ-PRINT-008
- **Baseline:** None.
- **Objective:** Print over LAN and USB with health detection.
- **Technical work:**
  - LAN: `net.Socket` to `host:port`, 5 s connect / 10 s write timeouts, error mapping to `PRINTER_OFFLINE`/`TIMEOUT`.
  - USB: OS-specific raw device write per Q-010 (e.g. Windows printer share raw port or USB device path; Linux `/dev/usb/lp*`), no shell execution.
  - Health reporting per printer in heartbeat.
- **Files/modules:** `print-agent/src/transports/*`
- **Database:** None.
- **API:** RH-AGT-02 (health).
- **Frontend:** None.
- **Security:** SC-VAL-06.
- **Tests:**
  - `TC-AGENT-014` [integration] LAN transport delivers bytes to the TCP simulator; with the simulator stopped the job fails with PRINTER_OFFLINE and health reports OFFLINE.
- **Acceptance criteria:**
  - Physical USB and LAN printers print the test page (recorded in S1-P17-T008).
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P17-T007 — ESC/POS printer simulator

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 143 | P17 Local Print Agent | QA Engineer | High | 2d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P17-T002
- **Requirements:** REQ-TEST-011
- **Baseline:** None.
- **Objective:** Deterministic printer for CI and development.
- **Technical work:**
  - `tools/printer-simulator/`: TCP server on configurable port recording received bytes per connection, decoding ESC/POS into readable text for assertions, fault modes (refuse connection, stall, close mid-stream).
- **Files/modules:** `tools/printer-simulator/*`
- **Database:** None.
- **API:** None.
- **Frontend:** None.
- **Security:** None.
- **Tests:**
  - `TC-AGENT-015` [integration] Simulator decodes a golden KOT byte stream into expected text and supports each fault mode.
- **Acceptance criteria:**
  - Runs in CI as a background service.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P17-T008 — End-to-end printing verification

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 144 | P17 Local Print Agent | QA Engineer | Critical | 2d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P17-T004, S1-P17-T006, S1-P17-T007, S1-P16-T003
- **Requirements:** REQ-AGENT-001, REQ-PRINT-001, REQ-PRINT-011, REQ-TEST-011
- **Baseline:** None.
- **Objective:** Prove the full chain from order to paper.
- **Technical work:**
  - CI E2E: create and accept order → KOT job → agent (against simulator) → PRINTED visible in console and kitchen badge.
  - Manual run with one USB and one LAN physical printer (58 and/or 80 mm); photograph outputs; record in testing.md.
- **Files/modules:** `tests/e2e/printing/*`, `knowledge/implementation/slice-01/testing.md`
- **Database:** Test/staging.
- **API:** RH-AGT-*, SA-ORD-01, SA-ORD-02.
- **Frontend:** Printing console, kitchen.
- **Security:** None.
- **Tests:**
  - `TC-AGENT-009` [e2e] Order acceptance results in a printed KOT on the simulator within 10 s and PRINTED status in UI; physical printer runs recorded.
- **Acceptance criteria:**
  - Both physical transports verified.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P17-T009 — Agent packaging and installation guide

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 145 | P17 Local Print Agent | DevOps Engineer | High | 3d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P17-T006
- **Requirements:** REQ-AGENT-005
- **Baseline:** None.
- **Objective:** Restaurant staff can install and run the agent as a service.
- **Technical work:**
  - Package per Q-010 (e.g. Windows service installer; Linux systemd unit); versioned release artifacts attached to GitHub releases; `operations/print-agent.md` install, pair, update, uninstall, troubleshooting (offline printer, firewall, paper out).
- **Files/modules:** `print-agent/packaging/*`, `.github/workflows/print-agent-release.yml`, `knowledge/operations/print-agent.md`
- **Database:** None.
- **API:** None.
- **Frontend:** Link from PairAgentDialog.
- **Security:** SC-DEP-01.
- **Tests:**
  - `TC-AGENT-010` [manual] Clean install on each approved OS runs as a service after reboot, pairs, and prints a test page.
- **Acceptance criteria:**
  - Install guide followed successfully by someone other than the developer.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P17-T010 — Agent security review

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 146 | P17 Local Print Agent | Security Engineer | High | 1d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P17-T009
- **Requirements:** REQ-SEC-002, REQ-AGENT-002
- **Baseline:** None.
- **Objective:** Review agent against T-007, T-022, T-028.
- **Technical work:**
  - Review TLS verification (no `rejectUnauthorized: false`), credential storage, logs, update path integrity (checksums), service account privileges, network exposure (agent opens no listening ports).
- **Files/modules:** `print-agent/**`
- **Database:** None.
- **API:** None.
- **Frontend:** None.
- **Security:** SC-PRINT-08, SC-VAL-06.
- **Tests:**
  - `TC-AGENT-016` [review] Signed checklist with evidence; agent opens no listening sockets (verified with `netstat`).
- **Acceptance criteria:**
  - No open High/Critical findings.
- **Implementation notes:** —
- **Affected files (actual):** —

## P18 — Transactions

9 tasks · 19 ideal days of effort · sequence #147–#155 (interleaved with other phases where dependencies allow)

### S1-P18-T001 — Payment ledger service

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 147 | P18 Transactions | Backend Engineer | Critical | 3d | — | — | 2026-09-22 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P12-T005, S1-P04-T010
- **Requirements:** REQ-TXN-001, REQ-TXN-002, REQ-TXN-008, REQ-TXN-009, REQ-TXN-010
- **Baseline:** [fact] `lib/services/payments.ts:22-90` client amount, no balance guard, bypasses state machine (BA-20).
- **Objective:** Correct, idempotent payment recording per ADR-010 §8.
- **Technical work:**
  - `lib/services/transactions.ts#recordPayment(ctx, input)`: lock order `FOR UPDATE`, reject CANCELLED, closed day; amount ≤ balance; CASH tendered/change; UPI reference required; PAN-like reference rejection (13–19 digits Luhn-valid); idempotency key; recompute `paid_amount`, `payment_status`; audit `payment.recorded`; SA-TXN-01.
- **Files/modules:** `lib/services/transactions.ts`, `lib/data/transactions.ts`, `lib/validation/transactions.ts`
- **Database:** TRANSACTION, ORDER, BUSINESS_DAY_CLOSE, AUDIT_LOG.
- **API:** SA-TXN-01.
- **Frontend:** Consumed by S1-P18-T006.
- **Security:** SC-API-02, SC-VAL-02.
- **Tests:**
  - `TC-TXN-002` [integration] Overpayment rejected with AMOUNT_EXCEEDS_BALANCE; cash tendered 1000 for 840 records change 160; UPI without reference rejected; card-number-like reference rejected.
  - `TC-TXN-005` [integration] Payment status transitions UNPAID → PARTIALLY_PAID → PAID; idempotent replay returns the same transaction; concurrent payments cannot exceed total.
- **Acceptance criteria:**
  - Baseline payments service and mocked tests removed.
- **Implementation notes:** recordPayment locks the order FOR UPDATE, refuses a cancelled or refunded order and a closed business day, caps the amount at the outstanding balance (cash may be tendered over and the surplus recorded as change), requires a UPI reference, rejects a card-number-like reference, replays a repeated idempotency key, recomputes paid_amount and payment_status, and audits payment.recorded — all in one transaction. A payment never changes the order status (BR-ORD-06). TC-TXN-002 and TC-TXN-005 in tests/integration/money/payments.test.ts; the baseline Prisma-mocking unit test is gone.
- **Affected files (actual):** lib/services/payments.ts, lib/data/payments.ts, lib/validation/payments.ts, app/restaurant/billing/actions.ts, tests/integration/money/payments.test.ts

### S1-P18-T002 — Refunds and voids

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 148 | P18 Transactions | Backend Engineer | Critical | 2d | — | — | 2026-09-22 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P18-T001
- **Requirements:** REQ-TXN-003, REQ-TXN-004, REQ-TXN-008
- **Baseline:** [fact] Refund marks whole order REFUNDED (BA-21).
- **Objective:** Partial/full refunds and same-day corrections with audit.
- **Technical work:**
  - `createRefund` (reference payment, ≤ refundable, reason, idempotency, order REFUNDED when COMPLETED and fully refunded, payment_status), `voidTransaction` (SUCCESS, same business date, day not closed, not a payment with refunds, reason); SA-TXN-02, SA-TXN-03.
- **Files/modules:** `lib/services/transactions.ts`
- **Database:** TRANSACTION, ORDER, AUDIT_LOG.
- **API:** SA-TXN-02, SA-TXN-03.
- **Frontend:** Refund and void dialogs.
- **Security:** SC-API-02, SC-AUD-01.
- **Tests:**
  - `TC-TXN-003` [integration] Partial refund sets PARTIALLY_REFUNDED; refunding the remainder of a completed order sets order REFUNDED; exceeding refundable returns REFUND_EXCEEDS_PAID.
  - `TC-TXN-004` [integration] Void allowed same day before close with reason; rejected after close, on another day, or for payments with refunds.
- **Acceptance criteria:**
  - Ledger rows are never updated except void fields.
- **Implementation notes:** Refunds reference the payment, never exceed what is refundable, carry a reason and an idempotency key, move a fully refunded COMPLETED order to REFUNDED through the order service, and recompute payment_status. voidTransaction (SA-TXN-03) cancels a row recorded by mistake: only a SUCCESS row, only on its own business date, only while that day is open, and never a payment that already has refunds. A void never rewrites an amount — it marks the row VOIDED with a reason and recomputes the order's paid and refunded totals, so the ledger stays reconstructable (INV-04). TC-TXN-003 and TC-TXN-004.
- **Affected files (actual):** lib/services/payments.ts, lib/services/day-close.ts, lib/data/day-close.ts, lib/validation/payments.ts, app/restaurant/billing/actions.ts, tests/integration/money/{refunds,day-close}.test.ts

### S1-P18-T003 — Business day close

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 149 | P18 Transactions | Backend Engineer | High | 2d | — | — | 2026-09-23 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P18-T002
- **Requirements:** REQ-TXN-005
- **Baseline:** [fact] No reconciliation.
- **Objective:** Daily cash reconciliation that locks the day.
- **Technical work:**
  - LD-TXN-02 preview (expected cash, card, UPI, refunds, order counts, open orders); `closeBusinessDay` (SA-TXN-04) with variance and required notes; closed-day guard used by order creation, payments and voids.
- **Files/modules:** `lib/services/day-close.ts`, `lib/data/day-close.ts`
- **Database:** BUSINESS_DAY_CLOSE, TRANSACTION, ORDER, AUDIT_LOG.
- **API:** LD-TXN-02, SA-TXN-04.
- **Frontend:** Consumed by S1-P18-T007.
- **Security:** SC-AUD-01.
- **Tests:**
  - `TC-TXN-006` [integration] Expected totals equal Σ ledger by method for the business date across timezone boundaries; variance ≠ 0 requires notes.
  - `TC-TXN-007` [integration] After close, new orders, payments and voids for that business date return DAY_CLOSED; closing twice returns ALREADY_CLOSED.
- **Acceptance criteria:**
  - Close computed and stored in one transaction.
- **Implementation notes:** LD-TXN-02 previews the day from the ledger — cash expected in the drawer (payments minus cash refunds), card and UPI totals, refunds, order count and how many orders are still open — and SA-TXN-04 closes it in one transaction with the counted cash, the variance and an explanation that is required whenever the variance is not zero. Closing twice is ALREADY_CLOSED. A closed day is final: new orders, payments, refunds and voids for that business date are all refused with DAY_CLOSED, and that guard runs before any amount rule. TC-TXN-006 and TC-TXN-007 in tests/integration/money/day-close.test.ts.
- **Affected files (actual):** lib/data/day-close.ts, lib/services/day-close.ts, lib/services/payments.ts, lib/data/orders.ts, app/restaurant/billing/actions.ts, tests/integration/money/day-close.test.ts

### S1-P18-T004 — Transactions list loader

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 150 | P18 Transactions | Backend Engineer | High | 1d | — | — | 2026-09-22 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P18-T002
- **Requirements:** REQ-TXN-006
- **Baseline:** [fact] `app/restaurant/transactions/page.tsx` lists orders with float totals (BA-24).
- **Objective:** Ledger listing with Decimal summaries.
- **Technical work:**
  - LD-TXN-01 with business-date range (≤ 92 days), type/method/status/search filters, cursor, SQL `SUM(numeric)` totals by method.
- **Files/modules:** `lib/data/transactions.ts`
- **Database:** TRANSACTION, ORDER, USER.
- **API:** LD-TXN-01.
- **Frontend:** Consumed by S1-P18-T005.
- **Security:** SC-TEN-08.
- **Tests:**
  - `TC-TXN-001` [integration] Filters return correct rows; totals by method are exact decimal strings; range > 92 days rejected.
- **Acceptance criteria:**
  - No `Number()` on money in loader or DTOs.
- **Implementation notes:** LD-TXN-01 lists the tenant's ledger with filters for business-date range, type, method, status and a search over reference, order number and customer name, a keyset cursor, and totals summed in NUMERIC and returned as exact decimal strings per method (no Number() anywhere on money). The window is capped at 92 days and a reversed range is refused. TC-TXN-001 in tests/integration/money/transactions-list.test.ts.
- **Affected files (actual):** lib/data/transactions.ts, lib/validation/payments.ts, tests/integration/money/transactions-list.test.ts

### S1-P18-T005 — Transactions UI

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 151 | P18 Transactions | Frontend Engineer | High | 3d | — | — | 2026-09-23 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P18-T004, S1-P08-T007, S1-P08-T008
- **Requirements:** REQ-TXN-006, REQ-TXN-004
- **Baseline:** [fact] Baseline transactions and billing pages.
- **Objective:** Clear ledger view with corrections.
- **Technical work:**
  - `/restaurant/transactions`: FilterBar, summary strip, DataTable (right-aligned money, voided strikethrough + badge), void dialog with reason, link to day close; delete baseline `app/restaurant/billing/*`.
- **Files/modules:** `app/restaurant/(console)/transactions/page.tsx`, `components/domain/transactions/*`
- **Database:** None.
- **API:** LD-TXN-01, SA-TXN-03.
- **Frontend:** `/restaurant/transactions`.
- **Security:** SC-RBAC-08.
- **Tests:**
  - `TC-TXN-009` [e2e] Manager filters by UPI for a date range and voids a same-day entry with reason; cashier sees no Void action.
- **Acceptance criteria:**
  - Amounts formatted with restaurant currency.
- **Implementation notes:** app/restaurant/transactions/page.tsx rebuilt as a Server Component on LD-TXN-01, with the void dialog in components/transactions/void-transaction.tsx (SA-TXN-03). Filters (search, date range, method, type, status) live in the URL, and a value the loader does not know is ignored rather than answered with a 422. The totals strip is the loader's own SUM over the same filters — the page never adds up the rows it happens to be showing, so a second page cannot make the totals disagree. A voided row stays visible, struck through and badged, because the ledger is append-only (INV-04) and a correction that hid itself would be worse than the mistake. Amounts use the restaurant's own currency. TC-TXN-009 renders the page as MANAGER and as CASHIER and asserts the void control is offered to one and not the other, and that the server refuses the cashier anyway.

Two things this task had to fix first: (1) LD-TXN-01 did not return `voidReason`, so the list could show that an entry was voided but never why — and a reason is exactly what SA-TXN-03 demands before allowing it; the DTO now carries it and the list prefers it over the payment reference. (2) app/restaurant/billing/actions.ts moved to app/restaurant/transactions/actions.ts with its nine importers re-pointed, so the money actions live under the route that uses them. The baseline app/restaurant/billing/page.tsx stays until its payment panel moves into the order detail (S1-P18-T006), and the route itself is deleted with the other duplicate routes in S1-P19-T006.
- **Affected files (actual):** app/restaurant/transactions/page.tsx, app/restaurant/transactions/actions.ts, components/transactions/void-transaction.tsx, lib/data/transactions.ts, tests/integration/money/transactions-ui.test.ts

### S1-P18-T006 — Payment panel in order detail

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 152 | P18 Transactions | Frontend Engineer | Critical | 3d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P18-T002, S1-P12-T009
- **Requirements:** REQ-TXN-001, REQ-TXN-002, REQ-TXN-003
- **Baseline:** [fact] `app/restaurant/billing/page.tsx` payment modal.
- **Objective:** Record payments and refunds where the order is handled.
- **Technical work:**
  - `PaymentPanel` with balance, ledger rows, RecordPaymentDialog (method segmented control, amount prefilled with balance, tendered and live change for cash, reference for UPI/card), RefundDialog, completion prompt when PAID.
- **Files/modules:** `components/domain/transactions/payment-panel.tsx`, dialogs
- **Database:** None.
- **API:** SA-TXN-01, SA-TXN-02, SA-ORD-02.
- **Frontend:** `/restaurant/orders/[orderId]`.
- **Security:** SC-API-02.
- **Tests:**
  - `TC-TXN-010` [e2e] Cashier records cash payment with tendered amount, sees change due, completes the order; manager issues a partial refund.
- **Acceptance criteria:**
  - Double-submitting a payment creates one transaction.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P18-T007 — Day close UI

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 153 | P18 Transactions | Frontend Engineer | High | 2d | — | — | 2026-09-23 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P18-T003, S1-P08-T005
- **Requirements:** REQ-TXN-005
- **Baseline:** None.
- **Objective:** Managers close the day confidently.
- **Technical work:**
  - `/restaurant/transactions/day-close`: date selector, expected totals, counted cash with live variance, open orders warning, notes, confirm dialog restating totals, closed read-only summary.
- **Files/modules:** `app/restaurant/(console)/transactions/day-close/page.tsx`
- **Database:** None.
- **API:** LD-TXN-02, SA-TXN-04.
- **Frontend:** `/restaurant/transactions/day-close`.
- **Security:** None.
- **Tests:**
  - `TC-TXN-011` [e2e] Manager closes the day with a variance note; a subsequent cash payment for that day is blocked with a clear message.
- **Acceptance criteria:**
  - Variance announced to screen readers.
- **Implementation notes:** app/restaurant/transactions/day-close/page.tsx and components/transactions/day-close-form.tsx on LD-TXN-02 and SA-TXN-04. The business date is the restaurant's, never the viewer's or the server's, and a day that is already closed renders as a read-only record instead of a form — closing it twice is not something the server will do, so offering the button would be a lie. Open orders are called out before the count, because closing the day stops any payment being recorded against it. The difference between the drawer and the ledger is worked out as the person types and announced in a live region, a difference of any size requires a note (the server enforces it too), and the confirmation dialog restates the figures being committed to.

The variance is computed in whole paisa with BigInt, not floating point: lib/money runs on the server, and a float would turn a 10.15 difference into 10.149999999999999 on the one screen where a cash difference is the entire point (ADR-010 §1). It lives as `moneyDifference` in lib/ui/decimal-input.ts beside the other browser-side decimal helpers, with its own unit cases. TC-TXN-011 closes the day with a variance note and then shows a cash payment for that day refused with DAY_CLOSED and the ledger unmoved.
- **Affected files (actual):** app/restaurant/transactions/day-close/page.tsx, components/transactions/day-close-form.tsx, lib/ui/decimal-input.ts, tests/unit/form-system.test.tsx, tests/integration/money/transactions-ui.test.ts

### S1-P18-T008 — Receipt view and printing

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 154 | P18 Transactions | Frontend Engineer | High | 2d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P18-T001, S1-P16-T003
- **Requirements:** REQ-TXN-007, REQ-PRINT-012, REQ-TXN-011
- **Baseline:** [fact] `app/restaurant/billing/receipt/[orderId]/*` browser print only.
- **Objective:** Tenant-scoped receipt for browser print and thermal printer.
- **Technical work:**
  - LD-RCPT-01 loader; `/restaurant/orders/[orderId]/receipt` ReceiptView (80 mm layout, tax lines with GSTIN and CGST/SGST split when configured, payments, footer) with print stylesheet; "Send to receipt printer" (SA-PRN-06) showing job status; redirect from baseline route.
- **Files/modules:** `app/restaurant/(console)/orders/[orderId]/receipt/page.tsx`, `components/domain/transactions/receipt-view.tsx`
- **Database:** ORDER, ORDER_ITEM, TRANSACTION, RESTAURANT.
- **API:** LD-RCPT-01, SA-PRN-06.
- **Frontend:** `/restaurant/orders/[orderId]/receipt`.
- **Security:** SC-TEN-04.
- **Tests:**
  - `TC-TXN-008` [integration] Receipt totals reconcile to order and ledger; Tenant B order id returns not-found; KITCHEN is forbidden.
- **Acceptance criteria:**
  - Browser print output fits 80 mm width.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P18-T009 — Transaction isolation and adversarial tests

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 155 | P18 Transactions | QA Engineer | Critical | 1d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P18-T003
- **Requirements:** REQ-TENANT-003, REQ-TXN-002
- **Baseline:** [fact] `tests/unit/payments-billing.test.ts` mocked.
- **Objective:** Money endpoints resist cross-tenant access and manipulation.
- **Technical work:**
  - Implement TI-028…TI-030, TI-035 and ADV-011; register RBAC rows 39–43; remove mocked tests.
- **Files/modules:** `tests/integration/isolation/transactions.test.ts`
- **Database:** Seed.
- **API:** SA-TXN-01…04, LD-TXN-01, LD-TXN-02, LD-RCPT-01.
- **Frontend:** None.
- **Security:** SC-TEN-02, SC-VAL-02.
- **Tests:**
  - `TC-TXN-012` [integration] RBAC matrix rows TC-RBAC-139…TC-RBAC-143 pass; TI-028…TI-030 and TI-035 pass.
- **Acceptance criteria:**
  - No transaction `todo` rows remain in the RBAC driver.
- **Implementation notes:** —
- **Affected files (actual):** —

## P19 — Reports

6 tasks · 15 ideal days of effort · sequence #156–#161 (interleaved with other phases where dependencies allow)

### S1-P19-T001 — Report aggregation data layer

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 156 | P19 Reports | Backend Engineer | Critical | 4d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P18-T003, S1-P02-T011
- **Requirements:** REQ-RPT-001, REQ-RPT-002, REQ-RPT-003, REQ-RPT-004, REQ-RPT-005, REQ-RPT-006, REQ-RPT-007, REQ-RPT-010, REQ-TENANT-009
- **Baseline:** [fact] `lib/services/analytics.ts:22-120` counts NEW/ACCEPTED orders as revenue and uses server-local "today"; reports page uses floats (BA-24).
- **Objective:** Exact, tenant-scoped, timezone-correct reports.
- **Technical work:**
  - `lib/data/reports.ts`: sales summary (BR-RPT-01), orders summary (by status/type, cancel reasons, hourly local distribution via `AT TIME ZONE`, average prep minutes from KOT timestamps), menu performance (by `menu_item_id`, latest snapshot name, quantity, net sales), transaction summary (by method, refunds, voids, day-close variances), daily summary — all with `tenant_id = ctx.tenantId`, `SUM(numeric)`, business-date filters.
  - Loaders LD-RPT-01…05 with range validation (≤ 366 days).
  - Delete baseline `lib/services/analytics.ts` and mocked tests.
- **Files/modules:** `lib/data/reports.ts`, `lib/services/reports.ts`
- **Database:** ORDER, ORDER_ITEM, TRANSACTION, KOT_TICKET, BUSINESS_DAY_CLOSE.
- **API:** LD-RPT-01, LD-RPT-02, LD-RPT-03, LD-RPT-04, LD-RPT-05.
- **Frontend:** Consumed by S1-P19-T003.
- **Security:** SC-TEN-08.
- **Tests:**
  - `TC-RPT-001` [integration] Sales summary for a fixture set equals hand-computed decimal totals exactly; cancelled orders excluded; refunds subtracted.
  - `TC-RPT-002` [integration] Hourly distribution buckets use restaurant-local hours for both seeded timezones.
  - `TC-RPT-003` [integration] Menu performance ranks by quantity and net sales and attributes renamed items to the same menu item.
  - `TC-RPT-004` [integration] Transaction summary nets payments and refunds by method and counts voids separately.
  - `TC-RPT-005` [integration] Daily summary includes day-close status and variance for the date.
  - `TC-RPT-006` [integration] Identical seeded data in Tenant B never changes Tenant A report results.
- **Acceptance criteria:**
  - Each report query uses indexes (EXPLAIN reviewed in S1-P19-T005).
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P19-T002 — Dashboard summary loader and polling route

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 157 | P19 Reports | Backend Engineer | High | 2d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P19-T001, S1-P16-T005, S1-P11-T001
- **Requirements:** REQ-DASH-001, REQ-DASH-002, REQ-DASH-004
- **Baseline:** [fact] Dashboard is static links (`app/restaurant/dashboard/page.tsx`).
- **Objective:** Real operational summary for today.
- **Technical work:**
  - `lib/services/dashboard.ts#getDashboardSummary(ctx, now)` per api.md LD-DASH-01 (sales today, orders by status, active KOTs and oldest queued minutes, menu counts, daily menu status, payments by method, printing health, day closed flag, onboarding checklist booleans); RH-DASH-01 `GET /api/v1/dashboard/summary`.
- **Files/modules:** `lib/services/dashboard.ts`, `app/api/v1/dashboard/summary/route.ts`
- **Database:** ORDER, KOT_TICKET, MENU_ITEM, DAILY_MENU, TRANSACTION, PRINT_AGENT, PRINT_JOB, BUSINESS_DAY_CLOSE, RESTAURANT, PRINTER.
- **API:** LD-DASH-01, RH-DASH-01.
- **Frontend:** Consumed by S1-P19-T004.
- **Security:** SC-TEN-08.
- **Tests:**
  - `TC-DASH-001` [integration] Summary values equal direct queries on seed data for Tenant A.
  - `TC-DASH-002` [integration] At 23:30 and 00:30 restaurant time, "today" figures switch business date correctly while UTC date differs.
- **Acceptance criteria:**
  - Summary computed in ≤ 6 queries, p95 < 300 ms.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P19-T003 — Reports UI

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 158 | P19 Reports | Frontend Engineer | High | 4d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P19-T001, S1-P08-T007, S1-P08-T008
- **Requirements:** REQ-RPT-001, REQ-RPT-002, REQ-RPT-003, REQ-RPT-004, REQ-RPT-005, REQ-RPT-006, REQ-RPT-008
- **Baseline:** [fact] `app/restaurant/reports/page.tsx` and `app/restaurant/analytics/page.tsx` duplicate reporting.
- **Objective:** Useful reports without decorative charts.
- **Technical work:**
  - `/restaurant/reports` date range picker with presets in restaurant timezone; tabs Sales, Orders, Menu performance, Transactions, Daily summary; KPI rows; accessible HTML bar rows each with text values; data tables equivalent to visuals.
- **Files/modules:** `app/restaurant/(console)/reports/page.tsx`, `components/domain/reports/*`
- **Database:** None.
- **API:** LD-RPT-01, LD-RPT-02, LD-RPT-03, LD-RPT-04, LD-RPT-05.
- **Frontend:** `/restaurant/reports`.
- **Security:** SC-RBAC-08.
- **Tests:**
  - `TC-RPT-007` [e2e] Selecting "Last 7 days" updates all tabs; every bar row has matching table values; empty period shows designed empty state.
- **Acceptance criteria:**
  - Screen-reader users can obtain every figure from tables.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P19-T004 — Dashboard UI

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 159 | P19 Reports | Frontend Engineer | High | 3d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P19-T002, S1-P08-T008
- **Requirements:** REQ-DASH-001, REQ-DASH-003, REQ-DASH-004, REQ-DASH-005
- **Baseline:** [fact] Static cards and removed fake indicators.
- **Objective:** A professional operational dashboard.
- **Technical work:**
  - `/restaurant/dashboard` 12-column layout per frontend.md: KPI cards with IconTiles, orders status strip linking to board, kitchen widget, menu and daily menu status with actions, payments today, printing health, quick actions, onboarding checklist for new tenants; `usePolling` 30 s.
- **Files/modules:** `app/restaurant/(console)/dashboard/page.tsx`, `components/domain/dashboard/*`
- **Database:** None.
- **API:** LD-DASH-01, RH-DASH-01.
- **Frontend:** `/restaurant/dashboard`.
- **Security:** None.
- **Tests:**
  - `TC-DASH-003` [e2e] A freshly created tenant sees the onboarding checklist; completing profile and publishing the website ticks items.
  - `TC-DASH-004` [e2e] Seeded tenant dashboard shows correct KPI values and each widget links to its screen.
- **Acceptance criteria:**
  - No widget without real data or an actionable empty state.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P19-T005 — Report performance and indexes

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 160 | P19 Reports | Database Engineer | Medium | 1d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P19-T001
- **Requirements:** REQ-NFR-001, REQ-NFR-002
- **Baseline:** None.
- **Objective:** Reports stay fast at target scale.
- **Technical work:**
  - Generate 10,000 orders over 12 months for one tenant in a perf database; EXPLAIN ANALYZE each report; add indexes via new migration if needed.
- **Files/modules:** `prisma/migrations/*`, `tests/perf/report-data.ts`
- **Database:** Indexes on ORDER, ORDER_ITEM, TRANSACTION.
- **API:** LD-RPT-01…05.
- **Frontend:** None.
- **Security:** None.
- **Tests:**
  - `TC-RPT-008` [perf] Each report over 366 days with 10,000 orders completes in < 1 s p95.
- **Acceptance criteria:**
  - Query plans recorded in `database/database.md`.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P19-T006 — Remove duplicate baseline reporting routes

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 161 | P19 Reports | Frontend Engineer | Low | 1d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P19-T003, S1-P18-T005, S1-P15-T002
- **Requirements:** REQ-PLAT-005
- **Baseline:** [fact] `/restaurant/analytics`, `/restaurant/billing`, `/restaurant/kds` duplicate newer routes (BA-34).
- **Objective:** One route per capability.
- **Technical work:**
  - Delete `app/restaurant/analytics`, `app/restaurant/billing`, `app/restaurant/kds`; permanent redirects configured in `next.config.ts`; remove sidebar references.
- **Files/modules:** `app/restaurant/analytics/*`, `app/restaurant/billing/*`, `app/restaurant/kds/*`, `next.config.ts`
- **Database:** None.
- **API:** Removes baseline read actions.
- **Frontend:** Redirects.
- **Security:** None.
- **Tests:**
  - `TC-RPT-009` [e2e] `/restaurant/analytics`, `/restaurant/billing` and `/restaurant/kds` redirect (308) to reports, transactions and kitchen.
- **Acceptance criteria:**
  - No imports of deleted modules remain.
- **Implementation notes:** —
- **Affected files (actual):** —

## P20 — Social Menu + Sharing

4 tasks · 9 ideal days of effort · sequence #162–#165 (interleaved with other phases where dependencies allow)

### S1-P20-T001 — Menu card image generation

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 162 | P20 Social Menu + Sharing | Backend Engineer | High | 3d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P09-T006
- **Requirements:** REQ-SOC-001, REQ-SOC-002
- **Baseline:** [fact] No card generation; social post stores a manual image URL.
- **Objective:** Shareable menu card images from public data.
- **Technical work:**
  - `app/r/[slug]/cards/[card]/route.tsx` (RH-PUB-02) using `ImageResponse` 1080×1350: daily-menu (today's published items), full-menu (top categories/items with "and more"), item-{id} (image or icon fallback, price/"from", dietary mark); brand accent; bundled fonts; allowlisted image fetch; caching `s-maxage=300`.
- **Files/modules:** `app/r/[slug]/cards/[card]/route.tsx`, `lib/social/cards/*`
- **Database:** Reads via `lib/data/public.ts`.
- **API:** RH-PUB-02.
- **Frontend:** Card previews.
- **Security:** SC-PUB-01, SC-VAL-04.
- **Tests:**
  - `TC-SOC-003` [integration] Each card type returns a PNG of the expected size for a published tenant; unpublished item or website returns 404.
  - `TC-SOC-004` [integration] Card generation reads only the public projection (spy on data layer) and output text contains no private marker strings.
- **Acceptance criteria:**
  - Card renders in < 1.5 s p95.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P20-T002 — Social post services

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 163 | P20 Social Menu + Sharing | Backend Engineer | High | 2d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P20-T001, S1-P04-T010
- **Requirements:** REQ-SOC-002, REQ-SOC-003, REQ-SOC-004, REQ-SOC-005, REQ-SOC-006, REQ-SOC-007
- **Baseline:** [fact] `lib/services/social.ts` allows setting PUBLISHED directly (BA-29).
- **Objective:** Honest social content workflow.
- **Technical work:**
  - `lib/services/social.ts`: create (source ownership and published checks; server-built `share_url`), update (DRAFT/READY), mark ready, mark posted (optional https `posted_url`, attester), archive; audits; LD-SOC-01; SA-SOC-01…05; remove PUBLISHED/SCHEDULED statuses from code.
- **Files/modules:** `lib/services/social.ts`, `lib/data/social.ts`, `app/restaurant/(console)/social/actions.ts`
- **Database:** SOCIAL_POST, AUDIT_LOG.
- **API:** LD-SOC-01, SA-SOC-01, SA-SOC-02, SA-SOC-03, SA-SOC-04, SA-SOC-05.
- **Frontend:** Consumed by S1-P20-T003.
- **Security:** SC-VAL-04, SC-AUD-01.
- **Tests:**
  - `TC-SOC-001` [integration] Create/update/archive validate sources and build share URLs server-side; client-supplied `shareUrl` is rejected.
  - `TC-SOC-002` [integration] Status machine DRAFT→READY→MARKED_POSTED enforced; mark posted records attester and audit.
- **Acceptance criteria:**
  - No status named PUBLISHED exists in code or schema.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P20-T003 — Social UI

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 164 | P20 Social Menu + Sharing | Frontend Engineer | Medium | 3d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P20-T002, S1-P08-T006, S1-P08-T008
- **Requirements:** REQ-SOC-001, REQ-SOC-003, REQ-SOC-004, REQ-SOC-005
- **Baseline:** [fact] `app/restaurant/social/page.tsx` with emoji placeholder copy and manual image URL.
- **Objective:** Prepare and share menu content quickly and truthfully.
- **Technical work:**
  - `/restaurant/social`: card type selector with live CardPreview, CaptionEditor with counter, Copy caption, Copy link, Download image (from public card URL), Mark ready, Mark as posted dialog, SocialPostCard list with status badges and attester text; website-unpublished blocking state.
- **Files/modules:** `app/restaurant/(console)/social/page.tsx`, `components/domain/social/*`
- **Database:** None.
- **API:** LD-SOC-01, SA-SOC-01, SA-SOC-02, SA-SOC-03, SA-SOC-04, SA-SOC-05, RH-PUB-02.
- **Frontend:** `/restaurant/social`.
- **Security:** SC-RBAC-08.
- **Tests:**
  - `TC-SOC-005` [e2e] Creating and marking a post as posted shows "Marked as posted by {name}"; the text "Published successfully" never appears anywhere in the flow.
- **Acceptance criteria:**
  - Copy actions announce success via toast.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P20-T004 — Social isolation tests

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 165 | P20 Social Menu + Sharing | QA Engineer | High | 1d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P20-T002
- **Requirements:** REQ-TENANT-003, REQ-SOC-007
- **Baseline:** [fact] `tests/unit/social-analytics.test.ts` mocked.
- **Objective:** Social data and cards respect tenants.
- **Technical work:**
  - Implement TI-053, TI-054; register RBAC row 49; remove mocked tests.
- **Files/modules:** `tests/integration/isolation/social.test.ts`
- **Database:** Seed.
- **API:** LD-SOC-01, SA-SOC-01…05, RH-PUB-02.
- **Frontend:** None.
- **Security:** SC-TEN-02.
- **Tests:**
  - `TC-SOC-006` [integration] RBAC row TC-RBAC-149 passes; Tenant A cannot create a post from a Tenant B daily menu or item id (not-found).
- **Acceptance criteria:**
  - TI-053 and TI-054 pass.
- **Implementation notes:** —
- **Affected files (actual):** —

## P21 — PWA

4 tasks · 5 ideal days of effort · sequence #166–#169 (interleaved with other phases where dependencies allow)

### S1-P21-T001 — Web app manifest and icons

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 166 | P21 PWA | Frontend Engineer | High | 1d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P08-T003
- **Requirements:** REQ-PWA-001
- **Baseline:** [fact] `public/manifest.json` references missing `icon-192.png`, `icon-512.png` (BA-36).
- **Objective:** Valid manifest and complete icon set.
- **Technical work:**
  - `app/manifest.ts` (name, short_name, `start_url: /restaurant`, `scope: /`, display standalone, theme `#D97706`, background `#1A1715`); icons 192, 512, maskable 512, apple-touch 180 generated from the brand mark; remove `public/manifest.json`.
- **Files/modules:** `app/manifest.ts`, `public/icons/*`, `app/layout.tsx`
- **Database:** None.
- **API:** None.
- **Frontend:** Manifest link.
- **Security:** None.
- **Tests:**
  - `TC-PWA-001` [integration] `/manifest.webmanifest` is valid JSON with required fields and every icon URL returns 200 with correct dimensions.
- **Acceptance criteria:**
  - Maskable icon passes safe-zone check.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P21-T002 — Service worker rewrite

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 167 | P21 PWA | Frontend Engineer | High | 2d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P21-T001
- **Requirements:** REQ-PWA-003, REQ-PWA-004, REQ-PWA-005
- **Baseline:** [fact] `public/sw.js` pre-caches `/globals.css` and falls back to cached `/` for any GET (BA-37).
- **Objective:** Safe caching with honest offline behaviour.
- **Technical work:**
  - Versioned `public/sw.js`: precache `/offline`, icons and hashed static assets list injected at build; navigations network-only with `/offline` fallback; `/_next/static/*` cache-first; never cache `/api/*`, `/restaurant/*`, `/admin/*`, `/account/*` responses; delete old caches on activate; `/offline` page.
- **Files/modules:** `public/sw.js`, `scripts/build-sw-manifest.ts`, `app/offline/page.tsx`, `components/pwa-register.tsx`
- **Database:** None.
- **API:** None.
- **Frontend:** `/offline`.
- **Security:** SC-TEN-09.
- **Tests:**
  - `TC-PWA-004` [e2e] With the network offline, navigating shows `/offline` with the documented message; no order screens render from cache.
  - `TC-PWA-005` [e2e] After browsing console pages and APIs, Cache Storage contains no HTML or JSON from authenticated routes.
- **Acceptance criteria:**
  - Service worker installs successfully in Chromium and Safari.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P21-T003 — Service worker update strategy

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 168 | P21 PWA | Frontend Engineer | Medium | 1d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P21-T002
- **Requirements:** REQ-PWA-003
- **Baseline:** [fact] `skipWaiting()` on install without user prompt.
- **Objective:** Users get updates without broken sessions.
- **Technical work:**
  - Detect waiting worker → toast "Update available — Reload"; on confirm post `SKIP_WAITING`, reload on `controllerchange`; kitchen screens auto-reload when idle for 60 s.
- **Files/modules:** `components/pwa-register.tsx`, `public/sw.js`
- **Database:** None.
- **API:** None.
- **Frontend:** Update toast.
- **Security:** None.
- **Tests:**
  - `TC-PWA-003` [e2e] Deploying a new service worker version shows the update prompt; accepting reloads onto the new version.
- **Acceptance criteria:**
  - No automatic reload during an in-progress form submission.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P21-T004 — Installability verification

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 169 | P21 PWA | QA Engineer | Medium | 1d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P21-T003
- **Requirements:** REQ-PWA-002
- **Baseline:** None.
- **Objective:** Prove installability and document staff device setup.
- **Technical work:**
  - Lighthouse CI PWA installability check on staging; manual install on Android tablet (Chrome) and iPad (Safari Add to Home Screen); staff device guide in `operations/devices.md`.
- **Files/modules:** `.github/workflows/ci.yml`, `knowledge/operations/devices.md`
- **Database:** None.
- **API:** None.
- **Frontend:** None.
- **Security:** None.
- **Tests:**
  - `TC-PWA-002` [ci] Lighthouse reports the app installable on staging.
- **Acceptance criteria:**
  - Manual installs recorded with device models.
- **Implementation notes:** —
- **Affected files (actual):** —

## P22 — Timezone + Live Clock

4 tasks · 6 ideal days of effort · sequence #170–#175 (interleaved with other phases where dependencies allow)

### S1-P22-T001 — Restaurant live clock

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 170 | P22 Timezone + Live Clock | Frontend Engineer | High | 1d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P08-T008
- **Requirements:** REQ-TZ-003
- **Baseline:** [fact] `components/layout/PortalNavbar.tsx:17-31` shows browser-local time (BA-32).
- **Objective:** Clock always shows restaurant-local time.
- **Technical work:**
  - `LiveClock` using restaurant timezone from session context and server time offset (`serverTime` from polling responses/layout); zone abbreviation; used in console header and kitchen top bar; `suppressHydrationWarning` avoided by rendering after mount with skeleton.
- **Files/modules:** `components/layout/live-clock.tsx`
- **Database:** None.
- **API:** LD-AUTH-01.
- **Frontend:** Header, kitchen.
- **Security:** None.
- **Tests:**
  - `TC-TZ-005` [e2e] With the browser timezone set to UTC, Tenant A (Asia/Kolkata) clock shows IST time and Tenant B shows New York time.
- **Acceptance criteria:**
  - Clock drift < 2 s versus server time over 10 minutes.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P22-T002 — Timezone display sweep

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 174 | P22 Timezone + Live Clock | Frontend Engineer | High | 2d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P19-T003, S1-P18-T005, S1-P23-T002
- **Requirements:** REQ-TZ-004, REQ-TZ-005
- **Baseline:** [fact] `toLocaleString()` without timezone in `app/restaurant/transactions/page.tsx:127` and `components/admin/TenantList.tsx:55`.
- **Objective:** Every displayed time uses the restaurant timezone.
- **Technical work:**
  - Replace all date/time rendering with `formatInZone`; static test banning `toLocaleString`, `toLocaleDateString`, `toLocaleTimeString` without `timeZone` and hard-coded zone strings outside `lib/time` and seeds.
- **Files/modules:** `app/**`, `components/**`, `tests/static/timezone.test.ts`
- **Database:** None.
- **API:** None.
- **Frontend:** Orders, kitchen, transactions, customers, audit, reports, printing.
- **Security:** None.
- **Tests:**
  - `TC-TZ-006` [e2e] Order detail, transactions list and audit log show the same instant in restaurant-local time with zone label for both tenants.
  - `TC-TZ-007` [static] No `toLocale*String(` call lacks a `timeZone` option and no IANA zone literal appears outside allowed paths.
- **Acceptance criteria:**
  - Static check green.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P22-T003 — Timezone change safety

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 171 | P22 Timezone + Live Clock | Backend Engineer | Medium | 1d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P07-T001
- **Requirements:** REQ-TZ-001, REQ-TZ-004
- **Baseline:** None.
- **Objective:** Changing a restaurant's timezone never rewrites history.
- **Technical work:**
  - Confirmation requirement when orders exist (warning that business dates of new records use the new zone; existing `business_date` values unchanged); audit before/after; day-close records untouched.
- **Files/modules:** `lib/services/restaurant.ts`, settings UI confirmation
- **Database:** RESTAURANT, AUDIT_LOG.
- **API:** SA-RST-04.
- **Frontend:** Settings Operations tab.
- **Security:** SC-AUD-01.
- **Tests:**
  - `TC-TZ-008` [integration] Changing timezone leaves existing orders' and transactions' `business_date` unchanged and applies the new zone to new orders.
- **Acceptance criteria:**
  - Warning shown and confirmed before save when orders exist.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P22-T004 — Cross-timezone verification suite

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 175 | P22 Timezone + Live Clock | QA Engineer | High | 2d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P22-T002, S1-P19-T001
- **Requirements:** REQ-TZ-004, REQ-TZ-006, REQ-DMENU-005
- **Baseline:** None.
- **Objective:** End-to-end proof that timezones behave correctly around midnight and DST.
- **Technical work:**
  - Clock-injected integration scenarios: same UTC instant for Tenant A (Asia/Kolkata) and Tenant B (America/New_York) around both local midnights and a New York DST transition — orders' business dates, order numbers, daily menu visibility, dashboard today, report ranges, day close.
- **Files/modules:** `tests/integration/timezone/*`
- **Database:** Seed.
- **API:** SA-ORD-01, LD-PUB-02, LD-DASH-01, LD-RPT-01, SA-TXN-04.
- **Frontend:** None.
- **Security:** None.
- **Tests:**
  - `TC-TZ-009` [integration] At one UTC instant the two tenants have different business dates and every dependent feature uses its own tenant's date.
- **Acceptance criteria:**
  - Suite passes with process TZ UTC, Asia/Kolkata and America/Los_Angeles.
- **Implementation notes:** —
- **Affected files (actual):** —

## P23 — Audit Logging

4 tasks · 8 ideal days of effort · sequence #172–#177 (interleaved with other phases where dependencies allow)

### S1-P23-T001 — Audit coverage verification

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 172 | P23 Audit Logging | Security Engineer | Critical | 3d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P20-T002, S1-P18-T003, S1-P16-T005, S1-P07-T004, S1-P06-T001
- **Requirements:** REQ-AUDIT-001, REQ-AUDIT-002, REQ-ADMIN-010, REQ-MENU-011, REQ-DMENU-008, REQ-KOT-008, REQ-TXN-008, REQ-SOC-007
- **Baseline:** [fact] Only menu, daily menu and settings actions audit (BA-23).
- **Objective:** Every catalogued action provably writes a complete audit record.
- **Technical work:**
  - Coverage test that executes each mutating endpoint with a representative valid input and asserts the expected `AUDIT_ACTIONS` entry with actor type/role, tenant, resource, before/after presence and request id; fails if any catalogue action lacks a covering test.
- **Files/modules:** `tests/integration/audit/coverage.test.ts`
- **Database:** AUDIT_LOG.
- **API:** All SA-*, RH-AGT-01, RH-AGT-04, RH-AUTH-01.
- **Frontend:** None.
- **Security:** SC-AUD-01.
- **Tests:**
  - `TC-AUDIT-001` [integration] Every action in security.md §7 is produced by at least one endpoint with all required fields populated.
- **Acceptance criteria:**
  - Coverage report lists 100% of catalogue actions.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P23-T002 — Tenant audit log viewer

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 173 | P23 Audit Logging | Frontend Engineer | High | 3d | — | — | 2026-09-23 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P23-T001, S1-P08-T007, S1-P08-T008
- **Requirements:** REQ-AUDIT-006
- **Baseline:** [fact] No audit UI.
- **Objective:** Restaurant owners review who changed what.
- **Technical work:**
  - `lib/data/audit.ts#listTenantAudit` (filters, cursor, IP truncated to /24, actor names); `/restaurant/audit` with FilterBar and AuditTable with expandable redacted `DiffView` (text markers for added/removed).
- **Files/modules:** `lib/data/audit.ts`, `app/restaurant/(console)/audit/page.tsx`, `components/domain/audit/*`
- **Database:** AUDIT_LOG, USER.
- **API:** LD-AUD-01.
- **Frontend:** `/restaurant/audit`.
- **Security:** SC-AUD-05.
- **Tests:**
  - `TC-AUDIT-005` [integration] TENANT_ADMIN sees only own-tenant rows; MANAGER receives FORBIDDEN; platform rows never included.
  - `TC-AUDIT-006` [e2e] Filtering by action and date range shows matching entries; expanding a price change shows redacted before/after.
- **Acceptance criteria:**
  - Timestamps in restaurant timezone.
- **Implementation notes:** lib/data/audit.ts lists the caller's own tenant's trail with filters for action, resource type, actor and date range, a keyset cursor, and actor names resolved; platform rows carry a null tenant and can never appear. Addresses are shown only as a network prefix (a /24, or /48 for IPv6) — enough to spot an unfamiliar network without keeping a precise location in front of staff (SC-AUD-05). /restaurant/audit renders the trail in the restaurant's timezone, each row expanding through a native details element to a diff of just the fields that changed, labelled Added, Removed or Changed in words as well as colour. before/after are already redacted when the row is written. Tests: tests/integration/audit/audit-viewer.test.ts (TC-AUDIT-005, TI-050) — TENANT_ADMIN only; MANAGER and below are redirected.
- **Affected files (actual):** lib/data/audit.ts, app/restaurant/audit/page.tsx, components/audit/audit-entry.tsx, lib/ui/navigation.ts, tests/integration/audit/audit-viewer.test.ts

### S1-P23-T003 — Request metadata capture

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 176 | P23 Audit Logging | Backend Engineer | Medium | 1d | — | — | 2026-09-23 | 2026-09-23 | COMPLETED |

- **Dependencies:** S1-P04-T010
- **Requirements:** REQ-AUDIT-001
- **Baseline:** [fact] `ipAddress`, `userAgent` columns unused.
- **Objective:** Trustworthy request metadata in audit rows.
- **Technical work:**
  - `lib/http/request-meta.ts`: request id from header, client IP from `X-Forwarded-For` only when `TRUSTED_PROXY_HOPS` configured (Railway), UA truncated to 256.
- **Files/modules:** `lib/http/request-meta.ts`, `lib/audit/write.ts`
- **Database:** AUDIT_LOG.
- **API:** All mutations.
- **Frontend:** None.
- **Security:** SC-LOG-01.
- **Tests:**
  - `TC-AUDIT-007` [integration] Spoofed `X-Forwarded-For` values beyond the trusted hop count are ignored; request id matches the response header.
- **Acceptance criteria:**
  - Trusted proxy configuration documented for Railway.
- **Implementation notes:** lib/http/request-meta.ts reads the request id, the client address and the user agent for every audited write, and lib/audit/write.ts stores them on the row. X-Forwarded-For is client-writable, so it is believed only as far as TRUSTED_PROXY_HOPS proves it: the address is the entry that many hops from the right, anything the caller prepended is discarded, and with the variable unset (the local default) no address is recorded at all. Values that are not addresses are ignored and the user agent is truncated to 256 characters. The audit viewer then shows only a /24 (or /48) prefix. Tests: tests/unit/request-meta.test.ts (4 cases) and the end-to-end case in tests/integration/audit/audit-viewer.test.ts — a spoofed chain is stored as null with no trusted hop and as the proxy-observed address with one. Railway is documented as one hop in knowledge/operations/railway.md and deployment.md, still to be confirmed against the live environment in S1-P27-T001.
- **Affected files (actual):** lib/http/request-meta.ts, lib/audit/write.ts, tests/unit/request-meta.test.ts, tests/integration/audit/audit-viewer.test.ts

### S1-P23-T004 — Audit volume and retention review

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 177 | P23 Audit Logging | Database Engineer | Low | 1d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P23-T001
- **Requirements:** REQ-AUDIT-003, REQ-NFR-001
- **Baseline:** None.
- **Objective:** Audit remains performant and retention is decided.
- **Technical work:**
  - Load 1,000,000 audit rows; verify index usage for tenant list queries; bring retention recommendation to Q-024.
- **Files/modules:** `tests/perf/audit-volume.ts`, `knowledge/implementation/slice-01/open-questions.md`
- **Database:** AUDIT_LOG indexes.
- **API:** LD-AUD-01.
- **Frontend:** None.
- **Security:** None.
- **Tests:**
  - `TC-AUDIT-008` [perf] Tenant audit list with filters over 1M rows returns in < 500 ms p95.
- **Acceptance criteria:**
  - Q-024 updated with measured growth estimate.
- **Implementation notes:** —
- **Affected files (actual):** —

## P24 — Security Hardening

9 tasks · 14 ideal days of effort · sequence #178–#186 (interleaved with other phases where dependencies allow)

### S1-P24-T001 — Security headers and Content-Security-Policy

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 178 | P24 Security Hardening | Security Engineer | Critical | 2d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P08-T002
- **Requirements:** REQ-SEC-005
- **Baseline:** [fact] No security headers configured in `next.config.ts`.
- **Objective:** Browser-enforced defence in depth.
- **Technical work:**
  - Headers: HSTS (max-age 1 year, includeSubDomains after domain confirmation), `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` (camera, microphone, geolocation off), `X-Frame-Options: DENY`.
  - CSP with nonce via middleware: `script-src 'self' 'nonce-…'` + Clerk documented domains; `img-src 'self' data:` + allowlisted image hosts; `connect-src 'self'` + Clerk; `frame-src` Clerk; `object-src 'none'`; `base-uri 'self'`; start report-only on staging, enforce before production.
- **Files/modules:** `next.config.ts`, `middleware.ts`, `lib/security/csp.ts`
- **Database:** None.
- **API:** All responses.
- **Frontend:** Nonce propagation to scripts.
- **Security:** SC-HDR-01, SC-HDR-02.
- **Tests:**
  - `TC-SEC-014` [integration] All listed headers present on page, API and public responses.
  - `TC-SEC-015` [e2e] Sign-in, console, kitchen and public pages load with CSP enforced and zero violation reports.
- **Acceptance criteria:**
  - securityheaders-style scan grade A on staging (recorded).
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P24-T002 — CSRF and CORS verification

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 179 | P24 Security Hardening | Security Engineer | High | 1d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P04-T002
- **Requirements:** REQ-SEC-001
- **Baseline:** [assumption] Next.js Server Actions compare Origin and Host headers (ADR-011 §4).
- **Objective:** Confirm cross-site request protections on the installed framework.
- **Technical work:**
  - Integration test posting a Server Action with foreign `Origin`; `lib/security/origin.ts#assertSameOrigin` for any non-GET cookie route handler; verify no `Access-Control-Allow-Origin` on app APIs.
- **Files/modules:** `lib/security/origin.ts`, `tests/integration/security/csrf.test.ts`
- **Database:** None.
- **API:** All SA-*, RH-MEDIA-01.
- **Frontend:** None.
- **Security:** SC-CSRF-01, SC-CSRF-02, SC-CSRF-03.
- **Tests:**
  - `TC-SEC-010` [integration] Server Action request with `Origin: https://evil.test` is rejected by the installed Next.js version.
  - `TC-SEC-011` [integration] `assertSameOrigin` rejects missing or foreign Origin on non-GET cookie route handlers.
  - `TC-SEC-012` [integration] No app API response includes permissive CORS headers; preflight from foreign origin is not allowed.
- **Acceptance criteria:**
  - If TC-SEC-010 fails, an explicit origin check is added to the action wrapper before closing the task.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P24-T003 — Rate limit application and tuning

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 180 | P24 Security Hardening | Security Engineer | High | 1d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P03-T007, S1-P16-T005
- **Requirements:** REQ-SEC-004
- **Baseline:** None.
- **Objective:** Every abuse-prone endpoint has an enforced limit.
- **Technical work:**
  - Apply `session.mutation` to action wrapper; confirm limits for lookup, pairing, agent API, webhook, test print, reprint, invitations; document table in security.md §5 and operations/monitoring.md.
- **Files/modules:** `lib/http/action.ts`, `lib/security/rate-limit-policies.ts`
- **Database:** RATE_LIMIT_BUCKET.
- **API:** All limited endpoints.
- **Frontend:** 429 toast message.
- **Security:** SC-RL-01, SC-RL-02.
- **Tests:**
  - `TC-SEC-019` [integration] Each configured policy returns 429 after its limit with Retry-After and a `security.rate_limited` log event.
- **Acceptance criteria:**
  - Limits reviewed against load test results in S1-P28-T002.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P24-T004 — Injection and XSS hardening review

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 181 | P24 Security Hardening | Security Engineer | High | 2d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P16-T002
- **Requirements:** REQ-SEC-006, REQ-SEC-001
- **Baseline:** [fact] React escaping by default; no raw SQL found in baseline.
- **Objective:** Verify injection classes are closed across the codebase.
- **Technical work:**
  - Review every `$queryRaw` usage; confirm lint bans; seed XSS payloads (`<img src=x onerror=…>`, `javascript:` URLs, `</script>`) into names, notes, captions, instructions; verify rendering inert in console, public site, cards, receipts and print payloads.
- **Files/modules:** `tests/integration/security/injection.test.ts`, `tests/e2e/security/xss.spec.ts`
- **Database:** Fixtures.
- **API:** All inputs.
- **Frontend:** All renderers.
- **Security:** SC-VAL-03, SC-VAL-05, SC-VAL-07.
- **Tests:**
  - `TC-SEC-004` [static] No `$queryRawUnsafe`/`$executeRawUnsafe`; every `$queryRaw` is a tagged template inside `lib/data`.
  - `TC-SEC-020` [e2e] XSS payloads stored in menu, customer, order notes and social captions render as text on every screen and never execute.
- **Acceptance criteria:**
  - No findings of severity High or above.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P24-T005 — Request size and pagination limits

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 182 | P24 Security Hardening | Security Engineer | Medium | 1d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P12-T006
- **Requirements:** REQ-SEC-001, REQ-NFR-001
- **Baseline:** None.
- **Objective:** Bound request and response sizes.
- **Technical work:**
  - `serverActions.bodySizeLimit` set (e.g. 256 KB); route handler body limits; list limit caps (100) and poll caps (200) enforced centrally.
- **Files/modules:** `next.config.ts`, `lib/http/route.ts`, `lib/validation/core.ts`
- **Database:** None.
- **API:** All list and poll endpoints.
- **Frontend:** None.
- **Security:** SC-API-04.
- **Tests:**
  - `TC-SEC-008` [integration] `limit=1000` is rejected or capped to 100; a 1 MB action body returns 413.
- **Acceptance criteria:**
  - Limits documented in api.md conventions.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P24-T006 — Dependency and secret hygiene review

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 183 | P24 Security Hardening | Security Engineer | High | 1d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P01-T006
- **Requirements:** REQ-SEC-008, REQ-SEC-009
- **Baseline:** [fact] `package-lock.json` committed.
- **Objective:** Supply chain and secret exposure checked before release.
- **Technical work:**
  - Review added dependencies (`svix`, `@playwright/test`, `@axe-core/playwright`, `@clerk/testing`, `tsx`, `sharp` if uploads); enable GitHub Dependabot alerts and secret scanning with push protection; scan git history for secrets.
- **Files/modules:** Repository settings, `.github/dependabot.yml`
- **Database:** None.
- **API:** None.
- **Frontend:** None.
- **Security:** SC-DEP-01, SC-DEP-02, SC-DEP-03, SC-SEC-02.
- **Tests:**
  - `TC-SEC-021` [ci] `npm audit --audit-level=high` clean and secret scan of full history reports no findings.
- **Acceptance criteria:**
  - Dependency review notes exist for every added runtime dependency.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P24-T007 — Response projection audit

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 184 | P24 Security Hardening | Security Engineer | High | 1d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P19-T002
- **Requirements:** REQ-SEC-001, REQ-WEB-010
- **Baseline:** [fact] Baseline actions spread Prisma rows into responses (e.g. `app/restaurant/menu/items-actions.ts:70-77`).
- **Objective:** No raw database rows reach clients.
- **Technical work:**
  - Static test flagging `return { ...row }` / returning Prisma results directly from actions, route handlers and loaders; fix findings.
- **Files/modules:** `tests/static/projections.test.ts`
- **Database:** None.
- **API:** All.
- **Frontend:** None.
- **Security:** SC-API-05.
- **Tests:**
  - `TC-SEC-009` [static] No action, route handler or loader returns an object spread from, or identical to, a Prisma model result.
- **Acceptance criteria:**
  - Zero findings.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P24-T008 — Adversarial test suite completion

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 185 | P24 Security Hardening | Security Engineer | Critical | 3d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P24-T002, S1-P24-T003, S1-P16-T008, S1-P23-T001
- **Requirements:** REQ-SEC-003, REQ-TENANT-003
- **Baseline:** None.
- **Objective:** All ADV-001…ADV-030 scenarios automated and passing.
- **Technical work:**
  - Implement remaining ADV scenarios from tenant-isolation-tests.md §4 across integration and E2E layers; tag suite `@adversarial` as a required CI check.
- **Files/modules:** `tests/integration/adversarial/*`, `tests/e2e/adversarial/*`
- **Database:** Seed.
- **API:** All.
- **Frontend:** None.
- **Security:** SC-TEN-01…SC-TEN-10, SC-RBAC-01…SC-RBAC-08.
- **Tests:**
  - `TC-SEC-023` [integration] Full ADV-001…ADV-030 suite passes in CI with no skipped cases.
- **Acceptance criteria:**
  - Suite is a required status check on `main`.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P24-T009 — Threat model verification and sign-off

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 186 | P24 Security Hardening | Security Engineer | Critical | 2d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P24-T001, S1-P24-T004, S1-P24-T005, S1-P24-T006, S1-P24-T007, S1-P24-T008
- **Requirements:** REQ-SEC-002, REQ-SEC-001
- **Baseline:** [fact] Threat model v1.0 lists 4 threats with unverified mitigations.
- **Objective:** Every threat has a verified mitigation or an accepted residual risk.
- **Technical work:**
  - For each T-001…T-030: link passing tests, update status to VERIFIED or record residual risk with owner acceptance; update risks.md.
- **Files/modules:** `knowledge/implementation/slice-01/threat-model.md`, `risks.md`
- **Database:** None.
- **API:** None.
- **Frontend:** None.
- **Security:** All SC controls.
- **Tests:**
  - `TC-SEC-022` [review] Threat register shows every threat VERIFIED or ACCEPTED with evidence links, reviewed by the Project Owner.
- **Acceptance criteria:**
  - No threat remains OPEN.
- **Implementation notes:** —
- **Affected files (actual):** —

## P25 — Testing + QA

12 tasks · 31 ideal days of effort · sequence #187–#209 (interleaved with other phases where dependencies allow)

### S1-P25-T001 — Tenant isolation suite completion

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 187 | P25 Testing + QA | QA Engineer | Critical | 4d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P23-T001, S1-P20-T004, S1-P18-T009, S1-P13-T005, S1-P14-T006, S1-P10-T008
- **Requirements:** REQ-TENANT-003, REQ-TEST-006, REQ-RPT-009
- **Baseline:** None.
- **Objective:** All TI-001…TI-062 automated and passing.
- **Technical work:**
  - Implement remaining TI scenarios (staff, settings, audit, exports, reports, files, platform boundaries); required CI check.
- **Files/modules:** `tests/integration/isolation/*`
- **Database:** Seed.
- **API:** All tenant endpoints.
- **Frontend:** None.
- **Security:** SC-TEN-02, SC-TEN-10.
- **Tests:**
  - `TC-QA-007` [integration] TI-001…TI-062 all pass with zero skipped cases in CI.
- **Acceptance criteria:**
  - Isolation suite is a required status check.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P25-T002 — RBAC matrix completion

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 188 | P25 Testing + QA | QA Engineer | Critical | 2d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P05-T002, S1-P23-T001
- **Requirements:** REQ-RBAC-003, REQ-TEST-005, REQ-TEST-003, REQ-KITCH-007
- **Baseline:** Driver with `todo` rows from P05.
- **Objective:** Every permission row verified against real endpoints.
- **Technical work:**
  - Resolve all `todo` rows; endpoint inventory check comparing api.md endpoint IDs with the registry.
- **Files/modules:** `tests/integration/rbac/*`
- **Database:** Seed.
- **API:** All endpoints.
- **Frontend:** None.
- **Security:** SC-RBAC-01.
- **Tests:**
  - `TC-QA-008` [integration] Every LD/SA/RH endpoint in api.md is mapped to a matrix row and all TC-RBAC-101…TC-RBAC-150 pass.
- **Acceptance criteria:**
  - Zero `todo` rows.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P25-T003 — End-to-end journeys

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 189 | P25 Testing + QA | QA Engineer | Critical | 5d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P19-T004, S1-P20-T003, S1-P17-T008, S1-P21-T003, S1-P07-T006, S1-P06-T006
- **Requirements:** REQ-TEST-008
- **Baseline:** None.
- **Objective:** User journeys UJ-01…UJ-14 automated.
- **Technical work:**
  - Playwright specs per journey in desktop and tablet projects (UJ-05/06 also mobile); Clerk testing tokens; printer simulator for UJ-05/UJ-13; deterministic seed reset per spec file.
- **Files/modules:** `tests/e2e/journeys/*`
- **Database:** Seed.
- **API:** All.
- **Frontend:** All routes.
- **Security:** None.
- **Tests:**
  - `TC-QA-009` [e2e] UJ-01…UJ-14 pass in CI on desktop and tablet projects.
- **Acceptance criteria:**
  - Flake rate < 2% over 20 consecutive CI runs.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P25-T004 — Accessibility audit

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 190 | P25 Testing + QA | QA Engineer | High | 3d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P25-T003
- **Requirements:** REQ-DS-009, REQ-NFR-004, REQ-TEST-009
- **Baseline:** None.
- **Objective:** WCAG 2.1 AA verified automatically and manually.
- **Technical work:**
  - Axe scan of every route in each role; manual keyboard walkthrough of each journey; screen reader spot checks (NVDA + Chrome, VoiceOver + Safari) on sign-in, POS, kitchen, order detail, public site; record issues and fixes.
- **Files/modules:** `tests/e2e/a11y/*`, `knowledge/implementation/slice-01/testing.md`
- **Database:** Seed.
- **API:** None.
- **Frontend:** All routes.
- **Security:** None.
- **Tests:**
  - `TC-QA-010` [e2e] Axe reports zero serious/critical violations on every route; manual checklist completed with no open blockers.
- **Acceptance criteria:**
  - Release gate G08 evidence attached.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P25-T005 — Responsive QA

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 191 | P25 Testing + QA | QA Engineer | High | 2d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P25-T003
- **Requirements:** REQ-DS-010, REQ-TEST-010, REQ-NFR-005
- **Baseline:** None.
- **Objective:** Every route works at all target viewports and devices.
- **Technical work:**
  - Run viewport suite on all routes; manual checks on Android tablet, iPad, Android phone, iPhone per Q-026 matrix.
- **Files/modules:** `tests/e2e/responsive/*`
- **Database:** Seed.
- **API:** None.
- **Frontend:** All routes.
- **Security:** None.
- **Tests:**
  - `TC-QA-011` [e2e] Viewport matrix passes for all routes and device checks recorded (VQA-11, VQA-18).
- **Acceptance criteria:**
  - No horizontal page scroll on any route.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P25-T006 — Regression suite gating

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 192 | P25 Testing + QA | QA Engineer | High | 1d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P25-T003
- **Requirements:** REQ-TEST-012
- **Baseline:** None.
- **Objective:** A defined regression pack blocks risky releases.
- **Technical work:**
  - Tag regression specs (`@regression`): auth, isolation, RBAC, order-to-print chain, payments, day close, public site; required check for release branches; flaky-test quarantine policy with 48 h fix SLA.
- **Files/modules:** `playwright.config.ts`, `.github/workflows/ci.yml`, `knowledge/testing/regression-strategy.md`
- **Database:** None.
- **API:** None.
- **Frontend:** None.
- **Security:** None.
- **Tests:**
  - `TC-QA-004` [ci] Regression pack runs as a required check and completes in < 15 minutes.
- **Acceptance criteria:**
  - Policy documented.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P25-T007 — Load and performance test

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 209 | P25 Testing + QA | QA Engineer | High | 3d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P25-T003, S1-P27-T003
- **Requirements:** REQ-NFR-001, REQ-NFR-002
- **Baseline:** None.
- **Objective:** Validate performance targets at planned scale without new tooling.
- **Technical work:**
  - Node.js load scripts (built-in fetch/undici) against production-like staging: 50 tenants, 500 orders/day each compressed into peak-hour profile, 5 polling screens per tenant, agents claiming jobs; capture p50/p95/p99, error rate, DB CPU/connections; Lighthouse mobile for public pages.
- **Files/modules:** `tests/perf/*`
- **Database:** Staging perf dataset.
- **API:** SA-ORD-01, RH-ORD-01, RH-KOT-01, RH-AGT-03, LD-PUB-01.
- **Frontend:** Public pages (Lighthouse).
- **Security:** None.
- **Tests:**
  - `TC-QA-005` [perf] REQ-NFR-001 targets met at REQ-NFR-002 scale with error rate < 0.1%.
- **Acceptance criteria:**
  - Results and bottlenecks recorded; fixes tracked in S1-P28-T002.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P25-T008 — Database test inventory review

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 193 | P25 Testing + QA | QA Engineer | Medium | 1d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P02-T009
- **Requirements:** REQ-TEST-007
- **Baseline:** None.
- **Objective:** Every database constraint and trigger has a test.
- **Technical work:**
  - Query catalogue for CHECK, UNIQUE, FK and trigger definitions; compare with DB tests; add missing negatives.
- **Files/modules:** `tests/integration/db/inventory.test.ts`
- **Database:** All constraints.
- **API:** None.
- **Frontend:** None.
- **Security:** SC-DB-03.
- **Tests:**
  - `TC-QA-012` [integration] Inventory test fails when a constraint or trigger lacks a registered negative test.
- **Acceptance criteria:**
  - Inventory green.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P25-T009 — Physical printing QA

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 194 | P25 Testing + QA | QA Engineer | High | 2d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P17-T009
- **Requirements:** REQ-TEST-011, REQ-PRINT-008
- **Baseline:** None.
- **Objective:** Real-world printing reliability including failures.
- **Technical work:**
  - Matrix: 58/80 mm × USB/LAN × KOT/receipt/test; scenarios: paper out, printer power off mid-service, network cable pulled, agent PC reboot, two agents in one restaurant; UJ-13 recovery.
- **Files/modules:** `knowledge/implementation/slice-01/testing.md`
- **Database:** Staging.
- **API:** RH-AGT-*.
- **Frontend:** Printing console.
- **Security:** None.
- **Tests:**
  - `TC-QA-013` [manual] Physical print matrix and failure scenarios recorded with outcomes; no lost KOTs.
- **Acceptance criteria:**
  - Any duplicate print occurrences documented with cause.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P25-T010 — Visual QA pass

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 195 | P25 Testing + QA | Frontend Engineer | High | 4d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P25-T003
- **Requirements:** REQ-DS-011, REQ-TEST-014
- **Baseline:** None.
- **Objective:** Every major page meets the visual checklist.
- **Technical work:**
  - Run VQA-01…VQA-20 (design.md §12) on Dashboard, Menu, Daily menu, Orders, Order entry, Order detail, Kitchen, Transactions, Day close, Customers, Reports, Social, Website, Staff, Settings, Printing, Audit, Super Admin pages, public website, auth and account pages; fix misalignments rather than logging them.
- **Files/modules:** `app/**`, `components/**`, `knowledge/implementation/slice-01/testing.md`
- **Database:** Seed.
- **API:** None.
- **Frontend:** All routes.
- **Security:** None.
- **Tests:**
  - `TC-QA-014` [manual] VQA record shows pass for all 20 checks on every listed page with screenshots.
- **Acceptance criteria:**
  - Design-token static test reports zero violations.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P25-T011 — Design consistency audit

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 196 | P25 Testing + QA | Frontend Engineer | High | 1d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P25-T010
- **Requirements:** REQ-DS-011
- **Baseline:** None.
- **Objective:** One of each design system across the product.
- **Technical work:**
  - Review DCA-01…DCA-10 with static test evidence; remove leftover baseline components.
- **Files/modules:** `components/**`
- **Database:** None.
- **API:** None.
- **Frontend:** All.
- **Security:** None.
- **Tests:**
  - `TC-QA-015` [review] DCA-01…DCA-10 signed off with evidence.
- **Acceptance criteria:**
  - No unused baseline UI components remain.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P25-T012 — User acceptance testing with Project Owner

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 197 | P25 Testing + QA | Gopala Krishna (Project Owner) | Critical | 3d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P25-T003, S1-P25-T010
- **Requirements:** REQ-PLAT-004
- **Baseline:** None.
- **Objective:** The owner confirms the product meets the brief on staging.
- **Technical work:**
  - Walk UJ-01…UJ-14 on staging using a UAT script; record issues with severity; retest fixes.
- **Files/modules:** `knowledge/implementation/slice-01/acceptance.md`
- **Database:** Staging.
- **API:** None.
- **Frontend:** All.
- **Security:** None.
- **Tests:**
  - `TC-QA-016` [manual] UAT record signed by the Project Owner with no open Critical/High issues.
- **Acceptance criteria:**
  - Release gate G14 evidence attached.
- **Implementation notes:** —
- **Affected files (actual):** —

## P26 — Observability

8 tasks · 10 ideal days of effort · sequence #198–#205 (interleaved with other phases where dependencies allow)

### S1-P26-T001 — Request correlation and structured request logs

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 198 | P26 Observability | Backend Engineer | High | 2d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P03-T002
- **Requirements:** REQ-OBS-001
- **Baseline:** [fact] `lib/logger.ts` JSON logs without request context.
- **Objective:** Every log line traceable to a request, tenant and user.
- **Technical work:**
  - `AsyncLocalStorage` request context populated in action/route/loader wrappers (request id, tenant id, user id, route); access log line on completion with status and latency; `x-request-id` response header.
- **Files/modules:** `lib/logger.ts`, `lib/http/context.ts`, wrappers
- **Database:** None.
- **API:** All.
- **Frontend:** Error states show request id.
- **Security:** SC-LOG-01.
- **Tests:**
  - `TC-OBS-001` [integration] A request produces log lines containing request_id, tenant_id, user_id, route, status and latency_ms; ids match the response header.
- **Acceptance criteria:**
  - Log schema documented in `operations/monitoring.md`.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P26-T002 — Log redaction and PII masking

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 199 | P26 Observability | Security Engineer | High | 1d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P26-T001
- **Requirements:** REQ-OBS-006, REQ-CUST-005
- **Baseline:** [fact] Redaction by key name only.
- **Objective:** Logs never contain secrets and minimise personal data.
- **Technical work:**
  - Value-pattern masking for emails, E.164 phones, bearer tokens and card-like numbers; policy of no request/response bodies; unit tests.
- **Files/modules:** `lib/logger.ts`
- **Database:** None.
- **API:** None.
- **Frontend:** None.
- **Security:** SC-LOG-02, SC-LOG-04, SC-PII-03.
- **Tests:**
  - `TC-OBS-002` [unit] Emails, phones, bearer tokens, OTP-like fields and card-like numbers in messages or metadata are masked; bodies are not logged.
- **Acceptance criteria:**
  - Redaction applied to all log levels.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P26-T003 — Health and readiness endpoints

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 200 | P26 Observability | Backend Engineer | Critical | 1d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P02-T005
- **Requirements:** REQ-OBS-002, REQ-OPS-005, REQ-NFR-003
- **Baseline:** [fact] `/api/health` listed as public in `middleware.ts:10` but no route exists.
- **Objective:** Platform health checks for Railway and monitoring.
- **Technical work:**
  - RH-OPS-01 `GET /api/health` (static 200); RH-OPS-02 `GET /api/ready` (`SELECT 1` with 2 s timeout → 200/503); no version or environment detail; configure Railway health check path `/api/ready`.
- **Files/modules:** `app/api/health/route.ts`, `app/api/ready/route.ts`, `railway.json`
- **Database:** Connectivity probe.
- **API:** RH-OPS-01, RH-OPS-02.
- **Frontend:** None.
- **Security:** SC-API-01.
- **Tests:**
  - `TC-OBS-004` [integration] `/api/health` returns 200 minimal body; `/api/ready` returns 503 when the database is unreachable and 200 when restored.
- **Acceptance criteria:**
  - Railway deploys wait for readiness.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P26-T004 — Security event logging

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 201 | P26 Observability | Security Engineer | High | 1d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P26-T001
- **Requirements:** REQ-OBS-003, REQ-SEC-001
- **Baseline:** None.
- **Objective:** Security-relevant events are searchable.
- **Technical work:**
  - Events: `security.auth_failed`, `security.forbidden`, `security.not_found_burst` (≥ 20 404s on resource ids per user in 5 min), `security.rate_limited`, `security.webhook_rejected`, `security.agent_auth_failed`, `security.agent_foreign_printer`; documented queries for Railway log search.
- **Files/modules:** `lib/security/events.ts`, guards
- **Database:** None.
- **API:** All guarded endpoints.
- **Frontend:** None.
- **Security:** SC-LOG-03.
- **Tests:**
  - `TC-OBS-003` [integration] Triggering each condition emits the corresponding security event once with request id and without secrets.
- **Acceptance criteria:**
  - Event catalogue in `operations/monitoring.md`.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P26-T005 — Maintenance job for rate-limit buckets

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 202 | P26 Observability | DevOps Engineer | Medium | 1d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P03-T007
- **Requirements:** REQ-OBS-007
- **Baseline:** None.
- **Objective:** Housekeeping runs and is observable.
- **Technical work:**
  - `scripts/maintenance.ts` deleting expired RATE_LIMIT_BUCKET rows and logging counts; scheduled daily via a Railway cron service [assumption — confirm availability on plan in S1-P27-T001; fallback: opportunistic cleanup only].
- **Files/modules:** `scripts/maintenance.ts`, Railway cron configuration
- **Database:** RATE_LIMIT_BUCKET.
- **API:** None.
- **Frontend:** None.
- **Security:** None.
- **Tests:**
  - `TC-OBS-007` [integration] Maintenance script deletes only expired buckets and logs `maintenance.completed` with counts; failure logs `maintenance.failed`.
- **Acceptance criteria:**
  - Last successful run visible in logs.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P26-T006 — Error capture

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 203 | P26 Observability | Backend Engineer | High | 1d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P26-T001
- **Requirements:** REQ-OBS-003
- **Baseline:** None.
- **Objective:** Unhandled errors captured with context (tooling per Q-018).
- **Technical work:**
  - `instrumentation.ts` `onRequestError` hook logging structured error events (stack server-side only, request id, route, tenant id); client error boundary reporting minimal info to a logging route handler with rate limit; if Q-018 approves an error-tracking service, create ADR and integrate.
- **Files/modules:** `instrumentation.ts`, `app/api/v1/client-errors/route.ts`
- **Database:** None.
- **API:** Client error report endpoint (internal).
- **Frontend:** Error boundaries.
- **Security:** SC-API-01, SC-RL-01.
- **Tests:**
  - `TC-OBS-005` [integration] A thrown error in an action logs one `error.unhandled` event with stack and request id while the client receives a generic message.
- **Acceptance criteria:**
  - Q-018 answered and reflected.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P26-T007 — Print queue and agent monitoring

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 204 | P26 Observability | Backend Engineer | High | 2d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P16-T005, S1-P26-T001
- **Requirements:** REQ-OBS-005
- **Baseline:** None.
- **Objective:** Printing problems detected before restaurants call.
- **Technical work:**
  - Periodic check (maintenance script every 5 min or on agent API traffic) emitting `print.backlog_high` (PENDING older than 2 min > 10 per tenant), `print.failed_jobs` (terminal failures in last hour), `agent.offline` (active agent offline > 10 min during opening hours); platform-level summary without tenant content.
- **Files/modules:** `scripts/maintenance.ts`, `lib/services/print-monitoring.ts`
- **Database:** PRINT_JOB, PRINT_AGENT, RESTAURANT_HOURS.
- **API:** None.
- **Frontend:** None.
- **Security:** SC-LOG-01.
- **Tests:**
  - `TC-OBS-006` [integration] Seeded backlog, failures and offline agents emit the corresponding events once per interval with tenant id only.
- **Acceptance criteria:**
  - Alert thresholds documented and adjustable via configuration.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P26-T008 — Database monitoring

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 205 | P26 Observability | Database Engineer | Medium | 1d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P26-T001
- **Requirements:** REQ-OBS-004
- **Baseline:** [fact] `lib/db/prisma.ts` logs queries only in development.
- **Objective:** Slow queries and connection pressure visible.
- **Technical work:**
  - Prisma query event hook logging queries > 500 ms (model/action, duration, no parameters); connection pool settings documented; Railway database metrics reviewed and thresholds recorded.
- **Files/modules:** `lib/db/prisma.ts`, `knowledge/operations/monitoring.md`
- **Database:** Monitoring only.
- **API:** None.
- **Frontend:** None.
- **Security:** SC-LOG-04.
- **Tests:**
  - `TC-OBS-008` [integration] A deliberately slow query emits `db.slow_query` with duration and without parameter values.
- **Acceptance criteria:**
  - DEP-CHK-10 evidence recorded.
- **Implementation notes:** —
- **Affected files (actual):** —

## P27 — Railway Deployment

9 tasks · 14 ideal days of effort · sequence #206–#215 (interleaved with other phases where dependencies allow)

### S1-P27-T001 — Production Railway environment

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 206 | P27 Railway Deployment | DevOps Engineer | Critical | 2d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P01-T008, S1-P09-T001
- **Requirements:** REQ-OPS-001, REQ-OPS-005
- **Baseline:** [fact] Staging only (S1-P01-T008).
- **Objective:** Production infrastructure ready.
- **Technical work:**
  - Railway `production` environment: application service (replica count decision recorded), PostgreSQL (plan with backups per Q-025), region selection, custom domain per Q-013 with TLS, health check `/api/ready`, restart policy; confirm cron service availability for S1-P26-T005.
- **Files/modules:** `railway.json`, `knowledge/operations/railway.md`
- **Database:** Production PostgreSQL.
- **API:** None.
- **Frontend:** None.
- **Security:** SC-DB-01.
- **Tests:**
  - `TC-OPS-002` [smoke] Production domain serves the application over HTTPS with a valid certificate and `/api/ready` returns 200.
- **Acceptance criteria:**
  - Infrastructure decisions recorded (region, replicas, plan).
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P27-T002 — Database credentials, TLS and roles

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 207 | P27 Railway Deployment | Database Engineer | High | 1d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P27-T001
- **Requirements:** REQ-SEC-009, REQ-OPS-001
- **Baseline:** None.
- **Objective:** Least privilege and encrypted connections.
- **Technical work:**
  - Enforce `sslmode=require`; if Railway permits, create `rasoios_app` runtime role without DDL and use the owner role only for migrations; connection limits; record feasibility outcome.
- **Files/modules:** Railway variables, `knowledge/operations/railway.md`
- **Database:** Roles and grants.
- **API:** None.
- **Frontend:** None.
- **Security:** SC-DB-01, SC-DB-02.
- **Tests:**
  - `TC-OPS-003` [integration] Runtime credentials cannot execute `CREATE TABLE` (if roles supported) and non-TLS connections are refused.
- **Acceptance criteria:**
  - DEP-CHK-03 and DEP-CHK-07 recorded.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P27-T003 — Release pipeline

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 208 | P27 Railway Deployment | DevOps Engineer | Critical | 3d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P27-T001, S1-P02-T009
- **Requirements:** REQ-OPS-003, REQ-OPS-004, REQ-OPS-008
- **Baseline:** [fact] Staging auto-deploys from `main` (S1-P01-T008).
- **Objective:** Controlled promotion from staging to production.
- **Technical work:**
  - GitHub Actions `release.yml`: on tag `v*` → verify CI green → manual approval environment `production` → trigger pre-migration backup/snapshot → `prisma migrate deploy` against production → Railway deploy of the tagged image → smoke tests → notify.
  - Staging remains auto-deploy from `main` with migrations.
- **Files/modules:** `.github/workflows/release.yml`, `knowledge/implementation/slice-01/deployment.md`
- **Database:** Migrations.
- **API:** None.
- **Frontend:** None.
- **Security:** SC-BAK-02.
- **Tests:**
  - `TC-OPS-004` [ci] A test tag deploys to production only after manual approval, with migration step logs and smoke results attached.
- **Acceptance criteria:**
  - Deployment sequence matches deployment.md §6.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P27-T004 — Environment variable and secret inventory

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 210 | P27 Railway Deployment | DevOps Engineer | High | 1d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P27-T001
- **Requirements:** REQ-OPS-002, REQ-SEC-009
- **Baseline:** [fact] `.env.example` baseline variables.
- **Objective:** Every environment configured completely and securely.
- **Technical work:**
  - Inventory per environment matching `lib/env.ts`; set production Clerk keys, webhook secret, database URL, image allowlist, trusted proxy hops, bootstrap email; record owners and rotation procedure.
- **Files/modules:** `knowledge/implementation/slice-01/deployment.md`
- **Database:** None.
- **API:** None.
- **Frontend:** None.
- **Security:** SC-SEC-01, SC-SEC-02, SC-SEC-03.
- **Tests:**
  - `TC-OPS-005` [review] Inventory matches the env schema for staging and production; no secret values stored in the repository or docs.
- **Acceptance criteria:**
  - DEP-CHK-01 recorded.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P27-T005 — Clerk production configuration

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 211 | P27 Railway Deployment | Backend Engineer | Critical | 1d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P27-T001, S1-P03-T008
- **Requirements:** REQ-AUTH-001, REQ-AUTH-010
- **Baseline:** Development instance configured in S1-P03-T001.
- **Objective:** Production authentication ready.
- **Technical work:**
  - Production Clerk instance on production domain (DNS records), email code only, restricted sign-up, session settings, branded email templates, webhook endpoint with signing secret, allowed origins.
- **Files/modules:** Clerk dashboard, `knowledge/implementation/slice-01/deployment.md`
- **Database:** None.
- **API:** RH-AUTH-01.
- **Frontend:** None.
- **Security:** SC-AUTH-01, SC-AUTH-05, SC-SESS-01, SC-SESS-04, SC-WH-01.
- **Tests:**
  - `TC-OPS-006` [smoke] Invited test account signs in with an email code on the production domain; webhook delivery succeeds.
- **Acceptance criteria:**
  - DEP-CHK-04, DEP-CHK-05, DEP-CHK-06 recorded.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P27-T006 — Backups and restore drill

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 212 | P27 Railway Deployment | Database Engineer | Critical | 2d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P27-T002
- **Requirements:** REQ-OPS-007, REQ-NFR-006
- **Baseline:** [fact] v1.0 backup claims unverified (baseline-audit §3).
- **Objective:** Data recoverable within agreed objectives.
- **Technical work:**
  - Confirm Railway backup capabilities on the chosen plan (frequency, retention, point-in-time) per Q-025; schedule; perform restore of production backup into an isolated database; measure RPO/RTO; document procedure.
- **Files/modules:** `knowledge/operations/backups.md`
- **Database:** Backup and restore.
- **API:** None.
- **Frontend:** None.
- **Security:** SC-BAK-01.
- **Tests:**
  - `TC-OPS-007` [manual] Restore drill completes; restored data verified by row counts and application smoke test; RPO/RTO measured and recorded.
- **Acceptance criteria:**
  - DEP-CHK-08 recorded; Q-025 ANSWERED.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P27-T007 — Rollback rehearsal

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 213 | P27 Railway Deployment | DevOps Engineer | Critical | 1d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P27-T003
- **Requirements:** REQ-OPS-006
- **Baseline:** None.
- **Objective:** A practised way back from a bad release.
- **Technical work:**
  - Rehearse on staging: deploy a faulty build → roll back via Railway to previous deployment; migration failure scenario → forward-fix path and backup restore decision tree; document timings.
- **Files/modules:** `knowledge/implementation/slice-01/deployment.md`
- **Database:** Staging.
- **API:** None.
- **Frontend:** None.
- **Security:** None.
- **Tests:**
  - `TC-OPS-008` [manual] Rollback rehearsal completed within 15 minutes with steps recorded.
- **Acceptance criteria:**
  - DEP-CHK-13 recorded.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P27-T008 — Production smoke test suite

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 214 | P27 Railway Deployment | QA Engineer | Critical | 2d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P27-T003, S1-P25-T003
- **Requirements:** REQ-OPS-009, REQ-TEST-013
- **Baseline:** None.
- **Objective:** Fast confidence after every deploy without harming real tenant data.
- **Technical work:**
  - Playwright `@smoke` suite: health/ready, public page of a dedicated smoke tenant, sign-in with smoke account, dashboard load, create and cancel an order in the smoke tenant, printing console load; smoke tenant excluded from reports of real tenants by design (separate tenant).
- **Files/modules:** `tests/e2e/smoke/*`
- **Database:** Smoke tenant.
- **API:** RH-OPS-01, RH-OPS-02, SA-ORD-01, SA-ORD-03.
- **Frontend:** Key routes.
- **Security:** None.
- **Tests:**
  - `TC-QA-006` [e2e] Smoke suite passes against staging and production in < 5 minutes.
- **Acceptance criteria:**
  - Integrated into release pipeline.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P27-T009 — Deployment runbooks

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 215 | P27 Railway Deployment | DevOps Engineer | High | 1d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P27-T007
- **Requirements:** REQ-OPS-006, REQ-OPS-008
- **Baseline:** [fact] `operations/*.md` v1.0 minimal.
- **Objective:** Anyone authorised can deploy and recover.
- **Technical work:**
  - Update deployment.md, `operations/railway.md`, `operations/deployment.md`, `operations/backups.md` with verified steps, screenshots or command transcripts.
- **Files/modules:** `knowledge/operations/*`, `knowledge/implementation/slice-01/deployment.md`
- **Database:** None.
- **API:** None.
- **Frontend:** None.
- **Security:** None.
- **Tests:**
  - `TC-OPS-009` [review] Runbook walkthrough by the Project Owner without assistance succeeds on staging.
- **Acceptance criteria:**
  - Runbooks reference verified evidence, not assumptions.
- **Implementation notes:** —
- **Affected files (actual):** —

## P28 — Production Readiness

7 tasks · 12 ideal days of effort · sequence #216–#222 (interleaved with other phases where dependencies allow)

### S1-P28-T001 — Release gate evidence review

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 216 | P28 Production Readiness | QA Engineer | Critical | 2d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P25-T012, S1-P24-T009, S1-P27-T008
- **Requirements:** REQ-TEST-012, REQ-SEC-001
- **Baseline:** [fact] v1.0 release gates listed without evidence.
- **Objective:** Every release gate has linked evidence.
- **Technical work:**
  - Fill acceptance.md gate table G01…G15 with evidence links (CI runs, reports, sign-offs); list any gaps as blockers.
- **Files/modules:** `knowledge/implementation/slice-01/acceptance.md`
- **Database:** None.
- **API:** None.
- **Frontend:** None.
- **Security:** None.
- **Tests:**
  - `TC-REL-001` [review] All gates show PASS with evidence or are explicitly blocked.
- **Acceptance criteria:**
  - Zero gates without evidence.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P28-T002 — Performance tuning to targets

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 217 | P28 Production Readiness | Backend Engineer | High | 2d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P25-T007
- **Requirements:** REQ-NFR-001, REQ-NFR-002
- **Baseline:** Results from TC-QA-005.
- **Objective:** Close performance gaps found in load testing.
- **Technical work:**
  - Address bottlenecks (indexes, query shape, polling payload size, rate limit thresholds); re-run affected load scenarios.
- **Files/modules:** As identified
- **Database:** Indexes as needed.
- **API:** As identified.
- **Frontend:** As identified.
- **Security:** SC-RL-01.
- **Tests:**
  - `TC-REL-002` [perf] Re-run confirms REQ-NFR-001 targets at REQ-NFR-002 scale.
- **Acceptance criteria:**
  - Performance evidence attached to gate G13.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P28-T003 — Security sign-off and secret rotation drill

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 218 | P28 Production Readiness | Security Engineer | Critical | 2d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P24-T009, S1-P27-T004
- **Requirements:** REQ-SEC-002, REQ-SEC-009
- **Baseline:** None.
- **Objective:** Security readiness confirmed.
- **Technical work:**
  - Final review of residual risks; rotate Clerk secret, webhook secret, database password and one agent token on staging following the runbook; confirm zero downtime or documented impact.
- **Files/modules:** `knowledge/implementation/slice-01/threat-model.md`, `deployment.md`
- **Database:** Credential rotation (staging).
- **API:** None.
- **Frontend:** None.
- **Security:** SC-SEC-03.
- **Tests:**
  - `TC-REL-003` [review] Security sign-off recorded; DEP-CHK-12 rotation drill evidence attached.
- **Acceptance criteria:**
  - Gate G11 PASS.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P28-T004 — Knowledge Base synchronisation and consistency scan

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 219 | P28 Production Readiness | Backend Engineer | High | 2d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P28-T001
- **Requirements:** REQ-PLAT-001, REQ-PLAT-002
- **Baseline:** [fact] v1.0 KB drifted from code (baseline-audit §3).
- **Objective:** Documentation matches the implemented product.
- **Technical work:**
  - Script `scripts/kb-consistency.ts`: forbidden commercial terms (subscription plans, tiers, recurring billing) outside explicit prohibitions; broken document links; ID references (REQ, SC, TC, TI, ADV, API, task) resolve; tasks.md statuses and actual dates filled; data-model vs Prisma schema field diff.
  - Update every KB file whose content differs from code.
- **Files/modules:** `scripts/kb-consistency.ts`, `knowledge/**`
- **Database:** Schema comparison.
- **API:** None.
- **Frontend:** None.
- **Security:** None.
- **Tests:**
  - `TC-REL-004` [static] Consistency scan passes with zero findings.
- **Acceptance criteria:**
  - Gate G15 PASS.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P28-T005 — Incident response and support runbooks

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 220 | P28 Production Readiness | DevOps Engineer | High | 1d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P27-T009
- **Requirements:** REQ-OPS-006
- **Baseline:** [fact] `operations/incident-response.md` v1.0 two bullets.
- **Objective:** Prepared responses to likely incidents.
- **Technical work:**
  - Runbooks: suspected cross-tenant leak (suspend, preserve logs, notify), authentication outage (Clerk), database outage/restore, printing outage at a restaurant, bad deploy; contact and escalation (owner), communication templates; tabletop exercise.
- **Files/modules:** `knowledge/operations/incident-response.md`
- **Database:** None.
- **API:** None.
- **Frontend:** None.
- **Security:** SC-SEC-03.
- **Tests:**
  - `TC-REL-005` [manual] Tabletop exercise of the cross-tenant leak and printing outage runbooks completed and recorded.
- **Acceptance criteria:**
  - Runbooks referenced from deployment.md.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P28-T006 — First tenant onboarding plan

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 221 | P28 Production Readiness | Gopala Krishna (Project Owner) | High | 2d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P27-T005
- **Requirements:** REQ-PLAT-003
- **Baseline:** None.
- **Objective:** A rehearsed plan for the first real restaurant.
- **Technical work:**
  - Identify first tenant; prepare onboarding checklist (profile, hours, sections, menu import approach, staff list, printer hardware and network, agent PC); dry run on staging with realistic data.
- **Files/modules:** `knowledge/operations/onboarding.md`
- **Database:** Staging dry run.
- **API:** None.
- **Frontend:** None.
- **Security:** None.
- **Tests:**
  - `TC-REL-006` [manual] Staging dry run completes the checklist end to end including a printed KOT.
- **Acceptance criteria:**
  - Checklist approved by the Project Owner.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P28-T007 — Go / No-Go decision

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 222 | P28 Production Readiness | Gopala Krishna (Project Owner) | Critical | 1d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P28-T001, S1-P28-T002, S1-P28-T003, S1-P28-T004, S1-P28-T005, S1-P28-T006
- **Requirements:** REQ-PLAT-004
- **Baseline:** None.
- **Objective:** Formal release decision.
- **Technical work:**
  - Review gate evidence, open risks and open questions; record Go/No-Go with conditions in acceptance.md.
- **Files/modules:** `knowledge/implementation/slice-01/acceptance.md`
- **Database:** None.
- **API:** None.
- **Frontend:** None.
- **Security:** None.
- **Tests:**
  - None — decision record.
- **Acceptance criteria:**
  - Decision recorded with date and signature.
- **Implementation notes:** —
- **Affected files (actual):** —

## P29 — Final Release

5 tasks · 10 ideal days of effort · sequence #223–#227 (interleaved with other phases where dependencies allow)

### S1-P29-T001 — Production deployment

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 223 | P29 Final Release | DevOps Engineer | Critical | 1d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P28-T007
- **Requirements:** REQ-OPS-008, REQ-OPS-009
- **Baseline:** None.
- **Objective:** Release SLICE-01 to production safely.
- **Technical work:**
  - Execute release pipeline: tag, approval, backup, migrate deploy, deploy, smoke suite, verify logs and health for 1 hour; bootstrap SUPER_ADMIN with the grant command.
- **Files/modules:** Release pipeline
- **Database:** Production migrations.
- **API:** All.
- **Frontend:** All.
- **Security:** SC-BAK-02.
- **Tests:**
  - `TC-REL-007` [smoke] Production smoke suite TC-QA-006 passes after deployment; no error-level logs in the first hour attributable to the release.
- **Acceptance criteria:**
  - Release record with version, timestamps and evidence.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P29-T002 — First tenant go-live

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 224 | P29 Final Release | Gopala Krishna (Project Owner) | Critical | 2d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P29-T001
- **Requirements:** REQ-PLAT-003, REQ-PLAT-004
- **Baseline:** Onboarding plan from S1-P28-T006.
- **Objective:** First restaurant live on the platform.
- **Technical work:**
  - Create tenant, invite admin, configure restaurant, menu and staff, publish website, pair agent, register printers, print test KOT and receipt, first real service observed on site or remotely.
- **Files/modules:** `knowledge/operations/onboarding.md`
- **Database:** Production tenant data.
- **API:** All.
- **Frontend:** All.
- **Security:** None.
- **Tests:**
  - `TC-REL-008` [manual] Go-live checklist completed with the restaurant; first service orders printed and settled.
- **Acceptance criteria:**
  - Restaurant owner confirms operations work.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P29-T003 — Hypercare

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 225 | P29 Final Release | Backend Engineer | High | 5d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P29-T002
- **Requirements:** REQ-OBS-003, REQ-OBS-005
- **Baseline:** None.
- **Objective:** Stabilise the first days of production.
- **Technical work:**
  - Daily review of errors, security events, print backlog, agent status, slow queries; hotfix critical issues through the release pipeline; daily log in testing.md hypercare section.
- **Files/modules:** As needed
- **Database:** Monitoring.
- **API:** As needed.
- **Frontend:** As needed.
- **Security:** SC-LOG-03.
- **Tests:**
  - `TC-REL-009` [manual] Hypercare log for 5 working days shows all Critical/High issues resolved or accepted.
- **Acceptance criteria:**
  - No open Critical issues at end of hypercare.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P29-T004 — Post-release Knowledge Base update

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 226 | P29 Final Release | Backend Engineer | High | 1d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P29-T003
- **Requirements:** REQ-PLAT-005
- **Baseline:** None.
- **Objective:** Preserve what was learned.
- **Technical work:**
  - Update tasks.md statuses and actual dates, risks and open questions, CHANGELOG, known issues and lessons; mark superseded decisions properly; update global Knowledge Base project entry.
- **Files/modules:** `knowledge/**`, `~/.claude/KnowledgeBase/Projects/RASOIOS/*`
- **Database:** None.
- **API:** None.
- **Frontend:** None.
- **Security:** None.
- **Tests:**
  - `TC-REL-010` [review] KB statuses match reality; consistency scan TC-REL-004 still passes.
- **Acceptance criteria:**
  - Every task has a final status.
- **Implementation notes:** —
- **Affected files (actual):** —

### S1-P29-T005 — Project Owner final acceptance

| # | Phase | Owner | Priority | Effort | Planned Start | Planned Finish | Actual Start | Actual Finish | Status |
|---|---|---|---|---|---|---|---|---|---|
| 227 | P29 Final Release | Gopala Krishna (Project Owner) | Critical | 1d | — | — | — | — | PLANNED |

- **Dependencies:** S1-P29-T004
- **Requirements:** REQ-PLAT-004
- **Baseline:** None.
- **Objective:** Close SLICE-01.
- **Technical work:**
  - Review Definition of Done checklist in acceptance.md; sign off or list remaining work as new approved scope.
- **Files/modules:** `knowledge/implementation/slice-01/acceptance.md`
- **Database:** None.
- **API:** None.
- **Frontend:** None.
- **Security:** None.
- **Tests:**
  - None — decision record.
- **Acceptance criteria:**
  - SLICE-01 status set to COMPLETED with signature date, or remaining items explicitly approved.
- **Implementation notes:** —
- **Affected files (actual):** —

