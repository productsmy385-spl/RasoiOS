import type { ReactNode } from "react";
import { requireTenantPage } from "@/lib/auth/guards";

/**
 * Route guard for `/restaurant/menu` (S1-P04-T007). The page below is a baseline client component (rebuilt in
 * S1-P10-T006), so the server-side check lives here: `menu:read` (security.md §3.3 row 18) is resolved from the
 * signed-in membership before anything renders; signed-out, suspended or forbidden callers are redirected.
 */
export default async function MenuLayout({ children }: { children: ReactNode }) {
  await requireTenantPage("menu:read");
  return children;
}
