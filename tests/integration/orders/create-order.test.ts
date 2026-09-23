import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { createStaffOrderAction } from "@/app/restaurant/orders/actions";
import { testDb } from "../setup/db";
import { asSeedUser, invokeAction, seedOnce, seeded, tenantIdOf } from "../helpers/actors";
import { dataOf, errorOf, expectSameNotFound, RANDOM_UUID, xminOf } from "./helpers";

// S1-P12-T004 — SA-ORD-01: `order:create` first, strict input, server-side pricing through lib/pricing, name/price/tax
// snapshots, variants and add-ons, idempotent submits, customer link that never overwrites a profile, and everything
// in one transaction with `order.created`.
const db = testDb();
const A = tenantIdOf("A");
const B = tenantIdOf("B");
const PANEER_A = seeded("A", "item:paneer-tikka"); // 280.00 @ 5 %, variants Half/Full
const LIME_SODA_A = seeded("A", "item:lime-soda"); // 80.00 @ 18 %, variants Sweet/Salted
const CHAI_A = seeded("A", "item:masala-chai"); // 40.00 @ 5 %, no variants
const BUTTER_CHICKEN_A = seeded("A", "item:butter-chicken"); // 360.00 @ 5 %, add-ons
const CHOWDER_B = seeded("B", "item:clam-chowder");

beforeAll(seedOnce, 120_000);

const orderCounts = async () => ({ a: await db.order.count({ where: { tenantId: A } }), b: await db.order.count({ where: { tenantId: B } }) });
const key = () => randomUUID();

const variantOf = (itemId: string, name: string) => db.menuItemVariant.findFirstOrThrow({ where: { tenantId: A, menuItemId: itemId, name }, select: { id: true, name: true, price: true } });
const addonOf = (itemId: string, name: string) => db.menuItemAddon.findFirstOrThrow({ where: { tenantId: A, menuItemId: itemId, name }, select: { id: true, name: true, price: true } });

