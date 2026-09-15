# Database Specification & Prisma ERD

## 1. Relational Integrity & Multi-Tenancy Design
All tenant-scoped tables feature:
- Foreign key constraint: `tenantId REFERENCES Tenant(id) ON DELETE RESTRICT`
- Composite indexes: `@@index([tenantId, createdAt])`, `@@index([tenantId, status])`
- Primary Keys: UUID v4 strings for security against enumeration attacks.

## 2. Core Entities
1. **Tenant**: Root entity representing a restaurant business entity.
2. **Restaurant**: Public & operational configuration linked 1:1 or 1:N to Tenant.
3. **User**: Global user profile mapped to Clerk Identity.
4. **UserTenant**: Join table mapping `User` to `Tenant` with assigned `Role` (`SUPER_ADMIN`, `TENANT_ADMIN`, `MANAGER`, `CASHIER`, `KITCHEN`, `WAITER`).
5. **MenuCategory**: Tenant menu categories (`sortOrder`, `isActive`).
6. **MenuItem**: Individual dishes with `Decimal` price, tax rate, variants, addons.
7. **DailyMenu** & **DailyMenuItem**: Date-specific active menus.
8. **Customer**: Tenant customer contact registry.
9. **Order** & **OrderItem**: Order workflow with immutable historical item snapshots (name, price, tax rate).
10. **KOTTicket**: Kitchen ticket linked to order, section, table, and status.
11. **Transaction**: Financial transaction log for payments, payment status, methods, and refunds.
12. **PrintJob**: Cloud print queue for ESC/POS thermal receipt printing.
13. **AuditLog**: Immutable append-only audit trail of security and administrative operations.
14. **SocialPost**: Automated menu promotion post preparation.

## 3. Strict Rules
- **Monetary Persistence**: MUST use `Decimal` / `NUMERIC(12, 2)`. Floating point representation (`Float`) for money is forbidden.
- **Historical Snapshots**: `OrderItem` MUST store snapshot fields (`priceAtOrder`, `itemNameAtOrder`, `taxRateAtOrder`) so menu edits never alter past financials.
- **UTC Persistance**: All timestamps (`createdAt`, `updatedAt`, `scheduledAt`) stored in UTC. Local time display uses `Tenant.timezone` (IANA format).
