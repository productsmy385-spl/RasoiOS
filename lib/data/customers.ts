import "server-only";
import type { OrderStatus, Prisma } from "@prisma/client";
import type { TenantContext } from "@/lib/auth/context-types";
import { db } from "@/lib/db/prisma";
import { NotFoundError } from "@/lib/errors";
import { businessDateDto, instantDto, moneyDto } from "./dto";
import { mapErrors } from "./errors";
import { required, tenantScope } from "./scope";
import { likeLiteral } from "./search";
import type { Tx } from "./tx";

/**
 * Customer data access (S1-P04-T007 interim; rebuilt in S1-P13). Every query is scoped to `ctx.tenantId`. A customer's
 * orders are reached through the orders' composite (tenant_id, customer_id) foreign key, so they are the same tenant.
 */
export type CustomerListItemDto = {
  id: string;
  fullName: string;
  phoneE164: string | null;
  email: string | null;
  notes: string | null;
  createdAt: string;
  orderCount: number;
  lastOrder: { createdAt: string; totalAmount: string } | null;
  isArchived: boolean;
};

/**
 * The context tenant's customers, newest first, optionally filtered by name/phone/email.
 * Archived customers are left out unless the caller asks for them (LD-CUS-01 `includeArchived`): archiving is meant
 * to clear the everyday list, not to hide a record from the people who archived it.
 */
