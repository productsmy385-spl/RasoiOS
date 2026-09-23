import { requireTenantPage } from "@/lib/auth/guards";
import { reportRangeOrDefault, salesSummary } from "@/lib/data/reports";
import { Card } from "@/components/ui/card";
import { formatMoney } from "@/lib/ui/format";
import { FileBarChart, TrendingUp, Award } from "lucide-react";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

const single = (value: string | string[] | undefined) => (typeof value === "string" ? value : undefined);

// Reports (S1-P04-T007 interim; LD-RPT-01…05 in S1-P19). `report:read`; aggregates are scoped to the session's tenant
// and filtered by restaurant business dates (`?from=&to=`, default the last 7 days). Only from/to are read from the URL.
export default async function ReportsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const ctx = await requireTenantPage("report:read");
  const params = await searchParams;
  const range = reportRangeOrDefault(ctx, { from: single(params.from), to: single(params.to) });
  const summary = await salesSummary(ctx, range);
  const money = (amount: string) => formatMoney(amount, ctx.restaurant.currencyCode);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="font-display text-2xl font-bold text-fg-primary">
          Daily Operational Reports
        </h1>
        <p className="text-xs text-fg-secondary mt-1">
          Performance metrics, order volume analytics, and item sales distribution.
        </p>
        <p className="text-xs text-fg-secondary mt-1 tabular-nums">
          Business dates {range.from} to {range.to} ({ctx.restaurant.timezone})
        </p>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-border-subtle bg-card shadow-e1 p-5 flex items-center justify-between border-l-4 border-l-action-primary">
          <div>
            <p className="text-xs text-fg-secondary tabular-nums uppercase">Gross Sales</p>
            <p className="text-2xl font-bold tabular-nums text-fg-accent mt-1">
              {money(summary.grossSales)}
            </p>
            <p className="text-caption text-fg-secondary tabular-nums mt-1">
              Net {money(summary.netSales)} after {money(summary.refunds)} refunds
            </p>
          </div>
          <TrendingUp className="w-8 h-8 text-fg-accent/40" />
        </Card>

        <Card className="border border-border-subtle bg-card shadow-e1 p-5 flex items-center justify-between border-l-4 border-l-status-success">
          <div>
            <p className="text-xs text-fg-secondary tabular-nums uppercase">Fulfilled Orders</p>
            <p className="text-2xl font-bold tabular-nums text-status-success mt-1">
              {summary.completedCount} / {summary.orderCount}
            </p>
          </div>
          <Award className="w-8 h-8 text-status-success/40" />
        </Card>

        <Card className="border border-border-subtle bg-card shadow-e1 p-5 flex items-center justify-between border-l-4 border-l-action-primary">
          <div>
            <p className="text-xs text-fg-secondary tabular-nums uppercase">Average Order Value</p>
            <p className="text-2xl font-bold tabular-nums text-fg-accent mt-1">
              {money(summary.averageOrderValue)}
            </p>
          </div>
          <FileBarChart className="w-8 h-8 text-fg-accent/40" />
        </Card>
      </div>

      {/* Report Breakdown */}
      <Card className="border border-border-subtle bg-card shadow-e1 p-6 space-y-4">
        <h3 className="font-display font-bold text-lg text-fg-primary">
          Operational Summary
        </h3>
        <p className="text-xs text-fg-secondary">
          All order transactions snapshot historical product prices and tax rates at order creation time to guarantee financial immutability.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border-subtle">
          <div className="p-4 rounded-xl bg-canvas/60 border border-border-subtle space-y-2">
            <span className="text-xs tabular-nums text-fg-accent uppercase">
              Sales by Order Type
            </span>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-fg-secondary">
                <span>DINE IN</span>
                <span>{summary.byOrderType.DINE_IN.count} orders</span>
              </div>
              <div className="flex justify-between text-fg-secondary">
                <span>TAKEAWAY</span>
                <span>{summary.byOrderType.TAKEAWAY.count} orders</span>
              </div>
              <div className="flex justify-between text-fg-secondary">
                <span>DELIVERY</span>
                <span>{summary.byOrderType.DELIVERY.count} orders</span>
              </div>
            </div>
          </div>

        </div>
      </Card>
    </div>
  );
}
