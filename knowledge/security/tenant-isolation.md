---
title: "Tenant Isolation (Domain Reference)"
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
related_documents: ["../implementation/slice-01/tenant-isolation.md","../implementation/slice-01/tenant-isolation-tests.md"]
related_decisions: ["RASOIOS-ADR-003","RASOIOS-ADR-006","RASOIOS-ADR-008"]
---

# Tenant Isolation
> **Canonical source:** [`../implementation/slice-01/tenant-isolation.md`](../implementation/slice-01/tenant-isolation.md). This domain file keeps only the durable summary for the tenant boundary. Detail lives in the canonical
> file and is not repeated here (knowledge/README.md §Document responsibilities).


The v1.0 example pattern accepted a `requestedTenantId` parameter and returned 403 for other-tenant resources. Both are superseded:
server actions take **no** tenant parameter (ADR-006), and lookups return 404 for other tenants (ADR-008). The canonical pattern is in tenant-isolation.md §3.1.
