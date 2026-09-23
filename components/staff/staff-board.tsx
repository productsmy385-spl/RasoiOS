"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Mail, UserMinus, UserPlus, UserX } from "lucide-react";
import {
  changeStaffRoleAction,
  deactivateStaffAction,
  inviteStaffAction,
  reactivateStaffAction,
  resendStaffInviteAction,
  revokeStaffInviteAction,
} from "@/app/restaurant/staff/actions";
import { EmptyState } from "@/components/states/empty-state";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { DataTable, RowActions, type DataTableColumn } from "@/components/ui/data-table";
import { Form, SubmitButton } from "@/components/ui/form";
import { Select, SelectInput } from "@/components/ui/inputs/select";
import type { MenuItem } from "@/components/ui/menu";
import { TextField } from "@/components/ui/inputs/text-field";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import type { StaffListItem } from "@/lib/services/staff";
import type { ActionResult } from "@/lib/http/action";
import { formatInZone } from "@/lib/ui/format";
import { DOMAIN_ICONS } from "@/lib/ui/icons";
import { roleLabel } from "@/lib/ui/navigation";

/**
 * The restaurant's team (S1-P07-T006; api.md LD-STF-01, SA-STF-01…06).
 *
 * Three tabs — active, invited, deactivated — over one bounded read of the team, so every tab can show its count
 * without a second query. A control only appears when the caller may use it: `assignableRoles` comes from the server
 * and is the same list the server enforces, `canManage` is decided per member by the role hierarchy, and nobody is
 * offered a control on their own row. Refusals the rules produce (the last administrator, a role above the caller's)
 * come back from the server and are shown as they are — the UI does not try to predict them.
 */
export type StaffBoardProps = {
  members: StaffListItem[];
  assignableRoles: string[];
  can: { invite: boolean; updateRole: boolean; deactivate: boolean };
  timezone: string;
};

type Pending = { member: StaffListItem; kind: "deactivate" | "reactivate" | "resend" | "revoke" } | null;

