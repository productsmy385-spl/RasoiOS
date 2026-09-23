import net from "node:net";
import { DEFAULT_TIMEOUTS, PrintTransportError, type Transport, type TransportTimeouts } from "./types";

/**
 * Raw TCP (JetDirect / "port 9100") transport for Wi-Fi and Ethernet ESC/POS printers (S1-P17-T006, TC-AGENT-014).
 *
 * The agent only ever connects out; it never listens (T-028). Timeouts: 5 s to connect, 10 s to hand over the bytes.
 * Socket errors map to the codes the console shows: refused/unreachable → PRINTER_OFFLINE, no answer → TIMEOUT.
 */
const OFFLINE_CODES = new Set(["ECONNREFUSED", "EHOSTUNREACH", "ENETUNREACH", "EHOSTDOWN", "ENOTFOUND", "EADDRNOTAVAIL"]);

function mapSocketError(error: NodeJS.ErrnoException, host: string, port: number): PrintTransportError {
  if (error.code && OFFLINE_CODES.has(error.code)) return new PrintTransportError("PRINTER_OFFLINE", `Printer at ${host}:${port} is not reachable (${error.code})`);
  if (error.code === "ETIMEDOUT") return new PrintTransportError("TIMEOUT", `Printer at ${host}:${port} did not answer`);
  return new PrintTransportError("WRITE_FAILED", `Connection to ${host}:${port} failed (${error.code ?? "error"})`);
}

export class LanTransport implements Transport {
  constructor(
    private readonly host: string,
    private readonly port: number,
    private readonly timeouts: TransportTimeouts = DEFAULT_TIMEOUTS,
  ) {}

  send(bytes: Buffer): Promise<void> {
    return this.connect(bytes);
  }

  probe(): Promise<void> {
    return this.connect(null);
  }

  private connect(bytes: Buffer | null): Promise<void> {
    const { host, port, timeouts } = this;
    return new Promise<void>((resolve, reject) => {
      const socket = net.createConnection({ host, port });
      let settled = false;
      let timer: NodeJS.Timeout | undefined;

      const finish = (error?: PrintTransportError) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (error) {
          socket.destroy();
          reject(error);
        } else {
          // Half-closed and flushed; let the printer close its side, but never keep the socket alive for long.
          socket.setTimeout(2_000, () => socket.destroy());
          resolve();
        }
      };

      timer = setTimeout(() => finish(new PrintTransportError("TIMEOUT", `Printer at ${host}:${port} did not accept a connection within ${timeouts.connectMs / 1000} s`)), timeouts.connectMs);
      socket.once("error", (error: NodeJS.ErrnoException) => finish(mapSocketError(error, host, port)));
      socket.once("connect", () => {
        clearTimeout(timer);
        timer = setTimeout(() => finish(new PrintTransportError("TIMEOUT", `Printer at ${host}:${port} stopped accepting data`)), timeouts.writeMs);
        if (bytes === null) socket.end(() => finish());
        else socket.end(bytes, () => finish());
      });
      // Nothing is read from the printer; drain whatever it sends so the socket never back-pressures.
      socket.on("data", () => undefined);
    });
  }
}
