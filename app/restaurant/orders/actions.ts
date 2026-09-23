"use server";

import { requirePermission, requireTenant } from "@/lib/auth/guards";
import { action } from "@/lib/http/action";
import {
  createOrder,
  getOrderBoard,
  getTenantOrders,
  orderTransitionPermission,
  quoteOrder,
  setOrderCustomer,
  setOrderPriority,
  updateOrderStatus,
} from "@/lib/services/orders";
import { parseInput } from "@/lib/validation/core";
import {
  createOrderSchema,
  listOrdersSchema,
  orderPollSchema,
  quoteOrderSchema,
  setOrderCustomerSchema,
  setOrderPrioritySchema,
  updateOrderStatusSchema,
  type CreateOrderInput,
  type ListOrdersInput,
  type OrderPollInput,
  type QuoteOrderInput,
  type SetOrderCustomerInput,
  type SetOrderPriorityInput,
  type UpdateOrderStatusInput,
} from "@/lib/validation/orders";

/**
 * Interim order actions (S1-P04-T007; rebuilt in S1-P12). The tenant, actor and role come only from the server-resolved
 * context; inputs are strict (a `tenantId`, price or total in the body is 422). Results use the ActionResult envelope.
 */

/** LD-ORD-01 (interim) — `order:read`. KITCHEN receives the kitchen projection (security.md §3.3 row 23). */
export const getOrdersAction = action(async (input?: ListOrdersInput) => {
  const ctx = await requireTenant("order:read");
  const filters = parseInput(listOrdersSchema, input ?? {});
  return { orders: await getTenantOrders(ctx, filters) };
});

/**
 * SA-ORD-02 / SA-ORD-03 (interim) — `order:read`, then the permission for the requested target (security.md §3.4):
 * ACCEPTED `order:accept`, PREPARING/READY `order:kitchen_update`, COMPLETED `order:complete`, CANCELLED `order:cancel`.
 */
export const updateOrderStatusAction = action(async (input: UpdateOrderStatusInput) => {
  const ctx = await requireTenant("order:read");
  const data = parseInput(updateOrderStatusSchema, input);
  requirePermission(ctx, orderTransitionPermission(data.status));
  return updateOrderStatus(ctx, data);
});

/**
 * SA-ORD-01 — `order:create`, plus `customer:create` for a new customer and `order:accept` when the order is sent
 * straight to the kitchen. The service prices every line from the tenant's own menu and is idempotent per key.
 */
export const createStaffOrderAction = action(async (input: CreateOrderInput) => {
  const ctx = await requireTenant("order:create");
  const data = parseInput(createOrderSchema, input);
  if (data.customer) requirePermission(ctx, "customer:create");
  if (data.sendToKitchen) requirePermission(ctx, "order:accept");
  return { order: await createOrder(ctx, data) };
});

/** LD-ORD-01 (S1-P12-T006) — `order:read`. The board's refresh after a mutation; the 10 s poll uses RH-ORD-01. */
export const getOrderBoardAction = action(async (input?: OrderPollInput) => {
  const ctx = await requireTenant("order:read");
  return getOrderBoard(ctx, parseInput(orderPollSchema, input ?? {}));
});

/**
 * SA-ORD-01 companion (S1-P12-T007) — `order:create`. Prices the cart the POS is building and returns decimal
 * strings; nothing is written. Totals in the browser are always the server's answer, never a client calculation.
 */
export const quoteOrderAction = action(async (input: QuoteOrderInput) => {
  const ctx = await requireTenant("order:create");
  return quoteOrder(ctx, parseInput(quoteOrderSchema, input));
});

/** SA-ORD-06 (S1-P15-T003) — `order:update_meta`; the service refuses HIGH for a role that may not set it. */
export const setOrderPriorityAction = action(async (input: SetOrderPriorityInput) => {
  const ctx = await requireTenant("order:update_meta");
  return setOrderPriority(ctx, parseInput(setOrderPrioritySchema, input));
});

/** SA-ORD-05 (S1-P15-T003) — `order:update_meta` plus `customer:read` to name a customer at all. */
export const setOrderCustomerAction = action(async (input: SetOrderCustomerInput) => {
  const ctx = await requireTenant("order:update_meta");
  const data = parseInput(setOrderCustomerSchema, input);
  if (data.customerId !== null) requirePermission(ctx, "customer:read");
  return setOrderCustomer(ctx, data);
});
