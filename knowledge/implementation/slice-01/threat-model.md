---
title: "SLICE-01 Threat Model"
document_type: "THREAT_MODEL"
project: "Restaurant SaaS Platform"
project_owner: "Gopala Krishna"
slice: "SLICE-01"
status: "PROPOSED"
version: "2.0"
created: "2026-09-15"
last_updated: "2026-09-15"
owner: "Security Engineer (UNASSIGNED) — approval: Gopala Krishna"
planned_start: "2026-09-15"
planned_finish: "Not scheduled — execution-order plan"
dependencies: ["security.md", "tenant-isolation.md"]
related_documents: ["security.md", "tenant-isolation.md", "tenant-isolation-tests.md", "risks.md", "../../security/threat-model.md"]
related_decisions: ["RASOIOS-ADR-003", "RASOIOS-ADR-006", "RASOIOS-ADR-007", "RASOIOS-ADR-008", "RASOIOS-ADR-010", "RASOIOS-ADR-011"]
---

# SLICE-01 Threat Model

**Method:** threats are enumerated per trust boundary (browser ↔ app, app ↔ Clerk, agent ↔ app, app ↔ database, public ↔ app). Each is scored for
likelihood and impact (Low / Medium / High). Risk = combined rating (Low, Medium, High, Critical).

**Status values:**
- **EXPOSED** — the baseline code at `18941a9` is vulnerable today.
- **OPEN** — mitigation planned, not yet implemented.
- **MITIGATED** — implemented.
- **VERIFIED** — mitigation tests pass.
- **ACCEPTED** — residual risk accepted by the Project Owner.

Final sign-off happens in S1-P24-T009.

## 1. Trust boundaries and assets

| Boundary | Actors | Key assets |
|---|---|---|
| Public ↔ App | Anonymous diners, crawlers, attackers | Public menu data; availability of public site |
| Staff browser ↔ App | Tenant roles, SUPER_ADMIN | Orders, customers' PII, transactions, menu, staff, settings, audit |
| App ↔ Clerk | Clerk service, webhook deliveries | Identity, sessions, invitations |
| Print agent ↔ App | Restaurant PCs running the agent | Print queue content, agent tokens |
| Agent ↔ Printer (LAN/USB) | Restaurant network | Ticket output integrity |
| App ↔ PostgreSQL | Application runtime, migration role | All tenant data, audit log |
| Operators ↔ Railway/GitHub | Platform owner, CI | Secrets, deploys, backups |

## 2. Threat register

