"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/ui/cn";
import { Icon } from "../icon";
import { FormField, type FieldProps } from "../form/form-field";
import { TextInput, type TextInputProps } from "./text-field";

/** Search input with a leading `Search` icon and a visible label (S1-P08-T005). Used in filter bars and lookups. */
export type SearchFieldProps = Omit<TextInputProps, "name" | "id" | "required" | "type"> & FieldProps & { inputClassName?: string };

export const SearchField = React.forwardRef<HTMLInputElement, SearchFieldProps>(function SearchField(
  { name, label, required, help, error, id, className, inputClassName, ...inputProps },
  ref,
) {
  return (
    <FormField name={name} label={label} required={required} help={help} error={error} id={id} className={className}>
      <div className="relative w-full">
        <Icon icon={Search} size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-secondary" />
        <TextInput ref={ref} type="search" autoComplete="off" className={cn("pl-10", inputClassName)} {...inputProps} />
      </div>
    </FormField>
  );
});
