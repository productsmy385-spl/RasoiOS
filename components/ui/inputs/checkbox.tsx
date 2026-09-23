"use client";

import * as React from "react";
import { cn } from "@/lib/ui/cn";
import { FieldError, FieldHelp, RequiredMark, useFieldWiring, type FieldProps } from "../form/form-field";
import type { ControlSize } from "./control";

/**
 * Checkbox (S1-P08-T005): a native checkbox (keyboard, forms and screen readers for free) in the brand accent, with
 * the whole label row as the click target — at least 40 px tall (48 px at touch size).
 */
export type CheckboxProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "size" | "name" | "id" | "required"> &
  FieldProps & { size?: ControlSize; value?: string };

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { name, label, required, help, error, id, className, size = "md", value = "on", ...inputProps },
  ref,
) {
  const wiring = useFieldWiring({ name, label, required, help, error, id });
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <label htmlFor={wiring.controlId} className={cn("inline-flex items-center gap-3 cursor-pointer text-body text-fg-primary", size === "touch" ? "min-h-12" : "min-h-10")}>
        <input
          ref={ref}
          type="checkbox"
          id={wiring.controlId}
          name={name}
          value={value}
          aria-describedby={wiring.describedBy}
          aria-invalid={wiring.invalid || undefined}
          aria-required={required || undefined}
          className="h-5 w-5 shrink-0 cursor-pointer rounded-md accent-action-primary disabled:cursor-not-allowed disabled:opacity-40"
          {...inputProps}
        />
        <span>
          {label}
          {required && <RequiredMark />}
        </span>
      </label>
      {help && <FieldHelp id={wiring.helpId}>{help}</FieldHelp>}
      {wiring.message && <FieldError id={wiring.errorId}>{wiring.message}</FieldError>}
    </div>
  );
});
