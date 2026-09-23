import { describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { action } from "@/lib/http/action";
import { route } from "@/lib/http/route";
import { ForbiddenError, NotFoundError, RateLimitedError, ValidationError } from "@/lib/errors";
import { parseInput, strictObject, uuidParam } from "@/lib/validation/core";
import { invokeRoute } from "../helpers/actors";
import { actorState } from "../helpers/actor-state";

// TC-SEC-007 — unexpected failures return 500 INTERNAL with a request id and nothing internal (S1-P04-T005).
describe("TC-SEC-007 action and route error envelopes", () => {
  it("an unexpected exception in an action becomes INTERNAL with the request id, without stack, SQL or Prisma text", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const failing = action(async () => {
      throw new Prisma.PrismaClientUnknownRequestError('Invalid `prisma.order.findMany()` invocation: SELECT "public"."orders" FAILED at /app/lib/x.ts:10', { clientVersion: "6" });
    });
    const result = await failing();
    spy.mockRestore();
    expect(result).toEqual({
      ok: false,
      error: { code: "INTERNAL", message: `Something went wrong. Reference ${actorState.requestId}.`, requestId: actorState.requestId },
    });
    expect(JSON.stringify(result)).not.toMatch(/prisma|SELECT|orders|\.ts:/i);
  });

  it("known errors keep their code; validation errors carry field errors", async () => {
    expect(await action(async () => { throw new ForbiddenError(); })()).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    expect(await action(async () => { throw new NotFoundError("Order not found."); })()).toMatchObject({ ok: false, error: { code: "NOT_FOUND", message: "Order not found." } });
    const schema = strictObject({ orderId: uuidParam });
    const invalid = await action(async (input: unknown) => parseInput(schema, input))({ orderId: "x", tenantId: "t" });
    expect(invalid).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR", fieldErrors: { orderId: ["Invalid id"], _: ["Unknown field(s): tenantId"] } } });
    expect(await action(async () => 42)()).toEqual({ ok: true, data: 42 });
    expect(new ValidationError().statusCode).toBe(422);
  });

  it("route handlers map errors to status + JSON envelope + request id, with no internals", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const boom = route(async () => {
      throw new TypeError("Cannot read properties of undefined (reading 'tenantId') at lib/services/orders.ts:42");
    });
    const res = await invokeRoute(boom, { url: "/api/v1/test", headers: { "x-request-id": "req-envelope-1" } });
    spy.mockRestore();
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: { code: "INTERNAL", message: "Something went wrong. Reference req-envelope-1.", requestId: "req-envelope-1" } });
    expect(res.headers.get("x-request-id")).toBe("req-envelope-1");
    expect(res.headers.get("cache-control")).toBe("no-store");

    const missing = await invokeRoute(route(async () => { throw new NotFoundError(); }), { url: "/api/v1/test", headers: { "x-request-id": "req-envelope-2" } });
    expect(missing.status).toBe(404);
    const limited = await invokeRoute(route(async () => { throw new RateLimitedError(30); }), { url: "/api/v1/test" });
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toBe("30");
    const ok = await invokeRoute(route(async () => ({ items: [] })), { url: "/api/v1/test" });
    expect(ok).toMatchObject({ status: 200, body: { items: [] } });
  });
});
