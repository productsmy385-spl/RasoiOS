/**
 * ESC/POS decoder for the printer simulator (S1-P17-T007, TC-AGENT-015). Turns a byte stream into the text a person
 * would read off the paper, plus the commands it contained, so tests assert on meaning rather than on raw bytes.
 *
 * Understands the subset the agent emits (ESC @, ESC t, ESC a, ESC E, GS !, GS V, LF). Any other control byte is
 * reported in `unknown` — a test can then prove that no stray command ever reached the printer.
 */
export type DecodedTicket = {
  lines: string[];
  cuts: number;
  bold: boolean[];
  align: Array<"left" | "center" | "right">;
  unknown: number[];
};

export function decodeEscPos(bytes: Uint8Array): DecodedTicket {
  const lines: string[] = [];
  const bold: boolean[] = [];
  const align: DecodedTicket["align"] = [];
  const unknown: number[] = [];
  let current = "";
  let isBold = false;
  let currentAlign: DecodedTicket["align"][number] = "left";
  let cuts = 0;

  const endLine = () => {
    lines.push(current);
    bold.push(isBold);
    align.push(currentAlign);
    current = "";
  };

  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i]!;
    if (byte === 0x0a) {
      endLine();
    } else if (byte === 0x1b) {
      const op = bytes[i + 1];
      if (op === 0x40) i += 1; // ESC @ init
      else if (op === 0x74) i += 2; // ESC t n code page
      else if (op === 0x61) {
        const n = bytes[i + 2];
        currentAlign = n === 1 ? "center" : n === 2 ? "right" : "left";
        i += 2;
      } else if (op === 0x45) {
        isBold = bytes[i + 2] === 1;
        i += 2;
      } else {
        unknown.push(byte);
      }
    } else if (byte === 0x1d) {
      const op = bytes[i + 1];
      if (op === 0x21) i += 2; // GS ! size
      else if (op === 0x56) {
        cuts += 1;
        i += 2;
      } else unknown.push(byte);
    } else if (byte >= 0x20 && byte <= 0x7e) {
      current += String.fromCharCode(byte);
    } else {
      unknown.push(byte);
    }
  }
  if (current !== "") endLine();
  return { lines, cuts, bold, align, unknown };
}

/** Non-empty printed lines, trimmed — what assertions usually want. */
export function printedText(ticket: DecodedTicket): string[] {
  return ticket.lines.map((line) => line.trim()).filter((line) => line !== "");
}
