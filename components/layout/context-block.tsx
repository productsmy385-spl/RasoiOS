"use client";

import Link from "next/link";
import { ChevronsUpDown, Store } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/ui/cn";
import { localeForCountry } from "@/lib/ui/format";
import { roleLabel } from "@/lib/ui/navigation";
import type { ConsoleSession } from "@/lib/ui/session-context";
import { LiveClock } from "./live-clock";

/**
 * Header context block (frontend.md §3.1/§3.2, ADR-013 §3): which restaurant this console is showing, the signed-in
 * role, and the restaurant's own wall-clock time — never the browser's. The switcher appears only when the user
 * actually belongs to more than one restaurant, so it can never offer a tenant the server would refuse.
 */
export function ContextBlock({ session, className }: { session: ConsoleSession; className?: string }) {
  const multiple = session.membershipCount > 1;
  const identity = (
    <>
      <Icon icon={Store} size={18} className="text-fg-accent" />
      <span className="flex min-w-0 flex-col text-left">
        <span className="truncate text-label text-fg-primary">{session.activeTenant.name}</span>
        <span className="truncate text-caption text-fg-secondary">{roleLabel(session.activeTenant.role)}</span>
      </span>
      {multiple && <Icon icon={ChevronsUpDown} size={16} className="shrink-0 text-fg-secondary" />}
    </>
  );

  return (
    <div className={cn("hidden min-w-0 items-center gap-3 lg:flex", className)}>
      {multiple ? (
        <Link
          href="/account/select-tenant"
          title="Switch restaurant"
          className="inline-flex h-11 min-w-0 max-w-56 items-center gap-2 rounded-xl border border-border-subtle px-3 transition-colors duration-fast ease-standard hover:bg-raised"
        >
          {identity}
          <span className="sr-only">Switch restaurant</span>
        </Link>
      ) : (
        <p className="inline-flex h-11 min-w-0 max-w-56 items-center gap-2 rounded-xl border border-border-subtle px-3">{identity}</p>
      )}
      <LiveClock timezone={session.activeTenant.timezone} locale={localeForCountry(session.activeTenant.countryCode)} className="hidden xl:flex" />
    </div>
  );
}
