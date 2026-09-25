import "server-only";
import { SocialCardType, SocialChannel, SocialPostStatus, type Prisma } from "@prisma/client";
import type { TenantContext } from "@/lib/auth/context-types";
import type { AuditAction } from "@/lib/audit/actions";
import { audit } from "@/lib/audit/write";
import { instantDto, nullableInstantDto, withTx } from "@/lib/data";
import { prisma } from "@/lib/db/prisma";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { now } from "@/lib/time";
import { appUrl } from "@/lib/env";

/**
 * Social sharing services (S1-P04-T007 interim retrofit of LD-SOC-01, SA-SOC-01…05; rebuilt in S1-P20).
 *
 * There is no social-network integration (BR-SOC-03): the product never publishes anything. A post is a caption plus a
 * server-built link to the restaurant's public menu; staff share it from their own accounts and may then *attest*
 * that they posted it (MARKED_POSTED, with their user id as attester).
 */

export type SocialPostDto = {
  id: string;
  channel: SocialChannel;
  cardType: SocialCardType;
  caption: string;
  shareUrl: string;
  status: SocialPostStatus;
  postedUrl: string | null;
  markedPostedAt: string | null;
  createdAt: string;
};

const POST_SELECT = {
  id: true,
  channel: true,
  cardType: true,
  caption: true,
  shareUrl: true,
  status: true,
  postedUrl: true,
  markedPostedAt: true,
  createdAt: true,
} satisfies Prisma.SocialPostSelect;

function toDto(row: Prisma.SocialPostGetPayload<{ select: typeof POST_SELECT }>): SocialPostDto {
  return { ...row, markedPostedAt: nullableInstantDto(row.markedPostedAt), createdAt: instantDto(row.createdAt) };
}

/** Allowed status changes and the audit action each one writes (BR-SOC-02: only staff attest "posted"). */
const SOCIAL_TRANSITIONS: Readonly<Record<SocialPostStatus, Partial<Record<SocialPostStatus, AuditAction>>>> = {
  DRAFT: { READY: "social_post.marked_ready", ARCHIVED: "social_post.archived" },
  READY: { DRAFT: "social_post.updated", MARKED_POSTED: "social_post.marked_posted", ARCHIVED: "social_post.archived" },
  MARKED_POSTED: { ARCHIVED: "social_post.archived" },
  ARCHIVED: {},
};

/**
 * Public menu link for a tenant slug, built only on the server from NEXT_PUBLIC_APP_URL (validated at boot by
 * lib/env.ts) — never from client input (TC-SOC-001).
 */
export function publicMenuUrl(slug: string): string {
  const base = appUrl();
  if (!base || !/^https?:\/\/[^\s]+$/.test(base)) {
    // Server misconfiguration, not a user error: surfaces as INTERNAL with a request id.
    throw new Error("NEXT_PUBLIC_APP_URL is not configured");
  }
  return `${base.replace(/\/+$/, "")}/r/${encodeURIComponent(slug)}`;
}

/** Posts of the caller's tenant, newest first (LD-SOC-01). */
export async function listSocialPosts(ctx: TenantContext, filters: { status?: SocialPostStatus } = {}, limit = 50): Promise<SocialPostDto[]> {
  const rows = await prisma.socialPost.findMany({
    where: { tenantId: ctx.tenantId, ...(filters.status ? { status: filters.status } : {}) },
    select: POST_SELECT,
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    take: Math.min(Math.max(1, limit), 100),
  });
  return rows.map(toDto);
}

/** SA-SOC-01 — a DRAFT with a server-built share URL for the tenant's public menu. Audited in the same transaction. */
export async function createSocialPost(ctx: TenantContext, input: { caption: string; channel: SocialChannel }): Promise<SocialPostDto> {
  const post = await withTx(ctx, async (tx) => {
    const tenant = await tx.tenant.findUnique({ where: { id: ctx.tenantId }, select: { slug: true } });
    if (!tenant) throw new NotFoundError("Restaurant not found");

    const created = await tx.socialPost.create({
      data: {
        tenantId: ctx.tenantId,
        channel: input.channel,
        cardType: SocialCardType.FULL_MENU,
        caption: input.caption,
        shareUrl: publicMenuUrl(tenant.slug),
        status: SocialPostStatus.DRAFT,
        createdByUserId: ctx.userId,
      },
      select: POST_SELECT,
    });
    await audit(tx, ctx, {
      action: "social_post.created",
      resourceType: "social_post",
      resourceId: created.id,
      after: { status: created.status, channel: created.channel, cardType: created.cardType, shareUrl: created.shareUrl },
    });
    return created;
  });

  logger.info("social_post.created", { requestId: ctx.requestId, tenantId: ctx.tenantId, postId: post.id });
  return toDto(post);
}

/**
 * SA-SOC-02…05 — moves a post of the caller's tenant through DRAFT → READY → MARKED_POSTED, back to DRAFT, or to
 * ARCHIVED. Another tenant's post and an unknown id are the same 404; a disallowed change is 409 INVALID_TRANSITION.
 */
export async function updateSocialPostStatus(
  ctx: TenantContext,
  input: { postId: string; status: SocialPostStatus; postedUrl?: string },
): Promise<SocialPostDto> {
  // Input-only rule, checked before any row is read so it cannot reveal whether the post exists.
  if (input.postedUrl !== undefined && input.status !== SocialPostStatus.MARKED_POSTED) {
    throw new ValidationError("Check the highlighted fields.", { postedUrl: ["A link can only be added when marking a post as posted."] });
  }

  const post = await withTx(ctx, async (tx) => {
    const existing = await tx.socialPost.findUnique({
      where: { tenantId_id: { tenantId: ctx.tenantId, id: input.postId } },
      select: { status: true },
    });
    if (!existing) throw new NotFoundError("Social post not found");

    const auditAction = SOCIAL_TRANSITIONS[existing.status][input.status];
    if (!auditAction) {
      throw new ConflictError(`A ${existing.status} post cannot be moved to ${input.status}.`, "INVALID_TRANSITION");
    }

    const attest =
      input.status === SocialPostStatus.MARKED_POSTED
        ? { markedPostedAt: now(), markedPostedByUserId: ctx.userId, postedUrl: input.postedUrl ?? null }
        : {};
    const { count } = await tx.socialPost.updateMany({
      where: { id: input.postId, tenantId: ctx.tenantId, status: existing.status },
      data: { status: input.status, ...attest },
    });
    if (count === 0) throw new ConflictError("This post was changed by someone else. Reload and try again.");

    const updated = await tx.socialPost.findUniqueOrThrow({
      where: { tenantId_id: { tenantId: ctx.tenantId, id: input.postId } },
      select: POST_SELECT,
    });
    await audit(tx, ctx, {
      action: auditAction,
      resourceType: "social_post",
      resourceId: updated.id,
      before: { status: existing.status },
      after: { status: updated.status, ...(input.postedUrl ? { postedUrl: updated.postedUrl } : {}) },
    });
    return updated;
  });

  logger.info("social_post.status_changed", { requestId: ctx.requestId, tenantId: ctx.tenantId, postId: post.id, status: post.status });
  return toDto(post);
}
