import { randomUUID } from "node:crypto";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as printJobsPollRoute } from "@/app/api/v1/print-jobs/route";
import { GET as configRoute } from "@/app/api/v1/print-agent/config/route";
import { POST as heartbeatRoute } from "@/app/api/v1/print-agent/heartbeat/route";
import { POST as ackRoute } from "@/app/api/v1/print-agent/jobs/[jobId]/ack/route";
import { POST as claimRoute } from "@/app/api/v1/print-agent/jobs/claim/route";
import { POST as pairRoute } from "@/app/api/v1/print-agent/pair/route";
import { getPrintingConsoleAction } from "@/app/restaurant/printing/actions";
import { asAnonymous, asSeedUser, invokeAction, invokeRoute, seedOnce, tenantIdOf } from "../helpers/actors";
import { testDb } from "../setup/db";
import { activeAgent, callAgent, dataOf, testJob, testPrinter, TRUSTED_HOPS_FOR_TESTS, type TestAgent } from "./helpers";

/**
 * TC-PRINT-015, TI-041…TI-046 and ADV-012…ADV-015 — printing across the tenant boundary (S1-P16-T008, ADR-007,
 * threat-model T-007/T-008/T-015, security.md SC-TEN-07, SC-PRINT-01…05).
 *
 * The premise of every case: an agent's tenant comes from the PRINT_AGENT row its bearer token resolved to. Nothing a
 * caller sends — a body field, a path id, a claim token, a printer id — can move it.
 */
const db = testDb();
const B = tenantIdOf("B");

let agentA: TestAgent;
let agentB: TestAgent;
let printerA: string;
let printerB: string;

beforeAll(async () => {
  await seedOnce();
  agentA = await activeAgent("A", { name: "Tenant A agent" });
  agentB = await activeAgent("B", { name: "Tenant B agent" });
  printerA = (await testPrinter("A", { agentId: agentA.agentId, name: "A printer" })).id;
  printerB = (await testPrinter("B", { agentId: agentB.agentId, name: "B printer" })).id;
}, 120_000);

describe("TI-043 / ADV-012 claiming stays inside the token's tenant", () => {
  it("Tenant A's agent claims only Tenant A jobs while Tenant B has work waiting", async () => {
    await db.printJob.deleteMany({ where: { printerId: { in: [printerA, printerB] } } });
    const aJob = await testJob("A", printerA, { dedupeKey: `TEST:iso-a-${randomUUID()}` });
    const bJob = await testJob("B", printerB, { dedupeKey: `TEST:iso-b-${randomUUID()}` });

    const claim = await callAgent(claimRoute, { url: "/api/v1/print-agent/jobs/claim", body: { max: 10 }, token: agentA.token });
    expect(claim.status).toBe(200);
    const jobs = (claim.body as { jobs: Array<{ jobId: string; printerId: string }> }).jobs;
    expect(jobs.map((j) => j.jobId)).toEqual([aJob.id]);
    expect(jobs.every((j) => j.printerId === printerA)).toBe(true);
    expect((await db.printJob.findUniqueOrThrow({ where: { id: bJob.id } })).status).toBe("PENDING");
    expect((await db.printJob.findUniqueOrThrow({ where: { id: bJob.id } })).printAgentId).toBeNull();
  });

  it("ADV-012 a body carrying Tenant B's id or printer id is 422, never a filter", async () => {
    await db.printJob.deleteMany({ where: { printerId: { in: [printerA, printerB] } } });
    const bJob = await testJob("B", printerB, { dedupeKey: `TEST:adv12-${randomUUID()}` });

    for (const body of [{ max: 1, tenantId: B }, { max: 1, printerId: printerB }, { max: 1, printAgentId: agentB.agentId }]) {
      const response = await callAgent(claimRoute, { url: "/api/v1/print-agent/jobs/claim", body, token: agentA.token });
      expect(response.status, JSON.stringify(body)).toBe(422);
      expect(response.body).toMatchObject({ error: { code: "VALIDATION_ERROR" } });
    }
    expect((await db.printJob.findUniqueOrThrow({ where: { id: bJob.id } })).status).toBe("PENDING");
  });

  it("a printer moved to another agent stops feeding the old one", async () => {
    await db.printJob.deleteMany({ where: { printerId: printerA } });
    await testJob("A", printerA, { dedupeKey: `TEST:moved-${randomUUID()}` });
    const secondAgent = await activeAgent("A", { name: "Replacement agent" });
    await db.printer.update({ where: { id: printerA }, data: { printAgentId: secondAgent.agentId } });
    try {
      const oldAgent = await callAgent(claimRoute, { url: "/api/v1/print-agent/jobs/claim", body: { max: 5 }, token: agentA.token });
      expect((oldAgent.body as { jobs: unknown[] }).jobs).toEqual([]);
      const newAgent = await callAgent(claimRoute, { url: "/api/v1/print-agent/jobs/claim", body: { max: 5 }, token: secondAgent.token });
      expect((newAgent.body as { jobs: unknown[] }).jobs).toHaveLength(1);
    } finally {
      await db.printer.update({ where: { id: printerA }, data: { printAgentId: agentA.agentId } });
    }
  });
});

