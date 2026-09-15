"use client";

import { useEffect, useState, useTransition } from "react";
import { KOTStatus, OrderType } from "@prisma/client";
import { getKOTTicketsAction, updateKOTStatusAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ChefHat,
  Clock,
  RefreshCw,
  CheckCircle,
  Play,
  CheckCheck,
  Utensils,
  AlertTriangle,
} from "lucide-react";

interface KOTItem {
  id: string;
  itemNameSnapshot: string;
  quantity: number;
  specialInstructions: string | null;
}

interface KOTTicketData {
  id: string;
  kotNumber: string;
  kitchenSection: string;
  status: KOTStatus;
  notes: string | null;
  createdAt: string | Date;
  order: {
    id: string;
    orderNumber: string;
    orderType: OrderType;
    tableNumber: string | null;
    items: KOTItem[];
    customer: { name: string } | null;
  };
}

export default function KitchenDisplaySystemPage() {
  const [tickets, setTickets] = useState<KOTTicketData[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>("ALL");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("ACTIVE");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  function fetchTickets() {
    setIsLoading(true);
    startTransition(async () => {
      try {
        const filters: { status?: KOTStatus; kitchenSection?: string } = {};
        if (selectedStatusFilter !== "ACTIVE") {
          filters.status = selectedStatusFilter as KOTStatus;
        }
        if (selectedSection !== "ALL") {
          filters.kitchenSection = selectedSection;
        }

        const res = await getKOTTicketsAction(filters);
        if (res.success) {
          setTickets(res.tickets as any);
        }
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to load kitchen tickets");
      } finally {
        setIsLoading(false);
      }
    });
  }

  useEffect(() => {
    fetchTickets();
    // Auto-refresh KDS line every 10 seconds
    const interval = setInterval(fetchTickets, 10000);
    return () => clearInterval(interval);
  }, [selectedSection, selectedStatusFilter]);

  async function handleKOTStatusUpdate(kotId: string, nextStatus: KOTStatus) {
    try {
      setErrorMsg(null);
      const res = await updateKOTStatusAction(kotId, nextStatus);
      if (res.success) {
        if (nextStatus === "SERVED" && selectedStatusFilter === "ACTIVE") {
          setTickets((prev) => prev.filter((t) => t.id !== kotId));
        } else {
          setTickets((prev) =>
            prev.map((t) => (t.id === kotId ? { ...t, status: nextStatus } : t))
          );
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || `Failed to transition KOT status to ${nextStatus}`);
    }
  }

  function getElapsedMinutes(createdAt: string | Date): number {
    const diffMs = Date.now() - new Date(createdAt).getTime();
    return Math.floor(diffMs / 60000);
  }

  function getTimerStyle(minutes: number) {
    if (minutes >= 20) {
      return "bg-red-950/60 text-red-400 border-red-500 animate-pulse";
    }
    if (minutes >= 10) {
      return "bg-amber-950/60 text-amber-400 border-amber-500/50";
    }
    return "bg-emerald-950/60 text-emerald-400 border-emerald-500/50";
  }

  function getCardBorderStyle(minutes: number, status: KOTStatus) {
    if (status === "READY") {
      return "border-emerald-500/80 shadow-lg shadow-emerald-500/10";
    }
    if (minutes >= 20) {
      return "border-red-500/80 shadow-lg shadow-red-500/10";
    }
    if (minutes >= 10) {
      return "border-amber-500/60 shadow-lg shadow-amber-500/10";
    }
    return "border-[#3D3732]";
  }

  const STATIONS = ["ALL", "MAIN_KITCHEN", "GRILL", "FRYER", "PANTRY", "BAR"];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#3D3732] pb-5">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20">
            <ChefHat className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display text-[#F3F1EE]">
              Kitchen Display System (KDS)
            </h1>
            <p className="text-xs text-[#A8A29E]">
              Live touch line console • Auto-syncing ticket queue
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={fetchTickets}
            disabled={isLoading || isPending}
            variant="secondary"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Sync Queue
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

      {/* Station Selector & Status Filters */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Stations */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-[#A8A29E] font-semibold uppercase tracking-wider py-1.5 mr-1">
            Station:
          </span>
          {STATIONS.map((station) => (
            <button
              key={station}
              onClick={() => setSelectedSection(station)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wider transition-all ${
                selectedSection === station
                  ? "bg-amber-600 text-white shadow-lg shadow-amber-600/20"
                  : "bg-[#24201D] text-[#A8A29E] hover:text-white border border-[#3D3732]"
              }`}
            >
              {station.replace("_", " ")}
            </button>
          ))}
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-2">
          {["ACTIVE", "QUEUED", "PREPARING", "READY", "SERVED"].map((status) => (
            <button
              key={status}
              onClick={() => setSelectedStatusFilter(status)}
              className={`px-2.5 py-1 rounded text-xs font-mono font-medium border ${
                selectedStatusFilter === status
                  ? "bg-white/10 text-white border-white/30"
                  : "bg-transparent text-[#A8A29E] border-transparent hover:text-white"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Ticket Grid */}
      {isLoading && tickets.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
          <p className="text-sm text-[#A8A29E]">Syncing kitchen line queue...</p>
        </div>
      ) : tickets.length === 0 ? (
        <Card className="p-12 text-center space-y-3 bg-[#24201D] border-[#3D3732]">
          <Utensils className="w-10 h-10 text-[#A8A29E] mx-auto" />
          <h3 className="text-base font-semibold text-[#F3F1EE]">Kitchen Queue Clear!</h3>
          <p className="text-xs text-[#A8A29E]">
            There are currently no active tickets in section &quot;{selectedSection}&quot;.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tickets.map((ticket) => {
            const elapsed = getElapsedMinutes(ticket.createdAt);
            const timerStyle = getTimerStyle(elapsed);
            const borderStyle = getCardBorderStyle(elapsed, ticket.status);

            return (
              <Card
                key={ticket.id}
                className={`p-5 space-y-4 bg-[#24201D] border-2 transition-all flex flex-col justify-between ${borderStyle}`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between border-b border-[#3D3732] pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xl font-extrabold text-amber-400">
                          {ticket.kotNumber}
                        </span>
                        <span className="text-xs font-mono text-[#A8A29E]">
                          ({ticket.order.orderNumber})
                        </span>
                      </div>
                      <div className="text-xs text-[#A8A29E] font-medium mt-0.5">
                        {ticket.order.tableNumber ? (
                          <span className="text-amber-300 font-bold">
                            Table {ticket.order.tableNumber}
                          </span>
                        ) : (
                          ticket.order.orderType.replace("_", " ")
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                      <div className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold border ${timerStyle}`}>
                        <Clock className="w-3 h-3 inline mr-1" />
                        {elapsed}m ago
                      </div>
                      <Badge variant="outline">{ticket.status}</Badge>
                    </div>
                  </div>

                  {/* Customer / Notes */}
                  {ticket.notes && (
                    <div className="mt-3 p-2 bg-amber-950/30 text-amber-300 border border-amber-500/20 rounded text-xs italic">
                      ⚠️ Note: &quot;{ticket.notes}&quot;
                    </div>
                  )}

                  {/* Ticket Items List */}
                  <div className="mt-4 space-y-2">
                    <div className="text-[11px] font-semibold uppercase text-[#A8A29E] tracking-wider">
                      Items Breakdown ({ticket.order.items.length})
                    </div>
                    <div className="space-y-2 divide-y divide-[#3D3732]/40">
                      {ticket.order.items.map((item) => (
                        <div
                          key={item.id}
                          className="pt-2 flex items-start justify-between text-sm"
                        >
                          <div className="flex items-start gap-2.5">
                            <span className="w-7 h-7 bg-[#2D2825] text-amber-400 rounded-lg flex items-center justify-center font-mono font-bold text-sm border border-[#3D3732] shrink-0">
                              {item.quantity}x
                            </span>
                            <div>
                              <div className="font-bold text-[#F3F1EE]">
                                {item.itemNameSnapshot}
                              </div>
                              {item.specialInstructions && (
                                <div className="text-xs text-amber-300 italic font-medium">
                                  ↪ {item.specialInstructions}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Touch Action Bump Buttons */}
                <div className="pt-4 border-t border-[#3D3732] flex items-center gap-2">
                  {ticket.status === "QUEUED" && (
                    <Button
                      variant="primary"
                      className="w-full py-3 text-sm font-bold bg-amber-600 hover:bg-amber-500"
                      onClick={() => handleKOTStatusUpdate(ticket.id, KOTStatus.PREPARING)}
                    >
                      <Play className="w-4 h-4 mr-1.5" /> Start Preparing
                    </Button>
                  )}

                  {ticket.status === "PREPARING" && (
                    <Button
                      variant="primary"
                      className="w-full py-3 text-sm font-bold bg-emerald-600 hover:bg-emerald-500"
                      onClick={() => handleKOTStatusUpdate(ticket.id, KOTStatus.READY)}
                    >
                      <CheckCircle className="w-4 h-4 mr-1.5" /> Mark Ready
                    </Button>
                  )}

                  {ticket.status === "READY" && (
                    <Button
                      variant="secondary"
                      className="w-full py-3 text-sm font-bold text-emerald-400 border-emerald-500/50 hover:bg-emerald-950/40"
                      onClick={() => handleKOTStatusUpdate(ticket.id, KOTStatus.SERVED)}
                    >
                      <CheckCheck className="w-4 h-4 mr-1.5" /> Bump / Served
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
