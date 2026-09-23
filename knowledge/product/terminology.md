---
title: "Terminology"
document_type: "GLOSSARY"
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
related_documents: ["../implementation/slice-01/data-model.md","../implementation/slice-01/security.md"]
related_decisions: ["RASOIOS-ADR-002","RASOIOS-ADR-006"]
---

# Terminology

| Term | Meaning |
|---|---|
| **Tenant** | A licensed restaurant business. It is the root of data isolation (TENANT). |
| **Restaurant** | The tenant's public identity and operational settings (RESTAURANT, 1:1 with tenant per Q-002). |
| **USER_TENANT / membership** | A person's authorization link to a tenant with one role. **Not** a subscription or plan. |
| **Platform role** | `SUPER_ADMIN` stored on USER; grants platform administration only. |
| **Tenant context** | Server-derived identity for a request: user, membership, tenant, role, permissions, restaurant timezone/currency. |
| **Active tenant** | For users with several memberships, the tenant chosen through a server-validated preference cookie. |
| **Business date** | Calendar date in the restaurant's IANA timezone when something happened. |
| **Order** | A sale with server-calculated totals. **Order item** is an immutable priced line with snapshots. |
| **Variant** | Mutually exclusive priced option of an item (e.g. Half / Full). |
| **Add-on** | Optional priced extra added to a line. |
| **Daily menu** | A curated, date-specific list of menu items published for a business date. |
| **KOT** | Kitchen Order Ticket: the kitchen's instruction for an order, per section and round. |
| **Kitchen section** | A station (e.g. Tandoor, Bar) that receives its own KOT and optionally its own printer. |
| **Kitchen board / KDS** | The kitchen display screen showing KOTs by status. |
| **Round** | A batch of items sent to the kitchen for one order (Q-003). |
| **Print job** | A queued document for a specific printer: PENDING → PROCESSING → PRINTED / FAILED. |
| **Print agent** | Local program on a restaurant PC that pairs with the cloud, claims print jobs and prints over USB/LAN. |
| **Pairing code** | One-time 8-character code that exchanges for an agent token. |
| **Lease** | Time-limited claim on a print job by an agent. |
| **Ledger / transaction** | Append-only PAYMENT or REFUND record against an order. |
| **Void** | Same-day correction marking a mistaken ledger row as VOIDED. |
| **Day close** | Reconciliation of expected versus counted cash for a business date; locks the date. |
| **Menu card** | Generated shareable image of a daily menu, full menu or single item. |
| **Marked posted** | Staff attestation that content was posted manually; not an automated publish. |
| **Execution order** | The dependency-respecting sequence (#) in which SLICE-01 tasks are implemented. |
| **Slice / phase** | SLICE-01 is the single implementation slice; P01–P29 are its ordered phases. |
