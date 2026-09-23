---
title: "RASOIOS-ADR-007: Print Agent Authentication, Job Leasing and Delivery Semantics"
document_type: "ADR"
project: "Restaurant SaaS Platform"
project_owner: "Gopala Krishna"
slice: "SLICE-01"
status: "APPROVED"
version: "1.1"
created: "2026-09-15"
last_updated: "2026-09-15"
owner: "Gopala Krishna (Project Owner)"
planned_start: "2026-09-15"
planned_finish: "Not scheduled — execution-order plan"
dependencies: ["RASOIOS-ADR-004"]
related_documents: ["../implementation/slice-01/architecture.md", "../implementation/slice-01/api.md", "../implementation/slice-01/data-model.md", "../implementation/slice-01/threat-model.md"]
related_decisions: ["RASOIOS-ADR-003", "RASOIOS-ADR-004", "RASOIOS-ADR-011"]
---

# RASOIOS-ADR-007: Print Agent Authentication, Job Leasing and Delivery Semantics

- **ID:** RASOIOS-ADR-007
- **Date:** 2026-09-15
- **Owner:** Gopala Krishna (Project Owner)
- **Status:** APPROVED — 2026-09-15, Gopala Krishna (Project Owner), decision gate S1-P01-T010.

## Context

ADR-004 (APPROVED) says a local agent polls a PostgreSQL print queue "via authenticated TLS".
It does not define how the agent authenticates or how jobs are claimed. The baseline endpoint
takes `tenantId` from the query string with no credential (BA-01). Its poll claims jobs with
a non-atomic read-then-update (BA-22).

## Problem

1. Bind every agent request to exactly one tenant without trusting the request.
2. Stop two agents, or two concurrent polls, from printing the same job.
3. Handle agent crashes, offline printers and retries without losing tickets.
4. Allow a lost or stolen restaurant PC to be revoked.

## Decision

1. **Per-device credentials.** Each installed agent is a `PRINT_AGENT` row owned by one tenant.
   - A TENANT_ADMIN creates a pairing (`SA-AGT-01`). The server returns an 8-character
     pairing code once, stores only its SHA-256 hash, and expires it after 10 minutes. It is single-use.
   - The agent calls `RH-AGT-01 POST /api/v1/print-agent/pair` with the code and gets a
     256-bit random bearer token, shown once. The server stores `token_hash`
     (SHA-256 — high-entropy secret, so no slow KDF needed) and an 8-character `token_prefix` for display.
   - Every other agent call sends `Authorization: Bearer <token>`. The server hashes it, looks up
     an `ACTIVE` agent, and takes `tenant_id` from that row. **Agent request schemas contain no
     tenant field; unknown fields are rejected (422 VALIDATION_ERROR).**
   - Revocation (`SA-AGT-02`) sets `status = REVOKED`. The next call returns 401.
2. **Printer binding.** A `PRINTER` belongs to one tenant and is assigned to one agent. An agent
   can claim only jobs whose printer is assigned to it.
3. **Atomic lease-based claiming.** `RH-AGT-03 POST /api/v1/print-agent/jobs/claim` runs one
   transaction:
   `SELECT … FROM print_jobs WHERE tenant_id = $agentTenant AND printer_id IN ($agentPrinters)
   AND (status = 'PENDING' AND next_attempt_at <= now() OR status = 'PROCESSING' AND lease_expires_at < now())
   ORDER BY created_at LIMIT 10 FOR UPDATE SKIP LOCKED`.
   It then sets `status = PROCESSING`, `print_agent_id`, `claimed_at`, `lease_expires_at = now() + 60s`,
   `attempt_count += 1`, and a new `claim_token` (UUID) per job.
