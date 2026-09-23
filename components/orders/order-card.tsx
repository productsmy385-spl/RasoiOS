"use client";

import Link from "next/link";
import { Flame } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { StatusBadge } from "@/components/ui/status-badge";
import type { OrderBoardItem } from "@/lib/services/orders";
import { formatMoney } from "@/lib/ui/format";
import { DOMAIN_ICONS } from "@/lib/ui/icons";
import { ORDER_TYPE_ICONS, ORDER_TYPE_LABELS, elapsedMinutes, formatDuration } from "./order-labels";

/**
 * One live order on the board (frontend.md §5.3): number, type and table, how long it has been waiting, how many
 * lines, the money and payment state when the role may see them, and the single next action the role may take.
 * Urgency is a flame icon **with** the word "Urgent", never colour alone (design.md §7).
 */
export function OrderCard({
  order,
  now,
  locale,
  actions,
}: {
  order: OrderBoardItem;
  /** Rendered "now" in epoch ms, ticked by the board so every card agrees. */
  now: number;
  locale: string;
  actions?: React.ReactNode;
}) {
  const waiting = elapsedMinutes(order.createdAt, now);
  const TypeIcon = ORDER_TYPE_ICONS[order.orderType];

  return (
    <Card className="gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/restaurant/orders/${order.id}`} className="text-heading text-numeric text-fg-primary hover:text-fg-accent hover:underline">
            {order.orderNumber}
          </Link>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-fg-secondary">
            <span className="inline-flex items-center gap-1.5">
              <Icon icon={TypeIcon} size={16} />
              {ORDER_TYPE_LABELS[order.orderType]}
            </span>
            {order.tableLabel && <span>Table {order.tableLabel}</span>}
            <span className="inline-flex items-center gap-1.5">
              <Icon icon={DOMAIN_ICONS.timer} size={16} />
              <time dateTime={order.createdAt}>{formatDuration(waiting)}</time>
            </span>
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <StatusBadge domain="order" status={order.status} />
          {order.paymentStatus && <StatusBadge domain="payment" status={order.paymentStatus} />}
        </div>
      </div>

      {order.priority === "HIGH" && (
        <p className="inline-flex w-fit items-center gap-1.5 rounded-full bg-status-danger/12 px-2 py-1 text-caption text-status-danger">
          <Icon icon={Flame} size={16} />
          Urgent
        </p>
      )}

      <dl className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <div>
          <dt className="text-caption text-fg-secondary">Lines</dt>
          <dd className="text-subheading text-numeric text-fg-primary">{order.itemCount}</dd>
        </div>
        {order.totalAmount !== null && (
          <div>
            <dt className="text-caption text-fg-secondary">Total</dt>
            <dd className="text-subheading text-numeric text-fg-primary">{formatMoney(order.totalAmount, order.currencyCode, locale)}</dd>
          </div>
        )}
        {order.customerName && (
          <div className="min-w-0">
            <dt className="text-caption text-fg-secondary">Customer</dt>
            <dd className="truncate text-body text-fg-primary" title={order.customerName}>
              {order.customerName}
            </dd>
          </div>
        )}
      </dl>

      {actions && <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">{actions}</div>}
    </Card>
  );
}
