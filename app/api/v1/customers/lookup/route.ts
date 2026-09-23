import type { NextRequest } from "next/server";
import { requireTenant } from "@/lib/auth/guards";
import { route } from "@/lib/http/route";
import { consume, rateLimitedResponse } from "@/lib/security/rate-limit";
import { lookupCustomer } from "@/lib/services/customers";
import { parseInput } from "@/lib/validation/core";
import { customerLookupSchema } from "@/lib/validation/customers";

export const dynamic = "force-dynamic";

/** Typing in the POS search box is cheap for the user and a query for us, so it gets its own budget (SC-RL-01). */
const LOOKUP_RATE_LIMIT = { limit: 60, windowSec: 60, failOpen: false } as const;

/**
 * RH-CUS-01 — `GET /api/v1/customers/lookup?q=` (`customer:read`, S1-P13-T002). Returns at most 10 of the caller's
 * tenant's active customers matching a partial name, phone or email. Rate limited per user.
 */
export const GET = route(async (request: NextRequest) => {
  const ctx = await requireTenant("customer:read");
  const { q } = parseInput(customerLookupSchema, Object.fromEntries(new URL(request.url).searchParams));

  const limit = await consume("customer.lookup", `${ctx.tenantId}:${ctx.userId}`, LOOKUP_RATE_LIMIT);
  if (!limit.allowed) return rateLimitedResponse(limit, ctx.requestId);

  return { customers: await lookupCustomer(ctx, q) };
});
