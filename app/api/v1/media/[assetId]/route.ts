import type { NextRequest } from "next/server";
import { requireTenant } from "@/lib/auth/guards";
import { assertSameOrigin } from "@/lib/http/same-origin";
import { route } from "@/lib/http/route";
import { consumeScope } from "@/lib/security/rate-limit";
import { RateLimitedError } from "@/lib/errors";
import { discardImage } from "@/lib/services/media";
import { parseInput, uuidParam } from "@/lib/validation/core";
import { z } from "zod";

/**
 * RH-MEDIA-02 — `DELETE /api/v1/media/{assetId}` (RASOIOS-ADR-017 §5): discards one of the caller's tenant's uploads
 * that nothing uses (e.g. an image picked and then replaced before saving). The permission is the one for the asset's
 * purpose (website:update or menu:manage), checked in the service once the asset is found. The id is only looked up inside the
 * session's tenant — another tenant's id is 404 exactly like a random one; an image still in use is 409 IMAGE_IN_USE.
 */
const paramsSchema = z.object({ assetId: uuidParam }).strict();

export const DELETE = route(async (request: NextRequest, context: { params: Promise<{ assetId: string }> }) => {
  const ctx = await requireTenant("menu:read");
  assertSameOrigin(request, ctx.requestId);
  const limit = await consumeScope("session.mutation", ctx.userId);
  if (!limit.allowed) throw new RateLimitedError(limit.retryAfterSec);

  const { assetId } = parseInput(paramsSchema, await context.params);
  return discardImage(ctx, assetId);
});
