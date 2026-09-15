# System Architecture & Technical Specifications

## 1. Application Architecture

```
[ Public Browser / PWA ]       [ Restaurant Staff / POS / Kitchen ]
         │                                      │
         └───────────────────┬──────────────────┘
                             ▼
              [ Next.js App Router (Railway) ]
              ├── Public Route Handlers (/r/[slug])
              ├── Authenticated Portal Routes (/dashboard)
              ├── Clerk Auth Middleware & OTP Verifier
              └── Server Actions & API Service Layer
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
   [ PostgreSQL Database ]         [ Thermal Print Agent ]
   (Prisma ORM multi-tenant)       (Polling Cloud Print Queue)
```

## 2. Layered Service Architecture
To ensure strict separation of concerns and maintainability:
- **Presentation Layer**: Next.js App Router Server Components & Server Actions (`app/`).
- **Authorization Context**: Server middleware & resolution (`lib/auth/tenant-context.ts`).
- **Business Service Layer**: Domain business rules & validations (`services/`).
- **Data Access Layer**: Repository patterns using Prisma Client (`repositories/` or `lib/db/prisma.ts`).
- **Infrastructure Services**: Logging (`lib/logger.ts`), Clerk Auth (`lib/auth/clerk.ts`), Print Queue management.

## 3. Thermal Printing Cloud Queue Architecture
Direct local USB/LAN thermal printer communication from cloud infrastructure is impossible.
1. Order created in Next.js backend -> Generates `KOTTicket` -> Enqueues `PrintJob` in database (`status: PENDING`, `tenantId`).
2. Local Print Agent running at restaurant polls `/api/print-jobs/poll` with authenticated agent API token.
3. Server returns pending print jobs belonging **strictly to the agent's tenant**.
4. Agent sends job to local ESC/POS thermal printer and posts back execution result (`PRINTED` or `FAILED`).
