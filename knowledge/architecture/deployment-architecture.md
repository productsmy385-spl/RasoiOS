---
title: "Deployment Architecture & Railway Specification"
document_type: "DEPLOYMENT_SPEC"
project: "Restaurant SaaS Platform (RASOIOS)"
project_owner: "Gopala Krishna"
status: "APPROVED"
version: "1.0"
created: "2026-09-15"
last_updated: "2026-09-15"
author: "Gopala Krishna"
review_owner: "Gopala Krishna"
target_slice: "Slice 08"
target_start_date: "2026-11-13"
target_end_date: "2026-11-22"
priority: "CRITICAL"
dependencies: []
related_documents: ["architecture.md"]
related_decisions: ["ADR-001"]
---

# Deployment Architecture & Railway Specification

- **Hosting Platform**: Railway Application Service + Railway Managed PostgreSQL.
- **Build Command**: `npm run build`
- **Start Command**: `npm run start`
- **Database Migrations**: Executed via `npx prisma migrate deploy` in production release pipeline.
- **Environment Variables**: Managed securely via Railway secret store. Secrets never committed to Git.
