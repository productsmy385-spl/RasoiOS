---
title: "SLICE-01 API Plan — Server Actions, Route Handlers and Server Loaders"
document_type: "API_PLAN"
project: "Restaurant SaaS Platform"
project_owner: "Gopala Krishna"
slice: "SLICE-01"
status: "PROPOSED"
version: "2.0"
created: "2026-09-15"
last_updated: "2026-09-15"
owner: "Backend Engineer (UNASSIGNED) — approval: Gopala Krishna"
planned_start: "Not scheduled — execution-order plan"
planned_finish: "Not scheduled — execution-order plan"
dependencies: ["data-model.md", "security.md", "tenant-isolation.md"]
related_documents: ["security.md", "tenant-isolation.md", "frontend.md", "data-model.md", "testing.md"]
related_decisions: ["RASOIOS-ADR-006", "RASOIOS-ADR-007", "RASOIOS-ADR-008", "RASOIOS-ADR-009", "RASOIOS-ADR-010", "RASOIOS-ADR-011"]
---

# SLICE-01 API Plan

## 1. Conventions (apply to every endpoint unless the endpoint says otherwise)

### 1.1 Endpoint kinds

| Prefix | Kind | Transport | Used for |
|---|---|---|---|
| `LD-` | **Server loader** | Function in `lib/services` called by a Server Component (no public HTTP route) | Initial page data. It still authenticates, authorises and scopes: loaders are an access boundary. |
| `SA-` | **Server Action** | POST to the page route with a Next.js action id | All UI mutations |
| `RH-` | **Route Handler** | HTTP JSON under `app/api/**` or file routes | Polling reads (ADR-009), print agent (ADR-007), webhooks, health, images |

### 1.2 Defaults

| Aspect | Default |
|---|---|
| Authentication | Clerk session (SC-AUTH-04). Public, agent and webhook endpoints state their own. |
| Tenant context | `TenantContext` from `requireTenant()`; **no endpoint accepts a tenant identifier** (SC-TEN-01) |
| Authorization | `requirePermission(ctx, code)` before loading resources (SC-RBAC-01); codes from `security.md` §3.3 |
| Validation | Zod `.strict()`. UUIDs `z.string().uuid()`. Money `^\d{1,10}(\.\d{1,2})?$` as string. Dates `YYYY-MM-DD`. Text trimmed with max lengths from `data-model.md`. |
| Money in responses | Decimal strings + `currencyCode` |
| Timestamps | ISO-8601 UTC (`2026-09-15T10:30:00.000Z`); business dates `YYYY-MM-DD` |
| Action result | `{ ok: true, data } \| { ok: false, error: { code, message, requestId, fieldErrors?, details? } }` — actions never throw raw errors to the client |
| `error.details` | Only what a contract names for that code, e.g. `{ existingCustomerId }` on SA-CUS-01 `PHONE_EXISTS`. It crosses the wire exactly as written, so it never holds a provider response, a query, a stack or another tenant's data [fact: `lib/http/action.ts`, `lib/errors.ts` `AppError.details`, 2026-09-23] |
| Route handler errors | `{ "error": { "code": "…", "message": "…", "requestId": "…" } }` + HTTP status (same body as an action error, `details` included) |
| Common errors | 401 `UNAUTHENTICATED` · 403 `FORBIDDEN` · 403 `NO_ACTIVE_MEMBERSHIP` · 403 `TENANT_SUSPENDED` · 404 `NOT_FOUND` (missing **or other tenant**) · 409 `CONFLICT` · 422 `VALIDATION_ERROR` · 429 `RATE_LIMITED` · 500 `INTERNAL` (generic message) · 503 `SERVICE_UNAVAILABLE` |
| Pagination | Cursor: `cursor` (opaque base64 of `created_at,id`), `limit` default 25, max 100 → `{ items, nextCursor }` (SC-API-04) |
| Rate limiting | `session.mutation` 120/min per user on all SA (ADR-011); others as stated |
| Audit | Action names from `security.md` §7, written in the same transaction (SC-AUD-02) |
| Idempotency | Stated per endpoint; otherwise the operation is naturally idempotent or not replay-sensitive |
| Caching | Authenticated: `no-store`. Public: stated per endpoint. |
| Tests | Every endpoint appears in the RBAC matrix (`security.md` §3.3) and, where tenant-owned, in `tenant-isolation-tests.md` |

### 1.3 Removed baseline endpoints

| Baseline | Disposition |
|---|---|
| `GET/POST /api/print-jobs/poll` (`app/api/print-jobs/poll/route.ts`) | **Deleted** (BA-01). Replaced by RH-AGT-01…05 |
| `getOrdersAction`, `getCustomersAction`, `getKOTTicketsAction`, `getPrintJobsAction`, `getSocialPostsAction`, `getTransactionsAction`, `getAnalyticsAction` (read via Server Actions) | Replaced by loaders + polling route handlers |
| Every `requestedTenantId` action parameter | Removed (ADR-006) |
| `submitPublicOrderAction` | Kept disabled behind Q-001 (SA-PUB-01) |

---

## 2. Session and identity

#### LD-AUTH-01 — Session context
- **Route:** `lib/auth/context.ts#getSessionContext()` used by `app/restaurant/layout.tsx`, `app/admin/layout.tsx`
- **Purpose:** Resolve user, memberships, active tenant, restaurant timezone/currency, capabilities for navigation
- **AuthZ:** session; `restaurant:read` for tenant part · **Tenant:** resolved per ADR-006
- **Response:** `{ user: {id, fullName, email}, platformRole, activeTenant?: {tenantId, name, slug, role, timezone, currencyCode}, memberships: [{membershipId, tenantName, role}], capabilities: Permission[] }`
- **Errors:** redirects to `/sign-in`, `/account/no-access`, `/account/select-tenant`, `/account/suspended`
- **Audit:** none (reads) · **Rate limit:** none · **Tests:** TC-AUTH-005, TC-AUTH-007, TC-AUTH-008, TC-TENANT-001

#### SA-AUTH-01 — switchActiveTenantAction
- **Route:** Server Action in `app/account/select-tenant/actions.ts`
- **Purpose:** Set the active tenant preference for multi-membership users
- **AuthZ:** session (any ACTIVE membership) · **Tenant:** target must be one of the caller's ACTIVE memberships
- **Request:** `{ membershipId: uuid }` · **Validation:** membership belongs to caller, ACTIVE, tenant ACTIVE
- **Response:** redirect `/restaurant` · **Errors:** 404 if membership not the caller's (no oracle)
- **Audit:** `session.tenant_switched` · **Idempotency:** naturally idempotent · **Tests:** TC-TENANT-004, ADV-004

#### RH-AUTH-01 — Clerk webhook
- **Method / route:** `POST /api/webhooks/clerk`
- **Purpose:** Sync `user.updated` (email, name) and `user.deleted` (→ USER INACTIVE, memberships INACTIVE)
- **AuthN:** Svix signature with `CLERK_WEBHOOK_SIGNING_SECRET` (SC-WH-01) · **AuthZ:** none (machine) · **Tenant:** none (global USER)
- **Request:** raw body; headers `svix-id`, `svix-timestamp`, `svix-signature`
- **Validation:** signature, timestamp within 5 min, event type ∈ {`user.updated`, `user.deleted`}; other types → 200 ignored
- **Response:** `200 {}` · **Errors:** 400 `INVALID_SIGNATURE`, 429
- **Audit:** `user.email_synced`, `user.profile_synced`, `user.status_changed` (actor WEBHOOK)
- **Rate limit:** `webhook.clerk` 60/min per IP · **Idempotency:** handlers idempotent (SC-WH-02) · **Tests:** TC-AUTH-016, TC-AUTH-017, ADV-022

---

## 3. Platform (Super Admin)

All platform endpoints: **AuthZ** `USER.platform_role = SUPER_ADMIN` via `requirePlatform(permission)`. **Tenant** `PlatformContext` (no tenant context). The `tenantId` route parameter identifies the *target* tenant for platform operations and is authorised by platform role, not membership.

#### LD-ADM-01 — Platform dashboard
- **Route:** `app/admin/page.tsx` · **Permission:** `platform:tenant:read`
- **Response:** `{ tenantCounts: {active, suspended}, recentTenants: [{id,name,slug,status,createdAt}], recentPlatformAudit: [...] }`. **No tenant financials or operational data.**
- **Filters/sort:** none; recent = last 10 by `created_at desc` · **Audit:** none · **Tests:** TC-ADMIN-001, TC-RBAC-101

#### LD-ADM-02 — Tenant list
- **Route:** `app/admin/tenants/page.tsx` · **Permission:** `platform:tenant:read`
- **Request:** `?q=&status=ACTIVE|SUSPENDED&cursor=&limit=` · **Validation:** q ≤ 80 chars
- **Response:** `{ items: [{id,name,slug,status,createdAt,memberCount,websitePublished}], nextCursor }`
- **Pagination:** cursor · **Filters:** status, name/slug search (ILIKE, escaped) · **Sorting:** `name asc` (default), `createdAt desc` · **Tests:** TC-ADMIN-002

#### LD-ADM-03 — Tenant inspection
- **Route:** `app/admin/tenants/[tenantId]/page.tsx` · **Permission:** `platform:tenant:read`
- **Response:** `{ tenant: {id,name,slug,status,suspendedAt,suspensionReason}, restaurant: {name,timezone,currencyCode,websitePublished,city,countryCode}, members: [{fullName,email,role,status}], counts: {menuItems, ordersLast30Days, printAgentsActive} }` — counts only, no order/customer/transaction rows (SC-RBAC-07)
- **Errors:** 404 unknown tenant · **Audit:** `platform.tenant_inspected` · **Tests:** TC-ADMIN-006

#### SA-ADM-01 — createTenantAction
- **Route:** `app/admin/tenants/new/actions.ts` · **Permission:** `platform:tenant:create`
- **Purpose:** Create TENANT + RESTAURANT (+ default hours closed) and invite the first TENANT_ADMIN, in one transaction (Clerk invitation sent after commit; failure → membership stays INVITED with "resend" option)
- **Request:** `{ tenantName, slug, restaurantName, timezone, currencyCode, countryCode, adminEmail, adminFullName? }`
- **Validation:** slug pattern + reserved list + uniqueness; IANA timezone; ISO 4217 currency; email
- **Response:** `{ tenantId, slug }` → redirect `/admin/tenants/[tenantId]`
- **Errors:** 422 `SLUG_TAKEN`, 422 `VALIDATION_ERROR`, 502 `INVITATION_FAILED` (tenant created; shown as warning)
- **Audit:** `tenant.created`, `tenant_admin.invited` · **Idempotency:** slug uniqueness prevents duplicates · **Tests:** TC-ADMIN-003, TC-RBAC-102

