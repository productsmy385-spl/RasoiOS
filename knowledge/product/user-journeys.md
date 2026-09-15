---
title: "End-To-End User Journeys"
document_type: "USER_JOURNEYS"
project: "Restaurant SaaS Platform (RASOIOS)"
project_owner: "Gopala Krishna"
status: "APPROVED"
version: "1.0"
created: "2026-09-15"
last_updated: "2026-09-15"
author: "Gopala Krishna"
review_owner: "Gopala Krishna"
target_slice: "ALL"
target_start_date: "2026-09-15"
target_end_date: "2026-11-22"
priority: "HIGH"
dependencies: []
related_documents: ["prd.md", "personas.md"]
related_decisions: []
---

# End-To-End User Journeys

## Journey 1: Customer Order via Public Website
1. Customer visits `https://rasoios.com/r/taj-palace`.
2. Views branded landing page, opening hours, contact details, and daily menu.
3. Selects items, variants, special instructions, and places order.
4. Server validates item availability, calculates totals server-side, creates `Order`, creates `OrderItem` snapshots, and enqueues `KOTTicket` & `PrintJob`.

## Journey 2: Kitchen Staff KOT Workflow
1. Chef opens Kitchen Display System (KDS) on tablet (`/restaurant/kitchen`).
2. New KOT card appears in `QUEUED` column with table number and instructions.
3. Chef taps "Start Preparing" -> Status moves to `PREPARING`.
4. Chef taps "Ready" -> Status moves to `READY` and waiter is notified.
