import Link from "next/link";
import { ChartColumn, ChefHat, ClipboardList, Receipt, Store, type LucideIcon } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { IconTile } from "@/components/ui/icon-tile";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/states/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { requireTenantPage } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/permissions";
import { listKitchenTickets } from "@/lib/data/kot";
import { listOrders } from "@/lib/data/orders";
import { businessDaysEndingToday, salesSummary, type SalesSummary } from "@/lib/data/reports";
import type { DomainHue } from "@/lib/ui/icons";
import { formatBusinessDate, formatInZone, formatMoney } from "@/lib/ui/format";
import { NAV_HUES, NAV_ICONS, NAV_ITEMS, type NavKey } from "@/lib/ui/navigation";
import { MetricCard } from "@/components/ui/metric-card";

export const dynamic = "force-dynamic";

const PANEL_ROWS = 6;

/**
 * Dashboard (ADR-013 §4): a context header, one metric row, one quick-actions block and the live operational panels —
 * not a grid of small cards. Every figure on this page comes from a tenant-scoped query; when there is nothing yet,
 * an empty state replaces the metrics rather than showing zeros that look like a reading.
 *
 * Every tenant role lands here (`restaurant:read`); today's sales are shown only with `dashboard:read`
 * (security.md §3.3 row 8 — TENANT_ADMIN and MANAGER). "Today" is the restaurant's business date, not the server's.
 */
type Metric = { label: string; value: string; support: string; icon: LucideIcon; hue: DomainHue };

function metricsFor(sales: SalesSummary, currencyCode: string, businessDate: string): Metric[] {
  return [
    {
      label: "Net sales",
      value: formatMoney(sales.netSales, currencyCode),
      support: `Gross ${formatMoney(sales.grossSales, currencyCode)} · refunds ${formatMoney(sales.refunds, currencyCode)}`,
      icon: ChartColumn,
      hue: "accent",
    },
    {
      label: "Orders counted as sales",
      value: String(sales.salesOrderCount),
      support: `${sales.orderCount} orders placed · ${sales.cancelledCount} cancelled`,
      icon: ClipboardList,
      hue: "secondary",
    },
    {
      label: "Average order value",
      value: formatMoney(sales.averageOrderValue, currencyCode),
      support: `Business date ${formatBusinessDate(businessDate)}`,
      icon: Receipt,
      hue: "warning",
    },
  ];
}

