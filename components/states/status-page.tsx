import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { IconTile } from "@/components/ui/icon-tile";
import { SignOutButton } from "@/components/layout/sign-out-button";

/**
 * Account status page (design.md §9): the full-screen message shown when there is no restaurant to render —
 * no access, no membership, suspended tenant, forbidden page. Renders no tenant data, and carries the same
 * dark-glass brand as the rest of the platform.
 */
export function StatusPage({
  icon,
  title,
  children,
  primary,
  showSignOut = true,
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
  primary?: { href: string; label: string };
  showSignOut?: boolean;
}) {
  return (
    <main className="page-wash flex min-h-screen items-center justify-center bg-canvas p-6">
      <div className="glass-2 flex w-full max-w-auth flex-col items-center gap-4 rounded-2xl p-6 text-center">
        <IconTile icon={icon} size="lg" tone="primary" />
        <h1 className="text-display-m text-fg-primary">{title}</h1>
        <div className="text-body text-fg-secondary">{children}</div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {primary && (
            <Link
              href={primary.href}
              className="inline-flex h-11 items-center rounded-xl bg-action-primary px-4 text-label text-action-primary-fg transition-colors duration-fast ease-standard hover:bg-action-primary-hover"
            >
              {primary.label}
            </Link>
          )}
          {/* Signs out through the flow that also clears the active-restaurant cookie (S1-P03-T005). */}
          {showSignOut && <SignOutButton />}
        </div>
      </div>
    </main>
  );
}
