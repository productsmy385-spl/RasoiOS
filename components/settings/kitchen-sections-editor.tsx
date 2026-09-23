"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Archive, Pencil, Plus } from "lucide-react";
import {
  archiveKitchenSectionAction,
  createKitchenSectionAction,
  reorderKitchenSectionsAction,
  updateKitchenSectionAction,
} from "@/app/restaurant/settings/sections-actions";
import { EmptyState } from "@/components/states/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Form, SubmitButton } from "@/components/ui/form";
import { IconButton } from "@/components/ui/icon-button";
import { TextField } from "@/components/ui/inputs/text-field";
import { SortableList } from "@/components/ui/sortable-list";
import { useToast } from "@/components/ui/toast";
import type { KitchenSectionDto } from "@/lib/data/kitchen-sections";
import type { ActionResult } from "@/lib/http/action";
import { DOMAIN_ICONS } from "@/lib/ui/icons";

/**
 * Kitchen sections (S1-P07-T005, S1-P07-T003; api.md SA-KSEC-01…04): the stations a ticket can be routed to, in the
 * order the kitchen screen shows them.
 *
 * Reordering saves as soon as it settles, because a half-applied order is not a state anyone wants to be in; the list
 * shows the server's order again after each save, so a refused move corrects itself on screen. Archiving is refused
 * while a section still has tickets being worked on (409 SECTION_IN_USE) and that refusal is shown as it arrives.
 */
export function KitchenSectionsEditor({ sections, canEdit }: { sections: KitchenSectionDto[]; canEdit: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [order, setOrder] = React.useState(sections);
  const [editing, setEditing] = React.useState<KitchenSectionDto | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [archiving, setArchiving] = React.useState<KitchenSectionDto | null>(null);

  // The server is the order of record: whenever the page reloads its data, follow it.
  React.useEffect(() => setOrder(sections), [sections]);

  async function persistOrder(next: KitchenSectionDto[]) {
    const previous = order;
    setOrder(next);
    const result = await reorderKitchenSectionsAction({ orderedIds: next.map((section) => section.id) });
    if (result.ok) {
      toast.success("Order saved.");
      router.refresh();
    } else {
      setOrder(previous);
      toast.error(result.error.message);
    }
  }

  async function archive(section: KitchenSectionDto) {
    const result = await archiveKitchenSectionAction({ sectionId: section.id });
    setArchiving(null);
    if (result.ok) {
      toast.success(`${section.name} archived.`);
      router.refresh();
    } else {
      toast.error(result.error.message);
    }
  }

  return (
    <Card padding="feature">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-prose text-body text-fg-secondary">
          Where each ticket goes: a dish printed for the tandoor should not arrive at the bar. The order here is the order the kitchen screen uses.
        </p>
        {canEdit && (
          <Button icon={Plus} onClick={() => setCreating(true)}>
            Add a section
          </Button>
        )}
      </div>

      <div className="mt-6">
        {order.length === 0 ? (
          <EmptyState
            icon={DOMAIN_ICONS.kitchen}
            title="No kitchen sections yet"
            description="Add the stations your kitchen actually has — tandoor, bar, dessert — and route menu items to them."
          />
        ) : (
          <SortableList
            label="Kitchen sections"
            items={order}
            disabled={!canEdit}
            getKey={(section) => section.id}
            getLabel={(section) => section.name}
            onReorder={(next) => void persistOrder(next)}
            renderItem={(section) => (
              <div className="flex min-w-0 items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-subheading text-fg-primary">{section.name}</p>
                  <p className="truncate font-mono text-caption text-fg-secondary">{section.code}</p>
                </div>
                {canEdit && (
                  <div className="flex shrink-0 gap-1">
                    <IconButton icon={Pencil} size="sm" aria-label={`Rename ${section.name}`} onClick={() => setEditing(section)} />
                    <IconButton icon={Archive} size="sm" aria-label={`Archive ${section.name}`} onClick={() => setArchiving(section)} />
                  </div>
                )}
              </div>
            )}
          />
        )}
      </div>

      <Dialog open={creating} onClose={() => setCreating(false)} title="Add a kitchen section" description="A name your staff recognise and a short code for the ticket header.">
        <Form
          action={(formData: FormData): Promise<ActionResult<unknown>> =>
            createKitchenSectionAction({ name: String(formData.get("name") ?? "").trim(), code: String(formData.get("code") ?? "").trim() })
          }
          onSuccess={() => {
            setCreating(false);
            toast.success("Section added.");
            router.refresh();
          }}
        >
          <TextField name="name" label="Name" required autoComplete="off" placeholder="Tandoor" />
          <TextField name="code" label="Code" required autoComplete="off" spellCheck={false} placeholder="TANDOOR" help="2–24 letters, digits or underscores. Printed on the ticket." />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <SubmitButton>Add section</SubmitButton>
          </div>
        </Form>
      </Dialog>

      <Dialog open={editing !== null} onClose={() => setEditing(null)} title={editing ? `Rename ${editing.name}` : ""}>
        {editing && (
          <Form
            action={(formData: FormData): Promise<ActionResult<unknown>> =>
              updateKitchenSectionAction({ sectionId: editing.id, name: String(formData.get("name") ?? "").trim(), code: String(formData.get("code") ?? "").trim() })
            }
            onSuccess={() => {
              setEditing(null);
              toast.success("Section updated.");
              router.refresh();
            }}
          >
            <TextField name="name" label="Name" required autoComplete="off" defaultValue={editing.name} />
            <TextField name="code" label="Code" required autoComplete="off" spellCheck={false} defaultValue={editing.code} />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <SubmitButton>Save section</SubmitButton>
            </div>
          </Form>
        )}
      </Dialog>

      <ConfirmDialog
        open={archiving !== null}
        onClose={() => setArchiving(null)}
        title={archiving ? `Archive ${archiving.name}?` : ""}
        description="It stops appearing on new tickets and in the menu editor. Tickets already printed keep their section, and nothing is deleted."
        confirmLabel="Archive section"
        tone="destructive"
        onConfirm={() => (archiving ? archive(archiving) : undefined)}
      />
    </Card>
  );
}
