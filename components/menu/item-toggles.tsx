"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { setMenuItemAvailabilityAction, setMenuItemPublishedAction } from "@/app/restaurant/menu/items-actions";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/inputs";
import { useToast } from "@/components/ui/toast";
import type { ActionResult } from "@/lib/http/action";
import { failureText, UNREACHABLE } from "./feedback";

/**
 * The two quick toggles on a menu item row (SA-MENU-10 publish, SA-MENU-11 availability). The switch moves
 * immediately and rolls back if the server refuses — publishing an item whose category is unpublished, for example,
 * comes back as 422 CATEGORY_NOT_PUBLISHED and the switch returns to where it was, with the reason in a toast.
 *
 * They carry their own permissions: `menu:manage` publishes, `menu:availability:update` marks an item sold out, so a
 * CASHIER sees a read-only badge instead of a switch (SC-RBAC-08 — the server checks again either way).
 */
const SWITCH_LABEL_SR_ONLY = "[&>label>span:first-child]:sr-only";

export type ToggleProps = { itemId: string; name: string; checked: boolean; can: boolean };

function useOptimisticToggle(checked: boolean) {
  const router = useRouter();
  const toast = useToast();
  const [value, setValue] = React.useState(checked);
  React.useEffect(() => {
    setValue(checked);
  }, [checked]);

  const run = React.useCallback(
    async (next: boolean, call: () => Promise<ActionResult<unknown>>, success: string) => {
      setValue(next);
      try {
        const result = await call();
        if (!result.ok) {
          setValue(!next);
          toast.error(failureText(result));
          return;
        }
        toast.success(success);
        router.refresh();
      } catch {
        setValue(!next);
        toast.error(UNREACHABLE);
      }
    },
    [router, toast],
  );

  return { value, run };
}

export function AvailabilityToggle({ itemId, name, checked, can }: ToggleProps) {
  const { value, run } = useOptimisticToggle(checked);
  if (!can) return <Badge tone={value ? "success" : "warning"}>{value ? "Available" : "Sold out"}</Badge>;
  return (
    <Switch
      label={`Available: ${name}`}
      checked={value}
      className={SWITCH_LABEL_SR_ONLY}
      onChange={(event) => {
        const next = event.target.checked;
        void run(next, () => setMenuItemAvailabilityAction({ itemId, available: next }), next ? `${name} is available again.` : `${name} is marked sold out.`);
      }}
    />
  );
}

export function PublishedToggle({ itemId, name, checked, can }: ToggleProps) {
  const { value, run } = useOptimisticToggle(checked);
  if (!can) return <Badge tone={value ? "success" : "neutral"}>{value ? "Published" : "Draft"}</Badge>;
  return (
    <Switch
      label={`Published: ${name}`}
      checked={value}
      className={SWITCH_LABEL_SR_ONLY}
      onChange={(event) => {
        const next = event.target.checked;
        void run(next, () => setMenuItemPublishedAction({ itemId, published: next }), next ? `${name} is on your website.` : `${name} is hidden from your website.`);
      }}
    />
  );
}
