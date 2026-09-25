import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as reportRoute } from "@/app/api/v1/print-agent/discoveries/[discoveryId]/route";
import { POST as claimRoute } from "@/app/api/v1/print-agent/jobs/claim/route";
import { getPrinterDiscoveryAction, startPrinterDiscoveryAction } from "@/app/restaurant/printing/actions";
import { DISCOVERY_PICKUP_MS } from "@/lib/services/printing";
import { fixedClock, overrideClock } from "@/lib/time/clock";
import { asSeedUser, invokeAction, seedOnce, seeded } from "../helpers/actors";
import { testDb } from "../setup/db";
import { activeAgent, callAgent, dataOf, errorOf, TRUSTED_HOPS_FOR_TESTS, type TestAgent } from "./helpers";

/**
 * TC-DISC-010…016 — console-requested LAN printer discovery (RASOIOS-ADR-015; SA-PRN-07, LD-PRN-04, RH-AGT-03/06).
 * Seed (Tenant A): the kitchen printer is LAN 192.168.x — the scan marks it "already added" by address.
 */
const db = testDb();
let agentA: TestAgent;
let agentB: TestAgent;
let kitchenAddress: string;
let restoreClock: (() => void) | null = null;

beforeAll(async () => {
  await seedOnce();
  agentA = await activeAgent("A", { name: "Scan PC A" });
  agentB = await activeAgent("B", { name: "Scan PC B" });
  kitchenAddress = (await db.printer.findUniqueOrThrow({ where: { id: seeded("A", "printer:kitchen") } })).connectionAddress;
}, 120_000);
beforeEach(() => vi.stubEnv("TRUSTED_PROXY_HOPS", TRUSTED_HOPS_FOR_TESTS));
afterEach(() => {
  vi.unstubAllEnvs();
  restoreClock?.();
  restoreClock = null;
});

const claim = (agent: TestAgent) => callAgent(claimRoute, { url: "/api/v1/print-agent/jobs/claim", body: { max: 1 }, token: agent.token });
const report = (agent: TestAgent, discoveryId: string, body: unknown) =>
  callAgent(reportRoute, { url: `/api/v1/print-agent/discoveries/${discoveryId}`, body, token: agent.token, params: { discoveryId } });

function kitchenDevice() {
  const [host, port] = kitchenAddress.split(":");
  return { address: host!, port: Number(port ?? 9100), protocol: "RAW_9100", rawPrinting: true, sources: ["PORT_PROBE"] };
}

describe("TC-DISC-010 request → agent picks up → report → console shows what was found", () => {
  it("round trip, with the already-configured printer marked", async () => {
    await asSeedUser("A", "TENANT_ADMIN");
    const started = dataOf(await invokeAction(startPrinterDiscoveryAction, { agentId: agentA.agentId }));
    expect(started).toMatchObject({ state: "REQUESTED", agentId: agentA.agentId, printers: [] });

    // A second click while it is open reuses the same scan.
    expect(dataOf(await invokeAction(startPrinterDiscoveryAction, { agentId: agentA.agentId })).id).toBe(started.id);

    // Another tenant's agent never receives it; this agent does, exactly once.
    expect((await claim(agentB)).body).toMatchObject({ discovery: null });
    expect((await claim(agentA)).body).toMatchObject({ discovery: { discoveryId: started.id } });
    expect((await claim(agentA)).body).toMatchObject({ discovery: null });
    await asSeedUser("A", "TENANT_ADMIN");
    expect(dataOf(await invokeAction(getPrinterDiscoveryAction, { discoveryId: started.id })).state).toBe("RUNNING");

    const found = [kitchenDevice(), { address: "192.168.1.120", port: 9100, protocol: "RAW_9100", rawPrinting: true, name: "POS-80C", sources: ["MDNS", "PORT_PROBE"] }];
    const reported = await report(agentA, started.id, { outcome: "COMPLETED", printers: found });
    expect(reported.status).toBe(200);

    const view = dataOf(await invokeAction(getPrinterDiscoveryAction, { discoveryId: started.id }));
    expect(view.state).toBe("COMPLETED");
    expect(view.printers.map((p) => [p.address, p.alreadyAddedAs !== null])).toEqual([
      [kitchenDevice().address, true],
      ["192.168.1.120", false],
    ]);
    // Nothing was registered by the scan.
    expect(await db.printer.count({ where: { connectionAddress: { startsWith: "192.168.1.120" } } })).toBe(0);

    // A second report is refused (the scan is no longer RUNNING).
    expect((await report(agentA, started.id, { outcome: "COMPLETED", printers: [] })).status).toBe(409);
    expect(await db.auditLog.count({ where: { action: "printer.discovery_requested", resourceId: started.id } })).toBe(1);
  });
});

