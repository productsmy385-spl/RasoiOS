---
title: "Slice 01 Tenant Isolation Security Specification"
document_type: "SLICE_SECURITY"
project: "Restaurant SaaS Platform (RASOIOS)"
project_owner: "Gopala Krishna"
status: "IMPLEMENTED"
version: "1.0"
created: "2026-09-15"
last_updated: "2026-09-15"
author: "Gopala Krishna"
review_owner: "Gopala Krishna"
target_slice: "Slice 01"
target_start_date: "2026-09-15"
target_end_date: "2026-09-22"
priority: "CRITICAL"
dependencies: []
related_documents: ["slice-01-plan.md", "../../lib/auth/tenant-context.ts"]
related_decisions: ["ADR-003"]
---

# Slice 01 Tenant Isolation Security Specification

- **Server-Side Enforcement**: `resolveTenantContext(session, requestedTenantId)` validates active session user, active status, membership in target tenant, and active tenant status.
- **Cross-Tenant Rejection**: Attempting to resolve context for a tenant ID where the user lacks membership throws `TenantAccessDeniedError`.
- **Suspended Tenant Rejection**: Access to suspended tenants throws `TenantSuspendedError`.
