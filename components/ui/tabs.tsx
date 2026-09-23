"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/ui/cn";
import { Icon } from "./icon";

/**
 * Tabs (S1-P08-T006): WAI-ARIA tabs with a roving tabindex. Arrow Left/Right move between tabs (wrapping), Home/End
 * jump to the ends, and the focused tab is activated immediately. Only the active tab is in the Tab order; its panel
 * follows. Controlled (`value` + `onValueChange`) or uncontrolled (`defaultValue`).
 */
export type TabItem = { id: string; label: string; icon?: LucideIcon; content: React.ReactNode; disabled?: boolean };

export type TabsProps = {
  items: readonly TabItem[];
  /** Accessible name for the tab list, e.g. "Settings sections". */
  label: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (id: string) => void;
  className?: string;
};

export function Tabs({ items, label, value, defaultValue, onValueChange, className }: TabsProps) {
  const baseId = React.useId();
  const [internal, setInternal] = React.useState(defaultValue ?? items.find((item) => !item.disabled)?.id);
  const active = value ?? internal;
  const tabRefs = React.useRef(new Map<string, HTMLButtonElement>());
  const enabled = items.filter((item) => !item.disabled);

  function select(id: string, focus: boolean) {
    if (value === undefined) setInternal(id);
    onValueChange?.(id);
    if (focus) tabRefs.current.get(id)?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const index = enabled.findIndex((item) => item.id === active);
    let next: number | null = null;
    if (event.key === "ArrowRight") next = (index + 1) % enabled.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + enabled.length) % enabled.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = enabled.length - 1;
    if (next === null || enabled.length === 0) return;
    event.preventDefault();
    select(enabled[next].id, true);
  }

  const tabId = (id: string) => `${baseId}-tab-${id}`;
  const panelId = (id: string) => `${baseId}-panel-${id}`;

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <div role="tablist" aria-label={label} onKeyDown={onKeyDown} className="flex gap-1 overflow-x-auto border-b border-border-subtle">
        {items.map((item) => {
          const selected = item.id === active;
          return (
            <button
              key={item.id}
              ref={(node) => {
                if (node) tabRefs.current.set(item.id, node);
                else tabRefs.current.delete(item.id);
              }}
              type="button"
              role="tab"
              id={tabId(item.id)}
              aria-selected={selected}
              aria-controls={panelId(item.id)}
              tabIndex={selected ? 0 : -1}
              disabled={item.disabled}
              onClick={() => select(item.id, false)}
              className={cn(
                "-mb-px inline-flex h-10 shrink-0 items-center gap-2 border-b-2 px-4 text-label transition-colors duration-fast ease-standard",
                "disabled:cursor-not-allowed disabled:opacity-40",
                selected ? "border-action-primary text-fg-primary" : "border-transparent text-fg-secondary hover:text-fg-primary",
              )}
            >
              {item.icon && <Icon icon={item.icon} size={18} />}
              {item.label}
            </button>
          );
        })}
      </div>
      {items.map((item) => (
        <div key={item.id} role="tabpanel" id={panelId(item.id)} aria-labelledby={tabId(item.id)} tabIndex={0} hidden={item.id !== active} className="focus-visible:rounded-xl">
          {item.content}
        </div>
      ))}
    </div>
  );
}
