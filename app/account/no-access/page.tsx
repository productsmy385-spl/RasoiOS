import { UserX } from "lucide-react";
import { StatusPage } from "@/components/states/status-page";

// /account/no-access (security.md §2.2): signed in, but no local account, an inactive account, or no active
// restaurant membership. Renders no tenant data and queries nothing.
const MESSAGES: Record<string, string> = {
  NO_ACCOUNT: "Your email address has not been invited to a restaurant. Ask your restaurant administrator for an invitation.",
  ACCOUNT_INACTIVE: "Your account has been deactivated. Contact your restaurant administrator if you think this is a mistake.",
  NO_ACTIVE_MEMBERSHIP: "You are not an active member of any restaurant. Ask your restaurant administrator to reactivate your access.",
};

export default async function NoAccessPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const { reason } = await searchParams;
  const message = MESSAGES[reason ?? ""] ?? MESSAGES.NO_ACCOUNT;
  return (
    <StatusPage icon={UserX} title="No access">
      <p>{message}</p>
    </StatusPage>
  );
}
