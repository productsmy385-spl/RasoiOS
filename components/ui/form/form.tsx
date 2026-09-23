"use client";

import * as React from "react";
import type { ActionResult } from "@/lib/http/action";
import { cn } from "@/lib/ui/cn";
import { Button, type ButtonProps } from "../button";
import { ErrorSummary, type SummaryItem } from "./error-summary";
import { FormContext, type FormContextValue, type RegisteredField, toDomId, useFormContext } from "./form-context";

/**
 * Form (S1-P08-T005, frontend.md FE-07): React 19 `useActionState` around a Server Action that returns the standard
 * `ActionResult` envelope (lib/http/action.ts). Field errors from the server land on the matching <FormField> by name;
 * a failed submit shows the <ErrorSummary> at the top and moves focus to it.
 *
 * The action is dispatched from `onSubmit` (inside a transition) rather than `<form action>`, so React does not reset
 * the user's input when validation fails.
 */
export type FormAction<T> = (formData: FormData) => Promise<ActionResult<T>>;

export type FormProps<T> = Omit<React.FormHTMLAttributes<HTMLFormElement>, "action" | "onSubmit" | "children"> & {
  action: FormAction<T>;
  onSuccess?: (data: T) => void;
  /** Clear the fields after a successful submit (e.g. "add another"). */
  resetOnSuccess?: boolean;
  children: React.ReactNode;
};

const humanize = (name: string) => {
  const last = name.split(".").pop() ?? name;
  const words = last.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/** Summary lines for a failed result: one per field message, linked to the registered control when there is one. */
export function summaryItems(result: ActionResult<unknown> | null, fields: Readonly<Record<string, RegisteredField>>): SummaryItem[] {
  if (!result || result.ok || !result.error.fieldErrors) return [];
  return Object.entries(result.error.fieldErrors).flatMap(([name, messages]) =>
    messages.slice(0, 1).map((message) => {
      const field = fields[name];
      return field ? { fieldId: field.id, label: field.label, message } : { label: name === "_" ? undefined : humanize(name), message };
    }),
  );
}

export function Form<T>({ action, onSuccess, resetOnSuccess = false, className, children, ...rest }: FormProps<T>) {
  const formId = toDomId(React.useId());
  const formRef = React.useRef<HTMLFormElement>(null);
  const summaryRef = React.useRef<HTMLDivElement>(null);
  const [fields, setFields] = React.useState<Record<string, RegisteredField>>({});
  const [result, dispatch, pending] = React.useActionState<ActionResult<T> | null, FormData>((_previous, formData) => action(formData), null);

  // Callbacks change identity on every parent render; the effect below should run once per result only.
  const onSuccessRef = React.useRef(onSuccess);
  React.useEffect(() => {
    onSuccessRef.current = onSuccess;
  });

  React.useEffect(() => {
    if (!result) return;
    if (result.ok) {
      if (resetOnSuccess) formRef.current?.reset();
      onSuccessRef.current?.(result.data);
    } else {
      summaryRef.current?.focus();
    }
  }, [result, resetOnSuccess]);

  const registerField = React.useCallback((name: string, field: RegisteredField) => {
    setFields((current) => (current[name]?.id === field.id && current[name]?.label === field.label ? current : { ...current, [name]: field }));
    return () =>
      setFields((current) => {
        if (!(name in current)) return current;
        const next = { ...current };
        delete next[name];
        return next;
      });
  }, []);

  const context = React.useMemo<FormContextValue>(
    () => ({ formId, result: result as ActionResult<unknown> | null, pending, fields, registerField }),
    [formId, result, pending, fields, registerField],
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const formData = new FormData(event.currentTarget, submitter ?? undefined);
    React.startTransition(() => dispatch(formData));
  }

  const failed = result && !result.ok ? result.error : null;

  return (
    <FormContext.Provider value={context}>
      <form ref={formRef} noValidate onSubmit={handleSubmit} aria-busy={pending || undefined} className={cn("flex flex-col gap-4", className)} {...rest}>
        {failed && (
          <ErrorSummary
            ref={summaryRef}
            title={failed.message}
            items={summaryItems(result, fields)}
            // Validation problems need no reference; INTERNAL messages already include it.
            requestId={failed.code === "VALIDATION_ERROR" || failed.code === "INTERNAL" ? undefined : failed.requestId}
          />
        )}
        {children}
      </form>
    </FormContext.Provider>
  );
}

/** Submit button bound to the surrounding <Form>: shows the pending state ("Saving…") while the action runs. */
export function SubmitButton({ children, loadingLabel = "Saving…", ...props }: Omit<ButtonProps, "type" | "loading">) {
  const form = useFormContext();
  return (
    <Button type="submit" loading={form?.pending ?? false} loadingLabel={loadingLabel} {...props}>
      {children}
    </Button>
  );
}
