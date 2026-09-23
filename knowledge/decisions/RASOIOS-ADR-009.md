---
title: "RASOIOS-ADR-009: Operational Screen Refresh via Cursor-Based Polling"
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
dependencies: ["RASOIOS-ADR-001"]
related_documents: ["../implementation/slice-01/architecture.md", "../implementation/slice-01/api.md", "../implementation/slice-01/frontend.md"]
related_decisions: ["RASOIOS-ADR-001", "RASOIOS-ADR-007"]
---

# RASOIOS-ADR-009: Operational Screen Refresh via Cursor-Based Polling

- **ID:** RASOIOS-ADR-009
- **Date:** 2026-09-15
- **Owner:** Gopala Krishna (Project Owner)
- **Status:** APPROVED — 2026-09-15, Gopala Krishna (Project Owner), decision gate S1-P01-T010.

## Context

The kitchen board, order board and print console must show new and changed records without a
manual reload (brief §29 "refresh/realtime strategy"). The baseline polls whole lists through
server actions every 10 s, 15 s and 8 s (`app/restaurant/kds/page.tsx:80`,
`app/restaurant/orders/page.tsx:89`, `app/restaurant/printing/page.tsx:59`) [fact]. Server actions
are POST requests that run one at a time per client and are not meant for polling reads.

## Problem

Choose a refresh mechanism that works on Railway with the approved stack (Next.js, PostgreSQL)
and no new infrastructure. It must keep kitchen latency low (a new ticket visible within ~5 s)
and degrade visibly, not silently, when the connection drops.

## Decision

1. Polled reads use **GET Route Handlers** under `/api/v1/…` (`RH-ORD-01`, `RH-KOT-01`,
   `RH-PRN-01`) authenticated by the Clerk session cookie and scoped by server-derived tenant context
   (ADR-006, ADR-008).
2. **Cursor protocol.** The request carries `since=<ISO timestamp>` (the server `updated_at` watermark from
   the previous response). The response returns rows with `updated_at > since` (including
   status changes to terminal states, so clients can remove them) plus `serverTime` for the next cursor.
   The first request (no `since`) returns the active set. The server caps results at 200 per response and
   sets `hasMore`.
3. **Intervals.** Kitchen board 5 s, order board 10 s, print console 10 s, dashboard widgets 30 s.
   Polling pauses while `document.visibilityState = hidden`, and resumes with an immediate fetch.
4. **Staleness is visible.** Each board shows "Updated hh:mm:ss" in restaurant timezone. After 3 missed
   intervals it shows a warning banner "Connection lost — retrying", with exponential backoff capped at 30 s.
5. Mutations stay as Server Actions. After a successful mutation the client refetches immediately.
6. `Cache-Control: no-store` on polled endpoints. Indexes `(tenant_id, updated_at)` support the cursor.

## Alternatives considered

| Alternative | Why not chosen |
|---|---|
| Server-Sent Events | Needs long-lived connections per screen and per-replica fan-out (PostgreSQL LISTEN/NOTIFY or a broker); reasonable follow-up once load is known |
| WebSockets (Socket.IO etc.) | New runtime and infrastructure outside the Next.js request model; not in ADR-001 |
| Third-party realtime (Pusher, Ably) | New vendor, cost and data-sharing decision; not requested |
| Keep polling via Server Actions | Serialised POSTs and full-list payloads; no cursor |

## Consequences

- Load: 1 kitchen screen = 12 req/min. A restaurant with 3 screens ≈ 36–60 req/min of cheap indexed queries.
- Worst-case visibility of a new KOT ≈ poll interval (5 s) plus render time.
- An SSE upgrade later only changes the transport. The cursor contract stays.

## Security impact

GET endpoints are read-only (no CSRF exposure). They require an authenticated session plus the
permissions `kot:read` / `order:read` / `print_job:read`. Tenant scope is server-derived. Kitchen payloads
exclude customer phone and email (`api.md` RH-KOT-01 projection).

## Database impact

Indexes `(tenant_id, updated_at)` on `orders`, `kot_tickets`, `print_jobs`.

## Migration impact

None beyond `0001_init`.

## Related documents

`implementation/slice-01/api.md` (RH-ORD-01, RH-KOT-01, RH-PRN-01), `frontend.md` (Kitchen, Orders, Printing).
