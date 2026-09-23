import type { NextRequest } from "next/server";
import type { ZodTypeAny, z } from "zod";
import type { AgentContext } from "@/lib/auth/context-types";
import { ValidationError } from "@/lib/errors";
import { consumeScope, rateLimitedResponse } from "@/lib/security/rate-limit";
import { parseInput } from "@/lib/validation/core";

/**
 * Shared plumbing for the print-agent API (S1-P16-T005, api.md §13, ADR-007).
 *
 * Agent requests are strict JSON: an unparseable body, a non-object body and any unknown key — including a `tenantId`
 * an attacker hopes the server will honour — are 422 `VALIDATION_ERROR` before the handler sees them (ADR-007 §1,
 * SC-TEN-01, SC-VAL-01). The tenant is *never* read from the request; it comes from the PRINT_AGENT row the bearer
 * token resolved to (`lib/auth/agent.ts`).
 */
export async function readAgentJson<S extends ZodTypeAny>(request: NextRequest, schema: S): Promise<z.output<S>> {
  const text = await request.text();
  if (text.trim() === "") return parseInput(schema, {});

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new ValidationError("Send a JSON object body.", { _: ["Malformed JSON"] });
  }
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    throw new ValidationError("Send a JSON object body.", { _: ["Expected a JSON object"] });
  }
  return parseInput(schema, body);
}

/**
 * `agent.api` — 120 requests/min per agent (ADR-011 §2, api.md §13). Fail-closed: when the limiter cannot reach the
 * database, `consumeScope` throws and the request becomes 503 rather than being waved through.
 */
export async function agentApiRateLimit(ctx: AgentContext): Promise<Response | null> {
  const limit = await consumeScope("agent.api", ctx.agentId);
  return limit.allowed ? null : rateLimitedResponse(limit, ctx.requestId);
}
