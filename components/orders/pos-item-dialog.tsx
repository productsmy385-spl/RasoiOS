"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Checkbox, RadioGroup, TextArea } from "@/components/ui/inputs";
import type { MenuItemDetailDto } from "@/lib/services/menu-items";
import { formatMoney } from "@/lib/ui/format";
import { getMenuItemAction } from "@/app/restaurant/menu/items-actions";
import { QuantityStepper } from "./quantity-stepper";

/**
 * Options for one POS tile (frontend.md §5.3): the required variant choice, the add-ons, the quantity and any
 * instruction for the kitchen. Prices are shown from the server's own catalogue strings and are never multiplied
 * here — the line is priced when the cart is quoted and again when the order is saved (ADR-010 §3).
 */
export type ChosenLine = {
  menuItemId: string;
  variantId: string | null;
  addonIds: string[];
  quantity: number;
  specialInstructions: string | null;
  /** What the cart shows until the server answers, e.g. "Paneer Tikka (Full)". */
  label: string;
};

export function PosItemDialog({
  itemId,
  currencyCode,
  locale,
  onClose,
  onAdd,
}: {
  itemId: string | null;
  currencyCode: string;
  locale: string;
  onClose: () => void;
  onAdd: (line: ChosenLine) => void;
}) {
  const [item, setItem] = React.useState<MenuItemDetailDto | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [variantId, setVariantId] = React.useState<string | null>(null);
  const [addonIds, setAddonIds] = React.useState<string[]>([]);
  const [quantity, setQuantity] = React.useState(1);
  const [instructions, setInstructions] = React.useState("");
  const [touched, setTouched] = React.useState(false);

  React.useEffect(() => {
    if (!itemId) return;
    let live = true;
    setItem(null);
    setError(null);
    setVariantId(null);
    setAddonIds([]);
    setQuantity(1);
    setInstructions("");
    setTouched(false);
    void getMenuItemAction({ itemId }).then((result) => {
      if (!live) return;
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      const detail = result.data.item;
      setItem(detail);
      setVariantId(detail.variants.find((variant) => variant.isDefault && variant.isAvailable)?.id ?? null);
    });
    return () => {
      live = false;
    };
  }, [itemId]);

  const variants = (item?.variants ?? []).filter((variant) => variant.isAvailable);
  const addons = (item?.addons ?? []).filter((addon) => addon.isAvailable);
  const variantMissing = variants.length > 0 && variantId === null;

  function add() {
    if (!item) return;
    setTouched(true);
    if (variantMissing) return;
    const variantName = variants.find((variant) => variant.id === variantId)?.name;
    onAdd({
      menuItemId: item.id,
      variantId,
      addonIds,
      quantity,
      specialInstructions: instructions.trim() || null,
      label: variantName ? `${item.name} (${variantName})` : item.name,
    });
  }

  return (
    <Dialog
      open={itemId !== null}
      onClose={onClose}
      size="options"
      title={item?.name ?? "Choose options"}
      description={item?.description ?? undefined}
      guardDirty={false}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="primary" size="lg" disabled={!item} onClick={add}>
            Add to order
          </Button>
        </>
      }
    >
      {error && <p role="alert" className="text-body text-status-danger">{error}</p>}
      {!item && !error && <p className="text-body text-fg-secondary">Loading options…</p>}
      {item && (
        <div className="flex flex-col gap-4">
          {variants.length > 0 && (
            <RadioGroup
              name="variantId"
              label="Choose size"
              required
              size="touch"
              value={variantId ?? ""}
              onValueChange={setVariantId}
              options={variants.map((variant) => ({
                value: variant.id,
                label: `${variant.name} · ${formatMoney(variant.price, currencyCode, locale)}`,
              }))}
              error={touched && variantMissing ? "Choose a size for this item." : undefined}
            />
          )}

          {addons.length > 0 && (
            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-1.5 text-label text-fg-primary">Add-ons</legend>
              {addons.map((addon) => (
                <Checkbox
                  key={addon.id}
                  size="touch"
                  label={`${addon.name} · ${formatMoney(addon.price, currencyCode, locale)}`}
                  checked={addonIds.includes(addon.id)}
                  onChange={(event) => setAddonIds((current) => (event.target.checked ? [...current, addon.id] : current.filter((id) => id !== addon.id)))}
                />
              ))}
            </fieldset>
          )}

          <QuantityStepper label={`Quantity of ${item.name}`} value={quantity} onChange={setQuantity} />

          <TextArea
            label="Instruction for the kitchen"
            rows={2}
            maxLength={280}
            showCount
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
            help="Optional, e.g. less spicy."
          />
        </div>
      )}
    </Dialog>
  );
}
