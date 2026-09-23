---
title: "Monitoring and Logging"
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
related_documents: ["../implementation/slice-01/architecture.md","../implementation/slice-01/security.md"]
related_decisions: []
---

# Monitoring and Logging

## Log schema (S1-P26-T001)
JSON lines: `timestamp`, `level`, `message`/`event`, `request_id`, `tenant_id` (id only), `user_id`, `route`, `status`, `latency_ms`, plus event-specific `meta`.

## Redaction (S1-P03-T009, S1-P26-T002)
Implemented in `lib/logger.ts` [fact, verified by TC-AUTH-011 and `tests/unit/logger.test.ts`, 2026-09-22].

- **Keys** (case-insensitive, `-`/`_` ignored) containing: password, otp, secret, token, authorization, cookie, set-cookie, session, clerk, pairingcode, apikey, svix-signature, signature, ticket, creditcard, cardnumber, cvv → `[REDACTED]`.
- **Secret-shaped values** in any string, including the message → `[REDACTED]`: `Bearer …`, `sk_/rk_(live|test)_…`, `whsec_…`, `v1,<base64>` webhook signatures, `__session=`/`__client_uat=` cookies, print-agent tokens `rsa_…`, JWTs `eyJ….….…`.
- **Masked values:** emails → `a***@domain`, E.164 phones → `+91********10`, card-like numbers → `[CARD]`.
- `Headers` objects, Maps, arrays and `Error` objects are sanitised the same way. Request and response bodies are never logged.
- Limitation: a bare 6-digit code inside free text cannot be recognised; code must never place OTPs in messages (Clerk handles OTPs, the app never sees them).

## Event catalogue
| Event | Emitted when |
|---|---|
| `security.auth_failed` | Session resolution fails for a protected request |
| `security.forbidden` | Permission denied |
| `security.not_found_burst` | ≥ 20 resource-id 404s per user in 5 minutes |
| `security.rate_limited` | Rate limit exceeded |
| `security.webhook_rejected` | Invalid webhook signature/timestamp |
| `security.agent_auth_failed` | Invalid/revoked agent token |
| `security.agent_foreign_printer` | Agent references a printer it does not own |
| `print.backlog_high` | > 10 PENDING jobs older than 2 minutes for a tenant |
| `print.failed_jobs` | Terminal print failures in the last hour |
| `agent.offline` | Active agent offline > 10 minutes during opening hours |
| `db.slow_query` | Query > 500 ms (no parameters logged) |
| `error.unhandled` | Unhandled server error (stack server-side only) |
| `maintenance.completed` / `maintenance.failed` | Maintenance job outcome |

## Health
`/api/health` (liveness) and `/api/ready` (database). Thresholds and alert routing are recorded in S1-P26-T007 and S1-P26-T008.
