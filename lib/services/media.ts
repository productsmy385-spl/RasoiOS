import "server-only";
import { randomUUID } from "node:crypto";
import type { TenantContext } from "@/lib/auth/context-types";
import { currentImageUrls, findReadyAssetsById, findReadyAssetsByUrl, insertMediaAsset, markAssetDeleted, unreferencedAssetsCreatedBefore, type ImageOwner, type MediaAssetDto } from "@/lib/data/media";
import { hasPermission } from "@/lib/auth/permissions";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { processUpload } from "@/lib/media/image-file";
import { ImageKitError, imageKit, imageKitUrlEndpoint, uploadsEnabled } from "@/lib/media/imagekit";
import { mediaFolder, permissionForPurpose, safeOriginalName, type MediaPurpose } from "@/lib/media/purposes";
import { imageKitHost } from "@/lib/validation/url";

/**
 * Image uploads (S1-P07-T009, RASOIOS-ADR-017; api.md RH-MEDIA-01/02).
 *
 * Order of operations, so no state is ever left half-done without a way back:
 *   upload: validate + re-encode → ImageKit (server-built folder and name) → row + audit; if the row fails, the file
 *           just stored is removed again.
 *   delete / release: row DELETED + audit first (only if nothing references it) → then the ImageKit file.
 * Permissions follow the image's purpose (lib/media/purposes.ts): the upload route checks it before the upload, and
 * `discardImage` checks it against the stored asset.
 */

/** Uploads kept unreferenced longer than this are treated as abandoned and cleaned up by later uploads. */
const ABANDONED_AFTER_MS = 24 * 60 * 60 * 1000;
const SWEEP_BATCH = 10;

export async function uploadImage(ctx: TenantContext, input: { purpose: MediaPurpose; bytes: Uint8Array; originalName: unknown }): Promise<MediaAssetDto> {
  if (!uploadsEnabled()) throw new ImageKitError("UPLOADS_DISABLED", "Image uploads are not set up yet. Paste an image link instead.");

  const image = await processUpload(input.bytes);
  const folder = mediaFolder(ctx.tenantId, input.purpose);
  const fileName = `${randomUUID()}.${image.extension}`;
  const client = imageKit();
  const stored = await client.upload({ bytes: image.bytes, fileName, folder, contentType: image.contentType });

  // Defence in depth: ImageKit must have put the file exactly where we asked, under this tenant's folder.
  const expectedPath = `${folder}/${fileName}`;
  const url = normalisedUrl(stored.url);
  if (stored.filePath !== expectedPath || url === null || !url.startsWith(`${imageKitUrlEndpoint()}/`)) {
    logger.error("media.unexpected_location", { requestId: ctx.requestId, tenantId: ctx.tenantId, fileId: stored.fileId });
    await removeQuietly(ctx, stored.fileId);
    throw new ImageKitError("UPLOAD_FAILED", "The image could not be uploaded. Try again.");
  }

  let asset: MediaAssetDto;
  try {
    asset = await insertMediaAsset(ctx, {
      purpose: input.purpose,
      providerFileId: stored.fileId,
      storagePath: stored.filePath,
      url,
      contentType: image.contentType,
      byteSize: image.bytes.length,
      width: image.width,
      height: image.height,
      sha256: image.sha256,
      originalFilename: safeOriginalName(input.originalName),
    });
  } catch (error) {
    await removeQuietly(ctx, stored.fileId);
    throw error;
  }
  logger.info("media.uploaded", { requestId: ctx.requestId, tenantId: ctx.tenantId, assetId: asset.id, purpose: asset.purpose, bytes: asset.byteSize });

  await sweepAbandoned(ctx);
  return asset;
}

/** RH-MEDIA-02 — discard an upload that is not (or no longer) used anywhere. 404 for unknown and other tenants' ids. */
export async function discardImage(ctx: TenantContext, assetId: string): Promise<{ id: string; deleted: true }> {
  const [asset] = await findReadyAssetsById(ctx, [assetId]);
  if (!asset) throw new NotFoundError("Image not found.");
  if (!hasPermission(ctx, permissionForPurpose(asset.purpose))) throw new ForbiddenError();
  const result = await markAssetDeleted(ctx, { id: assetId }, "discarded");
  if (result.outcome === "NOT_FOUND") throw new NotFoundError("Image not found.");
  if (result.outcome === "IN_USE") throw new ConflictError("This image is still in use. Remove it from the page or menu item first.", "IMAGE_IN_USE");
  await removeQuietly(ctx, result.providerFileId);
  return { id: assetId, deleted: true };
}

