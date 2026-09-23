import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createSocialPostAction, getSocialPostsAction, updateSocialPostStatusAction } from "@/app/restaurant/social/actions";
import type { ActionResult } from "@/lib/http/action";
import { testDb } from "../setup/db";
import { SEED_TENANTS, asSeedUser, invokeAction, seedOnce, seeded, tenantIdOf, type ControlFlow } from "../helpers/actors";

// Social sharing retrofit (S1-P04-T007): LD-SOC-01, SA-SOC-01…05 behind `social:manage` (security.md §3.3 row 49),
// server-built share URLs and honest statuses (no automated publishing, BR-SOC-03).
// Replaces the social half of the mocked tests/unit/social-analytics.test.ts.
const db = testDb();
const APP_URL = "https://app.rasoios.test";
const RANDOM_UUID = "0f1e2d3c-4b5a-4968-8776-a5b4c3d2e1f0";

beforeAll(async () => {
  vi.stubEnv("NEXT_PUBLIC_APP_URL", APP_URL);
  await seedOnce();
}, 120_000);
afterAll(() => {
  vi.unstubAllEnvs();
});

function dataOf<T>(result: ActionResult<T> | ControlFlow): T {
  if (!("ok" in result) || !result.ok) throw new Error(`Expected ok, got ${JSON.stringify(result)}`);
  return result.data;
}

function errorOf(result: ActionResult<unknown> | ControlFlow): { code: string; message: string } {
  if (!("ok" in result) || result.ok) throw new Error(`Expected an error, got ${JSON.stringify(result)}`);
  return { code: result.error.code, message: result.error.message };
}

describe("TI-053 social posts list only the caller's tenant (LD-SOC-01)", () => {
  it("returns exactly Tenant A's posts and none of Tenant B's", async () => {
    await asSeedUser("A", "MANAGER");
    const posts = dataOf(await invokeAction(getSocialPostsAction, {}));
    const aPosts = await db.socialPost.findMany({ where: { tenantId: tenantIdOf("A") }, select: { id: true } });
    const bPosts = await db.socialPost.findMany({ where: { tenantId: tenantIdOf("B") }, select: { id: true } });
    expect(bPosts.length).toBeGreaterThan(0);
    expect(posts.map((p) => p.id).sort()).toEqual(aPosts.map((p) => p.id).sort());
    expect(posts.some((p) => bPosts.some((b) => b.id === p.id))).toBe(false);
  });

  it("TC-RBAC-149 CASHIER, WAITER and KITCHEN are FORBIDDEN (social:manage)", async () => {
    for (const role of ["CASHIER", "WAITER", "KITCHEN"] as const) {
      await asSeedUser("A", role);
      expect(await invokeAction(getSocialPostsAction, {})).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    }
  });
});

describe("TC-SOC-001 create builds the share URL on the server (SA-SOC-01)", () => {
  it("MANAGER creates a DRAFT whose share URL points at the tenant's own public menu, audited", async () => {
    const { userId } = await asSeedUser("A", "MANAGER");
    const post = dataOf(await invokeAction(createSocialPostAction, { caption: "  Weekend special!  ", channel: "INSTAGRAM" }));
    expect(post).toMatchObject({ status: "DRAFT", caption: "Weekend special!", channel: "INSTAGRAM", postedUrl: null, markedPostedAt: null });
    expect(post.shareUrl).toBe(`${APP_URL}/r/${SEED_TENANTS.A.tenant.slug}`);

    const row = await db.socialPost.findUniqueOrThrow({ where: { id: post.id } });
    expect(row).toMatchObject({ tenantId: tenantIdOf("A"), createdByUserId: userId, status: "DRAFT" });
    const audit = await db.auditLog.findMany({ where: { action: "social_post.created", resourceId: post.id } });
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({ tenantId: tenantIdOf("A"), actorUserId: userId });
  });

  it("CASHIER is FORBIDDEN and no post is created", async () => {
    await asSeedUser("A", "CASHIER");
    const before = await db.socialPost.count();
    expect(await invokeAction(createSocialPostAction, { caption: "Hello" })).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    expect(await db.socialPost.count()).toBe(before);
  });

  it("ADV-001 / TI-054 rejects tenantId, a client share URL, a status or a Tenant B source id (422)", async () => {
    await asSeedUser("A", "MANAGER");
    const before = await db.socialPost.count();
    for (const extra of [
      { tenantId: tenantIdOf("B") },
      { shareUrl: "https://evil.example/r/harbour-grill" },
      { status: "MARKED_POSTED" },
      { dailyMenuId: seeded("B", "daily:today") },
    ]) {
      const result = await invokeAction(createSocialPostAction, { caption: "Hi", ...extra } as never);
      expect(result).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });
    }
    expect(await invokeAction(createSocialPostAction, { caption: "   " })).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });
    expect(await db.socialPost.count()).toBe(before);
  });
});

