"use server";

import { z } from "zod";
import { getAuthenticatedSession } from "@/lib/auth/clerk";
import { resolveTenantContext, requirePermission } from "@/lib/auth/tenant-context";
import { prisma } from "@/lib/db/prisma";
import { ValidationError, NotFoundError } from "@/lib/errors";

const UpdateRestaurantSchema = z.object({
  name: z.string().min(2, "Restaurant name must be at least 2 characters"),
  logo: z.string().url("Logo must be a valid URL").optional().or(z.literal("")),
  description: z.string().optional(),
  address: z.string().optional(),
  contactEmail: z.string().email("Invalid contact email").optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  openingHours: z.string().optional(),
});

export type UpdateRestaurantInput = z.infer<typeof UpdateRestaurantSchema>;

export async function updateRestaurantProfileAction(
  input: UpdateRestaurantInput,
  requestedTenantId?: string
) {
  // 1. Resolve Clerk session
  const session = await getAuthenticatedSession();

  // 2. Resolve server-validated TenantContext (Never trust client tenantId)
  const context = resolveTenantContext(session, requestedTenantId);

  // 3. Verify RBAC permission for managing tenant settings
  requirePermission(context, "tenant:manage_own");

  // 4. Validate input schema
  const parsed = UpdateRestaurantSchema.safeParse(input);
  if (!parsed.success) {
    throw new ValidationError(
      "Validation failed for restaurant profile input",
      parsed.error.flatten().fieldErrors
    );
  }

  const { name, logo, description, address, contactEmail, contactPhone, openingHours } = parsed.data;

  // 5. Lookup target restaurant entity under this tenant
  const existingRestaurant = await prisma.restaurant.findFirst({
    where: { tenantId: context.tenantId },
  });

  if (!existingRestaurant) {
    throw new NotFoundError("Restaurant profile record not found for tenant");
  }

  // 6. Update database record securely within tenant boundary
  const updated = await prisma.restaurant.update({
    where: { id: existingRestaurant.id },
    data: {
      name,
      logo: logo || null,
      description: description || null,
      address: address || null,
      contactEmail: contactEmail || null,
      contactPhone: contactPhone || null,
      openingHours: openingHours ? (openingHours as unknown as object) : undefined,
    },
  });

  // 7. Write audit log entry
  await prisma.auditLog.create({
    data: {
      tenantId: context.tenantId,
      actorUserId: context.userId,
      action: "RESTAURANT_PROFILE_UPDATE",
      resourceType: "RESTAURANT",
      resourceId: updated.id,
      afterState: { name, address, contactEmail },
    },
  });

  return {
    success: true,
    restaurant: {
      id: updated.id,
      name: updated.name,
      logo: updated.logo,
      description: updated.description,
      address: updated.address,
      contactEmail: updated.contactEmail,
      contactPhone: updated.contactPhone,
      openingHours: updated.openingHours,
    },
  };
}