#### SA-ADM-02 — updateTenantAction
- **Permission:** `platform:tenant:update` · **Request:** `{ targetTenantId, name?, slug? }`
- **Validation:** as create. The slug is **immutable after provisioning** (RASOIOS-ADR-012 §4, 2026-09-23, superseding the
  `confirmSlugChange` flow of S1-P06-T001): sending the current slug is a no-op, any other value is refused
- **Response:** `{ tenantId, name, slug, changed }` · **Errors:** 404, 422 `SLUG_IMMUTABLE` · **Audit:** `tenant.updated` (B/A) · **Tests:** TC-ADMIN-004, TC-ADMIN-014

#### SA-ADM-07 — handOverTenantAction *(S1-P06-T009, ADR-013 §7)*
- **Permission:** `platform:tenant:update` · **Request:** `{ targetTenantId, note? }`
- **Validation:** the tenant needs at least one ACTIVE TENANT_ADMIN (the invitation was accepted). Idempotent: a second
  call writes nothing and reports the first handover
- **Response:** `{ tenantId, provisioningState, handedOverAt, alreadyHandedOver }` · **Errors:** 404, 409 `HANDOVER_NOT_READY`
- **Audit:** `tenant.handed_over` — the append-only audit row *is* the state; LD-ADM-03 derives
  `tenant.provisioningState` (`PROVISIONING` | `HANDED_OVER`) from it · **Tests:** TC-ADMIN-013

#### SA-ADM-03 — suspendTenantAction
- **Permission:** `platform:tenant:suspend` · **Request:** `{ tenantId, reason (10–500) }`
- **Effect:** status SUSPENDED, `suspended_at`; staff lose access next request; public site 404
- **Errors:** 404, 409 `ALREADY_SUSPENDED` · **Audit:** `tenant.suspended` (reason) · **Tests:** TC-ADMIN-005, TC-AUTH-008

#### SA-ADM-04 — reactivateTenantAction
- **Permission:** `platform:tenant:reactivate` · **Request:** `{ tenantId }` · **Errors:** 404, 409 `NOT_SUSPENDED`
- **Audit:** `tenant.reactivated` · **Tests:** TC-ADMIN-005

#### SA-ADM-05 — inviteTenantAdminAction
- **Permission:** `platform:tenant_admin:invite` · **Request:** `{ tenantId, email, fullName? }`
- **Effect:** USER (if new) + USER_TENANT INVITED role TENANT_ADMIN + Clerk invitation; re-invite resends
- **Errors:** 404, 409 `ALREADY_MEMBER` · **Audit:** `tenant_admin.invited` · **Rate limit:** session.mutation · **Tests:** TC-ADMIN-003

#### SA-ADM-06 — revokeTenantAdminInviteAction
- **Permission:** `platform:tenant_admin:invite` · **Request:** `{ tenantId, membershipId }` · **Validation:** membership INVITED and belongs to target tenant
- **Effect:** revoke Clerk invitation; membership INACTIVE · **Audit:** `tenant_admin.invite_revoked` · **Tests:** TC-ADMIN-007

#### LD-ADM-04 — Platform audit log
- **Route:** `app/admin/audit/page.tsx` · **Permission:** `platform:audit:read`
- **Request:** `?action=&tenantId=&from=&to=&cursor=` (tenantId here is a **filter** on platform-visible rows)
- **Response:** rows where `tenant_id IS NULL` or `action LIKE 'tenant.%' | 'tenant_admin.%' | 'platform.%'`
- **Pagination:** cursor; **Sort:** `created_at desc` · **Tests:** TC-ADMIN-008, TI-051

---

## 4. Tenant dashboard

#### LD-DASH-01 — Dashboard summary (initial)
- **Route:** `app/restaurant/dashboard/page.tsx` · **Permission:** `dashboard:read`
- **Response:** `{ businessDate, now, salesToday: {net, orderCount, averageOrderValue}, ordersByStatus: {NEW, ACCEPTED, PREPARING, READY}, activeKots: {queued, preparing, ready, oldestQueuedMinutes}, menu: {publishedItems, unavailableItems}, dailyMenu: {status, itemCount} | null, paymentsToday: {CASH, CARD, UPI, refunds}, printing: {agentsOnline, agentsOffline, failedJobs}, dayClosed: boolean }` — all for the restaurant business date (timezone-aware)
- **Tests:** TC-DASH-001, TC-DASH-002, TI-047

#### RH-DASH-01 — Dashboard summary (poll)
- **Method / route:** `GET /api/v1/dashboard/summary` · **Permission:** `dashboard:read`
- **Response:** as LD-DASH-01 · **Caching:** no-store · **Polling:** 30 s (ADR-009) · **Tests:** TC-DASH-001

---

## 5. Restaurant, website, kitchen sections, media

#### LD-RST-01 — Restaurant settings
- **Route:** `app/restaurant/settings/page.tsx`, `app/restaurant/website/page.tsx` · **Permission:** `restaurant:read` (form editable only with update permissions)
- **Response:** `{ restaurant: {…all E02 fields}, hours: [...], kitchenSections: [...], canEdit: {profile, settings, website, sections} }`
- **Tests:** TC-REST-001

#### SA-RST-01 — updateRestaurantProfileAction
- **Permission:** `restaurant:update` · **Request:** `{ name, description?, phoneE164?, email?, addressLine1?, addressLine2?, city?, region?, postalCode? }`
- **Validation:** `data-model.md` E02 · **Response:** updated profile DTO · **Audit:** `restaurant.profile_updated` (B/A) · **Tests:** TC-REST-002

#### SA-RST-02 — updateBrandingAction
- **Permission:** `website:update` · **Request:** `{ logoUrl?, coverImageUrl?, brandAccentHex? }`
- **Validation:** URL allowlist or READY media asset (SC-VAL-04); accent contrast ≥4.5:1 · **Audit:** `restaurant.branding_updated` · **Tests:** TC-REST-003, TC-SEC-003

#### SA-RST-03 — replaceOpeningHoursAction
- **Permission:** `restaurant:update` · **Request:** `{ days: [{ dayOfWeek 1–7, isClosed, shifts: [{opensAt "HH:mm", closesAt "HH:mm"}] (≤3) }] (exactly 7) }`
- **Validation:** non-overlapping shifts; closed ⇒ no shifts · **Effect:** replace set in one transaction · **Audit:** `restaurant.hours_updated` · **Tests:** TC-REST-004

#### SA-RST-04 — updateOperationalSettingsAction
- **Permission:** `restaurant:settings:update` · **Request:** `{ timezone, currencyCode, countryCode, defaultOrderType, autoPrintKot, receiptFooter?, gstin? }`
- **Validation:** IANA zone; currency immutable once orders exist (INV-09); `gstin` 15-character GSTIN format or null · **Errors:** 409 `CURRENCY_LOCKED` · **Audit:** `restaurant.settings_updated` · **Tests:** TC-REST-005, TC-REST-006, TC-REST-009, TC-TZ-001

#### SA-RST-05 — updateWebsiteSettingsAction
- **Permission:** `website:update` · **Request:** `{ showPhone, showEmail, showAddress, seoTitle?, seoDescription? }`
- **Effect:** `revalidatePath('/r/[slug]')` · **Audit:** `restaurant.website_updated` · **Tests:** TC-WEB-006

#### SA-RST-06 — setWebsitePublishedAction
- **Permission:** `website:update` · **Request:** `{ published: boolean }` · **Validation:** publishing requires restaurant name, timezone, ≥1 published category with ≥1 published item
- **Errors:** 422 `WEBSITE_NOT_READY` (lists missing items) · **Audit:** `restaurant.website_published` / `_unpublished` · **Tests:** TC-WEB-007

