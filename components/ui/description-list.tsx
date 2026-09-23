import * as React from "react";
import { cn } from "@/lib/ui/cn";

/**
 * Description list (frontend.md §5.2): label/value pairs for a record's details. One column on a phone, two from
 * 640 px, so the label always sits directly above or beside its own value and never drifts into another row.
 */
export type DescriptionItem = { term: string; value: React.ReactNode };

export function DescriptionList({ items, className }: { items: readonly DescriptionItem[]; className?: string }) {
  return (
    <dl className={cn("grid gap-x-6 gap-y-4 sm:grid-cols-2", className)}>
      {items.map((item) => (
        <div key={item.term} className="flex min-w-0 flex-col gap-1">
          <dt className="text-caption text-fg-secondary">{item.term}</dt>
          <dd className="min-w-0 break-words text-body text-fg-primary">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
