---
title: "Threat Model & Attack Vector Mitigation"
document_type: "THREAT_MODEL"
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
priority: "CRITICAL"
dependencies: []
related_documents: ["security.md"]
related_decisions: ["ADR-003"]
---

# Threat Model & Attack Vector Mitigation

| Threat Vector | Description | Mitigation Strategy |
|---|---|---|
| **IDOR / Tenant Leak** | User A manipulates `tenantId` in request to fetch Tenant B orders. | Rejected server-side by `resolveTenantContext()` + `assertTenantOwnership()`. |
| **Privilege Escalation** | Cashier sends request to edit menu prices or refund orders. | Rejected by `requirePermission(context, "refund:process")`. |
| **SQL Injection** | Malicious SQL string injected into menu search query. | Sanitized by Prisma parameterized query engine. |
| **Cross-Tenant Print Leak**| Agent for Tenant A polls print queue for Tenant B. | Server verifies agent API key maps strictly to Tenant A. |
