"use client";

import * as React from "react";
import { cn } from "@/lib/ui/cn";
import { FieldError, FieldHelp, useFieldWiring, type FieldProps } from "../form/form-field";

/**
 * Switch (S1-P08-T005): a native checkbox with `role="switch"`, so it submits with the form and announces on/off.
 * The visual track follows the input's checked and focus-visible state; the label row is the click target.
 */
export type SwitchProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "size" | "name" | "id" | "required" | "role"> &
  Omit<FieldProps, "required"> & { value?: string };

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(function Switch({ name, label, help, error, id, className, value = "on", ...inputProps }, ref) {
  const wiring = useFieldWiring({ name, label, help, error, id });
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <label htmlFor={wiring.controlId} className="inline-flex min-h-10 cursor-pointer items-center justify-between gap-4 text-body text-fg-primary">
        <span>{label}</span>
        <span className="relative inline-flex shrink-0 items-center">
          <input
            ref={ref}
            type="checkbox"
            role="switch"
            id={wiring.controlId}
            name={name}
            value={value}
            aria-describedby={wiring.describedBy}
            aria-invalid={wiring.invalid || undefined}
            className="peer sr-only"
            {...inputProps}
          />
          <span
            aria-hidden="true"
            className={cn(
              "h-6 w-11 rounded-full border border-border-strong bg-raised transition-colors duration-fast ease-standard",
              "peer-checked:border-action-primary peer-checked:bg-action-primary",
              "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus-ring",
              "peer-disabled:opacity-40",
            )}
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-1 h-4 w-4 rounded-full bg-fg-secondary transition-transform duration-fast ease-standard peer-checked:translate-x-5 peer-checked:bg-action-primary-fg"
          />
        </span>
      </label>
      {help && <FieldHelp id={wiring.helpId}>{help}</FieldHelp>}
      {wiring.message && <FieldError id={wiring.errorId}>{wiring.message}</FieldError>}
    </div>
  );
});
