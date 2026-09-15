---
title: "Tenant Isolation Security Specification"
document_type: "TENANT_ISOLATION"
project: "Restaurant SaaS Platform (RASOIOS)"
project_owner: "Gopala Krishna"
status: "APPROVED"
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
related_documents: ["security.md", "../lib/auth/tenant-context.ts"]
related_decisions: ["ADR-003"]
---

# Tenant Isolation Security Specification

## Mandatory Execution Pattern
```ts
// EVERY protected Server Action or API Handler MUST follow this sequence:
export async function getRestaurantOrdersAction(requestedTenantId?: string) {
  // 1. Resolve Clerk session
  const session = await getAuthenticatedSession();
  
  // 2. Resolve server-validated TenantContext
  const context = resolveTenantContext(session, requestedTenantId);
  
  // 3. Check role permission
  requirePermission(context, "order:create");
  
  // 4. Query PostgreSQL with MANDATORY tenantId filter
  return prisma.order.findMany({
    where: { tenantId: context.tenantId },
  });
}
```
