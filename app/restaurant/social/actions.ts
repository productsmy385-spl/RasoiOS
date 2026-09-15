"use server";

import { z } from "zod";
import { SocialPostStatus } from "@prisma/client";
import { getAuthenticatedSession } from "@/lib/auth/clerk";
import { resolveTenantContext, requirePermission } from "@/lib/auth/tenant-context";
import {
  createSocialPost,
  updateSocialPostStatus,
  getTenantSocialPosts,
  CreateSocialPostPayload,
} from "@/lib/services/social";
import { ValidationError } from "@/lib/errors";

const CreateSocialPostSchema = z.object({
  content: z.string().min(1, "Post content is required"),
  imageUrl: z.string().url().optional().or(z.literal("")),
  scheduledAt: z.string().optional(),
});

export async function createSocialPostAction(
  input: z.input<typeof CreateSocialPostSchema>,
  requestedTenantId?: string
) {
  const session = await getAuthenticatedSession();
  const context = resolveTenantContext(session, requestedTenantId);
  requirePermission(context, "tenant:manage_own");

  const parsed = CreateSocialPostSchema.safeParse(input);
  if (!parsed.success) {
    throw new ValidationError(
      "Invalid social post payload",
      parsed.error.flatten().fieldErrors
    );
  }

  const post = await createSocialPost(context.tenantId, parsed.data as CreateSocialPostPayload);
  return { success: true, post };
}

export async function updateSocialPostStatusAction(
  postId: string,
  status: SocialPostStatus,
  requestedTenantId?: string
) {
  const session = await getAuthenticatedSession();
  const context = resolveTenantContext(session, requestedTenantId);
  requirePermission(context, "tenant:manage_own");

  const updated = await updateSocialPostStatus(context.tenantId, postId, status);
  return { success: true, post: updated };
}

export async function getSocialPostsAction(
  filters?: { status?: SocialPostStatus },
  requestedTenantId?: string
) {
  const session = await getAuthenticatedSession();
  const context = resolveTenantContext(session, requestedTenantId);

  const posts = await getTenantSocialPosts(context.tenantId, filters);
  return { success: true, posts };
}
