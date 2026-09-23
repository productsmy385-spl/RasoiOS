import { clerkSetup } from "@clerk/testing/playwright";
import { test as setup } from "@playwright/test";

// Obtains a Clerk testing token so authenticated specs bypass bot protection.
// Requires CLERK_PUBLISHABLE_KEY/NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY of a *development* instance.
setup("configure Clerk testing token", async () => {
  await clerkSetup();
});
