"use server";

import { cookies } from "next/headers";
import { ACTIVE_MEMBERSHIP_COOKIE, ACTIVE_MEMBERSHIP_COOKIE_OPTIONS } from "@/lib/auth/active-membership-cookie";

/**
 * Clears the caller's own `rasoi_active_membership` preference cookie (S1-P03-T005, SC-SESS-03). Called by the sign-out
 * button before Clerk signs the user out, and by the sign-in page when a signed-out browser still carries the cookie
 * (e.g. after signing out from Clerk's own UI or a session that expired). It reads nothing, returns nothing and only
 * ever deletes a cookie on the requesting browser, so it needs no session (it runs after sign-out too).
 */
export async function clearActiveTenantCookieAction(): Promise<void> {
  const jar = await cookies();
  if (jar.has(ACTIVE_MEMBERSHIP_COOKIE)) {
    jar.delete({ name: ACTIVE_MEMBERSHIP_COOKIE, path: ACTIVE_MEMBERSHIP_COOKIE_OPTIONS.path });
  }
}
