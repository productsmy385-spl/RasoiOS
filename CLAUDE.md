# CLAUDE.md - RESTAURANT SaaS PLATFORM (RASOIOS)

## Master Guidance & Source of Truth

This repository is governed by the **Knowledge Base** in `knowledge/`. The Knowledge Base is the authoritative source of truth.

### Primary Guidelines
1. **Commercial Model**: Sold strictly as a restaurant software product/license. **NO subscription tiers (Starter/Pro/Enterprise)** and **NO recurring tenant billing**. `USER_TENANT` is purely authorization/membership context.
2. **Multi-Tenancy**: Every tenant-owned record MUST be associated with a tenant. Tenant context is resolved **strictly server-side** from authenticated context. Never trust client-provided `tenantId` in URLs, request bodies, headers, or query parameters.
3. **Authorization**: Strict Role-Based Access Control (RBAC) enforced on the server. Roles: `SUPER_ADMIN`, `TENANT_ADMIN`, `MANAGER`, `CASHIER`, `KITCHEN`, `WAITER`. UI visibility is NOT authorization.
4. **Data Integrity**: Monetary values MUST use `Decimal`/`NUMERIC` persistence. NEVER use floating-point numbers for money. `ORDER_ITEM` must snapshot historical names, prices, and tax rates at order creation time.
5. **Print Architecture**: Cloud application queues print jobs -> Local Print Agent polling queue -> Local Thermal Printer (USB/LAN). Print jobs are strictly tenant-isolated.

---

## Technical Stack
- **Framework**: Next.js (App Router, Server Components, Server Actions)
- **Language**: TypeScript (Strict Mode)
- **Authentication**: Clerk (Email OTP)
- **Database**: PostgreSQL
- **ORM**: Prisma ORM
- **Deployment**: Railway
- **Styling**: Tailwind CSS, CSS Custom Variables
- **Brand Tokens**:
  - Primary: Amber `#D97706`
  - Secondary / Canvas: Warm Light `#FBF9F5` / Dark Premium `#1A1715`
  - Tertiary / Success: Emerald `#10B981`
  - Display Font: Playfair Display
  - UI / Body Font: Plus Jakarta Sans
- **Testing**: Vitest (Unit/Auth/Tenant Isolation), Playwright (E2E)

---

## Development Commands
```bash
npm run dev           # Run development server
npm run build         # Build production application
npm run start         # Start production server
npm run lint          # Run ESLint validation
npm run typecheck     # Run TypeScript type check (tsc --noEmit)
npm run test          # Run unit & integration tests (Vitest)
npm run test:unit     # Run unit tests only
npm run test:e2e      # Run E2E tests (Playwright)
npm run prisma:gen    # Generate Prisma Client
npm run prisma:migrate # Run Prisma migrations
```

---

## Architectural Principles
- **Server-First**: Keep business logic, data access, and authorization server-side.
- **Slice-Based Implementation**: Incremental controlled slices with verification at every slice.
- **No Mocking / Fake Features**: Build real database schemas, real authorization checks, real APIs.
- **Auditing**: Log security-sensitive and transactional changes to append-only `AuditLog`.
