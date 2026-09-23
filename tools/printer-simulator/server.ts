import net from "node:net";

/**
 * A raw-TCP ESC/POS printer for CI and development (S1-P17-T007, TC-AGENT-015). Each connection's bytes are one
 * ticket. Fault modes reproduce what real printers do on a restaurant network:
 *
 * - `normal` — accept and record.
 * - `offline` — nothing listening on the port (connection refused), as when the printer is switched off.
 * - `reset` — accept, then drop the connection immediately (a printer rebooting mid-job).
 * - `stall` — accept but never read (a printer that is out of paper and has stopped draining its buffer).
 */
export type SimulatorMode = "normal" | "offline" | "reset" | "stall";

export type PrinterSimulator = {
  readonly host: string;
  readonly port: number;
  readonly tickets: Buffer[];
  setMode(mode: SimulatorMode): Promise<void>;
  /** Resolves once `count` tickets have been received (or rejects after `timeoutMs`). */
  waitForTickets(count: number, timeoutMs?: number): Promise<Buffer[]>;
  stop(): Promise<void>;
};

export async function startPrinterSimulator(options: { host?: string; port?: number; mode?: SimulatorMode; onTicket?: (ticket: Buffer) => void } = {}): Promise<PrinterSimulator> {
  const host = options.host ?? "127.0.0.1";
  let mode: SimulatorMode = options.mode ?? "normal";
  const tickets: Buffer[] = [];
  const sockets = new Set<net.Socket>();
  const waiters: Array<() => void> = [];

  const server = net.createServer((socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
    socket.on("error", () => undefined);
    if (mode === "reset") {
      socket.resetAndDestroy();
      return;
    }
    if (mode === "stall") {
      socket.pause();
      return;
    }
    const chunks: Buffer[] = [];
    socket.on("data", (chunk) => chunks.push(chunk));
    socket.on("end", () => {
      const ticket = Buffer.concat(chunks);
      socket.end();
      if (ticket.length === 0) return; // a reachability probe, not a ticket
      tickets.push(ticket);
      options.onTicket?.(ticket);
      for (const wake of waiters.splice(0)) wake();
    });
  });

  const listen = (port: number) =>
    new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(port, host, () => {
        server.off("error", reject);
        resolve();
      });
    });
  const close = () =>
    new Promise<void>((resolve) => {
      for (const socket of sockets) socket.destroy();
      if (!server.listening) return resolve();
      server.close(() => resolve());
    });

  await listen(options.port ?? 0);
  const port = (server.address() as net.AddressInfo).port;
  if (mode === "offline") await close();

  return {
    host,
    port,
    tickets,
    async setMode(next) {
      if (next === "offline" && server.listening) await close();
      if (next !== "offline" && !server.listening) await listen(port);
      mode = next;
    },
    waitForTickets(count, timeoutMs = 5_000) {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`Simulator received ${tickets.length} of ${count} tickets`)), timeoutMs);
        const check = () => {
          if (tickets.length >= count) {
            clearTimeout(timer);
            resolve(tickets.slice(0, count));
          } else waiters.push(check);
        };
        check();
      });
    },
    stop: close,
  };
}
