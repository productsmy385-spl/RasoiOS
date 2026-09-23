import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { AUDIT_STATE_MAX_BYTES, redactAuditState } from "@/lib/audit/redact";
import { AUDIT_ACTIONS, isAuditAction, type AuditAction } from "@/lib/audit/actions";

// TC-AUDIT-004 — audit state redaction (S1-P04-T010, SC-AUD-04, SC-PII-03).
describe("TC-AUDIT-004 audit redaction", () => {
  it("removes credential-like keys entirely", () => {
    const state = redactAuditState({
      status: "ACTIVE",
      tokenHash: "abc",
      pairingCodeHash: "def",
      claimToken: "ghi",
      password: "x",
      otp: "123456",
      apiKey: "k",
      nested: { secret: "s", webhookSignature: "v1,xyz", kept: true },
    });
    expect(state).toEqual({ status: "ACTIVE", nested: { kept: true } });
  });

  it("masks customer phone, email, names and free-text notes", () => {
    const state = redactAuditState({
      fullName: "Asha Rao",
      phoneE164: "+919876543210",
      email: "asha.rao@example.com",
      notes: "Allergic to peanuts",
      addressLine1: "12 MG Road",
      orderNumber: "20260915-0001",
    });
    expect(state).toEqual({
      fullName: "A. R.",
      phoneE164: "+91********10",
      email: "a***@example.com",
      notes: "[TEXT]",
      addressLine1: "[TEXT]",
      orderNumber: "20260915-0001",
    });
  });

  it("serialises Decimals and Dates and keeps money exact", () => {
    const state = redactAuditState({ total: new Prisma.Decimal("480.10"), at: new Date("2026-09-15T10:00:00Z") });
    expect(state).toEqual({ total: "480.1", at: "2026-09-15T10:00:00.000Z" });
  });

  it("caps oversized states at 16 KB with a summary of keys", () => {
    const state = redactAuditState({ big: "x".repeat(AUDIT_STATE_MAX_BYTES + 10), other: 1 });
    expect(state).toEqual({ truncated: true, keys: ["big", "other"] });
  });

  it("passes null and undefined through", () => {
    expect(redactAuditState(null)).toBeNull();
    expect(redactAuditState(undefined)).toBeNull();
  });
});

describe("audit action catalogue", () => {
  it("contains the security.md §7 names and no duplicates", () => {
    expect(new Set(AUDIT_ACTIONS).size).toBe(AUDIT_ACTIONS.length);
    for (const action of ["tenant.created", "user.linked", "order.created", "payment.recorded", "print_job.failed", "session.tenant_switched"]) {
      expect(isAuditAction(action), action).toBe(true);
    }
    expect(isAuditAction("order.deleted")).toBe(false);
  });

  it("rejects unknown actions at compile time", () => {
    // @ts-expect-error — "order.deleted" is not an audit action (TC-AUDIT-004 acceptance: type-checking fails).
    const invalid: AuditAction = "order.deleted";
    expect(invalid).toBe("order.deleted");
  });
});
