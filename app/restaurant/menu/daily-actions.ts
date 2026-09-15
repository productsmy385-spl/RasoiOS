"use server";

import { z } from "zod";
import { getAuthenticatedSession } from "@/lib/auth/clerk";
import { resolveTenantContext, requirePermission, assertTenantOwnership } from "@/lib/auth/tenant-context";
import { prisma } from "@/lib/db/prisma";
import { ValidationError } from "@/lib/errors";

const DailyMenuSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  itemIds: z.array(z.string().uuid("Invalid Item ID")),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
});

export async function createOrUpdateDailyMenuAction(input: z.infer<typeof DailyMenuSchema>, requestedTenantId?: string) {
  const session = await getAuthenticatedSession();
  const context = resolveTenantContext(session, requestedTenantId);
  requirePermission(context, "menu:manage");

  const parsed = DailyMenuSchema.safeParse(input);
  if (!parsed.success) {
    throw new ValidationError("Invalid daily menu payload", parsed.error.flatten().fieldErrors);
  }

  const targetDate = new Date(parsed.data.date);

  // Ensure all selected items belong to tenant
  const tenantItems = await prisma.menuItem.findMany({
    where: {
      tenantId: context.tenantId,
      id: { in: parsed.data.itemIds },
    },
    select: { id: true },
  });

  if (tenantItems.length !== parsed.data.itemIds.length) {
    throw new ValidationError("One or more selected menu items do not belong to this tenant");
  }

  // Upsert DailyMenu entity
  const dailyMenu = await prisma.dailyMenu.upsert({
    where: {
      tenantId_date: {
        tenantId: context.tenantId,
        date: targetDate,
      },
    },
    update: {
      status: parsed.data.status,
    },
    create: {
      tenantId: context.tenantId,
      date: targetDate,
      status: parsed.data.status,
    },
  });

  // Re-sync DailyMenuItems
  await prisma.dailyMenuItem.deleteMany({
    where: { dailyMenuId: dailyMenu.id },
  });

  if (parsed.data.itemIds.length > 0) {
    await prisma.dailyMenuItem.createMany({
      data: parsed.data.itemIds.map((menuItemId, index) => ({
        dailyMenuId: dailyMenu.id,
        menuItemId,
        displayOrder: index + 1,
      })),
    });
  }

  await prisma.auditLog.create({
    data: {
      tenantId: context.tenantId,
      actorUserId: context.userId,
      action: "DAILY_MENU_UPDATE",
      resourceType: "DAILY_MENU",
      resourceId: dailyMenu.id,
      afterState: { date: parsed.data.date, status: dailyMenu.status, itemCount: parsed.data.itemIds.length },
    },
  });

  return { success: true, dailyMenu };
}

export async function publishDailyMenuAction(dailyMenuId: string, requestedTenantId?: string) {
  const session = await getAuthenticatedSession();
  const context = resolveTenantContext(session, requestedTenantId);
  requirePermission(context, "menu:manage");

  const existing = await prisma.dailyMenu.findUnique({
    where: { id: dailyMenuId },
  });

  assertTenantOwnership(context, existing, "Daily Menu");

  const published = await prisma.dailyMenu.update({
    where: { id: dailyMenuId },
    data: { status: "PUBLISHED" },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: context.tenantId,
      actorUserId: context.userId,
      action: "DAILY_MENU_PUBLISH",
      resourceType: "DAILY_MENU",
      resourceId: dailyMenuId,
    },
  });

  return { success: true, dailyMenu: published };
}
