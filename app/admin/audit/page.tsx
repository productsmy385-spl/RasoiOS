import type { Metadata } from "next";
import Link from "next/link";
import { DiffView } from "@/components/audit/audit-entry";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/states/empty-state";
import { Card } from "@/components/ui/card";
import { FilterBar, type FilterDefinition } from "@/components/ui/filter-bar";
import { IconTile } from "@/components/ui/icon-tile";
import { Pagination } from "@/components/ui/pagination";
import { requirePlatformPage } from "@/lib/auth/guards";
import { listPlatformAudit, platformAuditFilterOptions, type PlatformAuditEntryDto } from "@/lib/data/audit";
import { parseIsoDate } from "@/lib/time/business-date";
import { formatInZone } from "@/lib/ui/format";
import { DOMAIN_HUES, DOMAIN_ICONS } from "@/lib/ui/icons";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Platform audit" };

const BASE_PATH = "/admin/audit";

type SearchParams = Record<string, string | string[] | undefined>;

const single = (value: string | string[] | undefined) => (typeof value === "string" && value.trim() ? value.trim() : undefined);
const isoDate = (value: string | undefined) => (value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * `/admin/audit` (S1-P06-T007; api.md LD-ADM-04). The platform's own trail: tenants created, renamed, suspended,
 * reactivated and handed over, their administrators' invitations, and events that belong to no tenant at all.
 *
 * A restaurant's operational trail is deliberately absent — that belongs to the restaurant and is read from its own
 * console (SC-AUD-05). Times are UTC with the zone named: the platform has no single restaurant's time zone.
 */
export default async function PlatformAuditPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const ctx = await requirePlatformPage("platform:audit:read");
  const params = await searchParams;

  const action = single(params.action);
  const tenantFilter = single(params.tenant);
  const tenantId = tenantFilter && UUID.test(tenantFilter) ? tenantFilter : undefined;
  const from = isoDate(single(params.from));
  const to = isoDate(single(params.to));

  const [{ items, nextCursor }, options] = await Promise.all([
    listPlatformAudit(ctx, {
      action,
      tenantId,
      from: from ? parseIsoDate(from) : undefined,
      // `to` is a date someone picked, so it means the whole of that day.
      to: to ? new Date(parseIsoDate(to).getTime() + 24 * 60 * 60 * 1000 - 1) : undefined,
      cursor: single(params.cursor),
    }),
    platformAuditFilterOptions(ctx),
  ]);

  const filters: FilterDefinition[] = [
    { type: "select", name: "action", label: "Action", allLabel: "All actions", options: options.actions.map((value) => ({ value, label: value })) },
    { type: "select", name: "tenant", label: "Restaurant", allLabel: "All restaurants", options: options.tenants.map((tenant) => ({ value: tenant.id, label: tenant.name })) },
    { type: "date", name: "from", label: "From" },
    { type: "date", name: "to", label: "To" },
  ];
  const filtered = Boolean(action || tenantId || from || to);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col">
      <PageHeader title="Platform audit" description="Restaurants created, suspended, reactivated and handed over. Times are UTC." />

      <div className="flex flex-col gap-6">
        <Card padding="compact">
          <FilterBar filters={filters} />
        </Card>

        <Card padding="compact" data-testid="platform-audit-entries">
          {items.length === 0 ? (
            <EmptyState
              icon={DOMAIN_ICONS.audit}
              title={filtered ? "No platform events for these filters" : "Nothing recorded yet"}
              description={
                filtered
                  ? "Widen the dates, choose another action, or clear the filters."
                  : "Creating, renaming, suspending or handing over a restaurant is recorded here as it happens."
              }
              action={filtered ? { href: BASE_PATH, label: "Clear filters" } : undefined}
            />
          ) : (
            items.map((entry) => <PlatformAuditRow key={entry.id} entry={entry} />)
          )}
        </Card>

        <Pagination
          basePath={BASE_PATH}
          searchParams={params}
          nextCursor={nextCursor}
          summary={`Showing ${items.length} ${items.length === 1 ? "event" : "events"}`}
        />
      </div>
    </div>
  );
}

/** One platform event. Expanding it is a native `<details>`, so it works before JavaScript loads. */
function PlatformAuditRow({ entry }: { entry: PlatformAuditEntryDto }) {
  const actor = entry.actorType === "USER" ? (entry.actorName ?? "Someone") : entry.actorType === "PRINT_AGENT" ? "Print agent" : "System";
  return (
    <details className="group border-b border-border-subtle last:border-b-0" data-testid="platform-audit-entry">
      <summary className="flex cursor-pointer items-start gap-3 px-1 py-3 hover:bg-raised/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">
        <IconTile icon={DOMAIN_ICONS.audit} size="sm" tone={DOMAIN_HUES.audit} />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-mono text-label text-fg-primary">{entry.action}</span>
            {entry.tenantId && entry.tenantName ? (
              <Link href={`/admin/tenants/${entry.tenantId}`} className="text-body text-fg-accent hover:underline">
                {entry.tenantName}
              </Link>
            ) : (
              <span className="text-body text-fg-secondary">Platform</span>
            )}
          </span>
          <span className="mt-0.5 flex flex-wrap items-baseline gap-x-2 text-caption text-fg-secondary">
            <span>{actor}</span>
            {entry.actorRole && <span>· {entry.actorRole}</span>}
            <span>· {formatInZone(entry.createdAt, "UTC", "datetime")} UTC</span>
            {entry.ipPrefix && <span>· {entry.ipPrefix}</span>}
          </span>
          {entry.reason && <span className="mt-1 block text-caption text-fg-primary">“{entry.reason}”</span>}
        </span>
        <span className="pt-1 text-caption text-fg-secondary group-open:hidden">Show detail</span>
        <span className="hidden pt-1 text-caption text-fg-secondary group-open:inline">Hide detail</span>
      </summary>
      <div className="px-1 pb-4 pl-12">
        <DiffView entry={entry} />
      </div>
    </details>
  );
}