4. **Acknowledgement.** `RH-AGT-04 POST /api/v1/print-agent/jobs/{jobId}/ack` with
   `{ claimToken, result: PRINTED | FAILED, errorCode?, errorMessage? }`. It is accepted only when the
   job belongs to the agent's tenant, `print_agent_id` = caller, `status = PROCESSING` and
   `claim_token` matches. Repeating the same ack returns 200 with no change (idempotent). A stale claim
   token returns 409.
   - `PRINTED` → `printed_at`. This is the only way a job becomes PRINTED. **No server code path sets
     PRINTED without an agent acknowledgement.**
   - `FAILED` → if `attempt_count < max_attempts` (default 3): back to `PENDING` with
     `next_attempt_at = now() + 10s × 2^(attempt_count-1)`. Otherwise `FAILED`, surfaced in the UI for manual retry.
5. **Delivery semantics: at-least-once, with duplicate mitigation.** If an agent prints and crashes
   before acknowledging, the lease expires and the job is re-claimed. To reduce duplicates, the agent keeps a
   local journal of printed `jobId`s (24 h). It acknowledges a re-claimed job it has already printed
   without printing again. Reprints are explicit new jobs (`is_reprint = true`, dedupe key suffix `:reprint:n`).
6. **Dedupe on creation.** `PRINT_JOB.dedupe_key` is unique per tenant (for example `KOT:{kotId}:v1`,
   `RECEIPT:{orderId}:v{n}`). Creating the same logical job twice returns the existing job.
7. **Liveness.** The agent calls `RH-AGT-02 heartbeat` every 30 s (claim calls also update `last_seen_at`).
   The UI shows the agent as offline when `last_seen_at` is older than 90 s. Default poll interval 3 s ± 1 s jitter,
   with backoff to 15 s after 10 consecutive empty polls.
8. **Payload.** The server renders a structured, printer-agnostic document (header, lines with
   alignment/emphasis, cut). The agent encodes ESC/POS for the printer's configured width and codepage.
   Payloads carry only what is printed on the ticket, no internal IDs beyond the job ID, and no secrets.
9. **Agent implementation.** A TypeScript Node.js LTS program in `print-agent/` in this repository,
   built as a separate package. OS target and installer packaging are pending **Q-010**.

## Alternatives considered

| Alternative | Why not chosen |
|---|---|
| WebSocket/SSE push to agent | Long-lived connections through restaurant NAT, reconnection logic and Railway connection limits; polling meets latency needs (KOT within ~5 s) |
| One shared API key per tenant | No per-device revocation; a leaked key compromises every printer |
| mTLS client certificates | Certificate issuance and rotation burden for restaurant staff |
| Clerk user session on the agent | Ties a printer to a human account; sessions expire; staff turnover breaks printing |
| Exactly-once delivery | Not achievable across a physical printer without printer-side acknowledgements; documented at-least-once instead |

## Consequences

- New entities `PRINTER`, `PRINT_AGENT`; `PRINT_JOB` gains lease/claim/dedupe columns.
- The baseline `app/api/print-jobs/poll/route.ts` is deleted immediately as a critical fix (S1-P04-T008); the new queue is built in S1-P16-T001.
- Restaurants pair each agent once using a code displayed in `/restaurant/printing`.
- Rare duplicate prints remain possible after agent crashes. This is documented for users.

## Security impact

Closes BA-01 and BA-22. Threats T-007 (forged agent), T-008 (duplicate print) and T-001
(cross-tenant print access) are mitigated. Tokens are hashed at rest and never logged (logger redacts
`authorization`, `token`). Pairing and agent endpoints are rate-limited (ADR-011).

## Database impact

Adds `PRINTER`, `PRINT_AGENT`; `PRINT_JOB` adds `printer_id`, `print_agent_id`, `dedupe_key`,
`claim_token`, `lease_expires_at`, `next_attempt_at`, `attempt_count`, `max_attempts`, `claimed_at`,
`printed_at`, `failed_at`, `is_reprint`. Index `(tenant_id, printer_id, status, next_attempt_at)`.

## Migration impact

Part of migration baseline `0001_init`. No existing print data needs to be preserved (Q-017).

## Related documents

`implementation/slice-01/architecture.md` §6, `api.md` §Print Agent, `data-model.md` (PRINTER,
PRINT_AGENT, PRINT_JOB), `threat-model.md` T-007/T-008.
