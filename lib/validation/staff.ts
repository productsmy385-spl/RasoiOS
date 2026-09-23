/**
 * Staff management input (S1-P07-T004; api.md §6 LD-STF-01, SA-STF-01…06). Strict schemas: a `tenantId` or any other
 * unknown key is rejected with 422 (SC-VAL-01, TI-057). The tenant always comes from the server context.
 */
import type { MembershipStatus, TenantRole } from "@prisma/client";
import { z } from "zod";
import { emailField, optionalText, strictObject, uuidParam } from "./core";

export const TENANT_ROLE_VALUES = ["TENANT_ADMIN", "MANAGER", "CASHIER", "KITCHEN", "WAITER"] as const satisfies readonly TenantRole[];
export const MEMBERSHIP_STATUS_VALUES = ["ACTIVE", "INVITED", "INACTIVE"] as const satisfies readonly MembershipStatus[];

const roleField = z.enum(TENANT_ROLE_VALUES, { errorMap: () => ({ message: "Choose a role" }) });

/** LD-STF-01 filters. */
export const listStaffSchema = strictObject({
  status: z.enum(MEMBERSHIP_STATUS_VALUES).optional(),
  role: roleField.optional(),
});
export type ListStaffInput = z.input<typeof listStaffSchema>;
export type ListStaffData = z.output<typeof listStaffSchema>;

/** SA-STF-01. The email is normalised (trim + lowercase), matching USER.email and Clerk-verified sign-in linking. */
export const inviteStaffSchema = strictObject({
  email: emailField,
  fullName: optionalText(120, "Full name"),
  role: roleField,
});
export type InviteStaffInput = z.input<typeof inviteStaffSchema>;
export type InviteStaffData = z.output<typeof inviteStaffSchema>;

/** SA-STF-02, SA-STF-03, SA-STF-05, SA-STF-06. */
export const membershipIdSchema = strictObject({ membershipId: uuidParam });
export type MembershipIdInput = z.input<typeof membershipIdSchema>;

/** SA-STF-04. */
export const changeStaffRoleSchema = strictObject({ membershipId: uuidParam, role: roleField });
export type ChangeStaffRoleInput = z.input<typeof changeStaffRoleSchema>;
export type ChangeStaffRoleData = z.output<typeof changeStaffRoleSchema>;
