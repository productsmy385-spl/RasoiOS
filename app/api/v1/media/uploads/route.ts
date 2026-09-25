import type { NextRequest } from "next/server";
import { requirePermission, requireTenant } from "@/lib/auth/guards";
import { RateLimitedError, ValidationError } from "@/lib/errors";
import { assertSameOrigin } from "@/lib/http/same-origin";
import { route } from "@/lib/http/route";
import { MAX_UPLOAD_BYTES } from "@/lib/media/image-file";
import { isMediaPurpose, permissionForPurpose } from "@/lib/media/purposes";
import { consumeScope } from "@/lib/security/rate-limit";
import { uploadImage } from "@/lib/services/media";

/**
 * RH-MEDIA-01 — `POST /api/v1/media/uploads` (S1-P07-T009, RASOIOS-ADR-017).
 *
 * multipart/form-data with exactly two fields: `purpose` (LOGO | COVER | HERO | FAVICON | WEBSITE_SECTION | MENU_ITEM)
 * and `file`. Tenant and folder come from the session, never from the form. Returns 201 with the stored asset only
 * after ImageKit has confirmed the upload and the row is committed.
 */

/** Room for the multipart envelope around a maximum-size file. */
const MAX_BODY_BYTES = MAX_UPLOAD_BYTES + 64 * 1024;

export const POST = route(async (request: NextRequest) => {
  // Any tenant role can reach this far; the permission for the purpose is checked below once the form is read.
  const ctx = await requireTenant("menu:read");
  assertSameOrigin(request, ctx.requestId);

  const limit = await consumeScope("media.upload", ctx.userId);
  if (!limit.allowed) throw new RateLimitedError(limit.retryAfterSec, "Too many uploads. Try again later.");

  const form = await readCappedForm(request, MAX_BODY_BYTES);
  const keys = [...new Set(form.keys())];
  if (keys.some((key) => key !== "purpose" && key !== "file")) throw fieldError("file", "Unexpected form field.");

  const purpose = form.get("purpose");
  if (!isMediaPurpose(purpose)) throw fieldError("purpose", "Choose what the image is for.");
  requirePermission(ctx, permissionForPurpose(purpose));

  const file = form.get("file");
  if (!(file instanceof File)) throw fieldError("file", "Choose an image file.");

  const asset = await uploadImage(ctx, { purpose, bytes: new Uint8Array(await file.arrayBuffer()), originalName: file.name });
  return Response.json({ asset }, { status: 201, headers: { "x-request-id": ctx.requestId, "cache-control": "no-store" } });
});

function fieldError(field: string, message: string): ValidationError {
  return new ValidationError(message, { [field]: [message] });
}

/**
 * Reads at most `max` bytes of the body and parses it as multipart form data. Refuses early on a declared
 * Content-Length over the cap and stops reading a chunked body as soon as it passes the cap, so an oversized upload
 * is never buffered whole.
 */
async function readCappedForm(request: NextRequest, max: number): Promise<FormData> {
  const tooLarge = () => new ValidationError("The image is larger than 5 MB. Choose a smaller file.", { file: ["The image is larger than 5 MB."] }, "IMAGE_TOO_LARGE");
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data")) throw fieldError("file", "Send the image as a file upload.");
  const declared = Number(request.headers.get("content-length") ?? "NaN");
  if (Number.isFinite(declared) && declared > max) throw tooLarge();
  if (!request.body) throw fieldError("file", "Choose an image file.");

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel();
      throw tooLarge();
    }
    chunks.push(value);
  }
  try {
    return await new Response(new Blob(chunks as BlobPart[]), { headers: { "content-type": contentType } }).formData();
  } catch {
    throw fieldError("file", "The upload could not be read. Try again.");
  }
}
