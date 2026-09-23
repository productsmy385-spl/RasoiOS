"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import { cn } from "@/lib/ui/cn";
import { Icon } from "./icon";
import { IconButton } from "./icon-button";

/**
 * SortableList (S1-P08-T006): reorder by pointer drag on the handle, by Arrow Up/Down while the handle has focus, or
 * with the Move up / Move down buttons. Every move is announced in a live region ("Starters moved to position 2 of
 * 5"). Controlled: the parent keeps the order and persists it (e.g. a sort-order Server Action).
 */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const next = items.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

type Control = "handle" | "up" | "down";

export type SortableListProps<T> = {
  items: readonly T[];
  getKey: (item: T) => string;
  /** Plain-text name used in labels and announcements. */
  getLabel: (item: T) => string;
  renderItem: (item: T, index: number) => React.ReactNode;
  onReorder: (items: T[], move: { from: number; to: number }) => void;
  /** Accessible name of the list, e.g. "Menu categories". */
  label: string;
  disabled?: boolean;
  className?: string;
};

export function SortableList<T>({ items, getKey, getLabel, renderItem, onReorder, label, disabled = false, className }: SortableListProps<T>) {
  const instructionsId = React.useId();
  const [announcement, setAnnouncement] = React.useState("");
  const [dragKey, setDragKey] = React.useState<string | null>(null);
  const listRef = React.useRef<HTMLUListElement>(null);
  const rows = React.useRef(new Map<string, HTMLLIElement>());
  const focusAfterMove = React.useRef<{ key: string; control: Control } | null>(null);

  // Keep keyboard focus with the moved item after the parent re-renders the new order: on the same control, or on
  // its handle when that control is now disabled (e.g. "Move up" at the top).
  React.useEffect(() => {
    const target = focusAfterMove.current;
    const list = listRef.current;
    if (!target || !list) return;
    focusAfterMove.current = null;
    const row = rows.current.get(target.key);
    const control = row?.querySelector<HTMLButtonElement>(`[data-sort-control="${target.control}"]`);
    (control && !control.disabled ? control : row?.querySelector<HTMLButtonElement>('[data-sort-control="handle"]'))?.focus();
  }, [items]);

  function move(from: number, to: number, control: Control) {
    if (disabled || to < 0 || to >= items.length || from === to) return;
    const item = items[from];
    focusAfterMove.current = { key: getKey(item), control };
    onReorder(moveItem(items, from, to), { from, to });
    setAnnouncement(`${getLabel(item)} moved to position ${to + 1} of ${items.length}.`);
  }

  function onHandleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      move(index, index - 1, "handle");
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      move(index, index + 1, "handle");
    }
  }

  function onPointerDown(event: React.PointerEvent<HTMLButtonElement>, key: string) {
    if (disabled || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragKey(key);
  }

  function onPointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    if (!dragKey) return;
    const from = items.findIndex((item) => getKey(item) === dragKey);
    if (from < 0) return;
    // The target is the first row whose vertical midpoint is below the pointer.
    let to = items.length - 1;
    for (let i = 0; i < items.length; i++) {
      const rect = rows.current.get(getKey(items[i]))?.getBoundingClientRect();
      if (rect && event.clientY < rect.top + rect.height / 2) {
        to = i > from ? i - 1 : i;
        break;
      }
    }
    if (to !== from) onReorder(moveItem(items, from, to), { from, to });
  }

  function onPointerUp() {
    if (!dragKey) return;
    const index = items.findIndex((item) => getKey(item) === dragKey);
    const item = items[index];
    setDragKey(null);
    if (item) setAnnouncement(`${getLabel(item)} dropped at position ${index + 1} of ${items.length}.`);
  }

  return (
    <div className={className}>
      <p id={instructionsId} className="sr-only">
        To reorder, focus an item&apos;s handle and press Arrow Up or Arrow Down, or use the move buttons.
      </p>
      <ul ref={listRef} aria-label={label} className="flex flex-col gap-2">
        {items.map((item, index) => {
          const key = getKey(item);
          const name = getLabel(item);
          return (
            <li
              key={key}
              ref={(node) => {
                if (node) rows.current.set(key, node);
                else rows.current.delete(key);
              }}
              className={cn(
                "flex items-center gap-3 rounded-xl border bg-card px-2 py-2 transition-colors duration-fast ease-standard",
                dragKey === key ? "border-action-primary bg-raised shadow-e2" : "border-border-subtle",
              )}
            >
              <button
                type="button"
                data-sort-control="handle"
                aria-label={`Reorder ${name}, position ${index + 1} of ${items.length}`}
                aria-describedby={instructionsId}
                disabled={disabled}
                onKeyDown={(event) => onHandleKeyDown(event, index)}
                onPointerDown={(event) => onPointerDown(event, key)}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                className="inline-flex h-11 w-11 sm:h-10 sm:w-10 shrink-0 cursor-grab touch-none items-center justify-center rounded-xl text-fg-secondary hover:bg-raised hover:text-fg-primary active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Icon icon={GripVertical} size={18} />
              </button>
              <div className="min-w-0 flex-1">{renderItem(item, index)}</div>
              <div className="flex shrink-0 gap-1">
                <IconButton icon={ArrowUp} size="sm" aria-label={`Move ${name} up`} data-sort-control="up" className="h-11 w-11 sm:h-8 sm:w-8" disabled={disabled || index === 0} onClick={() => move(index, index - 1, "up")} />
                <IconButton icon={ArrowDown} size="sm" aria-label={`Move ${name} down`} data-sort-control="down" className="h-11 w-11 sm:h-8 sm:w-8" disabled={disabled || index === items.length - 1} onClick={() => move(index, index + 1, "down")} />
              </div>
            </li>
          );
        })}
      </ul>
      <div aria-live="assertive" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}