describe("ADV-013 / ADV-014 acknowledgement cannot be forged or replayed", () => {
  it("TC-PRINT-015 Tenant A's token cannot acknowledge Tenant B's job, even with B's real claim token", async () => {
    await db.printJob.deleteMany({ where: { printerId: printerB } });
    await testJob("B", printerB, { dedupeKey: `TEST:adv13-${randomUUID()}` });
    const bClaim = await callAgent(claimRoute, { url: "/api/v1/print-agent/jobs/claim", body: { max: 1 }, token: agentB.token });
    const stolen = (bClaim.body as { jobs: Array<{ jobId: string; claimToken: string }> }).jobs[0];

    const forged = await callAgent(ackRoute, {
      url: `/api/v1/print-agent/jobs/${stolen.jobId}/ack`,
      params: { jobId: stolen.jobId },
      body: { claimToken: stolen.claimToken, result: "PRINTED" },
      token: agentA.token,
    });
    expect(forged.status).toBe(404);
    expect(forged.body).toMatchObject({ error: { code: "NOT_FOUND" } });

    const unknown = await callAgent(ackRoute, {
      url: `/api/v1/print-agent/jobs/${randomUUID()}/ack`,
      params: { jobId: randomUUID() },
      body: { claimToken: stolen.claimToken, result: "PRINTED" },
      token: agentA.token,
    });
    expect(unknown.status).toBe(404);

    const row = await db.printJob.findUniqueOrThrow({ where: { id: stolen.jobId } });
    expect(row).toMatchObject({ status: "PROCESSING", tenantId: B, printAgentId: agentB.agentId });
    expect(row.printedAt).toBeNull();
  });

  it("ADV-014 a stale claim token is 409 and a re-claimed lease invalidates the old one", async () => {
    await db.printJob.deleteMany({ where: { printerId: printerA } });
    const job = await testJob("A", printerA, { dedupeKey: `TEST:adv14-${randomUUID()}` });
    const first = await callAgent(claimRoute, { url: "/api/v1/print-agent/jobs/claim", body: { max: 1 }, token: agentA.token });
    const firstClaim = (first.body as { jobs: Array<{ jobId: string; claimToken: string }> }).jobs[0];

    // The agent crashes; the lease expires and the job is claimed again with a new token.
    await db.printJob.update({ where: { id: job.id }, data: { leaseExpiresAt: new Date(Date.now() - 1) } });
    const second = await callAgent(claimRoute, { url: "/api/v1/print-agent/jobs/claim", body: { max: 1 }, token: agentA.token });
    const secondClaim = (second.body as { jobs: Array<{ jobId: string; claimToken: string }> }).jobs[0];
    expect(secondClaim.claimToken).not.toBe(firstClaim.claimToken);

    const replay = await callAgent(ackRoute, {
      url: `/api/v1/print-agent/jobs/${job.id}/ack`,
      params: { jobId: job.id },
      body: { claimToken: firstClaim.claimToken, result: "PRINTED" },
      token: agentA.token,
    });
    expect(replay.status).toBe(409);
    expect(replay.body).toMatchObject({ error: { code: "STALE_CLAIM" } });
    expect((await db.printJob.findUniqueOrThrow({ where: { id: job.id } })).status).toBe("PROCESSING");

    const current = await callAgent(ackRoute, {
      url: `/api/v1/print-agent/jobs/${job.id}/ack`,
      params: { jobId: job.id },
      body: { claimToken: secondClaim.claimToken, result: "PRINTED" },
      token: agentA.token,
    });
    expect(current.status).toBe(200);
  });

  it("ADV-014 a PRINTED acknowledgement for a job that was never claimed changes nothing", async () => {
    await db.printJob.deleteMany({ where: { printerId: printerA } });
    const job = await testJob("A", printerA, { dedupeKey: `TEST:never-${randomUUID()}` });
    const response = await callAgent(ackRoute, {
      url: `/api/v1/print-agent/jobs/${job.id}/ack`,
      params: { jobId: job.id },
      body: { claimToken: randomUUID(), result: "PRINTED" },
      token: agentA.token,
    });
    expect(response.status).toBe(404);
    const row = await db.printJob.findUniqueOrThrow({ where: { id: job.id } });
    expect(row).toMatchObject({ status: "PENDING", printedAt: null, attemptCount: 0 });
  });
});

