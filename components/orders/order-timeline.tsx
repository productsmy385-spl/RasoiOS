import type { OrderTimelineEntry } from "@/lib/services/orders";
import { formatInZone } from "@/lib/ui/format";

/** Audit actions this list can put into words; anything else is shown under its own recorded name. */
const TIMELINE_COPY: Record<string, string> = {
  "order.created": "Order created",
  "order.status_changed": "Status changed",
  "order.cancelled": "Order cancelled",
  "order.items_added": "Items added",
  "order.customer_linked": "Customer changed",
  "order.priority_changed": "Priority changed",
};

/**
 * What actually happened to this order, read from the append-only audit log (security.md §7) and shown in the
 * restaurant's own timezone. Nothing is inferred: every row is an event the server recorded, with the person who
 * caused it and the reason they gave.
 */
export function OrderTimeline({ entries, timezone, locale }: { entries: readonly OrderTimelineEntry[]; timezone: string; locale?: string }) {
  return (
    <ol className="flex flex-col gap-3">
      {entries.map((entry) => (
        <li key={entry.id} className="flex gap-3">
          <time dateTime={entry.at} title={entry.at} className="shrink-0 text-caption text-numeric text-fg-secondary">
            {formatInZone(entry.at, timezone, "time", locale)}
          </time>
          <div className="min-w-0">
            <p className="text-label text-fg-primary">
              {TIMELINE_COPY[entry.action] ?? entry.action}
              {entry.from && entry.to ? `: ${entry.from.toLowerCase()} to ${entry.to.toLowerCase()}` : ""}
            </p>
            <p className="text-caption text-fg-secondary">
              {entry.actorName ?? "System"}
              {entry.actorRole ? ` · ${entry.actorRole.toLowerCase().split("_").join(" ")}` : ""}
            </p>
            {entry.reason && <p className="mt-1 text-caption text-fg-secondary">Reason: {entry.reason}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
