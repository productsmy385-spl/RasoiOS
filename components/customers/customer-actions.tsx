"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Archive, Pencil, UserX } from "lucide-react";
import { anonymizeCustomerAction, archiveCustomerAction } from "@/app/restaurant/customers/actions";
import { EditCustomerDialog } from "./customer-dialogs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import type { CustomerDto } from "@/lib/data/customers";
import { ANONYMISE_CONFIRM_PHRASE } from "@/lib/validation/customers";

/**
 * Editing, archiving and anonymising one customer (S1-P13-T003; api.md SA-CUS-02, SA-CUS-03, SA-CUS-04).
 *
 * Archiving hides someone from the lists; anonymising erases their personal data for good and is offered only to a
 * restaurant administrator, behind a typed confirmation, with the consequence spelled out. The two are deliberately
 * separate: one is housekeeping, the other answers an erasure request and cannot be undone.
 */
export function CustomerActions({ customer, can }: { customer: CustomerDto; can: { update: boolean; archive: boolean; anonymise: boolean } }) {
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = React.useState(false);
  const [archiving, setArchiving] = React.useState(false);
  const [anonymising, setAnonymising] = React.useState(false);

  async function archive() {
    const result = await archiveCustomerAction({ customerId: customer.id });
    setArchiving(false);
    if (result.ok) {
      toast.success(`${customer.fullName} archived.`);
      router.refresh();
    } else {
      toast.error(result.error.message);
    }
  }

  async function anonymise() {
    const result = await anonymizeCustomerAction({ customerId: customer.id, confirmPhrase: ANONYMISE_CONFIRM_PHRASE });
    setAnonymising(false);
    if (result.ok) {
      toast.success("Personal data removed.");
      router.refresh();
    } else {
      toast.error(result.error.message);
    }
  }

  const danger = can.archive || can.anonymise;

  return (
    <>
      {can.update && !customer.isAnonymized && (
        <Button variant="secondary" icon={Pencil} onClick={() => setEditing(true)}>
          Edit
        </Button>
      )}

      {can.update && <EditCustomerDialog customer={customer} open={editing} onClose={() => setEditing(false)} />}

      {danger && !customer.isAnonymized && (
        <Card padding="feature" className="mt-8 border-status-danger/40">
          <h2 className="text-heading text-fg-primary">Removing this customer</h2>
          <div className="mt-4 flex flex-col gap-6">
            {can.archive && !customer.isArchived && (
              <DangerRow
                title="Archive"
                description="They stop appearing in the customer list and in counter lookup. Their orders keep the link, and you can still open this page."
                button={
                  <Button variant="secondary" icon={Archive} onClick={() => setArchiving(true)}>
                    Archive customer
                  </Button>
                }
              />
            )}
            {can.anonymise && (
              <DangerRow
                title="Erase personal data"
                description="The name, phone, email and notes are deleted for good. The orders and totals stay, so the restaurant's history and reports remain correct. This cannot be undone."
                button={
                  <Button variant="destructive" icon={UserX} onClick={() => setAnonymising(true)}>
                    Erase personal data
                  </Button>
                }
              />
            )}
          </div>
        </Card>
      )}

      <ConfirmDialog
        open={archiving}
        onClose={() => setArchiving(false)}
        title={`Archive ${customer.fullName}?`}
        description="They disappear from the list and from counter lookup. Nothing is deleted."
        confirmLabel="Archive customer"
        onConfirm={archive}
      />

      <ConfirmDialog
        open={anonymising}
        onClose={() => setAnonymising(false)}
        title={`Erase ${customer.fullName}'s personal data?`}
        description="Their name, phone, email and notes are deleted for good. Their orders stay, without a name on them. This cannot be undone."
        confirmLabel="Erase personal data"
        tone="destructive"
        confirmText={ANONYMISE_CONFIRM_PHRASE}
        onConfirm={anonymise}
      />
    </>
  );
}

function DangerRow({ title, description, button }: { title: string; description: string; button: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="max-w-prose">
        <p className="text-label text-fg-primary">{title}</p>
        <p className="mt-1 text-body text-fg-secondary">{description}</p>
      </div>
      <div className="shrink-0">{button}</div>
    </div>
  );
}
