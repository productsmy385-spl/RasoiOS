---
title: "RASOIOS-ADR-004: Cloud Thermal Printing Architecture"
document_type: "ADR"
project: "Restaurant SaaS Platform (RASOIOS)"
project_owner: "Gopala Krishna"
status: "APPROVED"
version: "1.0"
created: "2026-09-15"
last_updated: "2026-09-15"
author: "Gopala Krishna"
review_owner: "Gopala Krishna"
target_slice: "Slice 05"
target_start_date: "2026-10-19"
target_end_date: "2026-10-28"
priority: "HIGH"
dependencies: []
related_documents: ["../architecture/architecture.md"]
related_decisions: []
---

# RASOIOS-ADR-004: Cloud Thermal Printing Architecture

## Context
Cloud applications cannot open direct local network connections to restaurant USB/LAN thermal printers behind local NAT routers.

## Decision
Implement a cloud print job queue (`PrintJob`) in PostgreSQL. A lightweight local print agent running at the restaurant polls the print queue via authenticated TLS, renders ESC/POS commands, and dispatches to local thermal receipt printers.

## Consequences
- No public port forwarding or complex network setup required at the restaurant.
- Print jobs are queueable, retriable, and fully auditable.
