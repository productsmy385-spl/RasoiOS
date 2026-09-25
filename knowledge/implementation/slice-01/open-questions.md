---
title: "SLICE-01 Open Questions"
document_type: "OPEN_QUESTIONS"
project: "Restaurant SaaS Platform"
project_owner: "Gopala Krishna"
slice: "SLICE-01"
status: "PROPOSED"
version: "2.0"
created: "2026-09-15"
last_updated: "2026-09-23"
owner: "Gopala Krishna (Project Owner)"
planned_start: "2026-09-15"
planned_finish: "Not scheduled — execution-order plan"
dependencies: []
related_documents: ["dependencies.md", "risks.md", "prd.md", "slice-plan.md"]
related_decisions: ["RASOIOS-ADR-006", "RASOIOS-ADR-007", "RASOIOS-ADR-008", "RASOIOS-ADR-009", "RASOIOS-ADR-010", "RASOIOS-ADR-011"]
---

# SLICE-01 Open Questions

These decisions need the Project Owner. Each question lists options and a **recommendation**, which is not an answer. Until a question is
ANSWERED, the plan proceeds on its recommendation only where the question is non-blocking. Because the plan is not date-scheduled, each
**decision deadline** is the task that must not start before the question is answered.

Statuses: **OPEN**, **ANSWERED** (record decision text and date), **DEFERRED** (moved to Future Scope with owner approval).

Supersedes v1.0 questions: old Q-001 (certified printers) → Q-011 · old Q-002 (default timezone) → Q-005 · old Q-003 (social publishing) → Q-012.

---

### Q-001 — Is public online ordering from the restaurant website in SLICE-01?
- **Category:** Scope / Orders
- **Why it matters:** The baseline has an unauthenticated public checkout that overwrites customer data (BA-19). Brief §20 lists no ordering for the public site, and brief §26 order creation starts with "authenticate". KB v1.0 user journey 1 described customer ordering.
- **Options:** (A) No public ordering in SLICE-01; remove checkout. (B) Public ordering for takeaway/dine-in with rate limits, idempotency and phone capture. (C) QR table ordering (larger scope).
- **Recommendation:** **A**. The brief's public website scope is read-only, and ordering needs anti-abuse and payment decisions.
- **Impact:** A removes `checkout-action.ts` and the cart. B adds SA-PUB-01, T-030 mitigations and E2E journeys.
- **Blocking?** Yes — for S1-P09-T003 and S1-P09-T009
- **Owner:** Gopala Krishna
- **Decision deadline:** Before S1-P09-T002 starts (gate S1-P09-T001)
- **Status:** ANSWERED 2026-09-22 — **A**: no public ordering in SLICE-01. The public site is read-only; the baseline checkout action and cart are removed (S1-P09-T009).

### Q-002 — How many restaurants does a tenant have?
- **Category:** Data model / Commercial
- **Why it matters:** The baseline schema is 1:N but code reads `restaurants[0]`. The timezone, currency and website all hang off the restaurant. The brief mentions "additional outlet deployment" as a commercial service.
- **Options:** (A) Exactly one restaurant per tenant; a second outlet is a separate tenant. (B) Multiple outlets per tenant with an outlet switcher and per-outlet menus/orders.
- **Recommendation:** **A** for SLICE-01, with multi-outlet as Future Scope. B changes almost every entity and screen.
- **Impact:** A enforces `UNIQUE (tenant_id)` on RESTAURANT. B requires an outlet dimension on orders, KOTs, printers and reports.
- **Blocking?** Yes — for S1-P02-T002
- **Owner:** Gopala Krishna
- **Decision deadline:** Before S1-P02-T002 starts (gate S1-P01-T010)
- **Status:** ANSWERED 2026-09-15 — **A**: exactly one restaurant per tenant; a second outlet is a separate tenant. Multi-outlet is Future Scope. `UNIQUE (tenant_id)` on RESTAURANT.

