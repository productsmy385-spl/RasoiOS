---
title: "System Architecture Specification"
document_type: "ARCHITECTURE"
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
related_documents: ["system-context.md", "data-flow.md"]
related_decisions: ["ADR-001", "ADR-003", "ADR-004"]
---

# System Architecture Specification

## 1. Core Architecture Topology

```mermaid
graph TD
    Client[Browser / PWA / Tablet] -->|HTTPS| NextServer[Next.js App Router (Railway)]
    NextServer -->|Clerk Middleware| Auth[Clerk Auth & Email OTP]
    NextServer -->|Server-Side Auth Scoping| Context[Tenant Context Resolver]
    Context -->|Prisma Client| DB[(PostgreSQL Database)]
    PrintAgent[Local Print Agent] -->|Poll TLS API| NextServer
    PrintAgent -->|ESC/POS| ThermalPrinter[Local Thermal Receipt Printer]
```

## 2. Server Layer Architecture
- **App Router (`app/`)**: Server Components by default. Server Actions handle mutations with mandatory `resolveTenantContext()` execution.
- **Service Layer (`services/`)**: Enforces domain business logic (totals calculation, order state transitions, KOT generation).
- **Data Access Layer (`lib/db/prisma.ts`)**: Prisma ORM client configured with composite tenant indexes.
