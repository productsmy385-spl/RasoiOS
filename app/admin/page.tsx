import type { Metadata } from "next";
import Link from "next/link";
import { Plus, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/states/empty-state";
import { PublicAddress } from "@/components/admin/public-address";
import { Card } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Icon } from "@/components/ui/icon";
import { StatusBadge } from "@/components/ui/status-badge";
import { requirePlatformPage } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/permissions";
import type { PlatformAuditRow, RecentTenant } from "@/lib/data/platform-tenants";
import { getPlatformDashboard } from "@/lib/services/platform-tenants";
import { normalizeRootDomain } from "@/lib/tenancy/hostnames";
import { formatInZone } from "@/lib/ui/format";
import { DOMAIN_HUES, DOMAIN_ICONS, type DomainHue } from "@/lib/ui/icons";
import { MetricCard } from "@/components/ui/metric-card";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Platform" };

/**
 * `/admin` (S1-P06-T003; api.md LD-ADM-01). Three sections rather than a wall of tiles (ADR-013 §4): how many
 * restaurants are running, the newest ones, and what has happened at platform level.
 *
 * Every number on this page is a count this request read from the database. There is no uptime badge and no
 * "operational" indicator: the platform has no health signal to back one, and inventing one was baseline defect BA-30.
 */
export default async function PlatformDashboardPage() {
  const ctx = await requirePlatformPage("platform:tenant:read");
  const { tenantCounts, recentTenants, recentPlatformAudit } = await getPlatformDashboard(ctx);
  const canCreate = hasPermission(ctx, "platform:tenant:create");
  const canReadAudit = hasPermission(ctx, "platform:audit:read");
  const rootDomain = normalizeRootDomain(process.env.PUBLIC_ROOT_DOMAIN);
  const total = tenantCounts.active + tenantCounts.suspended;

  const columns: DataTableColumn<RecentTenant>[] = [
    {
      key: "name",
      header: "Restaurant",
      primary: true,
      cell: (row) => (
        <Link href={`/admin/tenants/${row.id}`} className="block truncate text-subheading text-fg-primary hover:text-fg-accent" title={row.name}>
          {row.name}
        </Link>
      ),
      text: (row) => row.name,
    },
    { key: "address", header: "Address", cell: (row) => <PublicAddress slug={row.slug} rootDomain={rootDomain} />, text: (row) => row.slug },
    { key: "status", header: "Status", cell: (row) => <StatusBadge domain="tenant" status={row.status} /> },
    { key: "createdAt", header: "Created", numeric: true, text: (row) => `${formatInZone(row.createdAt, "UTC", "date")} UTC` },
  ];

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Platform"
        description="Every restaurant running on RASOIOS, and what has changed at platform level."
        actions={
          canCreate ? (
            <Link
              href="/admin/tenants/new"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-action-primary px-4 text-label text-action-primary-fg transition-colors duration-fast ease-standard hover:bg-action-primary-hover"
            >
              <Icon icon={Plus} size={18} />
              Create restaurant
            </Link>
          ) : undefined
        }
      />

      <section aria-labelledby="platform-counts" className="flex flex-col gap-4">
        <h2 id="platform-counts" className="sr-only">
          Restaurants by status
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatTile label="Active restaurants" value={tenantCounts.active} icon={DOMAIN_ICONS.restaurant} hue="success" />
          <StatTile label="Suspended" value={tenantCounts.suspended} icon={DOMAIN_ICONS.settings} hue={tenantCounts.suspended > 0 ? "danger" : "neutral"} />
          <StatTile label="Total" value={total} icon={DOMAIN_ICONS.dashboard} hue={DOMAIN_HUES.dashboard} />
        </div>
      </section>

      <section aria-labelledby="recent-tenants" className="mt-8 flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="recent-tenants" className="text-heading text-fg-primary">
            Newest restaurants
          </h2>
          {total > 0 && (
            <Link href="/admin/tenants" className="text-label text-fg-accent hover:underline">
              All restaurants
            </Link>
          )}
        </div>
        <DataTable
          caption="Newest restaurants"
          columns={columns}
          rows={recentTenants}
          getRowKey={(row) => row.id}
          empty={
            <EmptyState
              icon={DOMAIN_ICONS.restaurant}
              title="No restaurants yet"
              description="Create the first restaurant: it gets its own address, its own website and its own administrator."
              action={canCreate ? { href: "/admin/tenants/new", label: "Create restaurant" } : undefined}
            />
          }
        />
      </section>

      {canReadAudit && (
        <section aria-labelledby="platform-activity" className="mt-8 flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="platform-activity" className="text-heading text-fg-primary">
              Recent platform activity
            </h2>
            <Link href="/admin/audit" className="text-label text-fg-accent hover:underline">
              Full audit log
            </Link>
          </div>
          <Card padding="compact">
            {recentPlatformAudit.length === 0 ? (
              <EmptyState
                icon={DOMAIN_ICONS.audit}
                title="Nothing recorded yet"
                description="Creating, suspending or handing over a restaurant is recorded here as it happens."
              />
            ) : (
              <ul className="flex flex-col">
                {recentPlatformAudit.map((row) => (
                  <PlatformActivityRow key={row.id} row={row} />
                ))}
              </ul>
            )}
          </Card>
        </section>
      )}
    </div>
  );
}

function StatTile({ label, value, icon, hue }: { label: string; value: number; icon: LucideIcon; hue: DomainHue }) {
  return (
    <MetricCard label={label} value={value} icon={icon} hue={hue} />
  );
}

function PlatformActivityRow({ row }: { row: PlatformAuditRow }) {
  return (
    <li className="flex flex-wrap items-baseline gap-x-2 gap-y-1 border-b border-border-subtle px-1 py-3 last:border-b-0">
      <span className="font-mono text-label text-fg-primary">{row.action}</span>
      {row.tenantName && row.tenantId ? (
        <Link href={`/admin/tenants/${row.tenantId}`} className="text-body text-fg-accent hover:underline">
          {row.tenantName}
        </Link>
      ) : (
        <span className="text-body text-fg-secondary">Platform</span>
      )}
      <span className="text-caption text-fg-secondary">
        · {row.actorRole ?? row.actorType} · {formatInZone(row.createdAt, "UTC", "datetime")} UTC
      </span>
    </li>
  );
}
