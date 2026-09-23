import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  businessDateDto,
  businessDateValue,
  instantDto,
  mapDatabaseError,
  moneyDto,
  notFoundOrConflict,
  required,
  tenantKey,
  tenantScope,
} from "@/lib/data";
import type { TenantContext } from "@/lib/auth/context-types";
import { ConflictError, NotFoundError, ServiceUnavailableError } from "@/lib/errors";

// S1-P02-T005 — lib/data conventions (tenant-isolation.md §3.1).
const ctx = { kind: "tenant", tenantId: "11111111-1111-4111-8111-111111111111" } as TenantContext;

describe("tenant scoping helpers", () => {
  it("adds the context tenant to a where clause and cannot be overridden by input", () => {
    const where = tenantScope(ctx, { id: "abc", tenantId: "attacker-supplied" } as { id: string; tenantId?: string });
    expect(where).toEqual({ id: "abc", tenantId: ctx.tenantId });
    expect(tenantKey(ctx, "abc")).toEqual({ tenantId_id: { tenantId: ctx.tenantId, id: "abc" } });
  });

  it("treats a miss as NOT_FOUND and a stale version as CONFLICT", async () => {
    expect(() => required(null, "Order")).toThrow(NotFoundError);
    expect(required({ id: 1 }, "Order")).toEqual({ id: 1 });
    expect(await notFoundOrConflict(async () => true, "Order")).toBeInstanceOf(ConflictError);
    expect(await notFoundOrConflict(async () => false, "Order")).toBeInstanceOf(NotFoundError);
  });
});

describe("DTO helpers", () => {
  it("formats money as two-decimal strings and dates without time zone drift", () => {
    expect(moneyDto(new Prisma.Decimal("480"))).toBe("480.00");
    expect(moneyDto(new Prisma.Decimal("0.1"))).toBe("0.10");
    expect(instantDto(new Date("2026-09-15T18:30:00.000Z"))).toBe("2026-09-15T18:30:00.000Z");
    expect(businessDateDto(new Date("2026-09-15T00:00:00.000Z"))).toBe("2026-09-15");
    expect(businessDateValue("2026-02-28").toISOString()).toBe("2026-02-28T00:00:00.000Z");
  });

  it("rejects malformed or impossible business dates", () => {
    for (const bad of ["2026-02-30", "2026-9-1", "15/09/2026", "2026-09-15T00:00:00Z", ""]) {
      expect(() => businessDateValue(bad)).toThrow(RangeError);
    }
  });
});

describe("database error mapping", () => {
  const known = (code: string, meta?: Record<string, unknown>) =>
    new Prisma.PrismaClientKnownRequestError("internal detail: SELECT * FROM orders", { code, clientVersion: "6", meta });

  it("maps record-not-found, unique and timeout errors to safe application errors", () => {
    expect(mapDatabaseError(known("P2025"), "Order")).toBeInstanceOf(NotFoundError);
    expect(mapDatabaseError(known("P2002"), "Category")).toBeInstanceOf(ConflictError);
    const timeout = mapDatabaseError(known("P2010", { code: "57014" }));
    expect(timeout).toBeInstanceOf(ServiceUnavailableError);
    expect((timeout as Error).message).not.toContain("SELECT");
  });

  it("passes unknown errors through unchanged", () => {
    const boom = new Error("boom");
    expect(mapDatabaseError(boom)).toBe(boom);
  });
});

describe("remaining DTO and error helpers", () => {
  it("handles nullable values and rates", async () => {
    const { nullableMoneyDto, nullableInstantDto, rateDto } = await import("@/lib/data");
    expect(nullableMoneyDto(null)).toBeNull();
    expect(nullableMoneyDto(new Prisma.Decimal("5"))).toBe("5.00");
    expect(rateDto(new Prisma.Decimal("18"))).toBe("18.00");
    expect(nullableInstantDto(null)).toBeNull();
    expect(nullableInstantDto(new Date("2026-09-15T00:00:00Z"))).toBe("2026-09-15T00:00:00.000Z");
  });

  it("maps serialization conflicts, keeps application errors and wraps operations", async () => {
    const { mapErrors } = await import("@/lib/data");
    const conflict = new Prisma.PrismaClientKnownRequestError("deadlock", { code: "P2034", clientVersion: "6" });
    expect(mapDatabaseError(conflict)).toBeInstanceOf(ConflictError);
    const appError = new NotFoundError("x");
    expect(mapDatabaseError(appError)).toBe(appError);
    expect(mapDatabaseError(new Error("canceling statement due to statement timeout"))).toBeInstanceOf(ServiceUnavailableError);
    await expect(mapErrors("Order", async () => "ok")).resolves.toBe("ok");
    await expect(mapErrors("Order", async () => { throw new Prisma.PrismaClientKnownRequestError("x", { code: "P2025", clientVersion: "6" }); })).rejects.toBeInstanceOf(NotFoundError);
  });

  it("builds a where clause from the context alone", () => {
    expect(tenantScope(ctx)).toEqual({ tenantId: ctx.tenantId });
  });
});
