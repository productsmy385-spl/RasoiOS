import { prisma } from "@/lib/db/prisma";
import { SocialPostStatus, Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";

export interface CreateSocialPostPayload {
  content: string;
  platform?: string;
  imageUrl?: string;
  scheduledAt?: Date | string;
}

export interface SocialPostFilters {
  status?: SocialPostStatus;
  limit?: number;
}

/**
 * Creates a new social marketing post for tenant promotion.
 */
export async function createSocialPost(
  tenantId: string,
  payload: CreateSocialPostPayload
) {
  if (!payload.content || !payload.content.trim()) {
    throw new Error("Post content cannot be empty");
  }

  const scheduledDate = payload.scheduledAt
    ? new Date(payload.scheduledAt)
    : null;
  const initialStatus = scheduledDate
    ? SocialPostStatus.SCHEDULED
    : SocialPostStatus.DRAFT;

  const post = await prisma.socialPost.create({
    data: {
      tenantId,
      platform: payload.platform || "ALL",
      content: payload.content.trim(),
      mediaUrl: payload.imageUrl?.trim() || null,
      status: initialStatus,
      scheduledAt: scheduledDate,
    },
  });

  logger.info("SOCIAL_POST_CREATED", {
    tenantId,
    postId: post.id,
    status: post.status,
  });

  return post;
}

/**
 * Updates social post status.
 */
export async function updateSocialPostStatus(
  tenantId: string,
  postId: string,
  status: SocialPostStatus
) {
  const existing = await prisma.socialPost.findFirst({
    where: { id: postId, tenantId },
  });

  if (!existing) {
    throw new Error("Social post not found or cross-tenant access mismatch");
  }

  const updated = await prisma.socialPost.update({
    where: { id: postId },
    data: {
      status,
    },
  });

  logger.info("SOCIAL_POST_STATUS_UPDATED", {
    tenantId,
    postId,
    status,
  });

  return updated;
}

/**
 * Retrieves social posts for tenant.
 */
export async function getTenantSocialPosts(
  tenantId: string,
  filters?: SocialPostFilters
) {
  const whereClause: Prisma.SocialPostWhereInput = {
    tenantId,
  };

  if (filters?.status) {
    whereClause.status = filters.status;
  }

  return prisma.socialPost.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    take: filters?.limit || 50,
  });
}