/**
 * SC-FILE-02 — every ImageKit URL a save is about to store must be a READY asset of the caller's tenant. The ImageKit
 * host is shared by all ImageKit accounts, so any URL on that host outside our endpoint is refused as well. Pasted URLs
 * on other allow-listed hosts are unaffected.
 */
export async function assertOwnedImageUrls(ctx: TenantContext, fields: Record<string, string | null | undefined>): Promise<void> {
  const endpoint = imageKitUrlEndpoint();
  const host = imageKitHost(endpoint) ?? "ik.imagekit.io";
  const candidates = Object.entries(fields).filter((entry): entry is [string, string] => typeof entry[1] === "string" && hostOf(entry[1]) === host);
  if (candidates.length === 0) return;

  const owned = new Set((await findReadyAssetsByUrl(ctx, candidates.map(([, url]) => url))).map((asset) => asset.url));
  const problems: Record<string, string[]> = {};
  for (const [field, url] of candidates) {
    if (!endpoint || !url.startsWith(`${endpoint}/`) || !owned.has(url)) problems[field] = ["This image isn't one of your restaurant's uploads. Upload it again."];
  }
  if (Object.keys(problems).length > 0) throw new ValidationError("Upload the image again — this link can't be used.", problems, "IMAGE_NOT_OWNED");
}

/** Read before a save: the ImageKit URLs it may replace (ADR-017 §5). */
export async function imageUrlsBeforeSave(ctx: TenantContext, owner: ImageOwner): Promise<string[]> {
  if (imageKitUrlEndpoint() === null) return [];
  return (await currentImageUrls(ctx, owner)).filter((url) => url.startsWith(`${imageKitUrlEndpoint()}/`));
}

/**
 * After a save has committed: releases each previously used ImageKit image that nothing references any more. Never
 * throws — the save already succeeded. A file ImageKit refuses to delete is logged and left as an unreferenced orphan
 * in ImageKit (its row is DELETED, so it is never served by the app).
 */
export async function releaseUnusedImages(ctx: TenantContext, previousUrls: readonly string[]): Promise<void> {
  for (const url of new Set(previousUrls)) {
    try {
      const result = await markAssetDeleted(ctx, { url }, "replaced");
      if (result.outcome === "DELETED") await removeQuietly(ctx, result.providerFileId);
    } catch (error) {
      logger.warn("media.release_failed", { requestId: ctx.requestId, tenantId: ctx.tenantId, error: error instanceof Error ? error.message : String(error) });
    }
  }
}

/** Deletes up to SWEEP_BATCH of this tenant's uploads that were never used and are older than a day. Best effort. */
async function sweepAbandoned(ctx: TenantContext): Promise<void> {
  try {
    const stale = await unreferencedAssetsCreatedBefore(ctx, new Date(Date.now() - ABANDONED_AFTER_MS), SWEEP_BATCH);
    for (const { id } of stale) {
      const result = await markAssetDeleted(ctx, { id }, "abandoned upload");
      if (result.outcome === "DELETED") await removeQuietly(ctx, result.providerFileId);
    }
  } catch (error) {
    logger.warn("media.sweep_failed", { requestId: ctx.requestId, tenantId: ctx.tenantId, error: error instanceof Error ? error.message : String(error) });
  }
}

async function removeQuietly(ctx: TenantContext, fileId: string): Promise<void> {
  try {
    await imageKit().remove(fileId);
  } catch {
    // Logged by the client; the row is already DELETED, so the file is only an orphan in ImageKit, never shown.
    logger.warn("media.file_not_removed", { requestId: ctx.requestId, tenantId: ctx.tenantId, fileId });
  }
}

function normalisedUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

function hostOf(raw: string): string | null {
  try {
    return new URL(raw).hostname;
  } catch {
    return null;
  }
}
