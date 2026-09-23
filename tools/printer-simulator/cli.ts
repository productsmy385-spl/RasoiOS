/**
 * Development printer (S1-P17-T007):
 *
 *   npm run printer:simulator -- --host 0.0.0.0 --port 9100
 *
 * Register it in Printing → Printers with this PC's LAN address (e.g. 192.168.1.20:9100) — the console and the agent
 * only accept private LAN addresses, never localhost — and every ticket the agent sends is printed here as text.
 */
import { decodeEscPos } from "./decode";
import { startPrinterSimulator } from "./server";

function option(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  return index >= 0 ? (process.argv[index + 1] ?? fallback) : fallback;
}

async function main() {
  const host = option("--host", "0.0.0.0");
  const port = Number(option("--port", "9100"));
  const simulator = await startPrinterSimulator({
    host,
    port,
    onTicket(ticket) {
      const decoded = decodeEscPos(ticket);
      const width = Math.max(32, ...decoded.lines.map((line) => line.length));
      console.log(`\n┌${"─".repeat(width + 2)}┐`);
      for (const line of decoded.lines) console.log(`│ ${line.padEnd(width)} │`);
      console.log(`└${"─".repeat(width + 2)}┘  ${ticket.length} bytes · ${decoded.cuts} cut(s)${decoded.unknown.length ? ` · ${decoded.unknown.length} unknown control byte(s)` : ""}`);
    },
  });
  console.log(`ESC/POS printer simulator listening on ${host}:${simulator.port}. Ctrl+C to stop.`);
  process.once("SIGINT", () => void simulator.stop().then(() => process.exit(0)));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
