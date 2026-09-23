---
title: "Deployment Architecture"
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
related_documents: ["../implementation/slice-01/deployment.md"]
related_decisions: ["RASOIOS-ADR-001"]
---

# Deployment Architecture
> **Canonical source:** [`../implementation/slice-01/deployment.md`](../implementation/slice-01/deployment.md). This domain file keeps only the durable summary for deployment topology and procedures. Detail lives in the canonical
> file and is not repeated here (knowledge/README.md §Document responsibilities).


- Railway application service plus Railway PostgreSQL, for staging (auto-deploy from `main`) and production (tagged release with approval).
- Health check path `/api/ready` (database-aware). `/api/health` for liveness.
- Migrations run via `prisma migrate deploy` only, after a pre-release backup in production.
- Secrets only in Railway variables, validated at startup by `lib/env.ts`.
