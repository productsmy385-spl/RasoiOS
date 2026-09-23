import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { ErrorState } from "@/components/states/error-state";
import { StaffBoard } from "@/components/staff/staff-board";
import { requireTenantPage } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/permissions";
import { listStaffAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Staff" };

/**
 * `/restaurant/staff` (S1-P07-T006; api.md LD-STF-01). `staff:read` is resolved before anything is read; the list is
 * always this restaurant's own team, because the loader takes the tenant from the session and never from the URL.
 *
 * The whole team is read once — it is a bounded 200-row read of one restaurant — and grouped into the three tabs here,
 * so each tab can show its own count without a second query. LD-STF-01's `status` filter stays available to API
 * callers; this page simply does not need it.
 */
export default async function StaffPage() {
  const ctx = await requireTenantPage("staff:read");
  const staff = await listStaffAction({});

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col">
      <PageHeader title="Staff" description="Who works here, what they can do, and who is still to accept an invitation." />

      {staff.ok ? (
        <StaffBoard
          members={staff.data.items}
          assignableRoles={staff.data.assignableRoles}
          can={{
            invite: hasPermission(ctx, "staff:invite"),
            updateRole: hasPermission(ctx, "staff:update_role"),
            deactivate: hasPermission(ctx, "staff:deactivate"),
          }}
          timezone={ctx.restaurant.timezone}
        />
      ) : (
        <ErrorState requestId={staff.error.requestId} message={staff.error.message} />
      )}
    </div>
  );
}
