import type { Metadata } from "next";
import { CategoriesBoard } from "@/components/menu/categories-board";
import { MenuSectionNav } from "@/components/menu/menu-section-nav";
import { ErrorState } from "@/components/states/error-state";
import { PageHeader } from "@/components/layout/page-header";
import { requireTenantPage } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/permissions";
import { listMenuCategoriesAction } from "../categories-actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Menu categories" };

type SearchParams = Record<string, string | string[] | undefined>;

const single = (value: string | string[] | undefined) => (typeof value === "string" ? value : undefined);

/**
 * `/restaurant/menu/categories` (S1-P10-T005; frontend.md §5.3). Server Component: `menu:read` is resolved before
 * anything renders, the list comes from LD-MENU-01 through the Server Action, and the interactive board below is the
 * only client code. Manage controls appear for `menu:manage` only — and the server refuses the actions regardless
 * (SC-RBAC-08).
 */
export default async function MenuCategoriesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const ctx = await requireTenantPage("menu:read");
  const params = await searchParams;
  const archived = single(params.archived) === "true";
  const result = await listMenuCategoriesAction({ archived });
  const canManage = hasPermission(ctx, "menu:manage");

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Menu categories"
        description="Group your dishes, choose their order on the public menu, and publish the ones guests should see."
      />
      <MenuSectionNav current="categories" showDailyMenu={hasPermission(ctx, "daily_menu:read")} />
      {result.ok ? (
        <CategoriesBoard categories={result.data.items} canManage={canManage} archived={archived} />
      ) : (
        <ErrorState requestId={result.error.requestId} message={result.error.message} />
      )}
    </div>
  );
}
