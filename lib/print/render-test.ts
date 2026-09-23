import { printableTimestamp } from "./format";
import { fitRow, sanitizeLine, wrapText } from "./text";
import { assertPrintable, columnsFor, paperWidthOf, type PaperWidthMm, type PrintBlock, type PrintDocument } from "./types";

/**
 * Test page (S1-P16-T002, api.md SA-PRN-04). Everything on it is server-built: the restaurant's name, the printer it
 * was sent to, its configured width, and the instant the request was made in the restaurant's time zone. A staff
 * member holding the slip can tell which printer produced it and whether the roll width is configured correctly.
 */
export type TestDocumentInput = {
  widthMm: number;
  restaurantName: string;
  printerName: string;
  requestedAt: Date;
  timeZone: string;
};

export function renderTestDocument(input: TestDocumentInput): PrintDocument {
  const widthMm: PaperWidthMm = paperWidthOf(input.widthMm);
  const columns = columnsFor(widthMm);
  const line = (text: string, extra: Omit<Extract<PrintBlock, { type: "text" }>, "type" | "text"> = {}): PrintBlock[] =>
    wrapText(text, columns).map((part) => ({ type: "text" as const, text: part, ...extra }));
  const row = (left: string, right: string): PrintBlock => ({ type: "row", ...fitRow(left, right, columns) });

  return assertPrintable({
    version: 1,
    widthMm,
    blocks: [
      ...line(sanitizeLine(input.restaurantName, 60), { align: "center", bold: true }),
      { type: "divider", style: "solid" },
      { type: "text", text: "TEST PRINT", align: "center", bold: true, size: "double" },
      { type: "divider", style: "dashed" },
      row("Printer", sanitizeLine(input.printerName, 30)),
      row("Paper", `${widthMm} mm / ${columns} col`),
      row("Time", printableTimestamp(input.requestedAt, input.timeZone)),
      { type: "divider", style: "dashed" },
      ...line("If this slip is readable and the lines above fit the roll, the printer is set up correctly.", { align: "center" }),
      { type: "spacer", lines: 2 },
      { type: "cut" },
    ],
  });
}
