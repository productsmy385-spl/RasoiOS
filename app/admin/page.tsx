import { SuperAdminNav } from "@/components/admin/SuperAdminNav";
import { TenantList } from "@/components/admin/TenantList";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/db/prisma";
import { Building2, ShieldCheck, DollarSign, Activity } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SuperAdminDashboardPage() {
  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
  });

  const activeTenants = tenants.filter((t) => t.status === "ACTIVE").length;

  return (
    <div className="min-h-screen bg-[#1A1715] text-[#F3F4F6] flex flex-col">
      <SuperAdminNav />

      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full space-y-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-[#FBF9F5]">
            Platform Governance Console
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Overview of registered tenant software licenses, security isolation, and active deployments.
          </p>
        </div>

        {/* Global Platform Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass-panel p-5 flex items-center justify-between border-l-4 border-l-[#D97706]">
            <div>
              <p className="text-xs text-gray-400 font-mono uppercase">Total Tenants</p>
              <p className="text-3xl font-bold font-mono text-[#FBF9F5] mt-1">{tenants.length}</p>
            </div>
            <Building2 className="w-8 h-8 text-[#D97706]/40" />
          </Card>

          <Card className="glass-panel p-5 flex items-center justify-between border-l-4 border-l-[#10B981]">
            <div>
              <p className="text-xs text-gray-400 font-mono uppercase">Active Licenses</p>
              <p className="text-3xl font-bold font-mono text-[#10B981] mt-1">{activeTenants}</p>
            </div>
            <ShieldCheck className="w-8 h-8 text-[#10B981]/40" />
          </Card>

          <Card className="glass-panel p-5 flex items-center justify-between border-l-4 border-l-amber-500">
            <div>
              <p className="text-xs text-gray-400 font-mono uppercase">Commercial Model</p>
              <p className="text-lg font-bold font-mono text-amber-400 mt-1">Software Product</p>
              <p className="text-[10px] text-gray-500">No Recurring Billing</p>
            </div>
            <DollarSign className="w-8 h-8 text-amber-500/40" />
          </Card>

          <Card className="glass-panel p-5 flex items-center justify-between border-l-4 border-l-purple-500">
            <div>
              <p className="text-xs text-gray-400 font-mono uppercase">Platform Health</p>
              <p className="text-lg font-bold font-mono text-purple-400 mt-1">100% Operational</p>
            </div>
            <Activity className="w-8 h-8 text-purple-500/40" />
          </Card>
        </div>

        {/* Tenants Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-[#FBF9F5]">
              Registered Restaurant Tenants
            </h2>
          </div>

          <TenantList tenants={tenants} />
        </div>
      </main>
    </div>
  );
}