export async function listCustomers(
  ctx: TenantContext,
  query: { search?: string | null; limit?: number; includeArchived?: boolean } = {},
): Promise<CustomerListItemDto[]> {
  const search = query.search?.trim() ? likeLiteral(query.search.trim()) : null;
  const rows = await mapErrors("Customer", () =>
    db.customer.findMany({
      where: {
        ...tenantScope(ctx, query.includeArchived ? {} : { archivedAt: null }),
        ...(search
          ? {
              OR: [
                { fullName: { contains: search, mode: "insensitive" as const } },
                { phoneE164: { contains: search, mode: "insensitive" as const } },
                { email: { contains: search, mode: "insensitive" as const } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        fullName: true,
        phoneE164: true,
        email: true,
        notes: true,
        createdAt: true,
        archivedAt: true,
        _count: { select: { orders: true } },
        orders: { take: 1, orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { createdAt: true, totalAmount: true } },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: Math.min(Math.max(query.limit ?? 200, 1), 500),
    }),
  );
  return rows.map((row) => ({
    id: row.id,
    fullName: row.fullName,
    phoneE164: row.phoneE164,
    email: row.email,
    notes: row.notes,
    createdAt: instantDto(row.createdAt),
    orderCount: row._count.orders,
    lastOrder: row.orders[0] ? { createdAt: instantDto(row.orders[0].createdAt), totalAmount: moneyDto(row.orders[0].totalAmount) } : null,
    isArchived: row.archivedAt !== null,
  }));
}

// ─── S1-P13-T001 writes and reads ───

export type CustomerDto = {
  id: string;
  fullName: string;
  phoneE164: string | null;
  email: string | null;
  notes: string | null;
  isArchived: boolean;
  isAnonymized: boolean;
  createdAt: string;
};

const CUSTOMER_SELECT = {
  id: true,
  fullName: true,
  phoneE164: true,
  email: true,
  notes: true,
  archivedAt: true,
  anonymizedAt: true,
  createdAt: true,
} satisfies Prisma.CustomerSelect;

type CustomerRow = Prisma.CustomerGetPayload<{ select: typeof CUSTOMER_SELECT }>;

export function toCustomerDto(row: CustomerRow): CustomerDto {
  return {
    id: row.id,
    fullName: row.fullName,
    phoneE164: row.phoneE164,
    email: row.email,
    notes: row.notes,
    isArchived: row.archivedAt !== null,
    isAnonymized: row.anonymizedAt !== null,
    createdAt: instantDto(row.createdAt),
  };
}

/** One customer of the caller's tenant; another tenant's id and an unknown id are both null (404 parity). */
export async function findCustomer(client: Tx, ctx: TenantContext, customerId: string): Promise<CustomerDto | null> {
  const row = await client.customer.findFirst({ where: tenantScope(ctx, { id: customerId }), select: CUSTOMER_SELECT });
  return row ? toCustomerDto(row) : null;
}

/** An active customer of this tenant holding this phone number, used for the PHONE_EXISTS rule (SA-CUS-01). */
export async function findCustomerByPhone(client: Tx, ctx: TenantContext, phoneE164: string, excludeId?: string): Promise<{ id: string } | null> {
  return client.customer.findFirst({
    where: tenantScope(ctx, { phoneE164, archivedAt: null, ...(excludeId ? { NOT: { id: excludeId } } : {}) }),
    select: { id: true },
  });
}

export async function insertCustomer(
  tx: Tx,
  ctx: TenantContext,
  data: { fullName: string; phoneE164: string | null; email: string | null; notes: string | null },
): Promise<CustomerDto> {
  const row = await tx.customer.create({
    data: { ...data, tenantId: ctx.tenantId, createdByUserId: ctx.userId },
    select: CUSTOMER_SELECT,
  });
  return toCustomerDto(row);
}

/** Patches only the fields the caller sent; `undefined` leaves a field untouched, `null` clears it. */
export async function updateCustomerRow(
  tx: Tx,
  ctx: TenantContext,
  customerId: string,
  data: Partial<{ fullName: string; phoneE164: string | null; email: string | null; notes: string | null; archivedAt: Date | null; anonymizedAt: Date | null }>,
): Promise<CustomerDto> {
  const { count } = await tx.customer.updateMany({ where: tenantScope(ctx, { id: customerId }), data });
  if (count === 0) throw new NotFoundError("Customer not found");
  return required(await findCustomer(tx, ctx, customerId), "Customer");
}

export type CustomerOrderDto = { id: string; orderNumber: string; status: OrderStatus; businessDate: string; createdAt: string; totalAmount: string | null };

/**
 * LD-CUS-02 — a customer's orders, newest first, with a cursor. Amounts are included only for callers who may see
 * money (`transaction:read`); the caller passes that decision in, so this stays a pure read.
 */
export async function listCustomerOrders(
  ctx: TenantContext,
  customerId: string,
  options: { cursor?: string; limit?: number; includeAmounts: boolean },
): Promise<{ orders: CustomerOrderDto[]; nextCursor: string | null }> {
  const limit = Math.min(Math.max(options.limit ?? 20, 1), 50);
  const rows = await mapErrors("Customer", () =>
    db.order.findMany({
      where: tenantScope(ctx, { customerId }),
      select: { id: true, orderNumber: true, status: true, businessDate: true, createdAt: true, totalAmount: true },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    }),
  );
  const page = rows.slice(0, limit);
  return {
    orders: page.map((row) => ({
      id: row.id,
      orderNumber: row.orderNumber,
      status: row.status,
      businessDate: businessDateDto(row.businessDate),
      createdAt: instantDto(row.createdAt),
      totalAmount: options.includeAmounts ? moneyDto(row.totalAmount) : null,
    })),
    nextCursor: rows.length > limit ? page[page.length - 1].id : null,
  };
}

/** RH-CUS-01 — at most 10 matches on name, phone or email for the POS lookup. */
export async function lookupCustomers(ctx: TenantContext, term: string): Promise<CustomerDto[]> {
  const search = likeLiteral(term.trim());
  const rows = await mapErrors("Customer", () =>
    db.customer.findMany({
      where: {
        ...tenantScope(ctx, { archivedAt: null }),
        OR: [
          { fullName: { contains: search, mode: "insensitive" as const } },
          { phoneE164: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      },
      select: CUSTOMER_SELECT,
      orderBy: [{ fullName: "asc" }],
      take: 10,
    }),
  );
  return rows.map(toCustomerDto);
}
