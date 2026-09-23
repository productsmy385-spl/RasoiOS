import type { TenantScopedContext } from "@/lib/auth/context-types";
import { ConflictError, NotFoundError } from "@/lib/errors";

/**
 * Tenant scoping helpers (S1-P02-T005, tenant-isolation.md §3.1).
 *
 * `where: tenantScope(ctx, { id })` puts `tenant_id = ctx.tenantId` into a query. It is the only way data-access code
 * adds the tenant filter, which keeps the static guard (S1-P02-T006) simple: every tenant-owned query either uses a
 * `tenantId` key or the compound `tenantId_id` unique key.
 */
export function tenantScope<W extends object>(ctx: TenantScopedContext, where?: W): W & { tenantId: string } {
  return { ...(where ?? ({} as W)), tenantId: ctx.tenantId };
}

/** Compound unique key `{ tenantId_id: { tenantId, id } }` for findUnique/update/delete on tenant-owned models. */
export function tenantKey(ctx: TenantScopedContext, id: string): { tenantId_id: { tenantId: string; id: string } } {
  return { tenantId_id: { tenantId: ctx.tenantId, id } };
}

/** Throws NotFoundError when a scoped read returned nothing (missing and other-tenant rows look identical). */
export function required<T>(row: T | null | undefined, resource: string): T {
  if (row === null || row === undefined) throw new NotFoundError(`${resource} not found`);
  return row;
}

/**
 * After an optimistic `updateMany` affected 0 rows: 409 if the row exists in the caller's tenant (stale version),
 * otherwise 404. `exists` must itself be tenant-scoped.
 */
export async function notFoundOrConflict(exists: () => Promise<boolean>, resource: string): Promise<Error> {
  return (await exists())
    ? new ConflictError(`${resource} was changed by someone else. Reload and try again.`)
    : new NotFoundError(`${resource} not found`);
}
