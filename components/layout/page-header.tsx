import * as React from "react";
import { cn } from "@/lib/ui/cn";

/**
 * Page title row (S1-P08-T008, design.md §3 Display M, §4.2): the page's single h1, an optional one-line description and
 * the page actions (primary action last). Aligned to the shell's content grid; the header above shows the breadcrumb.
 */
export function PageHeader({ title, description, actions, className }: { title: string; description?: React.ReactNode; actions?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-4 pb-6 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        <h1 className="text-display-m text-fg-primary">{title}</h1>
        {description && <p className="mt-1 text-body text-fg-secondary">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
