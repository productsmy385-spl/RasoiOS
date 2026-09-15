"use client";

import { useEffect, useState } from "react";
import { OrderStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle2 } from "lucide-react";

export interface KOTItem {
  id: string;
  name: string;
  quantity: number;
}

export interface KOTTicket {
  id: string;
  orderNumber: string;
  orderType: string;
  tableNumber?: string | null;
  status: OrderStatus;
  createdAt: string | Date;
  items: KOTItem[];
}

interface KOTCardProps {
  ticket: KOTTicket;
  onBumpStatus: (orderId: string, nextStatus: OrderStatus) => void;
}

export function KOTCard({ ticket, onBumpStatus }: KOTCardProps) {
  const [elapsedMinutes, setElapsedMinutes] = useState<number>(0);

  useEffect(() => {
    const calculateElapsed = () => {
      const diffMs = new Date().getTime() - new Date(ticket.createdAt).getTime();
      setElapsedMinutes(Math.floor(diffMs / (1000 * 60)));
    };
    calculateElapsed();
    const interval = setInterval(calculateElapsed, 10000);
    return () => clearInterval(interval);
  }, [ticket.createdAt]);

  const isUrgent = elapsedMinutes > 15;

  const getNextStatus = (current: OrderStatus): OrderStatus => {
    if (current === "NEW") return "PREPARING";
    if (current === "PREPARING") return "READY";
    return "COMPLETED";
  };

  const nextStatus = getNextStatus(ticket.status);

  return (
    <div
      className={`glass-panel p-5 rounded-2xl flex flex-col justify-between space-y-4 border ${
        isUrgent ? "border-red-500/50 bg-red-950/20" : "border-[#38322E]"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between border-b border-[#38322E] pb-3">
        <div>
          <span className="font-mono text-2xl font-extrabold text-[#D97706] tracking-wider block">
            #{ticket.orderNumber}
          </span>
          <span className="text-xs font-mono text-gray-400">
            {ticket.orderType.replace("_", " ")}
            {ticket.tableNumber ? ` • Table ${ticket.tableNumber}` : ""}
          </span>
        </div>

        <div className="flex flex-col items-end gap-1">
          <Badge
            variant={
              ticket.status === "NEW"
                ? "primary"
                : ticket.status === "PREPARING"
                ? "warning"
                : "success"
            }
          >
            {ticket.status}
          </Badge>
          <div
            className={`flex items-center gap-1 text-xs font-mono ${
              isUrgent ? "text-red-400 font-bold animate-pulse" : "text-gray-400"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{elapsedMinutes}m ago</span>
          </div>
        </div>
      </div>

      {/* Checklist of KOT Items */}
      <div className="space-y-2 flex-1 text-sm">
        {ticket.items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-2 rounded-lg bg-[#1A1715]/60 border border-[#38322E]/40"
          >
            <span className="font-medium text-[#F3F1EE]">
              <span className="inline-block w-6 text-center font-mono font-bold text-amber-400 mr-2 bg-amber-950/40 rounded border border-amber-500/30">
                {item.quantity}
              </span>
              {item.name}
            </span>
          </div>
        ))}
      </div>

      {/* Bump Button */}
      <Button
        className="w-full font-bold py-3 mt-2"
        variant={ticket.status === "NEW" ? "primary" : "secondary"}
        onClick={() => onBumpStatus(ticket.id, nextStatus)}
      >
        <CheckCircle2 className="w-4 h-4 mr-2 text-[#10B981]" />
        Mark as {nextStatus}
      </Button>
    </div>
  );
}
