---
title: "System Context & Boundaries"
document_type: "SYSTEM_CONTEXT"
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
related_documents: ["architecture.md"]
related_decisions: ["ADR-001"]
---

# System Context & Boundaries

- **External Auth Provider**: Clerk (Email OTP verification, JWT session issuance).
- **Primary Database**: PostgreSQL hosted on Railway with automatic SSL TLS encryption.
- **Local Print Agent Daemon**: Lightweight Node/Go executable running inside restaurant local network. Communicates outbound over HTTPS/WSS to Railway application server.