describe("TC-ORDER-001 create order", () => {
  it("prices a dine-in order with a variant and add-ons on the server, snapshots everything, and audits in the same transaction", async () => {
    const cashier = await asSeedUser("A", "CASHIER");
    const full = await variantOf(PANEER_A, "Full"); // 280.00
    const naan = await addonOf(BUTTER_CHICKEN_A, "Butter Naan"); // 60.00
    const butter = await addonOf(BUTTER_CHICKEN_A, "Extra Butter"); // 30.00

    const { order } = dataOf(
      await invokeAction(createStaffOrderAction, {
        idempotencyKey: key(),
        orderType: "DINE_IN",
        tableLabel: "T4",
        notes: "Window seat",
        items: [
          { menuItemId: PANEER_A, variantId: full.id, quantity: 2, specialInstructions: "Extra chutney" },
          { menuItemId: BUTTER_CHICKEN_A, addonIds: [naan.id, butter.id], quantity: 1 },
        ],
      }),
    );

    // (280 × 2) + (360 + 60 + 30) = 560 + 450 = 1010; tax 5 % per line = 28.00 + 22.50 = 50.50
    expect(order).toMatchObject({ status: "NEW", orderType: "DINE_IN", tableLabel: "T4", subtotalAmount: "1010.00", taxAmount: "50.50", totalAmount: "1060.50" });
    expect(order.orderNumber).toMatch(/^\d{8}-\d{4}$/);

    const row = await db.order.findUniqueOrThrow({ where: { id: order.id }, include: { items: { include: { addons: true } } } });
    expect(row).toMatchObject({ tenantId: A, channel: "STAFF", priority: "NORMAL", createdByUserId: cashier.userId });
    const paneer = row.items.find((i) => i.menuItemId === PANEER_A)!;
    expect(paneer).toMatchObject({ itemNameSnapshot: "Paneer Tikka", variantNameSnapshot: "Full", quantity: 2, kotRound: 1, specialInstructions: "Extra chutney" });
    expect([paneer.unitPriceSnapshot.toFixed(2), paneer.taxRateSnapshot.toFixed(2), paneer.lineSubtotal.toFixed(2), paneer.lineTax.toFixed(2)]).toEqual(["280.00", "5.00", "560.00", "28.00"]);

    const chicken = row.items.find((i) => i.menuItemId === BUTTER_CHICKEN_A)!;
    expect(chicken.addonsTotalSnapshot.toFixed(2)).toBe("90.00");
    expect(chicken.addons.map((a) => [a.nameSnapshot, a.priceSnapshot.toFixed(2)]).sort()).toEqual([["Butter Naan", "60.00"], ["Extra Butter", "30.00"]]);
    expect(chicken.addons.every((a) => a.tenantId === A)).toBe(true);

    const audit = await db.auditLog.findFirstOrThrow({ where: { action: "order.created", resourceId: order.id } });
    expect(audit).toMatchObject({ tenantId: A, actorUserId: cashier.userId, actorRole: "CASHIER" });
    expect(audit.afterState).toMatchObject({ orderNumber: order.orderNumber, status: "NEW", itemCount: 2, totalAmount: "1060.50" });
    expect(await xminOf("audit_logs", audit.id)).toBe(await xminOf("orders", order.id));
  });

  it("sendToKitchen accepts the order and creates its tickets in the same transaction", async () => {
    await asSeedUser("A", "CASHIER");
    const { order } = dataOf(
      await invokeAction(createStaffOrderAction, {
        idempotencyKey: key(),
        orderType: "TAKEAWAY",
        sendToKitchen: true,
        items: [{ menuItemId: CHAI_A, quantity: 1 }],
      }),
    );
    expect(order.status).toBe("ACCEPTED");

    const kots = await db.kotTicket.findMany({ where: { tenantId: A, orderId: order.id } });
    expect(kots).toHaveLength(1);
    expect(kots[0]).toMatchObject({ status: "QUEUED", roundNumber: 1 });
    const [orderXmin] = await db.$queryRaw<{ xmin: string }[]>`SELECT xmin::text AS xmin FROM orders WHERE id = ${order.id}::uuid`;
    const [kotXmin] = await db.$queryRaw<{ xmin: string }[]>`SELECT xmin::text AS xmin FROM kot_tickets WHERE id = ${kots[0].id}::uuid`;
    expect(kotXmin.xmin).toBe(orderXmin.xmin);
  });

  it("only a manager or cashier may mark an order urgent", async () => {
    await asSeedUser("A", "WAITER");
    const denied = errorOf(await invokeAction(createStaffOrderAction, { idempotencyKey: key(), orderType: "DINE_IN", priority: "HIGH", items: [{ menuItemId: CHAI_A, quantity: 1 }] }));
    expect(denied.code).toBe("FORBIDDEN");

    await asSeedUser("A", "MANAGER");
    const { order } = dataOf(await invokeAction(createStaffOrderAction, { idempotencyKey: key(), orderType: "DINE_IN", priority: "HIGH", items: [{ menuItemId: CHAI_A, quantity: 1 }] }));
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).priority).toBe("HIGH");
  });
});

describe("TC-ORDER-003 the client never sends money, a tenant id or an unknown key", () => {
  it("rejects price, total, tax, discount and tenantId keys with 422 and writes nothing", async () => {
    await asSeedUser("A", "CASHIER");
    const before = await orderCounts();
    const payloads: Array<Record<string, unknown>> = [
      { price: "1.00" },
      { total: "1.00" },
      { taxAmount: "0.00" },
      { discount: "5.00" },
      { tenantId: B },
      { items: [{ menuItemId: CHAI_A, quantity: 1, unitPrice: "0.01" }] },
    ];
    for (const extra of payloads) {
      const error = errorOf(await invokeAction(createStaffOrderAction, { idempotencyKey: key(), orderType: "TAKEAWAY", items: [{ menuItemId: CHAI_A, quantity: 1 }], ...extra } as never));
      expect(error.code, JSON.stringify(extra)).toBe("VALIDATION_ERROR");
    }
    expect(await orderCounts()).toEqual(before);
  });

  it("rejects an empty cart, quantity outside 1–99 and more than 10 add-ons on a line", async () => {
    await asSeedUser("A", "CASHIER");
    for (const items of [
      [],
      [{ menuItemId: CHAI_A, quantity: 0 }],
      [{ menuItemId: CHAI_A, quantity: 100 }],
      [{ menuItemId: CHAI_A, quantity: 1, addonIds: Array.from({ length: 11 }, () => randomUUID()) }],
    ]) {
      expect(errorOf(await invokeAction(createStaffOrderAction, { idempotencyKey: key(), orderType: "TAKEAWAY", items } as never)).code).toBe("VALIDATION_ERROR");
    }
  });
});

