import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FetchLike } from "@/print-agent/src/api";
import { EXIT, runCli } from "@/print-agent/src/cli";

/** S1-P17-T003 acceptance — pairing messages tell a bad code from a network problem, and nothing leaks. */
const TOKEN = `rsa_${"Z".repeat(43)}`;
let home: string;
let out: string[];
let err: string[];
const io = { out: (line: string) => out.push(line), err: (line: string) => err.push(line) };

beforeEach(async () => {
  home = await mkdtemp(path.join(os.tmpdir(), "rasoios-cli-"));
  out = [];
  err = [];
});
afterEach(async () => {
  await rm(home, { recursive: true, force: true });
});

const json = (status: number, body: unknown): FetchLike => async () => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const env = () => ({ RASOIOS_AGENT_HOME: home });

describe("pair", () => {
  it("stores the credential and reports success", async () => {
    const fetch = json(201, { agentId: "8a1a4c32-5d6e-4f70-8a91-b2c3d4e5f601", token: TOKEN, printers: [], pollIntervalMs: 3000, heartbeatIntervalMs: 30000 });
    expect(await runCli(["pair", "abcd-2345", "--server", "https://app.rasoios.in"], { env: env(), fetch, io })).toBe(EXIT.OK);
    expect(out.join("\n")).toContain("Paired");
    expect(out.join("\n")).not.toContain(TOKEN);
    expect(await readFile(path.join(home, "credentials.json"), "utf8")).toContain(TOKEN);
    expect(await readFile(path.join(home, "config.json"), "utf8")).not.toContain(TOKEN);
  });

  it("an invalid or expired code says so", async () => {
    const fetch = json(401, { error: { code: "INVALID_PAIRING_CODE", message: "Invalid or expired pairing code." } });
    expect(await runCli(["pair", "ABCD2345", "--server", "https://app.rasoios.in"], { env: env(), fetch, io })).toBe(EXIT.ERROR);
    expect(err.join("\n")).toMatch(/not valid or has expired/);
  });

  it("a network failure says so, without server details", async () => {
    const fetch: FetchLike = async () => {
      throw new TypeError("getaddrinfo ENOTFOUND app.rasoios.in 10.0.0.1");
    };
    expect(await runCli(["pair", "ABCD2345", "--server", "https://app.rasoios.in"], { env: env(), fetch, io })).toBe(EXIT.ERROR);
    expect(err.join("\n")).toMatch(/Could not reach the server/);
    expect(err.join("\n")).not.toMatch(/ENOTFOUND|10\.0\.0\.1/);
  });

  it("refuses an http server", async () => {
    expect(await runCli(["pair", "ABCD2345", "--server", "http://app.rasoios.in"], { env: env(), io })).toBe(EXIT.ERROR);
    expect(err.join("\n")).toMatch(/https/);
  });
});

describe("run / status without pairing", () => {
  it("exit code 2 so the service manager does not restart-loop", async () => {
    await runCli(["pair", "ABCD2345", "--server", "https://app.rasoios.in"], { env: env(), fetch: json(401, { error: { code: "INVALID_PAIRING_CODE" } }), io });
    expect(await runCli(["run"], { env: env(), io })).toBe(EXIT.NEEDS_PAIRING);
    expect(await runCli(["status"], { env: env(), io })).toBe(EXIT.NEEDS_PAIRING);
  });

  it("refuses to send the token to a different server than the one that issued it", async () => {
    const fetch = json(201, { agentId: "8a1a4c32-5d6e-4f70-8a91-b2c3d4e5f601", token: TOKEN, printers: [], pollIntervalMs: 3000, heartbeatIntervalMs: 30000 });
    await runCli(["pair", "ABCD2345", "--server", "https://app.rasoios.in"], { env: env(), fetch, io });
    const { writeFile } = await import("node:fs/promises");
    await writeFile(path.join(home, "config.json"), JSON.stringify({ serverUrl: "https://evil.example" }));
    let called = false;
    const spy: FetchLike = async () => {
      called = true;
      return new Response("{}");
    };
    expect(await runCli(["status"], { env: env(), fetch: spy, io })).toBe(EXIT.NEEDS_PAIRING);
    expect(called).toBe(false);
    expect(err.join("\n")).toMatch(/belongs to https:\/\/app\.rasoios\.in/);
  });
});
