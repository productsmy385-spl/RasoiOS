/**
 * Grants the SUPER_ADMIN platform role (S1-P06-T008, SC-RBAC-03). Used by `npm run platform:grant-super-admin`; no
 * `server-only` import so the CLI can run it under plain Node. Idempotent: granting an existing SUPER_ADMIN writes
 * nothing. Each real change writes one `platform.role_changed` audit row (actor SYSTEM) in the same transaction.
 */
import type { PrismaClient } from "@prisma/client";

export type GrantResult = {
  outcome: "GRANTED" | "ALREADY_SUPER_ADMIN";
  userId: string;
  /** True when the user has never signed in, so a Clerk invitation is needed for them to create their login. */
  needsInvitation: boolean;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normaliseEmail(input: string): string {
  const email = input.trim().toLowerCase();
  if (!EMAIL.test(email) || email.length > 254) throw new RangeError("Provide a valid email address with --email.");
  return email;
}

export async function grantSuperAdmin(db: PrismaClient, rawEmail: string, requestId: string): Promise<GrantResult> {
  const email = normaliseEmail(rawEmail);
  return db.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({ where: { email }, select: { id: true, platformRole: true, clerkUserId: true } });
    if (existing?.platformRole === "SUPER_ADMIN") {
      return { outcome: "ALREADY_SUPER_ADMIN", userId: existing.id, needsInvitation: existing.clerkUserId === null } as const;
    }
    const user = existing
      ? await tx.user.update({ where: { id: existing.id }, data: { platformRole: "SUPER_ADMIN" }, select: { id: true, clerkUserId: true } })
      : await tx.user.create({ data: { email, platformRole: "SUPER_ADMIN" }, select: { id: true, clerkUserId: true } });
    await tx.auditLog.create({
      data: {
        actorType: "SYSTEM",
        action: "platform.role_changed",
        resourceType: "user",
        resourceId: user.id,
        beforeState: { platformRole: existing?.platformRole ?? "NONE", userExisted: Boolean(existing) },
        afterState: { platformRole: "SUPER_ADMIN" },
        reason: "Granted with platform:grant-super-admin",
        requestId: requestId.slice(0, 64),
      },
    });
    return { outcome: "GRANTED", userId: user.id, needsInvitation: user.clerkUserId === null } as const;
  });
}
