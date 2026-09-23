"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Flame } from "lucide-react";
import type { OrderPriority } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { Alert } from "@/components/ui/alert";
import type { OrderAction } from "@/lib/services/orders";
import { setOrderPriorityAction, updateOrderStatusAction } from "@/app/restaurant/orders/actions";
import { CancelOrderDialog } from "./cancel-order-dialog";
import { PRIORITY_LABELS, TRANSITION_LABELS, type TransitionTarget } from "./order-labels";

/**
 * The action bar of the order detail (S1-P12-T009, S1-P15-T003; api.md SA-ORD-02, SA-ORD-03, SA-ORD-06).
 *
 * `allowedActions` is computed by the server for this caller and this order (LD-ORD-02), so nothing here decides who
 * may do what — and the server checks again on every request (SC-RBAC-08). `expectedVersion` is sent with every
 * transition: when someone else has moved the order the server answers CONFLICT, and the page refreshes itself
 * instead of overwriting their change.
 */
export function OrderDetailActions({
  orderId,
  orderNumber,
  version,
  priority,
  allowedActions,
}: {
  orderId: string;
  orderNumber: string;
  version: number;
  priority: OrderPriority;
  allowedActions: readonly OrderAction[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = React.useState(false);
  const [conflict, setConflict] = React.useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [cancelError, setCancelError] = React.useState<string | null>(null);

  const targets = allowedActions.filter((action): action is TransitionTarget => action in TRANSITION_LABELS);
  const canSetPriority = allowedActions.includes("SET_PRIORITY");
  const canSetHigh = allowedActions.includes("SET_HIGH_PRIORITY");
  const nextPriority: OrderPriority = priority === "HIGH" ? "NORMAL" : "HIGH";

  async function move(target: TransitionTarget, reason?: string) {
    setPending(true);
    setConflict(null);
    setCancelError(null);
    const result = await updateOrderStatusAction({ orderId, status: target, reason, expectedVersion: version });
    setPending(false);
    if (!result.ok) {
      const message = result.error.fieldErrors?.reason?.[0] ?? result.error.message;
      if (target === "CANCELLED") setCancelError(message);
      else if (result.error.code === "CONFLICT") {
        setConflict(message);
        router.refresh();
      } else toast.error(message);
      return;
    }
    setCancelOpen(false);
    toast.success(`Order ${orderNumber} is now ${result.data.status.toLowerCase()}.`);
    router.refresh();
  }

  async function changePriority() {
    setPending(true);
    const result = await setOrderPriorityAction({ orderId, priority: nextPriority });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    toast.success(nextPriority === "HIGH" ? "Marked urgent for the kitchen." : "Urgency removed.");
    router.refresh();
  }

  if (targets.length === 0 && !canSetPriority) return null;

  return (
    <div className="flex flex-col gap-3">
      {conflict && <Alert tone="warning">{conflict}</Alert>}
      <div className="flex flex-wrap items-center gap-2">
        {targets.map((target) =>
          target === "CANCELLED" ? (
            <Button
              key={target}
              variant="ghost"
              disabled={pending}
              onClick={() => {
                setCancelError(null);
                setCancelOpen(true);
              }}
            >
              {TRANSITION_LABELS[target]}
            </Button>
          ) : (
            <Button key={target} variant="primary" loading={pending} loadingLabel="Saving…" onClick={() => void move(target)}>
              {TRANSITION_LABELS[target]}
            </Button>
          ),
        )}
        {canSetPriority && (
          <Button
            variant="secondary"
            icon={Flame}
            disabled={pending || (nextPriority === "HIGH" && !canSetHigh)}
            title={nextPriority === "HIGH" && !canSetHigh ? "Your role cannot mark an order urgent." : undefined}
            onClick={() => void changePriority()}
          >
            {priority === "HIGH" ? "Remove urgency" : "Mark urgent"}
          </Button>
        )}
        <span className="inline-flex items-center gap-1.5 text-caption text-fg-secondary">
          <Icon icon={Flame} size={16} />
          Priority: {PRIORITY_LABELS[priority]}
        </span>
      </div>

      <CancelOrderDialog
        open={cancelOpen}
        orderNumber={orderNumber}
        pending={pending}
        error={cancelError}
        onClose={() => {
          setCancelOpen(false);
          setCancelError(null);
        }}
        onConfirm={(reason) => void move("CANCELLED", reason)}
      />
    </div>
  );
}
