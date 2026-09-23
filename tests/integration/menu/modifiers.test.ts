import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { beforeAll, describe, expect, it } from "vitest";
import {
  createMenuItemAction,
  getMenuItemAction,
  replaceMenuItemAddonsAction,
  replaceMenuItemVariantsAction,
} from "@/app/restaurant/menu/items-actions";
import { asSeedUser, invokeAction, seedOnce, seeded, tenantIdOf } from "../helpers/actors";
import { testDb } from "../setup/db";
import { dataOf, errorOf, expectSameNotFound } from "./results";

/**
 * S1-P10-T004 — variants and add-ons (api.md SA-MENU-12/13). TC-MENU-012, TC-MENU-013; TI-009.
 *
 * Both are replace-sets: listed rows are upserted in order, omitted ones archived (never deleted — order lines
 * reference them, REQ-TXN-009). Prices are relational `NUMERIC(12,2)`, never a JSON blob (BA-17).
 */
const db = testDb();

beforeAll(seedOnce, 120_000);

const itemA = (key: string) => seeded("A", `item:${key}`);

async function newItem(name: string) {
  await asSeedUser("A", "MANAGER");
  return dataOf(await invokeAction(createMenuItemAction, { categoryId: seeded("A", "category:starters"), name, basePrice: "200.00", taxRate: "5" }));
}

