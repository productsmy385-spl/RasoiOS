import "server-only";
import type { TenantRole } from "@prisma/client";
import { db } from "@/lib/db/prisma";
import { mapErrors } from "./errors";

/** Audit row for SA-AUTH-01 (`session.tenant_switched`). The tenant is the one on the caller's own membership. */
export async function recordTenantSwitch(input: { userId: string; tenantId: string; membershipId: string; role: TenantRole; requestId: string }): Promise<void> {
  await mapErrors("Audit", () =>
    db.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorType: "USER",
        actorUserId: input.userId,
        actorRole: input.role,
        action: "session.tenant_switched",
        resourceType: "user_tenant",
        resourceId: input.membershipId,
        requestId: input.requestId.slice(0, 64),
      },
    }),
  );
}
