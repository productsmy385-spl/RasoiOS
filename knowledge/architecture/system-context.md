---
title: "System Context"
document_type: "REFERENCE"
project: "Restaurant SaaS Platform"
project_owner: "Gopala Krishna"
slice: "SLICE-01"
status: "PROPOSED"
version: "2.0"
created: "2026-09-15"
last_updated: "2026-09-15"
owner: "Gopala Krishna (Project Owner)"
planned_start: "2026-09-15"
planned_finish: "Not scheduled — execution-order plan"
dependencies: []
related_documents: ["../implementation/slice-01/architecture.md"]
related_decisions: ["RASOIOS-ADR-001","RASOIOS-ADR-007"]
---

# System Context
> **Canonical source:** [`../implementation/slice-01/architecture.md`](../implementation/slice-01/architecture.md). This domain file keeps only the durable summary for system context (§2). Detail lives in the canonical
> file and is not repeated here (knowledge/README.md §Document responsibilities).


| External system | Relationship | Trust |
|---|---|---|
| Clerk | Email OTP sign-in, sessions, invitations; signed webhooks into the app | Identity provider only; authorization data stays in PostgreSQL |
| Railway | Hosts application and PostgreSQL | Operator-controlled |
| Local print agent | Outbound HTTPS from restaurant LAN; bearer token per device | Tenant-bound machine credential |
| Thermal printers | Reached only by the local agent (USB/TCP 9100) | Never contacted by the cloud server |
| Object storage | Only if Q-009 approves uploads | Private bucket, signed URLs |
| Social platforms | No integration; staff post manually | — |
