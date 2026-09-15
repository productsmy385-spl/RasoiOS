"use server";

import { z } from "zod";
import { getAuthenticatedSession } from "@/lib/auth/clerk";
import { resolveTenantContext, requirePermission, assertTenantOwnership } from "@/lib/auth/tenant-context";
import { prisma } from "@/lib/db/prisma";
import { ValidationError, NotFoundError } from "@/lib/errors";

const CreateCategorySchema = z.object({
  name: z.string().min(2, "Category name must be at least 2 characters"),
  description: z.string().optional(),
  sortOrder: z.number().int().optional().default(0),
});

const UpdateCategorySchema = CreateCategorySchema.partial().extend({
  id: z.string().uuid("Invalid category ID"),
  isActive: z.boolean().optional(),
});

export async function createCategoryAction(input: z.input<typeof CreateCategorySchema>, requestedTenantId?: string) {
  const session = await getAuthenticatedSession();
  const context = resolveTenantContext(session, requestedTenantId);
  requirePermission(context, "menu:manage");

  const parsed = CreateCategorySchema.safeParse(input);
  if (!parsed.success) {
    throw new ValidationError("Invalid category creation payload", parsed.error.flatten().fieldErrors);
  }

  const category = await prisma.menuCategory.create({
    data: {
      tenantId: context.tenantId,
      name: parsed.data.name,
      description: parsed.data.description || null,
      sortOrder: parsed.data.sortOrder,
      isActive: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: context.tenantId,
      actorUserId: context.userId,
      action: "MENU_CATEGORY_CREATE",
      resourceType: "MENU_CATEGORY",
      resourceId: category.id,
      afterState: { name: category.name },
    },
  });

  return { success: true, category };
}

export async function updateCategoryAction(input: z.input<typeof UpdateCategorySchema>, requestedTenantId?: string) {
  const session = await getAuthenticatedSession();
  const context = resolveTenantContext(session, requestedTenantId);
  requirePermission(context, "menu:manage");

  const parsed = UpdateCategorySchema.safeParse(input);
  if (!parsed.success) {
    throw new ValidationError("Invalid category update payload", parsed.error.flatten().fieldErrors);
  }

  const existing = await prisma.menuCategory.findUnique({
    where: { id: parsed.data.id },
  });

  assertTenantOwnership(context, existing, "Menu Category");

  const updated = await prisma.menuCategory.update({
    where: { id: parsed.data.id },
    data: {
      ...(parsed.data.name && { name: parsed.data.name }),
      ...(parsed.data.description !== undefined && { description: parsed.data.description || null }),
      ...(parsed.data.sortOrder !== undefined && { sortOrder: parsed.data.sortOrder }),
      ...(parsed.data.isActive !== undefined && { isActive: parsed.data.isActive }),
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: context.tenantId,
      actorUserId: context.userId,
      action: "MENU_CATEGORY_UPDATE",
      resourceType: "MENU_CATEGORY",
      resourceId: updated.id,
      afterState: { name: updated.name, isActive: updated.isActive },
    },
  });

  return { success: true, category: updated };
}

export async function deleteCategoryAction(categoryId: string, requestedTenantId?: string) {
  const session = await getAuthenticatedSession();
  const context = resolveTenantContext(session, requestedTenantId);
  requirePermission(context, "menu:manage");

  const existing = await prisma.menuCategory.findUnique({
    where: { id: categoryId },
  });

  assertTenantOwnership(context, existing, "Menu Category");

  // Deactivate instead of hard deletion to preserve historical dependencies
  const deactivated = await prisma.menuCategory.update({
    where: { id: categoryId },
    data: { isActive: false },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: context.tenantId,
      actorUserId: context.userId,
      action: "MENU_CATEGORY_DEACTIVATE",
      resourceType: "MENU_CATEGORY",
      resourceId: categoryId,
    },
  });

  return { success: true, category: deactivated };
}
