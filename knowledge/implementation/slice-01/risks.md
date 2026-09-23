---
title: "SLICE-01 Risk Register"
document_type: "RISKS"
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
dependencies: []
related_documents: ["threat-model.md", "open-questions.md", "baseline-audit.md", "tasks.md"]
related_decisions: ["RASOIOS-ADR-003", "RASOIOS-ADR-004", "RASOIOS-ADR-005", "RASOIOS-ADR-007"]
---

# SLICE-01 Risk Register

Scale: Probability and Impact are Low / Medium / High. Severity = combined rating (Low, Medium, High, Critical). Status values:
**OPEN** (risk present, mitigation not yet effective), **MITIGATING** (mitigation tasks in progress), **MITIGATED** (mitigation verified),
**CLOSED**, **ACCEPTED**. Owners are roles; every role except the Project Owner is currently UNASSIGNED.

The v1.0 register marked cross-tenant leakage as "MITIGATED". The baseline audit shows it is not (BA-01, BA-02), so R001 is re-opened.

| ID | Risk | Probability | Impact | Severity | Mitigation | Trigger (early warning) | Owner | Status |
|---|---|---|---|---|---|---|---|---|
| R001 | **Cross-tenant data leak** — a tenant's orders, customers or print tickets exposed to another tenant | High (baseline exposed) | High | Critical | S1-P04-T008 immediate fixes; ADR-006/008; composite FKs (S1-P02-T004); static guard (S1-P02-T006); TI/ADV suites required in CI (S1-P25-T001, S1-P24-T008) | Any TI/ADV failure; `security.not_found_burst` events; static guard violation | Security Engineer | OPEN |
| R002 | **Authorization bypass** — missing permission checks or fail-open auth | High (BA-04, BA-09…BA-13) | High | Critical | Fail-closed middleware (S1-P03-T002); guard coverage static test (S1-P04-T002); RBAC matrix driver (S1-P05-T002, S1-P25-T002) | Guard coverage test failure; RBAC `todo` rows at phase end | Security Engineer | OPEN |
| R003 | **Database migration failure** — schema redesign breaks environments or loses data | Medium | High | High | Q-017 confirms no data; `0001_init` tested in CI and staging; drift check (S1-P02-T009); pre-migration backups (S1-P27-T003) | Drift check fails; migration error on staging | Database Engineer | OPEN |
| R004 | **Printer failure during service** — offline printer or agent loses kitchen tickets | Medium | High | High | Kitchen board as fallback (P15); retries and FAILED visibility (S1-P16-T007, S1-P16-T006); header indicator (S1-P16-T009); monitoring alerts (S1-P26-T007); physical QA (S1-P25-T009) | `print.backlog_high`, `agent.offline` events | Backend Engineer | OPEN |
| R005 | **Duplicate printing** — confusing duplicate KOTs in the kitchen | High (BA-18, BA-22) | Medium | High | Idempotent KOTs (S1-P14-T001); atomic leases and dedupe (S1-P16-T001); agent journal (S1-P17-T004) | TC-PRINT-004/TC-AGENT-008 failures; restaurant reports duplicates | Backend Engineer | OPEN |
| R006 | **Print agent compromise** — stolen restaurant PC or token used to read tickets | Medium | Medium | Medium | Per-device hashed tokens, revocation, OS credential storage, outbound-only agent (ADR-007; S1-P17-T003, S1-P17-T010) | `security.agent_auth_failed` spikes; unknown agent IP | Security Engineer | OPEN |
| R007 | **Railway deployment failure** — failed release or misconfigured environment | Medium | High | High | Early staging (S1-P01-T008); release pipeline with approval (S1-P27-T003); readiness health check; rollback rehearsal (S1-P27-T007) | Staging deploy failures; readiness check failures | DevOps Engineer | OPEN |
| R008 | **Data loss** — restaurant financial or order data lost | Low | High | High | Verified backups and restore drill (S1-P27-T006); append-only ledger and audit; archive instead of delete (data-model §1.4) | Backup job failures; restore drill misses RPO | Database Engineer | OPEN |
| R009 | **External integration failure** — Clerk outage, invitation email delivery, storage provider | Medium | Medium | Medium | Typed errors and retries (S1-P03-T004); resend invites; no social API integrations in SLICE-01 (Q-012); incident runbook (S1-P28-T005) | Invitation failure rate; Clerk status incidents | Backend Engineer | OPEN |
| R010 | **Performance issue** at peak service — slow order entry or kitchen board | Medium | Medium | Medium | Cursor polling (ADR-009); indexes; load tests (S1-P15-T005, S1-P25-T007); tuning (S1-P28-T002) | p95 above REQ-NFR-001 on staging | Backend Engineer | OPEN |
| R011 | **Scope creep** — features beyond the brief enter SLICE-01 | Medium | Medium | Medium | Future Scope list (`product/scope.md`); decision gates; COULD requirements gated by questions; ADR for architecture changes | New work items without REQ IDs | Gopala Krishna (Project Owner) | OPEN |
| R012 | **Insufficient testing** — mocked tests give false confidence (baseline: 42 mocked tests) | High | High | Critical | Real-database integration harness (S1-P02-T008); required isolation/adversarial/RBAC gates; task DoD requires listed tests | Tasks marked COMPLETED without tests; coverage of catalogue < 100% at readiness | QA Engineer | OPEN |
| R013 | **Documentation drift** — KB claims diverge from code (already happened in v1.0) | High | Medium | High | Execution-order task register with evidence; statuses only on verified acceptance; consistency scan (S1-P28-T004); post-release update (S1-P29-T004) | Consistency scan findings; KB claims without evidence | Gopala Krishna (Project Owner) | OPEN |
| R014 | **Unresolved decisions block work** — open questions answered late | Medium | Medium | Medium | Decision gate tasks placed before blocked work (dependencies.md §4); recommendations provided for every question | Blocked tasks waiting on a gate | Gopala Krishna (Project Owner) | OPEN |
| R015 | **Clerk dependency** — authentication availability and pricing tied to a third party | Low | High | Medium | Local USER model independent of Clerk ids; fail-closed with clear error pages; documented incident response | Clerk incidents; contract changes | Gopala Krishna (Project Owner) | OPEN |
| R016 | **Capacity / key-person dependency** — all roles except Project Owner unassigned; no schedule forecast | High | High | Critical | Q-016 staffing decision; execution-order plan lets any implementer (human or AI agent) continue from the next PLANNED task; complete task detail | Tasks idle; repeated re-planning | Gopala Krishna (Project Owner) | OPEN |
| R017 | **Printer hardware compatibility** — codepages, USB drivers, paper widths differ by model | Medium | Medium | Medium | Q-011 certified models; simulator plus physical test matrix (S1-P25-T009); transliteration fallback (S1-P17-T005) | Garbled output in physical tests | Backend Engineer | OPEN |
| R018 | **Baseline rework larger than expected** — existing code has more defects than audited | Medium | Medium | Medium | Baseline audit; retrofit tasks (S1-P04-T007); replace mocked tests feature by feature | Unexpected failures when enabling real-database tests | Backend Engineer | OPEN |
