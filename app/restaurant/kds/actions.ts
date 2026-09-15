"use server";

import { z } from "zod";
import { KOTStatus } from "@prisma/client";
import { getAuthenticatedSession } from "@/lib/auth/clerk";
import { resolveTenantContext, requirePermission } from "@/lib/auth/tenant-context";
import { getTenantKOTTickets, updateKOTStatus } from "@/lib/services/kot";
import { ValidationError } from "@/lib/errors";

const KOTStatusSchema = z.nativeEnum(KOTStatus);

export async function getKOTTicketsAction(
  filters?: { status?: KOTStatus; kitchenSection?: string },
  requestedTenantId?: string
) {
  const session = await getAuthenticatedSession();
  const context = resolveTenantContext(session, requestedTenantId);
  requirePermission(context, "kitchen:view_queue");

  const tickets = await getTenantKOTTickets(context.tenantId, filters);
  return { success: true, tickets };
}

export async function updateKOTStatusAction(
  kotId: string,
  nextStatus: KOTStatus,
  requestedTenantId?: string
) {
  const session = await getAuthenticatedSession();
  const context = resolveTenantContext(session, requestedTenantId);
  requirePermission(context, "kitchen:view_queue");

  const parsedStatus = KOTStatusSchema.safeParse(nextStatus);
  if (!parsedStatus.success) {
    throw new ValidationError("Invalid KOT status requested");
  }

  const updatedTicket = await updateKOTStatus(
    context.tenantId,
    kotId,
    parsedStatus.data
  );

  return { success: true, ticket: updatedTicket };
}
