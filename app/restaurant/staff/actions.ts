"use server";

import { requireTenant } from "@/lib/auth/guards";
import { action } from "@/lib/http/action";
import {
  changeStaffRole,
  deactivateStaff,
  inviteStaff,
  listStaff,
  reactivateStaff,
  resendStaffInvite,
  revokeStaffInvite,
} from "@/lib/services/staff";
import { parseInput } from "@/lib/validation/core";
import {
  changeStaffRoleSchema,
  inviteStaffSchema,
  listStaffSchema,
  membershipIdSchema,
  type ChangeStaffRoleInput,
  type InviteStaffInput,
  type ListStaffInput,
  type MembershipIdInput,
} from "@/lib/validation/staff";

/**
 * Staff management (S1-P07-T004; api.md LD-STF-01, SA-STF-01…06; security.md §3.3 rows 14–17). The permission is
 * checked first; the staff member is always one of the session's tenant (another tenant's membership id → 404,
 * TI-055/TI-056; a `tenantId` in the body → 422, TI-057). Hierarchy, self-change and last-TENANT_ADMIN rules are
 * enforced by `lib/services/staff.ts` for every action.
 */

/** LD-STF-01 — `staff:read`: members (filter by status/role) and the roles the caller may assign. */
export const listStaffAction = action(async (input: ListStaffInput = {}) => {
  const ctx = await requireTenant("staff:read");
  const filters = parseInput(listStaffSchema, input);
  return listStaff(ctx, filters);
});

/** SA-STF-01 — `staff:invite`: `{ email, fullName?, role }`; 409 ALREADY_MEMBER, 403 ROLE_NOT_ASSIGNABLE, 429. */
export const inviteStaffAction = action(async (input: InviteStaffInput) => {
  const ctx = await requireTenant("staff:invite");
  const data = parseInput(inviteStaffSchema, input);
  return inviteStaff(ctx, data);
});

/** SA-STF-02 — `staff:invite`: `{ membershipId }` of a pending invitation. */
export const resendStaffInviteAction = action(async (input: MembershipIdInput) => {
  const ctx = await requireTenant("staff:invite");
  const { membershipId } = parseInput(membershipIdSchema, input);
  return resendStaffInvite(ctx, membershipId);
});

/** SA-STF-03 — `staff:invite`: `{ membershipId }` of a pending invitation. */
export const revokeStaffInviteAction = action(async (input: MembershipIdInput) => {
  const ctx = await requireTenant("staff:invite");
  const { membershipId } = parseInput(membershipIdSchema, input);
  return revokeStaffInvite(ctx, membershipId);
});

/** SA-STF-04 — `staff:update_role`: `{ membershipId, role }`; 403 ROLE_NOT_ASSIGNABLE, 409 LAST_TENANT_ADMIN. */
export const changeStaffRoleAction = action(async (input: ChangeStaffRoleInput) => {
  const ctx = await requireTenant("staff:update_role");
  const data = parseInput(changeStaffRoleSchema, input);
  return changeStaffRole(ctx, data);
});

/** SA-STF-05 — `staff:deactivate`: `{ membershipId }`; revokes Clerk sessions when it was the person's last membership. */
export const deactivateStaffAction = action(async (input: MembershipIdInput) => {
  const ctx = await requireTenant("staff:deactivate");
  const { membershipId } = parseInput(membershipIdSchema, input);
  return deactivateStaff(ctx, membershipId);
});

/** SA-STF-06 — `staff:deactivate`: `{ membershipId }`. */
export const reactivateStaffAction = action(async (input: MembershipIdInput) => {
  const ctx = await requireTenant("staff:deactivate");
  const { membershipId } = parseInput(membershipIdSchema, input);
  return reactivateStaff(ctx, membershipId);
});
