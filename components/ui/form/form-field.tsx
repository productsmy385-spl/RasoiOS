"use client";

import * as React from "react";
import { TriangleAlert } from "lucide-react";
import { cn } from "@/lib/ui/cn";
import { Icon } from "../icon";
import { FieldControlContext, fieldDomId, fieldErrorFrom, useFormContext } from "./form-context";

/**
 * FormField (S1-P08-T005, design.md §8 Forms): a visible label above the control (placeholders are never labels),
 * "*" plus `aria-required` for required fields, helper text in caption/secondary and the error in danger with a
 * `TriangleAlert` icon. Help and error are linked to the control with `aria-describedby`. The control is rendered by
 * the children and picks the wiring up from context (see components/ui/inputs).
 */
export type FieldProps = {
  /** Form field name; also the key of this field's server error (`fieldErrors[name]`). */
  name?: string;
  label: string;
  required?: boolean;
  help?: React.ReactNode;
  /** A client-side error; overrides the server error for this field. */
  error?: string;
  id?: string;
  className?: string;
};

export function RequiredMark() {
  return (
    <span aria-hidden="true" className="text-status-danger">
      {" *"}
    </span>
  );
}

export function FieldError({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <p id={id} className="flex items-start gap-1.5 text-caption text-status-danger">
      <Icon icon={TriangleAlert} size={16} className="mt-px" />
      <span>{children}</span>
    </p>
  );
}

export function FieldHelp({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <p id={id} className="text-caption text-fg-secondary">
      {children}
    </p>
  );
}

/** Ids, error and description wiring shared by <FormField> and the grouped controls (checkbox, radio group, switch). */
export function useFieldWiring({ name, label, required = false, help, error, id }: Omit<FieldProps, "className">) {
  const form = useFormContext();
  const generated = React.useId();
  const controlId = id ?? fieldDomId(form?.formId, name, generated);
  const helpId = help ? `${controlId}-help` : undefined;
  const message = error ?? fieldErrorFrom(form?.result ?? null, name);
  const errorId = message ? `${controlId}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(" ") || undefined;

  const register = form?.registerField;
  React.useEffect(() => {
    if (!register || !name) return;
    return register(name, { id: controlId, label });
  }, [register, name, controlId, label]);

  return { controlId, helpId, errorId, message, describedBy, invalid: Boolean(message), required };
}

export function FormField({ name, label, required = false, help, error, id, className, children }: FieldProps & { children: React.ReactNode }) {
  const wiring = useFieldWiring({ name, label, required, help, error, id });
  const control = React.useMemo(
    () => ({ id: wiring.controlId, name, describedBy: wiring.describedBy, invalid: wiring.invalid, required }),
    [wiring.controlId, name, wiring.describedBy, wiring.invalid, required],
  );

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={wiring.controlId} className="text-label text-fg-primary">
        {label}
        {required && <RequiredMark />}
      </label>
      <FieldControlContext.Provider value={control}>{children}</FieldControlContext.Provider>
      {help && <FieldHelp id={wiring.helpId}>{help}</FieldHelp>}
      {wiring.message && <FieldError id={wiring.errorId}>{wiring.message}</FieldError>}
    </div>
  );
}