### Q-003 — Can staff add items to an open order?
- **Category:** Orders / Kitchen
- **Why it matters:** Dine-in guests often order in rounds. Without add-items, staff create separate orders per round.
- **Options:** (A) Allow add-items as a new KOT round while ACCEPTED/PREPARING/READY. (B) Not in SLICE-01. (C) Also allow removing items before preparation.
- **Recommendation:** **A**. The schema already supports rounds (`kot_round`, `round_number`). Line removal (C) stays Future Scope.
- **Impact:** Task S1-P12-T010 and endpoint SA-ORD-04 become applicable or not applicable.
- **Blocking?** Yes — for S1-P12-T010
- **Owner:** Gopala Krishna
- **Decision deadline:** Before S1-P12-T004 starts (gate S1-P12-T001)
- **Status:** ANSWERED 2026-09-22 — **A**: staff may add items to an ACCEPTED/PREPARING/READY order as a new KOT round (SA-ORD-04, S1-P12-T010). Line removal stays Future Scope.

### Q-004 — Which tax model applies?
- **Category:** Money / Compliance
- **Why it matters:** Totals, receipts and reports depend on it. The baseline applies an exclusive per-item percentage.
- **Options:** (A) Tax-exclusive prices, per-item single rate, line-level rounding (current). (B) Tax-inclusive prices. (C) India GST display split into CGST/SGST halves on receipts. (D) Service charge support.
- **Recommendation:** **A**, plus **C** as receipt presentation only if the owner confirms Indian GST registration. D is out of scope unless requested.
- **Impact:** ADR-010 §3 and the pricing engine (S1-P12-T002), receipt renderer (S1-P16-T002) and reports.
- **Blocking?** Yes — for S1-P02-T002 (columns) and S1-P12-T002
- **Owner:** Gopala Krishna
- **Decision deadline:** Before S1-P02-T002 starts (gate S1-P01-T010)
- **Status:** ANSWERED 2026-09-15 — **A + C**: tax-exclusive prices, per-item single rate, line-level ROUND_HALF_UP; plus CGST/SGST receipt presentation for restaurants with a GSTIN (ADR-010 §3, `RESTAURANT.gstin`, REQ-TXN-011). No tax-inclusive pricing, no service charge.

### Q-005 — What defaults apply to new tenants (timezone, currency, country)?
- **Category:** Localization
- **Why it matters:** Tenant creation must set timezone and currency. The baseline defaults the timezone to "UTC".
- **Options:** (A) Required fields, prefilled Asia/Kolkata / INR / IN. (B) Required fields with no prefill. (C) Silent defaults.
- **Recommendation:** **A**. Required and visible, prefilled for the expected market, never silent.
- **Impact:** Create-tenant form (S1-P06-T005).
- **Blocking?** No
- **Owner:** Gopala Krishna
- **Decision deadline:** Before S1-P06-T005 starts
- **Status:** ANSWERED 2026-09-22 — **A**: timezone, currency and country are required and visible on tenant creation, prefilled Asia/Kolkata / INR / IN; never silent.

### Q-006 — Are discounts in scope?
- **Category:** Orders / Money
- **Why it matters:** Brief §26 says "never trust client discount", but no discount feature is specified.
- **Options:** (A) No discounts in SLICE-01 (`discount_amount` fixed at 0). (B) Manager-applied order discount with reason. (C) Promo codes.
- **Recommendation:** **A**.
- **Impact:** B needs an ADR-010 amendment, a new permission and reports changes.
- **Blocking?** No
- **Owner:** Gopala Krishna
- **Decision deadline:** Before S1-P12-T004 starts (gate S1-P12-T001)
- **Status:** ANSWERED 2026-09-22 — **A**: no discounts in SLICE-01; `discount_amount` stays 0.

