import { Ban } from "lucide-react";
import { StatusPage } from "@/components/states/status-page";
import { getTenantResolution } from "@/lib/auth/context";

// /account/suspended (S1-P04-T004): the chosen restaurant is suspended by the platform. No tenant data is shown;
// if the user has another active restaurant, they are offered the selection page.
export default async function SuspendedPage() {
  const resolution = await getTenantResolution();
  const canSwitch = resolution.outcome === "SUSPENDED" && resolution.canSwitch;
  return (
    <StatusPage icon={Ban} title="Restaurant suspended" primary={canSwitch ? { href: "/account/select-tenant", label: "Choose another restaurant" } : undefined}>
      <p>This restaurant account is suspended. Contact the platform administrator.</p>
    </StatusPage>
  );
}
