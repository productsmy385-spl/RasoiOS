---
title: "Frontend Security & UI Defense-in-Depth"
document_type: "FRONTEND_SECURITY"
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
related_documents: ["frontend.md", "../security/tenant-isolation.md"]
related_decisions: ["ADR-003"]
---

# Frontend Security & UI Defense-in-Depth

- **UI Hiding is NOT Authorization**: Hiding a button or menu link in React is for user experience only. Server-side validation MUST re-verify permissions on every action.
- **XSS Prevention**: React automatically escapes strings rendered in JSX. `dangerouslySetInnerHTML` is strictly prohibited.
- **No Private Data Leakage in Public Routes**: `/r/[slug]` route handlers MUST filter returned JSON fields to exclude staff data, internal IDs, transactions, or audit logs.
