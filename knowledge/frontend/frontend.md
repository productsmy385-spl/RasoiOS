---
title: "Frontend Application Architecture Overview"
document_type: "FRONTEND"
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
priority: "CRITICAL"
dependencies: []
related_documents: ["routing.md", "component-architecture.md"]
related_decisions: ["ADR-001", "ADR-003"]
---

# Frontend Application Architecture Overview

Next.js 15 App Router structure organized by domain responsibilities:
- `app/r/[slug]`: Public restaurant branding and digital menu website.
- `app/sign-in` & `app/sign-up`: Auth pages (Clerk Email OTP).
- `app/admin`: Super Admin console (tenants management, platform audit).
- `app/restaurant/dashboard`: Tenant portal overview.
- `app/restaurant/menu`: Menu categories, items, and daily menu editor.
- `app/restaurant/orders`: POS order entry and order status tracker.
- `app/restaurant/kitchen`: Real-time Kitchen Display System (KDS).
- `app/restaurant/transactions`: Financial transaction logs.
- `app/restaurant/reports`: Daily operational reports.
