"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { requireSessionUser } from "@/lib/auth/guards";
import { findThemePreference, saveThemePreference } from "@/lib/data/users";
import { action } from "@/lib/http/action";
import { parseInput, strictObject } from "@/lib/validation/core";
import { DEFAULT_THEME_PREFERENCE, THEME_COOKIE, THEME_COOKIE_MAX_AGE, THEME_PREFERENCES, type ThemePreferenceValue } from "@/lib/ui/theme";

/**
 * Console theme preference (RASOIOS-ADR-016). Only the signed-in person's own USER row is read or written — the id
 * comes from the session, never from input — so there is nothing tenant-scoped here. The cookie mirrors the choice
 * for the pre-paint boot script; it is not a credential (readable by script on purpose, SameSite=Lax).
 */
const themeSchema = strictObject({ preference: z.enum(THEME_PREFERENCES) });

async function writeThemeCookie(preference: ThemePreferenceValue): Promise<void> {
  (await cookies()).set(THEME_COOKIE, preference, {
    path: "/",
    maxAge: THEME_COOKIE_MAX_AGE,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    httpOnly: false,
  });
}

export const setThemePreferenceAction = action(async (input: { preference: ThemePreferenceValue }) => {
  const session = await requireSessionUser();
  const { preference } = parseInput(themeSchema, input);
  await saveThemePreference(session.userId, preference);
  await writeThemeCookie(preference);
  return { preference };
});

/** Used when a browser has no theme cookie yet (a new device): returns the saved choice and restores the cookie. */
export const getThemePreferenceAction = action(async () => {
  const session = await requireSessionUser();
  const preference = (await findThemePreference(session.userId)) ?? DEFAULT_THEME_PREFERENCE;
  await writeThemeCookie(preference);
  return { preference };
});
