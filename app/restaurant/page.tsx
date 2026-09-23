import { redirect } from "next/navigation";
import { requireTenantPage } from "@/lib/auth/guards";
import { roleHomePath } from "@/lib/ui/navigation";

// /restaurant — role home (frontend.md §3.3): admins and managers → dashboard, cashiers and waiters → orders,
// kitchen → kitchen board.
export default async function RestaurantHome() {
  const ctx = await requireTenantPage("restaurant:read");
  redirect(roleHomePath(ctx.role));
}
