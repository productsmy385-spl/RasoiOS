---
title: "Requirements Traceability Matrix"
document_type: "TRACEABILITY"
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
related_documents: ["prd.md", "milestones.md"]
related_decisions: ["ADR-001", "ADR-002", "ADR-003", "ADR-004"]
---

# Requirements Traceability Matrix

| PRD Req ID | Description | Slice | Target API / Module | Database Entity | Verification Test |
|---|---|:---:|---|---|---|
| **PR-001** | Server tenant context isolation | Slice 01 | `lib/auth/tenant-context.ts` | `UserTenant` | `tests/unit/tenant-context.test.ts` |
| **PR-002** | Role-Based Access Control (6 roles)| Slice 01 | `lib/auth/permissions.ts` | `UserTenant.role` | `tests/unit/permissions.test.ts` |
| **PR-003** | Clerk Email OTP Authentication | Slice 02 | `lib/auth/clerk.ts` | `User.clerkId` | Auth session tests |
| **PR-004** | Public Tenant Website Routing | Slice 02 | `app/r/[slug]/page.tsx` | `Tenant.slug` | E2E routing test |
| **PR-006** | Menu Category Management | Slice 03 | `app/api/categories/route.ts` | `MenuCategory` | Category CRUD tests |
| **PR-007** | Decimal Money & Menu Pricing | Slice 03 | `app/api/menu-items/route.ts` | `MenuItem.price` | Decimal precision test |
| **PR-009** | Server Totals & Price Snapshots | Slice 04 | `services/order-service.ts` | `OrderItem` | Snapshot unit test |
| **PR-012** | Sequential KOT Generation | Slice 05 | `services/kot-service.ts` | `KOTTicket` | KOT generation test |
| **PR-014** | Cloud Thermal Print Queue | Slice 05 | `app/api/print-jobs/route.ts` | `PrintJob` | Print agent integration test |
| **PR-016** | POS Transaction Records | Slice 06 | `services/payment-service.ts` | `Transaction` | Transaction audit test |
