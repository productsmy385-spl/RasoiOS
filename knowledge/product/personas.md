---
title: "User Personas Specification"
document_type: "PERSONAS"
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
related_documents: ["prd.md", "../security/rbac.md"]
related_decisions: []
---

# User Personas Specification

## 1. Platform Super Admin (`SUPER_ADMIN`)
- **Name**: Platform Owner (Gopala Krishna / Authorized Admin)
- **Goal**: Provision new restaurant tenants, inspect platform audit logs, activate/suspend restaurant accounts.
- **Pain Point**: Preventing tenant data leakage and maintaining platform stability.

## 2. Restaurant Owner / Admin (`TENANT_ADMIN`)
- **Name**: Restaurant General Manager
- **Goal**: Configure restaurant profile, branding, menu, staff accounts, roles, view financial reports.
- **Pain Point**: Complex software setups and hidden software subscription price hikes.

## 3. Operations Manager (`MANAGER`)
- **Name**: Shift Manager
- **Goal**: Publish daily menus, handle customer refunds, oversee POS cash drawers, manage staff shifts.

## 4. Cashier (`CASHIER`)
- **Name**: POS Cashier Operator
- **Goal**: Rapidly enter dine-in/takeaway orders, collect payments (Cash/Card/UPI), print customer receipts.

## 5. Kitchen Chef / Staff (`KITCHEN`)
- **Name**: Head Chef / Line Cook
- **Goal**: Clear KOT display cards on the kitchen tablet, update state from `PREPARING` to `READY`.

## 6. Waiter (`WAITER`)
- **Name**: Floor Staff
- **Goal**: Take table orders on mobile/tablet, send items directly to kitchen KOT.
