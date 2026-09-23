"use server";

import { requireTenant } from "@/lib/auth/guards";
import { action } from "@/lib/http/action";
import { copyDailyMenu, deleteDraft, getCalendar, getEditor, publish, saveDraft, unpublish } from "@/lib/services/daily-menu";
import { parseInput } from "@/lib/validation/core";
import {
  copyDailyMenuSchema,
  dailyMenuCalendarQuerySchema,
  dailyMenuEditorQuerySchema,
  dailyMenuRefSchema,
  saveDailyMenuDraftSchema,
  type CopyDailyMenuInput,
  type DailyMenuCalendarQueryInput,
  type DailyMenuEditorQueryInput,
  type DailyMenuRefInput,
  type SaveDailyMenuDraftInput,
} from "@/lib/validation/menu";

/**
 * Daily menu actions (S1-P11-T001/T002; api.md LD-DMENU-01/02, SA-DMENU-01…05).
 *
 * The permission is checked before anything is read (security.md §3.3 rows 21–22) and the tenant comes only from the
 * context, so a business date both restaurants use still resolves to the caller's own menu (TI-011). Dates are
 * `YYYY-MM-DD` business dates in the restaurant's timezone — the server decides what "today" means, never the client.
 */

/** LD-DMENU-01 — `daily_menu:read` (every tenant role); no date means today in the restaurant timezone. */
export const getDailyMenuAction = action(async (input?: DailyMenuEditorQueryInput) => {
  const ctx = await requireTenant("daily_menu:read");
  const query = parseInput(dailyMenuEditorQuerySchema, input ?? {});
  return getEditor(ctx, query);
});

/** LD-DMENU-02 — `daily_menu:read`: statuses and item counts for an inclusive range of at most 62 days. */
export const getDailyMenuCalendarAction = action(async (input: DailyMenuCalendarQueryInput) => {
  const ctx = await requireTenant("daily_menu:read");
  const range = parseInput(dailyMenuCalendarQuerySchema, input);
  return getCalendar(ctx, range);
});

/** SA-DMENU-01 — `daily_menu:manage`: upsert by (tenant, business date); a foreign or archived item id is 404. */
export const saveDailyMenuDraftAction = action(async (input: SaveDailyMenuDraftInput) => {
  const ctx = await requireTenant("daily_menu:manage");
  const data = parseInput(saveDailyMenuDraftSchema, input);
  return saveDraft(ctx, data);
});

/** SA-DMENU-02 — `daily_menu:manage`: 422 DAILY_MENU_EMPTY / ITEM_NOT_PUBLISHED; foreign id 404 (TI-013). */
export const publishDailyMenuAction = action(async (input: DailyMenuRefInput) => {
  const ctx = await requireTenant("daily_menu:manage");
  const { dailyMenuId } = parseInput(dailyMenuRefSchema, input);
  return publish(ctx, dailyMenuId);
});

/** SA-DMENU-03 — `daily_menu:manage`: 409 NOT_PUBLISHED when the menu is not published. */
export const unpublishDailyMenuAction = action(async (input: DailyMenuRefInput) => {
  const ctx = await requireTenant("daily_menu:manage");
  const { dailyMenuId } = parseInput(dailyMenuRefSchema, input);
  return unpublish(ctx, dailyMenuId);
});

/** SA-DMENU-04 — `daily_menu:manage`: copies a date's items forward, reporting the ones it had to skip. */
export const copyDailyMenuAction = action(async (input: CopyDailyMenuInput) => {
  const ctx = await requireTenant("daily_menu:manage");
  const data = parseInput(copyDailyMenuSchema, input);
  return copyDailyMenu(ctx, data);
});

/** SA-DMENU-05 — `daily_menu:manage`: 409 NOT_DRAFT for a published or unpublished menu. */
export const deleteDraftDailyMenuAction = action(async (input: DailyMenuRefInput) => {
  const ctx = await requireTenant("daily_menu:manage");
  const { dailyMenuId } = parseInput(dailyMenuRefSchema, input);
  return deleteDraft(ctx, dailyMenuId);
});
