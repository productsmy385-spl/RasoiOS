---
title: "RASOIOS-ADR-011: Rate Limiting, Request Integrity and Webhook Verification Without New Infrastructure"
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
related_documents: ["../implementation/slice-01/security.md", "../implementation/slice-01/api.md", "../implementation/slice-01/threat-model.md"]
related_decisions: ["RASOIOS-ADR-006", "RASOIOS-ADR-007"]
---

# RASOIOS-ADR-011: Rate Limiting, Request Integrity and Webhook Verification Without New Infrastructure

- **ID:** RASOIOS-ADR-011
- **Date:** 2026-09-15
- **Owner:** Gopala Krishna (Project Owner)
- **Status:** APPROVED — 2026-09-15, Gopala Krishna (Project Owner), decision gate S1-P01-T010.

## Context

The brief (§37, §38) requires rate limiting, CSRF protection and webhook verification. The approved stack
(ADR-001) has no cache or broker such as Redis. Railway services may run more than one replica
[assumption — replica count decided in S1-P27-T001], so in-memory limits are not reliable.
The baseline has no rate limiting and no webhooks [fact: no such code in `app/`, `lib/`].

## Problem

Protect unauthenticated and machine-facing endpoints from brute force and abuse. Protect cookie-authenticated
mutations from cross-site requests. Verify inbound webhooks. Do all of this without adding infrastructure.

## Decision

1. **PostgreSQL fixed-window limiter.** Table `RATE_LIMIT_BUCKET (bucket_key TEXT PK, window_start timestamptz,
   hit_count int, expires_at timestamptz)`. `lib/security/rate-limit.ts` performs one atomic
   `INSERT … ON CONFLICT … DO UPDATE SET hit_count = CASE WHEN window_start < $windowStart THEN 1 ELSE hit_count + 1 END … RETURNING hit_count`.
   Buckets are keyed by `scope:SHA-256(identifier)` so raw IPs and tokens are not stored. Expired rows are deleted
   opportunistically (1% of calls) and by the daily maintenance task in S1-P26-T005.
2. **Limits (initial; tuned in P28 load test).**

   | Scope | Identifier | Limit |
   |---|---|---|
   | `agent.pair` | client IP | 5 / 15 min |
   | `agent.api` | agent id | 120 / min |
   | `webhook.clerk` | source IP | 60 / min |
   | `public.order.submit` (only if Q-001 approves public ordering) | IP + tenant | 5 / 10 min |
   | `session.mutation` | user id | 120 / min |
   | `public.page` | — | Not limited in app; rely on caching (public pages are read-only) |

   A limit breach returns HTTP 429 with `Retry-After`, logs `security.rate_limited` and never reveals other buckets.
3. **OTP brute force** is handled by Clerk (the brief requires Clerk Email OTP). The application stores and logs no OTPs.
4. **CSRF.** Server Actions rely on Next.js's Origin/Host comparison for Server Actions
   [to be verified against the installed Next.js version in S1-P24-T002]. Cookie-authenticated
   Route Handlers are GET-only (read-only). A non-GET route handler that accepts cookies must call
   `assertSameOrigin(request)`. Session cookies stay `SameSite=Lax` (Clerk default). Agent and webhook endpoints
   do not use cookies.
5. **Webhook verification.** `RH-AUTH-01 POST /api/webhooks/clerk` verifies the Svix signature
   (`svix-id`, `svix-timestamp`, `svix-signature`) against `CLERK_WEBHOOK_SIGNING_SECRET` over the raw body. It rejects
   timestamps older than 5 minutes. Handlers are idempotent by construction (`user.updated` overwrites the synced
   fields; `user.deleted` sets the local user INACTIVE), so a replay inside the tolerance window has no additional
   effect. An invalid signature returns 400 and logs `security.webhook_rejected`.
   Webhook handling uses the `svix` package that Clerk documents for verification (new dependency, security-reviewed in S1-P24-T006).
6. **Security headers** (set in `next.config.ts` `headers()` / middleware): `Strict-Transport-Security`,
   `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`,
   `X-Frame-Options: DENY` (the product has no embedding use case), and a Content-Security-Policy built for Clerk's documented
   domains and self-hosted fonts (S1-P24-T001).

## Alternatives considered

| Alternative | Why not chosen |
|---|---|
| Redis / Upstash rate limiter | New infrastructure and vendor not in ADR-001 |
| In-memory token bucket | Incorrect with multiple replicas or restarts |
| Edge/WAF rate limiting | Not an approved component; availability on the chosen Railway plan unverified |
| Double-submit CSRF tokens everywhere | Duplicates the Server Action origin check; kept only for any future cookie-authenticated non-GET route handler |

## Consequences

- One extra indexed write per limited request (cheap at restaurant scale).
- The limiter fails **open** for `session.mutation` if the database is unavailable (the request would fail anyway).
  It fails **closed** for `agent.pair` and `webhook.clerk`.

## Security impact

Mitigates T-012 (CSRF), T-009 (webhook forgery), T-015 (brute-force agent pairing) and T-018 (polling/abuse DoS).

## Database impact

Adds `RATE_LIMIT_BUCKET` (not tenant-owned; contains hashed keys only).

## Migration impact

Part of `0001_init`.

## Implementation notes

- **2026-09-22 (S1-P03-T008):** webhook verification uses Clerk's first-party `verifyWebhook` from `@clerk/nextjs/webhooks` instead of adding the
  `svix` package. It verifies the same Svix / Standard Webhooks signature (`svix-id`, `svix-timestamp`, `svix-signature`) over the raw body,
  rejects timestamps more than 5 minutes old or in the future (`standardwebhooks`, a dependency Clerk already ships), and adds no new dependency.
  §5's behaviour is unchanged. [fact: `node_modules/standardwebhooks/dist/index.js` WEBHOOK_TOLERANCE_IN_SECONDS = 300; TC-AUTH-016]
- **2026-09-22 (S1-P03-T007):** limiter implemented in `lib/security/rate-limit.ts` with the §2 limits; `session.mutation` fails open, every other
  scope fails closed (503) when PostgreSQL is unavailable. [fact: TC-SEC-013]

## Related documents

`implementation/slice-01/security.md` §5, `api.md` §Conventions, `threat-model.md`.
