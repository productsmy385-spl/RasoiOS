---
title: "Data Flow"
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
related_documents: ["../implementation/slice-01/security.md","../implementation/slice-01/tenant-isolation.md","../implementation/slice-01/architecture.md"]
related_decisions: ["RASOIOS-ADR-006","RASOIOS-ADR-008"]
---

# Data Flow
> **Canonical sources:** request pipeline in [`security.md` §1](../implementation/slice-01/security.md), tenant resolution in [`tenant-isolation.md` §2](../implementation/slice-01/tenant-isolation.md),
> business flows in [`architecture.md` §5](../implementation/slice-01/architecture.md).

```
Request → middleware (Clerk session gate, request id)
        → guard: session → USER (ACTIVE) → tenant/platform context (DB, every request)
        → strict input validation (no tenant fields)
        → requirePermission (before loading resources)
        → service (business rules, one DB transaction)
        → lib/data (WHERE tenant_id = ctx.tenantId) → PostgreSQL (composite FKs, CHECKs)
        → audit row in the same transaction
        → explicit DTO projection → response (safe errors, request id)
```

The v1.0 flow said the tenant comes from "the session JWT". Under ADR-006 roles and memberships are read from PostgreSQL per request. JWT claims are not used for authorization.
