import { describe, it, expect, vi, afterEach } from "vitest";
import { logger, scrubString } from "@/lib/logger";

// Log redaction (S1-P03-T009, SC-AUTH-10, SC-LOG-02). Integration coverage of real flows: TC-AUTH-011.
afterEach(() => vi.restoreAllMocks());

function captured(fn: () => void): Record<string, any> {
  const spy = vi.spyOn(console, "log").mockImplementation(() => {});
  fn();
  const line = spy.mock.calls[0][0] as string;
  return JSON.parse(line);
}

describe("key-based redaction", () => {
  it("redacts passwords, OTPs, secret keys and tokens, including nested ones", () => {
    const parsed = captured(() =>
      logger.info("User authentication attempt", {
        email: "user@example.com",
        password: "SuperSecretPassword123!",
        otp: "987654",
        clerkSecretKey: "sk_live_123456789",
        nested: { token: "session_token_abc_xyz", publicData: "safe_string" },
      }),
    );
    expect(parsed.meta.email).toBe("u***@example.com");
    expect(parsed.meta.password).toBe("[REDACTED]");
    expect(parsed.meta.otp).toBe("[REDACTED]");
    expect(parsed.meta.clerkSecretKey).toBe("[REDACTED]");
    expect(parsed.meta.nested.token).toBe("[REDACTED]");
    expect(parsed.meta.nested.publicData).toBe("safe_string");
  });

  it("redacts session, cookie, signature, API-key and pairing-code keys in any spelling", () => {
    const parsed = captured(() =>
      logger.info("request", {
        __session: "abc",
        "set-cookie": "x=1",
        "svix-signature": "v1,abc",
        apiKey: "k",
        api_key: "k",
        pairingCode: "123456",
        invitationTicket: "tkt",
        sessionId: "sess_1",
        status: 200,
      }),
    );
    for (const key of ["__session", "set-cookie", "svix-signature", "apiKey", "api_key", "pairingCode", "invitationTicket", "sessionId"]) {
      expect(parsed.meta[key], key).toBe("[REDACTED]");
    }
    expect(parsed.meta.status).toBe(200);
  });

  it("sanitises Headers objects", () => {
    const headers = new Headers({ authorization: "Bearer abc.def.ghi", cookie: "__session=xyz", "x-request-id": "req-1", "user-agent": "Test" });
    const parsed = captured(() => logger.info("headers", { headers }));
    expect(parsed.meta.headers).toEqual({ authorization: "[REDACTED]", cookie: "[REDACTED]", "x-request-id": "req-1", "user-agent": "Test" });
  });
});

describe("value-based scrubbing", () => {
  it.each([
    ["Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.sig", "Bearer eyJ"],
    ["key sk_test_abcdef0123456789 leaked", "sk_test_"],
    ["secret whsec_c2VjcmV0c2VjcmV0c2VjcmV0 here", "whsec_"],
    ["sig v1,K5oZfzN95Z9UVu1EsfQmfVNQhnkZ2pj9o9NDN/H/pI4= end", "v1,K5o"],
    ["cookie __session=eyJhbGci.payload.sig; path=/", "__session="],
    ["agent rsa_AbCdEfGhIjKlMnOpQrSt012345 token", "rsa_AbCd"],
  ])("removes secrets from %j", (input, secret) => {
    const out = scrubString(input);
    expect(out).toContain("[REDACTED]");
    expect(out).not.toContain(secret);
  });

  it("masks emails, phone numbers and card-like numbers", () => {
    expect(scrubString("invite asha.rao@example.com now")).toBe("invite a***@example.com now");
    expect(scrubString("call +919876543210")).toBe("call +91********10");
    expect(scrubString("card 4111 1111 1111 1111 used")).toBe("card [CARD] used");
    expect(scrubString("order 20260915-0042 id 3f2b6c1e-5a4d-4b3c-9e8f-0a1b2c3d4e5f")).toBe("order 20260915-0042 id 3f2b6c1e-5a4d-4b3c-9e8f-0a1b2c3d4e5f");
  });

  it("scrubs the message and error objects too", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logger.error("failed for sk_live_abcdef012345", { error: new Error("token Bearer abc.def leaked") });
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.message).toBe("failed for [REDACTED]");
    expect(parsed.meta.error).toEqual({ name: "Error", message: "token [REDACTED] leaked" });
  });
});
