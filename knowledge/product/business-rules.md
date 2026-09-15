---
title: "Business Rules & Financial Domain Integrity"
document_type: "BUSINESS_RULES"
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
related_documents: ["prd.md", "../database/database.md"]
related_decisions: ["ADR-002"]
---

# Business Rules & Financial Domain Integrity

## 1. Monetary Calculation Rules
- **Rule BR-MONEY-01**: All monetary values (`price`, `totalAmount`, `taxRate`, `priceSnapshot`) MUST be stored using PostgreSQL `Decimal` / `NUMERIC(12, 2)` types.
- **Rule BR-MONEY-02**: Monetary totals MUST be calculated on the server. Client-provided totals or prices are strictly ignored.

## 2. Order Historical Snapshotting Rules
- **Rule BR-ORD-01**: `OrderItem` records MUST snapshot `itemNameSnapshot`, `priceSnapshot`, and `taxRateSnapshot` at order creation time. Subscriptions or future menu price changes MUST NOT retroactively alter historical financial records.

## 3. Order State Machine Rules
- Valid transitions: `NEW` -> `ACCEPTED` -> `PREPARING` -> `READY` -> `COMPLETED`.
- Cancellation (`CANCELLED`) allowed from `NEW` or `ACCEPTED`.
- Refund (`REFUNDED`) allowed from `COMPLETED` by authorized roles (`TENANT_ADMIN`, `MANAGER`).

## 4. Tenant Isolation Rules
- **Rule BR-[#TENANT-01]**: `UserTenant` represents technical authorization relationship. It does NOT represent a commercial subscription tier.
