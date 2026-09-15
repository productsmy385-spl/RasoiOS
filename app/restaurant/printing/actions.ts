"use server";

import { z } from "zod";
import { PrintJobStatus, PrintJobType } from "@prisma/client";
import { getAuthenticatedSession } from "@/lib/auth/clerk";
import { resolveTenantContext, requirePermission } from "@/lib/auth/tenant-context";
import {
  getTenantPrintJobs,
  retryPrintJob,
  createPrintJob,
  CreatePrintJobPayload,
} from "@/lib/services/printing";
import { ValidationError } from "@/lib/errors";

const CreatePrintJobSchema = z.object({
  orderId: z.string().optional(),
  kotTicketId: z.string().optional(),
  jobType: z.nativeEnum(PrintJobType),
  targetPrinter: z.string().min(1, "Target printer name is required"),
  payload: z.record(z.any()),
});

export async function getPrintJobsAction(
  filters?: { status?: PrintJobStatus; jobType?: PrintJobType },
  requestedTenantId?: string
) {
  const session = await getAuthenticatedSession();
  const context = resolveTenantContext(session, requestedTenantId);

  const jobs = await getTenantPrintJobs(context.tenantId, filters);
  return { success: true, jobs };
}

export async function retryPrintJobAction(
  jobId: string,
  requestedTenantId?: string
) {
  const session = await getAuthenticatedSession();
  const context = resolveTenantContext(session, requestedTenantId);
  requirePermission(context, "tenant:manage_own");

  const retried = await retryPrintJob(context.tenantId, jobId);
  return { success: true, job: retried };
}

export async function createTestPrintJobAction(
  input: z.input<typeof CreatePrintJobSchema>,
  requestedTenantId?: string
) {
  const session = await getAuthenticatedSession();
  const context = resolveTenantContext(session, requestedTenantId);
  requirePermission(context, "tenant:manage_own");

  const parsed = CreatePrintJobSchema.safeParse(input);
  if (!parsed.success) {
    throw new ValidationError(
      "Invalid print job payload",
      parsed.error.flatten().fieldErrors
    );
  }

  const job = await createPrintJob(context.tenantId, parsed.data as CreatePrintJobPayload);
  return { success: true, job };
}
