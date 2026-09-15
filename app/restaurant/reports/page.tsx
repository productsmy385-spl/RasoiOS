import { prisma } from "@/lib/db/prisma";
import { getAuthenticatedSession } from "@/lib/auth/clerk";
import { resolveTenantContext } from "@/lib/auth/tenant-context";
import { Card } from "@/components/ui/card";
import { FileBarChart, TrendingUp, Award } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const session = await getAuthenticatedSession();
  const context = resolveTenantContext(session);

  const orders = await prisma.order.findMany({
    where: { tenantId: context.tenantId },
    include: { items: true },
  });

  const totalSales = orders.reduce(
    (acc, o) => acc + Number(o.totalAmount),
    0
  );

  const completedCount = orders.filter((o) => o.status === "COMPLETED").length;
  const avgOrderValue = orders.length > 0 ? totalSales / orders.length : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="font-display text-2xl font-bold text-[#FBF9F5]">
          Daily Operational Reports
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Performance metrics, order volume analytics, and item sales distribution.
        </p>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="glass-panel p-5 flex items-center justify-between border-l-4 border-l-[#D97706]">
          <div>
            <p className="text-xs text-gray-400 font-mono uppercase">Gross Sales</p>
            <p className="text-2xl font-bold font-mono text-[#D97706] mt-1">
              ${totalSales.toFixed(2)}
            </p>
          </div>
          <TrendingUp className="w-8 h-8 text-[#D97706]/40" />
        </Card>

        <Card className="glass-panel p-5 flex items-center justify-between border-l-4 border-l-[#10B981]">
          <div>
            <p className="text-xs text-gray-400 font-mono uppercase">Fulfilled Orders</p>
            <p className="text-2xl font-bold font-mono text-[#10B981] mt-1">
              {completedCount} / {orders.length}
            </p>
          </div>
          <Award className="w-8 h-8 text-[#10B981]/40" />
        </Card>

        <Card className="glass-panel p-5 flex items-center justify-between border-l-4 border-l-amber-500">
          <div>
            <p className="text-xs text-gray-400 font-mono uppercase">Average Order Value</p>
            <p className="text-2xl font-bold font-mono text-amber-400 mt-1">
              ${avgOrderValue.toFixed(2)}
            </p>
          </div>
          <FileBarChart className="w-8 h-8 text-amber-500/40" />
        </Card>
      </div>

      {/* Report Breakdown */}
      <Card className="glass-panel p-6 space-y-4">
        <h3 className="font-display font-bold text-lg text-[#FBF9F5]">
          Operational Summary
        </h3>
        <p className="text-xs text-gray-400">
          All order transactions snapshot historical product prices and tax rates at order creation time to guarantee financial immutability.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[#38322E]">
          <div className="p-4 rounded-xl bg-[#1A1715]/60 border border-[#38322E] space-y-2">
            <span className="text-xs font-mono text-amber-400 uppercase">
              Sales by Order Type
            </span>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-gray-300">
                <span>DINE IN</span>
                <span>{orders.filter((o) => o.orderType === "DINE_IN").length} orders</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>TAKEAWAY</span>
                <span>{orders.filter((o) => o.orderType === "TAKEAWAY").length} orders</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>DELIVERY</span>
                <span>{orders.filter((o) => o.orderType === "DELIVERY").length} orders</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#1A1715]/60 border border-[#38322E] space-y-2">
            <span className="text-xs font-mono text-[#10B981] uppercase">
              Compliance & Security
            </span>
            <p className="text-xs text-gray-400 leading-relaxed">
              Audited PostgreSQL database with multi-tenant row isolation. Print jobs and POS receipts are strictly scoped to the tenant context.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
