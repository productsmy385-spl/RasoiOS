import type { NextRequest } from "next/server";
import { requireAgent } from "@/lib/auth/agent";
import { route } from "@/lib/http/route";
import { reportPrinterDiscovery } from "@/lib/services/printing";
import { parseInput } from "@/lib/validation/core";
import { agentDiscoveryParamsSchema, agentDiscoveryReportSchema } from "@/lib/validation/printing";
import { agentApiRateLimit, readAgentJson } from "../../agent-request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * RH-AGT-06 — `POST /api/v1/print-agent/discoveries/{discoveryId}` (RASOIOS-ADR-015).
 *
 * The agent's single report for a LAN printer scan it picked up from its claim response. Accepted only for a RUNNING
 * scan of the calling agent in the calling agent's tenant (both from the bearer token); anything else is 409. Every
 * reported device is validated as untrusted LAN input: private IPv4 only, bounded text, at most 64 devices.
 */
export const POST = route<{ params: Promise<{ discoveryId: string }> }>(async (request: NextRequest, context) => {
  const ctx = await requireAgent(request);
  const limited = await agentApiRateLimit(ctx);
  if (limited) return limited;

  const { discoveryId } = parseInput(agentDiscoveryParamsSchema, await context.params);
  const report = await readAgentJson(request, agentDiscoveryReportSchema);
  return reportPrinterDiscovery(ctx, discoveryId, report);
});
