import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import type { AgentApiLike, DiscoveryReport } from "@/print-agent/src/api";
import {
  devicesFromRecords,
  discoverPrinters,
  encodePtrQuery,
  localPrivateAddresses,
  mergeDevices,
  parseDnsResponse,
  portOpen,
  probeRawPort,
  probeTargets,
} from "@/print-agent/src/discovery";
import { PrintedJournal } from "@/print-agent/src/journal";
import { createLogger } from "@/print-agent/src/logger";
import { PrintAgentRunner } from "@/print-agent/src/runner";
import { startPrinterSimulator } from "@/tools/printer-simulator/server";

/** TC-DISC-001…006 — agent-side LAN printer discovery (RASOIOS-ADR-015). */

// ─── A tiny DNS response builder (the test's own, so the parser is checked against an independent encoder) ───
function name(n: string): Buffer {
  return Buffer.concat([...n.split(".").map((l) => Buffer.concat([Buffer.from([l.length]), Buffer.from(l)])), Buffer.from([0])]);
}
function rr(owner: Buffer, type: number, data: Buffer): Buffer {
  const fixed = Buffer.alloc(10);
  fixed.writeUInt16BE(type, 0);
  fixed.writeUInt16BE(1, 2);
  fixed.writeUInt32BE(120, 4);
  fixed.writeUInt16BE(data.length, 8);
  return Buffer.concat([owner, fixed, data]);
}
function response(records: Buffer[]): Buffer {
  const header = Buffer.alloc(12);
  header.writeUInt16BE(0x8400, 2); // response, authoritative
  header.writeUInt16BE(records.length, 6);
  return Buffer.concat([header, ...records]);
}
const srv = (port: number, target: string) => {
  const head = Buffer.alloc(6);
  head.writeUInt16BE(port, 4);
  return Buffer.concat([head, name(target)]);
};
const txt = (entries: string[]) => Buffer.concat(entries.map((e) => Buffer.concat([Buffer.from([e.length]), Buffer.from(e)])));

const EPSON = "EPSON TM-T88VI._pdl-datastream._tcp.local";
function epsonPacket(ip = [192, 168, 1, 105]): Buffer {
  return response([
    rr(name("_pdl-datastream._tcp.local"), 12, name(EPSON)),
    rr(name(EPSON), 33, srv(9100, "epson-tm.local")),
    rr(name(EPSON), 16, txt(["ty=EPSON TM-T88VI", "usb_MFG=EPSON", "product=(TM-T88VI)"])),
    rr(name("epson-tm.local"), 1, Buffer.from(ip)),
  ]);
}

describe("TC-DISC-001 DNS-SD codec", () => {
  it("encodes a PTR query for each service", () => {
    const query = encodePtrQuery(["_ipp._tcp.local"]);
    expect(query.readUInt16BE(4)).toBe(1);
    expect(query.includes(Buffer.from("_ipp"))).toBe(true);
  });

  it("turns PTR + SRV + TXT + A into a compatible raw-printing device", () => {
    const devices = devicesFromRecords(parseDnsResponse(epsonPacket()), "192.168.1.105");
    expect(devices).toEqual([
      { address: "192.168.1.105", port: 9100, protocol: "RAW_9100", rawPrinting: true, name: "EPSON TM-T88VI", manufacturer: "EPSON", model: "EPSON TM-T88VI", sources: ["MDNS"] },
    ]);
  });

  it("follows name compression pointers", () => {
    // Answer owner written as a pointer back to the PTR record's name at offset 12.
    const ptr = rr(name("_ipp._tcp.local"), 12, name("Kitchen._ipp._tcp.local"));
    const pointer = Buffer.from([0xc0, 12]);
    const packet = response([ptr, rr(pointer, 12, name("Bar._ipp._tcp.local"))]);
    const targets = parseDnsResponse(packet).filter((r) => r.type === "PTR").map((r) => (r as { target: string }).target);
    expect(targets).toEqual(["Kitchen._ipp._tcp.local", "Bar._ipp._tcp.local"]);
  });

  it("an IPP-only device is reported as not raw-printable", () => {
    const inst = "Office._ipp._tcp.local";
    const packet = response([rr(name("_ipp._tcp.local"), 12, name(inst)), rr(name(inst), 33, srv(631, "office.local")), rr(name("office.local"), 1, Buffer.from([192, 168, 1, 30]))]);
    expect(devicesFromRecords(parseDnsResponse(packet), "192.168.1.30")[0]).toMatchObject({ protocol: "IPP", port: 631, rawPrinting: false });
  });

  it("hostile input: truncated packets, pointer loops, queries and public addresses yield nothing harmful", () => {
    expect(parseDnsResponse(Buffer.from([1, 2, 3]))).toEqual([]);
    const loop = response([rr(Buffer.from([0xc0, 12]), 12, Buffer.from([0xc0, 12]))]);
    expect(() => parseDnsResponse(loop)).not.toThrow();
    const query = epsonPacket();
    query.writeUInt16BE(0, 2); // not a response
    expect(parseDnsResponse(query)).toEqual([]);
    expect(devicesFromRecords(parseDnsResponse(epsonPacket([8, 8, 8, 8])), "8.8.8.8")).toEqual([]);
    const control = response([rr(name("_pdl-datastream._tcp.local"), 12, name("Evil\x1bp._pdl-datastream._tcp.local"))]);
    expect(devicesFromRecords(parseDnsResponse(control), "192.168.1.9")[0]!.name).toBe("Evilp");
  });
});

