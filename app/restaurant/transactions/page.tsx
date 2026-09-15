import { prisma } from "@/lib/db/prisma";
import { getAuthenticatedSession } from "@/lib/auth/clerk";
import { resolveTenantContext } from "@/lib/auth/tenant-context";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, DollarSign, Receipt } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const session = await getAuthenticatedSession();
  const context = resolveTenantContext(session);
  
  const orders = await prisma.order.findMany({
    where: { tenantId: context.tenantId },
    include: { items: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const totalRevenue = orders.reduce(
    (acc, order) => acc + Number(order.totalAmount),
    0
  );

  const totalTax = orders.reduce((acc, order) => {
    const orderTax = order.items.reduce(
      (itemAcc, item) =>
        itemAcc +
        Number(item.priceSnapshot) *
          item.quantity *
          (Number(item.taxRateSnapshot) / 100),
      0
    );
    return acc + orderTax;
  }, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="font-display text-2xl font-bold text-[#FBF9F5]">
          Financial Transactions & Settlements
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Audited transaction log and tax settlement history.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="glass-panel p-5 flex items-center justify-between border-l-4 border-l-[#D97706]">
          <div>
            <p className="text-xs text-gray-400 font-mono uppercase">Total Revenue</p>
            <p className="text-2xl font-bold font-mono text-[#D97706] mt-1">
              ${totalRevenue.toFixed(2)}
            </p>
          </div>
          <DollarSign className="w-8 h-8 text-[#D97706]/40" />
        </Card>

        <Card className="glass-panel p-5 flex items-center justify-between border-l-4 border-l-[#10B981]">
          <div>
            <p className="text-xs text-gray-400 font-mono uppercase">Tax Collected</p>
            <p className="text-2xl font-bold font-mono text-[#10B981] mt-1">
              ${totalTax.toFixed(2)}
            </p>
          </div>
          <Receipt className="w-8 h-8 text-[#10B981]/40" />
        </Card>

        <Card className="glass-panel p-5 flex items-center justify-between border-l-4 border-l-purple-500">
          <div>
            <p className="text-xs text-gray-400 font-mono uppercase">Settled Orders</p>
            <p className="text-2xl font-bold font-mono text-purple-400 mt-1">
              {orders.length}
            </p>
          </div>
          <CreditCard className="w-8 h-8 text-purple-500/40" />
        </Card>
      </div>

      {/* Transactions Table */}
      <Card className="glass-panel p-6 space-y-4">
        <h3 className="font-display font-bold text-lg text-[#FBF9F5]">
          Transaction Log
        </h3>

        {orders.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">
            No transaction records found for this tenant.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-[#38322E] text-gray-400">
                  <th className="pb-3 px-2">Order #</th>
                  <th className="pb-3 px-2">Type</th>
                  <th className="pb-3 px-2">Status</th>
                  <th className="pb-3 px-2">Timestamp</th>
                  <th className="pb-3 px-2 text-right">Estimated Tax</th>
                  <th className="pb-3 px-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#38322E]/50 text-gray-300">
                {orders.map((order) => {
                  const orderTax = order.items.reduce(
                    (itemAcc, item) =>
                      itemAcc +
                      Number(item.priceSnapshot) *
                        item.quantity *
                        (Number(item.taxRateSnapshot) / 100),
                    0
                  );
                  return (
                    <tr key={order.id} className="hover:bg-[#1A1715]/40 transition">
                      <td className="py-3 px-2 font-bold text-[#D97706]">
                        #{order.orderNumber}
                      </td>
                      <td className="py-3 px-2">
                        {order.orderType.replace("_", " ")}
                      </td>
                      <td className="py-3 px-2">
                        <Badge variant="success">{order.status}</Badge>
                      </td>
                      <td className="py-3 px-2 text-gray-400">
                        {new Date(order.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-2 text-right">
                        ${orderTax.toFixed(2)}
                      </td>
                      <td className="py-3 px-2 text-right font-bold text-[#FBF9F5]">
                        ${Number(order.totalAmount).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
