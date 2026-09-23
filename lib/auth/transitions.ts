/**
 * Order and KOT transition authorization (S1-P05-T004, security.md §3.4, SC-RBAC-06). The ONLY place transition
 * rules live: order and KOT services call `assertTransitionAllowed` and the UI calls `allowedNextStatuses`.
 *
 * Business guards that need data (≥1 item, payment_status = PAID before COMPLETED, nothing left to refund before
 * CANCELLED, all KOTs READY before order READY) stay in the services; this table answers "may this role move this
 * record from A to B at all".
 */
import type { KotStatus, OrderStatus, TenantRole } from "@prisma/client";
import { ConflictError, ForbiddenError } from "@/lib/errors";
import type { TenantPermission } from "./permissions";

export type TransitionRule<S extends string> = {
  from: S;
  to: S;
  /** Required permission; null = automatic only (performed by the system, never requested by a user). */
  permission: TenantPermission | null;
  /** If set, only these roles may perform it (the ◐ restriction of security.md §3.3 row 29). */
  roles?: readonly TenantRole[];
};

export const ORDER_TRANSITIONS: readonly TransitionRule<OrderStatus>[] = [
  { from: "NEW", to: "ACCEPTED", permission: "order:accept" },
  { from: "ACCEPTED", to: "PREPARING", permission: "order:kitchen_update" },
  { from: "PREPARING", to: "READY", permission: "order:kitchen_update" },
  { from: "READY", to: "COMPLETED", permission: "order:complete" },
  { from: "NEW", to: "CANCELLED", permission: "order:cancel" },
  { from: "ACCEPTED", to: "CANCELLED", permission: "order:cancel", roles: ["TENANT_ADMIN", "MANAGER"] },
  // Q-008 answered B (2026-09-22): walk-outs after the kitchen started — managers only, reason required.
  { from: "PREPARING", to: "CANCELLED", permission: "order:cancel", roles: ["TENANT_ADMIN", "MANAGER"] },
  { from: "READY", to: "CANCELLED", permission: "order:cancel", roles: ["TENANT_ADMIN", "MANAGER"] },
  { from: "COMPLETED", to: "REFUNDED", permission: null },
];

export const KOT_TRANSITIONS: readonly TransitionRule<KotStatus>[] = [
  { from: "QUEUED", to: "PREPARING", permission: "kot:update_status" },
  { from: "PREPARING", to: "READY", permission: "kot:update_status" },
  { from: "READY", to: "SERVED", permission: "kot:serve" },
  { from: "QUEUED", to: "CANCELLED", permission: null },
  { from: "PREPARING", to: "CANCELLED", permission: null },
  { from: "READY", to: "CANCELLED", permission: null },
];

type Actor = { role: TenantRole; permissions: ReadonlySet<string> };
type Entity = "order" | "kot";

function rulesFor(entity: Entity): readonly TransitionRule<string>[] {
  return entity === "order" ? ORDER_TRANSITIONS : KOT_TRANSITIONS;
}

/** Throws INVALID_TRANSITION (409) for a pair not in the table or automatic-only, FORBIDDEN (403) for the wrong role. */
export function assertTransitionAllowed(actor: Actor, entity: "order", from: OrderStatus, to: OrderStatus): TransitionRule<OrderStatus>;
export function assertTransitionAllowed(actor: Actor, entity: "kot", from: KotStatus, to: KotStatus): TransitionRule<KotStatus>;
export function assertTransitionAllowed(actor: Actor, entity: Entity, from: string, to: string): TransitionRule<string> {
  const rule = rulesFor(entity).find((r) => r.from === from && r.to === to);
  if (!rule || rule.permission === null) {
    throw new ConflictError(`Cannot change ${entity === "order" ? "an order" : "a KOT"} from ${from} to ${to}.`, "INVALID_TRANSITION");
  }
  if (!actor.permissions.has(rule.permission) || (rule.roles && !rule.roles.includes(actor.role))) {
    throw new ForbiddenError();
  }
  return rule;
}

/** Statuses this actor may move the record to next (for showing only valid buttons; the server re-checks). */
export function allowedNextStatuses(actor: Actor, entity: "order", from: OrderStatus): OrderStatus[];
export function allowedNextStatuses(actor: Actor, entity: "kot", from: KotStatus): KotStatus[];
export function allowedNextStatuses(actor: Actor, entity: Entity, from: string): string[] {
  return rulesFor(entity)
    .filter((r) => r.from === from && r.permission !== null && actor.permissions.has(r.permission) && (!r.roles || r.roles.includes(actor.role)))
    .map((r) => r.to);
}

/** Permission a user needs to request a transition *to* `to` (used to pick the guard before the record is loaded). */
export function permissionForTarget(entity: "order", to: OrderStatus): TenantPermission | null;
export function permissionForTarget(entity: "kot", to: KotStatus): TenantPermission | null;
export function permissionForTarget(entity: Entity, to: string): TenantPermission | null {
  return rulesFor(entity).find((r) => r.to === to && r.permission !== null)?.permission ?? null;
}
