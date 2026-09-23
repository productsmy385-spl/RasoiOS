import { isValidElement, type ReactElement, type ReactNode } from "react";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import CustomersPage from "@/app/restaurant/customers/page";
import CustomerPage from "@/app/restaurant/customers/[customerId]/page";
import { anonymizeCustomerAction, archiveCustomerAction, createCustomerAction, updateCustomerAction } from "@/app/restaurant/customers/actions";
import { DataTable } from "@/components/ui/data-table";
import type { CustomerDto, CustomerListItemDto, CustomerOrderDto } from "@/lib/data/customers";
import { ANONYMISE_CONFIRM_PHRASE } from "@/lib/validation/customers";
import { testDb } from "../setup/db";
import { asSeedUser, invokeAction, invokeLoader, seedOnce, tenantIdOf } from "../helpers/actors";
import { dataOf, errorOf } from "../orders/helpers";

/**
 * TC-CUST-008 — the customer screens (S1-P13-T003). The pages are Server Components, so they are rendered through
 * `invokeLoader` and asserted on the rows they hand their table and the customer they hand the action controls.
 */
const db = testDb();
const A = tenantIdOf("A");
const B = tenantIdOf("B");

const created: string[] = [];

beforeAll(seedOnce, 120_000);

afterAll(async () => {
  if (created.length > 0) await db.customer.deleteMany({ where: { id: { in: created }, orders: { none: {} } } });
});

function propsOf<P>(node: ReactNode, type: unknown): P | undefined {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = propsOf<P>(child, type);
      if (found) return found;
    }
    return undefined;
  }
  if (!isValidElement(node)) return undefined;
  const element = node as ReactElement<{ children?: ReactNode }>;
  if (element.type === type) return element.props as P;
  return propsOf<P>(element.props.children, type);
}

/** Everything a person would read: an element through its props, a plain object (a table row) through its values. */
function textOf(node: unknown, depth = 0): string {
  if (depth > 12) return "";
  if (node === null || node === undefined || typeof node === "boolean" || typeof node === "function" || typeof node === "symbol") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map((child) => textOf(child, depth + 1)).join(" ");
  if (typeof node !== "object") return "";
  const props = (node as { props?: Record<string, unknown> }).props;
  return Object.values(props ?? (node as Record<string, unknown>))
    .map((child) => textOf(child, depth + 1))
    .join(" ");
}

const listPage = (params: Record<string, string> = {}) => invokeLoader(CustomersPage, { searchParams: Promise.resolve(params) });
const detailPage = (customerId: string, params: Record<string, string> = {}) =>
  invokeLoader(() => CustomerPage({ params: Promise.resolve({ customerId }), searchParams: Promise.resolve(params) }));

async function rowsOf(params: Record<string, string> = {}): Promise<CustomerListItemDto[]> {
  const page = await listPage(params);
  expect(isValidElement(page)).toBe(true);
  return propsOf<{ rows: CustomerListItemDto[] }>(page as ReactNode, DataTable)!.rows;
}

describe("TC-CUST-008 the customer list", () => {
  it("shows this restaurant's customers and nobody else's", async () => {
    await asSeedUser("A", "CASHIER");
    const rows = await rowsOf();
    expect(rows.length).toBeGreaterThan(0);

    // Every one of this restaurant's active customers is here…
    const mine = await db.customer.findMany({ where: { tenantId: A, archivedAt: null }, select: { id: true } });
    const shown = new Set(rows.map((row) => row.id));
    for (const customer of mine) expect(shown.has(customer.id), customer.id).toBe(true);

    // …and not one row is the other restaurant's. The id is what proves that: two restaurants may genuinely have a
    // customer of the same name, so a name is no evidence of a leak either way.
    const theirs = await db.customer.findMany({ where: { tenantId: B }, select: { id: true } });
    expect(theirs.length).toBeGreaterThan(0);
    const foreign = new Set(theirs.map((customer) => customer.id));
    expect(rows.some((row) => foreign.has(row.id))).toBe(false);

    // Set equality against `mine` would be a race rather than an assertion: another test file sharing this worker's
    // database can add a customer between the page's read and this one.
    expect(await db.customer.count({ where: { id: { in: rows.map((row) => row.id) }, tenantId: { not: A } } })).toBe(0);
  });

  it("searches by name and by the last digits of a phone number", async () => {
    await asSeedUser("A", "CASHIER");
    const [first] = await rowsOf();
    expect(first).toBeTruthy();

    const byName = await rowsOf({ q: first.fullName.split(" ")[0] });
    expect(byName.some((row) => row.id === first.id)).toBe(true);

    if (first.phoneE164) {
      const byPhone = await rowsOf({ q: first.phoneE164.slice(-5) });
      expect(byPhone.some((row) => row.id === first.id)).toBe(true);
    }

    expect(await rowsOf({ q: "zzzz-no-such-customer" })).toEqual([]);
  });

  it("hides archived customers until they are asked for", async () => {
    await asSeedUser("A", "TENANT_ADMIN");
    const victim = dataOf(await invokeAction(createCustomerAction, { fullName: "Archived Regular", phoneE164: "+919900001234" }));
    created.push(victim.id);
    dataOf(await invokeAction(archiveCustomerAction, { customerId: victim.id }));

    expect((await rowsOf()).some((row) => row.id === victim.id)).toBe(false);
    const withArchived = await rowsOf({ archived: "true" });
    expect(withArchived.find((row) => row.id === victim.id)?.isArchived).toBe(true);
  });
});

