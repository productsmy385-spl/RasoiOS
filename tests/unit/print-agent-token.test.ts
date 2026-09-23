import { afterEach, describe, expect, it, vi } from "vitest";
import { AGENT_TOKEN_PREFIX, agentSourceIp, bearerTokenOf, hashesEqual, issueAgentToken, pairRateLimitKey, sha256Hex } from "@/lib/auth/agent";
import { logger, scrubString } from "@/lib/logger";

/**
 * SC-PRINT-01 / SC-AUTH-10 — agent credentials: how they are minted, how they are read off a request, and the
 * guarantee that they never reach a log (S1-P16-T005, ADR-007 §1, security.md §5).
 */
const headers = (entries: Record<string, string>) => ({ headers: new Headers(entries) });

describe("agent token minting", () => {
  it("is 256 bits of CSPRNG output behind the rsa_ prefix, stored only as a SHA-256 hash", () => {
    const first = issueAgentToken();
    const second = issueAgentToken();

    expect(first.token.startsWith(AGENT_TOKEN_PREFIX)).toBe(true);
    expect(first.token).not.toBe(second.token);
    expect(first.token.length).toBeGreaterThan(40);
    expect(first.tokenHash).toBe(sha256Hex(first.token));
    expect(first.tokenHash).toHaveLength(64);
    expect(first.tokenHash).not.toContain(first.token);
    expect(first.tokenPrefix).toBe(first.token.slice(0, 8));
    expect(first.tokenPrefix).toHaveLength(8);
  });

  it("compares digests in constant time and rejects a length mismatch", () => {
    const hash = sha256Hex("code");
    expect(hashesEqual(hash, sha256Hex("code"))).toBe(true);
    expect(hashesEqual(hash, sha256Hex("other"))).toBe(false);
    expect(hashesEqual(hash, "short")).toBe(false);
  });
});

describe("bearer header parsing (fail closed)", () => {
  it("accepts a well-formed header in any case", () => {
    const { token } = issueAgentToken();
    expect(bearerTokenOf(headers({ authorization: `Bearer ${token}` }))).toBe(token);
    expect(bearerTokenOf(headers({ authorization: `bearer ${token}` }))).toBe(token);
    expect(bearerTokenOf(headers({ authorization: `  Bearer   ${token}  ` }))).toBe(token);
  });

  it("returns null for anything else, so the guard never reaches the database with junk", () => {
    const { token } = issueAgentToken();
    for (const header of ["", "Basic abc", `Token ${token}`, "Bearer", "Bearer ", "Bearer short", `Bearer ${"x".repeat(250)}`]) {
      expect(bearerTokenOf(headers(header ? { authorization: header } : {})), header).toBeNull();
    }
    expect(bearerTokenOf(headers({}))).toBeNull();
  });
});

describe("source address (SC-RL-01: a limit keyed on a forgeable value is not a limit)", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("believes only what our own proxies added, so a caller cannot mint a fresh rate-limit bucket", () => {
    const spoofed = { "x-forwarded-for": "9.9.9.9, 203.0.113.5" };

    // No trusted proxy (the local default): nothing can be proved, so nothing is used.
    expect(agentSourceIp(headers(spoofed))).toBeNull();
    expect(agentSourceIp(headers({ "x-real-ip": "198.51.100.7" }))).toBeNull();

    // One trusted proxy: the right-most entry is ours; the caller's own prefix is discarded.
    vi.stubEnv("TRUSTED_PROXY_HOPS", "1");
    expect(agentSourceIp(headers(spoofed))).toBe("203.0.113.5");
    expect(pairRateLimitKey(headers(spoofed))).toBe("203.0.113.5");
    expect(pairRateLimitKey(headers({ "x-forwarded-for": "9.9.9.9, 198.51.100.7" }))).toBe("198.51.100.7");
    expect(agentSourceIp(headers({ "x-forwarded-for": "not-an-address" }))).toBeNull();
    expect(agentSourceIp(headers({}))).toBeNull();
  });

  it("falls back to one shared bucket when no address can be proved, so pairing cannot be limitless", () => {
    expect(pairRateLimitKey(headers({}))).toBe("unknown-source");
    expect(pairRateLimitKey(headers({ "x-forwarded-for": "9.9.9.9" }))).toBe("unknown-source");
  });
});

describe("SC-AUTH-10 tokens never reach a log", () => {
  it("scrubs the token itself, the Authorization header and a pairing code key", () => {
    const { token } = issueAgentToken();
    expect(scrubString(`claiming with ${token}`)).not.toContain(token);
    expect(scrubString(`Authorization: Bearer ${token}`)).not.toContain(token);

    const captured: string[] = [];
    const original = console.log;
    console.log = (line: string) => captured.push(line);
    try {
      logger.info("print_agent.paired", { token, authorization: `Bearer ${token}`, pairingCode: "ABCDEFGH", printAgentId: "agent-1" });
    } finally {
      console.log = original;
    }

    const line = captured.join("\n");
    expect(line).not.toContain(token);
    expect(line).not.toContain("ABCDEFGH");
    expect(line).toContain("[REDACTED]");
    expect(line).toContain("agent-1");
  });
});
