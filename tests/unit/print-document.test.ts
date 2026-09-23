import { describe, expect, it } from "vitest";
import { MAX_PAYLOAD_BYTES, columnsFor, paperWidthOf, parsePrintDocument, payloadBytes, printDocumentSchema, type PrintDocument } from "@/lib/print/types";
import { fitRow, sanitizeLine, sanitizeText, wrapText } from "@/lib/print/text";
import { renderKotDocument, type KotDocumentInput } from "@/lib/print/render-kot";
import { renderReceiptDocument, type ReceiptDocumentInput } from "@/lib/print/render-receipt";
import { renderTestDocument } from "@/lib/print/render-test";

/**
 * TC-PRINT-008 / TC-PRINT-009 / TC-PRINT-017 — the print document contract (S1-P16-T002, architecture.md §6.4).
 * These are the golden-fixture checks for the KOT and receipt layouts: what may appear on a ticket, what may never,
 * and how text behaves at 32 and 48 columns.
 */
const QUEUED_AT = new Date("2026-09-15T08:30:00.000Z"); // 14:00 in Asia/Kolkata
const TZ = "Asia/Kolkata";

function textBlocks(document: PrintDocument): string[] {
  return document.blocks.filter((block): block is Extract<PrintDocument["blocks"][number], { type: "text" }> => block.type === "text").map((block) => block.text);
}

function serialise(document: PrintDocument): string {
  return JSON.stringify(document);
}

const kotInput = (overrides: Partial<KotDocumentInput> = {}): KotDocumentInput => ({
  widthMm: 80,
  restaurantName: "Spice Route",
  kotNumber: "K-007",
  sectionName: "Main Kitchen",
  roundNumber: 1,
  orderNumber: "20260915-0042",
  orderType: "DINE_IN",
  tableLabel: "T4",
  priority: "NORMAL",
  queuedAt: QUEUED_AT,
  timeZone: TZ,
  notes: null,
  items: [{ quantity: 2, label: "Butter Chicken", addons: "Extra gravy", instructions: "No chilli" }],
  ...overrides,
});

const receiptInput = (overrides: Partial<ReceiptDocumentInput> = {}): ReceiptDocumentInput => ({
  widthMm: 80,
  restaurantName: "Spice Route",
  addressLines: ["12 Church Street", "Bengaluru KA 560001"],
  phone: "+918040001234",
  gstin: null,
  orderNumber: "20260915-0042",
  orderType: "DINE_IN",
  tableLabel: "T4",
  createdAt: QUEUED_AT,
  timeZone: TZ,
  currencyCode: "INR",
  customerName: "Asha Rao",
  items: [
    { quantity: 2, label: "Butter Chicken", taxRate: "5.00", lineSubtotal: "800.00", lineTax: "40.00", lineTotal: "840.00" },
    { quantity: 1, label: "Gulab Jamun", taxRate: "12.00", lineSubtotal: "150.00", lineTax: "18.00", lineTotal: "168.00" },
  ],
  totals: { subtotal: "950.00", tax: "58.00", discount: "0.00", total: "1008.00", paid: "1008.00", refunded: "0.00", balance: "0.00" },
  ledger: [{ type: "PAYMENT", method: "CASH", amount: "1008.00", amountTendered: "1100.00", changeDue: "92.00" }],
  footer: "Thank you, come again",
  ...overrides,
});

describe("sanitiser and wrapping", () => {
  it("TC-PRINT-008 strips ESC, GS and every other control character", () => {
    expect(sanitizeText("\u001BBurger\u001DX")).toBe("BurgerX");
    expect(sanitizeText("\u001B@\u001DV\u0000Paneer\u007F")).toBe("@VPaneer");
    expect(sanitizeText("Chicken​Tikka﻿")).toBe("ChickenTikka");
  });

  it("turns tabs and newlines into a single space instead of joining words", () => {
    expect(sanitizeText("Paneer\tTikka\nMasala")).toBe("Paneer Tikka Masala");
    expect(sanitizeText("  spaced   out  ")).toBe("spaced out");
  });

  it("wraps at the column width and hard-splits a word longer than the line", () => {
    expect(wrapText("one two three four five six seven", 12)).toEqual(["one two", "three four", "five six", "seven"]);
    expect(wrapText("A".repeat(70), 32).every((line) => line.length <= 32)).toBe(true);
    expect(wrapText("", 48)).toEqual([]);
  });

  it("fits a left/right pair inside the line, shortening the left side only", () => {
    expect(fitRow("Subtotal", "INR 950.00", 32)).toEqual({ left: "Subtotal", right: "INR 950.00" });
    const tight = fitRow("A very long line description here", "INR 1008.00", 32);
    expect(tight.right).toBe("INR 1008.00");
    expect(tight.left.length + tight.right.length).toBeLessThanOrEqual(32);
  });

  it("caps a single line with an ellipsis", () => {
    expect(sanitizeLine("x".repeat(400), 20)).toHaveLength(20);
  });
});

