---
title: "SLICE-01 Mandatory Tenant Isolation and Adversarial Tests"
document_type: "TEST_SPECIFICATION"
project: "Restaurant SaaS Platform"
project_owner: "Gopala Krishna"
slice: "SLICE-01"
status: "PROPOSED"
version: "2.0"
created: "2026-09-15"
last_updated: "2026-09-15"
owner: "QA Engineer and Security Engineer (UNASSIGNED) — approval: Gopala Krishna"
planned_start: "2026-09-15"
planned_finish: "Not scheduled — execution-order plan"
dependencies: ["tenant-isolation.md", "security.md", "api.md"]
related_documents: ["tenant-isolation.md", "testing.md", "threat-model.md", "security.md"]
related_decisions: ["RASOIOS-ADR-003", "RASOIOS-ADR-006", "RASOIOS-ADR-007", "RASOIOS-ADR-008"]
---

# SLICE-01 Mandatory Tenant Isolation and Adversarial Tests

## 1. Scenario setup

| Fixture | Definition |
|---|---|
| **Tenant A** | "Spice Route", slug `spice-route`, Asia/Kolkata, INR, website published |
| **Tenant B** | "Harbour Grill", slug `harbour-grill`, America/New_York, USD, website published |
| **User A** | Member of Tenant A only; tests run as each tenant role (TENANT_ADMIN unless stated) |
| **User B** | Member of Tenant B only |
| **User AB** | Member of both tenants (TENANT_ADMIN in A, CASHIER in B) for active-tenant scenarios |
| **Platform admin** | USER with `platform_role = SUPER_ADMIN`, no memberships |
| **Agent A / Agent B** | ACTIVE print agents of Tenant A / Tenant B with assigned printers |
| **Mirror data** | Both tenants have a category "Starters", item "Paneer Tikka", customer "Asha Rao", order numbers with the same sequence, so leaked rows are detectable by id and by content |

**Expected result for every TI case:** denied with **no data disclosure and no state change in Tenant B**. Unless stated otherwise:
- resource lookups by id → `404 NOT_FOUND` / not-found page (identical to a random UUID);
- operations requiring a permission User A's role lacks → `403 FORBIDDEN` before lookup;
- inputs carrying a tenant identifier → `422 VALIDATION_ERROR`.

Each test asserts the HTTP/action result **and** re-reads Tenant B rows directly from the database to prove nothing changed.

## 2. Tenant isolation scenarios (User A → Tenant B)

