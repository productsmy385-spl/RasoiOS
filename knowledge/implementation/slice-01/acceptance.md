---
title: "SLICE-01 Acceptance — Release Gates and Definition of Done"
document_type: "ACCEPTANCE"
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
dependencies: ["prd.md", "testing.md", "traceability.md"]
related_documents: ["prd.md", "traceability.md", "testing.md", "deployment.md", "roadmap.md"]
related_decisions: ["RASOIOS-ADR-005"]
---

# SLICE-01 Acceptance

SLICE-01 is accepted only when (1) every release gate passes with linked evidence, (2) every MUST requirement and every approved COULD
requirement meets its acceptance criteria in `traceability.md`, and (3) the Definition of Done checklist below is fully checked and signed by
the Project Owner. Nothing is checked here until evidence exists (S1-P28-T001).

## 1. Release gates

| ID | Gate | Pass condition | Evidence | Status |
|---|---|---|---|---|
| G01 | Architecture approval | ADR-005…ADR-011 decided; blocking open questions ANSWERED or DEFERRED with approval | decisions/, open-questions.md | PLANNED |
| G02 | Database validation | Migrations apply with no drift; all constraint/trigger tests pass (TC-DB-*, TC-QA-012) | CI run link | PLANNED |
| G03 | Authentication validation | TC-AUTH-001…018 pass; DEP-CHK-04…06 recorded | CI run, checklist | PLANNED |
| G04 | Tenant isolation | TI-001…TI-062 and ADV-001…ADV-030 pass with no skips; static tenant guard green | CI run | PLANNED |
| G05 | RBAC | TC-RBAC-001…016 and TC-RBAC-101…150 pass; no `todo` rows | CI run | PLANNED |
| G06 | Core workflow | Order → KOT → kitchen → payment → day close journeys pass (UJ-05…UJ-09) | Playwright report | PLANNED |
| G07 | Printing | TC-PRINT-*, TC-AGENT-* pass; physical printer matrix TC-QA-013 recorded | CI run, testing.md §7 | PLANNED |
| G08 | Accessibility | Axe zero serious/critical on all routes; manual checklist complete (TC-QA-010) | report | PLANNED |
| G09 | End-to-end and responsive | UJ-01…UJ-14 pass (TC-QA-009); viewport suite (TC-QA-011) | Playwright report | PLANNED |
| G10 | Production build and deployment | `npm run build` clean; staging and production healthy; DEP-CHK-01…13 recorded | CI, Railway, checklist | PLANNED |
| G11 | Security audit | Threat register VERIFIED/ACCEPTED (TC-SEC-022); CSP enforced; audit clean (TC-SEC-021); rotation drill | threat-model.md, reports | PLANNED |
| G12 | Visual QA and design consistency | VQA-01…VQA-20 on all pages and DCA-01…DCA-10 signed (TC-QA-014, TC-QA-015) | testing.md §8 | PLANNED |
| G13 | Performance | REQ-NFR-001 targets at REQ-NFR-002 scale (TC-QA-005, TC-REL-002) | load test report | PLANNED |
| G14 | User acceptance | UAT signed by Project Owner, no open Critical/High (TC-QA-016) | UAT record | PLANNED |
| G15 | Documentation synchronised | Consistency scan zero findings (TC-REL-004); task statuses and actual dates recorded | scan output | PLANNED |

## 2. Definition of Done — SLICE-01

| # | Item | Evidence |
|---|---|---|
| [ ] | Product requirements implemented (all MUST; approved COULD) | traceability.md |
| [ ] | Architecture implemented as documented (architecture.md matches code) | G15 |
| [ ] | Database implemented (schema = data-model.md; migrations clean) | G02 |
| [ ] | Authentication implemented (Clerk Email OTP, fail-closed, invite-only) | G03 |
| [ ] | Authorization implemented (guards on every entry point) | TC-AUTH-013 |
| [ ] | RBAC implemented (matrix verified) | G05 |
| [ ] | Tenant isolation verified | G04 |
| [ ] | Super Admin implemented | TC-ADMIN-* |
| [ ] | Restaurant management implemented | TC-REST-*, TC-STAFF-* |
| [ ] | Public website implemented | TC-WEB-* |
| [ ] | Design system implemented | TC-DS-*, G12 |
| [ ] | Menu implemented | TC-MENU-* |
| [ ] | Daily menu implemented | TC-DMENU-* |
| [ ] | Orders implemented | TC-ORDER-* |
| [ ] | Customers implemented | TC-CUST-* |
| [ ] | KOT implemented | TC-KOT-* |
| [ ] | Kitchen implemented | TC-KITCH-* |
| [ ] | Print queue implemented | TC-PRINT-* |
| [ ] | Local print agent implemented | TC-AGENT-* |
| [ ] | Transactions implemented | TC-TXN-* |
| [ ] | Reports implemented | TC-RPT-*, TC-DASH-* |
| [ ] | Social menu implemented | TC-SOC-* |
| [ ] | PWA implemented | TC-PWA-* |
| [ ] | Timezone and live clock implemented | TC-TZ-* |
| [ ] | Audit logging implemented | TC-AUDIT-* |
| [ ] | Security hardening complete | G11 |
| [ ] | Unit, integration and API tests complete | CI |
| [ ] | E2E tests complete | G09 |
| [ ] | Security tests complete (TI, ADV, RBAC) | G04, G05 |
| [ ] | Accessibility verified | G08 |
| [ ] | Responsive QA complete | TC-QA-011 |
| [ ] | Visual QA complete (alignment, icons, states) | G12 |
| [ ] | Observability complete | TC-OBS-* |
| [ ] | Railway deployment complete | G10 |
| [ ] | Production smoke tests pass | TC-QA-006, TC-REL-007 |
| [ ] | Lint, typecheck, tests and production build pass | CI |
| [ ] | Documentation synchronised | G15 |
| [ ] | No subscription plans, tiers or recurring tenant billing anywhere (REQ-PLAT-001) | TC-DB-003, TC-REL-004 |
| [ ] | No fake functionality (demo data, fabricated statuses, fake printing/publishing/payments) (REQ-PLAT-005) | TC-FOUND-007, VQA-20 |
| [ ] | Project Owner approval obtained | §4 |

## 3. Go / No-Go record

| Date | Decision | Conditions | Open risks accepted | Signed |
|---|---|---|---|---|
| — | — | — | — | — |

## 4. Final acceptance

| Item | Value |
|---|---|
| SLICE-01 status | PLANNED |
| Accepted by | — (Gopala Krishna, Project Owner) |
| Acceptance date | — |
| Remaining approved scope (if any) | — |
