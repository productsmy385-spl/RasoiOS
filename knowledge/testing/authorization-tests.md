---
title: "Authorization Tests"
document_type: "REFERENCE"
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
related_documents: ["../implementation/slice-01/security.md","../implementation/slice-01/testing.md"]
related_decisions: []
---

# Authorization Tests

| Suite | What it proves | Location | IDs |
|---|---|---|---|
| RBAC matrix driver | Each of 50 permissions allows/denies each of 6 roles at a real endpoint | `tests/integration/rbac-matrix.test.ts` | TC-RBAC-101…150 |
| Permission constants | Deny by default; platform/tenant separation; docs = code | `tests/unit/permissions*.test.ts` | TC-RBAC-001, TC-RBAC-002, TC-RBAC-015 |
| Role hierarchy | No escalation; last TENANT_ADMIN preserved | integration | TC-RBAC-010, TC-RBAC-012 |
| Projections | Kitchen and platform views minimise data | integration | TC-RBAC-011, TC-ADMIN-006 |
| UI is not authorization | Hidden actions still denied | Playwright | TC-RBAC-013, ADV-030 |
| Guard coverage | Every entry point calls a guard | static | TC-AUTH-013 |

Matrix source of truth: `../implementation/slice-01/security.md` §3.3.
