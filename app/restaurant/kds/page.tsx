import { redirect } from "next/navigation";
import { requireTenantPage } from "@/lib/auth/guards";

/**
 * The baseline kitchen display lived here and at `/restaurant/kitchen`. There is one board now (frontend.md §2), so
 * this route only forwards. It still resolves the tenant context first, so a signed-out or unauthorised caller gets
 * exactly the answer they got before the two screens were merged, rather than being bounced on to find out.
 */
export default async function KitchenDisplayRedirect(): Promise<never> {
  await requireTenantPage("kot:read");
  redirect("/restaurant/kitchen");
}
