/**
 * Social sharing inputs (S1-P04-T007 interim retrofit of LD-SOC-01, SA-SOC-01…05; rebuilt in S1-P20).
 * `shareUrl`, `tenantId` and attester fields are never accepted from the client: the server builds the share URL from
 * the tenant slug and records the signed-in user as the attester (BR-SOC-02/03 — no automated publishing exists).
 */
import { SocialChannel, SocialPostStatus } from "@prisma/client";
import { z } from "zod";
import { boundedText, strictObject, uuidParam } from "./core";

/** A link the staff member pasted after posting it themselves (E25 `posted_url`, https only). */
export const postedUrlField = z
  .string()
  .trim()
  .max(2048, "Link must be at most 2048 characters")
  .url("Enter a valid link")
  .refine((value) => value.startsWith("https://"), "Use an https:// link");

export const socialPostFiltersSchema = strictObject({
  status: z.nativeEnum(SocialPostStatus).optional(),
});
export type SocialPostFiltersInput = z.input<typeof socialPostFiltersSchema>;

export const createSocialPostSchema = strictObject({
  caption: boundedText(2200, { label: "Caption" }),
  channel: z.nativeEnum(SocialChannel).default(SocialChannel.OTHER),
});
export type CreateSocialPostInput = z.input<typeof createSocialPostSchema>;

/** DRAFT → READY → MARKED_POSTED (staff attestation) or → ARCHIVED; READY → DRAFT to edit again. */
export const updateSocialPostStatusSchema = strictObject({
  postId: uuidParam,
  status: z.nativeEnum(SocialPostStatus),
  postedUrl: postedUrlField.optional(),
});
export type UpdateSocialPostStatusInput = z.input<typeof updateSocialPostStatusSchema>;
