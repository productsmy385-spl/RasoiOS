import { verifyWebhook } from "@clerk/nextjs/webhooks";
import type { NextRequest } from "next/server";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { consumeScope, rateLimitedResponse } from "@/lib/security/rate-limit";
import { applyClerkUserEvent } from "@/lib/services/users";

/**
 * RH-AUTH-01 — Clerk webhook (S1-P03-T008, ADR-011 §5, SC-WH-01/02).
 *
 * Authentication is the signature, not a session: Clerk's `verifyWebhook` checks the Standard Webhooks / Svix
 * signature over the raw body with CLERK_WEBHOOK_SIGNING_SECRET and rejects timestamps more than 5 minutes old.
 * Rate limited per source IP (`webhook.clerk`, fail-closed).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sourceIp(request: Request): string {
  // Client IP extraction with trusted proxy hops is finalised in S1-P23-T003.
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

function json(status: number, body: unknown, requestId: string): Response {
  return Response.json(body, { status, headers: { "x-request-id": requestId } });
}

export async function POST(request: NextRequest): Promise<Response> {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();

  try {
    const limit = await consumeScope("webhook.clerk", sourceIp(request));
    if (!limit.allowed) return rateLimitedResponse(limit, requestId);
  } catch {
    // The limiter fails closed for this scope (database unavailable).
    return json(503, { error: { code: "SERVICE_UNAVAILABLE", message: "Try again later.", requestId } }, requestId);
  }

  const signingSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
  if (!signingSecret) {
    logger.error("webhook.clerk_not_configured", { requestId });
    return json(503, { error: { code: "SERVICE_UNAVAILABLE", message: "Webhook is not configured.", requestId } }, requestId);
  }

  let event;
  try {
    event = await verifyWebhook(request, { signingSecret });
  } catch {
    logger.warn("security.webhook_rejected", { requestId, source: "clerk" });
    return json(400, { error: { code: "INVALID_SIGNATURE", message: "Invalid webhook signature.", requestId } }, requestId);
  }

  try {
    const outcome = await applyClerkUserEvent(event, requestId);
    logger.info("webhook.clerk_processed", { requestId, type: event.type, outcome });
    return json(200, {}, requestId);
  } catch (error) {
    const status = error instanceof AppError ? error.statusCode : 500;
    logger.error("webhook.clerk_failed", { requestId, type: event.type, status });
    // Non-2xx makes Clerk retry later, which is safe because handlers are idempotent.
    return json(status >= 500 ? status : 500, { error: { code: "INTERNAL", message: "Webhook processing failed.", requestId } }, requestId);
  }
}
