import type { NextRequest } from "next/server";
import { requireAgent } from "@/lib/auth/agent";
import { route } from "@/lib/http/route";
import { claimPrintJobs } from "@/lib/services/printing";
import { agentClaimSchema } from "@/lib/validation/printing";
import { agentApiRateLimit, readAgentJson } from "../../agent-request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * RH-AGT-03 — `POST /api/v1/print-agent/jobs/claim` (ADR-007 §3, S1-P16-T005).
 *
 * One atomic statement leases up to `max` due jobs to this agent (`FOR UPDATE SKIP LOCKED`), so two agents polling
 * at the same instant never take the same job (SC-PRINT-03, TC-PRINT-004). The query is bounded by the agent's own
 * tenant and its own printers, both taken from the token's PRINT_AGENT row — a `tenantId` or `printerId` in the body
 * is 422, not a filter (ADV-012).
 */
export const POST = route(async (request: NextRequest) => {
  const ctx = await requireAgent(request);
  const limited = await agentApiRateLimit(ctx);
  if (limited) return limited;

  const { max } = await readAgentJson(request, agentClaimSchema);
  return claimPrintJobs(ctx, max);
});