### Q-007 — Must an order be fully paid before it is COMPLETED?
- **Category:** Orders
- **Why it matters:** It defines when orders close and how reports count revenue.
- **Options:** (A) Yes, COMPLETED requires PAID. (B) No, completion and payment are independent.
- **Recommendation:** **A**. It prevents unpaid orders disappearing from active lists.
- **Impact:** BR-ORD-06, SA-ORD-02 validation, UI prompts.
- **Blocking?** No
- **Owner:** Gopala Krishna
- **Decision deadline:** Before S1-P12-T005 starts (gate S1-P12-T001)
- **Status:** ANSWERED 2026-09-22 — **A**: an order can be COMPLETED only when `payment_status = PAID` (BR-ORD-06).

### Q-008 — Can managers cancel orders already PREPARING or READY?
- **Category:** Orders
- **Why it matters:** KB v1.0 allows cancellation only from NEW/ACCEPTED. The baseline code allows PREPARING/READY. Real service has walk-outs.
- **Options:** (A) Keep NEW/ACCEPTED only. (B) Allow TENANT_ADMIN/MANAGER to cancel PREPARING/READY with a reason.
- **Recommendation:** **B** (audited, reason required). Until answered, the documented rule A applies.
- **Impact:** BR-ORD-05, transition table, KOT cancellation.
- **Blocking?** No
- **Owner:** Gopala Krishna
- **Decision deadline:** Before S1-P12-T005 starts (gate S1-P12-T001)
- **Status:** ANSWERED 2026-09-22 — **B**: TENANT_ADMIN and MANAGER may also cancel PREPARING and READY orders, with a reason, audited; CASHIER and WAITER cancel NEW only (BR-ORD-05, security.md §3.3 row 29 and §3.4).

### Q-009 — Do we support image uploads, and where are files stored?
- **Category:** Infrastructure / Security
- **Why it matters:** The brief lists file uploads and storage. The baseline accepts arbitrary image URLs.
- **Options:** (A) Allow-listed HTTPS URLs only in SLICE-01. (B) Uploads to S3-compatible object storage (provider to choose: e.g. Cloudflare R2, AWS S3). (C) Railway volume storage.
- **Recommendation:** **B** if restaurants lack image hosting; otherwise **A** for SLICE-01. C is not recommended, because volumes don't fit multiple replicas.
- **Impact:** MEDIA_ASSET entity, S1-P07-T009, SC-FILE controls, T-005.
- **Blocking?** Yes — for S1-P07-T009
- **Owner:** Gopala Krishna
- **Decision deadline:** Before S1-P07-T009 starts (gate S1-P07-T008)
- **Status:** ~~ANSWERED 2026-09-22 — **A**: allow-listed HTTPS image URLs only in SLICE-01; no uploads, no object storage.~~ **SUPERSEDED 2026-09-25 by RASOIOS-ADR-017** (Project Owner): uploads to **ImageKit**, proxied through the app server; allow-listed URLs remain supported. S1-P07-T009 reopened and implemented.

### Q-010 — Which operating systems and packaging for the print agent?
- **Category:** Printing
- **Why it matters:** It determines USB transport, credential storage and installer work.
- **Options:** (A) Windows 10/11 service installer first. (B) Linux (incl. Raspberry Pi) systemd first. (C) Both.
- **Recommendation:** **A** first, if restaurant counter PCs are Windows. Confirm the hardware actually used.
- **Impact:** S1-P17-T003, S1-P17-T006, S1-P17-T009.
- **Blocking?** Yes — for P17
- **Owner:** Gopala Krishna
- **Decision deadline:** Before S1-P17-T002 starts (gate S1-P17-T001)
- **Status:** ANSWERED 2026-09-23 — **C**: Windows 10/11 **and** Linux with systemd (incl. Raspberry Pi OS), Node.js 22+ on both.
  - Windows runs the agent as a scheduled task at boot under SYSTEM (no third-party service wrapper); Linux as the
    hardened `rasoios-print-agent.service` under an unprivileged `rasoios-agent` user in group `lp`.
  - Credential storage deviates from the S1-P17-T003 wording ("Windows Credential Manager/DPAPI"): the token is a file
    in a directory restricted to SYSTEM + Administrators (Windows ACL set by the installer) or 0700/0600 for the service
    user (Linux). DPAPI from Node needs a native module or a PowerShell child process, and child processes are banned in
    this repository (SC-VAL-06); machine-scope DPAPI would not keep the token from an administrator either.
  - USB: Windows writes RAW to a local printer share (`\\localhost\<share>`), Linux to `/dev/usb/lpN` — plain file I/O.
  - Install/runbook: `operations/print-agent.md`.

