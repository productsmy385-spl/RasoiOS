import type { NextRequest } from "next/server";
import { requireAgent } from "@/lib/auth/agent";
import { route } from "@/lib/http/route";
import { acknowledgePrintJob } from "@/lib/services/printing";
import { parseInput } from "@/lib/validation/core";
import { agentAckSchema, agentJobParamsSchema } from "@/lib/validation/printing";
import { agentApiRateLimit, readAgentJson } from "../../../agent-request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * RH-AGT-04 — `POST /api/v1/print-agent/jobs/{jobId}/ack` (ADR-007 §4, S1-P16-T005).
 *
 * The acknowledgement is what makes a job PRINTED (BR-PRINT-01); no other code path writes that status
 * (TC-PRINT-006). It is accepted only for a job of the calling agent's tenant, assigned to the calling agent, in
 * PROCESSING, whose current claim token matches. Another tenant's job and an unknown id are both 404; a token from a
 * lease that has since been re-claimed is 409 `STALE_CLAIM`; repeating an acknowledgement already applied is 200
 * with no change (ADV-013, ADV-014).
 */
export const POST = route<{ params: Promise<{ jobId: string }> }>(async (request: NextRequest, context) => {
  const ctx = await requireAgent(request);
  const limited = await agentApiRateLimit(ctx);
  if (limited) return limited;

  const { jobId } = parseInput(agentJobParamsSchema, await context.params);
  const input = await readAgentJson(request, agentAckSchema);
  return acknowledgePrintJob(ctx, jobId, {
    claimToken: input.claimToken,
    result: input.result,
    ...(input.errorCode ? { errorCode: input.errorCode } : {}),
    errorMessage: input.errorMessage,
  });
});
