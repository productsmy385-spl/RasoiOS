import { createHash } from "node:crypto";

/**
 * Deterministic UUIDs for seed rows (RFC 4122 version 5, SHA-1 of a fixed namespace + a readable label).
 * The same label always yields the same id, so tests can refer to seeded rows and re-running the seed is idempotent.
 */
const NAMESPACE = Buffer.from("8f0c2d4e6a1b4c3d9e7f5a6b7c8d9e0f", "hex");

export function seedId(label: string): string {
  const hash = createHash("sha1").update(NAMESPACE).update(label, "utf8").digest();
  hash[6] = (hash[6] & 0x0f) | 0x50; // version 5
  hash[8] = (hash[8] & 0x3f) | 0x80; // RFC 4122 variant
  const hex = hash.subarray(0, 16).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** SHA-256 hex, as stored for print-agent tokens and pairing codes (ADR-007). */
export function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}
