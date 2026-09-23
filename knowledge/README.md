---
title: "Knowledge Base — Directory and Reading Guide"
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
related_documents: ["KNOWLEDGE-BASE.md", "decisions.md", "implementation/slice-01/README.md"]
related_decisions: ["RASOIOS-ADR-001", "RASOIOS-ADR-002", "RASOIOS-ADR-003", "RASOIOS-ADR-004", "RASOIOS-ADR-005", "RASOIOS-ADR-006", "RASOIOS-ADR-007", "RASOIOS-ADR-008", "RASOIOS-ADR-009", "RASOIOS-ADR-010", "RASOIOS-ADR-011"]
---

# Knowledge Base — Restaurant SaaS Platform (RASOIOS)

This folder is the source of truth for the product, its architecture, decisions and the implementation plan (CLAUDE.md).
Version 2.0 (2026-09-15) consolidates the former eight-slice plan into **one master slice, SLICE-01** (RASOIOS-ADR-005).

## Reading order

1. `KNOWLEDGE-BASE.md` — project identity, commercial model, stack, governance.
2. `decisions.md` — all ADRs and their status.
3. `implementation/slice-01/README.md` — the plan and how to navigate it.
4. `implementation/slice-01/baseline-audit.md` — what the code actually does today.
5. `implementation/slice-01/tasks.md` — what to do next, in execution order.

## Folder map

| Folder | Holds | Canonical detail |
|---|---|---|
| `product/` | Thesis, scope and Future Scope, terminology; pointers for PRD, personas, journeys, business rules | `implementation/slice-01/prd.md` |
| `architecture/` | Durable architecture principles, context, data flow, integrations, deployment shape | `implementation/slice-01/architecture.md` |
| `database/` | Invariants, environment facts, migration strategy | `implementation/slice-01/data-model.md`, `erd.md` |
| `frontend/` | Principles, routes, component locations, state management, frontend security | `implementation/slice-01/frontend.md` |
| `design/` | Visual direction, UX principles, responsive rules, accessibility checklist | `implementation/slice-01/design.md` |
| `security/` | Security policy, isolation, threat and security-testing summaries | `implementation/slice-01/security.md`, `tenant-isolation.md`, `threat-model.md` |
| `testing/` | Strategy, authorization, isolation, integration, E2E, regression | `implementation/slice-01/testing.md`, `tenant-isolation-tests.md` |
| `operations/` | Deployment policy, Railway, monitoring, backups, incident response | `implementation/slice-01/deployment.md` |
| `decisions/` | Architecture Decision Records RASOIOS-ADR-001…011 | — |
| `implementation/slice-01/` | **The single implementation slice** (22 plan documents + baseline audit) | — |

## Document responsibilities

- **Domain folders** hold durable reference material and link to the canonical slice document instead of copying it.
- **`implementation/slice-01/`** holds the complete plan: README, slice plan, roadmap, PRD, architecture, ERD, data model, API, frontend, design, security,
  tenant isolation, threat model, testing, tenant isolation tests, deployment, dependencies, tasks, risks, open questions, traceability, acceptance.
- **The same information is not written in two places.** When a domain file and a slice file would overlap, the slice file is canonical.

## Governance

| Role | Person | Responsibility | Status |
|---|---|---|---|
| Project Owner / Product Owner / Technical Lead | **Gopala Krishna** | Vision, scope, decisions, approvals | ASSIGNED |
| Backend Engineer | UNASSIGNED | Services, data layer, APIs | UNASSIGNED |
| Database Engineer | UNASSIGNED | Schema, migrations, performance | UNASSIGNED |
| Frontend Engineer | UNASSIGNED | Design system and screens | UNASSIGNED |
| Security Engineer | UNASSIGNED | Controls, reviews, adversarial tests | UNASSIGNED |
| QA Engineer | UNASSIGNED | Test harnesses, suites, QA records | UNASSIGNED |
| DevOps Engineer | UNASSIGNED | CI, Railway, releases, runbooks | UNASSIGNED |

Implementation model (Q-016, answered 2026-09-15): **AI coding agents supervised by the Project Owner**. The engineering roles above are role labels on tasks; the agent does the work and Gopala Krishna reviews and approves it. No other people are named in this Knowledge Base.

## Tracking

- Tasks and status: `implementation/slice-01/tasks.md`. This project is **not** connected to Linear (Project Owner instruction, 2026-09-15).
- Scheduling: execution order only, with no forecast dates (Project Owner instruction, 2026-09-15).

## Superseded in v2.0

Root files `architecture.md`, `database.md`, `security.md`, `rbac.md`, `milestones.md`, `release-gates.md`, `risks.md`, `open-questions.md`,
`dependencies.md`, `traceability-matrix.md`, `people.md`, the slice-01 v1.0 files and `implementation/slice-02…08/` were consolidated as listed in
RASOIOS-ADR-005. The originals are in git history at commit `18941a9`.
