/**
 * Actor helpers for tenant-isolation, RBAC and endpoint tests (S1-P04-T009, SC-TEN-10).
 *
 *   await seedOnce();                                   // Tenant A "Spice Route" + Tenant B "Harbour Grill"
 *   await asSeedUser("A", "CASHIER");                  // Clerk identity of Tenant A's cashier
 *   const result = await invokeAction(someAction, input);
 *   expect(result).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
 *
 * Only the Clerk identity boundary is stubbed (tests/integration/setup/clerk-boundary.ts); session resolution,
 * tenant context, guards, services and PostgreSQL are real.
 */
import type { TenantRole } from "@prisma/client";
import { NextRequest } from "next/server";
import { ACTIVE_MEMBERSHIP_COOKIE } from "@/lib/auth/active-membership-cookie";
import { seedDatabase } from "@/prisma/seed-data/build";
import { seedId } from "@/prisma/seed-data/ids";
import { TENANTS, staffEmail } from "@/prisma/seed-data/tenants";
import { resetDatabase, testDb } from "../setup/db";
import { actorState, resetActorState } from "./actor-state";

export type TenantKey = "A" | "B";
const DEF = { A: TENANTS[0], B: TENANTS[1] } as const;

/** Fixed "now" for seeded data: 14:00 in Kolkata, 04:30 in New York. */
export const SEED_NOW = new Date("2026-09-15T08:30:00.000Z");
export const SUPER_ADMIN_EMAIL = "platform.owner+clerk_test@example.com";

/** Resets the database and loads the two-tenant seed. Call once per file (beforeAll). */
export async function seedOnce(): Promise<void> {
  const db = testDb();
  await resetDatabase(db);
  await seedDatabase(db, { now: SEED_NOW, superAdminEmail: SUPER_ADMIN_EMAIL, appUrl: "http://localhost:3000" });
}

/** Deterministic seeded ids, e.g. `seeded("A", "order:o1")`, `seeded("B", "tenant")`. */
export function seeded(tenant: TenantKey, label: string): string {
  return seedId(`${tenant.toLowerCase()}:${label}`);
}

export const tenantIdOf = (tenant: TenantKey) => seeded(tenant, "tenant");

async function actAsUserId(userId: string): Promise<{ userId: string; clerkUserId: string }> {
  const db = testDb();
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const clerkUserId = user.clerkUserId ?? `user_test_${user.id.slice(0, 8)}`;
  if (!user.clerkUserId) await db.user.update({ where: { id: user.id }, data: { clerkUserId } });
  resetActorState();
  actorState.clerkUserId = clerkUserId;
  actorState.verifiedEmail = user.email;
  return { userId: user.id, clerkUserId };
}

/** Acts as the seeded staff member of `tenant` with `role` (one ACTIVE user per role per tenant). */
export async function asSeedUser(tenant: TenantKey, role: TenantRole): Promise<{ userId: string; clerkUserId: string; membershipId: string }> {
  const actor = await actAsUserId(seeded(tenant, `user:${role}`));
  return { ...actor, membershipId: seeded(tenant, `membership:${role}`) };
}

/** Acts as any existing USER row. */
export async function asUserId(userId: string) {
  return actAsUserId(userId);
}

/** Acts as the seeded platform SUPER_ADMIN. */
export async function asPlatformAdmin(): Promise<{ userId: string; clerkUserId: string }> {
  const admin = await testDb().user.findUniqueOrThrow({ where: { email: SUPER_ADMIN_EMAIL } });
  return actAsUserId(admin.id);
}

/** A Clerk identity with no local account (never invited). */
export function asUninvited(email = "stranger+clerk_test@example.com"): void {
  resetActorState();
  actorState.clerkUserId = `user_stranger_${email.length}`;
  actorState.verifiedEmail = email;
}

/** No Clerk session at all. */
export function asAnonymous(): void {
  resetActorState();
}

/** Sets the active-restaurant preference cookie (any value, including hostile ones). */
export function setActiveMembershipCookie(value: string | null): void {
  if (value === null) actorState.cookies.delete(ACTIVE_MEMBERSHIP_COOKIE);
  else actorState.cookies.set(ACTIVE_MEMBERSHIP_COOKIE, value);
}

export function activeMembershipCookie(): string | undefined {
  return actorState.cookies.get(ACTIVE_MEMBERSHIP_COOKIE);
}

export { staffEmail, DEF as SEED_TENANTS };

// ─── Invocation helpers ───

export type ControlFlow = { redirect: string } | { notFound: true };

/** Next.js redirect()/notFound() throw special errors; turn them into values tests can assert on. */
export function controlFlowOf(error: unknown): ControlFlow | null {
  const digest = (error as { digest?: unknown } | null)?.digest;
  if (typeof digest !== "string") return null;
  if (digest.startsWith("NEXT_REDIRECT")) return { redirect: digest.split(";")[2] };
  if (digest.startsWith("NEXT_HTTP_ERROR_FALLBACK;404") || digest === "NEXT_NOT_FOUND") return { notFound: true };
  return null;
}

/** Runs a Server Action (or any async function) as the current actor. */
export async function invokeAction<A extends unknown[], R>(fn: (...args: A) => Promise<R>, ...args: A): Promise<R | ControlFlow> {
  try {
    return await fn(...args);
  } catch (error) {
    const flow = controlFlowOf(error);
    if (flow) return flow;
    throw error;
  }
}

/** Runs a Server Component / loader function; redirects and notFound() become values. */
export const invokeLoader = invokeAction;

/** Calls a Route Handler with a real NextRequest. */
export async function invokeRoute(
  handler: (request: NextRequest, context: { params: Promise<Record<string, string>> }) => Promise<Response>,
  options: { method?: string; url: string; body?: unknown; params?: Record<string, string>; headers?: Record<string, string> },
): Promise<{ status: number; body: unknown; headers: Headers }> {
  const request = new NextRequest(new URL(options.url, "http://localhost:3000"), {
    method: options.method ?? "GET",
    headers: { "content-type": "application/json", "x-request-id": actorState.requestId, ...options.headers },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const response = await handler(request, { params: Promise.resolve(options.params ?? {}) });
  const text = await response.text();
  let body: unknown = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // non-JSON body
  }
  return { status: response.status, body, headers: response.headers };
}