### Q-011 — Which printer models must be verified?
- **Category:** Printing / Hardware
- **Why it matters:** Codepages, cutters and USB behaviour vary.
- **Options:** (A) Generic ESC/POS with one USB and one LAN model supplied by the owner. (B) A named certified list (e.g. Epson TM-T82, TVS RP3200).
- **Recommendation:** **A** for SLICE-01, publishing the verified models.
- **Impact:** S1-P17-T008, S1-P25-T009, R017.
- **Blocking?** No (simulator allows progress)
- **Owner:** Gopala Krishna
- **Decision deadline:** Before S1-P17-T008 starts (gate S1-P17-T001)
- **Status:** OPEN

### Q-012 — Should social publishing integrate with platform APIs?
- **Category:** Social
- **Why it matters:** API publishing needs Meta app review, tokens and failure handling. The brief forbids faking success.
- **Options:** (A) Manual posting with generated cards/captions and honest "marked posted". (B) Meta Graph API publishing. (C) WhatsApp Business API.
- **Recommendation:** **A** for SLICE-01. B and C are Future Scope with their own ADR.
- **Impact:** SOCIAL_POST statuses, S1-P20-T002.
- **Blocking?** No
- **Owner:** Gopala Krishna
- **Decision deadline:** Before S1-P20-T002 starts
- **Status:** OPEN

### Q-013 — What is the public website hostname strategy and production domain?
- **Category:** Routing / Infrastructure
- **Why it matters:** The brief references an "approved hostname/subdomain architecture". KB v1.0 approved `/r/[slug]`. Subdomains need wildcard DNS and TLS.
- **Options:** (A) Path routing `/r/{slug}` on the production domain. (B) Subdomains `{slug}.<domain>`. (C) Custom domains per restaurant.
- **Recommendation:** **A** for SLICE-01 (already implemented baseline, no wildcard TLS). B and C are Future Scope. The production domain name itself must be provided.
- **Impact:** Public routes, SEO canonical URLs, Railway domain setup.
- **Blocking?** Yes — for S1-P09-T003 and S1-P27-T001
- **Owner:** Gopala Krishna
- **Decision deadline:** Before S1-P09-T002 starts (gate S1-P09-T001)
- **Status:** ANSWERED 2026-09-23 — **B, with A retained**: each tenant is served at `{slug}.<PUBLIC_ROOT_DOMAIN>` (`{slug}.localhost:3000` in development) and the path form `/r/{slug}` keeps working on the apex host as a preview/fallback with a canonical link to the subdomain. The production domain is still to be chosen (owner, S1-P27-T001); the app reads it from `PUBLIC_ROOT_DOMAIN` and runs without it. Custom domains per restaurant stay Future Scope. See RASOIOS-ADR-012.

### Q-014 — Are report exports (CSV) in scope?
- **Category:** Reports / Security
- **Why it matters:** Exports create bulk data extraction risk (T-011).
- **Options:** (A) No exports in SLICE-01. (B) CSV exports for sales and transactions (TENANT_ADMIN only, audited).
- **Recommendation:** **A**.
- **Impact:** REQ-RPT-009, TI-049.
- **Blocking?** No
- **Owner:** Gopala Krishna
- **Decision deadline:** Before S1-P19-T003 starts
- **Status:** OPEN

