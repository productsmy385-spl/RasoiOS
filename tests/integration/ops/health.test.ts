import { describe, expect, it } from "vitest";
import { GET as health } from "@/app/api/health/route";
import { GET as ready } from "@/app/api/ready/route";
import { databaseReady } from "@/lib/data/health";
import { createPrismaClient } from "@/lib/db/prisma";

// TC-OBS-004 — liveness and readiness endpoints (S1-P26-T003, RH-OPS-01/02).
describe("TC-OBS-004 health and readiness", () => {
  it("/api/health returns 200 with a minimal body", async () => {
    const response = health();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("/api/ready returns 200 when the database answers", async () => {
    const response = await ready();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ready" });
  });

  it("reports unavailable (503) when the database is unreachable, then ready again once it is back", async () => {
    const down = createPrismaClient({ databaseUrl: "postgresql://nobody:nothing@127.0.0.1:1/unreachable?connect_timeout=1" });
    const started = Date.now();
    expect(await databaseReady(2000, down)).toBe(false);
    expect(Date.now() - started).toBeLessThan(4000);
    await down.$disconnect();
    // "Restored": the real application client answers.
    expect(await databaseReady(2000)).toBe(true);
  }, 20_000);

  it("the readiness body never includes version, host or error detail", async () => {
    const body = JSON.stringify(await (await ready()).json());
    expect(body).not.toMatch(/version|host|postgres|error|localhost/i);
  });
});
