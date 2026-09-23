"use server";

import { requireTenant } from "@/lib/auth/guards";
import { action } from "@/lib/http/action";
import { getWebsiteSettings, saveSections, updateIdentity, updateTheme } from "@/lib/services/website-theme";
import { parseInput } from "@/lib/validation/core";
import {
  saveWebsiteSectionsSchema,
  updateWebsiteIdentitySchema,
  updateWebsiteThemeSchema,
  type SaveWebsiteSectionsInput,
  type UpdateWebsiteIdentityInput,
  type UpdateWebsiteThemeInput,
} from "@/lib/validation/website";

/**
 * Public-website customisation (S1-P07-T010; api.md SA-WEB-01…03; RASOIOS-ADR-013 §6/§7).
 *
 * Order in every action: the tenant guard first (security.md §3.3), then the strict schema — which rejects
 * `tenantId` and any other unknown key — then the service. The restaurant is always the session's own tenant; a
 * request can never name another one (SC-TEN-01/02). Contrast failures come back as 422 field errors naming the
 * measured ratio, and nothing is written.
 */

/** LD-WEB-01 — `restaurant:read`: theme, identity, all eleven sections, preset palettes and the caller's edit flag. */
export const getWebsiteSettingsAction = action(async () => {
  const ctx = await requireTenant("restaurant:read");
  return getWebsiteSettings(ctx);
});

/** SA-WEB-01 — `website:update`: `{ preset, surfaceMode, primaryHex?, secondaryHex?, accentHex?, gradientFromHex?, gradientToHex? }`. */
export const updateWebsiteThemeAction = action(async (input: UpdateWebsiteThemeInput) => {
  const ctx = await requireTenant("website:update");
  const data = parseInput(updateWebsiteThemeSchema, input);
  return updateTheme(ctx, data);
});

/** SA-WEB-02 — `website:update`: `{ tagline?, heroImageUrl?, faviconUrl?, instagramUrl?, facebookUrl?, whatsappE164?, mapsUrl? }`. */
export const updateWebsiteIdentityAction = action(async (input: UpdateWebsiteIdentityInput) => {
  const ctx = await requireTenant("website:update");
  const data = parseInput(updateWebsiteIdentitySchema, input);
  return updateIdentity(ctx, data);
});

/** SA-WEB-03 — `website:update`: `{ sections: [{ key, enabled, sortOrder, headline?, body?, imageUrl?, ctaLabel?, ctaHref? }] }`. */
export const saveWebsiteSectionsAction = action(async (input: SaveWebsiteSectionsInput) => {
  const ctx = await requireTenant("website:update");
  const data = parseInput(saveWebsiteSectionsSchema, input);
  return saveSections(ctx, data);
});
