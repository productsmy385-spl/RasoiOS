import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import MenuRedirectPage from "@/app/restaurant/menu/page";
import MenuCategoriesPage from "@/app/restaurant/menu/categories/page";
import MenuItemsPage from "@/app/restaurant/menu/items/page";
import MenuItemPage from "@/app/restaurant/menu/items/[itemId]/page";
import NewMenuItemPage from "@/app/restaurant/menu/items/new/page";
import {
  archiveCategoryAction,
  createCategoryAction,
  setCategoryPublishedAction,
  reorderCategoriesAction,
} from "@/app/restaurant/menu/categories-actions";
import {
  createMenuItemAction,
  replaceMenuItemAddonsAction,
  replaceMenuItemVariantsAction,
  setMenuItemAvailabilityAction,
  setMenuItemPublishedAction,
} from "@/app/restaurant/menu/items-actions";
import { CategoriesBoard, type CategoriesBoardProps } from "@/components/menu/categories-board";
import { ItemEditor, type ItemEditorProps } from "@/components/menu/item-editor";
import { failureText } from "@/components/menu/feedback";
import { EmptyState } from "@/components/states/empty-state";
import { ErrorState } from "@/components/states/error-state";
import { DataTable, type DataTableProps } from "@/components/ui/data-table";
import type { MenuItemListRowDto } from "@/lib/data/menu";
import { formatMoney } from "@/lib/ui/format";
import { asAnonymous, asSeedUser, invokeAction, invokeLoader, SEED_NOW, seedOnce, seeded } from "../helpers/actors";
import { freezeTime } from "../setup/db";
import { dataOf, errorOf } from "./results";
import { findComponent, hrefs, requireComponent, textOf } from "./ui-tree";

/**
 * S1-P10-T005/T006/T007 — the menu console screens (TC-MENU-014, TC-MENU-015, TC-MENU-016).
 *
 * The console has no authenticated end-to-end path in this environment (no Clerk test users, testing.md §2), so the
 * screens are driven here instead: `invokeLoader` runs each page as the seeded user and the assertions are made on
 * what the Server Component resolved — the loader data it passed to the client board, the capability flags it
 * computed, the state branch it chose and what a table column renders for a real row. Every mutation goes through the
 * same Server Actions the buttons call, and the page is re-read afterwards, so nothing here can pass on optimism.
 */
let restoreClock: () => void = () => {};

beforeAll(async () => {
  await seedOnce();
  restoreClock = freezeTime(SEED_NOW.toISOString());
}, 120_000);
afterAll(() => restoreClock());

const params = (values: Record<string, string> = {}) => ({ searchParams: Promise.resolve(values) });
const money = (amount: string) => formatMoney(amount, "INR");
const categoryA = (key: string) => seeded("A", `category:${key}`);
const itemA = (key: string) => seeded("A", `item:${key}`);

const MANAGE_ROLES = ["TENANT_ADMIN", "MANAGER"] as const;
const READ_ROLES = ["CASHIER", "KITCHEN", "WAITER"] as const;

// ─── Route and guards ───

describe("/restaurant/menu route shape (frontend.md §2)", () => {
  it("redirects every tenant role to the items list, and anonymous visitors to sign-in", async () => {
    for (const role of [...MANAGE_ROLES, ...READ_ROLES]) {
      await asSeedUser("A", role);
      expect(await invokeLoader(MenuRedirectPage), role).toEqual({ redirect: "/restaurant/menu/items" });
    }
    asAnonymous();
    expect(await invokeLoader(MenuRedirectPage)).toEqual({ redirect: "/sign-in" });
  });

  it("opens the items list and the categories page for every tenant role, and turns anonymous visitors away", async () => {
    for (const role of [...MANAGE_ROLES, ...READ_ROLES]) {
      await asSeedUser("A", role);
      expect(await invokeLoader(MenuItemsPage, params()), role).not.toHaveProperty("redirect");
      expect(await invokeLoader(MenuCategoriesPage, params()), role).not.toHaveProperty("redirect");
    }
    asAnonymous();
    expect(await invokeLoader(MenuItemsPage, params())).toEqual({ redirect: "/sign-in" });
    expect(await invokeLoader(MenuCategoriesPage, params())).toEqual({ redirect: "/sign-in" });
  });

  it("SC-RBAC-08 sends roles without `menu:manage` away from the new-item page instead of showing a form the server would refuse", async () => {
    for (const role of READ_ROLES) {
      await asSeedUser("A", role);
      expect(await invokeLoader(NewMenuItemPage), role).toEqual({ redirect: "/account/forbidden" });
    }
    for (const role of MANAGE_ROLES) {
      await asSeedUser("A", role);
      expect(await invokeLoader(NewMenuItemPage), role).not.toHaveProperty("redirect");
    }
  });
});

// ─── TC-MENU-014 — categories UI ───

