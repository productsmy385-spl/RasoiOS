import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Archive } from "lucide-react";
import { ItemEditor } from "@/components/menu/item-editor";
import { MenuSectionNav } from "@/components/menu/menu-section-nav";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/states/error-state";
import { requireTenantPage } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/permissions";
import { formatInZone } from "@/lib/ui/format";
import { listMenuCategoriesAction } from "../../categories-actions";
import { getMenuItemAction } from "../../items-actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Menu item" };

/**
 * `/restaurant/menu/items/[itemId]` (S1-P10-T007). `menu:read` opens the page; without `menu:manage` the editor is
 * read-only. An unknown id, a malformed one and another tenant's id all render the same not-found page — the loader
 * answers NOT_FOUND for all three (SC-TEN-04), so this page never becomes an existence oracle.
 */
export default async function MenuItemPage({ params }: { params: Promise<{ itemId: string }> }) {
  const ctx = await requireTenantPage("menu:read");
  const { itemId } = await params;
  const [detail, categories] = await Promise.all([getMenuItemAction({ itemId }), listMenuCategoriesAction({})]);

  if (!detail.ok) {
    if (detail.error.code === "NOT_FOUND" || detail.error.code === "VALIDATION_ERROR") notFound();
    return <ErrorState requestId={detail.error.requestId} message={detail.error.message} />;
  }

  const { item, kitchenSections } = detail.data;
  const canManage = hasPermission(ctx, "menu:manage") && item.archivedAt === null;
  // An archived item's category may itself be archived and therefore missing from the active list.
  const categoryOptions = categories.ok ? categories.data.items : [];
  const options = categoryOptions.some((category) => category.id === item.categoryId)
    ? categoryOptions
    : [
        ...categoryOptions,
        {
          id: item.categoryId,
          name: item.categoryName,
          description: null,
          iconKey: null,
          sortOrder: 0,
          isPublished: item.categoryPublished,
          itemCount: 0,
          archivedAt: null,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        },
      ];

  return (
    <div className="flex flex-col">
      <PageHeader
        title={item.name}
        description={`In ${item.categoryName}`}
        actions={
          item.archivedAt ? (
            <Badge tone="neutral" icon={Archive}>
              {`Archived ${formatInZone(item.archivedAt, ctx.restaurant.timezone, "date")}`}
            </Badge>
          ) : undefined
        }
      />
      <MenuSectionNav current="items" showDailyMenu={hasPermission(ctx, "daily_menu:read")} />
      {item.archivedAt && (
        <Alert tone="neutral" title="This item is archived" className="mb-6">
          It is off your website and cannot be ordered. Past orders and receipts still show it exactly as it was sold.
        </Alert>
      )}
      <ItemEditor item={item} categories={options} kitchenSections={kitchenSections} canManage={canManage} currencyCode={ctx.restaurant.currencyCode} />
    </div>
  );
}
