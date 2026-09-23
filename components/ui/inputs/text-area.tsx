"use client";

import * as React from "react";
import { cn } from "@/lib/ui/cn";
import { FormField, type FieldProps } from "../form/form-field";
import { controlClasses, useControlWiring, type ControlSize } from "./control";

/** Multi-line text (S1-P08-T005). Optional live character count for fields with a `maxLength` (e.g. captions). */
export type TextAreaInputProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & { size?: ControlSize };

export const TextAreaInput = React.forwardRef<HTMLTextAreaElement, TextAreaInputProps>(function TextAreaInput({ size = "md", className, rows = 4, ...props }, ref) {
  const { invalid, ...wiring } = useControlWiring(props);
  return <textarea ref={ref} rows={rows} {...props} {...wiring} className={controlClasses({ size, invalid, className: cn("h-auto py-2 resize-y", className) })} />;
});

export type TextAreaProps = Omit<TextAreaInputProps, "name" | "id" | "required"> & FieldProps & { showCount?: boolean; inputClassName?: string };

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { name, label, required, help, error, id, className, inputClassName, showCount = false, onChange, defaultValue, value, maxLength, ...inputProps },
  ref,
) {
  const [length, setLength] = React.useState(() => String(value ?? defaultValue ?? "").length);
  const counter = showCount && maxLength ? `${length} / ${maxLength} characters` : undefined;
  return (
    <FormField
      name={name}
      label={label}
      required={required}
      help={
        help || counter ? (
          <span className="flex items-start justify-between gap-4">
            <span>{help}</span>
            {counter && <span className="shrink-0 tabular-nums">{counter}</span>}
          </span>
        ) : undefined
      }
      error={error}
      id={id}
      className={className}
    >
      <TextAreaInput
        ref={ref}
        className={inputClassName}
        value={value}
        defaultValue={defaultValue}
        maxLength={maxLength}
        onChange={(event) => {
          setLength(event.target.value.length);
          onChange?.(event);
        }}
        {...inputProps}
      />
    </FormField>
  );
});