describe("TI-041 heartbeat and configuration stay inside the token's tenant", () => {
  it("ignores health reported for a printer that is not this agent's, and never touches the other row", async () => {
    const before = await db.printer.findUniqueOrThrow({ where: { id: printerB } });
    const response = await callAgent(heartbeatRoute, {
      url: "/api/v1/print-agent/heartbeat",
      body: { printers: [{ printerId: printerB, health: "ONLINE" }, { printerId: printerA, health: "ERROR" }] },
      token: agentA.token,
    });
    expect(response.status).toBe(200);

    const after = await db.printer.findUniqueOrThrow({ where: { id: printerB } });
    expect(after.health).toBe(before.health);
    expect(after.healthReportedAt).toEqual(before.healthReportedAt);
    expect((await db.printer.findUniqueOrThrow({ where: { id: printerA } })).health).toBe("ERROR");
  });

  it("TC-AGENT-005 configuration lists only the calling agent's printers", async () => {
    const config = await callAgent(configRoute, { url: "/api/v1/print-agent/config", method: "GET", token: agentA.token });
    const printers = (config.body as { printers: Array<{ printerId: string; connectionAddress: string }> }).printers;
    expect(printers.map((p) => p.printerId)).toEqual([printerA]);
    expect(JSON.stringify(printers)).not.toContain(printerB);

    const bConfig = await callAgent(configRoute, { url: "/api/v1/print-agent/config", method: "GET", token: agentB.token });
    expect((bConfig.body as { printers: Array<{ printerId: string }> }).printers.map((p) => p.printerId)).toEqual([printerB]);
  });
});

