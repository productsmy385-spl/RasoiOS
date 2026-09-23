"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { createCustomerAction, updateCustomerAction } from "@/app/restaurant/customers/actions";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Form, SubmitButton } from "@/components/ui/form";
import { TextArea } from "@/components/ui/inputs/text-area";
import { TextField } from "@/components/ui/inputs/text-field";
import { useToast } from "@/components/ui/toast";
import type { CustomerDto } from "@/lib/data/customers";
import type { ActionResult } from "@/lib/http/action";

/**
 * Creating and editing a customer (S1-P13-T003; api.md SA-CUS-01, SA-CUS-02).
 *
 * A phone number that already belongs to an active customer comes back as 409 PHONE_EXISTS. The server includes that
 * customer's id when the caller may read customers, so the dialog offers to open the record instead of leaving someone
 * to search for a name they do not know (api.md SA-CUS-01).
 *
 * Notes are staff-only and the field says so: a diner never sees them, but the person typing should know that before
 * they write something they would not say out loud.
 */
const NOTES_HELP = "Seen by your staff only — never on the website, a receipt or a ticket.";

export function NewCustomerButton({ can }: { can: boolean }) {
  const [open, setOpen] = React.useState(false);
  if (!can) return null;
  return (
    <>
      <Button icon={UserPlus} onClick={() => setOpen(true)}>
        New customer
      </Button>
      <NewCustomerDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function NewCustomerDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [existingId, setExistingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) setExistingId(null);
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} title="New customer" description="Only a name is required. A phone number makes them findable at the counter.">
      <Form
        action={async (formData: FormData): Promise<ActionResult<CustomerDto>> => {
          const text = (name: string) => String(formData.get(name) ?? "").trim();
          const result = await createCustomerAction({ fullName: text("fullName"), phoneE164: text("phoneE164"), email: text("email"), notes: text("notes") });
          // The server includes the existing customer's id only for callers who may read customers (api.md SA-CUS-01).
          const existing = result.ok ? null : result.error.details?.existingCustomerId;
          setExistingId(typeof existing === "string" ? existing : null);
          return result;
        }}
        onSuccess={(customer) => {
          onClose();
          toast.success(`${customer.fullName} added.`);
          router.push(`/restaurant/customers/${customer.id}`);
        }}
      >
        <TextField name="fullName" label="Name" required autoComplete="off" />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField name="phoneE164" label="Phone" type="tel" autoComplete="off" help="International format, e.g. +919876543210." />
          <TextField name="email" label="Email" type="email" autoComplete="off" />
        </div>
        <TextArea name="notes" label="Notes" maxLength={500} showCount rows={3} help={NOTES_HELP} />
        {existingId && (
          <p className="text-caption text-fg-secondary">
            <Link href={`/restaurant/customers/${existingId}`} className="text-fg-accent hover:underline">
              Open the customer who already has this number
            </Link>
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <SubmitButton>Add customer</SubmitButton>
        </div>
      </Form>
    </Dialog>
  );
}

export function EditCustomerDialog({ customer, open, onClose }: { customer: CustomerDto; open: boolean; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  return (
    <Dialog open={open} onClose={onClose} title={`Edit ${customer.fullName}`} description="Clearing a field removes what is stored.">
      <Form
        action={(formData: FormData): Promise<ActionResult<CustomerDto>> => {
          const text = (name: string) => String(formData.get(name) ?? "").trim();
          return updateCustomerAction({
            customerId: customer.id,
            fullName: text("fullName"),
            phoneE164: text("phoneE164"),
            email: text("email"),
            notes: text("notes"),
          });
        }}
        onSuccess={() => {
          onClose();
          toast.success("Customer saved.");
          router.refresh();
        }}
      >
        <TextField name="fullName" label="Name" required autoComplete="off" defaultValue={customer.fullName} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField name="phoneE164" label="Phone" type="tel" autoComplete="off" defaultValue={customer.phoneE164 ?? ""} help="International format, e.g. +919876543210." />
          <TextField name="email" label="Email" type="email" autoComplete="off" defaultValue={customer.email ?? ""} />
        </div>
        <TextArea name="notes" label="Notes" maxLength={500} showCount rows={3} defaultValue={customer.notes ?? ""} help={NOTES_HELP} />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <SubmitButton>Save customer</SubmitButton>
        </div>
      </Form>
    </Dialog>
  );
}
