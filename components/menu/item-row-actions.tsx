"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Archive, Pencil } from "lucide-react";
import { archiveMenuItemAction } from "@/app/restaurant/menu/items-actions";
import { Alert } from "@/components/ui/alert";
import { RowActions } from "@/components/ui/data-table";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { failureText, UNREACHABLE } from "./feedback";

/**
 * Row actions for a menu item (design.md §8 Tables). Archive is SA-MENU-08: it unpublishes the item, marks it
 * unavailable and takes it off today's and every later daily menu — which the confirmation says in those words,
 * because it is not a delete and past orders keep their own snapshot.
 */
export function MenuItemRowActions({ itemId, name, canManage }: { itemId: string; name: string; canManage: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [confirming, setConfirming] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const items = [
    { label: "Edit item", icon: Pencil, href: `/restaurant/menu/items/${itemId}` },
    ...(canManage
      ? [
          {
            label: "Archive item",
            icon: Archive,
            tone: "danger" as const,
            onSelect: () => {
              setError(null);
              setConfirming(true);
            },
          },
        ]
      : []),
  ];

  async function confirm() {
    try {
      const result = await archiveMenuItemAction({ itemId });
      if (!result.ok) {
        setError(failureText(result));
        return;
      }
      toast.success(`${name} archived.`);
      setConfirming(false);
      router.refresh();
    } catch {
      setError(UNREACHABLE);
    }
  }

  return (
    <>
      <RowActions label={`Actions for ${name}`} items={items} />
      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={`Archive "${name}"?`}
        description="The item leaves your website, stops being orderable and is removed from today's and future daily menus. Past orders and receipts are unchanged."
        confirmLabel="Archive item"
        tone="destructive"
        onConfirm={confirm}
      >
        {error && (
          <Alert tone="danger" title="This item can't be archived yet">
            {error}
          </Alert>
        )}
      </ConfirmDialog>
    </>
  );
}
