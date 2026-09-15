---
title: "Canonical Product & Engineering Knowledge Base Specification"
document_type: "MASTER_SPEC"
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
related_documents: ["README.md", "decisions.md"]
related_decisions: ["RASOIOS-ADR-001", "RASOIOS-ADR-002", "RASOIOS-ADR-003", "RASOIOS-ADR-004"]
---

# Master Product & Engineering Specification

## 1. Project Identity & Governance
- **Project Name**: Restaurant SaaS Platform (RASOIOS)
- **Product Category**: Restaurant Operations & Digital Management Platform
- **Product Type**: Multi-Tenant Restaurant Software Platform
- **Project Owner**: Gopala Krishna
- **Current Date**: 2026-09-15
- **Status**: ACTIVE DEVELOPMENT

---

## 2. Commercial Model (LOCKED)
- **Software Product / License Model**: The software is sold as a restaurant product/license.
- **Strictly Prohibited**:
  - Subscription tiers (Starter, Professional, Business, Enterprise).
  - Recurring monthly SaaS tenant billing models.
  - Commercial feature-gating flags based on payment tiers.
- **`UserTenant` Entity Meaning**: Technical authorization and membership context. It does NOT represent a commercial subscription tier.
- **Optional Commercial Services**: Hardware sales, custom development, initial setup/implementation, and additional outlet deployment contracts.

---

## 3. Technology Stack Choice
- **Application Framework**: Next.js 15 (App Router, Server Actions, TypeScript strict mode)
- **Authentication**: Clerk (Email OTP authentication)
- **Database**: PostgreSQL
- **ORM**: Prisma ORM
- **Deployment Target**: Railway
- **PWA**: Progressive Web App installable shell
- **Thermal Printing Architecture**: Cloud Print Job Queue + Local Restaurant Thermal Print Agent (polling USB/LAN ESC/POS printers)

---

## 4. Multi-Tenancy Security (HIGHEST PRIORITY)
1. **Server-Side Context Resolution**: Tenant context is resolved exclusively from the authenticated session JWT mapped to PostgreSQL `UserTenant`.
2. **Zero Client Trust**: Request body, query parameter, header, or URL `tenantId` values are NEVER trusted for authorization.
3. **Database Scoping**: All tenant queries explicitly scope `where: { tenantId: context.tenantId }`.

---

## 5. Implementation Timeline & Slice Map (2026-09-15 to 2026-11-22)

| Slice ID | Name | Start Date | Target End Date | Status |
|---|---|:---:|:---:|:---:|
| **Slice 01** | Foundation + Multi-Tenant Core | 2026-09-15 | 2026-09-22 | **IMPLEMENTED** |
| **Slice 02** | Restaurant Profile + Public Website + Design System + PWA | 2026-09-23 | 2026-09-30 | PLANNED |
| **Slice 03** | Menu + Daily Menu | 2026-10-01 | 2026-10-08 | PLANNED |
| **Slice 04** | Orders + Customers | 2026-10-09 | 2026-10-18 | PLANNED |
| **Slice 05** | Kitchen + KOT + Printing | 2026-10-19 | 2026-10-28 | PLANNED |
| **Slice 06** | Transactions + Reports | 2026-10-29 | 2026-11-05 | PLANNED |
| **Slice 07** | Social Menu + Sharing | 2026-11-06 | 2026-11-12 | PLANNED |
| **Slice 08** | Production Hardening + Observability + Release | 2026-11-13 | 2026-11-22 | PLANNED |

*Note: All dates are calculated starting from 2026-09-15 and marked as ESTIMATED where future team capacity varies.*
