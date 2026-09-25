import dgram from "node:dgram";
import net from "node:net";
import os from "node:os";
import { isPrivateIpv4 } from "@/lib/print/address";
import { sanitizeText } from "@/lib/print/text";
import type { DiscoveredDevice } from "./api";

/**
 * LAN printer discovery (RASOIOS-ADR-015). Runs only when an admin asks for it from the console, takes a few seconds,
 * and reports what it observed — it never adds, configures or prints to anything.
 *
 * 1. DNS-SD over mDNS, as a one-shot query sent from an ephemeral UDP port (RFC 6762 §5.1): responders answer the
 *    querier directly, so the agent never binds 5353 or joins the multicast group. Services asked for:
 *    `_pdl-datastream._tcp` (raw "port 9100" printing), `_ipp._tcp` and `_printer._tcp` (LPD).
 * 2. A TCP connect probe of port 9100 on the agent's own private /24 — connect, then close; no byte is written.
 *
 * Everything received is untrusted: names are sanitised and bounded, and only private IPv4 addresses are kept.
 */

export const MDNS_GROUP = "224.0.0.251";
export const MDNS_PORT = 5353;
export const RAW_PORT = 9100;
const SERVICES = { raw: "_pdl-datastream._tcp.local", ipp: "_ipp._tcp.local", lpd: "_printer._tcp.local" } as const;
const TYPE = { A: 1, PTR: 12, TXT: 16, SRV: 33 } as const;
export const MAX_DEVICES = 64;

// ─── Minimal DNS codec ───

function encodeName(name: string): Buffer {
  const parts = name.split(".").filter(Boolean);
  return Buffer.concat([...parts.map((label) => Buffer.concat([Buffer.from([Buffer.byteLength(label)]), Buffer.from(label)])), Buffer.from([0])]);
}

/** A standard query (id 0) with one PTR question per service name. */
export function encodePtrQuery(names: readonly string[]): Buffer {
  const header = Buffer.alloc(12);
  header.writeUInt16BE(names.length, 4);
  const questions = names.map((name) => {
    const tail = Buffer.alloc(4);
    tail.writeUInt16BE(TYPE.PTR, 0);
    tail.writeUInt16BE(1, 2); // class IN
    return Buffer.concat([encodeName(name), tail]);
  });
  return Buffer.concat([header, ...questions]);
}

function readName(buf: Buffer, start: number): { name: string; end: number } {
  const labels: string[] = [];
  let offset = start;
  let end = -1;
  for (let jumps = 0; jumps < 32; jumps++) {
    if (offset >= buf.length) throw new RangeError("name out of bounds");
    const length = buf[offset]!;
    if (length === 0) {
      if (end < 0) end = offset + 1;
      return { name: labels.join("."), end };
    }
    if ((length & 0xc0) === 0xc0) {
      if (offset + 1 >= buf.length) throw new RangeError("pointer out of bounds");
      if (end < 0) end = offset + 2;
      offset = ((length & 0x3f) << 8) | buf[offset + 1]!;
      continue;
    }
    if (offset + 1 + length > buf.length) throw new RangeError("label out of bounds");
    labels.push(buf.toString("utf8", offset + 1, offset + 1 + length));
    offset += 1 + length;
  }
  throw new RangeError("too many compression pointers");
}

export type DnsRecord =
  | { type: "PTR"; name: string; target: string }
  | { type: "SRV"; name: string; port: number; target: string }
  | { type: "TXT"; name: string; entries: Record<string, string> }
  | { type: "A"; name: string; address: string };

