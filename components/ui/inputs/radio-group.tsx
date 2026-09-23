"use client";

import * as React from "react";
import { cn } from "@/lib/ui/cn";
import { FieldError, FieldHelp, RequiredMark, useFieldWiring, type FieldProps } from "../form/form-field";
import type { ControlSize } from "./control";

/**
 * Radio group (S1-P08-T005): a fieldset with a visible legend and native radios (arrow keys move between options).
 * The group carries `aria-describedby` for help and error text.
 */
export type RadioOption = { value: string; label: string; description?: string; disabled?: boolean };

export type RadioGroupProps = FieldProps & {
  name: string;
  options: readonly RadioOption[];
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  orientation?: "vertical" | "horizontal";
  size?: ControlSize;
  disabled?: boolean;
};

export function RadioGroup({ name, label, required, help, error, id, className, options, defaultValue, value, onValueChange, orientation = "vertical", size = "md", disabled }: RadioGroupProps) {
  const wiring = useFieldWiring({ name, label, required, help, error, id });
  const legendId = `${wiring.controlId}-legend`;
  return (
    <fieldset
      id={wiring.controlId}
      role="radiogroup"
      aria-labelledby={legendId}
      aria-describedby={wiring.describedBy}
      aria-invalid={wiring.invalid || undefined}
      aria-required={required || undefined}
      tabIndex={-1}
      disabled={disabled}
      className={cn("flex flex-col gap-1.5 min-w-0", className)}
    >
      <legend id={legendId} className="text-label text-fg-primary mb-1.5">
        {label}
        {required && <RequiredMark />}
      </legend>
      <div className={cn(orientation === "horizontal" ? "flex flex-wrap gap-x-6" : "flex flex-col")}>
        {options.map((option) => {
          const optionId = `${wiring.controlId}-${option.value.replace(/[^A-Za-z0-9_-]/g, "_")}`;
          return (
            <label key={option.value} htmlFor={optionId} className={cn("inline-flex items-center gap-3 cursor-pointer text-body text-fg-primary", size === "touch" ? "min-h-12" : "min-h-10")}>
              <input
                type="radio"
                id={optionId}
                name={name}
                value={option.value}
                disabled={option.disabled}
                defaultChecked={value === undefined ? defaultValue === option.value : undefined}
                checked={value === undefined ? undefined : value === option.value}
                onChange={(event) => event.target.checked && onValueChange?.(option.value)}
                aria-describedby={option.description ? `${optionId}-description` : undefined}
                className="h-5 w-5 shrink-0 cursor-pointer accent-action-primary disabled:cursor-not-allowed disabled:opacity-40"
              />
              <span className="flex flex-col">
                <span>{option.label}</span>
                {option.description && (
                  <span id={`${optionId}-description`} className="text-caption text-fg-secondary">
                    {option.description}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>
      {help && <FieldHelp id={wiring.helpId}>{help}</FieldHelp>}
      {wiring.message && <FieldError id={wiring.errorId}>{wiring.message}</FieldError>}
    </fieldset>
  );
}
