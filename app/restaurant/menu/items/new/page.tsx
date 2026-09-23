import type { Metadata } from "next";
import { LayoutList } from "lucide-react";
import { ItemEditor } from "@/components/menu/item-editor";
import { MenuSectionNav } from "@/components/menu/menu-section-nav";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/states/empty-state";
import { ErrorState } from "@/components/states/error-state";
import { Card } from "@/components/ui/card";
import { requireTenantPage } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/permissions";
import { getRestaurantSettingsAction } from "@/app/restaurant/settings/actions";
import { listMenuCategoriesAction } from "../../categories-actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "New menu item" };

/**
 * `/restaurant/menu/items/new` (S1-P10-T007). `menu:manage` is required to reach the page at all, so a role that can
 * only read the menu is redirected to `/account/forbidden` rather than shown a form the server would refuse.
 * An item must belong to a category, so a restaurant with none is sent to create one first instead of meeting a
 * dropdown with nothing in it.
 */
export default async function NewMenuItemPage() {
  const ctx = await requireTenantPage("menu:manage");
  const [categories, settings] = await Promise.all([listMenuCategoriesAction({}), getRestaurantSettingsAction()]);

  return (
    <div className="flex flex-col">
      <PageHeader title="New menu item" description="Name it, price it, and add the sizes and extras guests can choose." />
      <MenuSectionNav current="items" showDailyMenu={hasPermission(ctx, "daily_menu:read")} />
      {!categories.ok ? (
        <ErrorState requestId={categories.error.requestId} message={categories.error.message} />
      ) : categories.data.items.length === 0 ? (
        <Card>
          <EmptyState
            icon={LayoutList}
            title="Add a category first"
            description="Every menu item belongs to a category, so start by creating one such as Starters or Mains."
            action={{ href: "/restaurant/menu/categories", label: "Go to categories" }}
          />
        </Card>
      ) : (
        <ItemEditor
          item={null}
          categories={categories.data.items}
          kitchenSections={settings.ok ? settings.data.kitchenSections : []}
          canManage
          currencyCode={ctx.restaurant.currencyCode}
        />
      )}
    </div>
  );
}
