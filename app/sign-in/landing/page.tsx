import { redirect } from "next/navigation";
import { getPlatformResolution } from "@/lib/auth/context";

export const dynamic = "force-dynamic";

/**
 * Post-sign-in landing (S1-P03-T005, frontend.md §5.1 "redirect /restaurant or /admin"): platform administrators go
 * to the platform console, everyone else to their restaurant role home (/restaurant decides the page per role and
 * sends users without access to the right /account page). Renders nothing and reads no tenant data.
 */
export default async function SignInLanding() {
  const platform = await getPlatformResolution();
  if (platform.outcome === "SIGNED_OUT") redirect("/sign-in");
  redirect(platform.outcome === "OK" ? "/admin" : "/restaurant");
}
