import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { GET as lookupRoute } from "@/app/api/v1/customers/lookup/route";
import {
  anonymizeCustomerAction,
  archiveCustomerAction,
  createCustomerAction,
  getCustomerHistoryAction,
  getCustomersAction,
  updateCustomerAction,
} from "@/app/restaurant/customers/actions";
import { consume } from "@/lib/security/rate-limit";
import { testDb } from "../setup/db";
import { asSeedUser, invokeAction, invokeRoute, seedOnce, seeded, tenantIdOf } from "../helpers/actors";
import { dataOf, errorOf, expectSameNotFound, RANDOM_UUID } from "../orders/helpers";

// S1-P13-T001/T002 — SA-CUS-01…04, LD-CUS-01/02 and RH-CUS-01: minimal data, E.164 normalisation, duplicate-phone
// rule, masked audit trail (SC-PII-03), archive and irreversible anonymisation, history paging, POS lookup and its
// rate limit, and tenant isolation with 404 parity.
const db = testDb();
const A = tenantIdOf("A");
const B = tenantIdOf("B");
const SAM_A = seeded("A", "customer:sam");
const created: string[] = [];

beforeAll(seedOnce, 120_000);

afterEach(async () => {
  if (created.length > 0) await db.customer.deleteMany({ where: { id: { in: created.splice(0) } } });
});

async function newCustomer(fields: Record<string, unknown>) {
  const customer = dataOf(await invokeAction(createCustomerAction, fields as never));
  created.push(customer.id);
  return customer;
}

const lookup = (q: string) => invokeRoute(lookupRoute as never, { url: `/api/v1/customers/lookup?q=${encodeURIComponent(q)}` });

describe("TC-CUST-001 create", () => {
  it("normalises the phone to E.164, keeps the audit masked, and refuses a duplicate phone", async () => {
    const { userId } = await asSeedUser("A", "CASHIER");
    const customer = await newCustomer({ fullName: "Ravi Kumar", phoneE164: "+91 98450 12345", email: "Ravi.Kumar@Example.com", notes: "Prefers window seat" });
    expect(customer).toMatchObject({ fullName: "Ravi Kumar", phoneE164: "+919845012345", email: "ravi.kumar@example.com" });
    expect((await db.customer.findUniqueOrThrow({ where: { id: customer.id } })).tenantId).toBe(A);

    const audit = await db.auditLog.findFirstOrThrow({ where: { action: "customer.created", resourceId: customer.id } });
    expect(audit).toMatchObject({ tenantId: A, actorUserId: userId, actorRole: "CASHIER" });
    const recorded = JSON.stringify(audit.afterState);
    expect(recorded).not.toContain("+919845012345");
    expect(recorded).not.toContain("ravi.kumar@example.com");
    expect(recorded).not.toContain("Ravi Kumar");
    expect(recorded).toContain("r***@example.com");

    // The same number again is 409 PHONE_EXISTS.
    const duplicate = errorOf(await invokeAction(createCustomerAction, { fullName: "Someone Else", phoneE164: "+919845012345" }));
    expect(duplicate.code).toBe("PHONE_EXISTS");
  });

  it("requires customer:create and rejects a tenantId or an unknown key", async () => {
    for (const role of ["KITCHEN"] as const) {
      await asSeedUser("A", role);
      expect(errorOf(await invokeAction(createCustomerAction, { fullName: "Nope" })).code, role).toBe("FORBIDDEN");
    }
    await asSeedUser("A", "CASHIER");
    expect(errorOf(await invokeAction(createCustomerAction, { fullName: "X", tenantId: B } as never)).code).toBe("VALIDATION_ERROR");
    expect(errorOf(await invokeAction(createCustomerAction, { fullName: "A" })).code).toBe("VALIDATION_ERROR");
    expect(errorOf(await invokeAction(createCustomerAction, { fullName: "Valid Name", phoneE164: "12345" })).code).toBe("VALIDATION_ERROR");
  });
});

