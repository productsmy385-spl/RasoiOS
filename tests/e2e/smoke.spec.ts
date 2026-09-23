import { axeCheck, expect, test } from "./fixtures/axe";

// TC-QA-002 — smoke: public entry pages load in every project (S1-P01-T005).
test.describe("TC-QA-002 smoke", () => {
  test("landing page loads", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBeLessThan(400);
    await expect(page.locator("body")).toBeVisible();
  });

  test("sign-in page loads", async ({ page }) => {
    const response = await page.goto("/sign-in");
    expect(response?.status()).toBeLessThan(400);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("axe fixture fails on an injected critical violation", async ({ page }) => {
    await page.setContent(
      `<!doctype html><html lang="en"><head><title>fixture</title></head><body><main><img src="data:image/gif;base64,R0lGODlhAQABAAAAACw="></main></body></html>`,
    );
    await expect(axeCheck(page)).rejects.toThrow(/image-alt/);
  });
});
