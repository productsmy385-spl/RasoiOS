import "server-only";
import { unstable_rethrow } from "next/navigation";
import type { NextRequest } from "next/server";
import { RateLimitedError } from "@/lib/errors";
import { toActionError } from "./action";

/**
 * Route Handler wrapper (S1-P04-T005, api.md §1.2): errors become
 *   HTTP status + { "error": { "code", "message", "requestId", "fieldErrors"? } }
 * with `Cache-Control: no-store` for authenticated data and the request id echoed in `x-request-id`.
 */
const STATUS: Record<string, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NO_ACTIVE_MEMBERSHIP: 403,
  TENANT_SUSPENDED: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TENANT_SELECTION_REQUIRED: 409,
  INVALID_TRANSITION: 409,
  VALIDATION_ERROR: 422,
  RATE_LIMITED: 429,
  INTERNAL: 500,
  SERVICE_UNAVAILABLE: 503,
};

export function errorResponse(error: unknown, requestId: string): Response {
  const body = toActionError(error, requestId);
  const status = (error as { statusCode?: number } | null)?.statusCode ?? STATUS[body.code] ?? 500;
  const headers: Record<string, string> = { "x-request-id": requestId, "cache-control": "no-store" };
  if (error instanceof RateLimitedError) headers["retry-after"] = String(error.retryAfterSec);
  return Response.json({ error: body }, { status: body.code === "INTERNAL" ? 500 : status, headers });
}

type Handler<C> = (request: NextRequest, context: C) => Promise<Response | unknown>;

export function route<C = unknown>(handler: Handler<C>): (request: NextRequest, context: C) => Promise<Response> {
  return async (request, context) => {
    const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
    try {
      const result = await handler(request, context);
      if (result instanceof Response) return result;
      return Response.json(result, { headers: { "x-request-id": requestId, "cache-control": "no-store" } });
    } catch (error) {
      unstable_rethrow(error);
      return errorResponse(error, requestId);
    }
  };
}