describe("TC-CUST-004 update", () => {
  it("changes only the fields sent, masks both sides of the audit, and keeps another tenant's customer out of reach", async () => {
    await asSeedUser("A", "MANAGER");
    const customer = await newCustomer({ fullName: "Anita Desai", phoneE164: "+919845099999", email: "anita@example.com" });

    const updated = dataOf(await invokeAction(updateCustomerAction, { customerId: customer.id, fullName: "Anita D", email: "" }));
    expect(updated).toMatchObject({ fullName: "Anita D", email: null, phoneE164: "+919845099999" });

    const audit = await db.auditLog.findFirstOrThrow({ where: { action: "customer.updated", resourceId: customer.id } });
    expect(JSON.stringify(audit.beforeState)).not.toContain("anita@example.com");
    expect(audit.beforeState).toMatchObject({ fullName: "A. D." });

    const foreign = await db.customer.findFirstOrThrow({ where: { tenantId: B } });
    expectSameNotFound(
      await invokeAction(updateCustomerAction, { customerId: foreign.id, fullName: "Hijacked" }),
      await invokeAction(updateCustomerAction, { customerId: RANDOM_UUID, fullName: "Hijacked" }),
    );
    expect((await db.customer.findUniqueOrThrow({ where: { id: foreign.id } })).fullName).not.toBe("Hijacked");
  });
});

describe("TC-CUST-006 archive and anonymise", () => {
  it("archiving hides the customer from lists and lookup while their orders keep the link", async () => {
    await asSeedUser("A", "TENANT_ADMIN");
    const customer = await newCustomer({ fullName: "Archive Me", phoneE164: "+919845011111" });
    expect(dataOf(await invokeAction(getCustomersAction, {})).customers.map((c) => c.id)).toContain(customer.id);

    expect(dataOf(await invokeAction(archiveCustomerAction, { customerId: customer.id })).isArchived).toBe(true);
    expect(dataOf(await invokeAction(getCustomersAction, {})).customers.map((c) => c.id)).not.toContain(customer.id);
    expect((await lookup("Archive Me")).body).toMatchObject({ customers: [] });
    expect(await db.auditLog.count({ where: { action: "customer.archived", resourceId: customer.id } })).toBe(1);
  });

  it("anonymising is TENANT_ADMIN only, needs the confirmation phrase, and clears the personal data for good", async () => {
    await asSeedUser("A", "TENANT_ADMIN");
    const customer = await newCustomer({ fullName: "Erase Me", phoneE164: "+919845022222", email: "erase@example.com", notes: "VIP" });

    await asSeedUser("A", "MANAGER");
    expect(errorOf(await invokeAction(anonymizeCustomerAction, { customerId: customer.id, confirmPhrase: "ANONYMISE" })).code).toBe("FORBIDDEN");

    await asSeedUser("A", "TENANT_ADMIN");
    expect(errorOf(await invokeAction(anonymizeCustomerAction, { customerId: customer.id, confirmPhrase: "yes" } as never)).code).toBe("VALIDATION_ERROR");

    const anonymised = dataOf(await invokeAction(anonymizeCustomerAction, { customerId: customer.id, confirmPhrase: "ANONYMISE" }));
    expect(anonymised).toMatchObject({ fullName: "Removed customer", phoneE164: null, email: null, notes: null, isAnonymized: true });

    const row = await db.customer.findUniqueOrThrow({ where: { id: customer.id } });
    expect(row.anonymizedAt).toBeInstanceOf(Date);
    expect([row.phoneE164, row.email, row.notes]).toEqual([null, null, null]);
    const audit = await db.auditLog.findFirstOrThrow({ where: { action: "customer.anonymized", resourceId: customer.id } });
    expect(JSON.stringify(audit)).not.toContain("erase@example.com");

    // Editing an anonymised customer is refused, so the erasure cannot be undone through the UI.
    expect(errorOf(await invokeAction(updateCustomerAction, { customerId: customer.id, fullName: "Back Again" })).code).toBe("CUSTOMER_ANONYMIZED");
  });
});

