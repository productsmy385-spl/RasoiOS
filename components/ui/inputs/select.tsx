"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/ui/cn";
import { Icon } from "../icon";
import { FormField, type FieldProps } from "../form/form-field";
import { controlClasses, useControlWiring, type ControlSize } from "./control";

/**
 * Native select (S1-P08-T005): keeps platform keyboard and screen-reader behaviour, styled to the control tokens with
 * a chevron. Pass `options`, or <option> children for grouped lists.
 */
export type SelectOption = { value: string; label: string; disabled?: boolean };

export type SelectInputProps = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size"> & {
  size?: ControlSize;
  options?: readonly SelectOption[];
  /** First, empty option such as "Choose a role" — an instruction inside the list, not the field label. */
  emptyOption?: string;
};

export const SelectInput = React.forwardRef<HTMLSelectElement, SelectInputProps>(function SelectInput(
  { size = "md", className, options, emptyOption, children, ...props },
  ref,
) {
  const { invalid, ...wiring } = useControlWiring(props);
  return (
    <div className="relative w-full">
      <select ref={ref} {...props} {...wiring} className={controlClasses({ size, invalid, className: cn("appearance-none cursor-pointer pr-10", className) })}>
        {emptyOption !== undefined && <option value="">{emptyOption}</option>}
        {options?.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
        {children}
      </select>
      <Icon icon={ChevronDown} size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-fg-secondary" />
    </div>
  );
});

export type SelectProps = Omit<SelectInputProps, "name" | "id" | "required"> & FieldProps & { inputClassName?: string };

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { name, label, required, help, error, id, className, inputClassName, ...selectProps },
  ref,
) {
  return (
    <FormField name={name} label={label} required={required} help={help} error={error} id={id} className={className}>
      <SelectInput ref={ref} className={inputClassName} {...selectProps} />
    </FormField>
  );
});
