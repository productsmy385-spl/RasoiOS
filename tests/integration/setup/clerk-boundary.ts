/**
 * Integration setup (S1-P04-T009): replaces only the identity boundary — Clerk's `auth()` / `currentUser()` and the
 * request-scoped `cookies()` / `headers()` from Next.js — with the current test actor. Everything else in those
 * modules stays real (e.g. `createClerkClient`, used against an HTTP stub in clerk-admin tests).
 */
import { vi } from "vitest";
import { actorState } from "../helpers/actor-state";

vi.mock("@clerk/nextjs/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@clerk/nextjs/server")>();
  return {
    ...actual,
    auth: vi.fn(async () => ({ userId: actorState.clerkUserId, sessionId: actorState.clerkUserId ? "sess_test" : null })),
    currentUser: vi.fn(async () =>
      actorState.clerkUserId
        ? {
            id: actorState.clerkUserId,
            primaryEmailAddressId: "email_test",
            emailAddresses: actorState.verifiedEmail
              ? [{ id: "email_test", emailAddress: actorState.verifiedEmail, verification: { status: "verified" } }]
              : [],
          }
        : null,
    ),
  };
});

vi.mock("next/headers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/headers")>();
  const cookieStore = () => ({
    get: (name: string) => (actorState.cookies.has(name) ? { name, value: actorState.cookies.get(name)! } : undefined),
    getAll: () => [...actorState.cookies.entries()].map(([name, value]) => ({ name, value })),
    has: (name: string) => actorState.cookies.has(name),
    set: (name: string, value: string) => {
      actorState.cookies.set(name, value);
    },
    delete: (name: string) => {
      actorState.cookies.delete(name);
    },
  });
  return {
    ...actual,
    cookies: vi.fn(async () => cookieStore()),
    headers: vi.fn(async () => new Headers({ "x-request-id": actorState.requestId, ...Object.fromEntries(actorState.headers) })),
  };
});