describe("TC-ORDER-002 catalogue rules", () => {
  it("requires a variant for an item that has them, refuses a foreign variant or add-on, and reports unavailable items", async () => {
    await asSeedUser("A", "CASHIER");
    const half = await variantOf(PANEER_A, "Half");
    const naan = await addonOf(BUTTER_CHICKEN_A, "Butter Naan");

    const missingVariant = errorOf(await invokeAction(createStaffOrderAction, { idempotencyKey: key(), orderType: "TAKEAWAY", items: [{ menuItemId: PANEER_A, quantity: 1 }] }));
    expect(missingVariant).toMatchObject({ code: "VARIANT_REQUIRED" });
    expect(Object.keys(missingVariant.fieldErrors ?? {})).toEqual(["items.0.variantId"]);

    const foreignVariant = errorOf(await invokeAction(createStaffOrderAction, { idempotencyKey: key(), orderType: "TAKEAWAY", items: [{ menuItemId: LIME_SODA_A, variantId: half.id, quantity: 1 }] }));
    expect(foreignVariant.code).toBe("VARIANT_REQUIRED");

    const foreignAddon = errorOf(await invokeAction(createStaffOrderAction, { idempotencyKey: key(), orderType: "TAKEAWAY", items: [{ menuItemId: CHAI_A, quantity: 1, addonIds: [naan.id] }] }));
    expect(foreignAddon.code).toBe("INVALID_ADDON");

    // An unavailable item is 422 with its line; the order is not written.
    const before = await orderCounts();
    await db.menuItem.update({ where: { id: CHAI_A }, data: { isAvailable: false } });
    try {
      const unavailable = errorOf(await invokeAction(createStaffOrderAction, { idempotencyKey: key(), orderType: "TAKEAWAY", items: [{ menuItemId: CHAI_A, quantity: 1 }] }));
      expect(unavailable).toMatchObject({ code: "ITEM_UNAVAILABLE" });
      expect(Object.keys(unavailable.fieldErrors ?? {})).toEqual(["items.0.menuItemId"]);
    } finally {
      await db.menuItem.update({ where: { id: CHAI_A }, data: { isAvailable: true } });
    }
    expect(await orderCounts()).toEqual(before);
  });

  it("TI-024 another tenant's menu item is NOT_FOUND exactly like a random id, and nothing is written", async () => {
    await asSeedUser("A", "CASHIER");
    const before = await orderCounts();
    const foreign = await invokeAction(createStaffOrderAction, { idempotencyKey: key(), orderType: "TAKEAWAY", items: [{ menuItemId: CHOWDER_B, quantity: 1 }] });
    const random = await invokeAction(createStaffOrderAction, { idempotencyKey: key(), orderType: "TAKEAWAY", items: [{ menuItemId: RANDOM_UUID, quantity: 1 }] });
    expectSameNotFound(foreign, random);
    expect(await orderCounts()).toEqual(before);
  });
});

describe("TC-ORDER-004 snapshots are historical", () => {
  it("editing the menu item after ordering leaves the order's name, price, tax and totals unchanged", async () => {
    await asSeedUser("A", "CASHIER");
    const { order } = dataOf(await invokeAction(createStaffOrderAction, { idempotencyKey: key(), orderType: "TAKEAWAY", items: [{ menuItemId: CHAI_A, quantity: 2 }] }));
    const before = await db.order.findUniqueOrThrow({ where: { id: order.id }, include: { items: true } });

    await db.menuItem.update({ where: { id: CHAI_A }, data: { name: "Masala Chai (Large)", basePrice: "99.00", taxRate: "12.00" } });
    try {
      const after = await db.order.findUniqueOrThrow({ where: { id: order.id }, include: { items: true } });
      expect(after.items[0].itemNameSnapshot).toBe(before.items[0].itemNameSnapshot);
      expect(after.items[0].unitPriceSnapshot.toFixed(2)).toBe(before.items[0].unitPriceSnapshot.toFixed(2));
      expect(after.items[0].taxRateSnapshot.toFixed(2)).toBe(before.items[0].taxRateSnapshot.toFixed(2));
      expect(after.totalAmount.toFixed(2)).toBe(before.totalAmount.toFixed(2));
    } finally {
      await db.menuItem.update({ where: { id: CHAI_A }, data: { name: "Masala Chai", basePrice: "40.00", taxRate: "5.00" } });
    }
  });
});

