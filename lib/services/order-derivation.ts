import "server-only";
import { OrderStatus, type KotStatus } from "@prisma/client";
import type { TenantContext } from "@/lib/auth/context-types";
import { audit } from "@/lib/audit/write";
import { latestRoundKotStatuses } from "@/lib/data/kot";
import { findOrderStatus, setDerivedOrderStatus } from "@/lib/data/orders";
import type { Tx } from "@/lib/data/tx";

/**
 * Order status derived from kitchen progress (S1-P14-T002, BR-ORD-04, security.md §3.4 "also automatic"), part of the
 * order state machine with lib/services/orders.ts. Runs inside the KOT change's transaction:
 *
 * - ACCEPTED → PREPARING when any ticket of the latest round has started;
 * - PREPARING → READY when every (non-cancelled) ticket of the latest round is READY or SERVED.
 *
 * Derived changes are audited with actor SYSTEM; the audit records the KOT and the user whose action triggered it.
 */
const STARTED: ReadonlySet<KotStatus> = new Set(["PREPARING", "READY", "SERVED"]);
const DONE: ReadonlySet<KotStatus> = new Set(["READY", "SERVED"]);

export function kitchenStatusTarget(current: OrderStatus, kotStatuses: readonly KotStatus[]): OrderStatus | null {
  if (kotStatuses.length === 0) return null;
  if (current === OrderStatus.ACCEPTED && kotStatuses.some((s) => STARTED.has(s))) return OrderStatus.PREPARING;
  if (current === OrderStatus.PREPARING && kotStatuses.every((s) => DONE.has(s))) return OrderStatus.READY;
  return null;
}

export async function syncOrderWithKitchen(
  tx: Tx,
  ctx: TenantContext,
  orderId: string,
  trigger: { kotId: string; kotStatus: KotStatus },
): Promise<OrderStatus[]> {
  const applied: OrderStatus[] = [];
  const statuses = await latestRoundKotStatuses(tx, ctx, orderId);
  // At most two steps (ACCEPTED → PREPARING → READY) when one change completes a single-ticket round.
  for (let step = 0; step < 2; step++) {
    const order = await findOrderStatus(tx, ctx, orderId);
    if (!order) break;
    const target = kitchenStatusTarget(order.status, statuses);
    if (!target || !(await setDerivedOrderStatus(tx, ctx, order, target))) break;
    await audit(
      tx,
      { kind: "system", requestId: ctx.requestId, job: "order-kitchen-derivation" },
      {
        tenantId: ctx.tenantId,
        action: "order.status_changed",
        resourceType: "order",
        resourceId: order.id,
        before: { status: order.status, version: order.version },
        after: { status: target, version: order.version + 1, trigger: "kot", kotId: trigger.kotId, kotStatus: trigger.kotStatus, byUserId: ctx.userId },
      },
    );
    applied.push(target);
  }
  return applied;
}
