"use client";

import * as React from "react";
import {
  ChevronRight,
  Clock,
  ConciergeBell,
  Flame,
  Images,
  Info,
  LogIn,
  MapPin,
  Menu,
  Phone,
  Sparkles,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { Drawer } from "@/components/ui/drawer";
import { IconButton } from "@/components/ui/icon-button";
import type { SiteNavLink } from "./site-view";

/**
 * The full navigation of a restaurant website: a ☰ button that opens a side drawer with every section, whether it is
 * open, and the staff door. It is always present — on a phone it is the only navigation in the header; from `xl` the
 * header also shows the most-used sections inline. The drawer's landmark has its own label ("… — all sections"), so a
 * screen reader never meets two navigation landmarks with the same name.
 *
 * Built on the shared <Drawer> (native <dialog>): focus moves in and is trapped, Esc and the backdrop close it, and
 * focus returns to the ☰ button. Following a link closes it so the page scrolls to that section. The drawer is a
 * descendant of the site root, so it wears the restaurant's theme, never the platform's.
 */

const SECTION_ICON: Record<string, LucideIcon> = {
  ABOUT: Info,
  FEATURED_MENU: Sparkles,
  CATEGORIES: UtensilsCrossed,
  POPULAR_ITEMS: Flame,
  INFO: ConciergeBell,
  HOURS: Clock,
  GALLERY: Images,
  LOCATION: MapPin,
  CONTACT: Phone,
};

export function SiteMenu({
  restaurantName,
  links,
  staffSignInHref,
  status,
  className,
}: {
  restaurantName: string;
  links: SiteNavLink[];
  staffSignInHref: string;
  /** The open/closed badge, rendered on the server with the restaurant's own time zone. */
  status: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const close = React.useCallback(() => setOpen(false), []);

  return (
    <div className={className}>
      <IconButton icon={Menu} aria-label="Open menu" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)} />
      <Drawer open={open} onClose={close} title={restaurantName} side="right">
        <div className="flex flex-col gap-6">
          <div>{status}</div>
          {links.length > 0 ? (
            <nav aria-label={`${restaurantName} — all sections`}>
              <ul className="flex list-none flex-col gap-1 p-0">
                {links.map((link) => {
                  const SectionIcon = SECTION_ICON[link.key] ?? ChevronRight;
                  return (
                    <li key={link.href}>
                      <a
                        href={link.href}
                        onClick={close}
                        className="group flex min-h-12 items-center gap-3 rounded-xl px-3 text-nav text-fg-primary transition-colors duration-fast ease-standard hover:bg-raised"
                      >
                        <SectionIcon aria-hidden="true" className="h-5 w-5 shrink-0 text-fg-accent" />
                        <span className="min-w-0 flex-1 break-words">{link.label}</span>
                        <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-fg-secondary transition-transform duration-fast ease-standard motion-safe:group-hover:translate-x-0.5" />
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>
          ) : null}
          <div className="border-t border-border-subtle pt-4">
            <a
              href={staffSignInHref}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border-strong px-4 text-nav text-fg-primary transition-colors duration-fast ease-standard hover:bg-raised"
            >
              <LogIn aria-hidden="true" className="h-4 w-4" />
              Staff login
            </a>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
