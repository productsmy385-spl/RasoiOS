---
title: "App Router Route Map & Route Protection Matrix"
document_type: "ROUTING"
project: "Restaurant SaaS Platform (RASOIOS)"
project_owner: "Gopala Krishna"
status: "APPROVED"
version: "1.0"
created: "2026-09-15"
last_updated: "2026-09-15"
author: "Gopala Krishna"
review_owner: "Gopala Krishna"
target_slice: "Slice 02"
target_start_date: "2026-09-23"
target_end_date: "2026-09-30"
priority: "HIGH"
dependencies: []
related_documents: ["frontend.md", "../security/rbac.md"]
related_decisions: ["ADR-003"]
---

# App Router Route Map & Route Protection Matrix

| Route | Access Level | Required Role / Permission |
|---|---|---|
| `/` | Public | Unauthenticated |
| `/r/[slug]` | Public | Unauthenticated (Exposes public data only) |
| `/sign-in` | Public | Unauthenticated |
| `/admin` | Protected | `SUPER_ADMIN` |
| `/admin/tenants` | Protected | `SUPER_ADMIN` (`tenant:manage_all`) |
| `/restaurant/dashboard` | Protected | `TENANT_ADMIN`, `MANAGER` |
| `/restaurant/menu` | Protected | `TENANT_ADMIN`, `MANAGER` (`menu:manage`) |
| `/restaurant/orders` | Protected | `TENANT_ADMIN`, `MANAGER`, `CASHIER`, `WAITER` |
| `/restaurant/kitchen` | Protected | `TENANT_ADMIN`, `MANAGER`, `KITCHEN`, `CASHIER`, `WAITER` |
| `/restaurant/transactions`| Protected | `TENANT_ADMIN`, `MANAGER`, `CASHIER` |
| `/restaurant/reports` | Protected | `TENANT_ADMIN`, `MANAGER` (`reports:view`) |
