"use client";

import * as React from "react";
import Link from "next/link";
import { Ellipsis } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { Menu, type MenuItem } from "@/components/ui/menu";
import { cn } from "@/lib/ui/cn";
import {
  activeNavItem,
  fitCount,
  headerNavItems,
  isNavItemActive,
  NAV_ICONS,
  NAV_MORE_FALLBACK_WIDTH,
  splitNavOverflow,
  type NavItem,
} from "@/lib/ui/navigation";

/**
 * Header navigation (ADR-013 §3, frontend.md §3.1). There is no desktop sidebar: the capability-filtered items sit in
 * the sticky glass header from 768 px up, in `headerNavItems` order, and whatever does not fit collapses into a
 * **More** menu — measured at runtime against the real available width, never a horizontal scrollbar and never a
 * hard-coded breakpoint guess.
 *
 * Measuring: an `aria-hidden` ruler renders every item as a plain span with the same classes, so natural widths stay
 * available while the visible row is trimmed; a `ResizeObserver` re-measures on any layout change. The active item
 * carries a tinted glass pill, the brand-gradient underline and `aria-current="page"` — three signals, not colour
 * alone — and when it sits inside **More**, the More trigger carries the same pill and names the page for readers.
 */

/** Layout shared by the ruler and the real row (design.md §4.1: the nav icon-to-label gap is 12). */
const ITEM_CLASS = "relative inline-flex h-11 shrink-0 items-center gap-3 whitespace-nowrap rounded-xl px-3 text-nav";

const useIsomorphicLayoutEffect = typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;

function itemClasses(active: boolean): string {
  return cn(
    ITEM_CLASS,
    "transition-colors duration-fast ease-standard",
    active ? "brand-underline bg-action-primary/12 text-fg-primary" : "text-fg-secondary hover:bg-raised hover:text-fg-primary",
  );
}

export function HeaderNav({ items, pathname, label = "Main" }: { items: readonly NavItem[]; pathname: string; label?: string }) {
  const ordered = React.useMemo(() => headerNavItems(items), [items]);
  const [visibleCount, setVisibleCount] = React.useState(ordered.length);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const rulerRef = React.useRef<HTMLDivElement>(null);
  const moreRef = React.useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    const container = containerRef.current;
    const ruler = rulerRef.current;
    if (!container || !ruler || typeof ResizeObserver === "undefined") return;

    const measure = () => {
      const available = container.getBoundingClientRect().width;
      if (available === 0) return;
      const widths = Array.from(ruler.children, (child) => child.getBoundingClientRect().width);
      setVisibleCount(fitCount(widths, available, moreRef.current?.getBoundingClientRect().width ?? NAV_MORE_FALLBACK_WIDTH));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    observer.observe(ruler);
    return () => observer.disconnect();
  }, [ordered]);

  const { visible, overflow } = splitNavOverflow(ordered, visibleCount);
  const active = activeNavItem(ordered, pathname);
  const activeInOverflow = Boolean(active && overflow.some((item) => item.key === active.key));
  const overflowItems: MenuItem[] = overflow.map((item) => ({ label: item.label, icon: NAV_ICONS[item.key], href: item.href }));

  return (
    <div ref={containerRef} className="relative hidden min-w-0 flex-1 overflow-hidden md:block">
      {/* Ruler: the natural width of every item. Never announced, never focusable, never painted. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden opacity-0">
        <div ref={rulerRef} className="flex w-max items-center gap-1">
          {ordered.map((item) => (
            <span key={item.key} className={ITEM_CLASS}>
              <Icon icon={NAV_ICONS[item.key]} size={20} />
              {item.label}
            </span>
          ))}
        </div>
      </div>

      <nav aria-label={label}>
        <ul className="flex items-center gap-1">
          {visible.map((item) => {
            const isActive = isNavItemActive(item, pathname) && item.key === active?.key;
            return (
              <li key={item.key}>
                <Link href={item.href} aria-current={isActive ? "page" : undefined} className={itemClasses(isActive)}>
                  <Icon icon={NAV_ICONS[item.key]} size={20} className={isActive ? "text-fg-accent" : undefined} />
                  {item.label}
                </Link>
              </li>
            );
          })}
          {overflow.length > 0 && (
            <li>
              <div ref={moreRef} className="inline-flex">
                <Menu
                  align="start"
                  items={overflowItems}
                  trigger={(props) => (
                    <button {...props} className={itemClasses(activeInOverflow)}>
                      <Icon icon={Ellipsis} size={20} className={activeInOverflow ? "text-fg-accent" : undefined} />
                      More
                      {activeInOverflow && active && <span className="sr-only">, current page {active.label}</span>}
                    </button>
                  )}
                />
              </div>
            </li>
          )}
        </ul>
      </nav>
    </div>
  );
}
