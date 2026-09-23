import { Prisma } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { seedDatabase, type SeedSummary } from "@/prisma/seed-data/build";
import { seedId } from "@/prisma/seed-data/ids";
import { disconnectTestDb, resetDatabase, testDb } from "../setup/db";

// TC-DB-002 — the development seed is idempotent, isolated per tenant and internally consistent (S1-P02-T007).
const db = testDb();
const now = new Date("2026-09-15T08:30:00.000Z"); // 14:00 in Kolkata, 04:30 in New York
const options = { now, superAdminEmail: "owner+clerk_test@example.com", appUrl: "http://localhost:3000" };

let first: SeedSummary;
let second: SeedSummary;

beforeAll(async () => {
  await resetDatabase(db);
  first = await seedDatabase(db, options);
  second = await seedDatabase(db, options);
}, 120_000);
afterAll(disconnectTestDb);

const sum = (values: Prisma.Decimal[]) => values.reduce((a, b) => a.add(b), new Prisma.Decimal(0));

describe("TC-DB-002 development seed", () => {
  it("runs twice without creating duplicates", async () => {
    expect(Object.values(first).reduce((a, b) => a + b, 0)).toBeGreaterThan(300);
    expect(Object.values(second).every((n) => n === 0)).toBe(true);
    expect(await db.tenant.count()).toBe(2);
    expect(await db.order.count()).toBe(first.orders);
  });

  it("creates two tenants, each with every tenant role, and a platform SUPER_ADMIN", async () => {
    const tenants = await db.tenant.findMany({ include: { memberships: true, restaurant: true }, orderBy: { name: "asc" } });
    expect(tenants.map((t) => t.name)).toEqual(["Harbour Grill", "Spice Route"]);
    for (const tenant of tenants) {
      const activeRoles = tenant.memberships.filter((m) => m.status === "ACTIVE").map((m) => m.role).sort();
      expect(activeRoles).toEqual(["CASHIER", "KITCHEN", "MANAGER", "TENANT_ADMIN", "WAITER"]);
      expect(tenant.memberships.some((m) => m.status === "INVITED")).toBe(true);
    }
    const [a, b] = [tenants.find((t) => t.slug === "spice-route")!, tenants.find((t) => t.slug === "harbour-grill")!];
    expect([a.restaurant?.timezone, a.restaurant?.currencyCode]).toEqual(["Asia/Kolkata", "INR"]);
    expect([b.restaurant?.timezone, b.restaurant?.currencyCode]).toEqual(["America/New_York", "USD"]);
    const admin = await db.user.findUniqueOrThrow({ where: { email: options.superAdminEmail } });
    expect(admin.platformRole).toBe("SUPER_ADMIN");
    expect(await db.userTenant.count({ where: { userId: admin.id } })).toBe(0); // platform role, not a membership
  });

  it("gives staff distinct emails per tenant", async () => {
    const users = await db.user.findMany({ where: { email: { contains: "+clerk_test@example.com" } } });
    expect(new Set(users.map((u) => u.email)).size).toBe(users.length);
    expect(users.filter((u) => u.email.startsWith("spiceroute.")).length).toBe(6);
    expect(users.filter((u) => u.email.startsWith("harbourgrill.")).length).toBe(6);
  });

  it("uses the same content names in both tenants so leaks are detectable by content", async () => {
    for (const name of ["Starters", "Mains", "Beverages"]) {
      expect(await db.menuCategory.count({ where: { name } })).toBe(2);
    }
    expect(await db.customer.count({ where: { fullName: "Sam Taylor" } })).toBe(2);
  });

  it("covers every order, payment, KOT, print-job, agent and social-post state in each tenant", async () => {
    for (const tenant of await db.tenant.findMany()) {
      const where = { tenantId: tenant.id };
      const distinct = async <T,>(rows: Promise<T[]>, key: keyof T) => new Set((await rows).map((r) => r[key]));
      expect(await distinct(db.order.findMany({ where }), "status")).toEqual(new Set(["NEW", "ACCEPTED", "PREPARING", "READY", "COMPLETED", "CANCELLED", "REFUNDED"]));
      expect(await distinct(db.order.findMany({ where }), "paymentStatus")).toEqual(new Set(["UNPAID", "PARTIALLY_PAID", "PAID", "PARTIALLY_REFUNDED", "REFUNDED"]));
      expect(await distinct(db.kotTicket.findMany({ where }), "status")).toEqual(new Set(["QUEUED", "PREPARING", "READY", "SERVED", "CANCELLED"]));
      expect(await distinct(db.printJob.findMany({ where }), "status")).toEqual(new Set(["PENDING", "PROCESSING", "PRINTED", "FAILED"]));
      expect(await distinct(db.printJob.findMany({ where }), "jobType")).toEqual(new Set(["KOT", "RECEIPT", "TEST"]));
      expect(await distinct(db.printAgent.findMany({ where }), "status")).toEqual(new Set(["PENDING_PAIRING", "ACTIVE", "REVOKED"]));
      expect(await distinct(db.transaction.findMany({ where }), "type")).toEqual(new Set(["PAYMENT", "REFUND"]));
      expect(await distinct(db.transaction.findMany({ where }), "status")).toEqual(new Set(["SUCCESS", "VOIDED"]));
      expect(await distinct(db.dailyMenu.findMany({ where }), "status")).toEqual(new Set(["PUBLISHED", "DRAFT"]));
      expect(await distinct(db.socialPost.findMany({ where }), "status")).toEqual(new Set(["DRAFT", "READY", "MARKED_POSTED"]));
    }
  });

  it("keeps order totals equal to their lines (INV-02, INV-03)", async () => {
    const orders = await db.order.findMany({ include: { items: true } });
    for (const order of orders) {
      expect(order.subtotalAmount.eq(sum(order.items.map((i) => i.lineSubtotal))), order.orderNumber).toBe(true);
      expect(order.taxAmount.eq(sum(order.items.map((i) => i.lineTax))), order.orderNumber).toBe(true);
      expect(order.totalAmount.eq(order.subtotalAmount.add(order.taxAmount))).toBe(true);
    }
  });

  it("keeps paid and refunded amounts equal to the SUCCESS ledger (INV-04)", async () => {
    const orders = await db.order.findMany({ include: { transactions: true } });
    for (const order of orders) {
      const ok = order.transactions.filter((t) => t.status === "SUCCESS");
      expect(order.paidAmount.eq(sum(ok.filter((t) => t.type === "PAYMENT").map((t) => t.amount))), order.orderNumber).toBe(true);
      expect(order.refundedAmount.eq(sum(ok.filter((t) => t.type === "REFUND").map((t) => t.amount))), order.orderNumber).toBe(true);
    }
  });

  it("creates KOTs only for orders that were accepted (INV-05)", async () => {
    const withKots = await db.order.findMany({ where: { kotTickets: { some: {} } }, select: { status: true } });
    expect(withKots.every((o) => o.status !== "NEW")).toBe(true);
    expect(await db.kotTicket.count({ where: { order: { status: "NEW" } } })).toBe(0);
  });

  it("sets numbering counters to the last number issued per business date (ADR-010 §6)", async () => {
    for (const counter of await db.tenantCounter.findMany()) {
      if (counter.counterType === "ORDER") {
        const numbers = await db.order.findMany({ where: { tenantId: counter.tenantId, businessDate: counter.businessDate }, select: { orderNumber: true } });
        expect(Math.max(...numbers.map((n) => Number(n.orderNumber.split("-")[1])))).toBe(counter.lastValue);
      } else {
        const kots = await db.kotTicket.findMany({ where: { tenantId: counter.tenantId, businessDate: counter.businessDate }, select: { kotNumber: true } });
        expect(Math.max(...kots.map((k) => Number(k.kotNumber.slice(2))))).toBe(counter.lastValue);
      }
    }
  });

  it("dates each order by the restaurant's time zone, not the server's", async () => {
    const aOrder = await db.order.findUniqueOrThrow({ where: { id: seedId("a:order:o1") } });
    const bOrder = await db.order.findUniqueOrThrow({ where: { id: seedId("b:order:o1") } });
    expect(aOrder.businessDate.toISOString().slice(0, 10)).toBe("2026-09-15");
    expect(bOrder.businessDate.toISOString().slice(0, 10)).toBe("2026-09-15");
    expect(aOrder.orderNumber.startsWith("20260915-")).toBe(true);
  });

  it("stores only hashes of agent credentials", async () => {
    const agents = await db.printAgent.findMany();
    for (const agent of agents) {
      if (agent.tokenHash) expect(agent.tokenHash).toMatch(/^[0-9a-f]{64}$/);
      if (agent.pairingCodeHash) expect(agent.pairingCodeHash).toMatch(/^[0-9a-f]{64}$/);
    }
  });
});
