"use client";

import * as React from "react";
import { useClerk } from "@clerk/nextjs";
import { LogOut } from "lucide-react";
import { clearActiveTenantCookieAction } from "@/app/sign-in/actions";
import { Button, type ButtonProps } from "@/components/ui/button";

/**
 * Sign-out flow (S1-P03-T005, SC-SESS-03): clear the active-restaurant preference cookie on the server, then end the
 * Clerk session and land on /sign-in. If clearing fails (e.g. offline), Clerk still signs out and /sign-in clears
 * the leftover cookie on arrival.
 */
export function useSignOut(): { signOut: () => Promise<void>; pending: boolean } {
  const clerk = useClerk();
  const [pending, setPending] = React.useState(false);
  const signOut = React.useCallback(async () => {
    setPending(true);
    try {
      await clearActiveTenantCookieAction();
    } catch {
      // Cleared on arrival at /sign-in instead.
    }
    await clerk.signOut({ redirectUrl: "/sign-in" });
  }, [clerk]);
  return { signOut, pending };
}

export function SignOutButton({ variant = "secondary", className, children = "Sign out" }: Pick<ButtonProps, "variant" | "className" | "children">) {
  const { signOut, pending } = useSignOut();
  return (
    <Button variant={variant} icon={LogOut} loading={pending} loadingLabel="Signing out…" onClick={() => void signOut()} className={className}>
      {children}
    </Button>
  );
}
