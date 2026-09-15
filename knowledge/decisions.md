---
title: "Architecture Decision Records (ADR) Summary"
document_type: "ADR_INDEX"
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
related_documents: ["decisions/RASOIOS-ADR-001.md", "decisions/RASOIOS-ADR-002.md", "decisions/RASOIOS-ADR-003.md", "decisions/RASOIOS-ADR-004.md"]
related_decisions: ["RASOIOS-ADR-001", "RASOIOS-ADR-002", "RASOIOS-ADR-003", "RASOIOS-ADR-004"]
---

# RASOIOS Architecture Decision Records (ADR) Summary

This document summarizes the key Architecture Decision Records governing the project. Detailed ADRs are located under [`decisions/`](file:///c:/Users/Gopala%20Krishna/OneDrive/Desktop/RASOIOS/knowledge/decisions/README.md).

## ADR Overview Index

1. **[RASOIOS-ADR-001: Technical Stack Selection](file:///c:/Users/Gopala%20Krishna/OneDrive/Desktop/RASOIOS/knowledge/decisions/RASOIOS-ADR-001.md)**: Next.js 15 App Router, TypeScript Strict Mode, PostgreSQL, Prisma ORM, Clerk Authentication, and Railway deployment.
2. **[RASOIOS-ADR-002: Commercial License Model vs SaaS Subscription Tiers](file:///c:/Users/Gopala%20Krishna/OneDrive/Desktop/RASOIOS/knowledge/decisions/RASOIOS-ADR-002.md)**: Sold strictly as a software product/license. NO subscription tiers (Starter/Pro/Enterprise) or recurring tenant billing.
3. **[RASOIOS-ADR-003: Server-Side Context-Derived Tenant Isolation](file:///c:/Users/Gopala%20Krishna/OneDrive/Desktop/RASOIOS/knowledge/decisions/RASOIOS-ADR-003.md)**: Zero trust for client-supplied `tenantId`. Server resolves context from Clerk session mapped to PostgreSQL `UserTenant`.
4. **[RASOIOS-ADR-004: Cloud Thermal Printing Architecture](file:///c:/Users/Gopala%20Krishna/OneDrive/Desktop/RASOIOS/knowledge/decisions/RASOIOS-ADR-004.md)**: Cloud enqueues ESC/POS print jobs in PostgreSQL; lightweight local agent polls endpoint and prints to USB/LAN printers.
