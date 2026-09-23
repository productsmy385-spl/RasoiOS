import "server-only";
import { headers } from "next/headers";
import { clientIpFrom } from "./client-ip";

/**
 * Request metadata for the audit trail (S1-P23-T003, SC-LOG-01).
 *
 * The address comes from `lib/http/client-ip.ts`, which decides how much of `X-Forwarded-For` the deployment can
 * prove; that same rule keys the print-agent pairing rate limit, so there is one answer to "who is calling" in the
 * whole application.
 */
const MAX_USER_AGENT = 256;

export type RequestMeta = { ipAddress: string | null; userAgent: string | null };

export { clientIpFrom, isIpAddress } from "./client-ip";

/** Reads the current request's metadata; never throws outside a request scope (background jobs have none). */
export async function requestMeta(): Promise<RequestMeta> {
  try {
    const incoming = await headers();
    const forwarded = incoming.get("x-forwarded-for");
    const userAgent = incoming.get("user-agent");
    return {
      ipAddress: clientIpFrom(forwarded),
      userAgent: userAgent ? userAgent.slice(0, MAX_USER_AGENT) : null,
    };
  } catch {
    return { ipAddress: null, userAgent: null };
  }
}
