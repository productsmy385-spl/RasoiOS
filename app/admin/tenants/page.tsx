import { SuperAdminNav } from "@/components/admin/SuperAdminNav";
import { TenantList } from "@/components/admin/TenantList";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function AdminTenantsPage() {
  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-[#1A1715] text-[#F3F4F6] flex flex-col">
      <SuperAdminNav />
      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#FBF9F5]">
            Tenant License Management
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Manage multi-tenant software instances and database security policies.
          </p>
        </div>

        <TenantList tenants={tenants} />
      </main>
    </div>
  );
}