#### SA-WEB-01 — updateWebsiteThemeAction *(ADR-013 §6)*
- **Permission:** `website:update` · **Request:** `{ preset: PLATFORM|CITRUS|OCEAN|BERRY|CUSTOM, surfaceMode: DARK|LIGHT, primaryHex?, secondaryHex?, accentHex?, gradientFromHex?, gradientToHex? }`
- **Validation:** colours `^#[0-9A-Fa-f]{6}---
title: "SLICE-01 API Plan — Server Actions, Route Handlers and Server Loaders"
document_type: "API_PLAN"
project: "Restaurant SaaS Platform"
project_owner: "Gopala Krishna"
slice: "SLICE-01"
status: "PROPOSED"
version: "2.0"
created: "2026-09-15"
last_updated: "2026-09-15"
owner: "Backend Engineer (UNASSIGNED) — approval: Gopala Krishna"
planned_start: "Not scheduled — execution-order plan"
planned_finish: "Not scheduled — execution-order plan"
dependencies: ["data-model.md", "security.md", "tenant-isolation.md"]
related_documents: ["security.md", "tenant-isolation.md", "frontend.md", "data-model.md", "testing.md"]
related_decisions: ["RASOIOS-ADR-006", "RASOIOS-ADR-007", "RASOIOS-ADR-008", "RASOIOS-ADR-009", "RASOIOS-ADR-010", "RASOIOS-ADR-011"]
---

# SLICE-01 API Plan

## 1. Conventions (apply to every endpoint unless the endpoint says otherwise)

### 1.1 Endpoint kinds

| Prefix | Kind | Transport | Used for |
|---|---|---|---|
| `LD-` | **Server loader** | Function in `lib/services` called by a Server Component (no public HTTP route) | Initial page data. It still authenticates, authorises and scopes: loaders are an access boundary. |
| `SA-` | **Server Action** | POST to the page route with a Next.js action id | All UI mutations |
| `RH-` | **Route Handler** | HTTP JSON under `app/api/**` or file routes | Polling reads (ADR-009), print agent (ADR-007), webhooks, health, images |

### 1.2 Defaults

| Aspect | Default |
|---|---|
| Authentication | Clerk session (SC-AUTH-04). Public, agent and webhook endpoints state their own. |
| Tenant context | `TenantContext` from `requireTenant()`; **no endpoint accepts a tenant identifier** (SC-TEN-01) |
| Authorization | `requirePermission(ctx, code)` before loading resources (SC-RBAC-01); codes from `security.md` §3.3 |
| Validation | Zod `.strict()`. UUIDs `z.string().uuid()`. Money `^\d{1,10}(\.\d{1,2})?$` as string. Dates `YYYY-MM-DD`. Text trimmed with max lengths from `data-model.md`. |
| Money in responses | Decimal strings + `currencyCode` |
| Timestamps | ISO-8601 UTC (`2026-09-15T10:30:00.000Z`); business dates `YYYY-MM-DD` |
| Action result | `{ ok: true, data } \| { ok: false, error: { code, message, requestId, fieldErrors?, details? } }` — actions never throw raw errors to the client |
| `error.details` | Only what a contract names for that code, e.g. `{ existingCustomerId }` on SA-CUS-01 `PHONE_EXISTS`. It crosses the wire exactly as written, so it never holds a provider response, a query, a stack or another tenant's data [fact: `lib/http/action.ts`, `lib/errors.ts` `AppError.details`, 2026-09-23] |
| Route handler errors | `{ "error": { "code": "…", "message": "…", "requestId": "…" } }` + HTTP status (same body as an action error, `details` included) |
| Common errors | 401 `UNAUTHENTICATED` · 403 `FORBIDDEN` · 403 `NO_ACTIVE_MEMBERSHIP` · 403 `TENANT_SUSPENDED` · 404 `NOT_FOUND` (missing **or other tenant**) · 409 `CONFLICT` · 422 `VALIDATION_ERROR` · 429 `RATE_LIMITED` · 500 `INTERNAL` (generic message) · 503 `SERVICE_UNAVAILABLE` |
| Pagination | Cursor: `cursor` (opaque base64 of `created_at,id`), `limit` default 25, max 100 → `{ items, nextCursor }` (SC-API-04) |
| Rate limiting | `session.mutation` 120/min per user on all SA (ADR-011); others as stated |
| Audit | Action names from `security.md` §7, written in the same transaction (SC-AUD-02) |
| Idempotency | Stated per endpoint; otherwise the operation is naturally idempotent or not replay-sensitive |
| Caching | Authenticated: `no-store`. Public: stated per endpoint. |
| Tests | Every endpoint appears in the RBAC matrix (`security.md` §3.3) and, where tenant-owned, in `tenant-isolation-tests.md` |

### 1.3 Removed baseline endpoints

| Baseline | Disposition |
|---|---|
| `GET/POST /api/print-jobs/poll` (`app/api/print-jobs/poll/route.ts`) | **Deleted** (BA-01). Replaced by RH-AGT-01…05 |
| `getOrdersAction`, `getCustomersAction`, `getKOTTicketsAction`, `getPrintJobsAction`, `getSocialPostsAction`, `getTransactionsAction`, `getAnalyticsAction` (read via Server Actions) | Replaced by loaders + polling route handlers |
| Every `requestedTenantId` action parameter | Removed (ADR-006) |
| `submitPublicOrderAction` | Kept disabled behind Q-001 (SA-PUB-01) |

---

## 2. Session and identity

#### LD-AUTH-01 — Session context
- **Route:** `lib/auth/context.ts#getSessionContext()` used by `app/restaurant/layout.tsx`, `app/admin/layout.tsx`
- **Purpose:** Resolve user, memberships, active tenant, restaurant timezone/currency, capabilities for navigation
- **AuthZ:** session; `restaurant:read` for tenant part · **Tenant:** resolved per ADR-006
- **Response:** `{ user: {id, fullName, email}, platformRole, activeTenant?: {tenantId, name, slug, role, timezone, currencyCode}, memberships: [{membershipId, tenantName, role}], capabilities: Permission[] }`
- **Errors:** redirects to `/sign-in`, `/account/no-access`, `/account/select-tenant`, `/account/suspended`
- **Audit:** none (reads) · **Rate limit:** none · **Tests:** TC-AUTH-005, TC-AUTH-007, TC-AUTH-008, TC-TENANT-001

#### SA-AUTH-01 — switchActiveTenantAction
- **Route:** Server Action in `app/account/select-tenant/actions.ts`
- **Purpose:** Set the active tenant preference for multi-membership users
- **AuthZ:** session (any ACTIVE membership) · **Tenant:** target must be one of the caller's ACTIVE memberships
- **Request:** `{ membershipId: uuid }` · **Validation:** membership belongs to caller, ACTIVE, tenant ACTIVE
- **Response:** redirect `/restaurant` · **Errors:** 404 if membership not the caller's (no oracle)
- **Audit:** `session.tenant_switched` · **Idempotency:** naturally idempotent · **Tests:** TC-TENANT-004, ADV-004

#### RH-AUTH-01 — Clerk webhook
- **Method / route:** `POST /api/webhooks/clerk`
- **Purpose:** Sync `user.updated` (email, name) and `user.deleted` (→ USER INACTIVE, memberships INACTIVE)
- **AuthN:** Svix signature with `CLERK_WEBHOOK_SIGNING_SECRET` (SC-WH-01) · **AuthZ:** none (machine) · **Tenant:** none (global USER)
- **Request:** raw body; headers `svix-id`, `svix-timestamp`, `svix-signature`
- **Validation:** signature, timestamp within 5 min, event type ∈ {`user.updated`, `user.deleted`}; other types → 200 ignored
- **Response:** `200 {}` · **Errors:** 400 `INVALID_SIGNATURE`, 429
- **Audit:** `user.email_synced`, `user.profile_synced`, `user.status_changed` (actor WEBHOOK)
- **Rate limit:** `webhook.clerk` 60/min per IP · **Idempotency:** handlers idempotent (SC-WH-02) · **Tests:** TC-AUTH-016, TC-AUTH-017, ADV-022

---

## 3. Platform (Super Admin)

All platform endpoints: **AuthZ** `USER.platform_role = SUPER_ADMIN` via `requirePlatform(permission)`. **Tenant** `PlatformContext` (no tenant context). The `tenantId` route parameter identifies the *target* tenant for platform operations and is authorised by platform role, not membership.

#### LD-ADM-01 — Platform dashboard
- **Route:** `app/admin/page.tsx` · **Permission:** `platform:tenant:read`
- **Response:** `{ tenantCounts: {active, suspended}, recentTenants: [{id,name,slug,status,createdAt}], recentPlatformAudit: [...] }`. **No tenant financials or operational data.**
- **Filters/sort:** none; recent = last 10 by `created_at desc` · **Audit:** none · **Tests:** TC-ADMIN-001, TC-RBAC-101

#### LD-ADM-02 — Tenant list
- **Route:** `app/admin/tenants/page.tsx` · **Permission:** `platform:tenant:read`
- **Request:** `?q=&status=ACTIVE|SUSPENDED&cursor=&limit=` · **Validation:** q ≤ 80 chars
- **Response:** `{ items: [{id,name,slug,status,createdAt,memberCount,websitePublished}], nextCursor }`
- **Pagination:** cursor · **Filters:** status, name/slug search (ILIKE, escaped) · **Sorting:** `name asc` (default), `createdAt desc` · **Tests:** TC-ADMIN-002

#### LD-ADM-03 — Tenant inspection
- **Route:** `app/admin/tenants/[tenantId]/page.tsx` · **Permission:** `platform:tenant:read`
- **Response:** `{ tenant: {id,name,slug,status,suspendedAt,suspensionReason}, restaurant: {name,timezone,currencyCode,websitePublished,city,countryCode}, members: [{fullName,email,role,status}], counts: {menuItems, ordersLast30Days, printAgentsActive} }` — counts only, no order/customer/transaction rows (SC-RBAC-07)
- **Errors:** 404 unknown tenant · **Audit:** `platform.tenant_inspected` · **Tests:** TC-ADMIN-006

#### SA-ADM-01 — createTenantAction
- **Route:** `app/admin/tenants/new/actions.ts` · **Permission:** `platform:tenant:create`
- **Purpose:** Create TENANT + RESTAURANT (+ default hours closed) and invite the first TENANT_ADMIN, in one transaction (Clerk invitation sent after commit; failure → membership stays INVITED with "resend" option)
- **Request:** `{ tenantName, slug, restaurantName, timezone, currencyCode, countryCode, adminEmail, adminFullName? }`
- **Validation:** slug pattern + reserved list + uniqueness; IANA timezone; ISO 4217 currency; email
- **Response:** `{ tenantId, slug }` → redirect `/admin/tenants/[tenantId]`
- **Errors:** 422 `SLUG_TAKEN`, 422 `VALIDATION_ERROR`, 502 `INVITATION_FAILED` (tenant created; shown as warning)
- **Audit:** `tenant.created`, `tenant_admin.invited` · **Idempotency:** slug uniqueness prevents duplicates · **Tests:** TC-ADMIN-003, TC-RBAC-102

#### SA-ADM-02 — updateTenantAction
- **Permission:** `platform:tenant:update` · **Request:** `{ targetTenantId, name?, slug? }`
- **Validation:** as create. The slug is **immutable after provisioning** (RASOIOS-ADR-012 §4, 2026-09-23, superseding the
  `confirmSlugChange` flow of S1-P06-T001): sending the current slug is a no-op, any other value is refused
- **Response:** `{ tenantId, name, slug, changed }` · **Errors:** 404, 422 `SLUG_IMMUTABLE` · **Audit:** `tenant.updated` (B/A) · **Tests:** TC-ADMIN-004, TC-ADMIN-014

#### SA-ADM-07 — handOverTenantAction *(S1-P06-T009, ADR-013 §7)*
- **Permission:** `platform:tenant:update` · **Request:** `{ targetTenantId, note? }`
- **Validation:** the tenant needs at least one ACTIVE TENANT_ADMIN (the invitation was accepted). Idempotent: a second
  call writes nothing and reports the first handover
- **Response:** `{ tenantId, provisioningState, handedOverAt, alreadyHandedOver }` · **Errors:** 404, 409 `HANDOVER_NOT_READY`
- **Audit:** `tenant.handed_over` — the append-only audit row *is* the state; LD-ADM-03 derives
  `tenant.provisioningState` (`PROVISIONING` | `HANDED_OVER`) from it · **Tests:** TC-ADMIN-013

#### SA-ADM-03 — suspendTenantAction
- **Permission:** `platform:tenant:suspend` · **Request:** `{ tenantId, reason (10–500) }`
- **Effect:** status SUSPENDED, `suspended_at`; staff lose access next request; public site 404
- **Errors:** 404, 409 `ALREADY_SUSPENDED` · **Audit:** `tenant.suspended` (reason) · **Tests:** TC-ADMIN-005, TC-AUTH-008

#### SA-ADM-04 — reactivateTenantAction
- **Permission:** `platform:tenant:reactivate` · **Request:** `{ tenantId }` · **Errors:** 404, 409 `NOT_SUSPENDED`
- **Audit:** `tenant.reactivated` · **Tests:** TC-ADMIN-005

#### SA-ADM-05 — inviteTenantAdminAction
- **Permission:** `platform:tenant_admin:invite` · **Request:** `{ tenantId, email, fullName? }`
- **Effect:** USER (if new) + USER_TENANT INVITED role TENANT_ADMIN + Clerk invitation; re-invite resends
- **Errors:** 404, 409 `ALREADY_MEMBER` · **Audit:** `tenant_admin.invited` · **Rate limit:** session.mutation · **Tests:** TC-ADMIN-003

#### SA-ADM-06 — revokeTenantAdminInviteAction
- **Permission:** `platform:tenant_admin:invite` · **Request:** `{ tenantId, membershipId }` · **Validation:** membership INVITED and belongs to target tenant
- **Effect:** revoke Clerk invitation; membership INACTIVE · **Audit:** `tenant_admin.invite_revoked` · **Tests:** TC-ADMIN-007

#### LD-ADM-04 — Platform audit log
- **Route:** `app/admin/audit/page.tsx` · **Permission:** `platform:audit:read`
- **Request:** `?action=&tenantId=&from=&to=&cursor=` (tenantId here is a **filter** on platform-visible rows)
- **Response:** rows where `tenant_id IS NULL` or `action LIKE 'tenant.%' | 'tenant_admin.%' | 'platform.%'`
- **Pagination:** cursor; **Sort:** `created_at desc` · **Tests:** TC-ADMIN-008, TI-051

---

## 4. Tenant dashboard

#### LD-DASH-01 — Dashboard summary (initial)
- **Route:** `app/restaurant/dashboard/page.tsx` · **Permission:** `dashboard:read`
- **Response:** `{ businessDate, now, salesToday: {net, orderCount, averageOrderValue}, ordersByStatus: {NEW, ACCEPTED, PREPARING, READY}, activeKots: {queued, preparing, ready, oldestQueuedMinutes}, menu: {publishedItems, unavailableItems}, dailyMenu: {status, itemCount} | null, paymentsToday: {CASH, CARD, UPI, refunds}, printing: {agentsOnline, agentsOffline, failedJobs}, dayClosed: boolean }` — all for the restaurant business date (timezone-aware)
- **Tests:** TC-DASH-001, TC-DASH-002, TI-047

#### RH-DASH-01 — Dashboard summary (poll)
- **Method / route:** `GET /api/v1/dashboard/summary` · **Permission:** `dashboard:read`
- **Response:** as LD-DASH-01 · **Caching:** no-store · **Polling:** 30 s (ADR-009) · **Tests:** TC-DASH-001

---

## 5. Restaurant, website, kitchen sections, media

#### LD-RST-01 — Restaurant settings
- **Route:** `app/restaurant/settings/page.tsx`, `app/restaurant/website/page.tsx` · **Permission:** `restaurant:read` (form editable only with update permissions)
- **Response:** `{ restaurant: {…all E02 fields}, hours: [...], kitchenSections: [...], canEdit: {profile, settings, website, sections} }`
- **Tests:** TC-REST-001

#### SA-RST-01 — updateRestaurantProfileAction
- **Permission:** `restaurant:update` · **Request:** `{ name, description?, phoneE164?, email?, addressLine1?, addressLine2?, city?, region?, postalCode? }`
- **Validation:** `data-model.md` E02 · **Response:** updated profile DTO · **Audit:** `restaurant.profile_updated` (B/A) · **Tests:** TC-REST-002

#### SA-RST-02 — updateBrandingAction
- **Permission:** `website:update` · **Request:** `{ logoUrl?, coverImageUrl?, brandAccentHex? }`
- **Validation:** URL allowlist or READY media asset (SC-VAL-04); accent contrast ≥4.5:1 · **Audit:** `restaurant.branding_updated` · **Tests:** TC-REST-003, TC-SEC-003

#### SA-RST-03 — replaceOpeningHoursAction
- **Permission:** `restaurant:update` · **Request:** `{ days: [{ dayOfWeek 1–7, isClosed, shifts: [{opensAt "HH:mm", closesAt "HH:mm"}] (≤3) }] (exactly 7) }`
- **Validation:** non-overlapping shifts; closed ⇒ no shifts · **Effect:** replace set in one transaction · **Audit:** `restaurant.hours_updated` · **Tests:** TC-REST-004

#### SA-RST-04 — updateOperationalSettingsAction
- **Permission:** `restaurant:settings:update` · **Request:** `{ timezone, currencyCode, countryCode, defaultOrderType, autoPrintKot, receiptFooter?, gstin? }`
- **Validation:** IANA zone; currency immutable once orders exist (INV-09); `gstin` 15-character GSTIN format or null · **Errors:** 409 `CURRENCY_LOCKED` · **Audit:** `restaurant.settings_updated` · **Tests:** TC-REST-005, TC-REST-006, TC-REST-009, TC-TZ-001

#### SA-RST-05 — updateWebsiteSettingsAction
- **Permission:** `website:update` · **Request:** `{ showPhone, showEmail, showAddress, seoTitle?, seoDescription? }`
- **Effect:** `revalidatePath('/r/[slug]')` · **Audit:** `restaurant.website_updated` · **Tests:** TC-WEB-006

#### SA-RST-06 — setWebsitePublishedAction
- **Permission:** `website:update` · **Request:** `{ published: boolean }` · **Validation:** publishing requires restaurant name, timezone, ≥1 published category with ≥1 published item
- **Errors:** 422 `WEBSITE_NOT_READY` (lists missing items) · **Audit:** `restaurant.website_published` / `_unpublished` · **Tests:** TC-WEB-007

, normalised to uppercase; CUSTOM requires primary, secondary and accent; each colour must reach 4.5:1 against the chosen surface mode (and its on-colour must reach 4.5:1 on the colour); gradient ends are both present or both absent
- **Errors:** 422 `VALIDATION_ERROR` with field errors (`primaryHex`, …) including the measured ratio · **Effect:** revalidates the tenant's public routes · **Audit:** `restaurant.theme_updated` · **Tests:** TC-WEB-014, TC-WEB-017

#### SA-WEB-02 — updateWebsiteIdentityAction
- **Permission:** `website:update` · **Request:** `{ tagline?, heroImageUrl?, faviconUrl?, instagramUrl?, facebookUrl?, whatsappE164?, mapsUrl? }`
- **Validation:** URLs https and host-allow-listed (Q-009 A); `whatsappE164` E.164; plain text only · **Audit:** `restaurant.website_updated` · **Tests:** TC-WEB-015

#### SA-WEB-03 — saveWebsiteSectionsAction
- **Permission:** `website:update` · **Request:** `{ sections: [{ key, enabled, sortOrder, headline?, body?, imageUrl?, ctaLabel?, ctaHref? }] }` (keys from the fixed enum; ≤ 11 rows)
- **Validation:** HERO cannot be disabled; `sortOrder` 0–999 and unique; body ≤1000 chars stored and rendered as **text, never markup** (SC-VAL-03); `ctaLabel`/`ctaHref` both or neither; href https or internal path
- **Errors:** 422 `VALIDATION_ERROR`, 409 `HERO_REQUIRED` · **Audit:** `restaurant.website_updated` · **Tests:** TC-WEB-016, TC-WEB-020

#### SA-KSEC-01 — createKitchenSectionAction
- **Permission:** `kitchen_section:manage` · **Request:** `{ name, code }` · **Errors:** 422 `CODE_TAKEN` · **Audit:** `kitchen_section.created` · **Tests:** TC-KOT-007

#### SA-KSEC-02 — updateKitchenSectionAction
- **Permission:** `kitchen_section:manage` · **Request:** `{ sectionId, name?, code? }` · **Audit:** `kitchen_section.updated` · **Tests:** TC-KOT-007

#### SA-KSEC-03 — archiveKitchenSectionAction
- **Permission:** `kitchen_section:manage` · **Request:** `{ sectionId }` · **Validation:** no active printer routes to it; no QUEUED/PREPARING KOTs
- **Errors:** 409 `SECTION_IN_USE` · **Audit:** `kitchen_section.archived` · **Tests:** TC-KOT-007

#### SA-KSEC-04 — reorderKitchenSectionsAction
- **Permission:** `kitchen_section:manage` · **Request:** `{ orderedIds: uuid[] }` (must equal the tenant's active set) · **Audit:** `kitchen_section.reordered` · **Tests:** TC-KOT-007

#### RH-MEDIA-01 — Create upload (gated Q-009)
- **Method / route:** `POST /api/v1/media/uploads` · **Permission:** `website:update` (logo/cover) or `menu:manage` (menu item)
- **Request:** `{ purpose, contentType, byteSize }` · **Validation:** type ∈ jpeg/png/webp; ≤5 MB · **CSRF:** `assertSameOrigin` (SC-CSRF-02)
- **Response:** `{ assetId, uploadUrl (signed, 5 min), fields }` · **Audit:** none until confirmed · **Rate limit:** 30/hour per user · **Tests:** TC-SEC-016, TC-SEC-017, TI-058

> **2026-09-25 — superseded by RASOIOS-ADR-017.** RH-MEDIA-01 is now `POST /api/v1/media/uploads`, multipart `{ purpose, file }`, proxied to ImageKit; 201 `{ asset }` after ImageKit confirms and the row commits. Permission by purpose (`website:update` / `menu:manage`), same-origin check, 30 uploads/hour/user. No signed URL and no confirm step — SA-MEDIA-01 below is not implemented.
> **RH-MEDIA-02** — `DELETE /api/v1/media/{assetId}`: discard an unused upload of the caller's tenant; 404 for unknown and other tenants' ids, 409 `IMAGE_IN_USE`, audit `media.deleted`.
> Saves that store an ImageKit URL (SA-RST-02, SA-WEB-02/03, SA-MENU-06/07) return 422 `IMAGE_NOT_OWNED` unless it is a READY asset of the caller's tenant.

#### SA-MEDIA-01 — confirmMediaUploadAction (gated Q-009)
- **Permission:** as RH-MEDIA-01 · **Request:** `{ assetId }` · **Effect:** server fetches object from **own bucket by key** (not user URL), sniffs magic bytes, re-encodes, strips EXIF, sets READY
- **Errors:** 422 `INVALID_IMAGE` · **Audit:** `media.uploaded` · **Tests:** TC-SEC-016, ADV-020

---

## 6. Staff

#### LD-STF-01 — Staff list
- **Route:** `app/restaurant/staff/page.tsx` · **Permission:** `staff:read`
- **Response:** `{ items: [{membershipId, fullName, email, role, status, invitedAt, acceptedAt}], assignableRoles: TenantRole[] }` · **Filters:** status, role · **Sort:** status then name · **Tests:** TC-STAFF-001, TI-052

#### SA-STF-01 — inviteStaffAction
- **Permission:** `staff:invite` · **Request:** `{ email, fullName?, role }` · **Validation:** role assignable by caller (SC-RBAC-04)
- **Effect:** USER (if new) + USER_TENANT INVITED + Clerk invitation · **Errors:** 409 `ALREADY_MEMBER`, 403 `ROLE_NOT_ASSIGNABLE`
- **Audit:** `staff.invited` · **Rate limit:** 30/hour per tenant · **Tests:** TC-STAFF-002, TC-RBAC-010

#### SA-STF-02 — resendStaffInviteAction
- **Permission:** `staff:invite` · **Request:** `{ membershipId }` · **Validation:** INVITED · **Audit:** `staff.invite_resent` · **Tests:** TC-STAFF-002

#### SA-STF-03 — revokeStaffInviteAction
- **Permission:** `staff:invite` · **Request:** `{ membershipId }` · **Audit:** `staff.invite_revoked` · **Tests:** TC-STAFF-003

#### SA-STF-04 — changeStaffRoleAction
- **Permission:** `staff:update_role` · **Request:** `{ membershipId, role }`
- **Validation:** not self; target's current and new role both assignable by caller; last TENANT_ADMIN rule
- **Errors:** 403 `ROLE_NOT_ASSIGNABLE`, 409 `LAST_TENANT_ADMIN` · **Audit:** `staff.role_changed` (B/A) · **Tests:** TC-RBAC-010, TC-RBAC-012, ADV-005

#### SA-STF-05 — deactivateStaffAction
- **Permission:** `staff:deactivate` · **Request:** `{ membershipId }` · **Effect:** INACTIVE; if user has no other ACTIVE membership → revoke Clerk sessions (SC-AUTH-08)
- **Errors:** 409 `LAST_TENANT_ADMIN`, 403 self · **Audit:** `staff.deactivated` · **Tests:** TC-STAFF-004, TC-AUTH-014

#### SA-STF-06 — reactivateStaffAction
- **Permission:** `staff:deactivate` · **Request:** `{ membershipId }` · **Audit:** `staff.reactivated` · **Tests:** TC-STAFF-004

---

## 7. Public website

Public endpoints: **AuthN** none · **AuthZ** none · **Tenant** resolved by slug for *public projection only* · **Caching** ISR `revalidate: 60` plus `revalidatePath` on publishing mutations.

#### LD-PUB-01 — Public restaurant
- **Route:** `{slug}.<PUBLIC_ROOT_DOMAIN>` (canonical; `{slug}.localhost` in development) and `app/r/[slug]/page.tsx` (fallback, emits a canonical link) → `lib/data/public-restaurant.ts` (ADR-012)
- **Validation:** slug pattern and reserved-label list (invalid → 404). The slug comes from the host, resolved in `middleware.ts` and re-validated server-side; a client-supplied slug header is never trusted
- **Response (projection, SC-PUB-01):** `{ restaurant: {name, tagline?, description, logoUrl, coverImageUrl, heroImageUrl?, faviconUrl?, theme: {preset, surfaceMode, primaryHex, secondaryHex, accentHex, gradientFromHex?, gradientToHex?}, links: {instagram?, facebook?, whatsapp?, maps?}, phone?, email?, address?, timezone, currencyCode}, sections: [{key, enabled, sortOrder, headline?, body?, imageUrl?, ctaLabel?, ctaHref?}], hours: [...], openNow: boolean, categories: [{id, name, description, iconKey, items: [{id, name, description, imageUrl, iconKey, dietaryType, priceFrom, variants: [{name, price}], addons: [{name, price}], isAvailable}]}] }`. Contact fields are included only when their show flag is true. There are no tenant IDs, internal flags, staff, customers, transactions or audit data.
- **Errors:** 404 for unknown slug, SUSPENDED tenant, or `website_published = false` (same response) · **Tests:** TC-WEB-001…TC-WEB-005, ADV-025

#### LD-PUB-02 — Public daily menu (today)
- **Route:** `app/r/[slug]/page.tsx` section and `app/r/[slug]/daily/page.tsx`
- **Response:** `{ businessDate, title, note, items: [...same item projection] } | null` — PUBLISHED menu whose `business_date` = today in restaurant timezone; only published, non-archived items
- **Tests:** TC-DMENU-005, TC-TZ-003

#### LD-PUB-03 — Sitemap and robots
- **Route:** `app/sitemap.ts`, `app/robots.ts` · **Response:** URLs of published restaurants only; `robots` disallows `/restaurant`, `/admin`, `/account`, `/api` · **Tests:** TC-WEB-008

#### RH-PUB-01 — Open Graph image
- **Method / route:** `GET /r/[slug]/opengraph-image` (Next.js file convention, `ImageResponse`)
- **Response:** PNG 1200×630 from public projection; images loaded only from allowlisted hosts with 3 s timeout, 2 MB cap (SC-VAL-04) · **Caching:** public, 1 h · **Tests:** TC-WEB-009

#### RH-PUB-02 — Menu card image
- **Method / route:** `GET /r/[slug]/cards/[card]` where `card` ∈ `daily-menu` | `full-menu` | `item-{menuItemId}`
- **Purpose:** Shareable menu cards for social (brief §33)
- **Validation:** card pattern; item must be published · **Response:** PNG 1080×1350 (portrait) · **Errors:** 404 · **Rate limit:** none (cacheable) · **Caching:** public, `s-maxage=300` · **Tests:** TC-SOC-003, TC-SOC-004

#### SA-PUB-01 — submitPublicOrderAction (**disabled; gated by Q-001**)
- **Status:** Not exposed in SLICE-01 unless Q-001 is approved. If approved: AuthN none; tenant by slug (ACTIVE, published); request `{ idempotencyKey, orderType TAKEAWAY|DINE_IN, tableLabel?, customer: {fullName, phoneE164}, items[] }`; server pricing as SA-ORD-01; channel PUBLIC_WEB; status NEW; never updates existing customer fields (BR-CUST-02); rate limit `public.order.submit` 5/10 min per IP+tenant; audit `order.created` actor PUBLIC.
- **Tests:** TC-ORDER-012 (asserts disabled until approved)

---

## 8. Menu

#### LD-MENU-01 — Categories
- **Route:** `app/restaurant/menu/categories/page.tsx` · **Permission:** `menu:read`
- **Response:** `{ items: [{id, name, description, iconKey, sortOrder, isPublished, itemCount, archivedAt}] }` · **Filters:** `archived=false|true` · **Sort:** `sort_order asc` · **Tests:** TC-MENU-001

#### LD-MENU-02 — Items
- **Route:** `app/restaurant/menu/items/page.tsx` · **Permission:** `menu:read`
- **Request:** `?categoryId=&published=&available=&q=&archived=&cursor=&limit=`
- **Response:** `{ items: [{id, name, categoryName, basePrice, priceFrom, taxRate, dietaryType, isAvailable, isPublished, imageUrl, iconKey, displayOrder, variantCount, addonCount}], nextCursor }`
- **Pagination:** cursor · **Sort:** category sort, then `display_order` · **Tests:** TC-MENU-002, TI-001

#### LD-MENU-03 — Item detail
- **Route:** `app/restaurant/menu/items/[itemId]/page.tsx` · **Permission:** `menu:read`
- **Response:** full item + variants + add-ons + kitchen section options · **Errors:** 404 (incl. other tenant) · **Tests:** TC-MENU-003, TI-002

#### SA-MENU-01 — createCategoryAction
- **Permission:** `menu:manage` · **Request:** `{ name, description?, iconKey? }` · **Effect:** appended at max sort order
- **Errors:** 422 `NAME_TAKEN` · **Audit:** `menu_category.created` · **Tests:** TC-MENU-004

#### SA-MENU-02 — updateCategoryAction
- **Permission:** `menu:manage` · **Request:** `{ categoryId, name?, description?, iconKey? }` · **Audit:** `menu_category.updated` (B/A) · **Tests:** TC-MENU-004, TI-003

#### SA-MENU-03 — archiveCategoryAction
- **Permission:** `menu:manage` · **Request:** `{ categoryId }` · **Validation:** no non-archived items
- **Errors:** 409 `CATEGORY_NOT_EMPTY` · **Audit:** `menu_category.archived` · **Tests:** TC-MENU-005, TI-004

#### SA-MENU-04 — reorderCategoriesAction
- **Permission:** `menu:manage` · **Request:** `{ orderedIds: uuid[] }` (exactly the tenant's non-archived set; foreign IDs → 404) · **Audit:** `menu_category.reordered` · **Tests:** TC-MENU-006, ADV-003

#### SA-MENU-05 — setCategoryPublishedAction
- **Permission:** `menu:manage` · **Request:** `{ categoryId, published }` · **Effect:** revalidate public page · **Audit:** `menu_category.published` / `unpublished` · **Tests:** TC-MENU-007

#### SA-MENU-06 — createMenuItemAction
- **Permission:** `menu:manage` · **Request:** `{ categoryId, kitchenSectionId?, name, description?, imageUrl?, iconKey?, basePrice, taxRate, dietaryType?, prepTimeMinutes? }`
- **Validation:** category and section same tenant (404 otherwise); money regex; tax 0–100 · **Response:** `{ itemId }` (created unpublished)
- **Audit:** `menu_item.created` · **Tests:** TC-MENU-008, TI-005

#### SA-MENU-07 — updateMenuItemAction
- **Permission:** `menu:manage` · **Request:** `{ itemId, expectedUpdatedAt, …fields }` · **Errors:** 409 `CONFLICT` if stale
- **Audit:** `menu_item.updated`; `menu_item.price_changed` when basePrice/taxRate change (B/A) · **Tests:** TC-MENU-009, TI-006

#### SA-MENU-08 — archiveMenuItemAction
- **Permission:** `menu:manage` · **Request:** `{ itemId }` · **Effect:** archived + unpublished; removed from future daily menus (draft/published future dates)
- **Audit:** `menu_item.archived` · **Tests:** TC-MENU-010, TI-007

#### SA-MENU-09 — reorderMenuItemsAction
- **Permission:** `menu:manage` · **Request:** `{ categoryId, orderedIds }` · **Audit:** `menu_item.reordered` · **Tests:** TC-MENU-006

#### SA-MENU-10 — setMenuItemPublishedAction
- **Permission:** `menu:manage` · **Request:** `{ itemId, published }` · **Validation:** publishing requires published category and (base price or ≥1 available variant) · **Audit:** `menu_item.published` / `unpublished` · **Tests:** TC-MENU-007

#### SA-MENU-11 — setMenuItemAvailabilityAction
- **Permission:** `menu:availability:update` · **Request:** `{ itemId, available }` · **Audit:** `menu_item.availability_changed` · **Tests:** TC-MENU-011

#### SA-MENU-12 — replaceMenuItemVariantsAction
- **Permission:** `menu:manage` · **Request:** `{ itemId, variants: [{id?, name, price, isDefault, isAvailable}] (≤20) }`
- **Validation:** unique names; ≤1 default; existing `id`s must belong to this item (else 404) · **Effect:** upsert listed, archive omitted
- **Audit:** `menu_item.variants_updated` (B/A) · **Tests:** TC-MENU-012, ADV-009

#### SA-MENU-13 — replaceMenuItemAddonsAction
- **Permission:** `menu:manage` · **Request:** `{ itemId, addons: [{id?, name, price, isAvailable}] (≤30) }` · **Audit:** `menu_item.addons_updated` · **Tests:** TC-MENU-013

---

## 9. Daily menu

#### LD-DMENU-01 — Daily menu editor
- **Route:** `app/restaurant/daily-menu/page.tsx?date=YYYY-MM-DD` (default: today in restaurant tz) · **Permission:** `daily_menu:read`
- **Response:** `{ businessDate, today, dailyMenu: {id, status, title, note, items:[{menuItemId, name, displayOrder, isPublished, isAvailable}]} | null, pickableItems: [...], previousMenus: [{businessDate, status, itemCount}] }` · **Tests:** TC-DMENU-001, TI-011

#### LD-DMENU-02 — Daily menu calendar
- **Permission:** `daily_menu:read` · **Request:** `?from=&to=` (≤ 62 days) · **Response:** `[{businessDate, status, itemCount}]` · **Sort:** date asc · **Tests:** TC-DMENU-001

#### SA-DMENU-01 — saveDailyMenuDraftAction
- **Permission:** `daily_menu:manage` · **Request:** `{ businessDate, title?, note?, itemIds: uuid[] (ordered, ≤100) }`
- **Validation:** all items same tenant (404 otherwise), not archived; date ≥ today; if menu PUBLISHED, changes apply to published menu (re-validates public page)
- **Response:** `{ dailyMenuId, status }` · **Audit:** `daily_menu.created` / `daily_menu.items_updated` · **Idempotency:** upsert by `(tenant, business_date)` · **Tests:** TC-DMENU-002, TI-012

#### SA-DMENU-02 — publishDailyMenuAction
- **Permission:** `daily_menu:manage` · **Request:** `{ dailyMenuId }` · **Validation:** ≥1 item; all items published & not archived; date ≥ today
- **Errors:** 422 `DAILY_MENU_EMPTY`, 422 `ITEM_NOT_PUBLISHED` · **Audit:** `daily_menu.published` · **Tests:** TC-DMENU-003

#### SA-DMENU-03 — unpublishDailyMenuAction
- **Permission:** `daily_menu:manage` · **Request:** `{ dailyMenuId }` · **Audit:** `daily_menu.unpublished` · **Tests:** TC-DMENU-003

#### SA-DMENU-04 — copyDailyMenuAction
- **Permission:** `daily_menu:manage` · **Request:** `{ fromBusinessDate, toBusinessDate }` · **Validation:** source exists; target has no PUBLISHED menu; archived/unpublished items skipped and reported
- **Response:** `{ dailyMenuId, copiedCount, skipped: [{name, reason}] }` · **Audit:** `daily_menu.copied` · **Tests:** TC-DMENU-004

#### SA-DMENU-05 — deleteDraftDailyMenuAction
- **Permission:** `daily_menu:manage` · **Request:** `{ dailyMenuId }` · **Validation:** status DRAFT · **Errors:** 409 `NOT_DRAFT` · **Audit:** `daily_menu.deleted` · **Tests:** TC-DMENU-006

---

## 10. Orders

#### LD-ORD-01 — Order board (initial)
- **Route:** `app/restaurant/orders/page.tsx` · **Permission:** `order:read`
- **Request:** `?status=&type=&q=&date=` · **Response:** active orders (NEW…READY) + today's closed, each `{id, orderNumber, status, paymentStatus, orderType, tableLabel, customerName? (not for KITCHEN), totalAmount (not for KITCHEN), itemCount, priority, createdAt, updatedAt}`, `serverTime`
- **Pagination:** cursor for closed orders · **Sort:** priority desc, created_at asc (active); created_at desc (closed) · **Tests:** TC-ORDER-010, TI-021

#### RH-ORD-01 — Order board (poll)
- **Method / route:** `GET /api/v1/orders?since=ISO&status=` · **Permission:** `order:read`
- **Response:** `{ items: [...same projection], serverTime, hasMore }` (ADR-009, max 200) · **Caching:** no-store · **Tests:** TC-ORDER-010, TI-022

#### LD-ORD-02 — Order detail
- **Route:** `app/restaurant/orders/[orderId]/page.tsx` · **Permission:** `order:read` (payment panel requires `transaction:read`)
- **Response:** order + lines (snapshots, add-ons) + KOTs with print status + transactions (if permitted) + allowed next actions for caller
- **Errors:** 404 (incl. other tenant) · **Tests:** TC-ORDER-011, TI-023

#### LD-ORD-03 — Order entry catalogue
- **Route:** `app/restaurant/orders/new/page.tsx` · **Permission:** `order:create` + `menu:read`
- **Response:** published, available, non-archived items grouped by category with variants/add-ons/prices, today's daily menu highlight, restaurant defaults · **Tests:** TC-ORDER-001

#### SA-ORD-01 — createOrderAction
- **Permission:** `order:create` (+ `order:accept` when `sendToKitchen = true`)
- **Request:** `{ idempotencyKey: uuid, orderType, tableLabel?, notes?, priority?, customerId?, newCustomer?: {fullName, phoneE164?, email?}, sendToKitchen: boolean, items: [{ menuItemId, variantId?, addonIds: uuid[] (≤10), quantity 1–99, specialInstructions? }] (1–100) }`
- **Validation (BR-ORD-01):** items/variants/add-ons belong to tenant (404), published, available, not archived; variant required iff item has active variants; add-ons belong to item; **no price, total, tax or discount fields accepted (unknown key → 422)**; `priority: HIGH` requires TA/MGR/CASHIER; `newCustomer` requires `customer:create`
- **Processing:** one DB transaction: counter → order → lines/add-ons with server prices (ADR-010) → totals → optional customer create/link (never updates existing customer fields) → if `sendToKitchen`: ACCEPTED + KOTs + print jobs → audit
- **Response:** `{ orderId, orderNumber, status, subtotalAmount, taxAmount, totalAmount, currencyCode }`
- **Errors:** 422 `ITEM_UNAVAILABLE` (lists items), 422 `VARIANT_REQUIRED`, 422 `INVALID_ADDON`, 409 `DAY_CLOSED`
- **Audit:** `order.created` (+ `order.status_changed`, `kot.generated`) · **Rate limit:** session.mutation
- **Idempotency:** `(tenant_id, idempotency_key)` unique → replay returns original result · **Tests:** TC-ORDER-001, TC-ORDER-002, TC-ORDER-003, TC-ORDER-004, TC-ORDER-008, TI-024, ADV-007, ADV-008, ADV-010

#### SA-ORD-02 — transitionOrderStatusAction
- **Permission:** per target (security.md §3.4) · **Request:** `{ orderId, toStatus: ACCEPTED|PREPARING|READY|COMPLETED, expectedVersion }`
- **Validation:** allowed transition; COMPLETED requires PAID (BR-ORD-06)
- **Response:** `{ orderId, status, version }` · **Errors:** 409 `INVALID_TRANSITION`, 409 `CONFLICT`, 422 `PAYMENT_REQUIRED`
- **Audit:** `order.status_changed` (from/to) (+ `kot.generated` on ACCEPTED) · **Idempotency:** same target on an order already in that status → 200 no-op · **Tests:** TC-ORDER-005, TC-ORDER-006, TC-ORDER-009, TI-025

#### SA-ORD-03 — cancelOrderAction
- **Permission:** `order:cancel` · **Request:** `{ orderId, reason (5–280), expectedVersion }`
- **Validation:** status/role rule (security.md §3.3 row 29: CASHIER/WAITER from NEW only; TENANT_ADMIN/MANAGER from NEW, ACCEPTED, PREPARING or READY — Q-008 B); net paid = 0 (refund first)
- **Effect:** CANCELLED; KOTs → CANCELLED; pending print jobs for those KOTs remain (already printed tickets are physical) — kitchen board shows cancellation
- **Errors:** 409 `INVALID_TRANSITION`, 409 `REFUND_REQUIRED` · **Audit:** `order.cancelled` (reason) · **Tests:** TC-ORDER-007, TI-026

#### SA-ORD-04 — addOrderItemsAction (**gated Q-003**)
- **Permission:** `order:add_items` · **Request:** `{ orderId, idempotencyKey, expectedVersion, items: [...as create] }`
- **Validation:** order in ACCEPTED/PREPARING/READY; not paid-in-full-and-completed · **Effect:** new `kot_round`; totals recomputed; new KOTs; payment_status recomputed (PAID → PARTIALLY_PAID)
- **Audit:** `order.items_added` · **Idempotency:** key per round · **Tests:** TC-ORDER-013

#### SA-ORD-05 — setOrderCustomerAction
- **Permission:** `order:update_meta` + `customer:read` · **Request:** `{ orderId, customerId | null }` · **Validation:** customer same tenant (404) · **Audit:** `order.customer_linked` · **Tests:** TC-CUST-004, TI-027

#### SA-ORD-06 — setOrderPriorityAction
- **Permission:** `order:update_meta` (WAITER cannot set HIGH) · **Request:** `{ orderId, priority }` · **Effect:** order and open KOTs · **Audit:** `order.priority_changed` · **Tests:** TC-KITCH-004

---

## 11. Customers

#### LD-CUS-01 — Customer list
- **Route:** `app/restaurant/customers/page.tsx` · **Permission:** `customer:read`
- **Request:** `?q=&archived=&cursor=&limit=` · **Response:** `{ items: [{id, fullName, phoneMasked?, email?, orderCount, lastOrderAt}], nextCursor }` (phone shown in full only on detail)
- **Sort:** `full_name asc` or `lastOrderAt desc` · **Tests:** TC-CUST-001, TI-031

#### LD-CUS-02 — Customer detail and history
- **Route:** `app/restaurant/customers/[customerId]/page.tsx` · **Permission:** `customer:read`
- **Response:** customer + orders (cursor, 20/page, newest first) with totals only if caller has `transaction:read` · **Errors:** 404 · **Tests:** TC-CUST-002, TI-032

#### RH-CUS-01 — Customer lookup
- **Method / route:** `GET /api/v1/customers/lookup?q=` · **Permission:** `customer:read`
- **Validation:** q 3–40 chars; phone digits normalised · **Response:** `{ items: [{id, fullName, phoneMasked}] }` (max 10) · **Rate limit:** 60/min per user · **Tests:** TC-CUST-003, TI-033

#### SA-CUS-01 — createCustomerAction
- **Permission:** `customer:create` · **Request:** `{ fullName, phoneE164?, email?, notes? }` · **Errors:** 409 `PHONE_EXISTS` (returns existing id only to callers with `customer:read`)
- **Audit:** `customer.created` (masked) · **Tests:** TC-CUST-001

#### SA-CUS-02 — updateCustomerAction
- **Permission:** `customer:update` · **Request:** `{ customerId, fullName?, phoneE164?, email?, notes? }` · **Audit:** `customer.updated` (masked B/A) · **Tests:** TC-CUST-004, TI-034

#### SA-CUS-03 — archiveCustomerAction
- **Permission:** `customer:archive` · **Request:** `{ customerId }` · **Audit:** `customer.archived` · **Tests:** TC-CUST-006

#### SA-CUS-04 — anonymizeCustomerAction
- **Permission:** `customer:archive` + role TENANT_ADMIN · **Request:** `{ customerId, confirmPhrase: "ANONYMISE" }` · **Effect:** irreversible PII removal; orders keep link · **Audit:** `customer.anonymized` · **Tests:** TC-CUST-006

---

## 12. KOT and kitchen

#### LD-KOT-01 — Kitchen board (initial)
- **Route:** `app/restaurant/kitchen/page.tsx?section=` · **Permission:** `kot:read`
- **Response:** `{ sections: [{id, name, code}], tickets: [{id, kotNumber, roundNumber, orderNumber, orderType, tableLabel, priority, status, sectionId, queuedAt, preparingAt, readyAt, notes, items: [{label, addons, instructions, quantity}], printStatus: PENDING|PROCESSING|PRINTED|FAILED|NONE, targetPrepMinutes}], serverTime }` — **no customer PII, no money**
- **Filters:** section, status (default active) · **Sort:** priority desc, queued_at asc · **Tests:** TC-KITCH-001, TI-036

#### RH-KOT-01 — Kitchen board (poll)
- **Method / route:** `GET /api/v1/kitchen/tickets?since=&section=` · **Permission:** `kot:read`
- **Response:** as LD-KOT-01 `tickets` delta + `serverTime`, `hasMore` · **Polling:** 5 s · **Tests:** TC-KITCH-002, TI-037

#### SA-KOT-01 — updateKotStatusAction
- **Permission:** `kot:update_status` (→PREPARING, →READY) or `kot:serve` (→SERVED) · **Request:** `{ kotId, toStatus }`
- **Validation:** sequential transition; order not CANCELLED · **Effect:** timestamps; order status recomputed (security.md §3.4)
- **Errors:** 409 `INVALID_TRANSITION` · **Audit:** `kot.status_changed` (+ `order.status_changed` when derived) · **Idempotency:** repeat target → 200 no-op · **Tests:** TC-KOT-003, TC-KOT-004, TI-038

#### SA-KOT-02 — reprintKotAction
- **Permission:** `kot:reprint` · **Request:** `{ kotId }` · **Effect:** new PRINT_JOB `is_reprint`, dedupe `KOT:{id}:reprint:{n}` to the section's printer
- **Errors:** 422 `NO_PRINTER_CONFIGURED` · **Audit:** `kot.reprint_requested` · **Rate limit:** 10/min per user · **Tests:** TC-KOT-005, TI-039

---

## 13. Printing and print agent

#### LD-PRN-01 — Printing console
- **Route:** `app/restaurant/printing/page.tsx` · **Permission:** `print_job:read` (printer/agent management sections require `printer:manage` / `print_agent:manage`)
- **Response:** `{ agents: [{id, name, status, tokenPrefix, lastSeenAt, online, agentVersion}], printers: [{id, name, purpose, connectionType, paperWidthMm, sectionName, agentName, health, isActive}], jobs: [{id, jobType, status, printerName, attemptCount, lastErrorCode, lastErrorMessage, createdAt, printedAt, kotNumber?, orderNumber?}] }`
- **Filters:** job status, type · **Sort:** created_at desc · **Tests:** TC-PRINT-010, TI-042

#### RH-PRN-01 — Print jobs (poll)
- **Method / route:** `GET /api/v1/print-jobs?since=&status=` · **Permission:** `print_job:read` · **Polling:** 10 s · **Tests:** TC-PRINT-010, TI-043

#### SA-PRN-01 — createPrinterAction
- **Permission:** `printer:manage` · **Request:** `{ name, purpose, connectionType, connectionAddress, paperWidthMm, kitchenSectionId?, printAgentId? }`
- **Validation:** LAN address private range (SC-PRINT-06); section/agent same tenant · **Audit:** `printer.created` · **Tests:** TC-PRINT-007, TI-044

#### SA-PRN-02 — updatePrinterAction
- **Permission:** `printer:manage` · **Request:** `{ printerId, …fields }` · **Audit:** `printer.updated` (B/A) · **Tests:** TC-PRINT-011

#### SA-PRN-03 — deactivatePrinterAction
- **Permission:** `printer:manage` · **Request:** `{ printerId }` · **Effect:** `is_active=false`; PENDING jobs → FAILED `PRINTER_DEACTIVATED` · **Audit:** `printer.deactivated` · **Tests:** TC-PRINT-011

#### SA-PRN-04 — sendTestPrintAction
- **Permission:** `printer:manage` · **Request:** `{ printerId }` · **Effect:** TEST job with restaurant name + timestamp · **Audit:** `print_job.created` · **Rate limit:** 6/min per printer · **Tests:** TC-PRINT-012

#### SA-PRN-05 — retryPrintJobAction
- **Permission:** `print_job:retry` · **Request:** `{ jobId }` · **Validation:** status FAILED · **Effect:** PENDING, `attempt_count` reset to 0, `next_attempt_at=now()`
- **Errors:** 409 `NOT_FAILED` · **Audit:** `print_job.retried` · **Tests:** TC-PRINT-013, TI-045

#### SA-PRN-06 — printReceiptAction
- **Permission:** `print_job:retry` + `transaction:read` · **Request:** `{ orderId }` · **Effect:** RECEIPT job to a RECEIPT-capable printer; dedupe `RECEIPT:{orderId}:v{n}`
- **Errors:** 422 `NO_PRINTER_CONFIGURED` · **Audit:** `print_job.created` · **Tests:** TC-TXN-008

#### SA-AGT-01 — createPrintAgentPairingAction
- **Permission:** `print_agent:manage` · **Request:** `{ name }` · **Response:** `{ agentId, pairingCode (8 chars, shown once), expiresAt }`
- **Audit:** `print_agent.created` (no code in audit) · **Rate limit:** 10/hour per tenant · **Tests:** TC-AGENT-002

#### SA-AGT-02 — revokePrintAgentAction
- **Permission:** `print_agent:manage` · **Request:** `{ agentId }` · **Effect:** REVOKED; printers keep assignment but show "agent revoked" · **Audit:** `print_agent.revoked` · **Tests:** TC-AGENT-003, TI-046

Print agent endpoints (RH-AGT-02…05) authenticate with **`Authorization: Bearer <token>`**. They derive `AgentContext` from the token hash (SC-PRINT-01, SC-TEN-07). No cookies, CSRF or CORS apply. Requests are strict JSON and any tenant field returns 422. Rate limit `agent.api` 120/min per agent.

#### RH-AGT-01 — Pair agent
- **Method / route:** `POST /api/v1/print-agent/pair` · **AuthN:** pairing code in body
- **Request:** `{ pairingCode, agentVersion, osInfo }` · **Validation:** code hash matches a PENDING_PAIRING agent, not expired
- **Response:** `{ agentId, token, printers: [...] }` (token only here, once) · **Errors:** 401 `INVALID_PAIRING_CODE` (same for wrong/expired/used) · **Audit:** `print_agent.paired` (actor PRINT_AGENT)
- **Rate limit:** `agent.pair` 5/15 min per IP (fail closed) · **Idempotency:** code single-use · **Tests:** TC-AGENT-001, TC-AGENT-002, ADV-015

#### RH-AGT-02 — Heartbeat
- **Method / route:** `POST /api/v1/print-agent/heartbeat` · **Request:** `{ agentVersion, printers: [{printerId, health, detail?}] }`
- **Validation:** printerIds assigned to this agent (others ignored + security log) · **Response:** `{ serverTime, pollIntervalMs }` · **Audit:** none (logged) · **Tests:** TC-AGENT-004, TI-041

#### RH-AGT-03 — Claim jobs
- **Method / route:** `POST /api/v1/print-agent/jobs/claim` · **Request:** `{ max: 1–10 }`
- **Processing:** ADR-007 §3 atomic lease · **Response:** `{ jobs: [{jobId, claimToken, printerId, jobType, payload, leaseExpiresAt}] }`
- **Errors:** 401 `INVALID_AGENT_TOKEN`, 429 · **Tests:** TC-PRINT-004, TI-043, ADV-012

#### RH-AGT-04 — Acknowledge job
- **Method / route:** `POST /api/v1/print-agent/jobs/[jobId]/ack` · **Request:** `{ claimToken, result: PRINTED|FAILED, errorCode?, errorMessage? (≤500) }`
- **Validation:** job in agent's tenant & `print_agent_id = agent` & PROCESSING & token matches (ADR-007 §4)
- **Response:** `{ jobId, status }` · **Errors:** 404 (not this agent's job), 409 `STALE_CLAIM` · **Audit:** `print_job.failed` on terminal failure (actor PRINT_AGENT)
- **Idempotency:** repeated identical ack → 200 · **Tests:** TC-PRINT-005, TC-PRINT-006, ADV-013, ADV-014

#### RH-AGT-05 — Agent configuration
- **Method / route:** `GET /api/v1/print-agent/config` · **Response:** `{ agentId, printers: [{printerId, name, connectionType, connectionAddress, paperWidthMm, purpose}], pollIntervalMs, heartbeatIntervalMs }` · **Tests:** TC-AGENT-005, TI-041

---

## 14. Transactions and receipts

#### LD-TXN-01 — Transactions list
- **Route:** `app/restaurant/transactions/page.tsx` · **Permission:** `transaction:read`
- **Request:** `?from=&to=&type=&method=&status=&q=&cursor=` (dates are business dates; ≤ 92 days)
- **Response:** `{ items: [{id, type, method, status, amount, reference, orderNumber, recordedBy, createdAt, businessDate}], totals: {payments, refunds, net, byMethod}, nextCursor }`
- **Sort:** created_at desc · **Tests:** TC-TXN-001, TI-028

#### LD-TXN-02 — Day close preview
- **Route:** `app/restaurant/transactions/day-close/page.tsx?date=` · **Permission:** `day_close:perform`
- **Response:** `{ businessDate, expectedCash, cardTotal, upiTotal, refundTotal, orderCount, openOrderCount, alreadyClosed }` · **Tests:** TC-TXN-006

#### SA-TXN-01 — recordPaymentAction
- **Permission:** `payment:record` · **Request:** `{ orderId, idempotencyKey, method, amount, amountTendered?, reference? }`
- **Validation (BR-TXN-01…03):** order not CANCELLED; amount > 0 and ≤ outstanding balance; CASH may have tendered ≥ amount; UPI requires reference; reference not PAN-like; business day not closed
- **Response:** `{ transactionId, paymentStatus, balance, changeDue? }` · **Errors:** 422 `AMOUNT_EXCEEDS_BALANCE`, 409 `DAY_CLOSED`
- **Audit:** `payment.recorded` · **Idempotency:** key unique · **Tests:** TC-TXN-002, TC-TXN-005, TI-029, ADV-011

#### SA-TXN-02 — createRefundAction
- **Permission:** `refund:create` · **Request:** `{ paymentTransactionId, idempotencyKey, amount, reason }`
- **Validation:** amount ≤ payment amount − prior refunds of it; order COMPLETED or READY with payment · **Effect:** REFUND row; order payment_status; full refund of COMPLETED → REFUNDED
- **Errors:** 422 `REFUND_EXCEEDS_PAID` · **Audit:** `refund.created` · **Idempotency:** key · **Tests:** TC-TXN-003, TI-030

#### SA-TXN-03 — voidTransactionAction
- **Permission:** `transaction:void` · **Request:** `{ transactionId, reason }` · **Validation:** SUCCESS; same business date; day not closed; voiding a payment with refunds not allowed
- **Audit:** `transaction.voided` · **Tests:** TC-TXN-004

#### SA-TXN-04 — closeBusinessDayAction
- **Permission:** `day_close:perform` · **Request:** `{ businessDate, countedCash, notes? }` · **Validation:** not already closed; notes required if variance ≠ 0
- **Effect:** BUSINESS_DAY_CLOSE row; later payments/voids for that date rejected · **Errors:** 409 `ALREADY_CLOSED` · **Audit:** `day_close.performed` · **Tests:** TC-TXN-006, TC-TXN-007

#### LD-RCPT-01 — Printable receipt
- **Route:** `app/restaurant/orders/[orderId]/receipt/page.tsx` · **Permission:** `transaction:read`
- **Response:** restaurant header, order lines (snapshots), tax lines, totals, payments, footer — tenant-scoped (fixes BA-02) · **Errors:** 404 · **Tests:** TC-TXN-008, TI-035

---

## 15. Reports

All report loaders: **Permission** `report:read` · **Request** `?from=YYYY-MM-DD&to=YYYY-MM-DD` (business dates; ≤ 366 days; default last 7 days) · **Tenant** every aggregate filtered by `tenant_id` (SC-TEN-08) · **Money** Decimal aggregation in SQL `SUM(numeric)` · **Revenue definition** orders with status COMPLETED or REFUNDED counted at `total_amount`, refunds subtracted from ledger (BR-RPT-01).

#### LD-RPT-01 — Sales summary
- **Response:** `{ grossSales, taxCollected, refunds, netSales, orderCount, averageOrderValue, byOrderType: [...], byDay: [{businessDate, netSales, orderCount}] }` · **Tests:** TC-RPT-001, TI-047

#### LD-RPT-02 — Orders summary
- **Response:** `{ byStatus, cancelledCount, cancelReasonsTop: [...], byHourLocal: [{hour 0–23, orderCount}], averagePrepMinutes }` · **Tests:** TC-RPT-002, TC-TZ-004

#### LD-RPT-03 — Menu performance
- **Response:** `{ items: [{menuItemId, itemName (latest snapshot), quantity, netSales, orderCount}], categories: [...] }` · **Sort:** `quantity desc` default, `netSales desc` · **Pagination:** top 50 · **Tests:** TC-RPT-003

#### LD-RPT-04 — Transaction summary
- **Response:** `{ byMethod: [{method, payments, refunds, net}], voids: {count, amount}, dayCloses: [{businessDate, cashVariance}] }` · **Tests:** TC-RPT-004

#### LD-RPT-05 — Daily summary
- **Request:** `?date=` · **Response:** one business date: sales, orders, payments by method, refunds, day close status and variance · **Tests:** TC-RPT-005

---

## 16. Social

#### LD-SOC-01 — Social posts
- **Route:** `app/restaurant/social/page.tsx` · **Permission:** `social:manage`
- **Response:** `{ posts: [{id, channel, cardType, caption, shareUrl, cardImageUrl, status, postedUrl, markedPostedAt, markedPostedBy}], cardSources: {todayDailyMenu?, publishedItems[]} }` · **Filters:** status · **Sort:** created_at desc · **Tests:** TC-SOC-001, TI-053

#### SA-SOC-01 — createSocialPostAction
- **Permission:** `social:manage` · **Request:** `{ channel, cardType, dailyMenuId?, menuItemId?, caption }` · **Validation:** sources same tenant & published
- **Effect:** server builds `share_url`; status DRAFT · **Audit:** `social_post.created` · **Tests:** TC-SOC-001

#### SA-SOC-02 — updateSocialPostAction
- **Permission:** `social:manage` · **Request:** `{ postId, caption?, channel? }` · **Validation:** status DRAFT or READY · **Audit:** `social_post.updated` · **Tests:** TC-SOC-001, TI-054

#### SA-SOC-03 — markSocialPostReadyAction
- **Permission:** `social:manage` · **Request:** `{ postId }` · **Audit:** `social_post.marked_ready` · **Tests:** TC-SOC-002

#### SA-SOC-04 — markSocialPostPostedAction
- **Permission:** `social:manage` · **Request:** `{ postId, postedUrl? (https) }` · **Effect:** MARKED_POSTED with attester — UI copy "Marked as posted by {name}" (never "Published successfully")
- **Audit:** `social_post.marked_posted` · **Tests:** TC-SOC-002, TC-SOC-005

#### SA-SOC-05 — archiveSocialPostAction
- **Permission:** `social:manage` · **Request:** `{ postId }` · **Audit:** `social_post.archived` · **Tests:** TC-SOC-001

---

## 17. Audit

#### LD-AUD-01 — Tenant audit log
- **Route:** `app/restaurant/audit/page.tsx` · **Permission:** `audit:read`
- **Request:** `?action=&resourceType=&actorUserId=&from=&to=&cursor=`
- **Response:** `{ items: [{id, createdAt, actorName, actorRole, actorType, action, resourceType, resourceId, summary, before, after, reason}], nextCursor }` — before/after already redacted; IP shown truncated (/24)
- **Pagination:** cursor · **Sort:** created_at desc · **Tests:** TC-AUDIT-005, TI-050

---

## 18. Operations

#### RH-OPS-01 — Liveness
- **Method / route:** `GET /api/health` · **AuthN:** none · **Response:** `200 {"status":"ok"}` — no version, env or dependency detail · **Rate limit:** none · **Tests:** TC-OBS-004

#### RH-OPS-02 — Readiness
- **Method / route:** `GET /api/ready` · **AuthN:** none · **Processing:** `SELECT 1` with 2 s timeout · **Response:** `200 {"status":"ready"}` / `503 {"status":"unavailable"}` · **Tests:** TC-OBS-004

---

## 19. Endpoint count

| Kind | Count |
|---|---|
| Server loaders (LD) | 33 |
| Server Actions (SA) | 72 |
| Route Handlers (RH) | 16 |
| **Total** | **121** |

Gated endpoints: SA-PUB-01 (Q-001), SA-ORD-04 (Q-003), RH-MEDIA-01 and SA-MEDIA-01 (Q-009).
