"use client";

import * as React from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TextArea } from "@/components/ui/inputs";
import { CANCEL_REASON_MAX, CANCEL_REASON_MIN } from "./order-labels";

/**
 * Cancelling an order always needs a written reason (api.md SA-ORD-03, security.md §3.3 row 29). The dialog names the
 * order, refuses to submit a reason shorter than the server's minimum, and shows the server's own error when the
 * server refuses — it never reports success on its own.
 */
export function CancelOrderDialog({
  open,
  orderNumber,
  pending,
  error,
  onClose,
  onConfirm,
}: {
  open: boolean;
  orderNumber: string;
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = React.useState("");
  const [touched, setTouched] = React.useState(false);
  const tooShort = reason.trim().length < CANCEL_REASON_MIN;

  React.useEffect(() => {
    if (open) {
      setReason("");
      setTouched(false);
    }
  }, [open]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="confirm"
      title={`Cancel order ${orderNumber}?`}
      description="The kitchen tickets for this order are cancelled with it. This cannot be undone."
      guardDirty={false}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
            Keep order
          </Button>
          <Button
            type="button"
            variant="destructive"
            loading={pending}
            loadingLabel="Cancelling…"
            onClick={() => {
              setTouched(true);
              if (!tooShort) onConfirm(reason.trim());
            }}
          >
            Cancel order
          </Button>
        </>
      }
    >
      <TextArea
        name="reason"
        label="Reason"
        required
        rows={3}
        maxLength={CANCEL_REASON_MAX}
        showCount
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        onBlur={() => setTouched(true)}
        help={`At least ${CANCEL_REASON_MIN} characters. This is recorded in the activity log.`}
        error={touched && tooShort ? `Enter a reason of at least ${CANCEL_REASON_MIN} characters.` : (error ?? undefined)}
      />
    </Dialog>
  );
}
