"use server";

import { requireTenant } from "@/lib/auth/guards";
import { action } from "@/lib/http/action";
import { publishWebsite, updateBranding, updateWebsite } from "@/lib/services/restaurant-settings";
import { parseInput } from "@/lib/validation/core";
import {
  setWebsitePublishedSchema,
  updateBrandingSchema,
  updateWebsiteSettingsSchema,
  type SetWebsitePublishedInput,
  type UpdateBrandingInput,
  type UpdateWebsiteSettingsInput,
} from "@/lib/validation/settings";

/**
 * Branding and public website (S1-P07-T001; api.md SA-RST-02, SA-RST-05, SA-RST-06). All three need `website:update`
 * (security.md §3.3 row 12), checked before input is read. Each change revalidates `/r/{slug}`.
 */

/** SA-RST-02 — logo/cover URLs on the ALLOWED_IMAGE_HOSTS allowlist, accent ≥4.5:1 on the canvas (`restaurant.branding_updated`). */
export const updateBrandingAction = action(async (input: UpdateBrandingInput) => {
  const ctx = await requireTenant("website:update");
  const data = parseInput(updateBrandingSchema, input);
  return updateBranding(ctx, data);
});

/** SA-RST-05 — contact visibility on the public site and SEO title/description (`restaurant.website_updated`). */
export const updateWebsiteSettingsAction = action(async (input: UpdateWebsiteSettingsInput) => {
  const ctx = await requireTenant("website:update");
  const data = parseInput(updateWebsiteSettingsSchema, input);
  return updateWebsite(ctx, data);
});

/** SA-RST-06 — publish (422 WEBSITE_NOT_READY with the missing prerequisites) or unpublish the public website. */
export const setWebsitePublishedAction = action(async (input: SetWebsitePublishedInput) => {
  const ctx = await requireTenant("website:update");
  const { published } = parseInput(setWebsitePublishedSchema, input);
  return publishWebsite(ctx, published);
});
