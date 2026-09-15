---
title: "Product Requirements Document (PRD)"
document_type: "PRD"
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
related_documents: ["product-thesis.md", "business-rules.md"]
related_decisions: ["ADR-001", "ADR-002", "ADR-003", "ADR-004"]
---

# Product Requirements Document (PRD)

## 1. Requirement Registry

| Req ID | Category | Requirement Description | Priority | Target Slice |
|---|---|---|:---:|:---:|
| **PR-001** | Multi-Tenancy | Server-side tenant context resolution; zero trust for client `tenantId`. | MUST | Slice 01 |
| **PR-002** | Security | Role-Based Access Control (RBAC) supporting 6 distinct roles. | MUST | Slice 01 |
| **PR-003** | Auth | Clerk Email OTP passwordless authentication. | MUST | Slice 02 |
| **PR-004** | Branding | Public tenant website routing via slug/subdomain (`/r/[slug]`). | MUST | Slice 02 |
| **PR-005** | PWA | Installable Progressive Web App manifest and responsive layout. | MUST | Slice 02 |
| **PR-006** | Menu | Category management (create, edit, reorder, delete). | MUST | Slice 03 |
| **PR-007** | Menu | Item pricing (Decimal NUMERIC persistence, variants, add-ons). | MUST | Slice 03 |
| **PR-008** | Menu | Daily menu publishing and unpublishing controls. | MUST | Slice 03 |
| **PR-009** | Orders | Server-side total calculation and price snapshotting on `OrderItem`. | MUST | Slice 04 |
| **PR-010** | Orders | Order status state machine (`NEW` -> `ACCEPTED` -> `PREPARING` -> `READY` -> `COMPLETED`). | MUST | Slice 04 |
| **PR-011** | Customer | Tenant-isolated customer phone registry. | MUST | Slice 04 |
| **PR-012** | KOT | Sequential Kitchen Order Ticket numbering per tenant. | MUST | Slice 05 |
| **PR-013** | Kitchen | Real-time Kitchen Display System (KDS) filtered by kitchen station. | MUST | Slice 05 |
| **PR-014** | Printing | Database print job queue for ESC/POS thermal printers. | MUST | Slice 05 |
| **PR-015** | Printing | Local thermal print agent API polling and execution feedback. | MUST | Slice 05 |
| **PR-016** | Transactions| POS financial transactions (Cash, Card, UPI) with audit log. | MUST | Slice 06 |
| **PR-017** | Reports | Tenant-isolated daily sales and category performance reports. | MUST | Slice 06 |
| **PR-018** | Social | Social menu post preparation and status tracking. | SHOULD | Slice 07 |
| **PR-019** | Hardening | End-to-end multi-tenant cross-boundary security audit. | MUST | Slice 08 |
| **PR-020** | Observability| Structured JSON logging redacting passwords, tokens, and secrets. | MUST | Slice 08 |

## 2. Release Acceptance Criteria
- **Zero Cross-Tenant Leakage**: All 12 tenant isolation unit tests pass.
- **Strict Monetary Precision**: Decimal persistence; zero floating-point money calculations.
- **Production Build**: Clean Next.js compilation with zero TypeScript errors.
