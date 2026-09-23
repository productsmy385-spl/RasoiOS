/**
 * `lib/data` — the only sanctioned path to tenant-owned data (ADR-008, S1-P02-T005).
 *
 * Conventions every module in this folder follows (tenant-isolation.md §3.1):
 * 1. Functions take a context (`TenantContext` / `AgentContext` / `PlatformContext`) as their first argument and never
 *    a loose `tenantId` string from a caller.
 * 2. Every query on a tenant-owned model filters by `tenantScope(ctx, …)` or uses `tenantKey(ctx, id)`; never
 *    `findUnique({ where: { id } })`. The static guard (S1-P02-T006) fails CI otherwise.
 * 3. Creates set `tenantId: ctx.tenantId`. Composite foreign keys reject a foreign parent even if a bug passes one.
 * 4. A miss and another tenant's row are indistinguishable: both throw `NotFoundError` (`required`).
 * 5. Optimistic updates use `updateMany` with the tenant and version in `where`; 0 rows → `notFoundOrConflict`.
 * 6. Return DTO projections (`dto.ts`): money as two-decimal strings, instants as ISO strings, dates as `YYYY-MM-DD`.
 * 7. Database errors are mapped by `mapErrors` / `withTx` into safe application errors (no SQL in messages).
 */
export { withTx, type Tx } from "./tx";
export { mapDatabaseError, mapErrors } from "./errors";
export { tenantScope, tenantKey, required, notFoundOrConflict } from "./scope";
export * from "./dto";