describe("TC-CUST-002 history", () => {
  it("lists the customer's orders newest first and omits amounts for a WAITER", async () => {
    await asSeedUser("A", "MANAGER");
    const withAmounts = dataOf(await invokeAction(getCustomerHistoryAction, { customerId: SAM_A }));
    expect(withAmounts.customer.id).toBe(SAM_A);
    expect(withAmounts.orders.length).toBeGreaterThan(0);
    expect(withAmounts.orders.every((o) => o.totalAmount !== null)).toBe(true);
    const times = withAmounts.orders.map((o) => Date.parse(o.createdAt));
    expect(times).toEqual([...times].sort((a, b) => b - a));

    await asSeedUser("A", "WAITER");
    const waiter = dataOf(await invokeAction(getCustomerHistoryAction, { customerId: SAM_A }));
    expect(waiter.orders.every((o) => o.totalAmount === null)).toBe(true);

    // Paging returns a cursor and never repeats an order.
    await asSeedUser("A", "MANAGER");
    const firstPage = dataOf(await invokeAction(getCustomerHistoryAction, { customerId: SAM_A, limit: 1 }));
    expect(firstPage.orders).toHaveLength(1);
    if (firstPage.nextCursor) {
      const second = dataOf(await invokeAction(getCustomerHistoryAction, { customerId: SAM_A, limit: 1, cursor: firstPage.nextCursor }));
      expect(second.orders[0]?.id).not.toBe(firstPage.orders[0].id);
    }
  });
});

describe("TC-CUST-003 / TC-CUST-005 lookup", () => {
  it("matches partial name, phone and email within the tenant, caps at 10 and needs 3 characters", async () => {
    await asSeedUser("A", "CASHIER");
    const byName = (await lookup("Sam")).body as { customers: Array<{ id: string }> };
    expect(byName.customers.map((c) => c.id)).toContain(SAM_A);
    const byPhone = (await lookup("9900000001")).body as { customers: Array<{ id: string }> };
    expect(byPhone.customers.map((c) => c.id)).toContain(SAM_A);

    expect((await lookup("Sa")).status).toBe(422);
    expect((await lookup("%Sam%")).body).toMatchObject({ customers: [] }); // wildcards are matched literally, not as SQL

    for (let i = 0; i < 12; i++) await newCustomer({ fullName: `Lookup Person ${i}`, phoneE164: `+9198450${String(30000 + i)}` });
    const capped = (await lookup("Lookup Person")).body as { customers: unknown[] };
    expect(capped.customers).toHaveLength(10);

    // Tenant B's customers are never returned, even by their exact name.
    const foreign = await db.customer.findFirstOrThrow({ where: { tenantId: B } });
    const cross = (await lookup(foreign.fullName)).body as { customers: Array<{ id: string }> };
    expect(cross.customers.map((c) => c.id)).not.toContain(foreign.id);
  });

  it("TC-CUST-005 KITCHEN cannot reach any customer endpoint", async () => {
    await asSeedUser("A", "KITCHEN");
    expect((await lookup("Sam")).status).toBe(403);
    expect(errorOf(await invokeAction(getCustomersAction, {})).code).toBe("FORBIDDEN");
    expect(errorOf(await invokeAction(getCustomerHistoryAction, { customerId: SAM_A })).code).toBe("FORBIDDEN");
    expect(errorOf(await invokeAction(archiveCustomerAction, { customerId: SAM_A })).code).toBe("FORBIDDEN");
  });

  it("stops a caller who searches more than 60 times a minute (SC-RL-01)", async () => {
    const { userId } = await asSeedUser("A", "CASHIER");
    // Spend the budget through the limiter itself rather than 60 timed HTTP calls, so the assertion cannot straddle
    // a window boundary; then prove the endpoint refuses the next request.
    const policy = { limit: 60, windowSec: 60, failOpen: false } as const;
    let result = await consume("customer.lookup", `${A}:${userId}`, policy);
    let spent = 1;
    while (result.allowed && spent < policy.limit * 2) {
      result = await consume("customer.lookup", `${A}:${userId}`, policy);
      spent++;
    }
    // The window this test shares with the lookups above still refuses within one minute's budget.
    expect(result.allowed).toBe(false);
    expect(spent).toBeLessThanOrEqual(policy.limit);

    const refused = await lookup("Sam Taylor");
    expect(refused.status).toBe(429);
    expect(refused.headers.get("retry-after")).toBeTruthy();
  }, 60_000);
});