### Q-015 — Should the product process online payments?
- **Category:** Money / Integrations
- **Why it matters:** Payments are currently manual records of cash, card terminal and UPI.
- **Options:** (A) Manual recording only. (B) Integrate a payment gateway (e.g. Razorpay) for UPI/card links.
- **Recommendation:** **A** for SLICE-01.
- **Impact:** `payment_method` enum, PCI/compliance scope.
- **Blocking?** No
- **Owner:** Gopala Krishna
- **Decision deadline:** Before S1-P18-T001 starts
- **Status:** OPEN

### Q-016 — Who will implement SLICE-01?
- **Category:** Delivery
- **Why it matters:** Every role except the Project Owner is UNASSIGNED. The plan is execution-order only, with no forecast dates.
- **Options:** (A) AI coding agent(s) supervised by the Project Owner. (B) Hired engineers per role. (C) Mix.
- **Recommendation:** Record the chosen model and named people in `../../README.md` §Governance, so task owners can be assigned.
- **Impact:** R016; task owner fields.
- **Blocking?** No (work can start in sequence)
- **Owner:** Gopala Krishna
- **Decision deadline:** Before S1-P02-T002 starts (gate S1-P01-T010)
- **Status:** ANSWERED 2026-09-15 — **A**: AI coding agents supervised by the Project Owner (recorded in `../../README.md` §Governance).

### Q-017 — Does any existing database hold data that must be preserved?
- **Category:** Data migration
- **Why it matters:** No migrations exist. The redesign assumes a fresh baseline `0001_init`.
- **Options:** (A) No data to preserve. (B) Data exists (identify environment) and needs a migration script.
- **Recommendation:** Confirm **A** by checking every configured `DATABASE_URL`.
- **Impact:** S1-P02-T003 scope.
- **Blocking?** Yes — for S1-P02-T003
- **Owner:** Gopala Krishna
- **Decision deadline:** Before S1-P02-T002 starts (gate S1-P01-T010)
- **Status:** ANSWERED 2026-09-15 — **A**: no data to preserve. Checked: the only configured `DATABASE_URL` (`.env`) points at `localhost:5432/rasoios_db`, no PostgreSQL server is installed or running on the development machine, and no Railway project exists for RASOIOS. `0001_init` starts from an empty database.

### Q-018 — Is an external error-tracking service approved?
- **Category:** Observability
- **Why it matters:** Railway logs may be enough initially. Services like Sentry add a vendor and data processing.
- **Options:** (A) Structured logs on Railway only. (B) Add an error-tracking service (ADR required).
- **Recommendation:** **A** for launch, then review after hypercare.
- **Impact:** S1-P26-T006.
- **Blocking?** No
- **Owner:** Gopala Krishna
- **Decision deadline:** Before S1-P26-T006 starts
- **Status:** OPEN

### Q-019 — Can SUPER_ADMIN access a tenant's operational data for support?
- **Category:** Security / Governance
- **Why it matters:** Support sometimes needs to see orders, but platform access to customer PII increases risk.
- **Options:** (A) No, metadata and counts only. (B) Time-boxed, reason-required, audited "support session" granted by the tenant admin.
- **Recommendation:** **A** for SLICE-01, with B as Future Scope via ADR.
- **Impact:** SC-RBAC-07, T-026.
- **Blocking?** No
- **Owner:** Gopala Krishna
- **Decision deadline:** Before S1-P06-T001 starts
- **Status:** OPEN

### Q-020 — What customer data retention and erasure policy applies?
- **Category:** Privacy / Legal
- **Why it matters:** Customers' names and phones are personal data. India's Digital Personal Data Protection Act, 2023 may apply. Legal review is recommended.
- **Options:** (A) Keep until the tenant anonymises, with erasure on request via anonymisation. (B) Automatic anonymisation after N months of inactivity.
- **Recommendation:** **A** for build, with the owner or legal adviser confirming before launch.
- **Impact:** SC-PII-02, S1-P13-T001, launch readiness.
- **Blocking?** Yes — for launch (S1-P28-T007)
- **Owner:** Gopala Krishna
- **Decision deadline:** Before S1-P28-T007 starts
- **Status:** OPEN

