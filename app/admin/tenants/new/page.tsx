import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CreateTenantForm } from "@/components/admin/create-tenant-form";
import { PageHeader } from "@/components/layout/page-header";
import { Icon } from "@/components/ui/icon";
import { requirePlatformPage } from "@/lib/auth/guards";
import { normalizeRootDomain } from "@/lib/tenancy/hostnames";
import { countryGroups, currencyGroups, timeZoneGroups } from "@/lib/ui/locale-options";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Create a restaurant" };

/**
 * `/admin/tenants/new` (S1-P06-T005). `platform:tenant:create` is resolved before the form renders, so a role that
 * could not submit it never sees it; the action re-checks the permission anyway (SC-RBAC-08).
 *
 * The option lists are built on the server from Intl (`lib/ui/locale-options.ts`), so the browser receives plain
 * `<option>`s — the form works before JavaScript loads, and the values can never drift from what the schema accepts.
 */
export default async function NewTenantPage() {
  await requirePlatformPage("platform:tenant:create");

  const rootDomain = normalizeRootDomain(process.env.PUBLIC_ROOT_DOMAIN);
  // Without a root domain the only public address is the path form, which is what the console then shows (ADR-012 §3).
  const addressTemplate = rootDomain ? { prefix: "https://", suffix: `.${rootDomain}` } : { prefix: "/r/", suffix: "" };

  return (
    <div className="mx-auto w-full max-w-3xl">
      <Link href="/admin/tenants" className="mb-4 inline-flex items-center gap-2 text-label text-fg-secondary hover:text-fg-primary">
        <Icon icon={ArrowLeft} size={18} />
        All restaurants
      </Link>
      <PageHeader
        title="Create a restaurant"
        description="Sets up the restaurant, its public address and its first administrator, and sends them an invitation."
      />
      <CreateTenantForm timeZones={timeZoneGroups()} currencies={currencyGroups()} countries={countryGroups()} addressTemplate={addressTemplate} />
    </div>
  );
}
