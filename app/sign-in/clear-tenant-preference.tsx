"use client";

import { useEffect } from "react";
import { clearActiveTenantCookieAction } from "./actions";

/**
 * Rendered by /sign-in only when a signed-out browser still has the active-restaurant cookie — e.g. after signing out
 * from Clerk's own UI or when the session expired (SC-SESS-03). Clears it once on arrival; renders nothing.
 */
export function ClearTenantPreference() {
  useEffect(() => {
    clearActiveTenantCookieAction().catch(() => {
      // Harmless if it fails: the cookie is only a preference and is re-validated on every request (SC-SESS-02).
    });
  }, []);
  return null;
}
