"use client";

import * as React from "react";
import { FormField, type FieldProps } from "../form/form-field";
import { controlClasses, useControlWiring, type ControlSize } from "./control";

/**
 * Text input control and the labelled TextField (S1-P08-T005). Use <TextField> in forms; <TextInput> is the bare
 * control for custom layouts inside a <FormField>. `label` is required: a placeholder is only ever an example.
 */
export type TextInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> & { size?: ControlSize };

export const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(function TextInput({ size = "md", className, type = "text", ...props }, ref) {
  const { invalid, ...wiring } = useControlWiring(props);
  return <input ref={ref} type={type} {...props} {...wiring} className={controlClasses({ size, invalid, className })} />;
});

export type TextFieldProps = Omit<TextInputProps, "name" | "id" | "required"> & FieldProps & { inputClassName?: string };

export const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { name, label, required, help, error, id, className, inputClassName, ...inputProps },
  ref,
) {
  return (
    <FormField name={name} label={label} required={required} help={help} error={error} id={id} className={className}>
      <TextInput ref={ref} className={inputClassName} {...inputProps} />
    </FormField>
  );
});

/** Native date picker; the value is a plain `YYYY-MM-DD` business date with no time-zone conversion (ADR-010). */
export const DateField = React.forwardRef<HTMLInputElement, Omit<TextFieldProps, "type">>(function DateField(props, ref) {
  return <TextField ref={ref} type="date" {...props} />;
});

/** Native time picker; the value is `HH:MM` wall-clock time in the restaurant's time zone. */
export const TimeField = React.forwardRef<HTMLInputElement, Omit<TextFieldProps, "type">>(function TimeField(props, ref) {
  return <TextField ref={ref} type="time" {...props} />;
});
