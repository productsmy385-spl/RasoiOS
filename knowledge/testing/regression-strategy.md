---
title: "Regression Strategy"
document_type: "PROCESS"
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
related_documents: ["../implementation/slice-01/testing.md"]
related_decisions: []
---

# Regression Strategy

- **Regression pack (`@regression`):** authentication, tenant isolation, RBAC matrix, order → KOT → print chain, payments and day close, public website projection, audit coverage.
- **When it runs:** required on release branches and tags; nightly on `main`.
- **Growth rule:** every production defect fixed gets a regression test in the same pull request, tagged `@regression`.
- **Budget:** under 15 minutes (TC-QA-004). Beyond that, split into parallel jobs rather than dropping tests.
- **Flaky tests:** quarantined with an owner and a 48-hour fix SLA. Isolation, adversarial and RBAC tests may not be quarantined.
- **Evidence:** CI run links recorded in `../implementation/slice-01/acceptance.md` gate G09/G04/G05.
