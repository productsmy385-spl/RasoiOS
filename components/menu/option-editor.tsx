"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/form";
import { IconButton } from "@/components/ui/icon-button";
import { Checkbox, MoneyField, TextField } from "@/components/ui/inputs";

/**
 * Variant and add-on rows (S1-P10-T007; SA-MENU-12 / SA-MENU-13 replace-sets). Each row is a fieldset with a legend,
 * so a screen reader announces "Variant 2 of 3" before the name and price; add and remove buttons name their row.
 *
 * Prices stay decimal strings from keystroke to server (`MoneyField`, ADR-010) — `null` while the entry is empty or
 * incomplete, which is submitted as-is so the server, not the browser, decides it is invalid. Removing a row does not
 * delete anything: the replace-set archives what is left out, and past orders keep their own snapshot.
 */
export type OptionRow = {
  /** Stable local key so an uncontrolled price input stays with its row when rows are added or removed. */
  key: string;
  /** Present for a row that already exists on the server. */
  id?: string;
  name: string;
  price: string | null;
  isDefault: boolean;
  isAvailable: boolean;
};

let counter = 0;
export function newOptionRow(): OptionRow {
  counter += 1;
  return { key: `new-${counter}`, name: "", price: null, isDefault: false, isAvailable: true };
}

export function OptionEditor({
  kind,
  rows,
  onChange,
  currencyCode,
  max,
  disabled,
  fieldErrors,
}: {
  kind: "variant" | "addon";
  rows: readonly OptionRow[];
  onChange: (rows: OptionRow[]) => void;
  currencyCode: string;
  max: number;
  disabled: boolean;
  /** Server field errors keyed as the action returns them, e.g. `variants.0.name`. */
  fieldErrors: Readonly<Record<string, string[]>>;
}) {
  const noun = kind === "variant" ? "variant" : "add-on";
  const collection = kind === "variant" ? "variants" : "addons";
  const defaultGroup = React.useId();

  function update(index: number, patch: Partial<OptionRow>) {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function chooseDefault(index: number) {
    onChange(rows.map((row, i) => ({ ...row, isDefault: i === index })));
  }

  const atLimit = rows.length >= max;

  return (
    <div className="flex flex-col gap-4">
      {rows.length === 0 ? (
        <p className="text-body text-fg-secondary">
          {kind === "variant"
            ? "No variants. Guests order this item at its base price."
            : "No add-ons. Guests order this item without extras."}
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {rows.map((row, index) => {
            const nameError = fieldErrors[`${collection}.${index}.name`]?.[0];
            const priceError = fieldErrors[`${collection}.${index}.price`]?.[0];
            const rowError = fieldErrors[`${collection}.${index}`]?.[0] ?? fieldErrors[`${collection}.${index}.id`]?.[0];
            const rowName = row.name.trim() || `${noun} ${index + 1}`;
            return (
              <li key={row.key}>
                <fieldset className="flex flex-col gap-3 rounded-xl border border-border-subtle bg-card p-4" disabled={disabled}>
                  <legend className="px-1 text-caption text-fg-secondary">{`${noun === "variant" ? "Variant" : "Add-on"} ${index + 1} of ${rows.length}`}</legend>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <TextField
                      label="Name"
                      required
                      maxLength={60}
                      className="sm:flex-1"
                      value={row.name}
                      error={nameError}
                      autoComplete="off"
                      placeholder={kind === "variant" ? "Full" : "Extra cheese"}
                      onChange={(event) => update(index, { name: event.target.value })}
                    />
                    <MoneyField
                      name={`${collection}-price-${row.key}`}
                      label="Price"
                      required
                      className="sm:w-44"
                      currencyCode={currencyCode}
                      defaultValue={row.price ?? ""}
                      error={priceError}
                      onValueChange={(value) => update(index, { price: value })}
                    />
                    <div className="flex items-center gap-2 sm:pt-6">
                      <IconButton
                        icon={Trash2}
                        variant="ghost"
                        aria-label={`Remove ${rowName}`}
                        onClick={() => onChange(rows.filter((_, i) => i !== index))}
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-6">
                    {kind === "variant" && (
                      <label className="inline-flex min-h-10 cursor-pointer items-center gap-3 text-body text-fg-primary">
                        <input
                          type="radio"
                          name={defaultGroup}
                          checked={row.isDefault}
                          onChange={() => chooseDefault(index)}
                          className="h-5 w-5 shrink-0 cursor-pointer accent-action-primary"
                        />
                        <span>Default choice</span>
                        <span className="sr-only">{`for ${rowName}`}</span>
                      </label>
                    )}
                    <Checkbox
                      label={`Available${rows.length > 1 ? ` (${rowName})` : ""}`}
                      checked={row.isAvailable}
                      onChange={(event) => update(index, { isAvailable: event.target.checked })}
                    />
                  </div>
                  {rowError && <FieldError>{rowError}</FieldError>}
                </fieldset>
              </li>
            );
          })}
        </ul>
      )}

      {fieldErrors[collection]?.[0] && <FieldError>{fieldErrors[collection][0]}</FieldError>}

      <div className="flex items-center gap-3">
        <Button variant="secondary" icon={Plus} disabled={disabled || atLimit} onClick={() => onChange([...rows, newOptionRow()])}>
          {`Add ${noun}`}
        </Button>
        <p className="text-caption text-fg-secondary">{atLimit ? `You can have at most ${max} ${noun}s.` : `${rows.length} of ${max}`}</p>
      </div>
    </div>
  );
}
