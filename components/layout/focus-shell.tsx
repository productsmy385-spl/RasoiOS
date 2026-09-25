"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import type { TenantRole } from "@prisma/client";
import { Icon } from "@/components/ui/icon";
import { localeForCountry } from "@/lib/ui/format";
import { isFocusRoute, roleHomePath, roleLabel } from "@/lib/ui/navigation";
import { useConsoleSession } from "@/lib/ui/session-context";
import type { ShellSlots } from "./app-shell";
import { SkipLink } from "./brand";
import { LiveClock } from "./live-clock";
import { NotificationsMenu } from "./notifications";
import { RestaurantMark } from "./restaurant-mark";
import { UserMenu } from "./user-menu";

/**
 * Focus shell (design.md §6.1/§11): the kitchen board gets the whole screen. The header collapses to brand, status and
 * an exit link — no navigation competing for space, and no glass or decoration, because the board must stay readable
 * at ~1.5 m. Everything else in the console is one tap away through "Leave kitchen view".
 */
export function FocusShell({ children, indicators = [] }: { children: React.ReactNode } & ShellSlots) {
  const session = useConsoleSession();
  // KITCHEN's role home *is* the board, so that role leaves to the orders list instead of back to this page.
  const home = session ? roleHomePath(session.activeTenant.role as TenantRole) : "/restaurant";
  const exitHref = isFocusRoute(home) ? "/restaurant/orders" : home;

  return (
    <>
      <SkipLink />
      <div className="flex min-h-screen flex-col bg-canvas text-fg-primary">
        <header className="sticky top-0 z-header border-b border-border-subtle bg-card print:hidden">
          <div className="flex h-14 items-center gap-3 px-4">
            {session && <RestaurantMark href="/restaurant" name={session.activeTenant.name} logoUrl={session.activeTenant.logoUrl} className="min-w-0" />}
            <div className="ml-auto flex shrink-0 items-center gap-2">
              {session?.activeTenant.timezone && <LiveClock timezone={session.activeTenant.timezone} locale={localeForCountry(session.activeTenant.countryCode)} />}
              <NotificationsMenu indicators={indicators} />
              <Link
                href={exitHref}
                className="inline-flex h-11 items-center gap-2 rounded-xl px-3 text-label text-fg-secondary transition-colors duration-fast ease-standard hover:bg-raised hover:text-fg-primary"
              >
                <Icon icon={LogOut} size={18} />
                <span className="hidden sm:inline">Leave kitchen view</span>
                <span className="sr-only sm:hidden">Leave kitchen view</span>
              </Link>
              {session && (
                <UserMenu
                  name={session.user.fullName}
                  email={session.user.email}
                  roleLabel={roleLabel(session.activeTenant.role)}
                  switchHref={session.membershipCount > 1 ? "/account/select-tenant" : undefined}
                />
              )}
            </div>
          </div>
        </header>
        <main id="main-content" tabIndex={-1} className="w-full min-w-0 flex-1 p-4 focus:outline-none">
          {children}
        </main>
      </div>
    </>
  );
}
