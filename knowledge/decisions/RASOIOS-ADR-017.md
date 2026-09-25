---
title: "RASOIOS-ADR-017: ImageKit for Image Upload, Storage and Delivery"
document_type: "ADR"
project: "Restaurant SaaS Platform"
project_owner: "Gopala Krishna"
slice: "SLICE-01"
status: "APPROVED"
version: "1.0"
created: "2026-09-25"
last_updated: "2026-09-25"
owner: "Gopala Krishna (Project Owner)"
planned_start: "2026-09-25"
planned_finish: "Not scheduled — execution-order plan"
dependencies: ["RASOIOS-ADR-003", "RASOIOS-ADR-008", "RASOIOS-ADR-011"]
related_documents: ["../implementation/slice-01/open-questions.md", "../implementation/slice-01/data-model.md", "../implementation/slice-01/api.md", "../implementation/slice-01/security.md", "../operations/railway.md"]
related_decisions: ["RASOIOS-ADR-012", "RASOIOS-ADR-013"]
---

# RASOIOS-ADR-017: ImageKit for Image Upload, Storage and Delivery

- **ID:** RASOIOS-ADR-017
- **Date:** 2026-09-25
- **Owner:** Gopala Krishna (Project Owner)
- **Status:** APPROVED — 2026-09-25, Gopala Krishna (Project Owner). **Supersedes the answer to Q-009** (A, 2026-09-22:
  "allow-listed HTTPS image URLs only; no uploads, no object storage") and the "no uploads in SLICE-01" clause of
  ADR-013 §6. Reopens S1-P07-T009.
- **Numbering note:** ADR-015 and ADR-016 were taken by parallel work (printer discovery, console theme preference).

## Context

Restaurants cannot be expected to host their own images, and pasting third-party links produced broken or
unsuitable images. The Project Owner asked for ImageKit as the single upload, storage, optimisation and CDN layer for
restaurant images (logo, cover, hero, favicon, website section images, menu item images).

## Decision

1. **ImageKit stores and serves the bytes; PostgreSQL stores only the reference.** New table `media_assets` (E28):
   ImageKit `fileId`, URL, path, type, size, dimensions, SHA-256, original name, uploader. The existing URL columns
   (`restaurants.logo_url`, `menu_items.image_url`, …) keep holding the untransformed ImageKit URL, so every existing
   reader keeps working. No image binary is written to PostgreSQL or to the app's filesystem.
2. **Uploads are proxied through the application** (owner's choice, 2026-09-25): browser → `POST /api/v1/media/uploads`
   → validation and re-encoding → ImageKit Upload API with the private key. The browser never receives the private key
   or any upload signature. The alternative — a server-signed token and a direct browser upload — was rejected because
   the file would be stored before the server could inspect it, and ImageKit's classic signature does not bind the
   folder, so a tenant could have written into another tenant's folder.
3. **Validation before storage (SC-FILE-01):** at most 5 MB; type from magic bytes (JPEG, PNG, WebP only — SVG, GIF,
   HEIC rejected); decode limit 50 MP; re-encoded with `sharp` in the same format, orientation applied, all metadata
   (EXIF/GPS/XMP) dropped, longest side capped at 4096 px.
4. **Tenant isolation (SC-FILE-02):** the folder is `/rasoios/restaurants/{tenantId}/{logo|cover|hero|favicon|website|menu}`,
   built on the server from the authenticated tenant context; file names are server-generated UUIDs. Every image
   field that is saved with an ImageKit URL must name a `READY` asset **of the caller's tenant**, so a tenant cannot
   reference, replace or delete another tenant's asset. Asset ids from the browser are only ever looked up inside the
   caller's tenant.
5. **Replacement and deletion:** the new reference is committed first; only then is an asset that nothing in the
   tenant references any more marked `DELETED` (audited) and removed from ImageKit. An asset still referenced — by
   another field, or by an archived menu item — is kept. An uploaded-but-never-saved image can be discarded by its
   uploader's tenant through `DELETE /api/v1/media/{assetId}`.
6. **Delivery:** public restaurant images are public ImageKit CDN URLs (they are shown on a public website anyway).
   Pages request a size-appropriate rendition with ImageKit URL transformations (`tr=w-…,q-80,f-auto`) instead of
   passing ImageKit images through the Next.js image optimiser. Private tenant assets are out of scope; if they are
   added they need signed URLs, not these public ones.
7. **Configuration:** `IMAGEKIT_PRIVATE_KEY` and `IMAGEKIT_URL_ENDPOINT`, both or neither (`lib/env.ts`). Unset, uploads
   are disabled (503 `UPLOADS_DISABLED`) and the URL-paste fields keep working. `IMAGEKIT_PUBLIC_KEY` is not needed by
   the proxied flow. The ImageKit endpoint host is added to the image allow-list automatically.
8. **Limits:** 30 uploads per user per hour (ADR-011 rate limiter); permission `website:update`-equivalent for website
   images and `menu:manage`-equivalent for menu images (see `lib/media/purposes.ts`).

## Consequences

- One new external dependency (ImageKit) and one new npm dependency (`sharp`, already present through Next.js).
- Upload traffic passes through the app server (≤ 5 MB per request). Acceptable for restaurant volumes; revisit with
  JWT-bound direct uploads if it becomes a bottleneck.
- Pasted allow-listed URLs remain supported alongside uploads.
- Not covered yet: a multi-image gallery model and category images (the schema has neither), and uploads during
  platform-admin restaurant creation — images are added from the restaurant's own console after creation.
