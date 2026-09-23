/**
 * RH-OPS-01 liveness (S1-P26-T003): the process answers. No version, environment or dependency detail.
 */
export const dynamic = "force-dynamic";

export function GET(): Response {
  return Response.json({ status: "ok" }, { headers: { "cache-control": "no-store" } });
}
