import Link from "next/link";
import { Utensils, ShoppingCart, UtensilsCrossed, Settings, ShieldCheck, Printer } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function RestaurantDashboardPage() {
  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#38322E] pb-6">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-[#FBF9F5]">
            Operational Overview
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Real-time restaurant operations, active daily menu, kitchen queue, and cloud print status.
          </p>
        </div>
        <Badge variant="success">● System Operational</Badge>
      </div>

      {/* Quick Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="glass-panel-hover">
          <CardHeader>
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-mono tracking-wider text-gray-400">POS & Orders</span>
              <div className="p-2 rounded-lg bg-[#D97706]/10 text-[#D97706]">
                <ShoppingCart className="w-5 h-5" />
              </div>
            </div>
            <CardTitle className="text-2xl mt-2">Order Engine</CardTitle>
            <CardDescription>Server totals & price snapshots active</CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/restaurant/orders"
              className="text-xs font-semibold text-[#D97706] hover:underline inline-flex items-center gap-1"
            >
              Open Orders Console →
            </Link>
          </CardContent>
        </Card>

        <Card className="glass-panel-hover">
          <CardHeader>
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-mono tracking-wider text-gray-400">Kitchen Display</span>
              <div className="p-2 rounded-lg bg-[#10B981]/10 text-[#10B981]">
                <UtensilsCrossed className="w-5 h-5" />
              </div>
            </div>
            <CardTitle className="text-2xl mt-2">KDS Queue</CardTitle>
            <CardDescription>Real-time KOT preparation states</CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/restaurant/kitchen"
              className="text-xs font-semibold text-[#10B981] hover:underline inline-flex items-center gap-1"
            >
              Launch KDS Interface →
            </Link>
          </CardContent>
        </Card>

        <Card className="glass-panel-hover">
          <CardHeader>
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-mono tracking-wider text-gray-400">ESC/POS Printing</span>
              <div className="p-2 rounded-lg bg-[#D97706]/10 text-[#D97706]">
                <Printer className="w-5 h-5" />
              </div>
            </div>
            <CardTitle className="text-2xl mt-2">Print Agent</CardTitle>
            <CardDescription>Cloud queue polling active</CardDescription>
          </CardHeader>
          <CardContent>
            <span className="text-xs font-mono text-gray-400">Agent API Status: Ready</span>
          </CardContent>
        </Card>
      </div>

      {/* Feature Navigation Grid */}
      <div className="glass-panel rounded-2xl p-6 space-y-6">
        <h2 className="font-display text-xl font-bold text-[#FBF9F5]">
          Management Modules
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href="/restaurant/settings"
            className="p-4 rounded-xl bg-[#1A1715] border border-[#38322E] hover:border-[#D97706]/40 transition space-y-2 group"
          >
            <div className="flex items-center justify-between">
              <Settings className="w-5 h-5 text-[#D97706] group-hover:scale-110 transition" />
              <Badge variant="outline">Settings</Badge>
            </div>
            <h3 className="font-display font-bold text-[#FBF9F5]">Restaurant Settings</h3>
            <p className="text-xs text-gray-400">Edit branding, logo, contact details, address, and hours.</p>
          </Link>

          <Link
            href="/r/demo"
            target="_blank"
            className="p-4 rounded-xl bg-[#1A1715] border border-[#38322E] hover:border-[#D97706]/40 transition space-y-2 group"
          >
            <div className="flex items-center justify-between">
              <Utensils className="w-5 h-5 text-[#10B981] group-hover:scale-110 transition" />
              <Badge variant="success">Public</Badge>
            </div>
            <h3 className="font-display font-bold text-[#FBF9F5]">Public Website Preview</h3>
            <p className="text-xs text-gray-400">Preview public restaurant website (`/r/[slug]`).</p>
          </Link>

          <div className="p-4 rounded-xl bg-[#1A1715] border border-[#38322E] space-y-2 opacity-80">
            <div className="flex items-center justify-between">
              <ShieldCheck className="w-5 h-5 text-[#D97706]" />
              <Badge variant="primary">Security</Badge>
            </div>
            <h3 className="font-display font-bold text-[#FBF9F5]">Tenant Security</h3>
            <p className="text-xs text-gray-400">Server-side context isolation enforced on every action.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
