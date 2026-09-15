---
title: "Database Migration & Schema Evolution Strategy"
document_type: "MIGRATION_STRATEGY"
project: "Restaurant SaaS Platform (RASOIOS)"
project_owner: "Gopala Krishna"
status: "APPROVED"
version: "1.0"
created: "2026-09-15"
last_updated: "2026-09-15"
author: "Gopala Krishna"
review_owner: "Gopala Krishna"
target_slice: "ALL"
target_start_date: "2026-09-15"
target_end_date: "2026-11-22"
priority: "HIGH"
dependencies: []
related_documents: ["database.md"]
related_decisions: ["ADR-001"]
---

# Database Migration & Schema Evolution Strategy

- **Development**: `npx prisma migrate dev --name <migration_name>` generates declarative SQL migration files under `prisma/migrations/`.
- **Production**: Deployment pipeline runs `npx prisma migrate deploy` automatically. Direct manual SQL DDL execution against production is forbidden.
- **Zero-Downtime Rule**: Schema changes involving column drops or renames must follow a two-step release to preserve backward compatibility during rolling deployments.
