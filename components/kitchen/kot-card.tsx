"use client";

import { Flame } from "lucide-react";
import type { KotStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { StatusBadge } from "@/components/ui/status-badge";
import type { BoardTicket } from "@/lib/data/kitchen";
import { DOMAIN_ICONS, STATUS_ICONS } from "@/lib/ui/icons";
import { ORDER_TYPE_LABELS, elapsedMinutes, formatDuration } from "@/components/orders/order-labels";

/**
 * One kitchen ticket (design.md §11 Kitchen, frontend.md §5.3).
 *
 * Read at arm's length: the KOT number is 28 px, item lines 18 px with the quantity first, and instructions carry a
 * warning-toned left border. Urgency and lateness are always icon **and** words, never colour alone. There is exactly
 * one primary action per card, at touch size, and it only appears when the role may make that move — the server
 * checks again (SC-RBAC-08). No customer name and no money reach this card: the projection never sends them.
 */
export const KITCHEN_NEXT: Partial<Record<KotStatus, { to: KotStatus; label: string }>> = {
  QUEUED: { to: "PREPARING", label: "Start" },
  PREPARING: { to: "READY", label: "Ready" },
  READY: { to: "SERVED", label: "Served" },
};

/** design.md §11: warning at the target prep time, overdue at +50 %. */
export function lateness(minutes: number, target: number | null): "ontime" | "warning" | "overdue" {
  if (target === null || target <= 0) return "ontime";
  if (minutes >= Math.ceil(target * 1.5)) return "overdue";
  return minutes >= target ? "warning" : "ontime";
}

export function KotCard({
  ticket,
  now,
  action,
  pending,
  onAdvance,
}: {
  ticket: BoardTicket;
  now: number;
  /** The move this role may make from the ticket's status, or null when it may only watch. */
  action: { to: KotStatus; label: string } | null;
  pending: boolean;
  onAdvance: (to: KotStatus) => void;
}) {
  const since = ticket.status === "PREPARING" && ticket.preparingAt ? ticket.preparingAt : ticket.queuedAt;
  const minutes = elapsedMinutes(since, now);
  const state = lateness(minutes, ticket.targetPrepMinutes);
  const timerClass = state === "overdue" ? "text-status-danger" : state === "warning" ? "text-status-warning" : "text-fg-secondary";

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-border-subtle bg-card p-5 shadow-e1">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-kitchen-number text-fg-primary">{ticket.kotNumber}</p>
          <p className="text-subheading text-fg-secondary">
            {ticket.tableLabel ? `Table ${ticket.tableLabel}` : ORDER_TYPE_LABELS[ticket.orderType]}
            {ticket.roundNumber > 1 ? ` · round ${ticket.roundNumber}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <StatusBadge domain="kot" status={ticket.status} />
          {ticket.printStatus !== "NONE" && <StatusBadge domain="printJob" status={ticket.printStatus} />}
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className={`inline-flex items-center gap-2 text-subheading text-numeric ${timerClass}`}>
          <Icon icon={DOMAIN_ICONS.timer} size={20} />
          {state === "overdue" ? `Overdue ${formatDuration(minutes - (ticket.targetPrepMinutes ?? 0))}` : formatDuration(minutes)}
          {state === "warning" && <span className="text-label">at target</span>}
        </p>
        {ticket.targetPrepMinutes !== null && <p className="text-caption text-fg-secondary">Target {formatDuration(ticket.targetPrepMinutes)}</p>}
        {ticket.priority === "HIGH" && (
          <p className="inline-flex items-center gap-1.5 rounded-full bg-status-danger/12 px-2 py-1 text-label text-status-danger">
            <Icon icon={Flame} size={18} />
            Urgent
          </p>
        )}
      </div>

      <ul className="flex flex-col gap-2">
        {ticket.items.map((item) => (
          <li key={item.id}>
            <p className="text-kitchen-item text-fg-primary">
              <span className="text-numeric">{item.quantity} ×</span> {item.label}
            </p>
            {item.addons && <p className="text-body text-fg-secondary">{item.addons}</p>}
            {item.instructions && <p className="mt-1 border-l-2 border-status-warning pl-2 text-body text-status-warning">{item.instructions}</p>}
          </li>
        ))}
      </ul>

      {ticket.notes && <p className="border-l-2 border-status-warning pl-2 text-body text-status-warning">{ticket.notes}</p>}

      {action && (
        <Button variant="primary" size="touch" className="mt-auto w-full" loading={pending} loadingLabel="Saving…" onClick={() => onAdvance(action.to)}>
          {action.label}
        </Button>
      )}
      {!action && (
        <p className="mt-auto inline-flex items-center gap-2 text-label text-fg-secondary">
          <Icon icon={STATUS_ICONS.kot[ticket.status].icon} size={18} />
          {STATUS_ICONS.kot[ticket.status].label}
        </p>
      )}
    </article>
  );
}
