import "server-only";
import type { TenantContext } from "@/lib/auth/context-types";
import { audit } from "@/lib/audit/write";
import { maskEmail, maskPhone } from "@/lib/audit/redact";
import { hasPermission } from "@/lib/auth/permissions";
import {
  findCustomer,
  findCustomerByPhone,
  insertCustomer,
  listCustomerOrders,
  listCustomers,
  lookupCustomers,
  updateCustomerRow,
  type CustomerDto,
  type CustomerListItemDto,
} from "@/lib/data/customers";
import { required } from "@/lib/data/scope";
import { withTx } from "@/lib/data/tx";
import { ConflictError, ForbiddenError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { now } from "@/lib/time";
import type {
  CreateCustomerData,
  CustomerHistoryData,
  ListCustomersQueryData,
  UpdateCustomerData,
} from "@/lib/validation/customers";

/**
 * Customer service (S1-P13-T001; api.md SA-CUS-01…04, LD-CUS-01/02, RH-CUS-01).
 *
 * The restaurant keeps as little as it needs: a name, and optionally a phone, an email and a note. Everything is
 * scoped to `ctx.tenantId`, so another tenant's customer id is NOT_FOUND exactly like an unknown one (SC-TEN-04).
 * Personal data never reaches a log or an audit row unmasked (SC-PII-03): audits record `S. Taylor`, `+91*****01`
 * and `s***@example.com`, which is enough to see what changed without storing the data twice.
 */
export type { CustomerDto, CustomerListItemDto };

/** What an audit row may hold about a customer. */
function maskedCustomer(customer: { fullName?: string | null; phoneE164?: string | null; email?: string | null; notes?: string | null }): Record<string, unknown> {
  const masked: Record<string, unknown> = {};
  if (customer.fullName !== undefined) masked.fullName = customer.fullName ? maskName(customer.fullName) : null;
  if (customer.phoneE164 !== undefined) masked.phoneE164 = customer.phoneE164 ? maskPhone(customer.phoneE164) : null;
  if (customer.email !== undefined) masked.email = customer.email ? maskEmail(customer.email) : null;
  if (customer.notes !== undefined) masked.hasNotes = Boolean(customer.notes);
  return masked;
}

/** `Sam Taylor` → `S. T.` — enough to recognise a change, not enough to be a second copy of the record. */
function maskName(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1)}.`)
    .join(" ");
}

/** A phone already used by another active customer of this tenant (api.md SA-CUS-01). */
class PhoneExistsError extends ConflictError {
  constructor(public readonly existingCustomerId: string | null) {
    // The id reaches the client as `details.existingCustomerId`, so the form can offer to open that record instead of
    // making someone search for a name they have not been told (api.md SA-CUS-01).
    super("A customer with this phone number already exists.", "PHONE_EXISTS", existingCustomerId ? { existingCustomerId } : undefined);
  }
}

/** LD-CUS-01 — the tenant's customers, newest first. */
export async function getCustomers(ctx: TenantContext, query: ListCustomersQueryData): Promise<CustomerListItemDto[]> {
  return listCustomers(ctx, { search: query.query, limit: query.limit, includeArchived: query.includeArchived });
}

/** SA-CUS-01 — create. A duplicate phone is 409; the existing id is revealed only to callers who may read customers. */
export async function createCustomer(ctx: TenantContext, data: CreateCustomerData): Promise<CustomerDto> {
  const customer = await withTx(ctx, async (tx) => {
    if (data.phoneE164) {
      const existing = await findCustomerByPhone(tx, ctx, data.phoneE164);
      if (existing) throw new PhoneExistsError(hasPermission(ctx, "customer:read") ? existing.id : null);
    }
    const created = await insertCustomer(tx, ctx, data);
    await audit(tx, ctx, {
      action: "customer.created",
      resourceType: "customer",
      resourceId: created.id,
      after: maskedCustomer(data),
    });
    return created;
  });

  logger.info("customer.created", { requestId: ctx.requestId, tenantId: ctx.tenantId, customerId: customer.id });
  return customer;
}

/** SA-CUS-02 — update. Only the fields the caller sent change; an empty string clears one. */
export async function updateCustomer(ctx: TenantContext, data: UpdateCustomerData): Promise<CustomerDto> {
  const { customerId, ...sent } = data;
  // Only the keys the caller actually sent: an absent field keeps its stored value.
  const patch = Object.fromEntries(Object.entries(sent).filter(([, value]) => value !== undefined));
  return withTx(ctx, async (tx) => {
    const before = required(await findCustomer(tx, ctx, customerId), "Customer");
    if (before.isAnonymized) throw new ConflictError("This customer was anonymised and can no longer be edited.", "CUSTOMER_ANONYMIZED");
    if (patch.phoneE164) {
      const existing = await findCustomerByPhone(tx, ctx, patch.phoneE164, customerId);
      if (existing) throw new PhoneExistsError(hasPermission(ctx, "customer:read") ? existing.id : null);
    }

    const updated = await updateCustomerRow(tx, ctx, customerId, patch);
    await audit(tx, ctx, {
      action: "customer.updated",
      resourceType: "customer",
      resourceId: customerId,
      before: maskedCustomer(before),
      after: maskedCustomer(updated),
    });
    return updated;
  });
}

/** SA-CUS-03 — archive: the customer disappears from lists and lookup; their orders keep the link. */
export async function archiveCustomer(ctx: TenantContext, customerId: string): Promise<CustomerDto> {
  return withTx(ctx, async (tx) => {
    const before = required(await findCustomer(tx, ctx, customerId), "Customer");
    if (before.isArchived) return before;
    const archived = await updateCustomerRow(tx, ctx, customerId, { archivedAt: now() });
    await audit(tx, ctx, { action: "customer.archived", resourceType: "customer", resourceId: customerId, before: { isArchived: false }, after: { isArchived: true } });
    return archived;
  });
}

/**
 * SA-CUS-04 — anonymise: irreversible removal of the personal data, for an erasure request. The row stays so the
 * restaurant's orders and totals remain correct; only TENANT_ADMIN may do it, and the caller confirms by phrase.
 */
export async function anonymizeCustomer(ctx: TenantContext, customerId: string): Promise<CustomerDto> {
  if (ctx.role !== "TENANT_ADMIN") throw new ForbiddenError("Only a restaurant administrator can anonymise a customer.");

  const customer = await withTx(ctx, async (tx) => {
    const before = required(await findCustomer(tx, ctx, customerId), "Customer");
    if (before.isAnonymized) return before;
    const at = now();
    const anonymized = await updateCustomerRow(tx, ctx, customerId, {
      fullName: "Removed customer",
      phoneE164: null,
      email: null,
      notes: null,
      anonymizedAt: at,
      archivedAt: before.isArchived ? undefined : at,
    });
    await audit(tx, ctx, {
      action: "customer.anonymized",
      resourceType: "customer",
      resourceId: customerId,
      before: maskedCustomer(before),
      after: { fullName: "Removed customer", phoneE164: null, email: null, hasNotes: false },
    });
    return anonymized;
  });

  logger.info("customer.anonymized", { requestId: ctx.requestId, tenantId: ctx.tenantId, customerId });
  return customer;
}

/** LD-CUS-02 — one customer with their order history. Amounts appear only for callers who may see money. */
export async function getCustomerHistory(
  ctx: TenantContext,
  data: CustomerHistoryData,
): Promise<{ customer: CustomerDto; orders: Awaited<ReturnType<typeof listCustomerOrders>>["orders"]; nextCursor: string | null }> {
  const customer = required(await withTx(ctx, (tx) => findCustomer(tx, ctx, data.customerId)), "Customer");
  const { orders, nextCursor } = await listCustomerOrders(ctx, data.customerId, {
    cursor: data.cursor,
    limit: data.limit,
    includeAmounts: hasPermission(ctx, "transaction:read"),
  });
  return { customer, orders, nextCursor };
}

/** RH-CUS-01 — POS lookup by partial name, phone or email; at most 10 of the caller's tenant's customers. */
export async function lookupCustomer(ctx: TenantContext, term: string): Promise<CustomerDto[]> {
  return lookupCustomers(ctx, term);
}
