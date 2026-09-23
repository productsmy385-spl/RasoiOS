import type { NextRequest } from "next/server";
import { pairRateLimitKey } from "@/lib/auth/agent";
import { route } from "@/lib/http/route";
import { consumeScope, rateLimitedResponse } from "@/lib/security/rate-limit";
import { pairPrintAgent } from "@/lib/services/printing";
import { agentPairSchema } from "@/lib/validation/printing";
import { agentSourceIp } from "@/lib/auth/agent";
import { readAgentJson } from "../agent-request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * RH-AGT-01 — `POST /api/v1/print-agent/pair` (ADR-007 §1, S1-P16-T005).
 *
 * This is the one agent endpoint without a bearer token: the pairing code *is* the credential. It is exchanged, once,
 * for a 256-bit token that is shown here and never again (only its SHA-256 hash and an 8-character prefix are
 * stored). A wrong code, an expired code and an already-used code all answer 401 `INVALID_PAIRING_CODE`, so the
 * endpoint cannot be used to confirm that a code exists.
 *
 * Brute force is the real threat here (T-015), so the rate limit runs **before** anything touches the code: 5
 * attempts per 15 minutes per source address, fail-closed (ADR-011 §2, SC-RL-01, ADV-015).
 */
export const POST = route(async (request: NextRequest) => {
  const limit = await consumeScope("agent.pair", pairRateLimitKey(request));
  if (!limit.allowed) return rateLimitedResponse(limit, request.headers.get("x-request-id") ?? undefined);

  const input = await readAgentJson(request, agentPairSchema);
  const paired = await pairPrintAgent(input, {
    requestId: request.headers.get("x-request-id") ?? crypto.randomUUID(),
    ip: agentSourceIp(request),
  });
  return Response.json(paired, { status: 201, headers: { "cache-control": "no-store" } });
});