### Q-021 — Is ordering restricted to the day's daily menu?
- **Category:** Menu / Orders
- **Why it matters:** KB v1.0 described the daily menu as "for public or daily ordering".
- **Options:** (A) No restriction; the daily menu is a curated highlight. (B) When a daily menu is published, order entry offers only its items.
- **Recommendation:** **A**.
- **Impact:** BR-DMENU-05, order validation.
- **Blocking?** No
- **Owner:** Gopala Krishna
- **Decision deadline:** Before S1-P12-T004 starts (gate S1-P12-T001)
- **Status:** ANSWERED 2026-09-22 — **A**: ordering is not restricted to the daily menu; the daily menu is a curated highlight.

### Q-022 — Which dietary classification values?
- **Category:** Menu
- **Why it matters:** It is shown on the public menu and in order entry.
- **Options:** (A) VEG, NON_VEG, EGG (Indian marking convention). (B) Add VEGAN, JAIN, GLUTEN_FREE. (C) Free-form tags.
- **Recommendation:** **A**, with allergens as Future Scope.
- **Impact:** `dietary_type` enum.
- **Blocking?** No (default A)
- **Owner:** Gopala Krishna
- **Decision deadline:** Before S1-P02-T002 starts (gate S1-P01-T010)
- **Status:** ANSWERED 2026-09-15 — **A**: `VEG`, `NON_VEG`, `EGG`. Allergens are Future Scope.

### Q-023 — What legal content must receipts show?
- **Category:** Compliance / Printing
- **Why it matters:** Receipts may need a tax registration number (e.g. GSTIN), a food licence number (e.g. FSSAI) or an invoice numbering format.
- **Options:** (A) Restaurant name, address, phone, order number, date/time, lines, tax, totals, payments, footer text. (B) Add registration/licence fields and invoice numbering.
- **Recommendation:** Owner to confirm legal requirements for target restaurants. Start with A; B adds RESTAURANT fields via data-model update.
- **Impact:** Receipt renderer, RESTAURANT fields.
- **Blocking?** No (A), Yes if B before S1-P16-T002
- **Owner:** Gopala Krishna
- **Decision deadline:** Before S1-P16-T002 starts
- **Note (2026-09-15):** The GSTIN field and GST split are decided by Q-004. This question still covers other legal content (food licence number, invoice numbering).
- **Status:** OPEN

### Q-024 — How long are audit logs and print jobs retained?
- **Category:** Data retention
- **Why it matters:** They grow continuously, and IP addresses are personal data.
- **Options:** (A) Audit kept for the life of the tenant; print jobs purged after 90 days. (B) Audit 3 years; IP addresses truncated after 90 days.
- **Recommendation:** **B** after volume measurement (S1-P23-T004).
- **Impact:** Maintenance job, privacy.
- **Blocking?** No
- **Owner:** Gopala Krishna
- **Decision deadline:** Before S1-P28-T007 starts
- **Status:** OPEN

### Q-025 — What backup capabilities and recovery objectives apply?
- **Category:** Operations
- **Why it matters:** KB v1.0 claimed WAL archiving and RPO < 1 hour without verification.
- **Options:** (A) Railway plan backups with verified frequency. (B) Additional scheduled `pg_dump` to external storage.
- **Recommendation:** Verify the Railway plan, then set RPO ≤ 24 h / RTO ≤ 4 h as a minimum, adding B if the plan cannot meet them.
- **Impact:** S1-P27-T006, DEP-CHK-08.
- **Blocking?** Yes — for S1-P27-T006
- **Owner:** Gopala Krishna
- **Decision deadline:** Before S1-P27-T006 starts
- **Status:** OPEN

