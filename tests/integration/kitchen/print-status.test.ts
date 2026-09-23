import { beforeAll, describe, expect, it } from "vitest";
import { requireTenant } from "@/lib/auth/guards";
import { printStatusFor } from "@/lib/data/kot";
import { testDb } from "../setup/db";
import { asSeedUser, seedOnce, tenantIdOf } from "../helpers/actors";

// TC-KOT-006 — a ticket's print state is the newest non-reprint KOT job (S1-P14-T004): NONE without a job, then
// PENDING, PRINTED and FAILED as jobs change, in one query for the whole board and scoped to the caller's tenant.
const db = testDb();
const A = tenantIdOf("A");

beforeAll(seedOnce, 120_000);

async function ctxOf(tenant: "A" | "B") {
  await asSeedUser(tenant, "KITCHEN");
  return requireTenant("kot:read");
}

async function newJob(kotTicketId: string, status: "PENDING" | "PROCESSING" | "PRINTED" | "FAILED", options: { isReprint?: boolean; tenantId?: string; createdAt?: Date } = {}) {
  const tenantId = options.tenantId ?? A;
  const printer = await db.printer.findFirstOrThrow({ where: { tenantId }, select: { id: true } });
  return db.printJob.create({
    data: {
      tenantId,
      printerId: printer.id,
      jobType: "KOT",
      kotTicketId,
      dedupeKey: `test-${Math.random().toString(36).slice(2)}`,
      isReprint: options.isReprint ?? false,
      payload: { version: 1, kind: "KOT" },
      status,
      ...(options.createdAt ? { createdAt: options.createdAt } : {}),
      ...(status === "PRINTED" ? { printedAt: new Date() } : {}),
      ...(status === "FAILED" ? { failedAt: new Date(), lastErrorCode: "PRINTER_OFFLINE" } : {}),
    },
    select: { id: true },
  });
}

describe("TC-KOT-006 KOT print status", () => {
  it("is NONE without a job and then follows the newest non-reprint job", async () => {
    const ctx = await ctxOf("A");
    const ticket = await db.kotTicket.findFirstOrThrow({ where: { tenantId: A, printJobs: { none: {} } }, select: { id: true } });

    expect((await printStatusFor(ctx, [ticket.id])).get(ticket.id)).toBeUndefined();

    const pending = await newJob(ticket.id, "PENDING", { createdAt: new Date("2026-09-20T10:00:00Z") });
    expect((await printStatusFor(ctx, [ticket.id])).get(ticket.id)).toBe("PENDING");

    await db.printJob.update({ where: { id: pending.id }, data: { status: "PRINTED", printedAt: new Date() } });
    expect((await printStatusFor(ctx, [ticket.id])).get(ticket.id)).toBe("PRINTED");

    // A newer job wins; a reprint never changes the ticket's print state.
    await newJob(ticket.id, "FAILED", { createdAt: new Date("2026-09-21T10:00:00Z") });
    expect((await printStatusFor(ctx, [ticket.id])).get(ticket.id)).toBe("FAILED");
    await newJob(ticket.id, "PRINTED", { isReprint: true, createdAt: new Date("2026-09-22T10:00:00Z") });
    expect((await printStatusFor(ctx, [ticket.id])).get(ticket.id)).toBe("FAILED");

    await db.printJob.deleteMany({ where: { kotTicketId: ticket.id } });
  });

  it("answers for a whole board in one query and never reports another tenant's job", async () => {
    const ctx = await ctxOf("A");
    const tickets = await db.kotTicket.findMany({ where: { tenantId: A }, take: 3, select: { id: true } });
    expect(tickets.length).toBe(3);
    await newJob(tickets[0].id, "PENDING");
    await newJob(tickets[1].id, "PROCESSING");

    const statuses = await printStatusFor(ctx, tickets.map((t) => t.id));
    expect(statuses.get(tickets[0].id)).toBe("PENDING");
    expect(statuses.get(tickets[1].id)).toBe("PROCESSING");
    expect(statuses.has(tickets[2].id)).toBe(false);

    // Tenant B asking about Tenant A's tickets gets nothing at all (SC-TEN-02).
    const ctxB = await ctxOf("B");
    expect((await printStatusFor(ctxB, tickets.map((t) => t.id))).size).toBe(0);

    await db.printJob.deleteMany({ where: { kotTicketId: { in: tickets.map((t) => t.id) } } });
  });

  it("returns an empty map for no ids without touching the database", async () => {
    const ctx = await ctxOf("A");
    expect((await printStatusFor(ctx, [])).size).toBe(0);
  });
});
