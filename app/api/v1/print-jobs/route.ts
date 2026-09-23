import type { NextRequest } from "next/server";
import { requireTenant } from "@/lib/auth/guards";
import { route } from "@/lib/http/route";
import { pollPrintJobs } from "@/lib/services/printing";
import { parseInput } from "@/lib/validation/core";
import { printJobPollSchema } from "@/lib/validation/printing";

export const dynamic = "force-dynamic";

/**
 * RH-PRN-01 — `GET /api/v1/print-jobs?since=&status=&jobType=` (`print_job:read`, S1-P16-T006).
 * Polled every 10 s by the printing console (ADR-009): `since` is the previous response's `serverTime`, and the
 * answer carries every job of the caller's tenant that changed at or after it, so a row can move from Waiting to
 * Printing to Printed without a reload. Tenant scope comes from the session, never from the query string.
 */
export const GET = route(async (request: NextRequest) => {
  const ctx = await requireTenant("print_job:read");
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const { since, status, jobType } = parseInput(printJobPollSchema, params);
  return pollPrintJobs(ctx, { since: since ? new Date(since) : undefined, status, jobType });
});
