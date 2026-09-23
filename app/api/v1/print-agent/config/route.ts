import type { NextRequest } from "next/server";
import { requireAgent } from "@/lib/auth/agent";
import { route } from "@/lib/http/route";
import { getAgentConfig } from "@/lib/services/printing";
import { agentApiRateLimit } from "../agent-request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * RH-AGT-05 — `GET /api/v1/print-agent/config` (ADR-007 §2, S1-P16-T005).
 *
 * The agent's own printers and the intervals it should use. The list is built from `printer.print_agent_id` inside
 * the token's tenant, so an agent can never learn about another tenant's — or another agent's — printers
 * (TC-AGENT-005, TI-041).
 */
export const GET = route(async (request: NextRequest) => {
  const ctx = await requireAgent(request);
  const limited = await agentApiRateLimit(ctx);
  if (limited) return limited;

  return getAgentConfig(ctx);
});
