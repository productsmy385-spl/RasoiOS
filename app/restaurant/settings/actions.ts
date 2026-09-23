"use server";

import { requireTenant } from "@/lib/auth/guards";
import { action } from "@/lib/http/action";
import { getRestaurantSettings, replaceHours, updateOperations, updateProfile } from "@/lib/services/restaurant-settings";
import { parseInput } from "@/lib/validation/core";
import {
  replaceOpeningHoursSchema,
  updateOperationalSettingsSchema,
  updateRestaurantProfileSchema,
  type ReplaceOpeningHoursInput,
  type UpdateOperationalSettingsInput,
  type UpdateRestaurantProfileInput,
} from "@/lib/validation/settings";

/**
 * Restaurant settings (S1-P07-T001; api.md LD-RST-01, SA-RST-01, SA-RST-03, SA-RST-04). The restaurant is always the
 * one of the session's tenant: the permission is checked first (security.md §3.3 rows 9–11), then the strict schema
 * rejects any `tenantId` or unknown key (TI-015…TI-017). Branding and the public website are in `website-actions.ts`,
 * kitchen sections in `sections-actions.ts`.
 */

/** LD-RST-01 — `restaurant:read` (every tenant role): profile, hours, kitchen sections, website state, edit flags. */
export const getRestaurantSettingsAction = action(async () => {
  const ctx = await requireTenant("restaurant:read");
  return getRestaurantSettings(ctx);
});

/** SA-RST-01 — `restaurant:update`: name, description, contact, address (`restaurant.profile_updated`). */
export const updateRestaurantProfileAction = action(async (input: UpdateRestaurantProfileInput) => {
  const ctx = await requireTenant("restaurant:update");
  const data = parseInput(updateRestaurantProfileSchema, input);
  return updateProfile(ctx, data);
});

/** SA-RST-03 — `restaurant:update`: replaces the weekly opening hours (split shifts, overnight closing). */
export const replaceOpeningHoursAction = action(async (input: ReplaceOpeningHoursInput) => {
  const ctx = await requireTenant("restaurant:update");
  const data = parseInput(replaceOpeningHoursSchema, input);
  return replaceHours(ctx, data);
});

/** SA-RST-04 — `restaurant:settings:update`: time zone, currency (409 CURRENCY_LOCKED), country, order defaults, GSTIN. */
export const updateOperationalSettingsAction = action(async (input: UpdateOperationalSettingsInput) => {
  const ctx = await requireTenant("restaurant:settings:update");
  const data = parseInput(updateOperationalSettingsSchema, input);
  return updateOperations(ctx, data);
});
