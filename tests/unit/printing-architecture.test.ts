import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createPrintJob,
  pollPendingPrintJobs,
  acknowledgePrintJob,
  retryPrintJob,
} from "@/lib/services/printing";
import { prisma } from "@/lib/db/prisma";
import { PrintJobStatus, PrintJobType } from "@prisma/client";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    printJob: {
      create: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe("Cloud Thermal Printing Architecture Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const tenantId = "tenant_taj_1";

  it("createPrintJob should enqueue job in PENDING status with 0 attempts", async () => {
    vi.mocked(prisma.printJob.create).mockResolvedValue({
      id: "job_100",
      tenantId,
      orderId: "order_1",
      kotTicketId: null,
      jobType: PrintJobType.RECEIPT,
      targetPrinter: "CASHIER_RECEIPT",
      payload: { test: true },
      status: PrintJobStatus.PENDING,
      attempts: 0,
      errorLog: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    const job = await createPrintJob(tenantId, {
      orderId: "order_1",
      jobType: PrintJobType.RECEIPT,
      targetPrinter: "CASHIER_RECEIPT",
      payload: { test: true },
    });

    expect(job.status).toBe(PrintJobStatus.PENDING);
    expect(job.targetPrinter).toBe("CASHIER_RECEIPT");
  });

  it("pollPendingPrintJobs should query PENDING jobs and update them to PROCESSING", async () => {
    const mockJobs = [
      {
        id: "job_100",
        tenantId,
        status: PrintJobStatus.PENDING,
        targetPrinter: "KITCHEN_PRINTER_1",
      },
    ];

    vi.mocked(prisma.printJob.findMany).mockResolvedValue(mockJobs as never);
    vi.mocked(prisma.printJob.updateMany).mockResolvedValue({ count: 1 } as never);

    const polled = await pollPendingPrintJobs(tenantId, "KITCHEN_PRINTER_1");

    expect(prisma.printJob.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["job_100"] } },
      data: { status: PrintJobStatus.PROCESSING },
    });

    expect(polled.length).toBe(1);
    expect(polled[0].status).toBe(PrintJobStatus.PROCESSING);
  });

  it("acknowledgePrintJob should increment attempts and update status", async () => {
    vi.mocked(prisma.printJob.findFirst).mockResolvedValue({
      id: "job_100",
      tenantId,
      attempts: 1,
      status: PrintJobStatus.PROCESSING,
    } as never);

    vi.mocked(prisma.printJob.update).mockResolvedValue({
      id: "job_100",
      tenantId,
      attempts: 2,
      status: PrintJobStatus.PRINTED,
    } as never);

    const ack = await acknowledgePrintJob(
      tenantId,
      "job_100",
      PrintJobStatus.PRINTED
    );

    expect(ack.status).toBe(PrintJobStatus.PRINTED);
    expect(ack.attempts).toBe(2);
  });

  it("retryPrintJob should reset failed job to PENDING with cleared errorLog", async () => {
    vi.mocked(prisma.printJob.findFirst).mockResolvedValue({
      id: "job_100",
      tenantId,
      status: PrintJobStatus.FAILED,
      errorLog: "Paper jam",
    } as never);

    vi.mocked(prisma.printJob.update).mockResolvedValue({
      id: "job_100",
      tenantId,
      status: PrintJobStatus.PENDING,
      errorLog: null,
    } as never);

    const retried = await retryPrintJob(tenantId, "job_100");

    expect(retried.status).toBe(PrintJobStatus.PENDING);
    expect(retried.errorLog).toBeNull();
  });
});
