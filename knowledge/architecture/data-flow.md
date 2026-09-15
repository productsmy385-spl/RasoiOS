---
title: "Data Flow & Request Lifecycle"
document_type: "DATA_FLOW"
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
related_documents: ["architecture.md"]
related_decisions: ["ADR-003"]
---

# Data Flow & Request Lifecycle

```
[ Request Received ]
         │
         ▼
[ Clerk Middleware: Validate Session JWT ]
         │
         ▼
[ Resolve UserTenant Membership from PostgreSQL ]
         │
         ▼
[ Build Tamper-Proof TenantContext ] ──► (Reject if inactive/suspended)
         │
         ▼
[ Execute Server Action / Route Handler ]
         │
         ▼
[ Prisma DB Query: where: { tenantId: context.tenantId } ]
         │
         ▼
[ Return Sanitized Data / Create Audit Log ]
```
