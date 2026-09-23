---
title: "Architecture (Domain Reference)"
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
related_documents: ["../implementation/slice-01/architecture.md","../implementation/slice-01/tenant-isolation.md"]
related_decisions: ["RASOIOS-ADR-001","RASOIOS-ADR-003","RASOIOS-ADR-004","RASOIOS-ADR-006","RASOIOS-ADR-007","RASOIOS-ADR-008","RASOIOS-ADR-009","RASOIOS-ADR-010","RASOIOS-ADR-011"]
---

# Architecture
> **Canonical source:** [`../implementation/slice-01/architecture.md`](../implementation/slice-01/architecture.md). This domain file keeps only the durable summary for system architecture. Detail lives in the canonical
> file and is not repeated here (knowledge/README.md §Document responsibilities).


## Durable architectural principles

1. **One Next.js application.** App Router with Server Components, Server Actions and Route Handlers, on Railway with PostgreSQL via Prisma and Clerk for identity (ADR-001).
2. **Server-first.** Business logic, data access and authorization run on the server.
3. **Layering.** `app/**` → `lib/services` → `lib/data`, the only Prisma access for tenant data (ADR-008) → PostgreSQL. Composite FKs back this up at the database level.
4. **Tenant context is derived, never supplied** (ADR-003, ADR-006).
5. **Printing is pull-based.** A local agent authenticates with a per-device token and leases jobs from a PostgreSQL queue (ADR-004, ADR-007).
6. **Operational screens poll with cursors.** No extra realtime infrastructure (ADR-009).
7. **No additional runtime infrastructure** without an ADR (rate limits and queues live in PostgreSQL — ADR-011).

v1.0 described `services/` and `repositories/` directories that do not exist. The actual and target layering is `lib/services` and `lib/data` (baseline-audit §3).
