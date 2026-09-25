"use client";

import { useClerk } from "@clerk/nextjs";
import { ChevronDown, CircleUser, LogOut, Store } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { Menu, type MenuItem } from "@/components/ui/menu";
import { cn } from "@/lib/ui/cn";
import { useSignOut } from "./sign-out-button";
import { ThemeToggle } from "./theme-toggle";

/**
 * User menu (S1-P08-T008, frontend.md §3.1/§3.2): who is signed in, Clerk's account settings, restaurant switching when
 * the user has more than one restaurant, and sign-out through the flow that clears the active-restaurant cookie.
 */
export function initialsOf(name: string | null | undefined, email: string): string {
  const source = name?.trim() || email.split("@")[0] || "?";
  const words = source.split(/[\s._-]+/).filter(Boolean);
  const letters = words.length > 1 ? `${words[0][0]}${words[words.length - 1][0]}` : source.slice(0, 2);
  return letters.toUpperCase();
}

export function UserMenu({
  name,
  email,
  roleLabel,
  switchHref,
  showName = false,
  className,
  themeInPanelOnMobile = false,
}: {
  name: string | null;
  email: string;
  roleLabel?: string;
  /** Link to choose another restaurant (only when the user has more than one). */
  switchHref?: string;
  /** Show the name next to the avatar. */
  showName?: boolean;
  /** Below 768 px the theme control is in the side panel (tenant console only). */
  themeInPanelOnMobile?: boolean;
  className?: string;
}) {
  const clerk = useClerk();
  const { signOut, pending } = useSignOut();
  const displayName = name?.trim() || email || "Your account";

  const items: MenuItem[] = [
    { label: "Manage account", icon: CircleUser, onSelect: () => clerk.openUserProfile() },
    ...(switchHref ? [{ label: "Switch restaurant", icon: Store, href: switchHref }] : []),
    { label: pending ? "Signing out…" : "Sign out", icon: LogOut, onSelect: () => void signOut(), disabled: pending },
  ];

  // The theme control sits beside the account menu, so every console header (tenant, kitchen, platform) gets exactly
  // one, from one place (ADR-016). The tenant console passes `themeInPanelOnMobile`: below 768 px its side panel
  // carries the control instead, leaving the phone header room for the restaurant's name. Shells without a side panel
  // (kitchen, platform) keep it in the header at every width.
  return (
    <>
    <ThemeToggle className={themeInPanelOnMobile ? "hidden md:inline-flex" : undefined} />
    <Menu
      items={items}
      header={
        <div className="flex min-w-0 flex-col">
          <p className="truncate text-label text-fg-primary">{displayName}</p>
          {email && email !== displayName && <p className="truncate text-caption text-fg-secondary">{email}</p>}
          {roleLabel && <p className="text-caption text-fg-secondary">{roleLabel}</p>}
        </div>
      }
      trigger={(props) => (
        <button
          {...props}
          aria-label={`Account menu for ${displayName}`}
          className={cn("inline-flex h-11 max-w-full items-center gap-2 rounded-xl px-1.5 text-fg-primary transition-colors duration-fast ease-standard hover:bg-raised", className)}
        >
          <span aria-hidden="true" className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-action-primary/10 text-label text-fg-accent">
            {initialsOf(name, email)}
          </span>
          {showName && (
            <span className="flex min-w-0 flex-col text-left">
              <span className="truncate text-label">{displayName}</span>
              {roleLabel && <span className="truncate text-caption text-fg-secondary">{roleLabel}</span>}
            </span>
          )}
          <Icon icon={ChevronDown} size={16} className={cn("shrink-0 text-fg-secondary", showName && "ml-auto")} />
        </button>
      )}
    />
    </>
  );
}
