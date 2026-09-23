import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { bucketKey, consume, consumeScope, rateLimitedResponse, RATE_LIMITS } from "@/lib/security/rate-limit";
import { deleteExpiredBuckets } from "@/lib/data/rate-limit";
import { ServiceUnavailableError } from "@/lib/errors";
import { disconnectTestDb, resetDatabase, testDb } from "../setup/db";

// TC-SEC-013 — PostgreSQL fixed-window rate limiter (S1-P03-T007, ADR-011, SC-RL-01/02).
const db = testDb();
afterAll(disconnectTestDb);
beforeEach(() => resetDatabase(db));

const policy = { limit: 10, windowSec: 60, failOpen: false };
const t0 = new Date("2026-09-15T10:00:05.000Z");

describe("TC-SEC-013 rate limiter", () => {
  it("allows exactly `limit` of 50 concurrent calls, then answers 429 with Retry-After", async () => {
    const results = await Promise.all(
      Array.from({ length: 50 }, () => consume("test.burst", "203.0.113.7", policy, { now: t0, cleanupProbability: 0 })),
    );
    expect(results.filter((r) => r.allowed)).toHaveLength(10);
    expect(results.filter((r) => !r.allowed)).toHaveLength(40);

    const eleventh = await consume("test.burst", "203.0.113.7", policy, { now: t0, cleanupProbability: 0 });
    expect(eleventh.allowed).toBe(false);
    expect(eleventh.retryAfterSec).toBe(55); // window 10:00:00–10:01:00, now 10:00:05
    const response = rateLimitedResponse(eleventh, "req-rl-1");
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("55");
    expect(await response.json()).toEqual({ error: { code: "RATE_LIMITED", message: "Too many requests. Try again shortly.", requestId: "req-rl-1" } });
  });

  it("allows again once the window resets", async () => {
    for (let i = 0; i < 10; i++) await consume("test.reset", "user-1", policy, { now: t0, cleanupProbability: 0 });
    expect((await consume("test.reset", "user-1", policy, { now: t0, cleanupProbability: 0 })).allowed).toBe(false);
    const nextWindow = new Date("2026-09-15T10:01:00.000Z");
    const fresh = await consume("test.reset", "user-1", policy, { now: nextWindow, cleanupProbability: 0 });
    expect(fresh).toMatchObject({ allowed: true, remaining: 9 });
  });

  it("keeps separate buckets per scope and identifier", async () => {
    for (let i = 0; i < 10; i++) await consume("test.sep", "a", policy, { now: t0, cleanupProbability: 0 });
    expect((await consume("test.sep", "b", policy, { now: t0, cleanupProbability: 0 })).allowed).toBe(true);
    expect((await consume("test.other", "a", policy, { now: t0, cleanupProbability: 0 })).allowed).toBe(true);
  });

  it("never stores the raw identifier", async () => {
    await consume("test.privacy", "198.51.100.23", policy, { now: t0, cleanupProbability: 0 });
    const rows = await db.rateLimitBucket.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0].bucketKey).toBe(bucketKey("test.privacy", "198.51.100.23"));
    expect(rows[0].bucketKey).toMatch(/^test\.privacy:[0-9a-f]{64}$/);
    expect(rows[0].bucketKey).not.toContain("198.51.100.23");
  });

  it("deletes expired buckets", async () => {
    await consume("test.expire", "x", policy, { now: t0, cleanupProbability: 0 });
    expect(await deleteExpiredBuckets(new Date("2026-09-15T10:00:30.000Z"))).toBe(0);
    expect(await deleteExpiredBuckets(new Date("2026-09-15T10:02:00.000Z"))).toBe(1);
    expect(await db.rateLimitBucket.count()).toBe(0);
  });

  it("uses the ADR-011 limits per scope", async () => {
    expect(RATE_LIMITS["agent.pair"]).toEqual({ limit: 5, windowSec: 900, failOpen: false });
    expect(RATE_LIMITS["webhook.clerk"]).toEqual({ limit: 60, windowSec: 60, failOpen: false });
    const results = [];
    for (let i = 0; i < 6; i++) results.push(await consumeScope("agent.pair", "192.0.2.1", { now: t0 }));
    expect(results.map((r) => r.allowed)).toEqual([true, true, true, true, true, false]);
  });
});

describe("fail-open / fail-closed when the database is unavailable", () => {
  it("fails closed with 503 for a closed scope and allows for an open scope", async () => {
    vi.resetModules();
    vi.doMock("@/lib/db/prisma", async () => {
      const actual = await vi.importActual<typeof import("@/lib/db/prisma")>("@/lib/db/prisma");
      const down = actual.createPrismaClient({ databaseUrl: "postgresql://nobody:nothing@127.0.0.1:1/unreachable?connect_timeout=2" });
      return { ...actual, db: down, prisma: down };
    });
    const limiter = await import("@/lib/security/rate-limit");
    const errors = await import("@/lib/errors");

    const closed = await limiter.consume("test.closed", "x", { limit: 5, windowSec: 60, failOpen: false }).catch((e: unknown) => e);
    expect(closed).toBeInstanceOf(errors.ServiceUnavailableError);

    const open = await limiter.consume("test.open", "x", { limit: 5, windowSec: 60, failOpen: true });
    expect(open.allowed).toBe(true);
    vi.doUnmock("@/lib/db/prisma");
    expect(ServiceUnavailableError).toBeDefined();
  }, 30_000);
});
