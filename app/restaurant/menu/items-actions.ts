"use server";

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { getAuthenticatedSession } from "@/lib/auth/clerk";
import { resolveTenantContext, requirePermission, assertTenantOwnership } from "@/lib/auth/tenant-context";
import { prisma } from "@/lib/db/prisma";
import { ValidationError, NotFoundError } from "@/lib/errors";

const CreateMenuItemSchema = z.object({
  categoryId: z.string().uuid("Invalid Category ID"),
  name: z.string().min(2, "Item name must be at least 2 characters"),
  description: z.string().optional(),
  imageUrl: z.string().url("Must be a valid image URL").optional().or(z.literal("")),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, "Price must be a valid positive amount"),
  taxRate: z.string().regex(/^\d+(\.\d{1,2})?$/, "Tax rate must be a percentage").default("0.00"),
  displayOrder: z.number().int().optional().default(0),
  variants: z.array(z.object({ name: z.string(), price: z.string() })).optional(),
  addOns: z.array(z.object({ name: z.string(), price: z.string() })).optional(),
});

const UpdateMenuItemSchema = CreateMenuItemSchema.partial().extend({
  id: z.string().uuid("Invalid Item ID"),
  isAvailable: z.boolean().optional(),
});

export async function createMenuItemAction(input: z.input<typeof CreateMenuItemSchema>, requestedTenantId?: string) {
  const session = await getAuthenticatedSession();
  const context = resolveTenantContext(session, requestedTenantId);
  requirePermission(context, "menu:manage");

  const parsed = CreateMenuItemSchema.safeParse(input);
  if (!parsed.success) {
    throw new ValidationError("Invalid menu item creation payload", parsed.error.flatten().fieldErrors);
  }

  // Ensure category belongs to tenant
  const category = await prisma.menuCategory.findUnique({
    where: { id: parsed.data.categoryId },
  });
  assertTenantOwnership(context, category, "Menu Category");

  const item = await prisma.menuItem.create({
    data: {
      tenantId: context.tenantId,
      categoryId: parsed.data.categoryId,
      name: parsed.data.name,
      description: parsed.data.description || null,
      imageUrl: parsed.data.imageUrl || null,
      price: new Prisma.Decimal(parsed.data.price),
      taxRate: new Prisma.Decimal(parsed.data.taxRate),
      isAvailable: true,
      displayOrder: parsed.data.displayOrder,
      variants: parsed.data.variants ? (parsed.data.variants as unknown as Prisma.InputJsonValue) : undefined,
      addOns: parsed.data.addOns ? (parsed.data.addOns as unknown as Prisma.InputJsonValue) : undefined,
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: context.tenantId,
      actorUserId: context.userId,
      action: "MENU_ITEM_CREATE",
      resourceType: "MENU_ITEM",
      resourceId: item.id,
      afterState: { name: item.name, price: item.price.toString() },
    },
  });

  return {
    success: true,
    item: {
      ...item,
      price: item.price.toString(),
      taxRate: item.taxRate.toString(),
    },
  };
}

export async function updateMenuItemAction(input: z.input<typeof UpdateMenuItemSchema>, requestedTenantId?: string) {
  const session = await getAuthenticatedSession();
  const context = resolveTenantContext(session, requestedTenantId);
  requirePermission(context, "menu:manage");

  const parsed = UpdateMenuItemSchema.safeParse(input);
  if (!parsed.success) {
    throw new ValidationError("Invalid menu item update payload", parsed.error.flatten().fieldErrors);
  }

  const existing = await prisma.menuItem.findUnique({
    where: { id: parsed.data.id },
  });
  assertTenantOwnership(context, existing, "Menu Item");

  const updated = await prisma.menuItem.update({
    where: { id: parsed.data.id },
    data: {
      ...(parsed.data.name && { name: parsed.data.name }),
      ...(parsed.data.description !== undefined && { description: parsed.data.description || null }),
      ...(parsed.data.imageUrl !== undefined && { imageUrl: parsed.data.imageUrl || null }),
      ...(parsed.data.price && { price: new Prisma.Decimal(parsed.data.price) }),
      ...(parsed.data.taxRate && { taxRate: new Prisma.Decimal(parsed.data.taxRate) }),
      ...(parsed.data.isAvailable !== undefined && { isAvailable: parsed.data.isAvailable }),
      ...(parsed.data.displayOrder !== undefined && { displayOrder: parsed.data.displayOrder }),
      ...(parsed.data.variants !== undefined && { variants: parsed.data.variants as unknown as Prisma.InputJsonValue }),
      ...(parsed.data.addOns !== undefined && { addOns: parsed.data.addOns as unknown as Prisma.InputJsonValue }),
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: context.tenantId,
      actorUserId: context.userId,
      action: "MENU_ITEM_UPDATE",
      resourceType: "MENU_ITEM",
      resourceId: updated.id,
      afterState: { name: updated.name, price: updated.price.toString(), isAvailable: updated.isAvailable },
    },
  });

  return {
    success: true,
    item: {
      ...updated,
      price: updated.price.toString(),
      taxRate: updated.taxRate.toString(),
    },
  };
}

export async function toggleItemAvailabilityAction(itemId: string, isAvailable: boolean, requestedTenantId?: string) {
  return updateMenuItemAction({ id: itemId, isAvailable }, requestedTenantId);
}

export async function deleteMenuItemAction(itemId: string, requestedTenantId?: string) {
  const session = await getAuthenticatedSession();
  const context = resolveTenantContext(session, requestedTenantId);
  requirePermission(context, "menu:manage");

  const existing = await prisma.menuItem.findUnique({
    where: { id: itemId },
  });
  assertTenantOwnership(context, existing, "Menu Item");

  const deactivated = await prisma.menuItem.update({
    where: { id: itemId },
    data: { isAvailable: false },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: context.tenantId,
      actorUserId: context.userId,
      action: "MENU_ITEM_DEACTIVATE",
      resourceType: "MENU_ITEM",
      resourceId: itemId,
    },
  });

  return { success: true, item: deactivated };
}
