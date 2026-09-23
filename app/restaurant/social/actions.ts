"use server";

import { requireTenant } from "@/lib/auth/guards";
import { action } from "@/lib/http/action";
import { createSocialPost, listSocialPosts, updateSocialPostStatus } from "@/lib/services/social";
import { parseInput } from "@/lib/validation/core";
import {
  createSocialPostSchema,
  socialPostFiltersSchema,
  updateSocialPostStatusSchema,
  type CreateSocialPostInput,
  type SocialPostFiltersInput,
  type UpdateSocialPostStatusInput,
} from "@/lib/validation/social";

// Social sharing (S1-P04-T007 interim; rebuilt in S1-P20). Every action requires `social:manage` (security.md §3.3 row 49).

/** LD-SOC-01 posts of the caller's restaurant. */
export const getSocialPostsAction = action(async (input: SocialPostFiltersInput = {}) => {
  const ctx = await requireTenant("social:manage");
  const filters = parseInput(socialPostFiltersSchema, input);
  return listSocialPosts(ctx, filters);
});

/** SA-SOC-01 create a DRAFT; the share URL is built on the server. */
export const createSocialPostAction = action(async (input: CreateSocialPostInput) => {
  const ctx = await requireTenant("social:manage");
  const data = parseInput(createSocialPostSchema, input);
  return createSocialPost(ctx, data);
});

/** SA-SOC-02…05 status changes (ready, back to draft, marked as posted by the signed-in user, archived). */
export const updateSocialPostStatusAction = action(async (input: UpdateSocialPostStatusInput) => {
  const ctx = await requireTenant("social:manage");
  const data = parseInput(updateSocialPostStatusSchema, input);
  return updateSocialPostStatus(ctx, data);
});
