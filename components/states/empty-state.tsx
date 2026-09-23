import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { IconTile } from "@/components/ui/icon-tile";

/**
 * Empty state (S1-P08-T009, design.md §8–9): large icon tile, heading, one specific line ("No active orders", not
 * "No data") and the primary action only when the role may perform it (pass `action` conditionally).
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  secondary,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { href: string; label: string };
  secondary?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col items-center text-center gap-3 py-12 px-4">
      <IconTile icon={icon} size="lg" tone="primary" />
      <h2 className="text-heading text-fg-primary">{title}</h2>
      <p className="text-body text-fg-secondary max-w-md">{description}</p>
      {(action || secondary) && (
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {action && (
            <Link href={action.href} className="inline-flex items-center h-10 px-4 rounded-xl bg-action-primary hover:bg-action-primary-hover text-action-primary-fg text-label">
              {action.label}
            </Link>
          )}
          {secondary && (
            <Link href={secondary.href} className="text-label text-fg-accent hover:underline">
              {secondary.label}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