describe("TC-MENU-014 /restaurant/menu/categories", () => {
  it("shows the tenant's active categories in display order with their live item counts", async () => {
    await asSeedUser("A", "MANAGER");
    const page = await invokeLoader(MenuCategoriesPage, params());
    const board = requireComponent<CategoriesBoardProps>(page, CategoriesBoard, "CategoriesBoard");

    expect(board.categories.map((category) => category.name)).toEqual(["Starters", "Mains", "Beverages"]);
    expect(board.categories.map((category) => category.itemCount)).toEqual([3, 2, 2]);
    expect(board.archived).toBe(false);
    expect(board.canManage).toBe(true);
  });

  it("hides the manage controls from roles without `menu:manage` — and the server still holds the line", async () => {
    for (const role of READ_ROLES) {
      await asSeedUser("A", role);
      const board = requireComponent<CategoriesBoardProps>(await invokeLoader(MenuCategoriesPage, params()), CategoriesBoard, "CategoriesBoard");
      expect(board.canManage, role).toBe(false);
      expect(board.categories.length, role).toBe(3);
      expect(errorOf(await invokeAction(createCategoryAction, { name: `Sneaky ${role}` })).code, role).toBe("FORBIDDEN");
    }
  });

  it("reflects a reorder on the next read, so the list is the database's order and not the browser's", async () => {
    await asSeedUser("A", "MANAGER");
    const reversed = [categoryA("beverages"), categoryA("mains"), categoryA("starters")];
    dataOf(await invokeAction(reorderCategoriesAction, { orderedIds: reversed }));

    const board = requireComponent<CategoriesBoardProps>(await invokeLoader(MenuCategoriesPage, params()), CategoriesBoard, "CategoriesBoard");
    expect(board.categories.map((category) => category.id)).toEqual(reversed);
    expect(board.categories.map((category) => category.sortOrder)).toEqual([0, 1, 2]);

    dataOf(await invokeAction(reorderCategoriesAction, { orderedIds: [categoryA("starters"), categoryA("mains"), categoryA("beverages")] }));
  });

  it("carries the publish switch state, and a refused archive gives the dialog the server's own words", async () => {
    await asSeedUser("A", "MANAGER");
    dataOf(await invokeAction(setCategoryPublishedAction, { categoryId: categoryA("beverages"), published: false }));

    const board = requireComponent<CategoriesBoardProps>(await invokeLoader(MenuCategoriesPage, params()), CategoriesBoard, "CategoriesBoard");
    expect(board.categories.find((category) => category.id === categoryA("beverages"))?.isPublished).toBe(false);

    // 409 CATEGORY_NOT_EMPTY: the confirmation dialog shows exactly this, with no invented wording.
    const refused = await invokeAction(archiveCategoryAction, { categoryId: categoryA("beverages") });
    const error = errorOf(refused);
    expect(error.code).toBe("CATEGORY_NOT_EMPTY");
    expect(failureText({ ok: false, error })).toBe("Archive or move the 2 items in this category first.");

    dataOf(await invokeAction(setCategoryPublishedAction, { categoryId: categoryA("beverages"), published: true }));
  });

  it("archives an empty category and lists it under ?archived=true, which starts as its own empty state", async () => {
    await asSeedUser("A", "MANAGER");
    const before = requireComponent<CategoriesBoardProps>(await invokeLoader(MenuCategoriesPage, params({ archived: "true" })), CategoriesBoard, "CategoriesBoard");
    expect(before.categories).toEqual([]);
    expect(before.archived).toBe(true);

    const created = dataOf(await invokeAction(createCategoryAction, { name: "Desserts", description: "Sweet things" }));
    dataOf(await invokeAction(archiveCategoryAction, { categoryId: created.id }));

    const archived = requireComponent<CategoriesBoardProps>(await invokeLoader(MenuCategoriesPage, params({ archived: "true" })), CategoriesBoard, "CategoriesBoard");
    expect(archived.categories.map((category) => category.name)).toEqual(["Desserts"]);
    expect(archived.categories[0].archivedAt).not.toBeNull();

    const active = requireComponent<CategoriesBoardProps>(await invokeLoader(MenuCategoriesPage, params()), CategoriesBoard, "CategoriesBoard");
    expect(active.categories.map((category) => category.name)).toEqual(["Starters", "Mains", "Beverages"]);
  });
});

// ─── TC-MENU-015 — items list ───

type ItemsTable = DataTableProps<MenuItemListRowDto>;
const itemsTable = (page: unknown) => requireComponent<ItemsTable>(page, DataTable as never, "DataTable");
const cellText = (table: ItemsTable, key: string, row: MenuItemListRowDto) => {
  const column = table.columns.find((candidate) => candidate.key === key);
  if (!column) throw new Error(`No "${key}" column`);
  return textOf(column.cell ? column.cell(row) : column.text?.(row));
};

