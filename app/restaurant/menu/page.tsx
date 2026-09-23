import { redirect } from "next/navigation";
import { requireTenantPage } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

/**
 * `/restaurant/menu` → `/restaurant/menu/items` (frontend.md §2). The menu area has three real screens — items,
 * categories and the daily menu — so the bare path is a redirect rather than a landing page. The guard still runs
 * first, so a role without `menu:read` is answered here instead of one hop later.
 */
export default async function MenuPage() {
  await requireTenantPage("menu:read");
  redirect("/restaurant/menu/items");
}
