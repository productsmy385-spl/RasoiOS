"use client";

import * as React from "react";
import { FieldError, RequiredMark } from "./form/form-field";
import { toDomId } from "./form/form-context";
import { controlClasses } from "./inputs/control";

/**
 * Baseline `Input` kept for pages that are not rebuilt yet (S1-P08-T005). It now uses the form-system tokens and
 * wires its label (`htmlFor`) and error (`aria-describedby`). New code uses <TextField> from components/ui/inputs.
 * @deprecated use TextField / TextInput from "@/components/ui/inputs".
 */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input({ className, type = "text", label, error, id, required, ...props }, ref) {
  const generated = toDomId(React.useId());
  const inputId = id ?? generated;
  const errorId = error ? `${inputId}-error` : undefined;
  return (
    <div className="flex w-full flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-label text-fg-primary">
          {label}
          {required && !label.trim().endsWith("*") && <RequiredMark />}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        type={type}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        className={controlClasses({ invalid: Boolean(error), className })}
        {...props}
      />
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  );
});
