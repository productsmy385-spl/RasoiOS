import { databaseReady } from "@/lib/data/health";
import { logger } from "@/lib/logger";

/**
 * RH-OPS-02 readiness (S1-P26-T003): Railway's health check path. 200 only when PostgreSQL answers within 2 s.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  const ready = await databaseReady(2000);
  if (!ready) logger.warn("health.not_ready", { dependency: "database" });
  return Response.json({ status: ready ? "ready" : "unavailable" }, { status: ready ? 200 : 503, headers: { "cache-control": "no-store" } });
}