describe("SA-MENU-12 replaceMenuItemVariantsAction", () => {
  it("TC-MENU-012 upserts listed variants, archives the omitted ones and audits the set before/after", async () => {
    const item = await newItem("Lassi");
    const first = dataOf(
      await invokeAction(replaceMenuItemVariantsAction, {
        itemId: item.id,
        variants: [
          { name: "Small", price: "60" },
          { name: "Large", price: "110", isDefault: true },
        ],
      }),
    );
    expect(first.variants.map((v) => [v.name, v.price, v.isDefault, v.displayOrder])).toEqual([
      ["Small", "60.00", false, 0],
      ["Large", "110.00", true, 1],
    ]);
    expect(first.priceFrom).toBe("60.00");

    const smallId = first.variants[0].id;
    const largeId = first.variants[1].id;

    // Keep "Small" (renamed and repriced), drop "Large", add "Family".
    const second = dataOf(
      await invokeAction(replaceMenuItemVariantsAction, {
        itemId: item.id,
        variants: [
          { id: smallId, name: "Regular", price: "70", isDefault: true },
          { name: "Family", price: "180" },
        ],
      }),
    );
    expect(second.variants.map((v) => [v.id, v.name, v.price, v.isDefault])).toEqual([
      [smallId, "Regular", "70.00", true],
      [second.variants[1].id, "Family", "180.00", false],
    ]);

    const archived = await db.menuItemVariant.findUniqueOrThrow({ where: { id: largeId } });
    expect(archived.archivedAt).not.toBeNull();
    expect(archived.isDefault).toBe(false);
    expect(archived.price).toEqual(new Prisma.Decimal("110.00"));

    const audit = await db.auditLog.findFirstOrThrow({ where: { action: "menu_item.variants_updated", resourceId: item.id }, orderBy: { createdAt: "desc" } });
    expect(audit.beforeState).toEqual({
      variants: [
        { name: "Small", price: "60.00", isDefault: false, isAvailable: true },
        { name: "Large", price: "110.00", isDefault: true, isAvailable: true },
      ],
    });
    expect(audit.afterState).toEqual({
      variants: [
        { name: "Regular", price: "70.00", isDefault: true, isAvailable: true },
        { name: "Family", price: "180.00", isDefault: false, isAvailable: true },
      ],
    });
  });

  it("TC-MENU-012 two variants can swap names in one call (the per-item unique index is respected)", async () => {
    const item = await newItem("Dosa");
    const created = dataOf(
      await invokeAction(replaceMenuItemVariantsAction, {
        itemId: item.id,
        variants: [
          { name: "Plain", price: "90" },
          { name: "Masala", price: "130" },
        ],
      }),
    );
    const [plain, masala] = created.variants;

    const swapped = dataOf(
      await invokeAction(replaceMenuItemVariantsAction, {
        itemId: item.id,
        variants: [
          { id: plain.id, name: "Masala", price: "130" },
          { id: masala.id, name: "Plain", price: "90" },
        ],
      }),
    );
    expect(swapped.variants.map((v) => [v.id, v.name])).toEqual([
      [plain.id, "Masala"],
      [masala.id, "Plain"],
    ]);
    expect(await db.menuItemVariant.count({ where: { menuItemId: item.id, archivedAt: null } })).toBe(2);
  });

  it("TC-MENU-012 rejects two defaults, duplicate names, more than 20 entries and a bad price — writing nothing", async () => {
    const item = await newItem("Idli");
    const cases: Array<Array<Record<string, unknown>>> = [
      [
        { name: "A", price: "10", isDefault: true },
        { name: "B", price: "20", isDefault: true },
      ],
      [
        { name: "Half", price: "10" },
        { name: "half", price: "20" },
      ],
      Array.from({ length: 21 }, (_, index) => ({ name: `V${index}`, price: "10" })),
      [{ name: "Cheap", price: "-1" }],
      [{ name: "Cheap", price: 10 }],
      [{ name: "", price: "10" }],
    ];
    for (const variants of cases) {
      expect(errorOf(await invokeAction(replaceMenuItemVariantsAction, { itemId: item.id, variants } as never)).code).toBe("VALIDATION_ERROR");
    }
    expect(await db.menuItemVariant.count({ where: { menuItemId: item.id } })).toBe(0);
  });

  it("TC-MENU-012 / TI-009 a variant id from another item or another tenant is NOT_FOUND, like a random UUID", async () => {
    const item = await newItem("Uttapam");
    const otherItemVariant = await db.menuItemVariant.findFirstOrThrow({ where: { menuItemId: itemA("paneer-tikka"), archivedAt: null } });
    const tenantBVariant = await db.menuItemVariant.findFirstOrThrow({ where: { menuItemId: seeded("B", "item:clam-chowder"), archivedAt: null } });

    await asSeedUser("A", "MANAGER");
    const random = await invokeAction(replaceMenuItemVariantsAction, { itemId: item.id, variants: [{ id: randomUUID(), name: "Stolen", price: "10" }] });
    expectSameNotFound(await invokeAction(replaceMenuItemVariantsAction, { itemId: item.id, variants: [{ id: otherItemVariant.id, name: "Stolen", price: "10" }] }), random);
    expectSameNotFound(await invokeAction(replaceMenuItemVariantsAction, { itemId: item.id, variants: [{ id: tenantBVariant.id, name: "Stolen", price: "10" }] }), random);

    expect(await db.menuItemVariant.findUniqueOrThrow({ where: { id: otherItemVariant.id } })).toEqual(otherItemVariant);
    expect(await db.menuItemVariant.findUniqueOrThrow({ where: { id: tenantBVariant.id } })).toEqual(tenantBVariant);
    expect(await db.menuItemVariant.count({ where: { menuItemId: item.id } })).toBe(0);
  });

  it("TI-009 replacing the variants of a Tenant B item is NOT_FOUND and leaves them untouched", async () => {
    const target = seeded("B", "item:clam-chowder");
    const before = await db.menuItemVariant.findMany({ where: { menuItemId: target }, orderBy: { displayOrder: "asc" } });

    await asSeedUser("A", "MANAGER");
    expectSameNotFound(
      await invokeAction(replaceMenuItemVariantsAction, { itemId: target, variants: [{ name: "Free", price: "0" }] }),
      await invokeAction(replaceMenuItemVariantsAction, { itemId: randomUUID(), variants: [{ name: "Free", price: "0" }] }),
    );
    expect(await db.menuItemVariant.findMany({ where: { menuItemId: target }, orderBy: { displayOrder: "asc" } })).toEqual(before);
  });

  it("an empty list archives every variant and the item falls back to its base price", async () => {
    const item = await newItem("Vada");
    dataOf(await invokeAction(replaceMenuItemVariantsAction, { itemId: item.id, variants: [{ name: "Two", price: "50" }] }));
    const cleared = dataOf(await invokeAction(replaceMenuItemVariantsAction, { itemId: item.id, variants: [] }));

    expect(cleared.variants).toEqual([]);
    expect(cleared.priceFrom).toBe("200.00");
    expect(await db.menuItemVariant.count({ where: { menuItemId: item.id, archivedAt: { not: null } } })).toBe(1);
  });
});