describe("TC-PRINT-008 KOT document", () => {
  it("strips control characters from item names and wraps text at 32 and 48 columns", () => {
    for (const [widthMm, columns] of [
      [58, 32],
      [80, 48],
    ] as const) {
      const document = renderKotDocument(
        kotInput({
          widthMm,
          items: [{ quantity: 1, label: "\u001BPaneer Butter Masala with extra cashew gravy and a very long name\u001D", addons: null, instructions: null }],
        }),
      );
      expect(columnsFor(widthMm)).toBe(columns);
      expect(document.widthMm).toBe(widthMm);
      const lines = textBlocks(document);
      expect(lines.every((line) => line.length <= columns), `lines fit ${columns} columns`).toBe(true);
      expect(serialise(document)).not.toMatch(/[\u001B\u001D]/);
      expect(lines.join(" ")).toContain("Paneer Butter Masala");
    }
  });

  it("carries the ticket's identity, station, round and local time", () => {
    const document = renderKotDocument(kotInput());
    const serialised = serialise(document);
    expect(serialised).toContain("K-007");
    expect(serialised).toContain("Main Kitchen");
    expect(serialised).toContain("20260915-0042");
    // 08:30 UTC is 14:00 in Asia/Kolkata — the restaurant's zone, not the server's.
    expect(serialised).toContain("15 Sep 2026 14:00");
    expect(document.blocks.at(-1)).toEqual({ type: "cut" });
  });

  it("marks a rush ticket and a reprint, and stays silent otherwise", () => {
    expect(serialise(renderKotDocument(kotInput({ priority: "HIGH" })))).toContain("RUSH");
    expect(serialise(renderKotDocument(kotInput({ isReprint: true })))).toContain("REPRINT");
    const plain = serialise(renderKotDocument(kotInput()));
    expect(plain).not.toContain("RUSH");
    expect(plain).not.toContain("REPRINT");
  });

  it("TC-PRINT-009 carries no money and no customer contact details", () => {
    const serialised = serialise(renderKotDocument(kotInput()));
    for (const forbidden of ["INR", "840.00", "+9180", "@", "asha"]) {
      expect(serialised.toLowerCase()).not.toContain(forbidden.toLowerCase());
    }
  });
});

