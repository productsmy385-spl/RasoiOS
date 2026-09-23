import type { LucideIcon } from "lucide-react";
import type { OrderPriority, OrderType } from "@prisma/client";
import { DOMAIN_ICONS } from "@/lib/ui/icons";

/**
 * Shared vocabulary for the order screens (design.md §5.1, §7). Sentence case everywhere, an icon for every order
 * type, and urgency shown as icon **and** text so it never depends on colour alone.
 */
export const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  DINE_IN: "Dine in",
  TAKEAWAY: "Takeaway",
  DELIVERY: "Delivery",
};

export const ORDER_TYPE_ICONS: Record<OrderType, LucideIcon> = {
  DINE_IN: DOMAIN_ICONS.dineIn,
  TAKEAWAY: DOMAIN_ICONS.takeaway,
  DELIVERY: DOMAIN_ICONS.delivery,
};

export const PRIORITY_LABELS: Record<OrderPriority, string> = { NORMAL: "Normal", HIGH: "Urgent" };

/** The button a role sees for a transition it may request (api.md SA-ORD-02 targets). */
export const TRANSITION_LABELS = {
  ACCEPTED: "Accept",
  PREPARING: "Start preparing",
  READY: "Mark ready",
  COMPLETED: "Complete",
  CANCELLED: "Cancel order",
} as const;

export type TransitionTarget = keyof typeof TRANSITION_LABELS;

/** api.md SA-ORD-03: a cancellation reason is 5–280 characters. */
export const CANCEL_REASON_MIN = 5;
export const CANCEL_REASON_MAX = 280;

/** Whole minutes between two instants, never negative (clock skew between server and device). */
export function elapsedMinutes(fromIso: string, now: number): number {
  return Math.max(0, Math.floor((now - Date.parse(fromIso)) / 60_000));
}

/** "4 min" / "1 h 12 min" — a duration a cook or cashier reads at a glance. */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}
