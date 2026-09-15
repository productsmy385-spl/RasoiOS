"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Utensils,
  LayoutDashboard,
  ShoppingCart,
  UtensilsCrossed,
  Settings,
  Shield,
  CreditCard,
  FileBarChart,
  Users,
  Printer,
  Sparkles,
} from "lucide-react";
import { cn } from "@/components/ui/button";

export function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { href: "/restaurant/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/restaurant/orders", label: "Orders & POS", icon: ShoppingCart },
    { href: "/restaurant/kitchen", label: "Kitchen KDS", icon: UtensilsCrossed },
    { href: "/restaurant/menu", label: "Menu Editor", icon: Utensils },
    { href: "/restaurant/transactions", label: "Transactions", icon: CreditCard },
    { href: "/restaurant/reports", label: "Reports", icon: FileBarChart },
    { href: "/restaurant/customers", label: "Customers", icon: Users },
    { href: "/restaurant/printing", label: "Print Agent", icon: Printer },
    { href: "/restaurant/social", label: "Social Hub", icon: Sparkles },
    { href: "/restaurant/settings", label: "Settings", icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#24201D] border-r border-[#38322E] flex flex-col justify-between hidden md:flex shrink-0">
      <div className="p-6 space-y-6">
        {/* Brand */}
        <Link href="/restaurant/dashboard" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-[#D97706] flex items-center justify-center text-white shadow-lg shadow-[#D97706]/30 group-hover:bg-[#B45309] transition-all">
            <Utensils className="w-5 h-5" />
          </div>
          <span className="font-display text-2xl font-bold text-[#FBF9F5] tracking-wide">
            RASOI<span className="text-[#D97706]">OS</span>
          </span>
        </Link>

        {/* Navigation */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/restaurant/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all",
                  isActive
                    ? "bg-[#D97706]/15 text-[#D97706] border border-[#D97706]/30 shadow-sm"
                    : "text-gray-400 hover:text-white hover:bg-[#1A1715]"
                )}
              >
                <Icon className={cn("w-4 h-4", isActive ? "text-[#D97706]" : "text-gray-400")} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Security Context Badge */}
      <div className="p-4 border-t border-[#38322E] bg-[#1A1715]/60 m-4 rounded-xl space-y-2">
        <div className="flex items-center gap-2 text-xs font-mono text-[#10B981]">
          <Shield className="w-3.5 h-3.5" />
          <span>Tenant Isolated</span>
        </div>
        <p className="text-[11px] text-gray-500">
          Server-Side RBAC Active
        </p>
      </div>
    </aside>
  );
}