/** Answer, authority and additional records of one response. Malformed packets yield what parsed before the fault. */
export function parseDnsResponse(buf: Buffer): DnsRecord[] {
  const records: DnsRecord[] = [];
  try {
    if (buf.length < 12 || (buf.readUInt16BE(2) & 0x8000) === 0) return records; // not a response
    const qd = buf.readUInt16BE(4);
    const total = buf.readUInt16BE(6) + buf.readUInt16BE(8) + buf.readUInt16BE(10);
    let offset = 12;
    for (let i = 0; i < qd; i++) offset = readName(buf, offset).end + 4;
    for (let i = 0; i < total && i < 200; i++) {
      const { name, end } = readName(buf, offset);
      const type = buf.readUInt16BE(end);
      const length = buf.readUInt16BE(end + 8);
      const data = end + 10;
      if (data + length > buf.length) break;
      if (type === TYPE.PTR) records.push({ type: "PTR", name, target: readName(buf, data).name });
      else if (type === TYPE.SRV) records.push({ type: "SRV", name, port: buf.readUInt16BE(data + 4), target: readName(buf, data + 6).name });
      else if (type === TYPE.A && length === 4) records.push({ type: "A", name, address: `${buf[data]}.${buf[data + 1]}.${buf[data + 2]}.${buf[data + 3]}` });
      else if (type === TYPE.TXT) {
        const entries: Record<string, string> = {};
        let p = data;
        while (p < data + length) {
          const len = buf[p]!;
          const text = buf.toString("utf8", p + 1, Math.min(p + 1 + len, data + length));
          const eq = text.indexOf("=");
          if (eq > 0) entries[text.slice(0, eq).toLowerCase()] = text.slice(eq + 1);
          p += 1 + len;
        }
        records.push({ type: "TXT", name, entries });
      }
      offset = data + length;
    }
  } catch {
    // Stop at the first malformed record; keep what was valid.
  }
  return records;
}

// ─── Turning records into devices ───

const clean = (value: string | undefined, max: number) => {
  const text = sanitizeText(value ?? "").slice(0, max);
  return text === "" ? undefined : text;
};

/** Devices described by DNS-SD records; `sender` is the responder's address, used when no A record came along. */
export function devicesFromRecords(records: readonly DnsRecord[], sender: string): DiscoveredDevice[] {
  const srv = new Map<string, { port: number; target: string }>();
  const txt = new Map<string, Record<string, string>>();
  const hosts = new Map<string, string>();
  const instances: Array<{ service: string; instance: string }> = [];
  for (const record of records) {
    if (record.type === "PTR" && Object.values(SERVICES).includes(record.name as never)) instances.push({ service: record.name, instance: record.target });
    if (record.type === "SRV") srv.set(record.name, { port: record.port, target: record.target });
    if (record.type === "TXT") txt.set(record.name, record.entries);
    if (record.type === "A") hosts.set(record.name, record.address);
  }
  return instances.flatMap(({ service, instance }) => {
    const location = srv.get(instance);
    const address = (location && hosts.get(location.target)) ?? sender;
    if (!isPrivateIpv4(address)) return [];
    const info = txt.get(instance) ?? {};
    const raw = service === SERVICES.raw;
    const product = info.product?.replace(/^\(|\)$/g, "");
    return [
      {
        address,
        port: raw ? (location?.port ?? RAW_PORT) : (location?.port ?? 631),
        protocol: raw ? ("RAW_9100" as const) : ("IPP" as const),
        rawPrinting: raw,
        name: clean(instance.split("._")[0], 80),
        manufacturer: clean(info.usb_mfg, 60),
        model: clean(info.ty ?? product ?? info.usb_mdl, 80),
        sources: ["MDNS" as const],
      },
    ];
  });
}

/** Merges by address: a raw-print port found by any method makes the device raw-printable on that port. */
export function mergeDevices(found: readonly DiscoveredDevice[]): DiscoveredDevice[] {
  const byAddress = new Map<string, DiscoveredDevice>();
  for (const device of found) {
    const current = byAddress.get(device.address);
    if (!current) {
      byAddress.set(device.address, { ...device, sources: [...device.sources] });
      continue;
    }
    const raw = current.rawPrinting ? current : device.rawPrinting ? device : current;
    byAddress.set(device.address, {
      ...current,
      port: raw.port,
      protocol: raw.protocol,
      rawPrinting: current.rawPrinting || device.rawPrinting,
      name: current.name ?? device.name,
      manufacturer: current.manufacturer ?? device.manufacturer,
      model: current.model ?? device.model,
      sources: [...new Set([...current.sources, ...device.sources])],
    });
  }
  const octets = (ip: string) => ip.split(".").map(Number).reduce((sum, part) => sum * 256 + part, 0);
  return [...byAddress.values()].sort((a, b) => octets(a.address) - octets(b.address)).slice(0, MAX_DEVICES);
}

