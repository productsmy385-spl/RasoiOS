"use server";

import { requirePermission, requireTenant } from "@/lib/auth/guards";
import { action } from "@/lib/http/action";
import { getTenantKOTTickets, getTenantKitchenSections, updateKOTStatus } from "@/lib/services/kot";
import { parseInput } from "@/lib/validation/core";
import { kotListFiltersSchema, updateKotStatusSchema, type KotListFiltersInput, type UpdateKotStatusInput } from "@/lib/validation/kot";

/**
 * Kitchen board actions (api.md LD-KOT-01 / SA-KOT-01; S1-P15-T002 folded `/restaurant/kds` into this route).
 * The tenant comes only from the server-resolved context; inputs are strict objects (an extra `tenantId` is 422).
 * Tickets use the kitchen projection: no customer data, no amounts (SC-RBAC-07).
 */

/** LD-KOT-01 tickets — `kot:read`. */
export const getKOTTicketsAction = action(async (input: KotListFiltersInput = {}) => {
  const ctx = await requireTenant("kot:read");
  const filters = parseInput(kotListFiltersSchema, input);
  return getTenantKOTTickets(ctx, filters);
});

/** Section selector — `kot:read`. */
export const getKitchenSectionsAction = action(async () => {
  const ctx = await requireTenant("kot:read");
  return getTenantKitchenSections(ctx);
});

/**
 * SA-KOT-01 — `kot:read`, then `kot:update_status` for →PREPARING/→READY or `kot:serve` for →SERVED (security.md §3.4).
 * The target permission is checked before the ticket is loaded, so a 403 never reveals whether a ticket exists.
 */
export const updateKOTStatusAction = action(async (input: UpdateKotStatusInput) => {
  const ctx = await requireTenant("kot:read");
  const { kotId, toStatus } = parseInput(updateKotStatusSchema, input);
  requirePermission(ctx, toStatus === "SERVED" ? "kot:serve" : "kot:update_status");
  return updateKOTStatus(ctx, kotId, toStatus);
});
