---
title: "RASOIOS-ADR-015: Console-Requested LAN Printer Discovery"
document_type: "ADR"
project: "Restaurant SaaS Platform"
project_owner: "Gopala Krishna"
slice: "SLICE-01"
status: "APPROVED"
version: "1.0"
created: "2026-09-25"
last_updated: "2026-09-25"
owner: "Gopala Krishna (Project Owner)"
dependencies: ["RASOIOS-ADR-007"]
related_documents: ["../implementation/slice-01/open-questions.md", "../operations/print-agent.md"]
related_decisions: ["RASOIOS-ADR-004", "RASOIOS-ADR-007"]
---

# RASOIOS-ADR-015: Console-Requested LAN Printer Discovery

- **ID:** RASOIOS-ADR-015
- **Date:** 2026-09-25
- **Owner:** Gopala Krishna (Project Owner)
- **Status:** APPROVED — 2026-09-25, Gopala Krishna (Project Owner). Answers **Q-030 with option B**. Amends
  ADR-007 and the S1-P17-T010 / T-028 rule "the agent opens no listening ports" **for the mDNS socket only**.

## Context

Restaurants add Wi-Fi/Ethernet thermal printers by typing a private IP and port. Many staff do not know the printer's
address. The cloud cannot see the restaurant LAN; only the paired local agent can.

## Decision

1. **Requested, never ambient.** A TENANT_ADMIN (`printer:manage`) presses "Find nearby printers" for one of the
   tenant's online agents. The server records a `PRINTER_DISCOVERY` row (REQUESTED). The agent learns about it from its
   next claim response, marks it RUNNING, scans, and reports once (COMPLETED/FAILED). A request not picked up within
   60 s is reported to the console as "print agent offline".
2. **What the agent scans (bounded, ~6 s):**
   - mDNS / DNS-SD browse for `_pdl-datastream._tcp` (raw port printing), `_printer._tcp` and `_ipp._tcp` — a
     UDP multicast socket on 5353, opened only for the scan and closed immediately after.
   - TCP connect-probe of port 9100 on the agent's **own private IPv4 /24** (connect, then close; no data is sent).
   - Nothing else: no other ports, no other subnets, no public addresses.
3. **What is reported:** private IPv4, port, protocol (`RAW_9100` / `IPP`), advertised name/model when mDNS gives one,
   and whether raw ESC/POS printing is possible. Validated server-side (private IPv4 only, ≤ 64 results, bounded
   text). IPP-only devices are shown as not supported — the agent prints ESC/POS over raw TCP.
4. **Nothing is auto-registered.** A discovered device becomes a PRINTER only when a person adds it; it is shown as
   connected only after the agent reports it reachable and a real test print is acknowledged PRINTED.
5. **Tenant binding:** a discovery row is tenant-owned (composite keys to its agent); the agent can only see and
   answer its own requests (tenant and agent from the bearer token, ADR-007 §1).

## Alternatives considered

| Alternative | Why not |
|---|---|
| Continuous background discovery | Constant multicast/port traffic on a restaurant network; the need is one-off at setup |
| Whole-subnet port scan beyond /24, more ports | Intrusive, slow, and can trip office security tools |
| Browser-side discovery | Browsers cannot scan a LAN |

## Consequences

- Migration 0003 adds `printer_discoveries` (E29). RH-AGT-03 claim responses gain an optional `discovery` field;
  new RH-AGT-06 `POST /api/v1/print-agent/discoveries/{id}` for the result.
- Not every printer advertises itself; manual IP entry remains.
