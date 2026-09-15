"use client";

import { OrderStatus } from "@prisma/client";
import { KOTCard, KOTTicket } from "./KOTCard";
import { UtensilsCrossed, Clock, CheckCheck, Flame } from "lucide-react";

interface KitchenBoardProps {
  tickets: KOTTicket[];
  onBumpStatus: (orderId: string, nextStatus: OrderStatus) => void;
}

export function KitchenBoard({ tickets, onBumpStatus }: KitchenBoardProps) {
  const newTickets = tickets.filter((t) => t.status === "NEW");
  const preparingTickets = tickets.filter((t) => t.status === "PREPARING");
  const readyTickets = tickets.filter((t) => t.status === "READY");

  return (
    <div className="space-y-6">
      {/* Board Summary Header */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-4 rounded-xl flex items-center justify-between border-l-4 border-l-[#D97706]">
          <div>
            <p className="text-xs text-gray-400 font-mono uppercase">New Orders</p>
            <p className="text-2xl font-bold font-mono text-[#D97706]">{newTickets.length}</p>
          </div>
          <Clock className="w-8 h-8 text-[#D97706]/40" />
        </div>

        <div className="glass-panel p-4 rounded-xl flex items-center justify-between border-l-4 border-l-amber-500">
          <div>
            <p className="text-xs text-gray-400 font-mono uppercase">Preparing</p>
            <p className="text-2xl font-bold font-mono text-amber-400">{preparingTickets.length}</p>
          </div>
          <Flame className="w-8 h-8 text-amber-500/40" />
        </div>

        <div className="glass-panel p-4 rounded-xl flex items-center justify-between border-l-4 border-l-[#10B981]">
          <div>
            <p className="text-xs text-gray-400 font-mono uppercase">Ready for Pickup</p>
            <p className="text-2xl font-bold font-mono text-[#10B981]">{readyTickets.length}</p>
          </div>
          <CheckCheck className="w-8 h-8 text-[#10B981]/40" />
        </div>
      </div>

      {/* Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* NEW COLUMN */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#38322E]">
            <h3 className="font-display font-bold text-lg text-[#FBF9F5] flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#D97706]" />
              New Tickets ({newTickets.length})
            </h3>
          </div>
          {newTickets.length === 0 ? (
            <div className="text-center py-10 glass-panel rounded-xl text-gray-500 text-xs">
              No new incoming orders
            </div>
          ) : (
            <div className="space-y-4">
              {newTickets.map((t) => (
                <KOTCard key={t.id} ticket={t} onBumpStatus={onBumpStatus} />
              ))}
            </div>
          )}
        </div>

        {/* PREPARING COLUMN */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#38322E]">
            <h3 className="font-display font-bold text-lg text-[#FBF9F5] flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500" />
              In Prep ({preparingTickets.length})
            </h3>
          </div>
          {preparingTickets.length === 0 ? (
            <div className="text-center py-10 glass-panel rounded-xl text-gray-500 text-xs">
              Kitchen grill is clear
            </div>
          ) : (
            <div className="space-y-4">
              {preparingTickets.map((t) => (
                <KOTCard key={t.id} ticket={t} onBumpStatus={onBumpStatus} />
              ))}
            </div>
          )}
        </div>

        {/* READY COLUMN */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#38322E]">
            <h3 className="font-display font-bold text-lg text-[#FBF9F5] flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#10B981]" />
              Ready for Serving ({readyTickets.length})
            </h3>
          </div>
          {readyTickets.length === 0 ? (
            <div className="text-center py-10 glass-panel rounded-xl text-gray-500 text-xs">
              No ready orders waiting
            </div>
          ) : (
            <div className="space-y-4">
              {readyTickets.map((t) => (
                <KOTCard key={t.id} ticket={t} onBumpStatus={onBumpStatus} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
