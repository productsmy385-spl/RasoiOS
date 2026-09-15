import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { AuthenticatedUserSession } from "./tenant-context";
import { Role } from "./permissions";

/**
 * Resolves the authenticated user session from Clerk and maps to PostgreSQL models.
 * Returns null if the request is unauthenticated.
 */
export async function getAuthenticatedSession(): Promise<AuthenticatedUserSession | null> {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) return null;

    const primaryEmail = clerkUser.emailAddresses.find(
      (e) => e.id === clerkUser.primaryEmailAddressId
    )?.emailAddress;

    if (!primaryEmail) return null;

    // Upsert local PostgreSQL user record linked to Clerk ID
    const dbUser = await prisma.user.upsert({
      where: { clerkId: clerkUser.id },
      update: {
        email: primaryEmail,
        fullName: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || undefined,
      },
      create: {
        clerkId: clerkUser.id,
        email: primaryEmail,
        fullName: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || "Restaurant User",
        status: "ACTIVE",
      },
      include: {
        userTenants: {
          include: {
            tenant: true,
          },
        },
      },
    });

    return {
      userId: dbUser.id,
      clerkId: dbUser.clerkId,
      email: dbUser.email,
      isUserActive: dbUser.status === "ACTIVE",
      userTenants: dbUser.userTenants.map((ut) => ({
        tenantId: ut.tenantId,
        role: ut.role as Role,
        isTenantActive: ut.tenant.status === "ACTIVE",
        isUserTenantActive: ut.status === "ACTIVE",
      })),
    };
  } catch (error) {
    // If Clerk is unconfigured or unavailable in test environment, return null
    return null;
  }
}
