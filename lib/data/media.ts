import "server-only";
import type { MediaPurpose } from "@prisma/client";
import type { TenantContext } from "@/lib/auth/context-types";
import { audit } from "@/lib/audit/write";
import { db } from "@/lib/db/prisma";
import { instantDto } from "./dto";
import { mapErrors } from "./errors";
import { tenantKey, tenantScope } from "./scope";
import { withTx, type Tx } from "./tx";

/**
 * Media asset data (E28, RASOIOS-ADR-017; api.md RH-MEDIA-01/02).
 *
 * Every read and write is addressed by `tenant_id = ctx.tenantId`; an asset id or URL from input is only ever looked up
 * inside the caller's tenant, so another tenant's asset behaves exactly like one that does not exist (SC-FILE-02).
 * Rows are written only after ImageKit has stored the file. Each insert and each deletion commits with its audit row.
 */

const RESOURCE = "media_asset";

const ASSET_SELECT = {
  id: true,
  purpose: true,
  url: true,
  width: true,
  height: true,
  contentType: true,
  byteSize: true,
  originalFilename: true,
  providerFileId: true,
  createdAt: true,
} as const;

export type MediaAssetDto = {
  id: string;
  purpose: MediaPurpose;
  url: string;
  width: number;
  height: number;
  contentType: string;
  byteSize: number;
  originalFilename: string | null;
  createdAt: string;
};

type AssetRow = { id: string; purpose: MediaPurpose; url: string; width: number; height: number; contentType: string; byteSize: number; originalFilename: string | null; providerFileId: string; createdAt: Date };

function toDto(row: AssetRow): MediaAssetDto {
  return {
    id: row.id,
    purpose: row.purpose,
    url: row.url,
    width: row.width,
    height: row.height,
    contentType: row.contentType,
    byteSize: row.byteSize,
    originalFilename: row.originalFilename,
    createdAt: instantDto(row.createdAt),
  };
}

export type NewMediaAsset = {
  purpose: MediaPurpose;
  providerFileId: string;
  storagePath: string;
  url: string;
  contentType: string;
  byteSize: number;
  width: number;
  height: number;
  sha256: string;
  originalFilename: string | null;
};

/** `media.uploaded` — the uploader is always the signed-in user, never an input field. */
export async function insertMediaAsset(ctx: TenantContext, input: NewMediaAsset): Promise<MediaAssetDto> {
  return withTx(ctx, async (tx) => {
    const row = await tx.mediaAsset.create({
      data: { ...input, tenantId: ctx.tenantId, uploadedByUserId: ctx.userId },
      select: ASSET_SELECT,
    });
    await audit(tx, ctx, {
      action: "media.uploaded",
      resourceType: RESOURCE,
      resourceId: row.id,
      after: { purpose: row.purpose, url: row.url, contentType: row.contentType, byteSize: row.byteSize, width: row.width, height: row.height },
    });
    return toDto(row);
  });
}

/** READY assets of this tenant whose untransformed URL is one of `urls`. */
export async function findReadyAssetsByUrl(ctx: TenantContext, urls: readonly string[]): Promise<Array<{ id: string; url: string; purpose: MediaPurpose }>> {
  if (urls.length === 0) return [];
  return mapErrors("Image", () =>
    db.mediaAsset.findMany({ where: tenantScope(ctx, { url: { in: [...new Set(urls)] }, status: "READY" as const }), select: { id: true, url: true, purpose: true } }),
  );
}

/** READY assets of this tenant with one of these ids (anything else — unknown or another tenant's — is simply absent). */
export async function findReadyAssetsById(ctx: TenantContext, ids: readonly string[]): Promise<Array<{ id: string; url: string; purpose: MediaPurpose }>> {
  if (ids.length === 0) return [];
  return mapErrors("Image", () =>
    db.mediaAsset.findMany({ where: tenantScope(ctx, { id: { in: [...new Set(ids)] }, status: "READY" as const }), select: { id: true, url: true, purpose: true } }),
  );
}

/** Whether any image column of this tenant still points at `url` — archived menu items included, so restoring one never shows a broken image. */
async function isReferenced(tx: Tx, ctx: TenantContext, url: string): Promise<boolean> {
  const [restaurant, section, item] = await Promise.all([
    tx.restaurant.findFirst({
      where: tenantScope(ctx, { OR: [{ logoUrl: url }, { coverImageUrl: url }, { heroImageUrl: url }, { faviconUrl: url }] }),
      select: { id: true },
    }),
    tx.websiteSection.findFirst({ where: tenantScope(ctx, { imageUrl: url }), select: { id: true } }),
    tx.menuItem.findFirst({ where: tenantScope(ctx, { imageUrl: url }), select: { id: true } }),
  ]);
  return restaurant !== null || section !== null || item !== null;
}

