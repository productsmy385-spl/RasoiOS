import { beforeAll, describe, expect, it } from "vitest";
import { getThemePreferenceAction, setThemePreferenceAction } from "@/app/account/theme-actions";
import { THEME_COOKIE } from "@/lib/ui/theme";
import { actorState, resetActorState } from "../helpers/actor-state";
import { asSeedUser, invokeAction, seedOnce, seeded } from "../helpers/actors";
import { testDb } from "../setup/db";

/**
 * TC-THEME-004 — console theme preference persistence (RASOIOS-ADR-016). Saved on the signed-in person's own USER row
 * (never an id from input), mirrored in the pre-paint cookie, and separate from every restaurant's website theme.
 */
const db = testDb();

beforeAll(seedOnce, 120_000);

describe("TC-THEME-004 theme preference", () => {
  it("saves the choice on the person's account and in the cookie; a new device gets it back", async () => {
    await asSeedUser("A", "CASHIER");
    expect(await invokeAction(setThemePreferenceAction, { preference: "LIGHT" })).toMatchObject({ ok: true, data: { preference: "LIGHT" } });
    expect((await db.user.findUniqueOrThrow({ where: { id: seeded("A", "user:CASHIER") } })).themePreference).toBe("LIGHT");
    expect(actorState.cookies.get(THEME_COOKIE)).toBe("LIGHT");

    // Another browser: no cookie yet → the saved preference comes back and the cookie is restored.
    actorState.cookies.delete(THEME_COOKIE);
    expect(await invokeAction(getThemePreferenceAction)).toMatchObject({ ok: true, data: { preference: "LIGHT" } });
    expect(actorState.cookies.get(THEME_COOKIE)).toBe("LIGHT");
  });

  it("only changes the caller's own row, and never a restaurant website theme", async () => {
    const before = await db.restaurant.findMany({ select: { tenantId: true, themeSurfaceMode: true, themePreset: true } });
    const otherBefore = (await db.user.findUniqueOrThrow({ where: { id: seeded("A", "user:MANAGER") } })).themePreference;

    await asSeedUser("A", "TENANT_ADMIN");
    await invokeAction(setThemePreferenceAction, { preference: "SYSTEM" });

    expect(await db.restaurant.findMany({ select: { tenantId: true, themeSurfaceMode: true, themePreset: true } })).toEqual(before);
    expect((await db.user.findUniqueOrThrow({ where: { id: seeded("A", "user:MANAGER") } })).themePreference).toBe(otherBefore);
  });

  it("rejects unknown values and extra fields (a userId cannot be smuggled in)", async () => {
    await asSeedUser("A", "WAITER");
    expect(await invokeAction(setThemePreferenceAction, { preference: "NEON" } as never)).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });
    expect(await invokeAction(setThemePreferenceAction, { preference: "DARK", userId: seeded("B", "user:TENANT_ADMIN") } as never)).toMatchObject({
      ok: false,
      error: { code: "VALIDATION_ERROR" },
    });
  });

  it("requires a signed-in person", async () => {
    resetActorState();
    const result = await invokeAction(setThemePreferenceAction, { preference: "LIGHT" });
    expect("ok" in result && result.ok).toBe(false);
  });
});
