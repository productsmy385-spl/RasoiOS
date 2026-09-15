"use client";

import { OrderStatus, OrderType } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, User, Phone, MapPin, Printer } from "lucide-react";

export interface OrderItemSummary {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface OrderData {
  id: string;
  orderNumber: string;
  orderType: OrderType;
  status: OrderStatus;
  tableNumber?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  subtotal: number;
  taxTotal: number;
  totalAmount: number;
  createdAt: string | Date;
  items: OrderItemSummary[];
}

interface OrderCardProps {
  order: OrderData;
  onUpdateStatus?: (orderId: string, nextStatus: OrderStatus) => void;
  onPrintReceipt?: (orderId: string) => void;
}

export function OrderCard({
  order,
  onUpdateStatus,
  onPrintReceipt,
}: OrderCardProps) {
  const getBadgeVariant = (status: OrderStatus) => {
    switch (status) {
      case "NEW":
      case "ACCEPTED":
        return "primary";
      case "PREPARING":
        return "warning";
      case "READY":
      case "COMPLETED":
        return "success";
      case "CANCELLED":
      case "REFUNDED":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getNextStatus = (current: OrderStatus): OrderStatus | null => {
    if (current === "NEW") return "ACCEPTED";
    if (current === "ACCEPTED") return "PREPARING";
    if (current === "PREPARING") return "READY";
    if (current === "READY") return "COMPLETED";
    return null;
  };

  const nextStatus = getNextStatus(order.status);
  const formattedTime = new Date(order.createdAt).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Card className="glass-panel space-y-4">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-[#38322E] pb-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xl font-bold tracking-wider text-[#D97706]">
            #{order.orderNumber}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-md bg-[#1A1715] text-gray-300 font-medium border border-[#38322E]">
            {order.orderType.replace("_", " ")}
          </span>
        </div>
        <Badge variant={getBadgeVariant(order.status)}>{order.status}</Badge>
      </div>

      {/* Details */}
      <div className="text-xs space-y-1 text-gray-400">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[#FBF9F5] font-medium">
            <User className="w-3.5 h-3.5 text-[#D97706]" />
            <span>{order.customerName || "Walk-in Guest"}</span>
          </div>
          <div className="flex items-center gap-1 font-mono">
            <Clock className="w-3.5 h-3.5 text-gray-500" />
            <span>{formattedTime}</span>
          </div>
        </div>

        {order.tableNumber && (
          <div className="flex items-center gap-1.5 text-amber-400">
            <MapPin className="w-3.5 h-3.5" />
            <span>Table {order.tableNumber}</span>
          </div>
        )}
      </div>

      {/* Items List */}
      <div className="space-y-1.5 pt-2 border-t border-[#38322E]/60 text-xs">
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between items-center py-0.5">
            <span className="text-[#F3F4F6]">
              <strong className="text-[#D97706] font-mono mr-1.5">
                {item.quantity}x
              </strong>
              {item.name}
            </span>
            <span className="font-mono text-gray-400">
              ${item.totalPrice.toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      {/* Footer / Total */}
      <div className="pt-3 border-t border-[#38322E] flex items-center justify-between">
        <div>
          <span className="text-[10px] text-gray-400 block uppercase font-mono">
            Total (Tax Incl.)
          </span>
          <span className="font-mono text-lg font-bold text-[#FBF9F5]">
            ${order.totalAmount.toFixed(2)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onPrintReceipt && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onPrintReceipt(order.id)}
              title="Print Order Receipt"
            >
              <Printer className="w-4 h-4" />
            </Button>
          )}

          {nextStatus && onUpdateStatus && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => onUpdateStatus(order.id, nextStatus)}
            >
              Advance to {nextStatus}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
