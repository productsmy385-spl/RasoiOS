// Next.js server boot hook. Validates the environment before any request is served (S1-P01-T004).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertEnv } = await import("./lib/env");
    assertEnv();
  }
}
