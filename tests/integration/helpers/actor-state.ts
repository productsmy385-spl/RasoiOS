/**
 * The identity the Clerk boundary mock reports (S1-P04-T009). Only this boundary is faked: the session resolver,
 * context resolution, services and the database are all real.
 */
export type ActorState = {
  clerkUserId: string | null;
  /** Clerk-verified primary email returned by the mocked `currentUser()` (used only for first-sign-in linking). */
  verifiedEmail: string | null;
  cookies: Map<string, string>;
  /** Extra request headers the mocked `headers()` reports — e.g. the middleware's resolved tenant slug (ADR-012). */
  headers: Map<string, string>;
  requestId: string;
};

export const actorState: ActorState = {
  clerkUserId: null,
  verifiedEmail: null,
  cookies: new Map(),
  headers: new Map(),
  requestId: "test-request-0000",
};

let requestCounter = 0;

export function resetActorState(): void {
  actorState.clerkUserId = null;
  actorState.verifiedEmail = null;
  actorState.cookies = new Map();
  actorState.headers = new Map();
  actorState.requestId = `test-request-${String(++requestCounter).padStart(4, "0")}`;
}
