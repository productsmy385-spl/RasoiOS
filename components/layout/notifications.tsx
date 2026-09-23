"use client";

import { Bell, BellRing, CircleCheck, type LucideIcon } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { Menu, type MenuItem } from "@/components/ui/menu";
import { cn } from "@/lib/ui/cn";
import { STATUS_ICONS, type Tone } from "@/lib/ui/icons";

/**
 * Operational indicators in the console header (frontend.md §3.2): printer agents that are offline and print jobs
 * that failed. SLICE-01 has no notification centre, so this is the whole notification surface — and every entry is
 * derived from a real tenant-scoped query on the server. When nothing is wrong the menu says so; it never invents a
 * count, and it never claims health it has not measured.
 */
export type OperationalIndicator = {
  id: string;
  /** Sentence-case summary, e.g. "2 print jobs failed". */
  label: string;
  tone: Extract<Tone, "warning" | "danger">;
  href: string;
};

const TONE_DOT: Record<OperationalIndicator["tone"], string> = {
  warning: "bg-status-warning",
  danger: "bg-status-danger",
};

const TONE_ICON: Record<OperationalIndicator["tone"], LucideIcon> = {
  warning: STATUS_ICONS.printJob.PENDING.icon,
  danger: STATUS_ICONS.printJob.FAILED.icon,
};

export function NotificationsMenu({ indicators }: { indicators: readonly OperationalIndicator[] }) {
  const count = indicators.length;
  const worst: OperationalIndicator["tone"] = indicators.some((indicator) => indicator.tone === "danger") ? "danger" : "warning";

  const items: MenuItem[] = count
    ? indicators.map((indicator) => ({ label: indicator.label, icon: TONE_ICON[indicator.tone], href: indicator.href, tone: indicator.tone === "danger" ? ("danger" as const) : undefined }))
    : [{ label: "Nothing needs attention", icon: CircleCheck, disabled: true }];

  return (
    <Menu
      items={items}
      header={<p className="text-label text-fg-primary">Operations</p>}
      trigger={(props) => (
        <button
          {...props}
          aria-label={count ? `Operational alerts: ${count}` : "Operational alerts: none"}
          title="Operational alerts"
          className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl text-fg-secondary transition-colors duration-fast ease-standard hover:bg-raised hover:text-fg-primary"
        >
          <Icon icon={count ? BellRing : Bell} size={20} />
          {count > 0 && (
            <span aria-hidden="true" className={cn("absolute right-2 top-2 h-2 w-2 rounded-full", TONE_DOT[worst])} />
          )}
        </button>
      )}
    />
  );
}
