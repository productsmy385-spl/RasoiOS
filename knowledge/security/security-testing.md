---
title: "Security Testing (Domain Reference)"
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
related_documents: ["../implementation/slice-01/tenant-isolation-tests.md","../implementation/slice-01/testing.md"]
related_decisions: []
---

# Security Testing
> **Canonical sources:** [`tenant-isolation-tests.md`](../implementation/slice-01/tenant-isolation-tests.md) (TI-001…TI-062, ADV-001…ADV-030) and [`testing.md`](../implementation/slice-01/testing.md) §5–§6.

v1.0 stated that the adversarial tests live in `tests/unit/tenant-context.test.ts`. That file tests the resolver with mocked data only (baseline-audit §1).
Security suites now run against a real PostgreSQL database with two tenants, are required CI checks, and cannot be skipped at release.
