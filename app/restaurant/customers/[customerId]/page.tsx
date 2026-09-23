import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CustomerActions } from "@/components/customers/customer-actions";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { DescriptionList, type DescriptionItem } from "@/components/ui/description-list";
import { EmptyState } from "@/components/states/empty-state";
import { Icon } from "@/components/ui/icon";
import { IconTile } from "@/components/ui/icon-tile";
import { Pagination } from "@/components/ui/pagination";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireTenantPage } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/permissions";
import type { CustomerOrderDto } from "@/lib/data/customers";
import { formatBusinessDate, formatInZone, formatMoney } from "@/lib/ui/format";
import { DOMAIN_HUES, DOMAIN_ICONS } from "@/lib/ui/icons";
import { ErrorState } from "@/components/states/error-state";
import { getCustomerHistoryAction } from "../actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Customer" };

type SearchParams = Record<string, string | string[] | undefined>;
const single = (value: string | string[] | undefined) => (typeof value === "string" && value.trim() ? value.trim() : undefined);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * `/restaurant/customers/[customerId]` (S1-P13-T003; api.md LD-CUS-02). One customer of this restaurant with their
 * order history. Another restaurant's customer id renders the same not-found page as an id that does not exist, so
 * the URL cannot be used to discover who exists elsewhere (SC-TEN-04, TI-034).
 *
 * Order amounts are shown only to a role that may see money (`transaction:read`); the loader decides that, not this
 * page. Notes are staff-only and labelled as such wherever they appear.
 */
export default async function CustomerPage({ params, searchParams }: { params: Promise<{ customerId: string }>; searchParams: Promise<SearchParams> }) {
  const ctx = await requireTenantPage("customer:read");
  const { customerId } = await params;
  if (!UUID.test(customerId)) notFound();
  const query = await searchParams;

  const result = await getCustomerHistoryAction({ customerId, cursor: single(query.cursor) });
  if (!result.ok) {
    if (result.error.code === "NOT_FOUND") notFound();
    return (
      <div className="mx-auto w-full max-w-4xl">
        <ErrorState requestId={result.error.requestId} message={result.error.message} />
      </div>
    );
  }
  const { customer, orders, nextCursor } = result.data;

  const money = (amount: string) => formatMoney(amount, ctx.restaurant.currencyCode);
  const basePath = `/restaurant/customers/${customer.id}`;

  const details: DescriptionItem[] = [
    { term: "Phone", value: customer.phoneE164 ?? "Not given" },
    { term: "Email", value: customer.email ?? "Not given" },
    { term: "First seen", value: formatInZone(customer.createdAt, ctx.restaurant.timezone, "date") },
  ];

  const columns: DataTableColumn<CustomerOrderDto>[] = [
    { key: "orderNumber", header: "Order", primary: true, text: (order) => order.orderNumber },
    { key: "status", header: "Status", cell: (order) => <StatusBadge domain="order" status={order.status} /> },
    { key: "businessDate", header: "Business day", text: (order) => formatBusinessDate(order.businessDate) },
    {
      key: "total",
      header: "Total",
      numeric: true,
      // The loader leaves the amount out for roles that may not see money; the column says so rather than showing 0.
      text: (order) => (order.totalAmount === null ? "—" : money(order.totalAmount)),
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col">
      <Link href="/restaurant/customers" className="mb-4 inline-flex items-center gap-2 text-label text-fg-secondary hover:text-fg-primary">
        <Icon icon={ArrowLeft} size={18} />
        All customers
      </Link>

      <div className="flex flex-col gap-4 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <IconTile icon={DOMAIN_ICONS.customers} size="lg" tone={DOMAIN_HUES.customers} />
          <div className="min-w-0">
            <h1 className="text-display-m text-fg-primary">{customer.fullName}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {customer.isAnonymized && <Badge tone="neutral">Personal data erased</Badge>}
              {customer.isArchived && !customer.isAnonymized && <Badge tone="neutral">Archived</Badge>}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CustomerActions
            customer={customer}
            can={{
              update: hasPermission(ctx, "customer:update"),
              archive: hasPermission(ctx, "customer:archive"),
              anonymise: hasPermission(ctx, "customer:archive") && ctx.role === "TENANT_ADMIN",
            }}
          />
        </div>
      </div>

      {customer.isAnonymized && (
        <Alert tone="neutral" title="This customer's personal data was erased" className="mb-6">
          The orders below are kept so the restaurant&apos;s history and totals stay correct, but there is no longer a name, phone, email or note attached to them.
        </Alert>
      )}

      <Card padding="feature">
        <DescriptionList items={details} />
      </Card>

      <section aria-labelledby="customer-notes" className="mt-8 flex flex-col gap-4">
        <h2 id="customer-notes" className="text-heading text-fg-primary">
          Notes
        </h2>
        <Card padding="feature">
          {customer.notes ? (
            <p className="whitespace-pre-wrap text-body text-fg-primary">{customer.notes}</p>
          ) : (
            <p className="text-body text-fg-secondary">No notes.</p>
          )}
          <p className="mt-3 text-caption text-fg-secondary">Seen by your staff only — never on the website, a receipt or a ticket.</p>
        </Card>
      </section>

      <section aria-labelledby="customer-orders" className="mt-8 flex flex-col gap-4">
        <h2 id="customer-orders" className="text-heading text-fg-primary">
          Order history
        </h2>
        <DataTable
          caption={`Orders by ${customer.fullName}`}
          columns={columns}
          rows={orders}
          getRowKey={(order) => order.id}
          empty={<EmptyState icon={DOMAIN_ICONS.orders} title="No orders yet" description="Orders taken with this customer attached will appear here, newest first." />}
        />
        <Pagination basePath={basePath} searchParams={query} nextCursor={nextCursor} />
      </section>
    </div>
  );
}
