import { ShieldX } from "lucide-react";
import { StatusPage } from "@/components/states/status-page";

// /account/forbidden: the signed-in role lacks the permission for the page it asked for (security.md §3).
export default function ForbiddenPage() {
  return (
    <StatusPage icon={ShieldX} title="You don't have access to this page" primary={{ href: "/restaurant", label: "Go to your home page" }}>
      <p>Your role does not include this area. Ask your restaurant administrator if you need access.</p>
    </StatusPage>
  );
}