describe("TI-042 the console shows one tenant only", () => {
  it("LD-PRN-01 returns Tenant A's agents, printers and jobs, and never Tenant B's", async () => {
    await asSeedUser("A", "TENANT_ADMIN");
    const view = dataOf(await invokeAction(getPrintingConsoleAction, {}));

    const bAgents = new Set((await db.printAgent.findMany({ where: { tenantId: B }, select: { id: true } })).map((a) => a.id));
    const bPrinters = new Set((await db.printer.findMany({ where: { tenantId: B }, select: { id: true } })).map((p) => p.id));
    const bJobs = new Set((await db.printJob.findMany({ where: { tenantId: B }, select: { id: true } })).map((j) => j.id));
    expect(bAgents.size + bPrinters.size + bJobs.size).toBeGreaterThan(0);

    expect(view.agents.some((a) => bAgents.has(a.id))).toBe(false);
    expect(view.printers.some((p) => bPrinters.has(p.id))).toBe(false);
    expect(view.jobs.some((j) => bJobs.has(j.id))).toBe(false);
    expect(view.agents.some((a) => a.id === agentA.agentId)).toBe(true);
    // Token hashes never leave the server; only the display prefix does.
    expect(JSON.stringify(view)).not.toContain("tokenHash");
  });

  it("hides printer addresses and token prefixes from roles that do not manage them (LD-PRN-01 projection)", async () => {
    await asSeedUser("A", "KITCHEN");
    const kitchenView = dataOf(await invokeAction(getPrintingConsoleAction, {}));
    expect(kitchenView.printers.length).toBeGreaterThan(0);
    expect(kitchenView.printers.every((p) => p.connectionAddress === null), "no device addresses").toBe(true);
    expect(kitchenView.agents.every((a) => a.tokenPrefix === null), "no token prefixes").toBe(true);
    // The queue itself is still readable, which is what `print_job:read` is for.
    expect(kitchenView.printers.every((p) => p.name.length > 0 && p.health !== undefined)).toBe(true);

    await asSeedUser("A", "TENANT_ADMIN");
    const adminView = dataOf(await invokeAction(getPrintingConsoleAction, {}));
    expect(adminView.printers.some((p) => typeof p.connectionAddress === "string")).toBe(true);
    expect(adminView.agents.some((a) => typeof a.tokenPrefix === "string")).toBe(true);
  });

  it("RH-PRN-01 polling is tenant-scoped and refuses an anonymous caller", async () => {
    await asSeedUser("A", "KITCHEN");
    const response = await invokeRoute(printJobsPollRoute as never, { url: "/api/v1/print-jobs" });
    expect(response.status).toBe(200);
    const jobs = (response.body as { jobs: Array<{ id: string }> }).jobs;
    const bJobs = new Set((await db.printJob.findMany({ where: { tenantId: B }, select: { id: true } })).map((j) => j.id));
    expect(jobs.some((j) => bJobs.has(j.id))).toBe(false);

    await asSeedUser("A", "WAITER");
    expect((await invokeRoute(printJobsPollRoute as never, { url: "/api/v1/print-jobs" })).status).toBe(403);

    asAnonymous();
    expect((await invokeRoute(printJobsPollRoute as never, { url: "/api/v1/print-jobs" })).status).toBe(401);
  });

  it("RH-PRN-01 ignores a tenantId in the query string (422 rather than honoured)", async () => {
    await asSeedUser("A", "MANAGER");
    const response = await invokeRoute(printJobsPollRoute as never, { url: `/api/v1/print-jobs?tenantId=${B}` });
    expect(response.status).toBe(422);
    expect(response.body).toMatchObject({ error: { code: "VALIDATION_ERROR" } });
  });
});

describe("ADV-015 pairing brute force (T-015)", () => {
  // Per-address budgets exist only where the app can prove the address: one proxy of ours in front, as in production
  // (lib/http/client-ip.ts). Unset, every caller shares one bucket — which is the safe answer, but not what is being
  // tested here.
  beforeEach(() => vi.stubEnv("TRUSTED_PROXY_HOPS", TRUSTED_HOPS_FOR_TESTS));
  afterEach(() => vi.unstubAllEnvs());

  it("stops a run of guesses from one address after 5 attempts and pairs nothing", async () => {
    const ip = "203.0.113.200";
    const statuses: number[] = [];
    for (let i = 0; i < 12; i++) {
      const response = await callAgent(pairRoute, {
        url: "/api/v1/print-agent/pair",
        body: { pairingCode: `ABCDEF${String(i).padStart(2, "0")}`.slice(0, 8).toUpperCase().replace(/[01IO]/g, "2"), agentVersion: "1.0.0", osInfo: "Windows 11" },
        ip,
      });
      statuses.push(response.status);
    }
    expect(statuses.slice(0, 5).every((status) => status === 401), "the first five are rejected on their merits").toBe(true);
    expect(statuses.slice(5).every((status) => status === 429), "the rest are rate limited").toBe(true);
    expect(await db.printAgent.count({ where: { status: "ACTIVE", agentVersion: "1.0.0", pairedAt: { not: null }, name: { startsWith: "Guess" } } })).toBe(0);
  });

  it("another address still has its own budget", async () => {
    const response = await callAgent(pairRoute, {
      url: "/api/v1/print-agent/pair",
      body: { pairingCode: "ABCDEFGH", agentVersion: "1.0.0", osInfo: "Windows 11" },
      ip: "203.0.113.201",
    });
    expect(response.status).toBe(401);
  });
});
