import { NextRequest, NextResponse } from "next/server";
import { pollPendingPrintJobs, acknowledgePrintJob } from "@/lib/services/printing";
import { PrintJobStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tenantId = searchParams.get("tenantId");
    const printer = searchParams.get("printer") || undefined;

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: "tenantId query parameter is required" },
        { status: 400 }
      );
    }

    const jobs = await pollPendingPrintJobs(tenantId, printer);

    return NextResponse.json({
      success: true,
      count: jobs.length,
      jobs,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to poll print jobs" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, jobId, status, errorLog } = body;

    if (!tenantId || !jobId || !status) {
      return NextResponse.json(
        { success: false, error: "tenantId, jobId, and status are required" },
        { status: 400 }
      );
    }

    if (status !== PrintJobStatus.PRINTED && status !== PrintJobStatus.FAILED) {
      return NextResponse.json(
        { success: false, error: "Status must be PRINTED or FAILED" },
        { status: 400 }
      );
    }

    const updatedJob = await acknowledgePrintJob(
      tenantId,
      jobId,
      status,
      errorLog
    );

    return NextResponse.json({
      success: true,
      job: updatedJob,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to acknowledge print job" },
      { status: 500 }
    );
  }
}
