"use client";

import * as React from "react";
import { TriangleAlert } from "lucide-react";
import { cn } from "@/lib/ui/cn";
import { Icon } from "../icon";

/**
 * Error summary (S1-P08-T005, design.md §8 Forms): shown at the top of a form after a failed submit. <Form> moves
 * focus here (tabIndex -1) so keyboard and screen-reader users hear what went wrong; each field error links to its
 * control. Server messages are shown as sent — they never contain internals (api.md §1.2).
 */
export type SummaryItem = { fieldId?: string; label?: string; message: string };

export type ErrorSummaryProps = {
  title: string;
  items?: SummaryItem[];
  requestId?: string;
  className?: string;
};

export const ErrorSummary = React.forwardRef<HTMLDivElement, ErrorSummaryProps>(function ErrorSummary({ title, items = [], requestId, className }, ref) {
  const headingId = React.useId();
  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="alert"
      aria-labelledby={headingId}
      data-error-summary=""
      className={cn("flex items-start gap-3 rounded-xl border border-status-danger/40 bg-status-danger/10 px-4 py-3 text-fg-primary", className)}
    >
      <Icon icon={TriangleAlert} size={18} className="mt-0.5 text-status-danger" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p id={headingId} className="text-label">
          {title}
        </p>
        {items.length > 0 && (
          <ul className="flex flex-col gap-1 text-body">
            {items.map((item, index) => (
              <li key={`${item.fieldId ?? "form"}-${index}`}>
                {item.fieldId ? (
                  <a
                    href={`#${item.fieldId}`}
                    onClick={(event) => {
                      const target = document.getElementById(item.fieldId!);
                      if (!target) return;
                      event.preventDefault();
                      target.focus();
                      target.scrollIntoView({ block: "center" });
                    }}
                    className="text-status-danger underline underline-offset-2 hover:no-underline"
                  >
                    {item.label ? `${item.label}: ${item.message}` : item.message}
                  </a>
                ) : (
                  <span className="text-fg-secondary">{item.label ? `${item.label}: ${item.message}` : item.message}</span>
                )}
              </li>
            ))}
          </ul>
        )}
        {requestId && <p className="text-caption text-fg-secondary">Reference: {requestId}</p>}
      </div>
    </div>
  );
});
