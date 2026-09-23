"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Mail, UserPlus, UserX } from "lucide-react";
import { inviteTenantAdminAction, revokeTenantAdminInviteAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { DataTable, RowActions, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/states/empty-state";
import { Form, SubmitButton } from "@/components/ui/form";
import { TextField } from "@/components/ui/inputs/text-field";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import type { TenantMemberRow } from "@/lib/data/platform-tenants";
import type { ActionResult } from "@/lib/http/action";
import { formatInZone } from "@/lib/ui/format";
import { DOMAIN_ICONS } from "@/lib/ui/icons";
import { roleLabel } from "@/lib/ui/navigation";

/**
 * The people who can sign in to one restaurant (S1-P06-T006; api.md LD-ADM-03, SA-ADM-05, SA-ADM-06).
 *
 * The platform console can invite, resend and revoke the *first administrator* only: everyone else is invited by that
 * administrator from inside the restaurant, which is why the row actions appear for pending TENANT_ADMIN invitations
 * and for nothing else. Staff names and emails are membership metadata, not a restaurant's operational data.
 *
 * Times are shown in UTC with the zone named, because a platform page has no single restaurant's time zone.
 */
export function TenantMembers({ tenantId, members, canInvite }: { tenantId: string; members: readonly TenantMemberRow[]; canInvite: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [inviting, setInviting] = React.useState(false);
  const [resending, setResending] = React.useState<TenantMemberRow | null>(null);
  const [revoking, setRevoking] = React.useState<TenantMemberRow | null>(null);

  const refresh = React.useCallback(
    (message: string) => {
      toast.success(message);
      router.refresh();
    },
    [router, toast],
  );

  async function resend(member: TenantMemberRow) {
    const result = await inviteTenantAdminAction({ targetTenantId: tenantId, email: member.email, fullName: member.fullName ?? "" });
    setResending(null);
    if (result.ok) refresh(`Invitation resent to ${member.email}.`);
    else toast.error(result.error.message);
  }

  async function revoke(member: TenantMemberRow) {
    const result = await revokeTenantAdminInviteAction({ targetTenantId: tenantId, membershipId: member.membershipId });
    setRevoking(null);
    if (result.ok) refresh(`Invitation for ${member.email} revoked.`);
    else toast.error(result.error.message);
  }

  const columns: DataTableColumn<TenantMemberRow>[] = [
    {
      key: "person",
      header: "Person",
      primary: true,
      cell: (member) => (
        <div className="min-w-0">
          <p className="truncate text-subheading text-fg-primary">{member.fullName ?? member.email}</p>
          {member.fullName && <p className="truncate text-caption text-fg-secondary">{member.email}</p>}
        </div>
      ),
      text: (member) => member.fullName ?? member.email,
    },
    { key: "role", header: "Role", text: (member) => roleLabel(member.role) },
    {
      key: "status",
      header: "Status",
      cell: (member) => (
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge domain="membership" status={member.status} />
          {member.status === "INVITED" && !member.invitationSent && <span className="text-caption text-status-warning">Email not sent</span>}
        </div>
      ),
      text: (member) => member.status,
    },
    {
      key: "since",
      header: "Invited / accepted",
      text: (member) => {
        const at = member.acceptedAt ?? member.invitedAt;
        return at ? `${formatInZone(at, "UTC", "date")} UTC` : "—";
      },
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-heading text-fg-primary">Who can sign in</h2>
        {canInvite && (
          <Button variant="secondary" icon={UserPlus} onClick={() => setInviting(true)}>
            Invite administrator
          </Button>
        )}
      </div>

      <DataTable
        caption="Members of this restaurant"
        columns={columns}
        rows={members}
        getRowKey={(member) => member.membershipId}
        rowActions={(member) => {
          if (!canInvite || member.status !== "INVITED" || member.role !== "TENANT_ADMIN") return null;
          return (
            <RowActions
              label={`Actions for the invitation to ${member.email}`}
              items={[
                { label: member.invitationSent ? "Resend invitation" : "Send invitation", icon: Mail, onSelect: () => setResending(member) },
                { label: "Revoke invitation", icon: UserX, tone: "danger", onSelect: () => setRevoking(member) },
              ]}
            />
          );
        }}
        empty={
          <EmptyState
            icon={DOMAIN_ICONS.staff}
            title="No administrator yet"
            description="Invite the person who will run this restaurant. They get an email, choose their own sign-in and reach only this restaurant."
          />
        }
      />

      <Dialog
        open={inviting}
        onClose={() => setInviting(false)}
        title="Invite an administrator"
        description="They are emailed an invitation and become this restaurant's administrator when they accept."
      >
        <Form
          action={(formData: FormData): Promise<ActionResult<unknown>> =>
            inviteTenantAdminAction({
              targetTenantId: tenantId,
              email: String(formData.get("email") ?? "").trim(),
              fullName: String(formData.get("fullName") ?? "").trim(),
            })
          }
          onSuccess={() => {
            setInviting(false);
            refresh("Invitation sent.");
          }}
        >
          <TextField name="email" label="Email address" type="email" required autoComplete="off" placeholder="owner@example.com" />
          <TextField name="fullName" label="Full name" autoComplete="off" help="Optional. Shown until they sign in and set their own." />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setInviting(false)}>
              Cancel
            </Button>
            <SubmitButton loadingLabel="Sending…">Send invitation</SubmitButton>
          </div>
        </Form>
      </Dialog>

      <ConfirmDialog
        open={resending !== null}
        onClose={() => setResending(null)}
        title={resending ? `Send a new invitation to ${resending.email}?` : ""}
        description="The previous link stops working."
        confirmLabel="Send invitation"
        onConfirm={() => (resending ? resend(resending) : undefined)}
      />

      <ConfirmDialog
        open={revoking !== null}
        onClose={() => setRevoking(null)}
        title={revoking ? `Revoke the invitation to ${revoking.email}?` : ""}
        description="Their link stops working immediately. You can invite them again later."
        confirmLabel="Revoke invitation"
        tone="destructive"
        onConfirm={() => (revoking ? revoke(revoking) : undefined)}
      />
    </div>
  );
}
