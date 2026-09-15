"use client";

import { useEffect, useState, useTransition } from "react";
import { getCustomersAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Users, Phone, Mail, ShoppingBag, Calendar, RefreshCw } from "lucide-react";

interface CustomerRecord {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  createdAt: string | Date;
  _count: {
    orders: number;
  };
  orders: Array<{
    createdAt: string | Date;
    totalAmount: any;
  }>;
}

export default function StaffCustomersPage() {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  function fetchCustomers() {
    setIsLoading(true);
    startTransition(async () => {
      try {
        const res = await getCustomersAction(searchQuery.trim() || undefined);
        if (res.success) {
          setCustomers(res.customers as any);
        }
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to load customer records");
      } finally {
        setIsLoading(false);
      }
    });
  }

  useEffect(() => {
    fetchCustomers();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#3D3732] pb-5">
        <div>
          <h1 className="text-2xl font-bold font-display text-[#F3F1EE]">
            Customer CRM Registry
          </h1>
          <p className="text-xs text-[#A8A29E] mt-1">
            Tenant-isolated customer profiles, contact info, and lifetime order totals
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={fetchCustomers}
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

      {/* Search Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-3 text-[#A8A29E]" />
          <Input
            placeholder="Search customers by name, phone, or email..."
            className="pl-9 text-xs"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchCustomers()}
          />
        </div>
        <Button onClick={fetchCustomers} variant="primary" size="sm">
          Search
        </Button>
      </div>

      {/* Customers Table / Grid */}
      {isLoading && customers.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
          <p className="text-sm text-[#A8A29E]">Loading customer records...</p>
        </div>
      ) : customers.length === 0 ? (
        <Card className="p-12 text-center space-y-3 bg-[#24201D] border-[#3D3732]">
          <Users className="w-10 h-10 text-[#A8A29E] mx-auto" />
          <h3 className="text-base font-semibold text-[#F3F1EE]">No Customers Recorded</h3>
          <p className="text-xs text-[#A8A29E]">
            Customer profiles will automatically be populated when patrons place orders with contact info.
          </p>
        </Card>
      ) : (
        <div className="bg-[#24201D] border border-[#3D3732] rounded-xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#1A1715] text-[#A8A29E] uppercase tracking-wider font-semibold border-b border-[#3D3732]">
              <tr>
                <th className="px-5 py-3.5">Customer Name</th>
                <th className="px-5 py-3.5">Phone</th>
                <th className="px-5 py-3.5">Email</th>
                <th className="px-5 py-3.5 text-center">Total Orders</th>
                <th className="px-5 py-3.5 text-right">Last Order</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3D3732] text-[#F3F1EE]">
              {customers.map((c) => {
                const lastOrder = c.orders[0];
                return (
                  <tr key={c.id} className="hover:bg-[#2D2825] transition-colors">
                    <td className="px-5 py-4 font-semibold text-sm">
                      <div>{c.name}</div>
                      {c.notes && (
                        <div className="text-[11px] text-[#A8A29E] font-normal italic">
                          &quot;{c.notes}&quot;
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 font-mono text-[#A8A29E]">
                      {c.phone ? (
                        <span className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-amber-400" />
                          {c.phone}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-5 py-4 font-mono text-[#A8A29E]">
                      {c.email ? (
                        <span className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-amber-400" />
                          {c.email}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-5 py-4 text-center font-bold font-mono">
                      <span className="px-2.5 py-1 bg-amber-950/40 text-amber-400 rounded-full border border-amber-500/30">
                        {c._count.orders} orders
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {lastOrder ? (
                        <div>
                          <div className="font-mono font-bold text-amber-400">
                            ${parseFloat(String(lastOrder.totalAmount)).toFixed(2)}
                          </div>
                          <div className="text-[10px] text-[#A8A29E]">
                            {new Date(lastOrder.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[#A8A29E]">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
