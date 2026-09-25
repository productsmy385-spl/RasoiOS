import { clerkSetup } from "@clerk/testing/playwright";
import { expect, test, type Page } from "@playwright/test";
import { signInWithEmail } from "./fixtures/auth";

/**
 * TC-RESP-001…003 — no page is wider than the screen (frontend.md §3, responsive 320–1920).
 *
 * For every route and width: `document.documentElement.scrollWidth <= clientWidth`, with no tolerance. When it fails,
 * the message names the outermost elements that stick out — the cause, not the symptom. Content inside a container that
 * is *meant* to scroll sideways (a data table, a category strip: any ancestor with overflow-x auto/scroll/hidden/clip)
 * is not an offender.
 *
 * Public pages always run. Console pages run when E2E_STAFF_EMAIL (a development-instance Clerk user with a tenant
 * membership) is set; admin pages when E2E_ADMIN_EMAIL (a SUPER_ADMIN) is set.
 */
const WIDTHS = [320, 360, 375, 390, 430, 768, 1024, 1440] as const;
// The seeded development restaurant by default; set E2E_PUBLIC_SLUG to audit a real one on a deployed site
// (e.g. akshayapatra-devarapalli), where spice-route does not exist.
const PUBLIC_SLUG = process.env.E2E_PUBLIC_SLUG ?? "spice-route";
const PUBLIC_ROUTES = ["/", "/sign-in", `/r/${PUBLIC_SLUG}`, `/r/${PUBLIC_SLUG}/daily`];
const CONSOLE_ROUTES = [
  "/restaurant/dashboard",
  "/restaurant/orders",
  "/restaurant/orders/new",
  "/restaurant/kitchen",
  "/restaurant/menu/items",
  "/restaurant/daily-menu",
  "/restaurant/transactions",
  "/restaurant/customers",
  "/restaurant/reports",
  "/restaurant/printing",
  "/restaurant/staff",
  "/restaurant/settings",
  "/restaurant/website",
  "/restaurant/social",
  "/restaurant/audit",
];
const ADMIN_ROUTES = ["/admin", "/admin/tenants", "/admin/audit"];

type Overflow = { clientWidth: number; scrollWidth: number; offenders: string[] };

async function measure(page: Page): Promise<Overflow> {
  return page.evaluate(() => {
    const clientWidth = document.documentElement.clientWidth;
    const scrollWidth = document.documentElement.scrollWidth;
    const clipsX = (el: Element) => /(auto|scroll|hidden|clip)/.test(getComputedStyle(el).overflowX);
    const describe = (el: Element) => {
      const id = el.id ? `#${el.id}` : "";
      const cls = typeof el.className === "string" ? `.${el.className.trim().split(/\s+/).slice(0, 4).join(".")}` : "";
      const text = (el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 40);
      return `${el.tagName.toLowerCase()}${id}${cls} "${text}"`;
    };
    const out: Element[] = [];
    for (const el of Array.from(document.body.querySelectorAll("*"))) {
      const rect = el.getBoundingClientRect();
      // Zero-size and 1 px visually-hidden (sr-only) elements cannot widen the page.
      if (rect.width <= 1 || rect.height <= 1) continue;
      if (rect.right <= clientWidth + 0.5 && rect.left >= -0.5) continue;
      let clipped = false;
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        if (clipsX(p)) {
          clipped = true;
          break;
        }
      }
      if (clipped) continue;
      // Report only the outermost offender of each branch.
      if (out.some((o) => o.contains(el))) continue;
      out.push(el);
    }
    return { clientWidth, scrollWidth, offenders: out.slice(0, 6).map((el) => `${describe(el)} right=${Math.round(el.getBoundingClientRect().right)}`) };
  });
}

async function expectNoOverflow(page: Page, route: string, width: number) {
  await page.setViewportSize({ width, height: 800 });
  // "load", not "networkidle": console pages poll (orders, kitchen, printing), so the network is never idle for long.
  await page.goto(route, { waitUntil: "load" });
  await page.waitForTimeout(300);
  const result = await measure(page);
  expect.soft(result.scrollWidth, `${route} @${width}px is ${result.scrollWidth}px wide:\n  ${result.offenders.join("\n  ")}`).toBeLessThanOrEqual(result.clientWidth);
}