| ID | Resource | Action | Attempt | Endpoint(s) | Expected | Implemented in |
|---|---|---|---|---|---|---|
| TI-001 | MENU | READ | List menu items; assert no Tenant B item ids or names | LD-MENU-02 | Only Tenant A rows | S1-P10-T008 |
| TI-002 | MENU | READ | Open Tenant B item detail by id | LD-MENU-03 | 404 | S1-P10-T008 |
| TI-003 | MENU | UPDATE | Update Tenant B category by id | SA-MENU-02 | 404; B unchanged | S1-P10-T008 |
| TI-004 | MENU | DELETE | Archive Tenant B category | SA-MENU-03 | 404 | S1-P10-T008 |
| TI-005 | MENU | CREATE | Create item in Tenant B category id | SA-MENU-06 | 404; no row created | S1-P10-T008 |
| TI-006 | MENU | UPDATE | Change price of Tenant B item | SA-MENU-07 | 404 | S1-P10-T008 |
| TI-007 | MENU | DELETE | Archive Tenant B item | SA-MENU-08 | 404 | S1-P10-T008 |
| TI-008 | MENU | UPDATE | Toggle availability / publish of Tenant B item | SA-MENU-10, SA-MENU-11 | 404 | S1-P10-T008 |
| TI-009 | MENU | UPDATE | Replace variants of Tenant B item | SA-MENU-12 | 404 | S1-P10-T008 |
| TI-010 | MENU | CREATE | Assign Tenant B kitchen section to Tenant A item | SA-MENU-06 | 404 | S1-P10-T008 |
| TI-011 | DAILY MENU | READ | Load Tenant B daily menu by date (dates are not tenant-bound; must return A only) | LD-DMENU-01 | Tenant A data only | S1-P11-T005 |
| TI-012 | DAILY MENU | CREATE | Save draft containing Tenant B item ids | SA-DMENU-01 | 404; no rows | S1-P11-T005 |
| TI-013 | DAILY MENU | UPDATE | Publish / unpublish / delete Tenant B daily menu id | SA-DMENU-02, SA-DMENU-03, SA-DMENU-05 | 404 | S1-P11-T005 |
| TI-014 | SETTINGS | READ | Load settings; assert only Tenant A restaurant | LD-RST-01 | Tenant A only | S1-P25-T001 |
| TI-015 | SETTINGS | UPDATE | Update restaurant profile with `tenantId` of B in body | SA-RST-01 | 422; B unchanged | S1-P25-T001 |
| TI-016 | SETTINGS | UPDATE | Replace opening hours including Tenant B restaurant id | SA-RST-03 | 422/404 | S1-P25-T001 |
| TI-017 | SETTINGS | UPDATE | Change operational settings targeting B via query param | SA-RST-04 | Query ignored; only A changes | S1-P25-T001 |
| TI-018 | SETTINGS | UPDATE | Publish Tenant B website | SA-RST-06 | Only A affected | S1-P25-T001 |
| TI-019 | SETTINGS | UPDATE | Update/archive Tenant B kitchen section | SA-KSEC-02, SA-KSEC-03 | 404 | S1-P25-T001 |
| TI-020 | SETTINGS | UPDATE | Reorder sections including Tenant B ids | SA-KSEC-04 | 404 | S1-P25-T001 |
| TI-021 | ORDER | READ | Order board list; assert no B orders | LD-ORD-01 | A only | S1-P12-T011 |
| TI-022 | ORDER | READ | Poll `GET /api/v1/orders?since=…&tenantId=B` | RH-ORD-01 | Param rejected/ignored; A only | S1-P12-T011 |
| TI-023 | ORDER | READ | Open `/restaurant/orders/{B order id}` | LD-ORD-02 | Not-found page | S1-P12-T011 |
| TI-024 | ORDER | CREATE | Create order with Tenant B menu item / variant / add-on ids | SA-ORD-01 | 404; no order | S1-P12-T011 |
| TI-025 | ORDER | UPDATE | Transition Tenant B order status | SA-ORD-02 | 404 | S1-P12-T011 |
| TI-026 | ORDER | DELETE | Cancel Tenant B order | SA-ORD-03 | 404 | S1-P12-T011 |
| TI-027 | ORDER | UPDATE | Link Tenant B customer to Tenant A order | SA-ORD-05 | 404 | S1-P12-T011 |
| TI-028 | TRANSACTION | READ | Transactions list; assert no B rows or totals | LD-TXN-01 | A only | S1-P18-T009 |
| TI-029 | TRANSACTION | CREATE | Record payment on Tenant B order | SA-TXN-01 | 404; no row | S1-P18-T009 |
| TI-030 | TRANSACTION | UPDATE | Refund or void Tenant B transaction | SA-TXN-02, SA-TXN-03 | 404 | S1-P18-T009 |
| TI-031 | CUSTOMER | READ | Customer list/search "Asha Rao" returns only A's record | LD-CUS-01 | A only | S1-P13-T005 |
| TI-032 | CUSTOMER | READ | Open Tenant B customer detail | LD-CUS-02 | 404 | S1-P13-T005 |
| TI-033 | CUSTOMER | READ | Lookup by Tenant B customer's phone | RH-CUS-01 | No match (A has none with that phone) | S1-P13-T005 |
| TI-034 | CUSTOMER | UPDATE | Update / archive / anonymise Tenant B customer | SA-CUS-02, SA-CUS-03, SA-CUS-04 | 404 | S1-P13-T005 |
| TI-035 | TRANSACTION | READ | Open receipt of Tenant B order | LD-RCPT-01 | Not-found page (BA-02 regression) | S1-P18-T009 |
| TI-036 | KOT | READ | Kitchen board lists only A tickets | LD-KOT-01 | A only | S1-P14-T006 |
| TI-037 | KOT | READ | Poll kitchen tickets with `section` = Tenant B section id | RH-KOT-01 | Empty/422; no B data | S1-P14-T006 |
| TI-038 | KOT | UPDATE | Change Tenant B KOT status | SA-KOT-01 | 404 | S1-P14-T006 |
| TI-039 | PRINT | CREATE | Reprint Tenant B KOT | SA-KOT-02 | 404; no job | S1-P16-T008 |
| TI-040 | KOT | READ | Order detail KOT list for Tenant B order | LD-ORD-02 | Not-found | S1-P25-T001 |
| TI-041 | PRINT | READ | Agent A calls config/heartbeat referencing Tenant B printer ids | RH-AGT-02, RH-AGT-05 | B printers ignored; security event | S1-P16-T008 |
| TI-042 | PRINT | READ | Printing console lists only A agents/printers/jobs | LD-PRN-01 | A only | S1-P16-T008 |
| TI-043 | PRINT | READ | Agent A claim returns only A jobs while B has PENDING jobs | RH-AGT-03 | A jobs only | S1-P16-T008 |
| TI-044 | PRINT | CREATE | Create printer bound to Tenant B agent or section | SA-PRN-01 | 404 | S1-P16-T008 |
| TI-045 | PRINT | UPDATE | Retry Tenant B failed job | SA-PRN-05 | 404 | S1-P16-T008 |
| TI-046 | PRINT | DELETE | Revoke Tenant B agent / deactivate Tenant B printer | SA-AGT-02, SA-PRN-03 | 404 | S1-P16-T008 |
| TI-047 | REPORT | REPORT | Dashboard summary totals exclude Tenant B (compare with direct SQL) | LD-DASH-01, RH-DASH-01 | A totals only | S1-P25-T001 |
| TI-048 | REPORT | REPORT | Every report (sales, orders, menu, transactions, daily) excludes B | LD-RPT-01…LD-RPT-05 | A totals only | S1-P25-T001 |
| TI-049 | EXPORT | EXPORT | Request export endpoints (`/api/v1/reports/export`, `?format=csv`) | none exist (Q-014) | 404; no data file | S1-P25-T001 |
| TI-050 | AUDIT | AUDIT | Tenant audit list excludes B and platform rows | LD-AUD-01 | A only | S1-P25-T001 |
| TI-051 | AUDIT | AUDIT | TENANT_ADMIN A requests platform audit | LD-ADM-04 | Forbidden | S1-P25-T001 |
| TI-052 | STAFF | READ | Staff list excludes B members | LD-STF-01 | A only | S1-P25-T001 |
| TI-053 | SOCIAL | READ | Social posts list excludes B | LD-SOC-01 | A only | S1-P20-T004 |
| TI-054 | SOCIAL | CREATE | Create post from Tenant B daily menu / item | SA-SOC-01 | 404 | S1-P20-T004 |
| TI-055 | STAFF | UPDATE | Change role of Tenant B membership id | SA-STF-04 | 404 | S1-P25-T001 |
| TI-056 | STAFF | DELETE | Deactivate / revoke invite of Tenant B membership | SA-STF-05, SA-STF-03 | 404 | S1-P25-T001 |
| TI-057 | STAFF | CREATE | Invite staff with body containing Tenant B id | SA-STF-01 | 422; no membership in B | S1-P25-T001 |
| TI-058 | FILES | READ | Confirm or reference Tenant B media asset id / storage key (if Q-009) | SA-MEDIA-01 | 404; no signed URL | S1-P25-T001 |
| TI-059 | SETTINGS | READ | User A with INACTIVE membership in A and none in B accesses console | LD-AUTH-01 | No-access page; no data | S1-P25-T001 |
| TI-060 | PRINT | PRINT | Print receipt for Tenant B order | SA-PRN-06 | 404; no job | S1-P25-T001 |
| TI-061 | ORDER | READ | Platform admin opens `/restaurant/orders` or tenant loaders | LD-ORD-01 | No tenant context → no-access; no data | S1-P25-T001 |
| TI-062 | SETTINGS | READ | Public visitor requests Tenant B unpublished website and private fields | LD-PUB-01 | 404 / public projection only | S1-P25-T001 |

