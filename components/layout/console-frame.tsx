"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Toaster } from "@/components/ui/toast";
import { isFocusRoute } from "@/lib/ui/navigation";
import { AppShell, type ShellSlots } from "./app-shell";
import { FocusShell } from "./focus-shell";

/**
 * Chooses the tenant-console shell by route (S1-P08-T008): the kitchen board gets the focus shell, everything else the
 * console shell. Stands in for the `(console)` / `(focus)` route groups of frontend.md §2 until the pages move into
 * them; the list of focus routes is `FOCUS_ROUTES` in lib/ui/navigation.ts. Also provides the toast region.
 */
export function ConsoleFrame({ children, indicators }: { children: React.ReactNode } & ShellSlots) {
  const pathname = usePathname() ?? "";
  const Shell = isFocusRoute(pathname) ? FocusShell : AppShell;
  return (
    <Toaster>
      <Shell indicators={indicators}>{children}</Shell>
    </Toaster>
  );
}
