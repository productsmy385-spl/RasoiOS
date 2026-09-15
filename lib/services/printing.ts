import { prisma } from "@/lib/db/prisma";
import { PrintJobStatus, PrintJobType, Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";

export interface CreatePrintJobPayload {
  orderId?: string;
  kotTicketId?: string;
  jobType: PrintJobType;
  targetPrinter: string; // e.g. "KITCHEN_PRINTER_1", "CASHIER_RECEIPT"
  payload: Record<string, any>;
}

export interface PrintJobFilters {
  status?: PrintJobStatus;
  jobType?: PrintJobType;
  limit?: number;
}

/**
 * Enqueues a new print job for local thermal printer polling.
 */
export async function createPrintJob(
  tenantId: string,
  data: CreatePrintJobPayload
) {
  const printJob = await prisma.printJob.create({
    data: {
      tenantId,
      orderId: data.orderId || null,
      kotTicketId: data.kotTicketId || null,
      jobType: data.jobType,
      targetPrinter: data.targetPrinter,
      payload: data.payload,
      status: PrintJobStatus.PENDING,
      attempts: 0,
    },
  });

  logger.info("PRINT_JOB_CREATED", {
    tenantId,
    printJobId: printJob.id,
    jobType: data.jobType,
    targetPrinter: data.targetPrinter,
  });

  return printJob;
}

/**
 * Polls pending print jobs for a local agent and locks them to PROCESSING status.
 */
export async function pollPendingPrintJobs(
  tenantId: string,
  targetPrinter?: string,
  limit = 10
) {
  const whereClause: Prisma.PrintJobWhereInput = {
    tenantId,
    status: PrintJobStatus.PENDING,
  };

  if (targetPrinter && targetPrinter !== "ALL") {
    whereClause.targetPrinter = targetPrinter;
  }

  // Find pending jobs
  const pendingJobs = await prisma.printJob.findMany({
    where: whereClause,
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  if (pendingJobs.length === 0) {
    return [];
  }

  const jobIds = pendingJobs.map((j) => j.id);

  // Atomically update status to PROCESSING
  await prisma.printJob.updateMany({
    where: {
      id: { in: jobIds },
    },
    data: {
      status: PrintJobStatus.PROCESSING,
    },
  });

  logger.info("PRINT_JOBS_POLLED", {
    tenantId,
    count: pendingJobs.length,
    targetPrinter,
  });

  return pendingJobs.map((job) => ({
    ...job,
    status: PrintJobStatus.PROCESSING,
  }));
}

/**
 * Acknowledges print job completion or failure from local agent.
 */
export async function acknowledgePrintJob(
  tenantId: string,
  jobId: string,
  status: PrintJobStatus,
  errorLog?: string
) {
  const existingJob = await prisma.printJob.findFirst({
    where: { id: jobId, tenantId },
  });

  if (!existingJob) {
    throw new Error("Print job not found or cross-tenant access violation");
  }

  const updated = await prisma.printJob.update({
    where: { id: jobId },
    data: {
      status,
      attempts: existingJob.attempts + 1,
      errorLog: errorLog || null,
    },
  });

  logger.info("PRINT_JOB_ACKNOWLEDGED", {
    tenantId,
    jobId,
    status,
    attempts: updated.attempts,
  });

  return updated;
}

/**
 * Resets a failed print job back to PENDING for re-printing.
 */
export async function retryPrintJob(tenantId: string, jobId: string) {
  const existingJob = await prisma.printJob.findFirst({
    where: { id: jobId, tenantId },
  });

  if (!existingJob) {
    throw new Error("Print job not found or cross-tenant access violation");
  }

  const retried = await prisma.printJob.update({
    where: { id: jobId },
    data: {
      status: PrintJobStatus.PENDING,
      errorLog: null,
    },
  });

  logger.info("PRINT_JOB_RETRIED", {
    tenantId,
    jobId,
  });

  return retried;
}

/**
 * Retrieves print jobs log for tenant management console.
 */
export async function getTenantPrintJobs(
  tenantId: string,
  filters?: PrintJobFilters
) {
  const whereClause: Prisma.PrintJobWhereInput = {
    tenantId,
  };

  if (filters?.status) {
    whereClause.status = filters.status;
  }

  if (filters?.jobType) {
    whereClause.jobType = filters.jobType;
  }

  return prisma.printJob.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    take: filters?.limit || 50,
  });
}
