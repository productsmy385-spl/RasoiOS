import type { Restaurant } from "@prisma/client";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { updateRestaurantProfileAction } from "@/app/restaurant/settings/actions";
import type { ActionResult } from "@/lib/http/action";
import { testDb } from "../setup/db";
import { actorState } from "../helpers/actor-state";
import { asSeedUser, invokeAction, seedOnce, tenantIdOf, type ControlFlow } from "../helpers/actors";

// Restaurant profile retrofit (S1-P04-T007, SA-RST-01): `restaurant:update` (security.md §3.3 row 10), the restaurant of
// the session's tenant only, before/after audit in the same transaction. Replaces tests/unit/restaurant-settings.test.ts.
const db = testDb();
let seededA: Restaurant;
let seededB: Restaurant;

const PROFILE = {
  name: "Spice Route Indiranagar",
  description: "Tandoor and dosa kitchen.",
  addressLine1: "100 Feet Road",
  email: "Contact.SpiceRoute+clerk_test@example.com",
  phoneE164: "+91 80 4123 9999",
};

beforeAll(async () => {
  await seedOnce();
  seededA = await db.restaurant.findUniqueOrThrow({ where: { tenantId: tenantIdOf("A") } });
  seededB = await db.restaurant.findUniqueOrThrow({ where: { tenantId: tenantIdOf("B") } });
}, 120_000);

// Put Tenant A's profile back so every test starts from the seed.
afterEach(async () => {
  const { name, logoUrl, description, addressLine1, email, phoneE164 } = seededA;
  await db.restaurant.update({ where: { id: seededA.id }, data: { name, logoUrl, description, addressLine1, email, phoneE164 } });
});

function dataOf<T>(result: ActionResult<T> | ControlFlow): T {
  if (!("ok" in result) || !result.ok) throw new Error(`Expected ok, got ${JSON.stringify(result)}`);
  return result.data;
}

const profileOf = (r: Restaurant) => ({ name: r.name, logoUrl: r.logoUrl, description: r.description, addressLine1: r.addressLine1, email: r.email, phoneE164: r.phoneE164 });

describe("SA-RST-01 update restaurant profile", () => {
  it("TC-REST-002 TENANT_ADMIN updates Tenant A's profile and audits before/after for this request", async () => {
    const { userId } = await asSeedUser("A", "TENANT_ADMIN");
    const updated = dataOf(await invokeAction(updateRestaurantProfileAction, PROFILE));
    expect(updated).toMatchObject({
      id: seededA.id,
      name: PROFILE.name,
      description: PROFILE.description,
      addressLine1: PROFILE.addressLine1,
      email: "contact.spiceroute+clerk_test@example.com",
      phoneE164: "+918041239999",
    });

    const row = await db.restaurant.findUniqueOrThrow({ where: { tenantId: tenantIdOf("A") } });
    expect(profileOf(row)).toEqual({
      name: PROFILE.name,
      logoUrl: seededA.logoUrl, // branding is SA-RST-02, not this action
      description: PROFILE.description,
      addressLine1: PROFILE.addressLine1,
      email: "contact.spiceroute+clerk_test@example.com",
      phoneE164: "+918041239999",
    });

    // Both audit rows carry this request's id: they were written by the same action as the update.
    const audits = await db.auditLog.findMany({ where: { requestId: actorState.requestId, resourceId: seededA.id }, orderBy: { action: "asc" } });
    expect(audits.map((a) => a.action)).toEqual(["restaurant.profile_updated"]);
    const profileAudit = audits.find((a) => a.action === "restaurant.profile_updated")!;
    expect(profileAudit).toMatchObject({ tenantId: tenantIdOf("A"), actorUserId: userId, actorRole: "TENANT_ADMIN", resourceType: "restaurant" });
    expect(profileAudit.beforeState).toMatchObject({ name: seededA.name });
    expect(profileAudit.afterState).toMatchObject({ name: PROFILE.name });
    // Personal contact data is masked in the audit trail (SC-PII-03).
    expect(JSON.stringify(profileAudit.afterState)).not.toContain("contact.spiceroute");

    // Tenant B's restaurant is untouched.
    expect(profileOf(await db.restaurant.findUniqueOrThrow({ where: { id: seededB.id } }))).toEqual(profileOf(seededB));
  });

  it("an omitted field is left unchanged and an empty field is cleared", async () => {
    await asSeedUser("A", "TENANT_ADMIN");
    dataOf(await invokeAction(updateRestaurantProfileAction, { name: "Spice Route", description: "" }));
    const row = await db.restaurant.findUniqueOrThrow({ where: { tenantId: tenantIdOf("A") } });
    expect(row).toMatchObject({ description: null, addressLine1: seededA.addressLine1, email: seededA.email, phoneE164: seededA.phoneE164, logoUrl: seededA.logoUrl });
  });

  it("TC-RBAC-110 MANAGER, CASHIER, KITCHEN and WAITER are FORBIDDEN and nothing changes", async () => {
    for (const role of ["MANAGER", "CASHIER", "KITCHEN", "WAITER"] as const) {
      await asSeedUser("A", role);
      const result = await invokeAction(updateRestaurantProfileAction, PROFILE);
      expect(result, role).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
      expect(await db.auditLog.count({ where: { requestId: actorState.requestId } })).toBe(0);
    }
    expect(profileOf(await db.restaurant.findUniqueOrThrow({ where: { id: seededA.id } }))).toEqual(profileOf(seededA));
  });

  it("TI-015 a body carrying Tenant B's tenantId is rejected (422); neither restaurant changes", async () => {
    await asSeedUser("A", "TENANT_ADMIN");
    const result = await invokeAction(updateRestaurantProfileAction, { ...PROFILE, tenantId: tenantIdOf("B") } as never);
    expect(result).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });
    expect(profileOf(await db.restaurant.findUniqueOrThrow({ where: { id: seededA.id } }))).toEqual(profileOf(seededA));
    expect(profileOf(await db.restaurant.findUniqueOrThrow({ where: { id: seededB.id } }))).toEqual(profileOf(seededB));
  });

  it("validates E02 formats with field errors: name length, E.164 phone, email, description length", async () => {
    await asSeedUser("A", "TENANT_ADMIN");
    const cases: Array<[Record<string, string>, string]> = [
      [{ name: "X" }, "name"],
      [{ name: "x".repeat(121) }, "name"],
      [{ name: "Spice Route", phoneE164: "12345" }, "phoneE164"],
      [{ name: "Spice Route", email: "not-an-email" }, "email"],
      [{ name: "Spice Route", description: "d".repeat(1001) }, "description"],
    ];
    for (const [input, field] of cases) {
      const result = await invokeAction(updateRestaurantProfileAction, input as never);
      expect(result, field).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });
      if (!("ok" in result) || result.ok) continue;
      expect(Object.keys(result.error.fieldErrors ?? {}), field).toContain(field);
    }
    expect(profileOf(await db.restaurant.findUniqueOrThrow({ where: { id: seededA.id } }))).toEqual(profileOf(seededA));
  });
});
