"use client";

import { useEffect, useState, useTransition } from "react";
import { getAnalyticsAction } from "./actions";
import type { AnalyticsSummary } from "@/lib/services/analytics";
import type { Timeframe } from "@/lib/validation/reports";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  BarChart3,
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
        const res = await getAnalyticsAction({ timeframe });
        if (res.ok) {
          setAnalytics(res.data);
        } else {
          setErrorMsg(res.error.message);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-5">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-status-success/10 text-status-success rounded-2xl border border-status-success/20">
            <TrendingUp className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display text-fg-primary">
              Executive Sales & Performance Analytics
            </h1>
            <p className="text-xs text-fg-secondary">
              Audited revenue reports, channel breakdowns, and menu item sales velocity
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Timeframe Selectors */}
          <div className="flex bg-card border border-border-subtle rounded-xl p-1">
            {(["today", "7d", "30d", "all"] as Timeframe[]).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1 rounded text-xs font-semibold uppercase tracking-wider transition-all ${
                  timeframe === tf
                    ? "bg-action-primary text-action-primary-fg shadow"
                    : "text-fg-secondary hover:text-fg-primary"
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
        <div className="p-4 bg-status-danger/40 text-status-danger border border-status-danger/30 rounded-xl text-sm flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-status-danger hover:text-fg-primary">
            ✕
          </button>
        </div>
      )}

      {isLoading && !analytics ? (
        <div className="text-center py-20 space-y-3">
          <RefreshCw className="w-10 h-10 text-fg-accent animate-spin mx-auto" />
          <p className="text-sm text-fg-secondary">Computing executive sales metrics...</p>
        </div>
      ) : analytics ? (
        <div className="space-y-8">
          {/* KPI Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <Card className="p-6 bg-card border-border-subtle space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-semibold text-fg-secondary tracking-wider">
                  Gross Sales Revenue
                </span>
                <div className="p-2 rounded-xl bg-status-success/10 text-status-success">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-extrabold tabular-nums text-status-success">
                {analytics.currencyCode} {analytics.grossRevenue}
              </div>
              <div className="text-caption text-fg-secondary">
                Across {analytics.totalOrders} completed or refunded orders · net {analytics.netRevenue} after refunds
              </div>
            </Card>

            <Card className="p-6 bg-card border-border-subtle space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-semibold text-fg-secondary tracking-wider">
                  Completed Orders
                </span>
                <div className="p-2 rounded-xl bg-action-primary/10 text-fg-accent">
                  <ShoppingBag className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-extrabold tabular-nums text-fg-accent">
                {analytics.totalOrders}
              </div>
              <div className="text-caption text-fg-secondary">
                Across Dine-In, Takeaway & Delivery
              </div>
            </Card>

            <Card className="p-6 bg-card border-border-subtle space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-semibold text-fg-secondary tracking-wider">
                  Average Order Value (AOV)
                </span>
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                  <BarChart3 className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-extrabold tabular-nums text-blue-400">
                {analytics.currencyCode} {analytics.averageOrderValue}
              </div>
              <div className="text-caption text-fg-secondary">
                Average gross spend per customer order
              </div>
            </Card>
          </div>

          {/* Channel Breakdown & Top Items Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Order Channel Breakdown */}
            <Card className="p-6 bg-card border-border-subtle space-y-4">
              <div className="flex items-center gap-2 border-b border-border-subtle pb-3">
                <PieChart className="w-5 h-5 text-fg-accent" />
                <h2 className="text-lg font-bold font-display text-fg-primary">
                  Sales Channel Breakdown
                </h2>
              </div>

              <div className="space-y-4">
                {[
                  { key: "DINE_IN", label: "Dine-In Orders", color: "bg-action-primary" },
                  { key: "TAKEAWAY", label: "Takeaway Orders", color: "bg-status-success" },
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
                        <span className="text-fg-primary">{label} ({channel.count})</span>
                        <span className="tabular-nums text-fg-accent">{analytics.currencyCode} {channel.total} ({percentage}%)</span>
                      </div>
                      <div className="w-full bg-canvas h-2.5 rounded-full overflow-hidden border border-border-subtle">
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
            <Card className="p-6 bg-card border-border-subtle space-y-4">
              <div className="flex items-center gap-2 border-b border-border-subtle pb-3">
                <Award className="w-5 h-5 text-fg-accent" />
                <h2 className="text-lg font-bold font-display text-fg-primary">
                  Top 5 Best Selling Menu Items
                </h2>
              </div>

              {analytics.topMenuItems.length === 0 ? (
                <p className="text-xs text-fg-secondary text-center py-6">
                  No menu item sales recorded in this timeframe.
                </p>
              ) : (
                <div className="divide-y divide-border-subtle">
                  {analytics.topMenuItems.map((item, index) => (
                    <div
                      key={item.name}
                      className="py-3 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-action-primary/60 text-fg-accent tabular-nums font-bold flex items-center justify-center border border-action-primary/30 text-xs">
                          #{index + 1}
                        </span>
                        <span className="font-semibold text-fg-primary">
                          {item.name}
                        </span>
                      </div>

                      <div className="text-right">
                        <div className="tabular-nums font-bold text-fg-accent">
                          {analytics.currencyCode} {item.revenue}
                        </div>
                        <div className="text-caption text-fg-secondary">
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
