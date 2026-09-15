---
title: "State Management & Data Fetching Patterns"
document_type: "STATE_MGMT"
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
related_documents: ["frontend.md"]
related_decisions: []
---

# State Management & Data Fetching Patterns

- **Server State**: Next.js Server Components for initial data fetching; Server Actions for mutations.
- **Client Form State**: React local state & Zod validation schemas.
- **Persistent Storage**: Avoid storing sensitive operational or tenant state in `localStorage` or `sessionStorage`.