describe("TC-SOC-002 status changes (SA-SOC-02…05)", () => {
  it("DRAFT → READY → MARKED_POSTED records the signed-in attester and audits each step; no other move is allowed", async () => {
    const { userId } = await asSeedUser("A", "MANAGER");
    const post = dataOf(await invokeAction(createSocialPostAction, { caption: "Thali Thursday" }));

    expect(dataOf(await invokeAction(updateSocialPostStatusAction, { postId: post.id, status: "READY" })).status).toBe("READY");
    const posted = dataOf(
      await invokeAction(updateSocialPostStatusAction, { postId: post.id, status: "MARKED_POSTED", postedUrl: "https://instagram.com/p/abc" }),
    );
    expect(posted).toMatchObject({ status: "MARKED_POSTED", postedUrl: "https://instagram.com/p/abc" });
    const row = await db.socialPost.findUniqueOrThrow({ where: { id: post.id } });
    expect(row.markedPostedByUserId).toBe(userId);
    expect(row.markedPostedAt).not.toBeNull();

    const actions = (await db.auditLog.findMany({ where: { resourceId: post.id }, orderBy: { createdAt: "asc" } })).map((a) => a.action);
    expect(actions).toEqual(["social_post.created", "social_post.marked_ready", "social_post.marked_posted"]);

    const back = await invokeAction(updateSocialPostStatusAction, { postId: post.id, status: "DRAFT" });
    expect(back).toMatchObject({ ok: false, error: { code: "INVALID_TRANSITION" } });
    expect(dataOf(await invokeAction(updateSocialPostStatusAction, { postId: post.id, status: "ARCHIVED" })).status).toBe("ARCHIVED");
  });

  it("there is no PUBLISHED status and a posted link is https-only and only for MARKED_POSTED (422)", async () => {
    await asSeedUser("A", "MANAGER");
    const post = dataOf(await invokeAction(createSocialPostAction, { caption: "Biryani Sunday" }));
    const invalid = [
      { postId: post.id, status: "PUBLISHED" },
      { postId: post.id, status: "READY", postedUrl: "https://instagram.com/p/x" },
      { postId: post.id, status: "MARKED_POSTED", postedUrl: "http://instagram.com/p/x" },
    ];
    for (const input of invalid) {
      expect(await invokeAction(updateSocialPostStatusAction, input as never)).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });
    }
    expect((await db.socialPost.findUniqueOrThrow({ where: { id: post.id } })).status).toBe("DRAFT");
  });

  it("ADV-002 Tenant A updating Tenant B's post is NOT_FOUND, identical to a random UUID; Tenant B's post is unchanged", async () => {
    await asSeedUser("A", "MANAGER");
    const bPostId = seeded("B", "social:draft");
    const foreign = errorOf(await invokeAction(updateSocialPostStatusAction, { postId: bPostId, status: "READY" }));
    const random = errorOf(await invokeAction(updateSocialPostStatusAction, { postId: RANDOM_UUID, status: "READY" }));
    expect(foreign.code).toBe("NOT_FOUND");
    expect(foreign).toEqual(random);
    const bPost = await db.socialPost.findUniqueOrThrow({ where: { id: bPostId } });
    expect(bPost).toMatchObject({ tenantId: tenantIdOf("B"), status: "DRAFT" });
    expect(await db.auditLog.count({ where: { resourceId: bPostId } })).toBe(0);
  });

  it("ADV-001 a tenantId in the update body is rejected (422)", async () => {
    await asSeedUser("A", "MANAGER");
    const result = await invokeAction(updateSocialPostStatusAction, { postId: seeded("A", "social:draft"), status: "READY", tenantId: tenantIdOf("A") } as never);
    expect(result).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });
    expect((await db.socialPost.findUniqueOrThrow({ where: { id: seeded("A", "social:draft") } })).status).toBe("DRAFT");
  });
});
