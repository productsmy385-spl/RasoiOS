---
title: "RASOIOS-ADR-010: Money, Tax Calculation, Menu Modifiers, Business Day and Sequential Numbering"
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
dependencies: []
related_documents: ["../implementation/slice-01/data-model.md", "../product/business-rules.md", "../implementation/slice-01/prd.md"]
related_decisions: ["RASOIOS-ADR-001"]
---

# RASOIOS-ADR-010: Money, Tax Calculation, Menu Modifiers, Business Day and Sequential Numbering

- **ID:** RASOIOS-ADR-010
- **Date:** 2026-09-15
- **Owner:** Gopala Krishna (Project Owner)
- **Status:** APPROVED — 2026-09-15, Gopala Krishna (Project Owner), decision gate S1-P01-T010.

## Context

CLAUDE.md rule 4 requires Decimal/NUMERIC persistence for money and order-time snapshots. The baseline:

- stores variant/add-on prices as strings inside JSON (`prisma/schema.prisma:200-201`) — BA-17;
- stores client-supplied options unpriced (`lib/services/orders.ts:128`) — BA-16;
- stores only `total_amount` on orders, with no subtotal or tax;
- numbers orders and KOTs by counting today's rows at server-local midnight — BA-14;
- uses JS `Number` for report totals — BA-24.

## Problem

Define one money model: what is stored, how tax is calculated and rounded, how modifiers are
priced, what a "business day" is, and how sequential numbers are generated safely under concurrency.

## Decision

1. **Types.** Money columns are `NUMERIC(12,2)`, rate columns `NUMERIC(5,2)` (percent, 0–100).
   Application arithmetic uses `Prisma.Decimal` only. `Number()`/`parseFloat` on money is forbidden (lint rule
   in S1-P01-T003). Money crosses the network as a decimal string (`"480.00"`) plus the restaurant's
   `currency_code`. Formatting uses `Intl.NumberFormat` with the currency code, never a hard-coded symbol.
2. **Modifiers are relational.** `MENU_ITEM_VARIANT` (absolute unit price, e.g. Half ₹240 / Full ₹420) and
   `MENU_ITEM_ADDON` (additive price) are tables with NUMERIC prices. JSON price storage is removed.
   - If an item has ≥1 active variant, the order line must reference exactly one of that item's variants,
     and the variant price is the unit price. Otherwise the unit price is `MENU_ITEM.base_price`.
   - Add-ons must belong to the same item and be available. Each is selected at most once per line (add-on
     groups with min/max rules are Future Scope).
3. **Tax (Q-004 answered A + C).** Prices are tax-exclusive. Tax rate is per menu item.
   For each order line:
   `unit_total = unit_price + Σ addon_price`
   `line_subtotal = unit_total × quantity`
   `line_tax = ROUND_HALF_UP(line_subtotal × tax_rate / 100, 2)`
   `line_total = line_subtotal + line_tax`.
   Order: `subtotal_amount = Σ line_subtotal`, `tax_amount = Σ line_tax`, `discount_amount = 0.00`
   (no discount feature — Q-006), `total_amount = subtotal_amount + tax_amount − discount_amount`.
   **GST presentation (Q-004 C).** When `RESTAURANT.gstin` is set, receipts print the GSTIN and, for each distinct
   snapshotted `tax_rate`, the taxable value `Σ line_subtotal`, CGST at `tax_rate / 2` and SGST at `tax_rate / 2`, where
   `cgst_amount = ROUND_HALF_UP(Σ line_tax / 2, 2)` and `sgst_amount = Σ line_tax − cgst_amount`. CGST + SGST therefore
   equals the stored tax exactly. This is presentation only: no extra amounts are stored and totals do not change.
   Without a GSTIN the receipt prints a single tax line. IGST is not supported.
4. **Snapshots.** `ORDER_ITEM` stores item name, variant name, unit price, add-on total, tax rate, line subtotal,
   line tax and line total. `ORDER_ITEM_ADDON` stores add-on name and price. `ORDER` stores `currency_code`.
   Historical orders never read current menu prices.
5. **Business day.** `business_date` = the calendar date in `RESTAURANT.timezone` at the moment of creation
   (`Intl.DateTimeFormat` with the IANA zone; no fixed offsets). Timestamps are stored as `timestamptz` in UTC.
   Midnight-crossing service (late-night cut-over) is Future Scope.
6. **Sequential numbering.** `TENANT_COUNTER (tenant_id, counter_type, business_date, last_value)` is incremented
   inside the same transaction as the insert:
   `INSERT … VALUES ($t, 'ORDER', $d, 1) ON CONFLICT (tenant_id, counter_type, business_date) DO UPDATE SET last_value = tenant_counters.last_value + 1 RETURNING last_value`.
   Formats: order `YYYYMMDD-NNNN` (e.g. `20260915-0042`), KOT `K-NNN` per business day. Uniqueness backstops:
   `UNIQUE (tenant_id, order_number)`, `UNIQUE (tenant_id, business_date, kot_number)`.
7. **Idempotency.** `ORDER.idempotency_key` and `TRANSACTION.idempotency_key` (client-generated UUID per submit
   attempt) with `UNIQUE (tenant_id, idempotency_key)`. A repeated submit returns the original record.
8. **Payments are records, not gateway charges.** `TRANSACTION` is an append-only ledger of `PAYMENT` and `REFUND`
   rows (manual CASH/CARD/UPI recording). `ORDER.payment_status` is recomputed in the same transaction. A payment
   may not exceed the outstanding balance, except CASH, where `amount_tendered` may exceed and `change_due` is recorded.
   Refund total may not exceed paid total. Gateway integration is Future Scope (Q-015).

## Alternatives considered

| Alternative | Why not chosen |
|---|---|
| Integer minor units (paise) | Valid, but conflicts with the approved NUMERIC/Decimal rule and existing `Decimal(12,2)` columns |
| Tax on order subtotal instead of per line | Per-item rates (e.g. 5% vs 18%) require per-line tax |
| Round at order level only | Line-level rounding is what receipts print; order total must equal sum of printed lines |
| JSON modifiers with Decimal strings | Cannot enforce NUMERIC type, ownership FK or availability at DB level |
| PostgreSQL SEQUENCE per tenant | Sequences cannot reset per business day or be created per tenant cleanly; gaps on rollback |
| Count-based numbering (baseline) | Race conditions (BA-14) |

## Consequences

- Menu editor needs variant and add-on sub-forms. The order entry UI must force a variant choice.
- Receipts can print a tax line that reconciles exactly.
- Numbering gaps can occur when a transaction rolls back after incrementing; gaps are acceptable and documented.

## Security impact

Server-side pricing mitigates T-006 (price/total manipulation). Client-sent `price`, `total`, `tax` or `discount`
fields are rejected by schema (unknown keys → 422 VALIDATION_ERROR).

## Database impact

New `MENU_ITEM_VARIANT`, `MENU_ITEM_ADDON`, `ORDER_ITEM_ADDON`, `TENANT_COUNTER`; new order and order-item amount
columns; `business_date` on ORDER, KOT_TICKET, TRANSACTION; idempotency keys; optional `RESTAURANT.gstin` (Q-004 C).

## Migration impact

`0001_init` baseline. Q-017 answered: no existing data to preserve, so no conversion of JSON `variants`/`add_ons` is needed.

## Related documents

`implementation/slice-01/data-model.md`, `product/business-rules.md` (BR-MONEY-*, BR-ORD-*), `prd.md` (REQ-ORDER-*, REQ-TXN-*).