export type DeleteOutcome =
  | { outcome: "DELETED"; providerFileId: string }
  | { outcome: "IN_USE" }
  | { outcome: "NOT_FOUND" };

/**
 * `media.deleted` — marks one of this tenant's READY assets DELETED, but only when nothing references it. The row is
 * locked first so a concurrent save cannot start referencing it between the check and the update. The caller removes
 * the file from ImageKit after this commits (ADR-017 §5: the database moves first, the CDN file goes last).
 */
export async function markAssetDeleted(ctx: TenantContext, where: { id: string } | { url: string }, reason: string): Promise<DeleteOutcome> {
  return withTx(ctx, async (tx) => {
    const locked =
      "id" in where
        ? await tx.$queryRaw<Array<{ id: string; url: string; provider_file_id: string }>>`
            SELECT id, url, provider_file_id FROM media_assets
            WHERE tenant_id = ${ctx.tenantId}::uuid AND id = ${where.id}::uuid AND status = 'READY'
            FOR UPDATE`
        : await tx.$queryRaw<Array<{ id: string; url: string; provider_file_id: string }>>`
            SELECT id, url, provider_file_id FROM media_assets
            WHERE tenant_id = ${ctx.tenantId}::uuid AND url = ${where.url} AND status = 'READY'
            FOR UPDATE`;
    const asset = locked[0];
    if (!asset) return { outcome: "NOT_FOUND" };
    if (await isReferenced(tx, ctx, asset.url)) return { outcome: "IN_USE" };

    await tx.mediaAsset.update({ where: tenantKey(ctx, asset.id), data: { status: "DELETED", deletedAt: new Date() } });
    await audit(tx, ctx, { action: "media.deleted", resourceType: RESOURCE, resourceId: asset.id, before: { status: "READY", url: asset.url }, after: { status: "DELETED" }, reason });
    return { outcome: "DELETED", providerFileId: asset.provider_file_id };
  });
}

/**
 * Up to `limit` of this tenant's READY assets created before `before` that no image column references — candidates for
 * the abandoned-upload sweep. `markAssetDeleted` re-checks under a row lock, so a race only means a skipped candidate.
 */
export async function unreferencedAssetsCreatedBefore(ctx: TenantContext, before: Date, limit: number): Promise<Array<{ id: string }>> {
  return mapErrors("Image", () =>
    db.$queryRaw<Array<{ id: string }>>`
      SELECT m.id FROM media_assets m
      WHERE m.tenant_id = ${ctx.tenantId}::uuid AND m.status = 'READY' AND m.created_at < ${before}
        AND NOT EXISTS (SELECT 1 FROM restaurants r WHERE r.tenant_id = m.tenant_id
                          AND m.url IN (r.logo_url, r.cover_image_url, r.hero_image_url, r.favicon_url))
        AND NOT EXISTS (SELECT 1 FROM website_sections s WHERE s.tenant_id = m.tenant_id AND s.image_url = m.url)
        AND NOT EXISTS (SELECT 1 FROM menu_items i WHERE i.tenant_id = m.tenant_id AND i.image_url = m.url)
      ORDER BY m.created_at
      LIMIT ${limit}`,
  );
}

/** Image URLs a save is about to overwrite, read before the save so the replaced files can be released after it. */
export type ImageOwner = { kind: "restaurant" } | { kind: "sections" } | { kind: "menu_item"; itemId: string };

export async function currentImageUrls(ctx: TenantContext, owner: ImageOwner): Promise<string[]> {
  return mapErrors("Image", async () => {
    if (owner.kind === "restaurant") {
      const row = await db.restaurant.findFirst({ where: tenantScope(ctx), select: { logoUrl: true, coverImageUrl: true, heroImageUrl: true, faviconUrl: true } });
      return row ? [row.logoUrl, row.coverImageUrl, row.heroImageUrl, row.faviconUrl].filter((url): url is string => url !== null) : [];
    }
    if (owner.kind === "sections") {
      const rows = await db.websiteSection.findMany({ where: tenantScope(ctx, { imageUrl: { not: null } }), select: { imageUrl: true } });
      return rows.map((row) => row.imageUrl).filter((url): url is string => url !== null);
    }
    const item = await db.menuItem.findFirst({ where: tenantScope(ctx, { id: owner.itemId }), select: { imageUrl: true } });
    return item?.imageUrl ? [item.imageUrl] : [];
  });
}