Coverage check (brief §41): READ ✔ (TI-001, 021…) · CREATE ✔ (TI-005, 024…) · UPDATE ✔ · DELETE ✔ · EXPORT ✔ (TI-049) · REPORT ✔ (TI-047, 048) ·
PRINT ✔ (TI-039, 043, 060) · AUDIT ✔ (TI-050, 051) · CUSTOMER ✔ (TI-031…034) · TRANSACTION ✔ (TI-028…030, 035) · MENU ✔ (TI-001…010) ·
ORDER ✔ (TI-021…027) · STAFF ✔ (TI-052, 055…057) · SETTINGS ✔ (TI-014…020).

## 3. Adversarial scenarios

| ID | Technique | Attack | Endpoint(s) | Expected result | Threat | Implemented in |
|---|---|---|---|---|---|---|
| ADV-001 | Changing tenantId | Add `tenantId: B` to every mutation body and query string | all SA/RH | 422 (unknown key) or ignored query; tenant stays A | T-001 | S1-P24-T008 |
| ADV-002 | Changing resource ID | Iterate Tenant B UUIDs harvested from a Tenant B session into A requests | LD-ORD-02, SA-ORD-02, LD-CUS-02 | 404 identical to random UUID; timing within noise | T-002, T-029 | S1-P24-T008 |
| ADV-003 | Request body manipulation | Reorder arrays including foreign ids | SA-MENU-04, SA-KSEC-04 | 404; order unchanged | T-002 | S1-P24-T008 |
| ADV-004 | Changing membership | Set `rasoi_active_membership` cookie to User B's membership id | LD-AUTH-01, SA-AUTH-01 | Cookie ignored; select-tenant/own tenant | T-001 | S1-P24-T008 |
| ADV-005 | Changing role | MANAGER promotes self or others to TENANT_ADMIN; modifies own membership | SA-STF-04 | 403 ROLE_NOT_ASSIGNABLE | T-003 | S1-P24-T008 |
| ADV-006 | Role escalation to platform | TENANT_ADMIN calls platform actions with valid-looking tenantId | SA-ADM-01…06 | 403 | T-003, T-026 | S1-P24-T008 |
| ADV-007 | Price manipulation | Send `price`, `unitPrice`, `variantPrice` in order lines | SA-ORD-01 | 422; order not created | T-006 | S1-P12-T011 |
| ADV-008 | Total manipulation | Send `total`, `taxAmount`, `discount` in order payload | SA-ORD-01 | 422 | T-006 | S1-P12-T011 |
| ADV-009 | Modifier ownership manipulation | Use variant id of another item (same tenant) and of Tenant B | SA-ORD-01, SA-MENU-12 | 422 INVALID / 404 | T-006 | S1-P24-T008 |
| ADV-010 | Order ownership manipulation | Attach Tenant B customer id to new order; reuse Tenant B idempotency key | SA-ORD-01 | 404; key scoped per tenant creates A order only | T-002 | S1-P12-T011 |
| ADV-011 | Payment manipulation | Pay more than balance; negative amount; card number as reference | SA-TXN-01 | 422 | T-020 | S1-P18-T009 |
| ADV-012 | Print-job manipulation | Agent A claims with body `{tenantId: B}` or `printerId` of B | RH-AGT-03 | 422 / only A jobs | T-007 | S1-P16-T008 |
| ADV-013 | Forged print agent | Random, truncated, revoked, or Tenant B token; token prefix only | RH-AGT-02…05 | 401 | T-007 | S1-P16-T008 |
| ADV-014 | Ack replay / forgery | Ack job of another agent; stale claim token; PRINTED for never-claimed job | RH-AGT-04 | 404 / 409; status unchanged | T-008 | S1-P16-T008 |
| ADV-015 | Pairing brute force | 100 pairing attempts with guessed codes from one IP | RH-AGT-01 | 429 after 5; no pairing | T-015 | S1-P16-T008 |
| ADV-016 | Stored XSS | `<img src=x onerror=alert(1)>` in item name, customer notes, caption, instructions | SA-MENU-06, SA-CUS-01, SA-SOC-01, SA-ORD-01 | Rendered as text everywhere incl. public site and cards | T-013 | S1-P24-T008 |
| ADV-017 | SSRF | Image URL `https://169.254.169.254/…`, internal hostnames, redirects to internal | SA-RST-02, SA-MENU-06, RH-PUB-01 | 422 at write; renderer never fetches | T-014 | S1-P24-T008 |
| ADV-018 | SQL injection | `' OR 1=1 --` and `%` wildcards in search params | LD-ADM-02, LD-CUS-01, RH-CUS-01 | Treated as literal; no extra rows | T-016 | S1-P24-T008 |
| ADV-019 | Printer command injection | ESC/GS bytes in item names/instructions | SA-MENU-06 → print payload | Control characters stripped before encoding | T-022 | S1-P24-T008 |
| ADV-020 | Malicious file | SVG with script, polyglot JPEG/HTML, oversized image (if Q-009) | RH-MEDIA-01, SA-MEDIA-01 | Rejected or re-encoded safely | T-005 | S1-P07-T009 |
| ADV-021 | Invitation hijack | Clerk account with unverified secondary email matching an invited address | session resolver | Not linked; no-access | T-019 | S1-P24-T008 |
| ADV-022 | Webhook forgery | Unsigned, wrongly signed, replayed-after-5-min Clerk webhooks deleting a user | RH-AUTH-01 | 400; user unchanged | T-009 | S1-P24-T008 |
| ADV-023 | URL manipulation | Change path ids on every dynamic route to Tenant B ids | all `[id]` routes | Not-found pages | T-002 | S1-P24-T008 |
| ADV-024 | Direct API access | Call `/api/v1/*` without session, with expired session, with session of deactivated user | RH-ORD-01, RH-KOT-01, RH-DASH-01 | 401 / 403 | T-004, T-027 | S1-P24-T008 |
| ADV-025 | Public data probing | Request RSC payload/JSON variants of public pages, add `?preview=1`, unpublished item ids | LD-PUB-01, RH-PUB-02 | Public projection only; unpublished 404 | T-010 | S1-P24-T008 |
| ADV-026 | Cache manipulation | Warm cache as User A then request same URL as User B; vary headers; check CDN/ISR keys | console pages, RH-*, public pages | No cross-user reuse; `no-store` on authenticated | T-023 | S1-P24-T008 |
| ADV-027 | Rate-limit bypass | Rotate `X-Forwarded-For` values to evade limits | RH-AGT-01, RH-CUS-01 | Untrusted hops ignored; limit enforced | T-018 | S1-P24-T008 |
| ADV-028 | Export manipulation | Guess export URLs/params on reports; request `Accept: text/csv` | LD-RPT-*, `/api/v1/reports/*` | 404/406; no export (Q-014) | T-011 | S1-P24-T008 |
| ADV-029 | Stale privileges | Deactivate membership mid-session, continue using open tab and polling | all tenant endpoints | Next request denied | T-027 | S1-P24-T008 |
| ADV-030 | UI capability bypass | Enable hidden buttons via devtools; replay action ids captured from a higher role | SA-MENU-*, SA-TXN-02 | 403 | T-003 | S1-P24-T008 |

## 4. Execution rules

- Implemented as Vitest integration tests where possible, and Playwright where browser behaviour matters (ADV-016, ADV-023, ADV-026, ADV-030).
- Required CI checks: `isolation` and `adversarial`. No `skip`/`todo` is allowed in release builds.
- A failure is always Critical priority and blocks merge.
- New endpoints must add TI coverage in the same pull request (review checklist item in the PR template).
