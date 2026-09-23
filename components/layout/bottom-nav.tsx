"use client";

import * as React from "react";
import Link from "next/link";
import { Ellipsis } from "lucide-react";
import { Drawer } from "@/components/ui/drawer";
import { Icon } from "@/components/ui/icon";
import { IconTile } from "@/components/ui/icon-tile";
import { cn } from "@/lib/ui/cn";
import { groupNavItems, isNavItemActive, NAV_HUES, NAV_ICONS, type NavItem } from "@/lib/ui/navigation";

/**
 * Glass bottom bar below 768 px (ADR-013 §3, frontend.md §3.1). The header keeps brand, notifications and profile;
 * primary navigation moves down here: the role's four most relevant destinations, a raised centre action for the
 * role's main live action, and a **More** sheet holding everything else the role may reach. There is no off-canvas
 * sidebar drawer anywhere in the product.
 *
 * Every target is 44 px or larger, the bar clears the home indicator with `env(safe-area-inset-bottom)`, and the
 * active destination is marked with a tinted tile plus `aria-current="page"`, never colour alone.
 */
function BottomLink({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate?: () => void }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={cn(
        "flex h-16 min-w-11 flex-1 flex-col items-center justify-center gap-1 px-1 text-caption transition-colors duration-fast ease-standard",
        active ? "text-fg-primary" : "text-fg-secondary hover:text-fg-primary",
      )}
    >
      <span className={cn("inline-flex h-7 w-11 items-center justify-center rounded-full", active && "bg-action-primary/12")}>
        <Icon icon={NAV_ICONS[item.key]} size={20} className={active ? "text-fg-accent" : undefined} />
      </span>
      <span className="max-w-full truncate">{item.label}</span>
    </Link>
  );
}

export function BottomNav({
  items,
  action,
  moreItems,
  pathname,
}: {
  items: readonly NavItem[];
  action: NavItem | null;
  moreItems: readonly NavItem[];
  pathname: string;
}) {
  const [moreOpen, setMoreOpen] = React.useState(false);
  React.useEffect(() => setMoreOpen(false), [pathname]);

  if (items.length === 0 && !action) return null;
  const left = items.slice(0, 2);
  const right = items.slice(2, 4);

  return (
    <>
      <nav
        aria-label="Primary"
        className="glass-1 fixed inset-x-0 bottom-0 z-header border-t md:hidden print:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-stretch">
          {left.map((item) => (
            <BottomLink key={item.key} item={item} active={isNavItemActive(item, pathname)} />
          ))}

          {action && (
            <div className="flex flex-1 items-center justify-center px-1">
              <Link
                href={action.href}
                aria-current={isNavItemActive(action, pathname) ? "page" : undefined}
                className="brand-gradient -mt-5 inline-flex h-14 w-14 flex-col items-center justify-center gap-0.5 rounded-full text-action-primary-fg shadow-e2"
              >
                <Icon icon={NAV_ICONS[action.key]} size={24} />
                <span className="sr-only">{action.label}</span>
              </Link>
            </div>
          )}

          {right.map((item) => (
            <BottomLink key={item.key} item={item} active={isNavItemActive(item, pathname)} />
          ))}

          {moreItems.length > 0 && (
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-expanded={moreOpen}
              aria-haspopup="dialog"
              className="flex h-16 min-w-11 flex-1 flex-col items-center justify-center gap-1 px-1 text-caption text-fg-secondary transition-colors duration-fast ease-standard hover:text-fg-primary"
            >
              <span className="inline-flex h-7 w-11 items-center justify-center rounded-full">
                <Icon icon={Ellipsis} size={20} />
              </span>
              More
            </button>
          )}
        </div>
      </nav>

      <Drawer open={moreOpen} onClose={() => setMoreOpen(false)} title="More" side="bottom">
        <div className="flex flex-col gap-5 pb-2">
          {groupNavItems(moreItems).map(({ group, items: groupItems }) => (
            <div key={group} className="flex flex-col gap-1">
              <p className="px-1 pb-1 text-caption text-fg-secondary">{group}</p>
              <ul className="grid grid-cols-2 gap-2">
                {groupItems.map((item) => (
                  <li key={item.key}>
                    <Link
                      href={item.href}
                      aria-current={isNavItemActive(item, pathname) ? "page" : undefined}
                      onClick={() => setMoreOpen(false)}
                      className={cn(
                        "flex min-h-14 items-center gap-3 rounded-xl border border-border-subtle px-3 py-2 text-label transition-colors duration-fast ease-standard",
                        isNavItemActive(item, pathname) ? "bg-action-primary/12 text-fg-primary" : "text-fg-primary hover:bg-raised",
                      )}
                    >
                      <IconTile icon={NAV_ICONS[item.key]} size="sm" tone={NAV_HUES[item.key]} />
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Drawer>
    </>
  );
}