export function StaffBoard({ members, assignableRoles, can, timezone }: StaffBoardProps) {
  const router = useRouter();
  const toast = useToast();
  const [inviting, setInviting] = React.useState(false);
  const [pending, setPending] = React.useState<Pending>(null);
  const [failure, setFailure] = React.useState<string | null>(null);

  const groups = {
    ACTIVE: members.filter((member) => member.status === "ACTIVE"),
    INVITED: members.filter((member) => member.status === "INVITED"),
    INACTIVE: members.filter((member) => member.status === "INACTIVE"),
  };

  const after = React.useCallback(
    (result: ActionResult<unknown>, success: string) => {
      if (result.ok) {
        setFailure(null);
        toast.success(success);
        router.refresh();
      } else {
        // Rule refusals (LAST_TENANT_ADMIN, ROLE_NOT_ASSIGNABLE, SELF_CHANGE_NOT_ALLOWED) are explanations, not noise:
        // they stay on the page until the next attempt rather than disappearing with a toast.
        setFailure(result.error.message);
        toast.error(result.error.message);
      }
      return result.ok;
    },
    [router, toast],
  );

  async function run(member: StaffListItem, kind: NonNullable<Pending>["kind"]) {
    const input = { membershipId: member.membershipId };
    const who = member.fullName ?? member.email;
    const result =
      kind === "deactivate"
        ? await deactivateStaffAction(input)
        : kind === "reactivate"
          ? await reactivateStaffAction(input)
          : kind === "resend"
            ? await resendStaffInviteAction(input)
            : await revokeStaffInviteAction(input);
    setPending(null);
    after(
      result,
      kind === "deactivate"
        ? `${who} can no longer sign in.`
        : kind === "reactivate"
          ? `${who} can sign in again.`
          : kind === "resend"
            ? `Invitation resent to ${member.email}.`
            : `Invitation for ${member.email} revoked.`,
    );
  }

  async function changeRole(member: StaffListItem, role: string) {
    after(await changeStaffRoleAction({ membershipId: member.membershipId, role: role as never }), `${member.fullName ?? member.email} is now ${roleLabel(role)}.`);
  }

  const columns = (status: keyof typeof groups): DataTableColumn<StaffListItem>[] => [
    {
      key: "person",
      header: "Person",
      primary: true,
      cell: (member) => (
        <div className="min-w-0">
          <p className="truncate text-subheading text-fg-primary">
            {member.fullName ?? member.email}
            {member.isSelf && <span className="ml-2 text-caption text-fg-secondary">You</span>}
          </p>
          {member.fullName && <p className="truncate text-caption text-fg-secondary">{member.email}</p>}
        </div>
      ),
      text: (member) => member.fullName ?? member.email,
    },
    {
      key: "role",
      header: "Role",
      cell: (member) => {
        const editable = can.updateRole && member.canManage && status !== "INACTIVE" && assignableRoles.includes(member.role);
        if (!editable) {
          return (
            <span className="flex flex-col gap-0.5">
              <span className="text-body text-fg-primary">{roleLabel(member.role)}</span>
              {member.isSelf && <span className="text-caption text-fg-secondary">You can&apos;t change your own role</span>}
            </span>
          );
        }
        return (
          <SelectInput
            className="sm:w-44"
            aria-label={`Role for ${member.fullName ?? member.email}`}
            defaultValue={member.role}
            options={assignableRoles.map((role) => ({ value: role, label: roleLabel(role) }))}
            onChange={(event) => changeRole(member, event.target.value)}
          />
        );
      },
      text: (member) => roleLabel(member.role),
    },
    { key: "status", header: "Status", cell: (member) => <StatusBadge domain="membership" status={member.status} /> },
    {
      key: "since",
      header: status === "INVITED" ? "Invited" : status === "INACTIVE" ? "Deactivated" : "Joined",
      text: (member) => {
        const at = status === "INVITED" ? member.invitedAt : status === "INACTIVE" ? member.deactivatedAt : member.acceptedAt;
        return at ? formatInZone(at, timezone, "date") : "—";
      },
    },
  ];

  function actionsFor(member: StaffListItem): React.ReactNode {
    const items: MenuItem[] = [];
    if (member.status === "INVITED" && can.invite && member.canManage) {
      items.push({ label: "Resend invitation", icon: Mail, onSelect: () => setPending({ member, kind: "resend" }) });
      items.push({ label: "Revoke invitation", icon: UserX, tone: "danger" as const, onSelect: () => setPending({ member, kind: "revoke" }) });
    }
    if (member.status === "ACTIVE" && can.deactivate && member.canManage) {
      items.push({ label: "Deactivate", icon: UserMinus, tone: "danger" as const, onSelect: () => setPending({ member, kind: "deactivate" }) });
    }
    // Reactivation restores someone who had accepted; a revoked invitation is invited again instead.
    if (member.status === "INACTIVE" && member.canManage) {
      if (member.acceptedAt && can.deactivate) items.push({ label: "Reactivate", icon: UserPlus, onSelect: () => setPending({ member, kind: "reactivate" }) });
      else if (can.invite) items.push({ label: "Invite again", icon: Mail, onSelect: () => setInviting(true) });
    }
    if (items.length === 0) return null;
    return <RowActions label={`Actions for ${member.fullName ?? member.email}`} items={items} />;
  }

  const panel = (status: keyof typeof groups, empty: React.ReactNode) => (
    <DataTable
      caption={status === "ACTIVE" ? "Active team members" : status === "INVITED" ? "Pending invitations" : "Deactivated people"}
      columns={columns(status)}
      rows={groups[status]}
      getRowKey={(member) => member.membershipId}
      rowActions={actionsFor}
      empty={empty}
    />
  );

  const tabs: TabItem[] = [
    {
      id: "ACTIVE",
      label: `Active (${groups.ACTIVE.length})`,
      content: panel(
        "ACTIVE",
        <EmptyState
          icon={DOMAIN_ICONS.staff}
          title="Nobody can sign in yet"
          description="Invite the people who work here. Each of them gets their own sign-in and only the permissions their role allows."
        />,
      ),
    },
    {
      id: "INVITED",
      label: `Invited (${groups.INVITED.length})`,
      content: panel("INVITED", <EmptyState icon={DOMAIN_ICONS.staff} title="No invitations waiting" description="Everyone you invited has accepted." />),
    },
    {
      id: "INACTIVE",
      label: `Deactivated (${groups.INACTIVE.length})`,
      content: panel(
        "INACTIVE",
        <EmptyState icon={DOMAIN_ICONS.staff} title="Nobody is deactivated" description="People you deactivate keep their history here and can be brought back." />,
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {failure && (
        <Alert tone="warning" title="That change was refused">
          {failure}
        </Alert>
      )}

      {can.invite && (
        <div className="flex justify-end">
          <Button icon={UserPlus} onClick={() => setInviting(true)}>
            Invite someone
          </Button>
        </div>
      )}

      <Tabs items={tabs} label="Staff by status" />

      <Dialog open={inviting} onClose={() => setInviting(false)} title="Invite someone" description="They get an email, choose their own sign-in and reach only this restaurant.">
        <Form
          action={(formData: FormData): Promise<ActionResult<unknown>> =>
            inviteStaffAction({
              email: String(formData.get("email") ?? "").trim(),
              fullName: String(formData.get("fullName") ?? "").trim(),
              role: String(formData.get("role") ?? "") as never,
            })
          }
          onSuccess={() => {
            setInviting(false);
            setFailure(null);
            toast.success("Invitation sent.");
            router.refresh();
          }}
        >
          <TextField name="email" label="Email address" type="email" required autoComplete="off" placeholder="chef@example.com" />
          <TextField name="fullName" label="Full name" autoComplete="off" help="Optional. Shown until they sign in and set their own." />
          <Select
            name="role"
            label="Role"
            required
            emptyOption="Choose a role"
            options={assignableRoles.map((role) => ({ value: role, label: roleLabel(role) }))}
            help="You can only give a role you are allowed to assign."
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setInviting(false)}>
              Cancel
            </Button>
            <SubmitButton loadingLabel="Sending…">Send invitation</SubmitButton>
          </div>
        </Form>
      </Dialog>

      <ConfirmDialog
        open={pending !== null}
        onClose={() => setPending(null)}
        title={pending ? confirmTitle(pending) : ""}
        description={pending ? CONFIRM_DESCRIPTION[pending.kind] : undefined}
        confirmLabel={pending ? CONFIRM_LABEL[pending.kind] : ""}
        tone={pending && (pending.kind === "deactivate" || pending.kind === "revoke") ? "destructive" : "primary"}
        onConfirm={() => (pending ? run(pending.member, pending.kind) : undefined)}
      />
    </div>
  );
}

const CONFIRM_LABEL = { deactivate: "Deactivate", reactivate: "Reactivate", resend: "Send invitation", revoke: "Revoke invitation" } as const;

const CONFIRM_DESCRIPTION = {
  deactivate: "They are signed out on their next request and can no longer open this restaurant. Their orders and history stay exactly as they are.",
  reactivate: "They can sign in again with the role shown here.",
  resend: "The previous invitation link stops working.",
  revoke: "Their link stops working immediately. You can invite them again later.",
} as const;

function confirmTitle({ member, kind }: NonNullable<Pending>): string {
  const who = member.fullName ?? member.email;
  if (kind === "deactivate") return `Deactivate ${who}?`;
  if (kind === "reactivate") return `Let ${who} sign in again?`;
  if (kind === "resend") return `Send a new invitation to ${member.email}?`;
  return `Revoke the invitation to ${member.email}?`;
}
