---
title: "RASOIOS-ADR-003: Server-Side Context-Derived Tenant Isolation"
document_type: "ADR"
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
related_documents: ["../security/tenant-isolation.md"]
related_decisions: []
---

# RASOIOS-ADR-003: Server-Side Context-Derived Tenant Isolation

## Context
Client-side specified `tenantId` (in request bodies, headers, or query parameters) represents a critical IDOR security vulnerability.

## Decision
Tenant context is resolved strictly server-side by mapping the Clerk authenticated user ID to their active `UserTenant` record in PostgreSQL. Request-supplied `tenantId` is never trusted for authorization.

## Consequences
- Guaranteed cross-tenant data isolation.
- Mandates server-side authorization checks on every protected route and API handler.

## Subsequent decisions

- Implemented by RASOIOS-ADR-006 (identity and active tenant resolution) and RASOIOS-ADR-008 (tenant-scoped data access), both APPROVED 2026-09-15 (gate S1-P01-T010). This decision remains in force.
