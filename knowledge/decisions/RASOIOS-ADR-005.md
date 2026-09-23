---
title: "RASOIOS-ADR-005: Single Master Implementation Slice (SLICE-01)"
document_type: "ADR"
project: "Restaurant SaaS Platform"
project_owner: "Gopala Krishna"
slice: "SLICE-01"
status: "ACCEPTED"
version: "1.0"
created: "2026-09-15"
last_updated: "2026-09-15"
owner: "Gopala Krishna (Project Owner)"
planned_start: "2026-09-15"
planned_finish: "Not scheduled — execution-order plan"
dependencies: []
related_documents: ["../implementation/slice-01/README.md", "../implementation/slice-01/slice-plan.md", "../implementation/slice-01/baseline-audit.md"]
related_decisions: ["RASOIOS-ADR-001", "RASOIOS-ADR-002", "RASOIOS-ADR-003", "RASOIOS-ADR-004"]
---

# RASOIOS-ADR-005: Single Master Implementation Slice (SLICE-01)

- **ID:** RASOIOS-ADR-005
- **Date:** 2026-09-15
- **Owner:** Gopala Krishna (Project Owner)
- **Status:** ACCEPTED — decided by the Project Owner in the SLICE-01 master planning brief dated 2026-09-15.

## Context

Knowledge Base v1.0 (2026-09-15) split delivery into eight slices (Slice 01–08, dated
2026-09-15 → 2026-11-22) with one README each. Slices 02–08 were marked "IMPLEMENTED". The
baseline audit of the same day (`implementation/slice-01/baseline-audit.md`) found that the
code does not support those statuses: critical tenant-isolation defects, placeholder UI and
missing features.

## Problem

Eight thin slice documents spread requirements, status and design across many files. That
made it possible to mark work "implemented" without traceable acceptance criteria, and gave
no single plan an engineer or AI agent could follow from start to release.

## Decision

1. The entire approved product is delivered as **one implementation slice: `SLICE-01 —
   Complete Restaurant SaaS Platform`**.
2. SLICE-01 is broken down into **29 ordered phases** (P01–P29), each with tasks
   identified as `S1-Pxx-Tnnn`. Phases are not slices.
3. `knowledge/implementation/slice-01/` is the authoritative plan. Domain folders
   (`product/`, `architecture/`, `database/`, `frontend/`, `design/`, `security/`,
   `testing/`, `operations/`) hold durable reference material and link to the slice files
   instead of copying them.
4. Every task starts `PLANNED`. It becomes `COMPLETED` only when its acceptance criteria are
   verified, with actual start/finish dates recorded.
5. The eight-slice documents are superseded. Their originals remain in git history at commit `18941a9`.

## Superseded documents (removed from the working tree; recoverable from `18941a9`)

| Superseded file | Replaced by |
|---|---|
| `implementation/slice-01/slice-01-plan.md`, `slice-01-tasks.md`, `slice-01-security.md`, `slice-01-acceptance.md` | `implementation/slice-01/slice-plan.md`, `tasks.md`, `security.md`, `acceptance.md` |
| `implementation/slice-02/README.md` … `slice-08/README.md` | Phases P07–P29 in `implementation/slice-01/slice-plan.md` |
| `architecture.md` (root) | `architecture/architecture.md`, `implementation/slice-01/architecture.md` |
| `database.md` (root) | `database/database.md`, `implementation/slice-01/data-model.md` |
| `security.md` (root), `rbac.md` | `security/security.md`, `implementation/slice-01/security.md` §3 |
| `milestones.md`, `release-gates.md` | `implementation/slice-01/roadmap.md`, `acceptance.md` |
| `risks.md`, `open-questions.md`, `dependencies.md`, `traceability-matrix.md` | `implementation/slice-01/risks.md`, `open-questions.md`, `dependencies.md`, `traceability.md` |
| `people.md` | `README.md` §Governance (same content: Project Owner assigned, other roles UNASSIGNED) |
| `operations/backup.md` | `operations/backups.md` |

## Alternatives considered

| Alternative | Why not chosen |
|---|---|
| Keep eight slices, fix the statuses | Owner explicitly requires one authoritative slice; fragmentation caused the status drift |
| One flat task list with no phases | Loses dependency ordering and milestone gates |

## Consequences

- One plan, one task register, one traceability matrix, one acceptance definition.
- Timeline and dates are re-baselined from 2026-09-15 (see `roadmap.md`).
- Previously "IMPLEMENTED" work is treated as reusable baseline code, not completed tasks.

## Security impact

Positive. Critical findings BA-01…BA-08 become Critical-priority tasks in early phases
(P03–P06) instead of staying hidden behind "IMPLEMENTED" labels.

## Database impact

None directly. It enables the schema redesign in `data-model.md` as one coherent migration
baseline (no migrations existed — `baseline-audit.md` §2).

## Migration impact

Documentation only. No application data is migrated by this decision.

## Related documents

`implementation/slice-01/README.md`, `slice-plan.md`, `tasks.md`, `baseline-audit.md`.