describe("TC-MENU-015 /restaurant/menu/items", () => {
  it("lists the seeded items with their real prices, tax rates and variant counts", async () => {
    await asSeedUser("A", "MANAGER");
    const page = await invokeLoader(MenuItemsPage, params());
    const table = itemsTable(page);

    expect(table.rows.map((row) => row.name)).toEqual([
      "Paneer Tikka",
      "Chicken 65",
      "Masala Omelette",
      "Butter Chicken",
      "Dal Makhani",
      "Masala Chai",
      "Fresh Lime Soda",
    ]);
    const paneer = table.rows[0];
    // Half 160 / Full 280 against a 280 base: the list shows the "from" price, formatted from the decimal string.
    expect(paneer.variantCount).toBe(2);
    expect(cellText(table, "price", paneer)).toBe(`from ${money("160.00")}`);
    expect(cellText(table, "price", table.rows[3])).toBe(money("360.00"));
    expect(cellText(table, "tax", table.rows[6])).toBe("18.00%");
    expect(hrefs(page)).toContain("/restaurant/menu/items/new");
  });

  it("filters by category, publication and availability, and never crosses into another tenant", async () => {
    await asSeedUser("A", "MANAGER");
    const mains = itemsTable(await invokeLoader(MenuItemsPage, params({ categoryId: categoryA("mains") })));
    expect(mains.rows.map((row) => row.name)).toEqual(["Butter Chicken", "Dal Makhani"]);

    const search = itemsTable(await invokeLoader(MenuItemsPage, params({ q: "chai" })));
    expect(search.rows.map((row) => row.name)).toEqual(["Masala Chai"]);

    // Tenant B's category id is not a filter that can reach Tenant B's items — it simply matches nothing.
    const foreign = itemsTable(await invokeLoader(MenuItemsPage, params({ categoryId: seeded("B", "category:starters") })));
    expect(foreign.rows).toEqual([]);
  });

  it("toggling availability changes the row on the next read, and rows keep their own switch state", async () => {
    await asSeedUser("A", "MANAGER");
    dataOf(await invokeAction(setMenuItemAvailabilityAction, { itemId: itemA("masala-chai"), available: false }));

    const soldOut = itemsTable(await invokeLoader(MenuItemsPage, params({ available: "false" })));
    expect(soldOut.rows.map((row) => row.name)).toEqual(["Masala Chai"]);
    expect(soldOut.rows[0].isAvailable).toBe(false);

    const stillAvailable = itemsTable(await invokeLoader(MenuItemsPage, params({ available: "true" })));
    expect(stillAvailable.rows.map((row) => row.name)).not.toContain("Masala Chai");

    dataOf(await invokeAction(setMenuItemAvailabilityAction, { itemId: itemA("masala-chai"), available: true }));
  });

  it("offers different empty states for a first-run menu and for filters that match nothing", async () => {
    await asSeedUser("A", "MANAGER");
    const filtered = itemsTable(await invokeLoader(MenuItemsPage, params({ q: "zzzz-no-such-dish" })));
    expect(filtered.rows).toEqual([]);
    const empty = findComponent<Parameters<typeof EmptyState>[0]>(filtered.empty, EmptyState);
    expect(empty?.props.title).toBe("No items match these filters");
    expect(empty?.props.action).toEqual({ href: "/restaurant/menu/items", label: "Clear filters" });

    // Without filters the table carries the first-run empty state instead, with the action a manager may take.
    const unfiltered = itemsTable(await invokeLoader(MenuItemsPage, params()));
    const firstRun = findComponent<Parameters<typeof EmptyState>[0]>(unfiltered.empty, EmptyState);
    expect(firstRun?.props.title).toBe("No menu items yet");
    expect(firstRun?.props.action).toEqual({ href: "/restaurant/menu/items/new", label: "Add your first menu item" });

    // …and a role that cannot add items is not offered a button the server would refuse.
    await asSeedUser("A", "WAITER");
    const readOnly = itemsTable(await invokeLoader(MenuItemsPage, params()));
    expect(findComponent<Parameters<typeof EmptyState>[0]>(readOnly.empty, EmptyState)?.props.action).toBeUndefined();
    await asSeedUser("A", "MANAGER");
  });

  it("a tampered page cursor is reported, with the way back to the first page", async () => {
    await asSeedUser("A", "MANAGER");
    const page = await invokeLoader(MenuItemsPage, params({ cursor: "not-a-cursor" }));
    expect(findComponent(page, ErrorState)).not.toBeNull();
    expect(hrefs(page)).toContain("/restaurant/menu/items");
  });

  it("gives a CASHIER the list without the manage controls (`menu:manage` and `menu:availability:update` are both refused)", async () => {
    await asSeedUser("A", "CASHIER");
    const page = await invokeLoader(MenuItemsPage, params());
    const table = itemsTable(page);
    expect(table.rows.length).toBe(7);
    expect(hrefs(page)).not.toContain("/restaurant/menu/items/new");

    const availability = table.columns.find((column) => column.key === "available");
    const published = table.columns.find((column) => column.key === "published");
    const availabilityCell = availability?.cell?.(table.rows[0]) as { props: { can: boolean } };
    const publishedCell = published?.cell?.(table.rows[0]) as { props: { can: boolean } };
    expect(availabilityCell.props.can).toBe(false);
    expect(publishedCell.props.can).toBe(false);

    expect(errorOf(await invokeAction(setMenuItemAvailabilityAction, { itemId: itemA("masala-chai"), available: false })).code).toBe("FORBIDDEN");
  });
});

