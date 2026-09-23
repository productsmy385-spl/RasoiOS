import { AdminShell } from "@/components/layout/admin-shell";
import { requirePlatformPage } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

/**
 * Platform console shell (S1-P04-T008, BA-03, ADR-013 §3). Only SUPER_ADMIN (`platform:tenant:read`) gets past the
 * guard; everyone else is redirected to /sign-in or /account/forbidden before any admin chrome renders. Each admin
 * page also calls the guard itself, because layouts and pages render in parallel and a layout alone does not protect
 * page data. `AdminShell` is the same header-navigation shell as the tenant console — there is no sidebar.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePlatformPage("platform:tenant:read");

  return <AdminShell>{children}</AdminShell>;
}
