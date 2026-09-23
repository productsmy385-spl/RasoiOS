import { fitRow, sanitizeText, wrapText } from "@/lib/print/text";
import { columnsFor, type PrintAlign, type PrintDocument } from "@/lib/print/types";

/**
 * ESC/POS encoder (S1-P17-T005, ADR-007 §8, TC-AGENT-013).
 *
 * Input is a validated `PrintDocument`; output is the exact byte stream for a 58 mm (32 col) or 80 mm (48 col) roll.
 *
 * Only printable ASCII (0x20–0x7E) ever reaches the printer as text. Every string is re-sanitised here even though the
 * server already did it (SC-VAL-07): an ESC or GS byte smuggled into an item name would otherwise be executed by the
 * printer as a command — cut, cash-drawer kick or mode change. Characters the default code page cannot show are
 * transliterated (₹ → "Rs") or replaced with "?", and wrapping is redone after transliteration so a longer
 * replacement can never push text past the roll edge.
 */
const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

export const ESCPOS = {
  init: [ESC, 0x40],
  /** ESC t 0 — code page PC437; text is ASCII after transliteration, so this only makes the output deterministic. */
  codePage: [ESC, 0x74, 0x00],
  align: (align: PrintAlign) => [ESC, 0x61, align === "center" ? 1 : align === "right" ? 2 : 0],
  bold: (on: boolean) => [ESC, 0x45, on ? 1 : 0],
  /** GS ! n — 0x11 is double width and double height. */
  size: (double: boolean) => [GS, 0x21, double ? 0x11 : 0x00],
  /** GS V 1 — partial cut. */
  cut: [GS, 0x56, 0x01],
} as const;

/** Lines fed before a cut so the last printed line clears the cutter blade. */
export const CUT_FEED_LINES = 4;

const TRANSLITERATIONS: Readonly<Record<string, string>> = {
  "₹": "Rs",
  "€": "EUR",
  "£": "GBP",
  "…": ".",
  "–": "-",
  "—": "-",
  "‘": "'",
  "’": "'",
  "“": '"',
  "”": '"',
  "•": "*",
  "×": "x",
  "°": "o",
};

/** Sanitised, transliterated, printable-ASCII-only text. */
export function toPrinterText(value: string): string {
  let out = "";
  for (const ch of sanitizeText(value)) {
    const mapped = TRANSLITERATIONS[ch];
    if (mapped !== undefined) {
      out += mapped;
      continue;
    }
    const code = ch.codePointAt(0)!;
    if (code >= 0x20 && code <= 0x7e) {
      out += ch;
      continue;
    }
    // "é" → "e", "ñ" → "n"; anything else (Devanagari, Telugu, emoji) → "?".
    const base = ch.normalize("NFKD").replace(/[̀-ͯ]/g, "");
    out += /^[\x20-\x7e]+$/.test(base) ? base : "?";
  }
  return out;
}

export function encodeDocument(document: PrintDocument): Buffer {
  const columns = columnsFor(document.widthMm);
  const out: number[] = [...ESCPOS.init, ...ESCPOS.codePage];
  const line = (text: string) => {
    for (let i = 0; i < text.length; i++) out.push(text.charCodeAt(i));
    out.push(LF);
  };
  const resetStyle = () => out.push(...ESCPOS.align("left"), ...ESCPOS.bold(false), ...ESCPOS.size(false));

  for (const block of document.blocks) {
    switch (block.type) {
      case "text": {
        const double = block.size === "double";
        const lines = wrapText(toPrinterText(block.text), double ? Math.floor(columns / 2) : columns);
        out.push(...ESCPOS.align(block.align ?? "left"), ...ESCPOS.bold(block.bold === true), ...ESCPOS.size(double));
        for (const text of lines.length > 0 ? lines : [""]) line(text);
        resetStyle();
        break;
      }
      case "row": {
        const right = toPrinterText(block.right);
        if (block.bold) out.push(...ESCPOS.bold(true));
        if (right.length >= columns - 1) {
          // An amount wider than the roll: print the label, then the amount right-aligned on its own lines.
          for (const text of wrapText(toPrinterText(block.left), columns)) line(text);
          out.push(...ESCPOS.align("right"));
          for (const text of wrapText(right, columns)) line(text);
          out.push(...ESCPOS.align("left"));
        } else {
          const fitted = fitRow(toPrinterText(block.left), right, columns);
          const left = toPrinterText(fitted.left); // fitRow's ellipsis becomes "." — same width
          line(`${left}${" ".repeat(Math.max(1, columns - left.length - right.length))}${right}`);
        }
        if (block.bold) out.push(...ESCPOS.bold(false));
        break;
      }
      case "divider":
        line((block.style === "solid" ? "=" : "-").repeat(columns));
        break;
      case "spacer":
        for (let i = 0; i < block.lines; i++) out.push(LF);
        break;
      case "cut":
        for (let i = 0; i < CUT_FEED_LINES; i++) out.push(LF);
        out.push(...ESCPOS.cut);
        break;
    }
  }
  return Buffer.from(out);
}