describe("SA-MENU-13 replaceMenuItemAddonsAction", () => {
  it("TC-MENU-013 upserts listed add-ons, archives removed ones and audits the set", async () => {
    const item = await newItem("Pav Bhaji");
    const first = dataOf(
      await invokeAction(replaceMenuItemAddonsAction, {
        itemId: item.id,
        addons: [
          { name: "Extra Pav", price: "25" },
          { name: "Cheese", price: "40" },
        ],
      }),
    );
    expect(first.addons.map((a) => [a.name, a.price, a.isAvailable, a.displayOrder])).toEqual([
      ["Extra Pav", "25.00", true, 0],
      ["Cheese", "40.00", true, 1],
    ]);

    const pavId = first.addons[0].id;
    const cheeseId = first.addons[1].id;
    const second = dataOf(
      await invokeAction(replaceMenuItemAddonsAction, {
        itemId: item.id,
        addons: [{ id: pavId, name: "Extra Pav", price: "30", isAvailable: false }],
      }),
    );
    expect(second.addons.map((a) => [a.id, a.price, a.isAvailable])).toEqual([[pavId, "30.00", false]]);
    expect((await db.menuItemAddon.findUniqueOrThrow({ where: { id: cheeseId } })).archivedAt).not.toBeNull();

    const audit = await db.auditLog.findFirstOrThrow({ where: { action: "menu_item.addons_updated", resourceId: item.id }, orderBy: { createdAt: "desc" } });
    expect(audit.beforeState).toEqual({
      addons: [
        { name: "Extra Pav", price: "25.00", isAvailable: true },
        { name: "Cheese", price: "40.00", isAvailable: true },
      ],
    });
    expect(audit.afterState).toEqual({ addons: [{ name: "Extra Pav", price: "30.00", isAvailable: false }] });
  });

  it("TC-MENU-013 validates names, prices and the 30-add-on cap", async () => {
    const item = await newItem("Misal");
    const cases: Array<Array<Record<string, unknown>>> = [
      [
        { name: "Extra", price: "10" },
        { name: "EXTRA", price: "20" },
      ],
      Array.from({ length: 31 }, (_, index) => ({ name: `A${index}`, price: "1" })),
      [{ name: "Bad", price: "1.005" }],
      [{ name: "n".repeat(61), price: "1" }],
      [{ name: "Unknown key", price: "1", isDefault: true }],
    ];
    for (const addons of cases) {
      expect(errorOf(await invokeAction(replaceMenuItemAddonsAction, { itemId: item.id, addons } as never)).code).toBe("VALIDATION_ERROR");
    }
    expect(await db.menuItemAddon.count({ where: { menuItemId: item.id } })).toBe(0);
  });

  it("an add-on id of another item is NOT_FOUND; Tenant B's add-ons are untouched", async () => {
    const item = await newItem("Sabudana");
    const foreign = await db.menuItemAddon.findFirstOrThrow({ where: { menuItemId: seeded("B", "item:grilled-salmon"), archivedAt: null } });

    await asSeedUser("A", "MANAGER");
    expectSameNotFound(
      await invokeAction(replaceMenuItemAddonsAction, { itemId: item.id, addons: [{ id: foreign.id, name: "Stolen", price: "1" }] }),
      await invokeAction(replaceMenuItemAddonsAction, { itemId: item.id, addons: [{ id: randomUUID(), name: "Stolen", price: "1" }] }),
    );
    expect(await db.menuItemAddon.findUniqueOrThrow({ where: { id: foreign.id } })).toEqual(foreign);
  });
});

describe("no JSON price storage remains", () => {
  it("every variant and add-on price is a NUMERIC column, and the item detail reads them relationally", async () => {
    const columns = await db.$queryRaw<Array<{ table_name: string; data_type: string }>>`
      SELECT table_name, data_type FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name IN ('menu_item_variants', 'menu_item_addons') AND column_name = 'price'`;
    expect(columns.map((c) => c.data_type)).toEqual(["numeric", "numeric"]);

    const jsonColumns = await db.$queryRaw<Array<{ table_name: string; column_name: string }>>`
      SELECT table_name, column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name IN ('menu_items', 'menu_item_variants', 'menu_item_addons')
        AND data_type IN ('json', 'jsonb')`;
    expect(jsonColumns).toEqual([]);

    await asSeedUser("A", "WAITER");
    const { item } = dataOf(await invokeAction(getMenuItemAction, { itemId: itemA("paneer-tikka") }));
    expect(item.variants.every((v) => /^\d+\.\d{2}$/.test(v.price))).toBe(true);
    expect((await db.menuItemVariant.findMany({ where: { tenantId: tenantIdOf("A") }, take: 1 }))[0].price).toBeInstanceOf(Prisma.Decimal);
  });
});
