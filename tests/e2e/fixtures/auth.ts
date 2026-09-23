import { clerk, setupClerkTestingToken } from "@clerk/testing/playwright";
import type { Page } from "@playwright/test";

/**
 * Signs in an existing Clerk development-instance user by email (ticket strategy via Clerk Backend API).
 * Requires the `clerk-setup` project to have run (see playwright.config.ts) and the user to exist.
 * Role/tenant-aware helpers (`signInAs(role, tenant)`) are added with the seed users in S1-P03-T001.
 */
export async function signInWithEmail(page: Page, emailAddress: string): Promise<void> {
  await setupClerkTestingToken({ page });
  await page.goto("/sign-in");
  await clerk.signIn({ page, emailAddress });
}