| Threat ID | Threat | Attack Surface | Likelihood | Impact | Risk | Mitigation | Test | Status |
|---|---|---|---|---|---|---|---|---|
| T-001 | **Cross-tenant access**: a Tenant A user reads or modifies Tenant B data | All tenant loaders, actions, route handlers; print poll endpoint | High (baseline exposed: BA-01, BA-02) | High | Critical | ADR-006 server-derived context; ADR-008 scoped data layer + composite FKs; SC-TEN-01…10 | TI-001…TI-062, ADV-001, ADV-004 | EXPOSED |
| T-002 | **IDOR**: guessing or reusing resource ids to access objects | Every `[id]` route and id-taking action | High | High | Critical | Scoped lookups; identical 404 (SC-TEN-04); UUIDs; composite FKs | TC-TENANT-003, ADV-002, ADV-003, ADV-023 | EXPOSED |
| T-003 | **Role escalation**: lower role performs higher-role actions or promotes itself | Staff actions; hidden UI actions; platform actions | Medium | High | High | Permission checks before lookup (SC-RBAC-01); hierarchy rules (SC-RBAC-04); platform role separation (SC-RBAC-03) | TC-RBAC-010, TC-RBAC-013, ADV-005, ADV-006, ADV-030 | EXPOSED (BA-09…BA-13) |
| T-004 | **Stolen session**: attacker uses a hijacked Clerk session cookie (shared POS device, XSS, malware) | Staff browsers, shared tablets | Medium | High | High | Clerk HttpOnly/Secure cookies (SC-SESS-01); session lifetime for shared devices (SC-SESS-04, Q-029); CSP (SC-HDR-02); revoke on deactivation (SC-AUTH-08) | ADV-024, TC-AUTH-014, TC-SEC-015 | OPEN |
| T-005 | **Malicious file upload**: SVG/polyglot/oversized images leading to XSS or DoS | Image uploads (only if Q-009) | Medium | Medium | Medium | Magic-byte check, re-encode, strip metadata, reject SVG, size caps, private bucket (SC-FILE-01/02) | TC-SEC-016, TC-SEC-017, ADV-020 | OPEN |
| T-006 | **Manipulated order price / total / tax / discount** from the client | Order creation, add items, public checkout | High (baseline trusts options: BA-16) | High | Critical | Server pricing from DB (ADR-010); strict schemas reject money keys (SC-VAL-02); modifier ownership checks | TC-ORDER-003, ADV-007, ADV-008, ADV-009 | EXPOSED |
| T-007 | **Forged print agent**: attacker impersonates an agent to read tickets or acknowledge jobs | Agent API | High (baseline unauthenticated: BA-01) | High | Critical | Per-agent hashed bearer tokens; tenant from token; revocation (ADR-007; SC-PRINT-01, SC-PRINT-09, SC-TEN-07) | TC-AGENT-001, TC-AGENT-003, ADV-012, ADV-013 | EXPOSED |
| T-008 | **Duplicate printing**: concurrent polls or crash-after-print reprint tickets, confusing the kitchen | Queue claim, agent crashes | High (baseline non-atomic poll: BA-22; duplicate KOT: BA-18) | Medium | High | `FOR UPDATE SKIP LOCKED` leases, claim tokens, dedupe keys, agent journal, idempotent KOTs (SC-PRINT-03…05) | TC-PRINT-004, TC-PRINT-005, TC-AGENT-008, TC-KOT-001, ADV-014 | EXPOSED |
| T-009 | **Webhook forgery**: fake Clerk webhooks deactivate or alter users | `/api/webhooks/clerk` | Medium | Medium | Medium | Svix signature, timestamp tolerance, idempotent handlers (SC-WH-01/02) | TC-AUTH-016, ADV-022 | OPEN |
| T-010 | **Data leakage**: private data exposed through public pages, RSC payloads, logs, audit states, print payloads, OG images | Public routes, logs, print payloads | Medium | High | High | Explicit projections (SC-PUB-01…03, SC-API-05); log/audit redaction (SC-LOG-02, SC-AUD-04); payload minimisation (SC-PRINT-07); kitchen projection (SC-RBAC-07) | TC-WEB-005, TC-OBS-002, TC-PRINT-009, TC-RBAC-011, ADV-025 | OPEN |
| T-011 | **Unauthorized export**: bulk extraction of customers/transactions | Report and list endpoints | Low | High | Medium | No export endpoints in SLICE-01 (Q-014); pagination caps (SC-API-04); report permission (`report:read`) | TI-049, ADV-028, TC-SEC-008 | OPEN |
| T-012 | **CSRF**: cross-site request triggers staff mutations | Server Actions, cookie route handlers | Low | High | Medium | Next.js Server Action origin check verified; GET-only cookie route handlers; `assertSameOrigin` (SC-CSRF-01/02) | TC-SEC-010, TC-SEC-011 | OPEN |
| T-013 | **Stored XSS** through menu, customer, order, social text | All renderers incl. public site, cards, receipts | Medium | High | High | React escaping; lint ban on `dangerouslySetInnerHTML`; escaped JSON-LD; CSP (SC-VAL-03, SC-HDR-02) | TC-SEC-002, TC-SEC-020, ADV-016 | OPEN |
| T-014 | **SSRF** via image URLs fetched by server (OG images, cards, uploads) | Branding, menu images, card renderer | Medium | Medium | Medium | https + host allowlist at write; allowlisted fetch with timeout/size cap; server never contacts printer addresses (SC-VAL-04, SC-PRINT-06) | TC-SEC-003, TC-WEB-009, TC-PRINT-007, ADV-017 | OPEN |
| T-015 | **Brute-force agent pairing** codes | `POST /api/v1/print-agent/pair` | Medium | High | High | 8-char codes from 32-symbol alphabet, 10-min expiry, single use, 5 attempts/15 min per IP fail-closed (SC-PRINT-02, SC-RL-01) | TC-AGENT-002, ADV-015 | OPEN |
| T-016 | **SQL injection** through search/filter inputs | Search params, raw queries | Low | High | Medium | Prisma parameterisation; ban unsafe raw APIs (SC-VAL-05) | TC-SEC-004, ADV-018 | OPEN |
| T-017 | **Authentication misconfiguration fails open** (placeholder keys disable auth) | Middleware, root layout | Medium (baseline exposed: BA-04) | High | Critical | Startup env validation; remove bypass (SC-AUTH-02, SC-SEC-01) | TC-AUTH-009, TC-FOUND-003 | EXPOSED |
| T-018 | **Denial of service / abuse** via polling, lookups, pairing, large payloads | Polling routes, lookup, actions | Medium | Medium | Medium | Rate limits (ADR-011); pagination and body caps; statement timeout; visibility-paused polling (ADR-009) | TC-SEC-008, TC-SEC-019, TC-KITCH-009, TC-DB-006, ADV-027 | OPEN |
| T-019 | **Invitation hijack**: attacker obtains access by controlling an email matching an invitation | Session resolver linking | Low | High | Medium | Link only Clerk-verified primary email to INVITED memberships; invite-only sign-up (SC-AUTH-05/06) | TC-AUTH-005, TC-AUTH-006, ADV-021 | OPEN |
| T-020 | **Insider refund / void fraud** by staff | Refund, void, day close | Medium | Medium | Medium | Permissions (refund/void TA/MGR only); reasons; same-day void rule; closed-day immutability; full audit (BR-TXN-04…06, SC-AUD-01) | TC-TXN-003, TC-TXN-004, TC-TXN-007, ADV-011 | OPEN |
| T-021 | **Audit log tampering** to hide actions | `audit_logs` table, app code | Low | High | Medium | DB trigger blocks UPDATE/DELETE; audit in same transaction; no delete endpoints (SC-AUD-02/03) | TC-AUDIT-002, TC-AUDIT-003 | OPEN |
| T-022 | **Printer command injection**: ESC/POS control bytes in text alter printer behaviour | Print payload text | Low | Low | Low | Sanitise control characters server and agent side (SC-VAL-07) | TC-PRINT-008, TC-AGENT-013, ADV-019 | OPEN |
| T-023 | **Cache leakage** of authenticated responses across users or tenants (CDN/ISR/service worker/shared device) | Next.js caching, service worker | Medium | High | High | `no-store` on authenticated routes; public ISR keyed by slug with public data only; SW never caches authenticated responses (SC-TEN-09, SC-HDR-03) | TC-SEC-006, TC-PWA-005, ADV-026 | EXPOSED (BA-37 SW fallback) |
| T-024 | **Dependency compromise** or vulnerable packages | npm supply chain | Medium | High | High | Lockfile; `npm audit` gate; Dependabot alerts; review of new dependencies (SC-DEP-01…03) | TC-FOUND-004, TC-SEC-021 | OPEN |
| T-025 | **Secrets leakage** (keys in repo, logs, client bundles) | Repo, logs, `NEXT_PUBLIC_` vars | Low | High | Medium | Env validation; secrets only in Railway; redaction; secret scanning (SC-SEC-01…03, SC-AUTH-10) | TC-FOUND-003, TC-AUTH-011, TC-SEC-021 | OPEN |
| T-026 | **SUPER_ADMIN account compromise or misuse** | Platform console | Low | High | Medium | Platform role separate from tenant data; no tenant operational access (Q-019); audited platform actions; bootstrap command confirmation | TC-ADMIN-006, TC-ADMIN-012, TC-RBAC-002 | OPEN |
| T-027 | **Stale privileges** after deactivation, role change or suspension | Long-lived sessions, open tabs | Medium | Medium | Medium | Authorization data read from DB each request (ADR-006 §4); session revocation (SC-AUTH-08) | TC-TENANT-005, TC-AUTH-014, ADV-029 | OPEN |
| T-028 | **Printer network exposure**: agent opens ports or lets LAN attackers inject jobs | Restaurant LAN, agent host | Low | Medium | Low | Agent is outbound-only (no listening sockets); TLS verification; OS credential store (SC-PRINT-08) | TC-AGENT-016, TC-AGENT-007 | OPEN |
| T-029 | **Enumeration** of tenants/resources via differing errors or timing | 404/403 differences, slugs | Medium | Low | Low | Identical not-found responses; single scoped query; slugs public by design | TC-TENANT-003, TC-WEB-004, ADV-002 | EXPOSED (baseline returns 403 for other-tenant ids) |
| T-030 | **Public order spam / fake orders** (only if public ordering approved) | Public checkout | High (if enabled; baseline enabled without limits) | Medium | High | Q-001 recommendation: disable; if approved, rate limits, idempotency, validation, no customer overwrite | TC-ORDER-012, TC-CUST-007 | EXPOSED |

## 3. Residual risks proposed for acceptance

| Residual | Reason | Owner decision |
|---|---|---|
| Rare duplicate print after agent crash between print and acknowledgement | Physical printers give no delivery receipt; the journal mitigates most cases (ADR-007 §5) | Pending (S1-P24-T009) |
| Shared-device session exposure within configured lifetime | Restaurant devices are shared by design; mitigated by lifetime settings (Q-029) and sign-out UI | Pending |
| No PostgreSQL row-level security | Application scoping plus composite FKs chosen (ADR-008) | Pending |

## 4. Changes from v1.0

The v1.0 threat model listed 4 threats. Its claim that the "server verifies agent API key maps strictly to Tenant A" was not implemented (BA-01). This version
supersedes it with 30 threats, marks baseline exposure honestly, and ties every mitigation to tests.
