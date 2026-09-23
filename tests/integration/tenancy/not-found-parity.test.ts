import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { createRefundAction, recordPaymentAction } from "@/app/restaurant/transactions/actions";
import ReceiptPage from "@/app/restaurant/billing/receipt/[orderId]/page";
import { updateKOTStatusAction } from "@/app/restaurant/kds/actions";
import { updateOrderStatusAction } from "@/app/restaurant/orders/actions";
import type { ControlFlow } from "../helpers/actors";
import { asSeedUser, invokeAction, invokeLoader, seedOnce, seeded, tenantIdOf } from "../helpers/actors";
import { testDb } from "../setup/db";

// TC-TENANT-003 — requesting a random UUID and a Tenant B id as Tenant A produce byte-identical 404 responses
// (S1-P04-T005, SC-TEN-04). The per-request `requestId` is the only field allowed to differ.
const db = testDb();
const RANDOM_UUID = "7f3e2b1a-9c4d-4e8f-a1b2-c3d4e5f60718";

beforeAll(seedOnce, 120_000);

/** The serialized response with the per-request id blanked, so two responses can be compared byte for byte. */
function bytesOf(result: unknown): string {
  const value = result as { ok?: boolean; error?: Record<string, unknown> } | ControlFlow;
  if ("error" in value && value.error) return JSON.stringify({ ...value, error: { ...value.error, requestId: "<request-id>" } });
  return JSON.stringify(value);
}

async function probe(call: (id: string) => Promise<unknown>, foreignId: string): Promise<{ foreign: string; random: string }> {
  await asSeedUser("A", "TENANT_ADMIN");
  const foreign = bytesOf(await call(foreignId));
  const random = bytesOf(await call(RANDOM_UUID));
  return { foreign, random };
}

describe("TC-TENANT-003 not-found parity", () => {
  it("order, KOT, payment, refund and receipt surfaces answer a Tenant B id exactly like a random UUID", async () => {
    const B = tenantIdOf("B");
    const bOrder = seeded("B", "order:o1");
    const bKot = await db.kotTicket.findFirstOrThrow({ where: { tenantId: B }, select: { id: true } });
    const bPayment = await db.transaction.findFirstOrThrow({ where: { tenantId: B, type: "PAYMENT", status: "SUCCESS" }, select: { id: true } });

    const surfaces: Array<[string, (id: string) => Promise<unknown>, string]> = [
      ["order transition", (id) => invokeAction(updateOrderStatusAction, { orderId: id, status: "ACCEPTED" } as never), bOrder],
      ["KOT transition", (id) => invokeAction(updateKOTStatusAction, { kotId: id, toStatus: "PREPARING" }), bKot.id],
      ["payment", (id) => invokeAction(recordPaymentAction, { orderId: id, idempotencyKey: randomUUID(), method: "CASH", amount: "10.00", amountTendered: "10.00" }), bOrder],
      ["refund", (id) => invokeAction(createRefundAction, { paymentTransactionId: id, idempotencyKey: randomUUID(), amount: "1.00", reason: "Parity probe" }), bPayment.id],
      ["receipt page", (id) => invokeLoader(ReceiptPage, { params: Promise.resolve({ orderId: id }) }), bOrder],
    ];

    for (const [surface, call, foreignId] of surfaces) {
      const { foreign, random } = await probe(call, foreignId);
      expect(foreign, surface).toBe(random);
      expect(foreign, surface).toMatch(/NOT_FOUND|"notFound":true/);
      expect(foreign, `${surface} leaks Tenant B`).not.toMatch(/Harbour|Sam Taylor|USD/);
    }
  });
});
