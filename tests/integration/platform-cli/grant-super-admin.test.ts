import { spawnSync } from "node:child_process"; // eslint-disable-line no-restricted-imports -- runs the CLI to prove it refuses without --confirm
import path from "node:path";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { grantSuperAdmin } from "@/lib/platform/grant-super-admin";
import { createUser } from "../../factories";
import { disconnectTestDb, resetDatabase, testDb } from "../setup/db";

// TC-ADMIN-012 — the SUPER_ADMIN bootstrap command (S1-P06-T008).
const db = testDb();
const root = path.resolve(__dirname, "../../..");
afterAll(disconnectTestDb);
beforeEach(() => resetDatabase(db));

describe("TC-ADMIN-012 grant SUPER_ADMIN", () => {
  it("grants the role once, is idempotent and writes exactly one audit row", async () => {
    const first = await grantSuperAdmin(db, "  Owner@Example.TEST ", "req-grant-1");
    expect(first).toMatchObject({ outcome: "GRANTED", needsInvitation: true });
    const second = await grantSuperAdmin(db, "owner@example.test", "req-grant-2");
    expect(second).toMatchObject({ outcome: "ALREADY_SUPER_ADMIN", userId: first.userId });

    const user = await db.user.findUniqueOrThrow({ where: { email: "owner@example.test" } });
    expect(user.platformRole).toBe("SUPER_ADMIN");
    expect(await db.userTenant.count({ where: { userId: user.id } })).toBe(0);
    const audits = await db.auditLog.findMany({ where: { action: "platform.role_changed" } });
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({ actorType: "SYSTEM", resourceId: user.id, afterState: { platformRole: "SUPER_ADMIN" } });
  });

  it("promotes an existing user and keeps their identity link", async () => {
    const existing = await createUser(db, { email: "staff@example.test" });
    await db.user.update({ where: { id: existing.id }, data: { clerkUserId: "user_linked" } });
    expect(await grantSuperAdmin(db, "staff@example.test", "req-grant-3")).toMatchObject({ outcome: "GRANTED", userId: existing.id, needsInvitation: false });
    expect((await db.user.findUniqueOrThrow({ where: { id: existing.id } })).clerkUserId).toBe("user_linked");
  });

  it("rejects an invalid email", async () => {
    await expect(grantSuperAdmin(db, "not-an-email", "req-x")).rejects.toThrow(RangeError);
  });

  it("the CLI refuses without --confirm and changes nothing", () => {
    const result = spawnSync(process.execPath, [path.join(root, "node_modules/tsx/dist/cli.mjs"), "scripts/grant-super-admin.ts", "--email", "cli@example.test"], {
      cwd: root,
      env: { ...process.env },
      encoding: "utf8",
      timeout: 60_000,
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Refusing: add --confirm");
  }, 60_000);

  it("the CLI grants with --confirm (no invitation) and prints no secrets", async () => {
    const result = spawnSync(
      process.execPath,
      [path.join(root, "node_modules/tsx/dist/cli.mjs"), "scripts/grant-super-admin.ts", "--email", "cli.owner@example.test", "--confirm", "--no-invite"],
      { cwd: root, env: { ...process.env }, encoding: "utf8", timeout: 60_000 },
    );
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("Granted SUPER_ADMIN to c***@example.test.");
    expect(result.stdout + result.stderr).not.toMatch(/sk_(test|live)_|postgres(ql)?:\/\//);
    expect((await db.user.findUniqueOrThrow({ where: { email: "cli.owner@example.test" } })).platformRole).toBe("SUPER_ADMIN");
  }, 60_000);
});
