import Link from "next/link";
import { CalendarDays, LayoutList, UtensilsCrossed } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/ui/cn";

/**
 * Sub-navigation for the menu area (frontend.md §2): items, categories and the daily menu are separate routes, so the
 * three pages carry one link row instead of client-side tabs. The current page is marked with `aria-current` and a
 * tinted pill, never colour alone. Links are filtered by capability by the caller.
 */
export type MenuSection = "items" | "categories" | "daily";

const SECTIONS: Array<{ id: MenuSection; href: string; label: string; icon: typeof LayoutList }> = [
  { id: "items", href: "/restaurant/menu/items", label: "Items", icon: UtensilsCrossed },
  { id: "categories", href: "/restaurant/menu/categories", label: "Categories", icon: LayoutList },
  { id: "daily", href: "/restaurant/daily-menu", label: "Daily menu", icon: CalendarDays },
];

export function MenuSectionNav({ current, showDailyMenu = true }: { current: MenuSection; showDailyMenu?: boolean }) {
  const sections = SECTIONS.filter((section) => section.id !== "daily" || showDailyMenu);
  return (
    <nav aria-label="Menu sections" className="mb-6 flex flex-wrap gap-1 border-b border-border-subtle pb-3">
      {sections.map((section) => {
        const active = section.id === current;
        return (
          <Link
            key={section.id}
            href={section.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-xl px-3 text-label transition-colors duration-fast ease-standard",
              active ? "bg-action-primary/12 text-fg-primary" : "text-fg-secondary hover:bg-raised hover:text-fg-primary",
            )}
          >
            <Icon icon={section.icon} size={18} />
            {section.label}
          </Link>
        );
      })}
    </nav>
  );
}
