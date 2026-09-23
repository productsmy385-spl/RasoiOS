---
title: "SLICE-01 — Complete Restaurant SaaS Platform (Navigation)"
document_type: "INDEX"
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
related_documents: ["slice-plan.md", "tasks.md", "prd.md", "baseline-audit.md"]
related_decisions: ["RASOIOS-ADR-005"]
---

# SLICE-01 — Complete Restaurant SaaS Platform

**One project, one slice, 29 phases, 227 tasks.** SLICE-01 is the single authoritative implementation plan for the whole
Restaurant SaaS Platform (RASOIOS), from foundation to production release (RASOIOS-ADR-005).

- **Project Owner:** Gopala Krishna
- **Commercial model:** one-time software product/licence. **No SaaS subscription or membership plans** (ADR-002). USER_TENANT is an authorization membership, not a subscription.
- **Scheduling:** execution order only. There are no forecast dates (Project Owner instruction, 2026-09-15). Actual dates are recorded as work happens.
- **Task tracking:** `tasks.md`. This project is **not** connected to Linear (Project Owner instruction, 2026-09-15).
- **Starting point:** existing code at commit `18941a9`, audited in `baseline-audit.md`. Reusable code is kept, and defects are fixed by tasks.

## Where to start

| If you are… | Read |
|---|---|
| An engineer or AI coding agent starting work | `baseline-audit.md` → `tasks.md` (take the lowest-numbered PLANNED task whose dependencies are COMPLETED) → the documents that task references |
| Reviewing scope and requirements | `prd.md` → `traceability.md` → `acceptance.md` |
| Designing or reviewing architecture | `architecture.md` → `tenant-isolation.md` → `../../decisions.md` |
| Working on the database | `data-model.md` → `erd.md` |
| Building endpoints | `api.md` → `security.md` §3 (permissions) |
| Building UI | `frontend.md` → `design.md` |
| Testing | `testing.md` → `tenant-isolation-tests.md` → `threat-model.md` |
| Deploying | `deployment.md` |
| Making decisions | `open-questions.md` → `dependencies.md` §4 (decision gates) → `risks.md` |

## Documents and responsibilities

| Document | Responsibility |
|---|---|
| `README.md` | What the slice is and how to navigate it (this file) |
| `baseline-audit.md` | Evidence of the repository and KB state on 2026-09-15 |
| `slice-plan.md` | High-level complete implementation plan: every phase with objective, outcomes, scope, changes, security, testing, tasks, risks, acceptance, DoD and exit criteria |
| `roadmap.md` | Phase order and milestones (M01–M14); records actual dates |
| `prd.md` | What and why: vision, personas, journeys, requirements (REQ-*), business rules (BR-*), non-goals |
| `architecture.md` | How the system is structured: layers, flows, print subsystem, time handling, environments |
| `erd.md` | How entities relate: diagrams, keys, ownership paths, deletion, audit |
| `data-model.md` | Exact fields, types, constraints and invariants |
| `api.md` | Every loader, Server Action and Route Handler contract |
| `frontend.md` | Routes, screens, states, navigation and component architecture |
| `design.md` | Visual language: tokens, typography, spacing, icons, status system, motion, visual QA |
| `security.md` | Authentication, RBAC matrix, security control catalogue (SC-*), audit action catalogue |
| `tenant-isolation.md` | The exact tenant boundary and how each layer enforces it |
| `threat-model.md` | Threats T-001…T-030 with mitigations and tests |
| `testing.md` | Test strategy, layers, gates and the generated test catalogue |
| `tenant-isolation-tests.md` | Mandatory TI-001…TI-062 and adversarial ADV-001…ADV-030 scenarios |
| `deployment.md` | Railway topology, variables, migrations, sequence, rollback, backups, checklist DEP-CHK-* |
| `tasks.md` | Master task register in execution order with full detail per task |
| `dependencies.md` | Phase and task dependency map, decision gates, longest chain |
| `risks.md` | Risk register R001–R018 |
| `open-questions.md` | Decisions Q-001–Q-029 needing the Project Owner, with recommendations |
| `traceability.md` | Requirement → phase → task → database → API → frontend → control → test → acceptance |
| `acceptance.md` | Release gates G01–G15 and the SLICE-01 Definition of Done |

## Numbers

| Item | Count |
|---|---|
| Phases | 29 |
| Tasks | 227 |
| Requirements | 254 |
| Database entities | 27 (+1 decision-gated: MEDIA_ASSET) |
| API endpoints | 121 (33 loaders, 72 Server Actions, 16 Route Handlers) |
| Major frontend routes | 38 |
| Security controls | 94 |
| Tests | 468 (376 test cases + 62 isolation + 30 adversarial) |
| Threats | 30 |
| Risks | 18 |
| Open questions | 29 |
| Milestones | 14 |
| ADRs | 11 (4 approved in v1.0, 1 accepted, 6 approved at gate A on 2026-09-15) |

## Working rules (summary)

1. Read the task, its dependencies and referenced documents before coding. Inspect the baseline code it names.
2. Never trust client tenant identifiers, prices or totals. Every entry point calls a guard first.
3. Mark a task COMPLETED only when its acceptance criteria are verified and its tests pass. Record actual dates, implementation notes and affected files.
4. If implementation must differ from these documents, stop. Decide whether the difference is a bug, a missing requirement or an architecture change. Update the documents, and add an ADR for architecture changes.
5. No subscription plans, fake functionality, random icon libraries or emoji icons.
