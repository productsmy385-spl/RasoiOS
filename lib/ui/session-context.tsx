"use client";

/**
 * Console session context for client components (S1-P05-T006, LD-AUTH-01). Carries display data and capabilities
 * resolved on the server. Capabilities only decide what the UI shows; the server re-checks every action.
 */
import { createContext, useContext } from "react";

export type ConsoleSession = {
  user: { id: string; fullName: string | null; email: string };
  activeTenant: { name: string; slug: string; role: string; timezone: string; currencyCode: string; countryCode: string };
  membershipCount: number;
  capabilities: string[];
};

const SessionContext = createContext<ConsoleSession | null>(null);

export function SessionProvider({ value, children }: { value: ConsoleSession; children: React.ReactNode }) {
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useConsoleSession(): ConsoleSession | null {
  return useContext(SessionContext);
}

export function useCapabilities(): ReadonlySet<string> {
  return new Set(useContext(SessionContext)?.capabilities ?? []);
}

/** Renders children only when the current role has `permission`. Not a security boundary. */
export function Can({ permission, children, fallback = null }: { permission: string; children: React.ReactNode; fallback?: React.ReactNode }) {
  return useCapabilities().has(permission) ? <>{children}</> : <>{fallback}</>;
}
