import type { Metadata } from "next";
import Link from "next/link";
import { Plus, UtensilsCrossed } from "lucide-react";
import { DietaryMark } from "@/components/menu/dietary-mark";
import { AvailabilityToggle, PublishedToggle } from "@/components/menu/item-toggles";
import { MenuItemRowActions } from "@/components/menu/item-row-actions";
import { MenuSectionNav } from "@/components/menu/menu-section-nav";
import { MenuThumbnail } from "@/components/menu/menu-image";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/states/empty-state";
import { ErrorState } from "@/components/states/error-state";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Icon } from "@/components/ui/icon";
import { FilterBar, type FilterDefinition } from "@/components/ui/filter-bar";
import { Pagination } from "@/components/ui/pagination";
import { requireTenantPage } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/permissions";
import type { MenuItemListRowDto } from "@/lib/data/menu";
import { formatMoney } from "@/lib/ui/format";
import { listMenuCategoriesAction } from "../categories-actions";
import { listMenuItemsAction } from "../items-actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Menu items" };

type SearchParams = Record<string, string | string[] | undefined>;

const BASE_PATH = "/restaurant/menu/items";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FILTER_PARAMS = ["q", "categoryId", "published", "available", "archived"] as const;

const single = (value: string | string[] | undefined) => (typeof value === "string" ? value : undefined);
/** Only "true"/"false" are filters; anything else in a hand-edited URL is ignored rather than answered with a 422. */
const flag = (value: string | undefined) => (value === "true" ? true : value === "false" ? false : undefined);

/**
 * `/restaurant/menu/items` (S1-P10-T006; frontend.md §5.3). `menu:read` is resolved first, then one page of LD-MENU-02
 * with the filters that live in the URL. The table becomes cards below 768 px (DataTable), money is formatted from the
 * decimal strings the loader returns, and the availability / publish switches are the only client code on the row.
 */
export default async function MenuItemsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const ctx = await requireTenantPage("menu:read");
  const params = await searchParams;

  const archived = flag(single(params.archived)) === true;
  const categoryId = single(params.categoryId);
  const query = {
    q: single(params.q),
    categoryId: categoryId && UUID.test(categoryId) ? categoryId : undefined,
    published: flag(single(params.published)),
    available: flag(single(params.available)),
    archived,
    cursor: single(params.cursor),
  };

  const [items, categories] = await Promise.all([listMenuItemsAction(query), listMenuCategoriesAction({})]);
  const canManage = hasPermission(ctx, "menu:manage");
  const canSetAvailability = hasPermission(ctx, "menu:availability:update");
  const money = (amount: string) => formatMoney(amount, ctx.restaurant.currencyCode);
  const filtered = FILTER_PARAMS.some((name) => single(params[name]) !== undefined && single(params[name]) !== "");

  const filters: FilterDefinition[] = [
    { type: "search", name: "q", label: "Search items", placeholder: "Butter Chicken" },
    {
      type: "select",
      name: "categoryId",
      label: "Category",
      allLabel: "All categories",
      options: categories.ok ? categories.data.items.map((category) => ({ value: category.id, label: category.name })) : [],
    },
    { type: "select", name: "published", label: "Visibility", allLabel: "All", options: [{ value: "true", label: "Published" }, { value: "false", label: "Draft" }] },
    { type: "select", name: "available", label: "Availability", allLabel: "All", options: [{ value: "true", label: "Available" }, { value: "false", label: "Sold out" }] },
    { type: "select", name: "archived", label: "Archived", allLabel: "Active items", options: [{ value: "true", label: "Archived items" }] },
  ];

  const columns: DataTableColumn<MenuItemListRowDto>[] = [
    {
      key: "name",
      header: "Item",
      primary: true,
      cell: (row) => (
        <div className="flex min-w-0 items-center gap-3">
          <MenuThumbnail imageUrl={row.imageUrl} iconKey={row.iconKey} name={row.name} />
          <div className="min-w-0">
            <Link href={`${BASE_PATH}/${row.id}`} className="block truncate text-subheading text-fg-primary hover:text-fg-accent" title={row.name}>
              {row.name}
            </Link>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              <DietaryMark dietaryType={row.dietaryType} />
              {row.variantCount > 0 && <span className="text-caption text-fg-secondary">{row.variantCount} variants</span>}
              {row.addonCount > 0 && <span className="text-caption text-fg-secondary">{row.addonCount} add-ons</span>}
            </div>
          </div>
        </div>
      ),
      text: (row) => row.name,
    },
    { key: "category", header: "Category", text: (row) => row.categoryName, truncate: true },
    {
      key: "price",
      header: "Price",
      numeric: true,
      cell: (row) => (row.variantCount > 0 && row.priceFrom !== row.basePrice ? `from ${money(row.priceFrom)}` : money(row.basePrice)),
      text: (row) => money(row.basePrice),
    },
    { key: "tax", header: "Tax", numeric: true, cell: (row) => `${row.taxRate}%` },
    {
      key: "available",
      header: "Available",
      cell: (row) => <AvailabilityToggle itemId={row.id} name={row.name} checked={row.isAvailable} can={canSetAvailability && row.archivedAt === null} />,
    },
    {
      key: "published",
      header: "Published",
      cell: (row) => <PublishedToggle itemId={row.id} name={row.name} checked={row.isPublished} can={canManage && row.archivedAt === null} />,
    },
  ];

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Menu items"
        description="Everything you sell, with its price, tax rate and where it appears."
        actions={
          canManage ? (
            <Link
              href={`${BASE_PATH}/new`}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-action-primary px-4 text-label text-action-primary-fg transition-colors duration-fast ease-standard hover:bg-action-primary-hover"
            >
              <Icon icon={Plus} size={18} />
              Add item
            </Link>
          ) : undefined
        }
      />
      <MenuSectionNav current="items" showDailyMenu={hasPermission(ctx, "daily_menu:read")} />

      {items.ok ? (
        <div className="flex flex-col gap-6">
          <FilterBar filters={filters} />
          <DataTable
            caption="Menu items"
            columns={columns}
            rows={items.data.items}
            getRowKey={(row) => row.id}
            rowActions={(row) => <MenuItemRowActions itemId={row.id} name={row.name} canManage={canManage && row.archivedAt === null} />}
            empty={
              filtered ? (
                <EmptyState
                  icon={UtensilsCrossed}
                  title="No items match these filters"
                  description="Try a different category, or clear the filters to see the whole menu."
                  action={{ href: BASE_PATH, label: "Clear filters" }}
                />
              ) : (
                <EmptyState
                  icon={UtensilsCrossed}
                  title="No menu items yet"
                  description="Add your first dish, give it a price and a tax rate, then publish it to your website."
                  action={canManage ? { href: `${BASE_PATH}/new`, label: "Add your first menu item" } : undefined}
                  secondary={canManage ? { href: "/restaurant/menu/categories", label: "Manage categories" } : undefined}
                />
              )
            }
          />
          <Pagination
            basePath={BASE_PATH}
            searchParams={params}
            nextCursor={items.data.nextCursor}
            summary={`Showing ${items.data.items.length} ${items.data.items.length === 1 ? "item" : "items"}`}
          />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <ErrorState requestId={items.error.requestId} message={items.error.message} />
          {/* A tampered or expired keyset cursor is a 422; the way back is the first page, not a retry. */}
          {query.cursor && (
            <Link href={BASE_PATH} className="text-label text-fg-accent hover:underline">
              Start from the first page
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
