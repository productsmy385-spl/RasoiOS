import { describe, it, expect, vi } from "vitest";
import { logger } from "@/lib/logger";

describe("Logger Sanitization & Redaction Security Tests", () => {
  it("should redact sensitive fields (passwords, OTPs, secret keys, tokens) from log metadata", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    logger.info("User authentication attempt", {
      email: "user@example.com",
      password: "SuperSecretPassword123!",
      otp: "987654",
      clerkSecretKey: "sk_live_123456789",
      nested: {
        token: "session_token_abc_xyz",
        publicData: "safe_string",
      },
    });

    expect(consoleSpy).toHaveBeenCalledOnce();
    const logOutput = consoleSpy.mock.calls[0][0];
    const parsed = JSON.parse(logOutput);

    expect(parsed.meta.email).toBe("user@example.com");
    expect(parsed.meta.password).toBe("[REDACTED]");
    expect(parsed.meta.otp).toBe("[REDACTED]");
    expect(parsed.meta.clerkSecretKey).toBe("[REDACTED]");
    expect(parsed.meta.nested.token).toBe("[REDACTED]");
    expect(parsed.meta.nested.publicData).toBe("safe_string");

    consoleSpy.mockRestore();
  });
});