export default async function RestaurantDashboardPage() {
  const ctx = await requireTenantPage("restaurant:read");
  const timezone = ctx.restaurant.timezone;
  const currency = ctx.restaurant.currencyCode;

  const canReadSales = hasPermission(ctx, "dashboard:read");
  const canReadOrders = hasPermission(ctx, "order:read");
  const canReadKitchen = hasPermission(ctx, "kot:read");
  const today = canReadSales ? businessDaysEndingToday(ctx, 1) : null;

  const [sales, orders, tickets] = await Promise.all([
    today ? salesSummary(ctx, today) : null,
    canReadOrders ? listOrders(ctx, { searchCustomers: false, limit: PANEL_ROWS }) : [],
    canReadKitchen ? listKitchenTickets(ctx, { limit: PANEL_ROWS }) : [],
  ]);

  // Quick actions reuse the navigation entries, so a link can never point at a route the navigation does not know
  // about, and the capability filter is the same one the server enforces (SC-RBAC-08).
  const QUICK_ACTION_COPY: Partial<Record<NavKey, string>> = {
    orders: "Take and follow orders",
    kitchen: "Live ticket board",
    menu: "Categories, items and availability",
    transactions: "Payments, refunds and day close",
    printing: "Printers, agents and the queue",
    reports: "Sales and top-selling items",
  };
  const quickActions = NAV_ITEMS.filter((item) => QUICK_ACTION_COPY[item.key] && hasPermission(ctx, item.capability));

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Today at a glance"
        description={
          today ? (
            <>Business date {formatBusinessDate(today.to)} · times shown in {timezone}</>
          ) : (
            <>Your restaurant&apos;s live operations · times shown in {timezone}</>
          )
        }
      />

      {/* One metric row — only for roles that may see money. */}
      {sales && today && (
        <section aria-labelledby="dashboard-sales-heading" data-testid="dashboard-sales-today">
          <h2 id="dashboard-sales-heading" className="mb-4 text-heading font-sans">
            Sales today
          </h2>
          {sales.orderCount === 0 ? (
            <Card>
              <EmptyState
                icon={Receipt}
                title="No orders on this business date yet"
                description={`Nothing has been recorded for ${formatBusinessDate(today.to)}. Figures appear here as orders are completed.`}
                {...(hasPermission(ctx, "order:read") ? { action: { href: "/restaurant/orders", label: "Open orders" } } : {})}
              />
            </Card>
          ) : (
            <div className="grid items-stretch gap-4 md:grid-cols-3 md:gap-6">
              {metricsFor(sales, currency, today.to).map((metric) => (
                <MetricCard key={metric.label} label={metric.label} value={metric.value} support={metric.support} icon={metric.icon} hue={metric.hue} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* One quick-actions block. */}
      {quickActions.length > 0 && (
        <section aria-labelledby="dashboard-actions-heading">
          <h2 id="dashboard-actions-heading" className="mb-4 text-heading font-sans">
            Go to
          </h2>
          <Card surface="glass" padding="feature">
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {quickActions.map((action) => (
                <li key={action.key}>
                  <Link
                    href={action.href}
                    className="flex min-h-14 items-center gap-3 rounded-xl border border-border-subtle bg-canvas px-4 py-3 transition-colors duration-fast ease-standard hover:border-border-strong hover:bg-raised"
                  >
                    <IconTile icon={NAV_ICONS[action.key]} size="sm" tone={NAV_HUES[action.key]} />
                    <span className="flex min-w-0 flex-col">
                      <span className="text-label text-fg-primary">{action.label}</span>
                      <span className="truncate text-caption text-fg-secondary">{QUICK_ACTION_COPY[action.key]}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}

      {/* Live operational panels. */}
      <section aria-labelledby="dashboard-live-heading">
        <h2 id="dashboard-live-heading" className="mb-4 text-heading font-sans">
          Live operations
        </h2>
        <div className="grid items-stretch gap-4 lg:grid-cols-2 lg:gap-6">
          {canReadOrders && (
            <Card>
              <CardHeader
                action={
                  <Link href="/restaurant/orders" className="text-label text-fg-accent hover:underline">
                    All orders
                  </Link>
                }
              >
                <CardTitle>Latest orders</CardTitle>
              </CardHeader>
              {orders.length === 0 ? (
                <EmptyState icon={ClipboardList} title="No orders yet" description="Orders taken at the counter or from your public menu page appear here." />
              ) : (
                <ul className="divide-y divide-border-subtle">
                  {orders.map((order) => (
                    <li key={order.id} className="flex items-center gap-3 py-3">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-label text-fg-primary">
                          #{order.orderNumber}
                          {order.tableLabel ? ` · ${order.tableLabel}` : ""}
                        </span>
                        <span className="block text-caption text-fg-secondary">
                          <time dateTime={order.createdAt} title={order.createdAt}>
                            {formatInZone(order.createdAt, timezone, "time")}
                          </time>
                          {order.totalAmount ? ` · ${formatMoney(order.totalAmount, order.currencyCode)}` : ""}
                        </span>
                      </span>
                      <StatusBadge domain="order" status={order.status} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {canReadKitchen && (
            <Card>
              <CardHeader
                action={
                  <Link href="/restaurant/kitchen" className="text-label text-fg-accent hover:underline">
                    Kitchen board
                  </Link>
                }
              >
                <CardTitle>Kitchen queue</CardTitle>
              </CardHeader>
              {tickets.length === 0 ? (
                <EmptyState icon={ChefHat} title="No tickets in the kitchen" description="Kitchen tickets appear here while they are queued, being prepared or waiting to be served." />
              ) : (
                <ul className="divide-y divide-border-subtle">
                  {tickets.map((ticket) => (
                    <li key={ticket.id} className="flex items-center gap-3 py-3">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-label text-fg-primary">
                          KOT {ticket.kotNumber} · #{ticket.orderNumber}
                        </span>
                        <span className="block truncate text-caption text-fg-secondary">
                          <time dateTime={ticket.queuedAt} title={ticket.queuedAt}>
                            {formatInZone(ticket.queuedAt, timezone, "time")}
                          </time>
                          {ticket.kitchenSection ? ` · ${ticket.kitchenSection.name}` : ""}
                          {` · ${ticket.items.length} ${ticket.items.length === 1 ? "line" : "lines"}`}
                        </span>
                      </span>
                      <StatusBadge domain="kot" status={ticket.status} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {!canReadOrders && !canReadKitchen && (
            <Card>
              <EmptyState icon={Store} title="Nothing to show here" description="Your role does not include the orders or kitchen boards. Use the navigation for the areas you can reach." />
            </Card>
          )}
        </div>
      </section>

      <p className="flex items-center gap-2 text-caption text-fg-secondary">
        <Icon icon={Store} size={16} />
        Figures and tickets are read live from your restaurant each time this page loads.
      </p>
    </div>
  );
}
