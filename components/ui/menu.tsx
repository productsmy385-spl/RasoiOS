"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Check, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/ui/cn";
import { Icon } from "./icon";

/**
 * Menu button (S1-P08-T007 row actions, S1-P08-T008 user menu): WAI-ARIA menu pattern. The trigger opens the menu
 * with Enter/Space/Arrow Down (focus first item) or Arrow Up (focus last); Arrow keys, Home and End move between
 * items; Esc closes and returns focus to the trigger; Tab or a click outside closes it. The popup is fixed-positioned
 * in a portal so table containers with `overflow` never clip it (inside an open <dialog> it stays in the dialog).
 */
export type MenuItem = {
  label: string;
  icon?: LucideIcon;
  onSelect?: () => void;
  href?: string;
  tone?: "default" | "danger";
  disabled?: boolean;
  /** Set for a choice among options (e.g. Light / Dark / System): rendered as `menuitemradio` with a check mark. */
  checked?: boolean;
};

export type MenuTriggerProps = {
  ref: React.Ref<HTMLButtonElement>;
  id: string;
  type: "button";
  "aria-haspopup": "menu";
  "aria-expanded": boolean;
  "aria-controls": string | undefined;
  onClick: () => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
};

export type MenuProps = {
  items: readonly MenuItem[];
  /** Renders the trigger; spread the given props onto a <button> (or IconButton). */
  trigger: (props: MenuTriggerProps) => React.ReactNode;
  /** Optional non-interactive content above the items (e.g. the signed-in user's name and email). */
  header?: React.ReactNode;
  align?: "start" | "end";
};

type Position = { top?: number; bottom?: number; left?: number; right?: number };

function enabledItems(menu: HTMLElement | null): HTMLElement[] {
  return Array.from(menu?.querySelectorAll<HTMLElement>('[role^="menuitem"]:not([aria-disabled="true"])') ?? []);
}

export function Menu({ items, trigger, header, align = "end" }: MenuProps) {
  const baseId = React.useId();
  const triggerId = `${baseId}-trigger`;
  const menuId = `${baseId}-menu`;
  const [open, setOpen] = React.useState(false);
  const [position, setPosition] = React.useState<Position>({});
  const [container, setContainer] = React.useState<HTMLElement | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const focusOnOpen = React.useRef<"first" | "last">("first");

  const close = React.useCallback((returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  function openMenu(focus: "first" | "last") {
    focusOnOpen.current = focus;
    setContainer(triggerRef.current?.closest("dialog") ?? document.body);
    setOpen(true);
  }

  // Position next to the trigger (below, or above when there is no room), then focus the first/last item.
  React.useLayoutEffect(() => {
    if (!open || !triggerRef.current || !menuRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const height = menuRef.current.offsetHeight;
    const below = rect.bottom + 4 + height <= window.innerHeight || rect.top < height;
    const horizontal = align === "end" ? { right: Math.max(8, window.innerWidth - rect.right) } : { left: Math.max(8, rect.left) };
    setPosition(below ? { top: rect.bottom + 4, ...horizontal } : { bottom: window.innerHeight - rect.top + 4, ...horizontal });
    const list = enabledItems(menuRef.current);
    (focusOnOpen.current === "first" ? list[0] : list[list.length - 1])?.focus();
  }, [open, align]);

  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !triggerRef.current?.contains(target)) close(false);
    };
    const onViewportChange = (event: Event) => {
      if (event.type === "scroll" && menuRef.current?.contains(event.target as Node)) return;
      close(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [open, close]);

  function onTriggerKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      openMenu(event.key === "ArrowDown" ? "first" : "last");
    }
  }

  function onMenuKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const list = enabledItems(menuRef.current);
    const index = list.indexOf(document.activeElement as HTMLElement);
    let next: HTMLElement | undefined;
    if (event.key === "ArrowDown") next = list[(index + 1) % list.length];
    else if (event.key === "ArrowUp") next = list[(index - 1 + list.length) % list.length];
    else if (event.key === "Home") next = list[0];
    else if (event.key === "End") next = list[list.length - 1];
    else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation(); // do not also close a surrounding dialog
      close(true);
      return;
    } else if (event.key === "Tab") {
      close(false);
      return;
    }
    if (next) {
      event.preventDefault();
      next.focus();
    }
  }

  const itemClass = (item: MenuItem) =>
    cn(
      "flex w-full items-center gap-2 rounded-xl px-3 h-10 text-left text-body transition-colors duration-fast ease-standard",
      "hover:bg-raised focus-visible:bg-raised",
      item.tone === "danger" ? "text-status-danger" : "text-fg-primary",
      item.disabled && "cursor-not-allowed opacity-40",
    );

  const menu =
    open && container
      ? createPortal(
          <div
            ref={menuRef}
            onKeyDown={onMenuKeyDown}
            style={{ position: "fixed", ...position }}
            className="glass-2 z-50 flex min-w-48 max-w-xs flex-col gap-1 rounded-2xl p-1 text-fg-primary"
          >
            {header && <div className="border-b border-border-subtle px-3 pt-2 pb-3">{header}</div>}
            <div id={menuId} role="menu" aria-labelledby={triggerId} className="flex flex-col gap-1">
            {items.map((item) =>
              item.href && !item.disabled ? (
                <Link key={item.label} href={item.href} role="menuitem" tabIndex={-1} className={itemClass(item)} onClick={() => close(false)}>
                  {item.icon && <Icon icon={item.icon} size={18} />}
                  {item.label}
                </Link>
              ) : (
                <button
                  key={item.label}
                  type="button"
                  role={item.checked === undefined ? "menuitem" : "menuitemradio"}
                  aria-checked={item.checked}
                  tabIndex={-1}
                  aria-disabled={item.disabled || undefined}
                  className={itemClass(item)}
                  onClick={() => {
                    if (item.disabled) return;
                    close(true);
                    item.onSelect?.();
                  }}
                >
                  {item.icon && <Icon icon={item.icon} size={18} />}
                  {item.label}
                  {item.checked && <Icon icon={Check} size={16} className="ml-auto text-fg-accent" />}
                </button>
              ),
            )}
            </div>
          </div>,
          container,
        )
      : null;

  return (
    <>
      {trigger({
        ref: triggerRef,
        id: triggerId,
        type: "button",
        "aria-haspopup": "menu",
        "aria-expanded": open,
        "aria-controls": open ? menuId : undefined,
        onClick: () => (open ? close(false) : openMenu("first")),
        onKeyDown: onTriggerKeyDown,
      })}
      {menu}
    </>
  );
}