describe("TC-PRINT-017 receipt tax presentation", () => {
  it("prints the GSTIN and a CGST/SGST pair per rate when the restaurant has a GSTIN", () => {
    const document = renderReceiptDocument(receiptInput({ gstin: "29ABCDE1234F1Z5" }));
    const serialised = serialise(document);
    expect(serialised).toContain("GSTIN 29ABCDE1234F1Z5");
    // 5 % → 2.5 + 2.5 on 800.00; 12 % → 6 + 6 on 150.00.
    expect(serialised).toContain("CGST 2.50% on 800.00");
    expect(serialised).toContain("SGST 2.50% on 800.00");
    expect(serialised).toContain("CGST 6.00% on 150.00");
    expect(serialised).toContain("SGST 6.00% on 150.00");
    expect(serialised).not.toContain('"left":"Tax"');
  });

  it("prints a single tax line without a GSTIN, and the totals are identical either way", () => {
    const withGst = renderReceiptDocument(receiptInput({ gstin: "29ABCDE1234F1Z5" }));
    const without = renderReceiptDocument(receiptInput({ gstin: null }));

    const totalOf = (document: PrintDocument) =>
      document.blocks.find((block): block is Extract<PrintDocument["blocks"][number], { type: "row" }> => block.type === "row" && block.left === "TOTAL");
    expect(totalOf(without)?.right).toBe("INR 1008.00");
    expect(totalOf(withGst)?.right).toBe(totalOf(without)?.right);

    expect(serialise(without)).toContain('"left":"Tax","right":"INR 58.00"');
    expect(serialise(without)).not.toContain("CGST");
    expect(serialise(without)).not.toContain("GSTIN");

    // CGST + SGST across every rate equals the single tax line.
    const halves = withGst.blocks
      .filter((block): block is Extract<PrintDocument["blocks"][number], { type: "row" }> => block.type === "row" && /^(C|S)GST /.test(block.left))
      .map((block) => Number(block.right.replace("INR ", "")));
    expect(halves.reduce((sum, value) => sum + value, 0).toFixed(2)).toBe("58.00");
  });

  it("TC-PRINT-009 prints the customer's name but never a phone number or an email address", () => {
    const serialised = serialise(renderReceiptDocument(receiptInput({ customerName: "Asha Rao" })));
    expect(serialised).toContain("Asha Rao");
    expect(serialised).not.toContain("@");
    // The restaurant's own telephone number is part of the header; no customer contact detail is ever passed in.
    expect(Object.keys(receiptInput())).not.toContain("customerPhone");
    expect(Object.keys(receiptInput())).not.toContain("customerEmail");
  });

  it("shows tendered cash, change and an outstanding balance when there is one", () => {
    const paid = serialise(renderReceiptDocument(receiptInput()));
    expect(paid).toContain("INR 1100.00");
    expect(paid).toContain("INR 92.00");
    expect(paid).not.toContain("Balance due");

    const owing = serialise(
      renderReceiptDocument(
        receiptInput({
          ledger: [],
          totals: { subtotal: "950.00", tax: "58.00", discount: "0.00", total: "1008.00", paid: "0.00", refunded: "0.00", balance: "1008.00" },
        }),
      ),
    );
    expect(owing).toContain("Balance due");
  });
});

describe("test page and document validation", () => {
  it("names the printer, its width and the local time", () => {
    const serialised = serialise(renderTestDocument({ widthMm: 58, restaurantName: "Spice Route", printerName: "Counter Receipt", requestedAt: QUEUED_AT, timeZone: TZ }));
    expect(serialised).toContain("Counter Receipt");
    expect(serialised).toContain("58 mm / 32 col");
    expect(serialised).toContain("15 Sep 2026 14:00");
  });

  it("narrows any stored paper width to a supported roll", () => {
    expect(paperWidthOf(58)).toBe(58);
    expect(paperWidthOf(80)).toBe(80);
    expect(paperWidthOf(76)).toBe(80);
    expect(paperWidthOf(null)).toBe(80);
  });

  it("rejects an unknown block type, an unknown key and a wrong version", () => {
    expect(printDocumentSchema.safeParse({ version: 2, widthMm: 80, blocks: [{ type: "cut" }] }).success).toBe(false);
    expect(printDocumentSchema.safeParse({ version: 1, widthMm: 80, blocks: [{ type: "raw", data: "\u001B@" }] }).success).toBe(false);
    expect(printDocumentSchema.safeParse({ version: 1, widthMm: 80, blocks: [{ type: "cut" }], escpos: "\u001B@" }).success).toBe(false);
    expect(printDocumentSchema.safeParse({ version: 1, widthMm: 72, blocks: [{ type: "cut" }] }).success).toBe(false);
  });

  it("round-trips a rendered document through the schema the agent uses", () => {
    const document = renderKotDocument(kotInput());
    expect(parsePrintDocument(JSON.parse(JSON.stringify(document)))).toEqual(document);
    expect(payloadBytes(document)).toBeLessThan(MAX_PAYLOAD_BYTES);
  });

  it("refuses a document over the 64 KB cap instead of queueing one no agent can print", () => {
    const items = Array.from({ length: 400 }, (_, index) => ({ quantity: 1, label: `Item ${index} ${"long name ".repeat(18)}`, addons: null, instructions: null }));
    expect(() => renderKotDocument(kotInput({ items }))).toThrowError(/too large/i);
  });
});
