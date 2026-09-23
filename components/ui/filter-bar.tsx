"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { cn } from "@/lib/ui/cn";
import { Button } from "./button";
import { SearchField } from "./inputs/search-field";
import { SelectInput } from "./inputs/select";
import { DateField } from "./inputs/text-field";
import { FormField } from "./form/form-field";

/**
 * FilterBar (S1-P08-T006, frontend.md §5.3): list filters that live in the URL search params, so a filtered view can be
 * bookmarked, shared and reloaded, and the server page reads the same params. Selects and dates apply on change;
 * search applies on Enter or "Apply". Changing any filter drops the pagination cursor. Without JavaScript the bar is
 * a plain GET form and still works.
 */
export type FilterDefinition =
  | { type: "search"; name: string; label: string; placeholder?: string }
  | { type: "select"; name: string; label: string; options: ReadonlyArray<{ value: string; label: string }>; allLabel?: string }
  | { type: "date"; name: string; label: string };

export type FilterBarProps = {
  filters: readonly FilterDefinition[];
  /** Params removed whenever a filter changes (the cursor of the page being viewed). */
  resetParams?: readonly string[];
  className?: string;
};

/** The query string after applying `values` to `current` (empty values remove the param; reset params are dropped). */
export function applyFilters(current: URLSearchParams, values: Record<string, string>, resetParams: readonly string[] = ["cursor"]): string {
  const next = new URLSearchParams(current);
  for (const [name, value] of Object.entries(values)) {
    if (value.trim() === "") next.delete(name);
    else next.set(name, value.trim());
  }
  for (const name of resetParams) next.delete(name);
  const query = next.toString();
  return query ? `?${query}` : "";
}

export function FilterBar({ filters, resetParams = ["cursor"], className }: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const formRef = React.useRef<HTMLFormElement>(null);
  const [pending, startTransition] = React.useTransition();

  const active = filters.filter((filter) => (searchParams.get(filter.name) ?? "") !== "").length;

  function navigate(values: Record<string, string>) {
    const query = applyFilters(new URLSearchParams(searchParams.toString()), values, resetParams);
    startTransition(() => router.replace(`${pathname}${query}`, { scroll: false }));
  }

  function valuesFromForm(): Record<string, string> {
    const data = new FormData(formRef.current!);
    return Object.fromEntries(filters.map((filter) => [filter.name, String(data.get(filter.name) ?? "")]));
  }

  const hasSearch = filters.some((filter) => filter.type === "search");

  return (
    <form
      ref={formRef}
      method="get"
      action={pathname}
      role="search"
      aria-busy={pending || undefined}
      onSubmit={(event) => {
        event.preventDefault();
        navigate(valuesFromForm());
      }}
      className={cn("flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end", className)}
    >
      {filters.map((filter) => {
        const current = searchParams.get(filter.name) ?? "";
        if (filter.type === "search") {
          return <SearchField key={`${filter.name}:${current}`} name={filter.name} label={filter.label} placeholder={filter.placeholder} defaultValue={current} className="sm:w-72" />;
        }
        if (filter.type === "select") {
          return (
            <FormField key={`${filter.name}:${current}`} name={filter.name} label={filter.label} className="sm:w-48">
              <SelectInput
                defaultValue={current}
                onChange={(event) => navigate({ ...valuesFromForm(), [filter.name]: event.target.value })}
                emptyOption={filter.allLabel ?? "All"}
                options={filter.options}
              />
            </FormField>
          );
        }
        return (
          <DateField
            key={`${filter.name}:${current}`}
            name={filter.name}
            label={filter.label}
            defaultValue={current}
            onChange={(event) => navigate({ ...valuesFromForm(), [filter.name]: event.target.value })}
            className="sm:w-44"
          />
        );
      })}
      <div className="flex items-center gap-2">
        {hasSearch && (
          <Button type="submit" variant="secondary" loading={pending} loadingLabel="Applying…">
            Apply
          </Button>
        )}
        {active > 0 && (
          <Button
            type="button"
            variant="ghost"
            icon={X}
            onClick={() => navigate(Object.fromEntries(filters.map((filter) => [filter.name, ""])))}
          >
            Clear filters
          </Button>
        )}
      </div>
    </form>
  );
}
