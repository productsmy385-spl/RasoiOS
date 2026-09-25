"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Icon } from "@/components/ui/icon";
import { Toaster } from "@/components/ui/toast";
import { cn } from "@/lib/ui/cn";
import { activeAdminItem, ADMIN_NAV_ITEMS } from "@/lib/ui/navigation";
import { BrandMark, SkipLink } from "./brand";
import { UserMenu } from "./user-menu";
import { FoodBackdrop } from "./food-backdrop";

/**
 * Platform console shell (ADR-013 §3, frontend.md §5.2): the same header-navigation shell as the tenant console —
 * one sticky `glass-1` header, no sidebar — with the "Platform" brand context instead of a restaurant context block.
 * Content is capped at 1280 px. The admin layout's server guard (requirePlatformPage) decides who gets here; the
 * platform navigation is short enough that it never overflows, so it needs no "More" menu.
 */
export function AdminHeader() {
  const pathname = usePathname() ?? "";
  const { user } = useUser();
  const current = activeAdminItem(pathname);
  const email = user?.primaryEmailAddress?.emailAddress ?? "";

  return (
    <header className="glass-1 sticky top-0 z-header border-b print:hidden">
      <div className="mx-auto flex h-header w-full max-w-admin items-center gap-3 px-4 sm:px-6 lg:px-8">
        <BrandMark href="/admin" context="Platform" className="shrink-0" />
        <nav aria-label="Platform" className="min-w-0 flex-1">
          <ul className="flex items-center gap-1">
            {ADMIN_NAV_ITEMS.map((item) => {
              const active = item === current;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative inline-flex h-11 items-center gap-3 whitespace-nowrap rounded-xl px-3 text-nav transition-colors duration-fast ease-standard",
                      active ? "brand-underline bg-action-primary/12 text-fg-primary" : "text-fg-secondary hover:bg-raised hover:text-fg-primary",
                    )}
                  >
                    <Icon icon={item.icon} size={20} className={active ? "text-fg-accent" : undefined} />
                    <span className="sr-only sm:not-sr-only">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        {user !== undefined && <UserMenu name={user?.fullName ?? null} email={email} roleLabel="Platform administrator" />}
      </div>
    </header>
  );
}

/** `Toaster` wraps the console so a lifecycle action can confirm itself where it happened (S1-P06-T006). */
export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <Toaster>
      <SkipLink />
      <div className="page-wash isolate flex min-h-screen flex-col bg-canvas text-fg-primary">
        <FoodBackdrop />
        <AdminHeader />
        <main id="main-content" tabIndex={-1} className="mx-auto w-full min-w-0 max-w-admin flex-1 px-4 py-6 focus:outline-none sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </Toaster>
  );
}
