import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { PrintJobStatus, PrintJobType, PrinterConnection, PrinterPurpose } from "@prisma/client";
import type { NextRequest } from "next/server";
import type { ActionResult } from "@/lib/http/action";
import { testDb } from "../setup/db";
import { invokeRoute, seeded, tenantIdOf, type ControlFlow, type TenantKey } from "../helpers/actors";

/**
 * Shared fixtures for the printing suites (S1-P16-T001…T008).
 *
 * Agents are created with a known token the same way the server does — a `rsa_…` secret whose SHA-256 hash is what is
 * stored — so the tests exercise the real `requireAgent` lookup without going through pairing every time (pairing has
 * its own rate limit and its own tests).
 */
const db = testDb();

export const sha256Hex = (value: string) => createHash("sha256").update(value, "utf8").digest("hex");

export function dataOf<T>(result: ActionResult<T> | ControlFlow): T {
  if (!("ok" in result) || !result.ok) throw new Error(`Expected ok, got ${JSON.stringify(result)}`);
  return result.data;
}

export function errorOf(result: ActionResult<unknown> | ControlFlow): { code: string; message: string } {
  if (!("ok" in result) || result.ok) throw new Error(`Expected an error, got ${JSON.stringify(result)}`);
  return { code: result.error.code, message: result.error.message };
}

export type RouteHandler = (request: NextRequest, context: { params: Promise<Record<string, string>> }) => Promise<Response>;

/**
 * Calls an agent route with a bearer token and a per-test source address, so the pairing limiter gives each test its
 * own bucket.
 *
 * The address only counts when the app can prove it (`lib/http/client-ip.ts`): a caller-written `X-Forwarded-For` is
 * ignored unless `TRUSTED_PROXY_HOPS` says a proxy of ours added it. A test that depends on distinct buckets therefore
 * stubs one trusted hop, which is also how staging and production run (deployment.md).
 */
export const TRUSTED_HOPS_FOR_TESTS = "1";

export async function callAgent(
  handler: unknown,
  options: { url: string; method?: string; body?: unknown; token?: string | null; params?: Record<string, string>; ip?: string },
) {
  return invokeRoute(handler as RouteHandler, {
    url: options.url,
    method: options.method ?? "POST",
    ...(options.body === undefined ? {} : { body: options.body }),
    ...(options.params ? { params: options.params } : {}),
    headers: {
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
      "x-forwarded-for": options.ip ?? `10.9.${Math.floor(Math.random() * 250) + 1}.${Math.floor(Math.random() * 250) + 1}`,
    },
  });
}

export type TestAgent = { agentId: string; token: string; tenantId: string };

/** An ACTIVE agent of `tenant` with a freshly minted token. */
export async function activeAgent(tenant: TenantKey, options: { name?: string; lastSeenAt?: Date | null } = {}): Promise<TestAgent> {
  const token = `rsa_${randomBytes(24).toString("base64url")}`;
  const agent = await db.printAgent.create({
    data: {
      tenantId: tenantIdOf(tenant),
      name: options.name ?? `Agent ${randomUUID().slice(0, 8)}`,
      status: "ACTIVE",
      tokenHash: sha256Hex(token),
      tokenPrefix: token.slice(0, 8),
      agentVersion: "1.0.0",
      osInfo: "Windows 11",
      pairedAt: new Date(),
      lastSeenAt: options.lastSeenAt === undefined ? new Date() : options.lastSeenAt,
      createdByUserId: seeded(tenant, "user:TENANT_ADMIN"),
    },
  });
  return { agentId: agent.id, token, tenantId: agent.tenantId };
}

/** A printer of `tenant`, optionally bound to an agent and a kitchen section. */
export async function testPrinter(
  tenant: TenantKey,
  options: {
    agentId?: string | null;
    kitchenSectionId?: string | null;
    purpose?: PrinterPurpose;
    connectionType?: PrinterConnection;
    connectionAddress?: string;
    paperWidthMm?: number;
    isActive?: boolean;
    name?: string;
  } = {},
) {
  return db.printer.create({
    data: {
      tenantId: tenantIdOf(tenant),
      name: options.name ?? `Printer ${randomUUID().slice(0, 8)}`,
      purpose: options.purpose ?? "KOT_AND_RECEIPT",
      connectionType: options.connectionType ?? "LAN",
      connectionAddress: options.connectionAddress ?? "192.168.1.50:9100",
      paperWidthMm: options.paperWidthMm ?? 80,
      isActive: options.isActive ?? true,
      printAgentId: options.agentId ?? null,
      kitchenSectionId: options.kitchenSectionId ?? null,
    },
  });
}

/** A print job of `tenant` on `printerId`, in any state a test needs. */
export async function testJob(
  tenant: TenantKey,
  printerId: string,
  options: {
    status?: PrintJobStatus;
    jobType?: PrintJobType;
    printAgentId?: string | null;
    claimToken?: string | null;
    leaseExpiresAt?: Date | null;
    nextAttemptAt?: Date;
    attemptCount?: number;
    maxAttempts?: number;
    dedupeKey?: string;
    kotTicketId?: string | null;
    orderId?: string | null;
    isReprint?: boolean;
  } = {},
) {
  const status = options.status ?? "PENDING";
  return db.printJob.create({
    data: {
      tenantId: tenantIdOf(tenant),
      printerId,
      jobType: options.jobType ?? "TEST",
      dedupeKey: options.dedupeKey ?? `TEST:it-${randomUUID()}`,
      payload: { version: 1, widthMm: 80, blocks: [{ type: "text", text: "Test" }, { type: "cut" }] },
      status,
      // `print_jobs_printed_at_check` requires the timestamp whenever the row is PRINTED.
      printedAt: status === "PRINTED" ? new Date() : null,
      failedAt: status === "FAILED" ? new Date() : null,
      attemptCount: options.attemptCount ?? 0,
      maxAttempts: options.maxAttempts ?? 3,
      nextAttemptAt: options.nextAttemptAt ?? new Date(Date.now() - 1000),
      printAgentId: options.printAgentId ?? null,
      claimToken: options.claimToken ?? null,
      leaseExpiresAt: options.leaseExpiresAt ?? null,
      kotTicketId: options.kotTicketId ?? null,
      orderId: options.orderId ?? null,
      isReprint: options.isReprint ?? false,
    },
  });
}

/** Removes every job of a tenant so a claim test sees only the rows it created. */
export async function clearJobs(tenant: TenantKey): Promise<void> {
  await db.printJob.deleteMany({ where: { tenantId: tenantIdOf(tenant) } });
}

export { db as printingDb };
