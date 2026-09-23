import type { NextRequest } from "next/server";
import { requireAgent } from "@/lib/auth/agent";
import { route } from "@/lib/http/route";
import { recordHeartbeat } from "@/lib/services/printing";
import { agentHeartbeatSchema } from "@/lib/validation/printing";
import { agentApiRateLimit, readAgentJson } from "../agent-request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * RH-AGT-02 — `POST /api/v1/print-agent/heartbeat` (ADR-007 §7, S1-P16-T005).
 *
 * The agent says it is alive every 30 s and reports what it observed about each of its printers. A printer's health
 * in the console is exactly this report and nothing else (BA-30): the cloud never probes a printer, so it never
 * claims a state it has not been told. Printer ids that are not assigned to the calling agent are ignored and logged
 * as a security event — they are never applied to another tenant's row (TI-041).
 */
export const POST = route(async (request: NextRequest) => {
  const ctx = await requireAgent(request);
  const limited = await agentApiRateLimit(ctx);
  if (limited) return limited;

  const input = await readAgentJson(request, agentHeartbeatSchema);
  return recordHeartbeat(ctx, input);
});
