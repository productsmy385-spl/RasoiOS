---
title: "Integration Architecture"
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
related_documents: ["../implementation/slice-01/architecture.md","../implementation/slice-01/api.md","../decisions/RASOIOS-ADR-007.md"]
related_decisions: ["RASOIOS-ADR-004","RASOIOS-ADR-007","RASOIOS-ADR-011"]
---

# Integration Architecture
> **Canonical source:** [`../implementation/slice-01/architecture.md`](../implementation/slice-01/architecture.md). This domain file keeps only the durable summary for integrations (§2, §6). Detail lives in the canonical
> file and is not repeated here (knowledge/README.md §Document responsibilities).


| Integration | Mechanism | Authentication | Failure behaviour |
|---|---|---|---|
| Clerk sign-in | Clerk components + `auth()` | Clerk session | Error page with 503 for infrastructure failure (never "signed out") |
| Clerk invitations / session revocation | Backend API from `lib/auth/clerk-admin.ts` | `CLERK_SECRET_KEY` | Typed error; membership stays INVITED with resend |
| Clerk webhooks | `POST /api/webhooks/clerk` | Svix signature | 400 on invalid signature; idempotent handlers |
| Print agent | `/api/v1/print-agent/{pair,heartbeat,config,jobs/claim,jobs/:id/ack}` | Bearer token (SHA-256 at rest) | Lease expiry re-queues; retries with backoff; FAILED visible |

The v1.0 description "polls /api/print-jobs/poll … passing Bearer <AGENT_API_TOKEN>" did not match the code: that route took `tenantId` from the query and had no
token (BA-01). It is replaced by RASOIOS-ADR-007.
