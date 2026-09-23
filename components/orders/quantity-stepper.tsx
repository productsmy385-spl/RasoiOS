"use client";

import { Minus, Plus } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";

/** api.md SA-ORD-01: a line carries 1–99 of an item. */
export const MIN_QUANTITY = 1;
export const MAX_QUANTITY = 99;

/**
 * Touch-first quantity control (frontend.md §5.3). Both buttons are 48 px (`size="lg"`), the value is announced with the item's
 * name, and the count itself is a live region so a screen reader hears the change without leaving the row.
 */
export function QuantityStepper({ label, value, onChange, disabled = false }: { label: string; value: number; onChange: (next: number) => void; disabled?: boolean }) {
  const clamp = (next: number) => Math.min(MAX_QUANTITY, Math.max(MIN_QUANTITY, next));
  return (
    <div className="flex items-center gap-2" role="group" aria-label={label}>
      <IconButton
        icon={Minus}
        size="lg"
        variant="secondary"
        aria-label={`One less: ${label}`}
        disabled={disabled || value <= MIN_QUANTITY}
        onClick={() => onChange(clamp(value - 1))}
      />
      <output aria-live="polite" className="min-w-10 text-center text-subheading text-numeric text-fg-primary">
        {value}
      </output>
      <IconButton
        icon={Plus}
        size="lg"
        variant="secondary"
        aria-label={`One more: ${label}`}
        disabled={disabled || value >= MAX_QUANTITY}
        onClick={() => onChange(clamp(value + 1))}
      />
    </div>
  );
}
