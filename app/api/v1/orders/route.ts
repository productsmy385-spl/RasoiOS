import type { NextRequest } from "next/server";
import { requireTenant } from "@/lib/auth/guards";
import { route } from "@/lib/http/route";
import { getOrderBoard } from "@/lib/services/orders";
import { parseInput } from "@/lib/validation/core";
import { orderPollSchema } from "@/lib/validation/orders";

export const dynamic = "force-dynamic";

/**
 * RH-ORD-01 — `GET /api/v1/orders?since=&status=&type=&q=&limit=` (`order:read`, S1-P12-T006).
 * Polled every 10 s by the order board (ADR-009): `since` is the previous response's `serverTime`, and the answer
 * carries every order of the caller's tenant that changed at or after it — including completed and cancelled ones, so
 * the board can move or remove their cards. KITCHEN receives the kitchen projection: no customer name, no amounts.
 * `route()` sends it with `cache-control: no-store`.
 */
export const GET = route(async (request: NextRequest) => {
  const ctx = await requireTenant("order:read");
  const params = Object.fromEntries(new URL(request.url).searchParams);
  return getOrderBoard(ctx, parseInput(orderPollSchema, params));
});
