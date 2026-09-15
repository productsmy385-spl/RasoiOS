---
title: "Integration Architecture & Thermal Print Agent"
document_type: "INTEGRATION"
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
related_documents: ["architecture.md"]
related_decisions: ["ADR-004"]
---

# Integration Architecture & Thermal Print Agent

## Local Thermal Print Agent Workflow
1. Cloud server creates `PrintJob` in database (`status: PENDING`, `jobType: KOT`, `tenantId: "..."`).
2. Local Print Agent polls `/api/print-jobs/poll` every 3 seconds passing `Bearer <AGENT_API_TOKEN>`.
3. Server resolves agent's tenant ID and returns pending jobs belonging strictly to that tenant.
4. Agent renders ESC/POS byte sequence and transmits to USB (`/dev/usb/lp0` or `COM3`) or LAN IP (`192.168.1.200:9100`).
5. Agent posts status update (`PRINTED` or `FAILED`) back to cloud server.
