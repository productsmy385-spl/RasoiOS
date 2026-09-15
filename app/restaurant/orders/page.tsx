"use client";

import { useEffect, useState, useTransition } from "react";
import { OrderStatus, OrderType } from "@prisma/client";
import { getOrdersAction, updateOrderStatusAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Clock,
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  Play,
  ChefHat,
  BellRing,
  User,
  Phone,
  UtensilsCrossed,
} from "lucide-react";

interface OrderItem {
  id: string;
  itemNameSnapshot: string;
  priceSnapshot: any; // Decimal / string
  taxRateSnapshot: any;
  quantity: number;
  specialInstructions: string | null;
}

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
}

interface Order {
  id: string;
  orderNumber: string;
  orderType: OrderType;
  status: OrderStatus;
  tableNumber: string | null;
  totalAmount: any;
  notes: string | null;
  createdAt: string | Date;
  customer: Customer | null;
  items: OrderItem[];
}

export default function StaffOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  function fetchOrders() {
    setIsLoading(true);
    startTransition(async () => {
      try {
        const filters: { status?: OrderStatus; search?: string } = {};
        if (selectedStatus !== "ALL") {
          filters.status = selectedStatus as OrderStatus;
        }
        if (searchQuery.trim()) {
          filters.search = searchQuery.trim();
        }

        const res = await getOrdersAction(filters);
        if (res.success) {
          setOrders(res.orders as any);
        }
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to load orders");
      } finally {
        setIsLoading(false);
      }
    });
  }

  useEffect(() => {
    fetchOrders();
    // Auto-refresh every 15 seconds
    const timer = setInterval(fetchOrders, 15000);
    return () => clearInterval(timer);
  }, [selectedStatus]);

  async function handleStatusUpdate(orderId: string, nextStatus: OrderStatus) {
    try {
      setErrorMsg(null);
      const res = await updateOrderStatusAction(orderId, nextStatus);
      if (res.success) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
        );
      }
    } catch (err: any) {
      setErrorMsg(err.message || `Failed to update status to ${nextStatus}`);
    }
  }

  const STATUS_TABS = [
    "ALL",
    "NEW",
    "ACCEPTED",
    "PREPARING",
    "READY",
    "COMPLETED",
    "CANCELLED",
  ];

  function getStatusBadgeVariant(status: OrderStatus) {
    switch (status) {
      case "NEW":
        return "warning";
      case "ACCEPTED":
        return "outline";
      case "PREPARING":
        return "outline";
      case "READY":
        return "success";
      case "COMPLETED":
        return "success";
      case "CANCELLED":
        return "destructive";
      default:
        return "outline";
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#3D3732] pb-5">
        <div>
          <h1 className="text-2xl font-bold font-display text-[#F3F1EE]">
            Live Orders Console
          </h1>
          <p className="text-xs text-[#A8A29E] mt-1">
            Real-time status tracking, state transitions, and kitchen flow
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={fetchOrders}
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

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedStatus(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wider transition-all ${
                selectedStatus === tab
                  ? "bg-[#D97706] text-white shadow-lg shadow-[#D97706]/20"
                  : "bg-[#24201D] text-[#A8A29E] hover:text-white border border-[#3D3732]"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 absolute left-3 top-3 text-[#A8A29E]" />
          <Input
            placeholder="Search order # or phone..."
            className="pl-9 text-xs"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchOrders()}
          />
        </div>
      </div>

      {/* Orders Grid */}
      {isLoading && orders.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
          <p className="text-sm text-[#A8A29E]">Loading live orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <Card className="p-12 text-center space-y-3 bg-[#24201D] border-[#3D3732]">
          <UtensilsCrossed className="w-10 h-10 text-[#A8A29E] mx-auto" />
          <h3 className="text-base font-semibold text-[#F3F1EE]">No Orders Found</h3>
          <p className="text-xs text-[#A8A29E]">
            There are currently no orders matching status status &quot;{selectedStatus}&quot;.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orders.map((order) => (
            <Card
              key={order.id}
              className={`p-5 space-y-4 bg-[#24201D] border transition-all ${
                order.status === "NEW"
                  ? "border-amber-500/50 shadow-lg shadow-amber-500/5"
                  : "border-[#3D3732]"
              }`}
            >
              {/* Card Header */}
              <div className="flex items-center justify-between border-b border-[#3D3732] pb-3">
                <div>
                  <div className="font-mono text-base font-bold text-amber-400">
                    {order.orderNumber}
                  </div>
                  <div className="text-xs text-[#A8A29E] flex items-center gap-1.5 mt-0.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      {new Date(order.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <Badge variant={getStatusBadgeVariant(order.status)}>
                    {order.status}
                  </Badge>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#2D2825] text-[#A8A29E] border border-[#3D3732]">
                    {order.orderType.replace("_", " ")}
                  </span>
                </div>
              </div>

              {/* Customer / Table Info */}
              <div className="text-xs space-y-1 text-[#A8A29E]">
                {order.tableNumber && (
                  <div className="font-medium text-[#F3F1EE]">
                    🪑 Table: <span className="text-amber-400 font-bold">{order.tableNumber}</span>
                  </div>
                )}
                {order.customer && (
                  <div className="flex items-center gap-2 text-[#F3F1EE]">
                    <User className="w-3.5 h-3.5 text-amber-400" />
                    <span>{order.customer.name}</span>
                    {order.customer.phone && (
                      <span className="text-[#A8A29E] flex items-center gap-1 font-mono">
                        <Phone className="w-3 h-3" /> {order.customer.phone}
                      </span>
                    )}
                  </div>
                )}
                {order.notes && (
                  <div className="italic text-amber-300/80 bg-amber-950/20 p-2 rounded border border-amber-500/20">
                    &quot;{order.notes}&quot;
                  </div>
                )}
              </div>

              {/* Items Snapshot Breakdown */}
              <div className="space-y-2 py-2 border-y border-[#3D3732]">
                <div className="text-[11px] font-semibold uppercase text-[#A8A29E] tracking-wider">
                  Order Items ({order.items.length})
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between text-xs font-medium"
                    >
                      <div className="flex items-center gap-2 text-[#F3F1EE]">
                        <span className="w-5 h-5 bg-[#2D2825] text-amber-400 rounded flex items-center justify-center text-[10px] font-mono font-bold border border-[#3D3732]">
                          {item.quantity}x
                        </span>
                        <span>{item.itemNameSnapshot}</span>
                      </div>
                      <span className="font-mono text-[#A8A29E]">
                        ${(parseFloat(String(item.priceSnapshot)) * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total & Action Buttons */}
              <div className="flex items-center justify-between pt-1">
                <div>
                  <div className="text-[10px] text-[#A8A29E]">Total Amount</div>
                  <div className="font-mono text-lg font-bold text-amber-400">
                    ${parseFloat(String(order.totalAmount)).toFixed(2)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {order.status === "NEW" && (
                    <>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleStatusUpdate(order.id, OrderStatus.CANCELLED)}
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1" /> Cancel
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleStatusUpdate(order.id, OrderStatus.ACCEPTED)}
                      >
                        <CheckCircle className="w-3.5 h-3.5 mr-1" /> Accept
                      </Button>
                    </>
                  )}

                  {order.status === "ACCEPTED" && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => handleStatusUpdate(order.id, OrderStatus.PREPARING)}
                    >
                      <ChefHat className="w-3.5 h-3.5 mr-1" /> Prepare
                    </Button>
                  )}

                  {order.status === "PREPARING" && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => handleStatusUpdate(order.id, OrderStatus.READY)}
                    >
                      <BellRing className="w-3.5 h-3.5 mr-1" /> Ready
                    </Button>
                  )}

                  {order.status === "READY" && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => handleStatusUpdate(order.id, OrderStatus.COMPLETED)}
                    >
                      <CheckCircle className="w-3.5 h-3.5 mr-1" /> Complete
                    </Button>
                  )}

                  {order.status !== "COMPLETED" &&
                    order.status !== "CANCELLED" &&
                    order.status !== "REFUNDED" &&
                    order.status !== "NEW" && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleStatusUpdate(order.id, OrderStatus.CANCELLED)}
                      >
                        Cancel
                      </Button>
                    )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
