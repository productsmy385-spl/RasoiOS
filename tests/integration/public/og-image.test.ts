import { beforeAll, describe, expect, it, vi } from "vitest";
import OpengraphImage, { contentType, size } from "@/app/r/[slug]/opengraph-image";
import { testDb } from "../setup/db";
import { asAnonymous, seedOnce, tenantIdOf } from "../helpers/actors";

/**
 * TC-WEB-009 — the social preview card (S1-P09-T006). The route is public, so these run signed out: nothing about it
 * may depend on a session.
 */
const db = testDb();
const A = tenantIdOf("A");

beforeAll(seedOnce, 120_000);

const render = (slug: string) => OpengraphImage({ params: Promise.resolve({ slug }) });

describe("TC-WEB-009 the Open Graph image", () => {
  it("declares a 1200×630 PNG", () => {
    expect(size).toEqual({ width: 1200, height: 630 });
    expect(contentType).toBe("image/png");
  });

  it("renders for a published restaurant, without a session", async () => {
    asAnonymous();
    const image = await render("spice-route");
    expect(image).toBeTruthy();
    // ImageResponse is a Response; the PNG itself is produced by the renderer, so what is asserted here is that the
    // route resolved its restaurant and handed back an image rather than a redirect or an error.
    expect((image as Response).headers.get("content-type")).toContain("image");
  });

  it("refuses an unknown slug, a suspended tenant and an unpublished website identically", async () => {
    asAnonymous();
    await expect(render("no-such-restaurant")).rejects.toThrow();

    await db.restaurant.update({ where: { tenantId: A }, data: { websitePublished: false } });
    await expect(render("spice-route"), "unpublished").rejects.toThrow();
    await db.restaurant.update({ where: { tenantId: A }, data: { websitePublished: true } });

    await db.tenant.update({ where: { id: A }, data: { status: "SUSPENDED" } });
    await expect(render("spice-route"), "suspended").rejects.toThrow();
    await db.tenant.update({ where: { id: A }, data: { status: "ACTIVE" } });
  });

  it("never fetches a logo whose host is not allowlisted", async () => {
    asAnonymous();
    const spy = vi.fn(async () => new Response(new Uint8Array([1]), { status: 200, headers: { "content-type": "image/png" } }));
    vi.stubGlobal("fetch", spy);
    try {
      await db.restaurant.update({ where: { tenantId: A }, data: { logoUrl: "https://not-allowlisted.example.net/logo.png" } });
      await render("spice-route");
      expect(spy).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
      await db.restaurant.update({ where: { tenantId: A }, data: { logoUrl: null } });
    }
  });
});
