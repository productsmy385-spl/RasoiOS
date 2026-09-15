---
title: "Production Deployment Policy"
document_type: "OPERATIONS"
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
related_documents: ["railway.md"]
related_decisions: ["ADR-001"]
---

# Production Deployment Policy

- All deployments targeting production must execute automated build, typecheck, unit, integration, and tenant-isolation test suites prior to release.
- Deployment target: Railway Application Service connected to GitHub main branch.
