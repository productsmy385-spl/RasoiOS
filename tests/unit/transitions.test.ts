import type { KotStatus, OrderStatus, TenantRole } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { permissionsForTenantRole } from "@/lib/auth/permissions";
import { allowedNextStatuses, assertTransitionAllowed, KOT_TRANSITIONS, ORDER_TRANSITIONS, permissionForTarget } from "@/lib/auth/transitions";

// TC-RBAC-015 — the transition table equals security.md §3.4 and everything else is INVALID_TRANSITION (S1-P05-T004).
const actor = (role: TenantRole) => ({ role, permissions: permissionsForTenantRole(role) as ReadonlySet<string> });

/** security.md §3.4, transcribed row by row. */
const SPEC_ORDER = [
  ["NEW", "ACCEPTED", "order:accept"],
  ["ACCEPTED", "PREPARING", "order:kitchen_update"],
  ["PREPARING", "READY", "order:kitchen_update"],
  ["READY", "COMPLETED", "order:complete"],
  ["NEW", "CANCELLED", "order:cancel"],
  ["ACCEPTED", "CANCELLED", "order:cancel"],
  ["PREPARING", "CANCELLED", "order:cancel"],
  ["READY", "CANCELLED", "order:cancel"],
  ["COMPLETED", "REFUNDED", null],
];
const SPEC_KOT = [
  ["QUEUED", "PREPARING", "kot:update_status"],
  ["PREPARING", "READY", "kot:update_status"],
  ["READY", "SERVED", "kot:serve"],
];

const ORDER_STATUSES: OrderStatus[] = ["NEW", "ACCEPTED", "PREPARING", "READY", "COMPLETED", "CANCELLED", "REFUNDED"];
const KOT_STATUSES: KotStatus[] = ["QUEUED", "PREPARING", "READY", "SERVED", "CANCELLED"];

describe("TC-RBAC-015 transition table", () => {
  it("equals security.md §3.4", () => {
    expect(ORDER_TRANSITIONS.map((r) => [r.from, r.to, r.permission])).toEqual(SPEC_ORDER);
    expect(KOT_TRANSITIONS.filter((r) => r.permission).map((r) => [r.from, r.to, r.permission])).toEqual(SPEC_KOT);
    // KOT cancellation only happens automatically with the order.
    expect(KOT_TRANSITIONS.filter((r) => r.to === "CANCELLED").every((r) => r.permission === null)).toBe(true);
  });

  it("rejects every order pair not in the table with INVALID_TRANSITION", () => {
    const admin = actor("TENANT_ADMIN");
    for (const from of ORDER_STATUSES) {
      for (const to of ORDER_STATUSES) {
        const inTable = ORDER_TRANSITIONS.some((r) => r.from === from && r.to === to && r.permission);
        if (inTable) continue;
        expect(() => assertTransitionAllowed(admin, "order", from, to), `${from}→${to}`).toThrow(expect.objectContaining({ code: "INVALID_TRANSITION" }));
      }
    }
  });

  it("rejects skipping KOT steps and manual KOT cancellation", () => {
    const kitchen = actor("KITCHEN");
    expect(() => assertTransitionAllowed(kitchen, "kot", "QUEUED", "READY")).toThrow(expect.objectContaining({ code: "INVALID_TRANSITION" }));
    expect(() => assertTransitionAllowed(kitchen, "kot", "QUEUED", "CANCELLED")).toThrow(expect.objectContaining({ code: "INVALID_TRANSITION" }));
    for (const from of KOT_STATUSES) expect(() => assertTransitionAllowed(kitchen, "kot", "SERVED", from)).toThrow();
  });

  it("enforces permissions and the cancel restriction (row 29)", () => {
    expect(() => assertTransitionAllowed(actor("KITCHEN"), "order", "NEW", "ACCEPTED")).toThrow(expect.objectContaining({ code: "FORBIDDEN" }));
    expect(() => assertTransitionAllowed(actor("CASHIER"), "order", "NEW", "CANCELLED")).not.toThrow();
    expect(() => assertTransitionAllowed(actor("CASHIER"), "order", "ACCEPTED", "CANCELLED")).toThrow(expect.objectContaining({ code: "FORBIDDEN" }));
    expect(() => assertTransitionAllowed(actor("WAITER"), "order", "ACCEPTED", "CANCELLED")).toThrow(expect.objectContaining({ code: "FORBIDDEN" }));
    expect(() => assertTransitionAllowed(actor("MANAGER"), "order", "ACCEPTED", "CANCELLED")).not.toThrow();
    // Q-008 B: TENANT_ADMIN/MANAGER may cancel PREPARING and READY; CASHIER/WAITER/KITCHEN may not.
    for (const from of ["PREPARING", "READY"] as const) {
      expect(() => assertTransitionAllowed(actor("MANAGER"), "order", from, "CANCELLED")).not.toThrow();
      expect(() => assertTransitionAllowed(actor("TENANT_ADMIN"), "order", from, "CANCELLED")).not.toThrow();
      for (const role of ["CASHIER", "WAITER", "KITCHEN"] as const) {
        expect(() => assertTransitionAllowed(actor(role), "order", from, "CANCELLED"), `${role} ${from}`).toThrow(expect.objectContaining({ code: "FORBIDDEN" }));
      }
    }
    expect(() => assertTransitionAllowed(actor("WAITER"), "kot", "PREPARING", "READY")).toThrow(expect.objectContaining({ code: "FORBIDDEN" }));
    expect(() => assertTransitionAllowed(actor("WAITER"), "kot", "READY", "SERVED")).not.toThrow();
  });

  it("lists only the next statuses the actor may choose", () => {
    expect(allowedNextStatuses(actor("CASHIER"), "order", "NEW")).toEqual(["ACCEPTED", "CANCELLED"]);
    expect(allowedNextStatuses(actor("CASHIER"), "order", "ACCEPTED")).toEqual([]);
    expect(allowedNextStatuses(actor("MANAGER"), "order", "ACCEPTED")).toEqual(["PREPARING", "CANCELLED"]);
    expect(allowedNextStatuses(actor("KITCHEN"), "kot", "QUEUED")).toEqual(["PREPARING"]);
    expect(allowedNextStatuses(actor("TENANT_ADMIN"), "order", "COMPLETED")).toEqual([]);
  });

  it("maps a requested target status to the permission to check first", () => {
    expect(permissionForTarget("order", "ACCEPTED")).toBe("order:accept");
    expect(permissionForTarget("order", "READY")).toBe("order:kitchen_update");
    expect(permissionForTarget("order", "REFUNDED")).toBeNull();
    expect(permissionForTarget("kot", "SERVED")).toBe("kot:serve");
  });
});
