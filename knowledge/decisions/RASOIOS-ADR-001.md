---
title: "RASOIOS-ADR-001: Technical Stack Selection"
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
related_documents: ["../architecture/architecture.md"]
related_decisions: []
---

# RASOIOS-ADR-001: Technical Stack Selection

## Context
The platform requires a modern, high-performance web framework, strict static typing, robust database schema management, passwordless email OTP authentication, and streamlined cloud hosting.

## Decision
Select Next.js 15 (App Router, TypeScript strict mode), PostgreSQL database, Prisma ORM, Clerk Authentication, Tailwind CSS, Vitest, and Railway deployment.

## Consequences
- Single full-stack TypeScript codebase for public website, manager console, kitchen interface, and API routing.
- High developer productivity and rapid type-safe schema migrations.
