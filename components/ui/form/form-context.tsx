"use client";

import * as React from "react";
import type { ActionResult } from "@/lib/http/action";

/**
 * Shared state between <Form>, <FormField> and the input controls (S1-P08-T005). A field finds its server error by
 * `name` in the last ActionResult, and registers its label so the error summary can name and link to it.
 */
export type RegisteredField = { id: string; label: string };

export type FormContextValue = {
  formId: string;
  result: ActionResult<unknown> | null;
  pending: boolean;
  fields: Readonly<Record<string, RegisteredField>>;
  registerField: (name: string, field: RegisteredField) => () => void;
};

export const FormContext = React.createContext<FormContextValue | null>(null);

export function useFormContext(): FormContextValue | null {
  return React.useContext(FormContext);
}

/** The first server message for `name` from the last failed submit, if any. */
export function fieldErrorFrom(result: ActionResult<unknown> | null, name: string | undefined): string | undefined {
  if (!name || !result || result.ok) return undefined;
  return result.error.fieldErrors?.[name]?.[0];
}

/** Per-field wiring passed from <FormField> to the control inside it. */
export type FieldControlContextValue = {
  id: string;
  name?: string;
  describedBy?: string;
  invalid: boolean;
  required: boolean;
};

export const FieldControlContext = React.createContext<FieldControlContextValue | null>(null);

export function useFieldControl(): FieldControlContextValue | null {
  return React.useContext(FieldControlContext);
}

/** A stable DOM id for a field: derived from the form and field name inside a <Form>, otherwise generated. */
export function fieldDomId(formId: string | undefined, name: string | undefined, fallback: string): string {
  return toDomId(formId && name ? `${formId}-${name}` : fallback);
}

/** React ids contain characters that are awkward in selectors and URL fragments; keep ids to [A-Za-z0-9_-]. */
export function toDomId(value: string): string {
  return `f${value.replace(/[^A-Za-z0-9_-]/g, "_")}`;
}
