"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { MoneyField } from "@/components/ui/inputs/decimal-field";
import { TextArea } from "@/components/ui/inputs/text-area";
import { useToast } from "@/components/ui/toast";
import { closeBusinessDayAction } from "@/app/restaurant/transactions/actions";
import { moneyDifference } from "@/lib/ui/decimal-input";
import type { DayClosePreview } from "@/lib/data/day-close";

/**
 * Closing the business day (S1-P18-T007; api.md SA-TXN-04, LD-TXN-02).
 *
 * The expected cash comes from the ledger; the person counting the drawer types what is actually in it, and the
 * difference is worked out as they type and announced to screen readers — a variance discovered after the fact is the
 * thing this screen exists to prevent. A difference of any size needs a note, which the server also enforces, and the
 * confirmation dialog restates the figures being committed to, because closing a day cannot be undone from here.
 */
export function DayCloseForm({ preview, money, currencyCode }: { preview: DayClosePreview; money: (amount: string) => string; currencyCode: string }) {
  const router = useRouter();
  const toast = useToast();
  // `MoneyField` hands back the canonical decimal string, or null while the entry is not yet an amount.
  const [counted, setCounted] = React.useState<string | null>(null);
  const [notes, setNotes] = React.useState("");
  const [confirming, setConfirming] = React.useState(false);
  const [failure, setFailure] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  const variance = counted === null ? null : moneyDifference(counted, preview.expectedCash);
  const needsNote = variance !== null && variance !== "0.00";
  const canSubmit = counted !== null && (!needsNote || notes.trim().length > 0);

  async function close() {
    if (counted === null) return;
    setPending(true);
    const result = await closeBusinessDayAction({ businessDate: preview.businessDate, countedCash: counted, notes: notes.trim() });
    setPending(false);
    setConfirming(false);
    if (result.ok) {
      setFailure(null);
      toast.success("The day is closed.");
      router.refresh();
      return;
    }
    const fieldMessage = Object.values(result.error.fieldErrors ?? {}).flat()[0];
    setFailure(fieldMessage ?? result.error.message);
  }

  return (
    <Card padding="feature" className="gap-5">
      <div>
        <h2 className="text-heading text-fg-primary">Count the drawer</h2>
        <p className="mt-1 text-body text-fg-secondary">
          The ledger says {money(preview.expectedCash)} in cash should be there. Type what you actually counted.
        </p>
      </div>

      {preview.openOrderCount > 0 && (
        <Alert tone="warning" title={`${preview.openOrderCount} ${preview.openOrderCount === 1 ? "order is" : "orders are"} still open`}>
          Closing the day does not close them, but no payment can be recorded against this day afterwards. Settle them first if money is still to come in.
        </Alert>
      )}

      <MoneyField name="countedCash" label="Cash counted" required currencyCode={currencyCode} onValueChange={setCounted} help={`What is in the drawer, in ${currencyCode}.`} />

      <div role="status" aria-live="polite" className="min-h-6 text-body">
        {variance === null ? (
          <span className="text-fg-secondary">Enter the counted cash to see the difference.</span>
        ) : variance === "0.00" ? (
          <span className="text-status-success">The drawer matches the ledger exactly.</span>
        ) : (
          <span className={variance.startsWith("-") ? "text-status-danger" : "text-status-warning"}>
            {variance.startsWith("-") ? `Short by ${money(variance.slice(1))}` : `Over by ${money(variance)}`} — explain the difference below.
          </span>
        )}
      </div>

      <TextArea
        name="notes"
        label={needsNote ? "Why is there a difference?" : "Notes"}
        required={needsNote}
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        maxLength={500}
        showCount
        rows={3}
        help={needsNote ? "Required while the count differs from the ledger." : "Optional. Anything the next shift should know."}
      />

      {failure && (
        <Alert tone="danger" title="The day was not closed">
          {failure}
        </Alert>
      )}

      <div className="flex justify-end">
        <Button onClick={() => setConfirming(true)} disabled={!canSubmit}>
          Close the day
        </Button>
      </div>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={`Close ${preview.businessDate}?`}
        confirmLabel="Close the day"
        pending={pending}
        onConfirm={close}
        description={
          <span className="flex flex-col gap-1">
            <span>Cash expected {money(preview.expectedCash)}, counted {money(counted ?? "0.00")}.</span>
            <span>Card {money(preview.cardTotal)} · UPI {money(preview.upiTotal)} · refunds {money(preview.refundTotal)}.</span>
            <span>Once it is closed, no payment, refund or void can be recorded against this day.</span>
          </span>
        }
      />
    </Card>
  );
}

