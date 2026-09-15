"use client";

import { useEffect, useState, useTransition } from "react";
import { getAnalyticsAction } from "./actions";
import { Timeframe, AnalyticsSummary } from "@/lib/services/analytics";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  BarChart3,
  Utensils,
  RefreshCw,
  Award,
  PieChart,
} from "lucide-react";

export default function StaffAnalyticsPage() {
  const [timeframe, setTimeframe] = useState<Timeframe>("30d");
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  function fetchAnalytics() {
    setIsLoading(true);
    startTransition(async () => {
      try {
        const res = await getAnalyticsAction(timeframe);
        if (res.success) {
          setAnalytics(res.analytics);
        }
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to load sales analytics");
      } finally {
        setIsLoading(false);
      }
    });
  }

  useEffect(() => {
    fetchAnalytics();
  }, [timeframe]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#3D3732] pb-5">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
            <TrendingUp className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display text-[#F3F1EE]">
              Executive Sales & Performance Analytics
            </h1>
            <p className="text-xs text-[#A8A29E]">
              Audited revenue reports, channel breakdowns, and menu item sales velocity
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Timeframe Selectors */}
          <div className="flex bg-[#24201D] border border-[#3D3732] rounded-lg p-1">
            {(["today", "7d", "30d", "all"] as Timeframe[]).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1 rounded text-xs font-semibold uppercase tracking-wider transition-all ${
                  timeframe === tf
                    ? "bg-[#D97706] text-white shadow"
                    : "text-[#A8A29E] hover:text-white"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          <Button
            onClick={fetchAnalytics}
            disabled={isLoading || isPending}
            variant="secondary"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-950/40 text-red-400 border border-red-500/30 rounded-xl text-sm flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {isLoading && !analytics ? (
        <div className="text-center py-20 space-y-3">
          <RefreshCw className="w-10 h-10 text-amber-500 animate-spin mx-auto" />
          <p className="text-sm text-[#A8A29E]">Computing executive sales metrics...</p>
        </div>
      ) : analytics ? (
        <div className="space-y-8">
          {/* KPI Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <Card className="p-6 bg-[#24201D] border-[#3D3732] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-semibold text-[#A8A29E] tracking-wider">
                  Gross Sales Revenue
                </span>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-extrabold font-mono text-emerald-400">
                ${analytics.grossRevenue}
              </div>
              <div className="text-[11px] text-[#A8A29E]">
                Audited total across {analytics.totalOrders} completed orders
              </div>
            </Card>

            <Card className="p-6 bg-[#24201D] border-[#3D3732] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-semibold text-[#A8A29E] tracking-wider">
                  Total Orders Placed
                </span>
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <ShoppingBag className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-extrabold font-mono text-amber-400">
                {analytics.totalOrders}
              </div>
              <div className="text-[11px] text-[#A8A29E]">
                Across Dine-In, Takeaway & Delivery
              </div>
            </Card>

            <Card className="p-6 bg-[#24201D] border-[#3D3732] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-semibold text-[#A8A29E] tracking-wider">
                  Average Order Value (AOV)
                </span>
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                  <BarChart3 className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-extrabold font-mono text-blue-400">
                ${analytics.averageOrderValue}
              </div>
              <div className="text-[11px] text-[#A8A29E]">
                Average gross spend per customer order
              </div>
            </Card>
          </div>

          {/* Channel Breakdown & Top Items Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Order Channel Breakdown */}
            <Card className="p-6 bg-[#24201D] border-[#3D3732] space-y-4">
              <div className="flex items-center gap-2 border-b border-[#3D3732] pb-3">
                <PieChart className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg font-bold font-display text-white">
                  Sales Channel Breakdown
                </h2>
              </div>

              <div className="space-y-4">
                {[
                  { key: "DINE_IN", label: "Dine-In Orders", color: "bg-amber-500" },
                  { key: "TAKEAWAY", label: "Takeaway Orders", color: "bg-emerald-500" },
                  { key: "DELIVERY", label: "Delivery Orders", color: "bg-blue-500" },
                ].map(({ key, label, color }) => {
                  const channel = analytics.orderTypeBreakdown[key as keyof typeof analytics.orderTypeBreakdown];
                  const percentage =
                    analytics.totalOrders > 0
                      ? ((channel.count / analytics.totalOrders) * 100).toFixed(1)
                      : "0";
                  return (
                    <div key={key} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-[#F3F1EE]">{label} ({channel.count})</span>
                        <span className="font-mono text-amber-400">${channel.total} ({percentage}%)</span>
                      </div>
                      <div className="w-full bg-[#1A1715] h-2.5 rounded-full overflow-hidden border border-[#3D3732]">
                        <div
                          className={`h-full ${color}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Top 5 Best Selling Items */}
            <Card className="p-6 bg-[#24201D] border-[#3D3732] space-y-4">
              <div className="flex items-center gap-2 border-b border-[#3D3732] pb-3">
                <Award className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg font-bold font-display text-white">
                  Top 5 Best Selling Menu Items
                </h2>
              </div>

              {analytics.topMenuItems.length === 0 ? (
                <p className="text-xs text-[#A8A29E] text-center py-6">
                  No menu item sales recorded in this timeframe.
                </p>
              ) : (
                <div className="divide-y divide-[#3D3732]">
                  {analytics.topMenuItems.map((item, index) => (
                    <div
                      key={item.name}
                      className="py-3 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-amber-950/60 text-amber-400 font-mono font-bold flex items-center justify-center border border-amber-500/30 text-xs">
                          #{index + 1}
                        </span>
                        <span className="font-semibold text-[#F3F1EE]">
                          {item.name}
                        </span>
                      </div>

                      <div className="text-right">
                        <div className="font-mono font-bold text-amber-400">
                          ${item.revenue}
                        </div>
                        <div className="text-[10px] text-[#A8A29E]">
                          {item.quantity} units sold
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  );
}
