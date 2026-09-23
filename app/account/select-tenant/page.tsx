import { redirect } from "next/navigation";
import { Store } from "lucide-react";
import { StatusPage } from "@/components/states/status-page";
import { getTenantResolution } from "@/lib/auth/context";
import { accountRedirectFor } from "@/lib/auth/guards";
import { SelectTenantList } from "./select-tenant-list";

// /account/select-tenant (S1-P04-T003): lists the caller's own ACTIVE memberships. Choosing one calls SA-AUTH-01.
export default async function SelectTenantPage() {
  const resolution = await getTenantResolution();
  if (resolution.outcome === "SIGNED_OUT" || resolution.outcome === "NO_ACCOUNT" || resolution.outcome === "ACCOUNT_INACTIVE" || resolution.outcome === "NO_MEMBERSHIP") {
    redirect(accountRedirectFor(resolution));
  }
  const memberships = resolution.memberships.filter((m) => !m.suspended);
  const current = resolution.outcome === "OK" ? resolution.ctx.membershipId : null;
  return (
    <StatusPage icon={Store} title="Choose a restaurant">
      <p className="mb-4">You work at more than one restaurant. Choose the one to open.</p>
      <SelectTenantList memberships={memberships.map((m) => ({ ...m, current: m.membershipId === current }))} />
    </StatusPage>
  );
}