test.beforeEach(({}, testInfo) => {
  testInfo.setTimeout(240_000);
  // The spec sets every viewport itself; running it again under the tablet/mobile projects would only repeat it.
  test.skip(testInfo.project.name !== "desktop-chromium", "viewport matrix runs once, in desktop-chromium");
});
// Signed-in suites need a Clerk testing token in this worker (development instance only).
test.beforeAll(async () => {
  if (process.env.E2E_STAFF_EMAIL || process.env.E2E_ADMIN_EMAIL) await clerkSetup();
});

test.describe("TC-RESP-001 public pages fit every width", () => {
  for (const route of PUBLIC_ROUTES) {
    test(route, async ({ page }) => {
      for (const width of WIDTHS) await expectNoOverflow(page, route, width);
    });
  }
});

test.describe("TC-RESP-002 console pages fit every width", () => {
  test.skip(!process.env.E2E_STAFF_EMAIL, "set E2E_STAFF_EMAIL to a development Clerk user with a tenant membership");
  for (const route of CONSOLE_ROUTES) {
    test(route, async ({ page }) => {
      await signInWithEmail(page, process.env.E2E_STAFF_EMAIL!);
      for (const width of WIDTHS) await expectNoOverflow(page, route, width);
    });
  }
});

test.describe("TC-RESP-003 platform admin pages fit every width", () => {
  test.skip(!process.env.E2E_ADMIN_EMAIL, "set E2E_ADMIN_EMAIL to a development Clerk SUPER_ADMIN");
  for (const route of ADMIN_ROUTES) {
    test(route, async ({ page }) => {
      await signInWithEmail(page, process.env.E2E_ADMIN_EMAIL!);
      for (const width of WIDTHS) await expectNoOverflow(page, route, width);
    });
  }
});

test.describe("TC-RESP-004 mobile side panel and bottom bar", () => {
  test.skip(!process.env.E2E_STAFF_EMAIL, "set E2E_STAFF_EMAIL to a development Clerk user with a tenant membership");

  test("☰ opens the side panel, it fits the screen, and choosing a feature navigates and closes it", async ({ page }) => {
    await signInWithEmail(page, process.env.E2E_STAFF_EMAIL!);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/restaurant/dashboard", { waitUntil: "load" });

    await page.getByRole("button", { name: "Open menu" }).click();
    const panel = page.getByRole("navigation", { name: "All features" });
    await expect(panel).toBeVisible();
    const box = await panel.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(375);
    expect(await panel.getByRole("link").count()).toBeGreaterThan(4);

    await panel.getByRole("link", { name: "Orders" }).click();
    // The development server may compile the page on first visit; allow for it.
    await expect(page).toHaveURL(/\/restaurant\/orders/, { timeout: 30_000 });
    await expect(panel).toBeHidden();
  });

  test("bottom bar icons share one baseline and equal widths", async ({ page }) => {
    await signInWithEmail(page, process.env.E2E_STAFF_EMAIL!);
    for (const width of [320, 375, 430]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/restaurant/dashboard", { waitUntil: "load" });
      const bar = page.getByRole("navigation", { name: "Primary" });
      const slots = await bar.locator(":scope > div > *").evaluateAll((els) =>
        els.map((el) => {
          const pill = el.firstElementChild!.getBoundingClientRect();
          const slot = el.getBoundingClientRect();
          return { width: Math.round(slot.width), pillTop: Math.round(pill.top), right: slot.right };
        }),
      );
      expect(slots.length, `${width}px slot count`).toBeGreaterThan(2);
      expect(new Set(slots.map((s) => s.pillTop)).size, `${width}px: every icon on one line`).toBe(1);
      expect(Math.max(...slots.map((s) => s.width)) - Math.min(...slots.map((s) => s.width)), `${width}px: equal slots`).toBeLessThanOrEqual(1);
      expect(Math.max(...slots.map((s) => s.right))).toBeLessThanOrEqual(width);
    }
  });
});