### Q-026 — Which browsers and devices are supported?
- **Category:** Frontend / QA
- **Why it matters:** It defines the responsive and device test matrix for POS and kitchen hardware.
- **Options:** (A) Latest two versions of Chrome, Edge, Safari and Firefox; Chrome on Android tablets; Safari on iPadOS 17+. (B) A narrower list of owner-supplied devices.
- **Recommendation:** **A**, plus the specific tablets restaurants will use.
- **Impact:** REQ-NFR-005, S1-P25-T005.
- **Blocking?** No
- **Owner:** Gopala Krishna
- **Decision deadline:** Before S1-P25-T005 starts
- **Status:** OPEN

### Q-027 — Is any offline operation required?
- **Category:** PWA
- **Why it matters:** Offline order taking requires sync and conflict resolution (large scope). The brief forbids claiming unsupported offline behaviour.
- **Options:** (A) Offline page only. (B) Offline order capture with later sync.
- **Recommendation:** **A** for SLICE-01.
- **Impact:** S1-P21-T002.
- **Blocking?** No
- **Owner:** Gopala Krishna
- **Decision deadline:** Before S1-P21-T002 starts
- **Status:** OPEN

### Q-028 — Which languages must the UI support?
- **Category:** Localization
- **Why it matters:** Staff and diners may prefer regional languages.
- **Options:** (A) English only in SLICE-01. (B) English plus one additional language with i18n framework (new dependency, ADR).
- **Recommendation:** **A**, keeping copy centralised to ease later i18n.
- **Impact:** REQ-NFR-008.
- **Blocking?** No
- **Owner:** Gopala Krishna
- **Decision deadline:** Before S1-P08-T005 starts
- **Status:** OPEN

### Q-029 — How long should sessions last on shared restaurant devices?
- **Category:** Security
- **Why it matters:** POS and kitchen tablets are shared, so long sessions increase misuse risk and short ones interrupt service.
- **Options:** (A) 12 h maximum lifetime, 2 h inactivity. (B) 24 h lifetime, no inactivity timeout for kitchen. (C) Clerk defaults.
- **Recommendation:** **A**, revisiting kitchen devices after the field test (S1-P15-T004).
- **Impact:** SC-SESS-04, T-004.
- **Blocking?** No
- **Owner:** Gopala Krishna
- **Decision deadline:** Before S1-P03-T001 starts (gate S1-P01-T010)
- **Status:** ANSWERED 2026-09-15 — **A**: 12 h maximum session lifetime, 2 h inactivity timeout; kitchen devices revisited after the field test (S1-P15-T004).

### Q-030 — Should the print agent discover printers on the LAN automatically?
- **Category:** Printing
- **Why it matters:** Requested 2026-09-23 (Wi-Fi printer discovery wizard: mDNS/DNS-SD, IPP, raw-port scan). Today a printer
  is added manually by private IP and port, which already works end to end. Discovery conflicts with S1-P17-T010 /
  T-028 ("agent opens no listening ports"): mDNS needs a multicast listening socket, and a port scan of the restaurant
  subnet is intrusive. It also needs a new agent → server channel for discovered devices (a new RH-AGT endpoint and a
  console flow), which no ADR covers.
- **Options:** (A) Keep manual entry only in SLICE-01; add the agent `status` command and test print as the
  verification path (current state). (B) Add discovery via a new ADR amending ADR-007 and T-028: opt-in, triggered
  from the console, mDNS/DNS-SD browse + probe of port 9100 on the agent's own /24 only, results reported, never
  auto-registered. (C) Future Scope.
- **Recommendation:** **B** if restaurants struggle to find printer IPs during onboarding; otherwise **A** for SLICE-01.
- **Impact:** B: ADR-014 (proposed), new RH-AGT-06, console wizard step, threat-model update, tests.
- **Blocking?** No — manual registration covers the required flow.
- **Owner:** Gopala Krishna
- **Decision deadline:** Before S1-P25-T009 (physical printing QA)
- **Status:** ANSWERED 2026-09-25 — **B**, recorded as RASOIOS-ADR-015 and implemented (console "Find nearby printers";
  one-shot mDNS query from an ephemeral port + port-9100 probe of the agent's own /24; nothing auto-registered).