describe("TC-DISC-002 merge and scope", () => {
  it("one device per address; a port-probe hit makes an IPP device raw-printable", () => {
    const merged = mergeDevices([
      { address: "192.168.1.30", port: 631, protocol: "IPP", rawPrinting: false, name: "Office", sources: ["MDNS"] },
      { address: "192.168.1.30", port: 9100, protocol: "RAW_9100", rawPrinting: true, sources: ["PORT_PROBE"] },
      { address: "192.168.1.4", port: 9100, protocol: "RAW_9100", rawPrinting: true, sources: ["PORT_PROBE"] },
    ]);
    expect(merged.map((d) => d.address)).toEqual(["192.168.1.4", "192.168.1.30"]);
    expect(merged[1]).toMatchObject({ port: 9100, protocol: "RAW_9100", rawPrinting: true, name: "Office", sources: ["MDNS", "PORT_PROBE"] });
  });

  it("probes only the agent's own /24, never itself", () => {
    const targets = probeTargets(["192.168.31.231"]);
    expect(targets).toHaveLength(253);
    expect(targets.every((t) => t.startsWith("192.168.31."))).toBe(true);
    expect(targets).not.toContain("192.168.31.231");
  });

  it("only private IPv4 interfaces are scanned", () => {
    const addresses = localPrivateAddresses({
      lo: [{ address: "127.0.0.1", family: "IPv4", internal: true } as os.NetworkInterfaceInfo],
      wifi: [{ address: "192.168.1.20", family: "IPv4", internal: false } as os.NetworkInterfaceInfo],
      wan: [{ address: "203.0.113.5", family: "IPv4", internal: false } as os.NetworkInterfaceInfo],
    });
    expect(addresses).toEqual(["192.168.1.20"]);
  });
});

describe("TC-DISC-003 port probe", () => {
  let stop: (() => Promise<void>) | null = null;
  afterEach(async () => {
    await stop?.();
    stop = null;
  });

  it("detects an open port without printing anything, and a closed one", async () => {
    const simulator = await startPrinterSimulator();
    stop = simulator.stop;
    expect(await portOpen(simulator.host, simulator.port, 1_000)).toBe(true);
    await new Promise((r) => setTimeout(r, 100));
    expect(simulator.tickets).toHaveLength(0);
    await simulator.setMode("offline");
    expect(await portOpen(simulator.host, simulator.port, 1_000)).toBe(false);
  });

  it("runs probes concurrently and returns only open hosts", async () => {
    const open = await probeRawPort(["10.0.0.1", "10.0.0.2", "10.0.0.3"], { probe: async (host) => host === "10.0.0.2" });
    expect(open).toEqual(["10.0.0.2"]);
  });
});

describe("TC-DISC-004 whole scan", () => {
  it("combines mDNS and the port probe and drops the agent's own address", async () => {
    const devices = await discoverPrinters({
      addresses: () => ["192.168.1.20"],
      mdns: async () => devicesFromRecords(parseDnsResponse(epsonPacket()), "192.168.1.105"),
      probe: async () => ["192.168.1.105", "192.168.1.120", "192.168.1.20"],
    });
    expect(devices.map((d) => [d.address, d.rawPrinting, d.name ?? null])).toEqual([
      ["192.168.1.105", true, "EPSON TM-T88VI"],
      ["192.168.1.120", true, null],
    ]);
  });

  it("no private network is an error, not an empty result", async () => {
    await expect(discoverPrinters({ addresses: () => [] })).rejects.toThrow("NO_PRIVATE_NETWORK");
  });
});

describe("TC-DISC-005 runner hands the scan to the server once", () => {
  async function runnerWith(discover: () => Promise<never[] | ReturnType<typeof mergeDevices>>) {
    const dir = await mkdtemp(path.join(os.tmpdir(), "rasoios-disc-"));
    const reports: Array<{ id: string; report: DiscoveryReport }> = [];
    const discoveryId = randomUUID();
    let handedOut = false;
    const api: AgentApiLike = {
      config: async () => ({ agentId: randomUUID(), printers: [], pollIntervalMs: 3000, heartbeatIntervalMs: 30000 }),
      heartbeat: async () => ({ serverTime: new Date().toISOString(), pollIntervalMs: 3000, heartbeatIntervalMs: 30000 }),
      claim: async () => {
        const discovery = handedOut ? null : { discoveryId };
        handedOut = true;
        return { jobs: [], discovery };
      },
      reportDiscovery: async (id, report) => {
        reports.push({ id, report });
        return { discoveryId: id, status: report.outcome };
      },
      ack: async (jobId) => ({ jobId, status: "PRINTED" }),
    };
    const logger = createLogger("error", () => undefined);
    const runner = new PrintAgentRunner({ api, journal: new PrintedJournal(path.join(dir, "j.json"), logger), logger, transportFor: () => { throw new Error("unused"); }, discover, sleep: async () => undefined });
    return { runner, reports, discoveryId, cleanup: () => rm(dir, { recursive: true, force: true }) };
  }

  it("COMPLETED with what was found; the next claim does not scan again", async () => {
    const found = mergeDevices([{ address: "192.168.1.50", port: 9100, protocol: "RAW_9100", rawPrinting: true, sources: ["PORT_PROBE"] }]);
    const { runner, reports, discoveryId, cleanup } = await runnerWith(async () => found);
    await runner.cycle();
    await runner.cycle();
    expect(reports).toEqual([{ id: discoveryId, report: { outcome: "COMPLETED", printers: found } }]);
    await cleanup();
  });

  it("a failing scan is reported as FAILED with a code, never as 'nothing found'", async () => {
    const { runner, reports, cleanup } = await runnerWith(async () => {
      throw new Error("NO_PRIVATE_NETWORK");
    });
    await runner.cycle();
    expect(reports[0]!.report).toEqual({ outcome: "FAILED", errorCode: "NO_PRIVATE_NETWORK", printers: [] });
    await cleanup();
  });
});