describe("TC-CUST-008 creating and editing", () => {
  it("a cashier creates a customer, sees them in the list, and edits them", async () => {
    await asSeedUser("A", "CASHIER");
    const customer = dataOf(await invokeAction(createCustomerAction, { fullName: "Anita Desai", phoneE164: "+919812345678", email: "anita@example.com", notes: "Window seat" }));
    created.push(customer.id);
    expect((await rowsOf()).some((row) => row.id === customer.id)).toBe(true);

    dataOf(await invokeAction(updateCustomerAction, { customerId: customer.id, fullName: "Anita Desai-Rao", email: "" }));
    const stored = await db.customer.findUniqueOrThrow({ where: { id: customer.id } });
    expect(stored.fullName).toBe("Anita Desai-Rao");
    expect(stored.email).toBeNull();
    // An omitted field keeps its value: the edit dialog never wipes what it did not show.
    expect(stored.notes).toBe("Window seat");
    expect(stored.phoneE164).toBe("+919812345678");
  });

  it("a duplicate phone number comes back with the existing customer's id, so the form can offer to open it", async () => {
    await asSeedUser("A", "CASHIER");
    const existing = await db.customer.findFirstOrThrow({ where: { tenantId: A, archivedAt: null, phoneE164: { not: null } } });

    const refused = errorOf(await invokeAction(createCustomerAction, { fullName: "Someone Else", phoneE164: existing.phoneE164! }));
    expect(refused.code).toBe("PHONE_EXISTS");
    expect(refused.details?.existingCustomerId).toBe(existing.id);
  });
});

describe("TC-CUST-008 the customer page", () => {
  it("shows the customer, their orders and their notes", async () => {
    await asSeedUser("A", "CASHIER");
    const withOrders = await db.order.findFirstOrThrow({ where: { tenantId: A, customerId: { not: null } }, select: { customerId: true } });
    const page = await detailPage(withOrders.customerId!);
    expect(isValidElement(page)).toBe(true);

    const orders = propsOf<{ rows: CustomerOrderDto[] }>(page as ReactNode, DataTable)!.rows;
    expect(orders.length).toBeGreaterThan(0);
    // A cashier may see money, so the amounts are there.
    expect(orders.every((order) => order.totalAmount !== null)).toBe(true);
  });

  it("leaves order amounts out for a role that may not see money", async () => {
    await asSeedUser("A", "WAITER");
    const withOrders = await db.order.findFirstOrThrow({ where: { tenantId: A, customerId: { not: null } }, select: { customerId: true } });
    const orders = propsOf<{ rows: CustomerOrderDto[] }>((await detailPage(withOrders.customerId!)) as ReactNode, DataTable)!.rows;
    expect(orders.length).toBeGreaterThan(0);
    expect(orders.every((order) => order.totalAmount === null)).toBe(true);
  });

  it("another restaurant's customer and a malformed id both render not-found", async () => {
    await asSeedUser("A", "CASHIER");
    const theirs = await db.customer.findFirstOrThrow({ where: { tenantId: B } });
    expect(await detailPage(theirs.id)).toEqual({ notFound: true });
    expect(await detailPage("00000000-0000-4000-8000-000000000000")).toEqual({ notFound: true });
    expect(await detailPage("not-a-uuid")).toEqual({ notFound: true });
  });
});

describe("TC-CUST-008 erasing personal data", () => {
  let target: CustomerDto;

  beforeAll(async () => {
    await asSeedUser("A", "TENANT_ADMIN");
    target = dataOf(await invokeAction(createCustomerAction, { fullName: "Erasable Person", phoneE164: "+919800000111", email: "erase@example.com", notes: "Allergic to peanuts" }));
    created.push(target.id);
  });

  it("refuses without the typed phrase, and refuses a role that is not the administrator", async () => {
    await asSeedUser("A", "TENANT_ADMIN");
    const unconfirmed = errorOf(await invokeAction(anonymizeCustomerAction, { customerId: target.id, confirmPhrase: "yes" } as never));
    expect(unconfirmed.code).toBe("VALIDATION_ERROR");
    expect(unconfirmed.fieldErrors?.confirmPhrase?.[0]).toContain(ANONYMISE_CONFIRM_PHRASE);

    for (const role of ["MANAGER", "CASHIER"] as const) {
      await asSeedUser("A", role);
      expect(errorOf(await invokeAction(anonymizeCustomerAction, { customerId: target.id, confirmPhrase: ANONYMISE_CONFIRM_PHRASE })).code, role).toBe("FORBIDDEN");
    }
    expect((await db.customer.findUniqueOrThrow({ where: { id: target.id } })).fullName).toBe("Erasable Person");
  });

  it("erases the personal data for the administrator and says so on the page", async () => {
    await asSeedUser("A", "TENANT_ADMIN");
    dataOf(await invokeAction(anonymizeCustomerAction, { customerId: target.id, confirmPhrase: ANONYMISE_CONFIRM_PHRASE }));

    const stored = await db.customer.findUniqueOrThrow({ where: { id: target.id } });
    expect(stored).toMatchObject({ fullName: "Removed customer", phoneE164: null, email: null, notes: null });
    expect(stored.anonymizedAt).toBeTruthy();

    const text = textOf(await detailPage(target.id));
    expect(text).toContain("personal data was erased");
    expect(text).not.toContain("Allergic to peanuts");
    expect(text).not.toContain("+919800000111");
  });
});
