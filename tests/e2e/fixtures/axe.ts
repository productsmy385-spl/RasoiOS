import AxeBuilder from "@axe-core/playwright";
import { expect, test as base, type Page } from "@playwright/test";

/** Impacts that fail a test (knowledge/implementation/slice-01/testing.md §6, REQ-DS-009). */
const BLOCKING_IMPACTS = new Set(["serious", "critical"]);

export async function axeCheck(page: Page, options: { exclude?: string[] } = {}): Promise<void> {
  let builder = new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]);
  for (const selector of options.exclude ?? []) builder = builder.exclude(selector);
  const results = await builder.analyze();
  const blocking = results.violations.filter((v) => v.impact && BLOCKING_IMPACTS.has(v.impact));
  const summary = blocking.map((v) => `${v.impact}: ${v.id} — ${v.help} (${v.nodes.length} node(s))`);
  expect(summary, `Accessibility violations on ${page.url()}`).toEqual([]);
}

export const test = base.extend<{ axe: (options?: { exclude?: string[] }) => Promise<void> }>({
  axe: async ({ page }, use) => {
    await use((options) => axeCheck(page, options));
  },
});

export { expect };
