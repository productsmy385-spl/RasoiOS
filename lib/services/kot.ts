import { prisma } from "@/lib/db/prisma";
import { KOTStatus, Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";

export interface KOTFilters {
  status?: KOTStatus;
  kitchenSection?: string;
  limit?: number;
}

const ALLOWED_KOT_TRANSITIONS: Record<KOTStatus, KOTStatus[]> = {
  QUEUED: [KOTStatus.PREPARING, KOTStatus.READY],
  PREPARING: [KOTStatus.READY],
  READY: [KOTStatus.SERVED],
  SERVED: [],
};

/**
 * Generates sequential KOT number for a tenant (e.g. KOT-101).
 */
export async function generateKOTNumber(tenantId: string): Promise<string> {
  const count = await prisma.kOTTicket.count({
    where: {
      tenantId,
      createdAt: {
        gte: new Date(new Date().setHours(0, 0, 0, 0)),
      },
    },
  });

  const sequence = 100 + count + 1;
  return `KOT-${sequence}`;
}

/**
 * Generates a KOT Ticket for an order.
 */
export async function generateKOTTicketsForOrder(
  tenantId: string,
  orderId: string,
  kitchenSection?: string
) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId },
    include: { items: true },
  });

  if (!order) {
    throw new Error("Order not found or tenant access mismatch");
  }

  // Check if KOT ticket already exists for this order & section
  const existing = await prisma.kOTTicket.findFirst({
    where: { tenantId, orderId, kitchenSection: kitchenSection || null },
  });

  if (existing) {
    return existing;
  }

  const kotNumber = await generateKOTNumber(tenantId);

  const ticket = await prisma.kOTTicket.create({
    data: {
      tenantId,
      orderId,
      kotNumber,
      kitchenSection: kitchenSection || "MAIN_KITCHEN",
      status: KOTStatus.QUEUED,
      notes: order.notes || null,
    },
    include: {
      order: {
        include: {
          items: true,
          customer: true,
        },
      },
    },
  });

  logger.info("KOT_TICKET_GENERATED", {
    tenantId,
    orderId,
    kotNumber,
    kitchenSection: ticket.kitchenSection,
  });

  return ticket;
}

/**
 * Updates KOT ticket status with state machine transition guards.
 */
export async function updateKOTStatus(
  tenantId: string,
  kotId: string,
  nextStatus: KOTStatus
) {
  const ticket = await prisma.kOTTicket.findFirst({
    where: { id: kotId, tenantId },
  });

  if (!ticket) {
    throw new Error("KOT ticket not found or cross-tenant access violation");
  }

  const currentStatus = ticket.status;
  const allowed = ALLOWED_KOT_TRANSITIONS[currentStatus] || [];

  if (!allowed.includes(nextStatus)) {
    throw new Error(
      `Invalid KOT status transition from ${currentStatus} to ${nextStatus}`
    );
  }

  const updated = await prisma.kOTTicket.update({
    where: { id: kotId },
    data: { status: nextStatus },
    include: {
      order: {
        include: {
          items: true,
          customer: true,
        },
      },
    },
  });

  logger.info("KOT_STATUS_UPDATED", {
    tenantId,
    kotId,
    kotNumber: ticket.kotNumber,
    previousStatus: currentStatus,
    newStatus: nextStatus,
  });

  return updated;
}

/**
 * Retrieves KOT tickets for tenant with optional section and status filtering.
 */
export async function getTenantKOTTickets(
  tenantId: string,
  filters?: KOTFilters
) {
  const whereClause: Prisma.KOTTicketWhereInput = {
    tenantId,
  };

  if (filters?.status) {
    whereClause.status = filters.status;
  } else {
    // By default for KDS, show active tickets (exclude SERVED unless explicitly requested)
    whereClause.status = {
      in: [KOTStatus.QUEUED, KOTStatus.PREPARING, KOTStatus.READY],
    };
  }

  if (filters?.kitchenSection && filters.kitchenSection !== "ALL") {
    whereClause.kitchenSection = filters.kitchenSection;
  }

  return prisma.kOTTicket.findMany({
    where: whereClause,
    include: {
      order: {
        include: {
          items: true,
          customer: true,
        },
      },
    },
    orderBy: { createdAt: "asc" }, // Oldest tickets first on KDS line
    take: filters?.limit || 50,
  });
}
