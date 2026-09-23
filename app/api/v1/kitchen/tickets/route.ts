import type { NextRequest } from "next/server";
import { requireTenant } from "@/lib/auth/guards";
import { kitchenBoard } from "@/lib/data/kitchen";
import { route } from "@/lib/http/route";
import { parseInput } from "@/lib/validation/core";
import { kitchenPollSchema } from "@/lib/validation/kot";

export const dynamic = "force-dynamic";

/**
 * RH-KOT-01 — `GET /api/v1/kitchen/tickets?since=&section=&status=` (`kot:read`, S1-P15-T001).
 * Polled every 5 s by the kitchen board (ADR-009): `since` is the previous response's `serverTime`, and the answer
 * carries every ticket of the caller's tenant that changed at or after it — including served and cancelled ones, so
 * the board can remove their cards. The payload is the kitchen projection: no customer data, no amounts.
 */
export const GET = route(async (request: NextRequest) => {
  const ctx = await requireTenant("kot:read");
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const { since, section, status, limit } = parseInput(kitchenPollSchema, params);
  return kitchenBoard(ctx, { since, sectionId: section, status, limit });
});
