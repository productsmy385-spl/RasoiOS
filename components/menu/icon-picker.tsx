"use client";

import * as React from "react";
import { Ban } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { FieldError, FieldHelp, useFieldWiring } from "@/components/ui/form";
import { cn } from "@/lib/ui/cn";
import { MENU_ICONS, MENU_ICON_KEYS } from "@/lib/ui/icons";

/**
 * Icon picker (S1-P10-T005/T007): the curated `MENU_ICON_KEYS` set (design.md §5.1) as a native radio group, so
 * arrow keys move between icons and the choice submits with the form. "No icon" is the first option, which is what
 * clears `icon_key` on the server (blank → null).
 */
export function IconPicker({
  name,
  label,
  defaultValue,
  value,
  onValueChange,
  help,
  disabled,
  className,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  value?: string | null;
  onValueChange?: (value: string) => void;
  help?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  const wiring = useFieldWiring({ name, label, help });
  const legendId = `${wiring.controlId}-legend`;
  const options = ["", ...MENU_ICON_KEYS];

  return (
    <fieldset
      id={wiring.controlId}
      aria-describedby={wiring.describedBy}
      aria-labelledby={legendId}
      disabled={disabled}
      className={cn("flex min-w-0 flex-col gap-1.5", className)}
    >
      <legend id={legendId} className="mb-1.5 text-label text-fg-primary">
        {label}
      </legend>
      <div className="grid grid-cols-6 gap-2 sm:grid-cols-9">
        {options.map((key) => {
          const optionId = `${wiring.controlId}-${key || "none"}`;
          const glyph = key === "" ? Ban : MENU_ICONS[key as keyof typeof MENU_ICONS];
          const optionLabel = key === "" ? "No icon" : key.replace(/([a-z])([A-Z])/g, "$1 $2");
          return (
            <label
              key={optionId}
              htmlFor={optionId}
              title={optionLabel}
              className={cn(
                "group inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-xl border border-border-subtle bg-card text-fg-secondary",
                "transition-colors duration-fast ease-standard hover:border-border-strong hover:text-fg-primary",
                "has-[:checked]:border-action-primary has-[:checked]:bg-action-primary/12 has-[:checked]:text-fg-accent",
                "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus-ring",
              )}
            >
              <input
                type="radio"
                id={optionId}
                name={name}
                value={key}
                className="sr-only"
                defaultChecked={value === undefined ? (defaultValue ?? "") === key : undefined}
                checked={value === undefined ? undefined : (value ?? "") === key}
                onChange={(event) => event.target.checked && onValueChange?.(key)}
              />
              <Icon icon={glyph} size={20} />
              <span className="sr-only">{optionLabel}</span>
            </label>
          );
        })}
      </div>
      {help && <FieldHelp id={wiring.helpId}>{help}</FieldHelp>}
      {wiring.message && <FieldError id={wiring.errorId}>{wiring.message}</FieldError>}
    </fieldset>
  );
}
