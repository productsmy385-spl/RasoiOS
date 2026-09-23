import type { Metadata } from "next";
import { DailyMenuEditor } from "@/components/menu/daily-menu-editor";
import { MenuSectionNav } from "@/components/menu/menu-section-nav";
import { addDays, isBusinessDate } from "@/components/menu/business-date";
import { PageHeader } from "@/components/layout/page-header";
import { ErrorState } from "@/components/states/error-state";
import { requireTenantPage } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/permissions";
import { getDailyMenuAction, getDailyMenuCalendarAction } from "@/app/restaurant/menu/daily-actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Daily menu" };

type SearchParams = Record<string, string | string[] | undefined>;

const single = (value: string | string[] | undefined) => (typeof value === "string" ? value : undefined);

/** The status strip covers a fortnight from the earlier of today and the date being edited. */
const STRIP_DAYS = 14;

/**
 * `/restaurant/daily-menu` (S1-P11-T003; frontend.md §5.3). `daily_menu:read` opens the page for every tenant role;
 * `daily_menu:manage` is what turns the editor from read-only into something that can save and publish.
 *
 * The business date comes from `?date=`, and what counts as "today" comes from the server in the restaurant's
 * timezone (LD-DMENU-01) — never from the browser clock. A malformed date in the URL falls back to today rather than
 * being answered with a validation error.
 */
export default async function DailyMenuPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const ctx = await requireTenantPage("daily_menu:read");
  const params = await searchParams;
  const requested = single(params.date);
  const editor = await getDailyMenuAction(isBusinessDate(requested) ? { businessDate: requested } : {});

  if (!editor.ok) {
    return (
      <div className="flex flex-col">
        <PageHeader title="Daily menu" />
        <ErrorState requestId={editor.error.requestId} message={editor.error.message} />
      </div>
    );
  }

  const { businessDate, today } = editor.data;
  const from = businessDate < today ? businessDate : today;
  const calendar = await getDailyMenuCalendarAction({ from, to: addDays(from, STRIP_DAYS - 1) });

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Daily menu"
        description={`What guests see on a given day, in ${ctx.restaurant.timezone}. Publishing makes it live on your website for that date.`}
      />
      <MenuSectionNav current="daily" showDailyMenu />
      <DailyMenuEditor
        businessDate={businessDate}
        today={today}
        dailyMenu={editor.data.dailyMenu}
        pickableItems={editor.data.pickableItems}
        previousMenus={editor.data.previousMenus}
        calendar={calendar.ok ? calendar.data.items : []}
        canManage={hasPermission(ctx, "daily_menu:manage")}
        currencyCode={ctx.restaurant.currencyCode}
        timezone={ctx.restaurant.timezone}
      />
    </div>
  );
}