describe("TC-ORDER-008 idempotency", () => {
  it("replaying the same key returns the original order and creates nothing", async () => {
    await asSeedUser("A", "CASHIER");
    const idempotencyKey = key();
    const payload = { idempotencyKey, orderType: "TAKEAWAY" as const, items: [{ menuItemId: CHAI_A, quantity: 1 }] };
    const first = dataOf(await invokeAction(createStaffOrderAction, payload)).order;
    const before = await orderCounts();
    const replay = dataOf(await invokeAction(createStaffOrderAction, payload)).order;

    expect(replay.id).toBe(first.id);
    expect(replay.orderNumber).toBe(first.orderNumber);
    expect(await orderCounts()).toEqual(before);
    expect(await db.auditLog.count({ where: { action: "order.created", resourceId: first.id } })).toBe(1);
  });

  it("two concurrent submits with the same key create exactly one order", async () => {
    await asSeedUser("A", "CASHIER");
    const payload = { idempotencyKey: key(), orderType: "TAKEAWAY" as const, items: [{ menuItemId: CHAI_A, quantity: 1 }] };
    const results = await Promise.all([invokeAction(createStaffOrderAction, payload), invokeAction(createStaffOrderAction, payload)]);
    const ids = new Set(results.filter((r) => "ok" in r && r.ok).map((r) => dataOf(r).order.id));
    // Both submits answer with the same order — the loser of the race replays the winner's — and only one row exists.
    expect(ids.size).toBe(1);
    expect(results.every((r) => "ok" in r && r.ok)).toBe(true);
    expect(await db.order.count({ where: { tenantId: A, idempotencyKey: payload.idempotencyKey } })).toBe(1);
    expect(await db.auditLog.count({ where: { action: "order.created", resourceId: [...ids][0] } })).toBe(1);
  });
});

describe("TC-CUST-007 customers are linked, never overwritten", () => {
  it("links an existing customer by id and by phone without changing their stored profile", async () => {
    await asSeedUser("A", "CASHIER");
    const existing = await db.customer.findFirstOrThrow({ where: { tenantId: A, phoneE164: { not: null } } });

    const byId = dataOf(await invokeAction(createStaffOrderAction, { idempotencyKey: key(), orderType: "TAKEAWAY", customerId: existing.id, items: [{ menuItemId: CHAI_A, quantity: 1 }] })).order;
    expect((await db.order.findUniqueOrThrow({ where: { id: byId.id } })).customerId).toBe(existing.id);

    const byPhone = dataOf(
      await invokeAction(createStaffOrderAction, {
        idempotencyKey: key(),
        orderType: "TAKEAWAY",
        customer: { name: "Someone Else", phone: existing.phoneE164! },
        items: [{ menuItemId: CHAI_A, quantity: 1 }],
      }),
    ).order;
    expect((await db.order.findUniqueOrThrow({ where: { id: byPhone.id } })).customerId).toBe(existing.id);
    expect(await db.customer.findUniqueOrThrow({ where: { id: existing.id } })).toMatchObject({ fullName: existing.fullName, email: existing.email });
  });

  it("another tenant's customer id is NOT_FOUND and a new customer needs customer:create", async () => {
    await asSeedUser("A", "CASHIER");
    const foreign = await db.customer.findFirstOrThrow({ where: { tenantId: B } });
    const notFound = await invokeAction(createStaffOrderAction, { idempotencyKey: key(), orderType: "TAKEAWAY", customerId: foreign.id, items: [{ menuItemId: CHAI_A, quantity: 1 }] });
    const random = await invokeAction(createStaffOrderAction, { idempotencyKey: key(), orderType: "TAKEAWAY", customerId: RANDOM_UUID, items: [{ menuItemId: CHAI_A, quantity: 1 }] });
    expectSameNotFound(notFound, random);

    // KITCHEN holds neither order:create nor customer:create.
    await asSeedUser("A", "KITCHEN");
    expect(errorOf(await invokeAction(createStaffOrderAction, { idempotencyKey: key(), orderType: "TAKEAWAY", items: [{ menuItemId: CHAI_A, quantity: 1 }] })).code).toBe("FORBIDDEN");
  });
});
