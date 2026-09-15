---
title: "Master Knowledge Base Directory & Reading Guide"
document_type: "INDEX"
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
related_documents: ["KNOWLEDGE-BASE.md", "decisions.md"]
related_decisions: ["RASOIOS-ADR-001", "RASOIOS-ADR-002", "RASOIOS-ADR-003", "RASOIOS-ADR-004"]
---

# Master Knowledge Base Directory

Welcome to the **Restaurant SaaS Platform (RASOIOS)** Knowledge Base. This directory is the single, canonical source of truth for all product requirements, engineering architecture, UI/UX design tokens, security controls, database ERD schemas, and slice-by-slice implementation plans.

## Reading Order Guidelines

1. **For Product & Business Context**:
   - Start with [`KNOWLEDGE-BASE.md`](file:///c:/Users/Gopala%20Krishna/OneDrive/Desktop/RASOIOS/knowledge/KNOWLEDGE-BASE.md)
   - Read [`product/product-thesis.md`](file:///c:/Users/Gopala%20Krishna/OneDrive/Desktop/RASOIOS/knowledge/product/product-thesis.md) and [`product/prd.md`](file:///c:/Users/Gopala%20Krishna/OneDrive/Desktop/RASOIOS/knowledge/product/prd.md)
   - Review [`people.md`](file:///c:/Users/Gopala%20Krishna/OneDrive/Desktop/RASOIOS/knowledge/people.md) and [`milestones.md`](file:///c:/Users/Gopala%20Krishna/OneDrive/Desktop/RASOIOS/knowledge/milestones.md)

2. **For Architecture & Security Engineers**:
   - Read [`architecture/architecture.md`](file:///c:/Users/Gopala%20Krishna/OneDrive/Desktop/RASOIOS/knowledge/architecture/architecture.md)
   - Read [`security/tenant-isolation.md`](file:///c:/Users/Gopala%20Krishna/OneDrive/Desktop/RASOIOS/knowledge/security/tenant-isolation.md)
   - Review [`decisions/`](file:///c:/Users/Gopala%20Krishna/OneDrive/Desktop/RASOIOS/knowledge/decisions/README.md) for RASOIOS-ADRs

3. **For Database & Backend Engineers**:
   - Read [`database/erd.md`](file:///c:/Users/Gopala%20Krishna/OneDrive/Desktop/RASOIOS/knowledge/database/erd.md) and [`database/data-dictionary.md`](file:///c:/Users/Gopala%20Krishna/OneDrive/Desktop/RASOIOS/knowledge/database/data-dictionary.md)

4. **For Frontend & UI/UX Engineers**:
   - Read [`design/design-system.md`](file:///c:/Users/Gopala%20Krishna/OneDrive/Desktop/RASOIOS/knowledge/design/design-system.md) and [`frontend/routing.md`](file:///c:/Users/Gopala%20Krishna/OneDrive/Desktop/RASOIOS/knowledge/frontend/routing.md)

5. **For AI Coding Agents & Developers Implementing Slices**:
   - Check [`implementation/`](file:///c:/Users/Gopala%20Krishna/OneDrive/Desktop/RASOIOS/knowledge/implementation/) for the specific slice directory (e.g., [`slice-01/`](file:///c:/Users/Gopala%20Krishna/OneDrive/Desktop/RASOIOS/knowledge/implementation/slice-01/README.md)).

---

## Folder Map

- `product/`: Vision, PRD, personas, business rules, scope.
- `architecture/`: Next.js App Router, system context, cloud thermal printing queue.
- `design/`: Design tokens, colors (#D97706, #10B981, #1A1715), typography (Playfair Display, Plus Jakarta Sans), components.
- `frontend/`: App Router structure, routes, permission-aware UI states.
- `security/`: Zero-trust tenant isolation, RBAC matrix, Clerk Email OTP bounds.
- `database/`: Prisma ERD, NUMERIC decimal money handling, order historical snapshotting.
- `operations/`: Railway deployment, health monitoring, backups.
- `decisions/`: Architecture Decision Records (RASOIOS-ADRs).
- `implementation/`: Slice 01 to Slice 08 self-contained implementation specifications.
