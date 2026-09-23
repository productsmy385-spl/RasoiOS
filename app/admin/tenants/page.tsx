import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/states/empty-state";
import { ErrorState } from "@/components/states/error-state";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FilterBar, type FilterDefinition } from "@/components/ui/filter-bar";
import { Icon } from "@/components/ui/icon";
import { Pagination } from "@/components/ui/pagination";
import { StatusBadge } from "@/components/ui/status-badge";
import { requirePlatformPage } from "@/lib/auth/guards";
import type { TenantListItem } from "@/lib/data/platform-tenants";
import { AppError } from "@/lib/errors";
import { hasPermission } from "@/lib/auth/permissions";
import { listTenantsForPlatform, type TenantListPage } from "@/lib/services/platform-tenants";
import { normalizeRootDomain } from "@/lib/tenancy/hostnames";
import { formatInZone } from "@/lib/ui/format";
import { DOMAIN_ICONS } from "@/lib/ui/icons";
import { tenantListQueryFromSearchParams } from "@/lib/validation/platform";
import { PublicAddress } from "@/components/admin/public-address";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Restaurants" };

const BASE_PATH = "/admin/tenants";

type SearchParams = Record<string, string | string[] | undefined>;

/**
 * `/admin/tenants` (S1-P06-T004; api.md LD-ADM-02). Every filter lives in the URL, so a filtered view can be shared and
 * reloaded, and the page reads exactly the four keys the loader owns — anything else in the query string is ignored.
 *
 * Rows are tenant *metadata* only (name, address, status, member count, created): the loader never returns a
 * restaurant's orders, customers or menu, and this page has no way to ask for them (SC-RBAC-07).
 *
 * Sorting is a control in the filter bar rather than a bidirectional column header, because LD-ADM-02 offers exactly
 * two orderings — name A–Z and newest first — and a header that offered to reverse them would be promising something
 * the loader cannot do.
 */
export default async function AdminTenantsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const ctx = await requirePlatformPage("platform:tenant:read");
  const params = await searchParams;
  const query = tenantListQueryFromSearchParams(params);
  const canCreate = hasPermission(ctx, "platform:tenant:create");
  const rootDomain = normalizeRootDomain(process.env.PUBLIC_ROOT_DOMAIN);

  let page: TenantListPage | null = null;
  let failure: { message: string; requestId: string } | null = null;
  try {
    page = await listTenantsForPlatform(ctx, query);
  } catch (error) {
    // A tampered or expired cursor is a 422; the way back is the first page, not a retry.
    if (!(error instanceof AppError)) throw error;
    failure = { message: error.message, requestId: ctx.requestId };
  }

  const filtered = Boolean(query.q || query.status);

  const filters: FilterDefinition[] = [
    { type: "search", name: "q", label: "Search restaurants", placeholder: "Spice Route" },
    { type: "select", name: "status", label: "Status", allLabel: "All statuses", options: [{ value: "ACTIVE", label: "Active" }, { value: "SUSPENDED", label: "Suspended" }] },
    { type: "select", name: "sort", label: "Sort", allLabel: "Name A–Z", options: [{ value: "createdAt", label: "Newest first" }] },
  ];

  const columns: DataTableColumn<TenantListItem>[] = [
    {
      key: "name",
      header: "Restaurant",
      primary: true,
      cell: (row) => (
        <Link href={`${BASE_PATH}/${row.id}`} className="block truncate text-subheading text-fg-primary hover:text-fg-accent" title={row.name}>
          {row.name}
        </Link>
      ),
      text: (row) => row.name,
    },
    { key: "address", header: "Address", cell: (row) => <PublicAddress slug={row.slug} rootDomain={rootDomain} />, text: (row) => row.slug },
    { key: "status", header: "Status", cell: (row) => <StatusBadge domain="tenant" status={row.status} /> },
    {
      key: "website",
      header: "Website",
      cell: (row) => <span className="text-body text-fg-secondary">{row.websitePublished ? "Published" : "Not published"}</span>,
      text: (row) => (row.websitePublished ? "Published" : "Not published"),
    },
    { key: "members", header: "Staff", numeric: true, text: (row) => String(row.memberCount) },
    { key: "createdAt", header: "Created", numeric: true, text: (row) => `${formatInZone(row.createdAt, "UTC", "date")} UTC` },
  ];

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Restaurants"
        description="Every restaurant on the platform, with its public address and who can sign in to it."
        actions={
          canCreate ? (
            <Link
              href={`${BASE_PATH}/new`}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-action-primary px-4 text-label text-action-primary-fg transition-colors duration-fast ease-standard hover:bg-action-primary-hover"
            >
              <Icon icon={Plus} size={18} />
              Create restaurant
            </Link>
          ) : undefined
        }
      />

      {page ? (
        <div className="flex flex-col gap-6">
          <FilterBar filters={filters} />
          <DataTable
            caption="Restaurants"
            columns={columns}
            rows={page.items}
            getRowKey={(row) => row.id}
            empty={
              filtered ? (
                <EmptyState
                  icon={DOMAIN_ICONS.restaurant}
                  title="No restaurants match these filters"
                  description="Try a different search term, or clear the filters to see every restaurant."
                  action={{ href: BASE_PATH, label: "Clear filters" }}
                />
              ) : (
                <EmptyState
                  icon={DOMAIN_ICONS.restaurant}
                  title="No restaurants yet"
                  description="Create the first restaurant: it gets its own address, its own website and its own administrator."
                  action={canCreate ? { href: `${BASE_PATH}/new`, label: "Create restaurant" } : undefined}
                />
              )
            }
          />
          <Pagination
            basePath={BASE_PATH}
            searchParams={params}
            nextCursor={page.nextCursor}
            summary={`Showing ${page.items.length} ${page.items.length === 1 ? "restaurant" : "restaurants"}`}
          />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <ErrorState requestId={failure?.requestId} message={failure?.message} />
          <Link href={BASE_PATH} className="text-label text-fg-accent hover:underline">
            Start from the first page
          </Link>
        </div>
      )}
    </div>
  );
}
