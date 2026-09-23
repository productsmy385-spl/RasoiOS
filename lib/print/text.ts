/**
 * Print text safety and layout (S1-P16-T002, SC-VAL-07, SC-PRINT-07).
 *
 * Everything that reaches a thermal printer passes through `sanitizeText` first. ESC (0x1B) and GS (0x1D) are the
 * ESC/POS command introducers: an item name containing them could otherwise cut the paper, open the cash drawer or
 * switch the printer into a different mode, so every C0/C1 control character, DEL and zero-width character is removed
 * rather than escaped. Runs of whitespace collapse to a single space so a pasted newline cannot break the layout.
 */

/** Tab, newline and friends (0x09–0x0D): separators the author meant, so they become a space rather than vanish. */
const CONTROL_WHITESPACE = /[\u0009-\u000D]/g;
/** Everything else in C0 (including ESC 0x1B and GS 0x1D), DEL and C1: removed outright. */
const CONTROL_CHARS = /[\u0000-\u0008\u000E-\u001F\u007F-\u009F]/g;
const INVISIBLE = /[­᠎​-‏‪-‮⁠-⁤⁦-⁯﻿]/g;
const WHITESPACE_RUN = /\s+/g;

/** Strips control and invisible characters, collapses whitespace and trims. Never returns `undefined`. */
export function sanitizeText(value: string | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(CONTROL_WHITESPACE, " ")
    .replace(CONTROL_CHARS, "")
    .replace(INVISIBLE, "")
    .replace(WHITESPACE_RUN, " ")
    .trim();
}

/** `sanitizeText` plus a hard length cap (applied before wrapping, so a 10 000-character note cannot blow the 64 KB cap). */
export function sanitizeLine(value: string | null | undefined, maxChars = 200): string {
  const clean = sanitizeText(value);
  return clean.length > maxChars ? `${clean.slice(0, Math.max(0, maxChars - 1))}…` : clean;
}

/**
 * Greedy word wrap at `columns`. A single word longer than the line is hard-split rather than pushed past the roll
 * edge, which is what a thermal printer would otherwise do silently.
 */
export function wrapText(value: string, columns: number): string[] {
  const clean = sanitizeText(value);
  if (clean === "") return [];
  if (columns < 8) return [clean];

  const lines: string[] = [];
  let current = "";
  for (const word of clean.split(" ")) {
    let remaining = word;
    while (remaining.length > columns) {
      if (current !== "") {
        lines.push(current);
        current = "";
      }
      lines.push(remaining.slice(0, columns));
      remaining = remaining.slice(columns);
    }
    if (remaining === "") continue;
    if (current === "") current = remaining;
    else if (current.length + 1 + remaining.length <= columns) current = `${current} ${remaining}`;
    else {
      lines.push(current);
      current = remaining;
    }
  }
  if (current !== "") lines.push(current);
  return lines;
}

/**
 * Left/right column pair for a `row` block. The right side is never truncated (it is the amount); the left side is
 * shortened with an ellipsis when the pair does not fit.
 */
export function fitRow(left: string, right: string, columns: number): { left: string; right: string } {
  const cleanRight = sanitizeText(right);
  const cleanLeft = sanitizeText(left);
  const room = columns - cleanRight.length - 1;
  if (room <= 0) return { left: "", right: cleanRight };
  if (cleanLeft.length <= room) return { left: cleanLeft, right: cleanRight };
  return { left: `${cleanLeft.slice(0, Math.max(0, room - 1))}…`, right: cleanRight };
}