// ─── TC-MENU-016 — item editor ───

describe("TC-MENU-016 /restaurant/menu/items/new and /[itemId]", () => {
  it("gives the new-item editor the real categories and kitchen sections to choose from", async () => {
    await asSeedUser("A", "MANAGER");
    const editor = requireComponent<ItemEditorProps>(await invokeLoader(NewMenuItemPage), ItemEditor, "ItemEditor");

    expect(editor.item).toBeNull();
    expect(editor.canManage).toBe(true);
    expect(editor.currencyCode).toBe("INR");
    expect(editor.categories.map((category) => category.name)).toEqual(["Starters", "Mains", "Beverages"]);
    expect(editor.kitchenSections.map((section) => section.code)).toContain("TANDOOR");
  });

  it("creates an item with Half/Full variants and an add-on, publishes it, and reads back its 'from' price", async () => {
    await asSeedUser("A", "MANAGER");
    // Exactly the three calls the editor makes, in the order it makes them (SA-MENU-06, SA-MENU-12, SA-MENU-13).
    const created = dataOf(
      await invokeAction(createMenuItemAction, {
        categoryId: categoryA("starters"),
        name: "Tandoori Broccoli",
        description: "Charred florets with a yoghurt marinade",
        basePrice: "320.00",
        taxRate: "5.00",
        dietaryType: "VEG",
        prepTimeMinutes: 15,
      }),
    );
    expect(created.isPublished).toBe(false);

    dataOf(
      await invokeAction(replaceMenuItemVariantsAction, {
        itemId: created.id,
        variants: [
          { name: "Half", price: "180.00" },
          { name: "Full", price: "320.00", isDefault: true },
        ],
      }),
    );
    const withAddon = dataOf(await invokeAction(replaceMenuItemAddonsAction, { itemId: created.id, addons: [{ name: "Extra dip", price: "40.00" }] }));
    dataOf(await invokeAction(setMenuItemPublishedAction, { itemId: created.id, published: true }));

    const page = await invokeLoader(MenuItemPage, { params: Promise.resolve({ itemId: created.id }) });
    const editor = requireComponent<ItemEditorProps>(page, ItemEditor, "ItemEditor");
    expect(editor.item?.name).toBe("Tandoori Broccoli");
    expect(editor.item?.variants.map((variant) => [variant.name, variant.price])).toEqual([
      ["Half", "180.00"],
      ["Full", "320.00"],
    ]);
    expect(editor.item?.variants.filter((variant) => variant.isDefault).map((variant) => variant.name)).toEqual(["Full"]);
    expect(editor.item?.addons.map((addon) => addon.name)).toEqual(["Extra dip"]);
    expect(editor.item?.isPublished).toBe(true);
    // The "from" price a guest sees is the cheapest variant, not the base price.
    expect(editor.item?.priceFrom).toBe("180.00");
    expect(withAddon.priceFrom).toBe("180.00");

    const table = itemsTable(await invokeLoader(MenuItemsPage, params({ q: "Tandoori Broccoli" })));
    expect(cellText(table, "price", table.rows[0])).toBe(`from ${money("180.00")}`);
  });

  it("an unknown, malformed or other tenant's item id all render the same not-found page (SC-TEN-04)", async () => {
    await asSeedUser("A", "MANAGER");
    for (const itemId of [randomUUID(), "not-a-uuid", seeded("B", "item:clam-chowder")]) {
      expect(await invokeLoader(MenuItemPage, { params: Promise.resolve({ itemId }) }), itemId).toEqual({ notFound: true });
    }
  });

  it("opens read-only for a role that may read the menu but not manage it", async () => {
    await asSeedUser("A", "WAITER");
    const editor = requireComponent<ItemEditorProps>(
      await invokeLoader(MenuItemPage, { params: Promise.resolve({ itemId: itemA("butter-chicken") }) }),
      ItemEditor,
      "ItemEditor",
    );
    expect(editor.canManage).toBe(false);
    expect(editor.item?.name).toBe("Butter Chicken");
  });
});
