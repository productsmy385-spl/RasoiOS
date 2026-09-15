---
title: "External & Internal Dependency Registry"
document_type: "DEPENDENCIES"
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
related_documents: ["architecture/architecture.md"]
related_decisions: ["ADR-001"]
---

# External & Internal Dependency Registry

- **Clerk Authentication**: Handles Email OTP verification and JWT session issuance (`@clerk/nextjs`).
- **PostgreSQL Database**: Relational datastore hosted on Railway.
- **Prisma ORM**: Data model mapping and schema migrations (`@prisma/client`, `prisma`).
- **Next.js 15**: Core application web framework (`next`, `react`, `react-dom`).
- **Lucide React**: System iconography library (`lucide-react`).
- **Tailwind CSS**: Utility-first styling engine (`tailwindcss`, `autoprefixer`, `postcss`).
- **Vitest**: Unit & tenant isolation test runner (`vitest`).