// ─── Network I/O ───

/** The agent's own private IPv4 addresses (at most two interfaces). */
export function localPrivateAddresses(interfaces = os.networkInterfaces()): string[] {
  const out: string[] = [];
  for (const entries of Object.values(interfaces)) {
    for (const entry of entries ?? []) {
      if (entry.family === "IPv4" && !entry.internal && isPrivateIpv4(entry.address)) out.push(entry.address);
    }
  }
  return [...new Set(out)].slice(0, 2);
}

/** Every other host of each address's /24. */
export function probeTargets(ownAddresses: readonly string[]): string[] {
  const targets = new Set<string>();
  for (const own of ownAddresses) {
    const prefix = own.split(".").slice(0, 3).join(".");
    for (let host = 1; host <= 254; host++) {
      const ip = `${prefix}.${host}`;
      if (ip !== own) targets.add(ip);
    }
  }
  return [...targets];
}

/** Connect-and-close on `port`; resolves true when something accepted the connection within `timeoutMs`. */
export function portOpen(host: string, port: number, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    const done = (open: boolean) => {
      socket.destroy();
      resolve(open);
    };
    socket.setTimeout(timeoutMs, () => done(false));
    socket.once("connect", () => done(true));
    socket.once("error", () => done(false));
  });
}

export async function probeRawPort(targets: readonly string[], options: { timeoutMs?: number; concurrency?: number; probe?: typeof portOpen } = {}): Promise<string[]> {
  const probe = options.probe ?? portOpen;
  const open: string[] = [];
  let next = 0;
  const worker = async () => {
    while (next < targets.length) {
      const host = targets[next++]!;
      if (await probe(host, RAW_PORT, options.timeoutMs ?? 500)) open.push(host);
    }
  };
  await Promise.all(Array.from({ length: Math.min(options.concurrency ?? 64, targets.length) }, worker));
  return open;
}

/** One-shot DNS-SD query; collects responses for `windowMs`. The socket is closed afterwards. */
export function queryMdns(windowMs = 3_000): Promise<DiscoveredDevice[]> {
  return new Promise((resolve) => {
    const found: DiscoveredDevice[] = [];
    const socket = dgram.createSocket({ type: "udp4", reuseAddr: false });
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      socket.close();
      resolve(found);
    };
    socket.on("error", finish);
    socket.on("message", (message, rinfo) => {
      if (!isPrivateIpv4(rinfo.address) || message.length > 9000) return;
      found.push(...devicesFromRecords(parseDnsResponse(message), rinfo.address));
    });
    socket.bind(0, () => {
      const query = encodePtrQuery(Object.values(SERVICES));
      socket.send(query, MDNS_PORT, MDNS_GROUP, (error) => {
        if (error) finish();
      });
      // A second query halfway through catches printers that were busy the first time.
      setTimeout(() => !finished && socket.send(query, MDNS_PORT, MDNS_GROUP, () => undefined), windowMs / 2);
      setTimeout(finish, windowMs);
    });
  });
}

export type DiscoveryDeps = {
  addresses?: () => string[];
  mdns?: () => Promise<DiscoveredDevice[]>;
  probe?: (targets: readonly string[]) => Promise<string[]>;
};

/** The whole scan: mDNS and the /24 port probe in parallel (~3 s), merged. */
export async function discoverPrinters(deps: DiscoveryDeps = {}): Promise<DiscoveredDevice[]> {
  const own = (deps.addresses ?? localPrivateAddresses)();
  if (own.length === 0) throw new Error("NO_PRIVATE_NETWORK");
  const [viaMdns, openHosts] = await Promise.all([
    (deps.mdns ?? queryMdns)().catch(() => [] as DiscoveredDevice[]),
    (deps.probe ?? ((targets) => probeRawPort(targets)))(probeTargets(own)),
  ]);
  const viaProbe: DiscoveredDevice[] = openHosts.map((address) => ({ address, port: RAW_PORT, protocol: "RAW_9100", rawPrinting: true, sources: ["PORT_PROBE"] }));
  return mergeDevices([...viaMdns, ...viaProbe].filter((device) => isPrivateIpv4(device.address) && !own.includes(device.address)));
}