describe("TC-DISC-011 offline and unresponsive agents", () => {
  it("an offline agent is refused up front", async () => {
    await db.printAgent.update({ where: { id: agentA.agentId }, data: { lastSeenAt: new Date(Date.now() - 10 * 60_000) } });
    try {
      await asSeedUser("A", "TENANT_ADMIN");
      expect(errorOf(await invokeAction(startPrinterDiscoveryAction, { agentId: agentA.agentId })).code).toBe("AGENT_OFFLINE");
    } finally {
      await db.printAgent.update({ where: { id: agentA.agentId }, data: { lastSeenAt: new Date() } });
    }
  });

  it("a request nobody picks up turns into AGENT_NOT_RESPONDING", async () => {
    await asSeedUser("A", "TENANT_ADMIN");
    const fresh = await activeAgent("A", { name: "Silent PC" });
    const started = dataOf(await invokeAction(startPrinterDiscoveryAction, { agentId: fresh.agentId }));
    restoreClock = overrideClock(fixedClock(new Date(Date.now() + DISCOVERY_PICKUP_MS + 5_000).toISOString()));
    expect(dataOf(await invokeAction(getPrinterDiscoveryAction, { discoveryId: started.id })).state).toBe("AGENT_NOT_RESPONDING");
  });
});

describe("TC-DISC-012 reports are untrusted input", () => {
  it("public addresses, unknown protocols, extra fields and oversize lists are 422", async () => {
    await asSeedUser("A", "TENANT_ADMIN");
    const extra = await activeAgent("A", { name: "Validation PC" });
    const started = dataOf(await invokeAction(startPrinterDiscoveryAction, { agentId: extra.agentId }));
    await claim(extra);
    for (const body of [
      { outcome: "COMPLETED", printers: [{ ...kitchenDevice(), address: "8.8.8.8" }] },
      { outcome: "COMPLETED", printers: [{ ...kitchenDevice(), protocol: "SMB" }] },
      { outcome: "COMPLETED", printers: [{ ...kitchenDevice(), tenantId: "x" }] },
      { outcome: "COMPLETED", printers: Array.from({ length: 65 }, (_, i) => ({ ...kitchenDevice(), address: `192.168.2.${i + 1}` })) },
    ]) {
      expect((await report(extra, started.id, body)).status).toBe(422);
    }
    expect((await report(extra, started.id, { outcome: "FAILED", errorCode: "NO_PRIVATE_NETWORK" })).status).toBe(200);
    await asSeedUser("A", "TENANT_ADMIN");
    expect(dataOf(await invokeAction(getPrinterDiscoveryAction, { discoveryId: started.id }))).toMatchObject({ state: "FAILED", errorCode: "NO_PRIVATE_NETWORK" });
  });
});

describe("TC-DISC-013 authorization and tenant isolation", () => {
  it("only printer managers can scan; another tenant can neither start, read nor answer A's scan", async () => {
    await asSeedUser("A", "CASHIER");
    expect(errorOf(await invokeAction(startPrinterDiscoveryAction, { agentId: agentA.agentId })).code).toBe("FORBIDDEN");

    await asSeedUser("A", "TENANT_ADMIN");
    const started = dataOf(await invokeAction(startPrinterDiscoveryAction, { agentId: agentA.agentId }));

    await asSeedUser("B", "TENANT_ADMIN");
    expect(errorOf(await invokeAction(startPrinterDiscoveryAction, { agentId: agentA.agentId })).code).toBe("NOT_FOUND");
    expect(errorOf(await invokeAction(getPrinterDiscoveryAction, { discoveryId: started.id })).code).toBe("NOT_FOUND");

    // Tenant B's agent cannot answer it, even with the id.
    expect((await report(agentB, started.id, { outcome: "COMPLETED", printers: [] })).status).toBe(409);
    await claim(agentA);
    expect((await report(agentB, started.id, { outcome: "COMPLETED", printers: [] })).status).toBe(409);
    expect((await report(agentA, started.id, { outcome: "COMPLETED", printers: [] })).status).toBe(200);
  });
});
