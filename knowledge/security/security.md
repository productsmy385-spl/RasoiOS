---
title: "Security Master Policy & Zero-Trust Architecture"
document_type: "SECURITY"
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
related_documents: ["tenant-isolation.md", "threat-model.md"]
related_decisions: ["ADR-003"]
---

# Security Master Policy & Zero-Trust Architecture

- **Primary Directive**: Treat multi-tenant security as a non-negotiable hard requirement.
- **Rules**:
  1. Never trust client-supplied tenant IDs.
  2. Enforce server-side authorization on every endpoint.
  3. Never log secrets, passwords, session tokens, or Clerk keys.
  4. Redact sensitive user data in application logs.
  5. Audit security-sensitive operations to append-only `AuditLog`.
