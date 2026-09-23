"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Ban } from "lucide-react";
import { voidTransactionAction } from "@/app/restaurant/transactions/actions";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Form, SubmitButton } from "@/components/ui/form";
import { TextArea } from "@/components/ui/inputs/text-area";
import { RowActions } from "@/components/ui/data-table";
import { useToast } from "@/components/ui/toast";
import type { ActionResult } from "@/lib/http/action";

/**
 * Voiding a ledger row recorded by mistake (S1-P18-T005; api.md SA-TXN-03).
 *
 * A void never rewrites an amount: the row is marked VOIDED with a reason, which is why the day's totals and every
 * refund stay reconstructable from the ledger alone (INV-04). The server allows it only on the row's own business day,
 * only while that day is open, and never for a payment that has already been refunded — those refusals arrive as the
 * server worded them rather than being guessed at here.
 */
export type VoidableRow = { id: string; kind: string; amount: string; orderNumber: string };

export function VoidRowAction({ row, can }: { row: VoidableRow; can: boolean }) {
  const [open, setOpen] = React.useState(false);
  if (!can) return null;
  return (
    <>
      <RowActions label={`Actions for ${row.kind} on order ${row.orderNumber}`} items={[{ label: "Void this entry", icon: Ban, tone: "danger", onSelect: () => setOpen(true) }]} />
      <VoidDialog row={row} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function VoidDialog({ row, open, onClose }: { row: VoidableRow; open: boolean; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Void the ${row.amount} ${row.kind.toLowerCase()} on order ${row.orderNumber}?`}
      description="The entry stays in the ledger, marked voided with your reason, and stops counting towards the day's totals. Use a refund instead when money actually went back to the customer."
    >
      <Form
        action={(formData: FormData): Promise<ActionResult<unknown>> =>
          voidTransactionAction({ transactionId: row.id, reason: String(formData.get("reason") ?? "").trim() })
        }
        onSuccess={() => {
          onClose();
          toast.success("Entry voided.");
          router.refresh();
        }}
      >
        <TextArea name="reason" label="Why is it being voided?" required minLength={5} maxLength={280} showCount help="Recorded in the audit trail. At least 5 characters." />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <SubmitButton variant="destructive" loadingLabel="Voiding…">
            Void entry
          </SubmitButton>
        </div>
      </Form>
    </Dialog>
  );
}
