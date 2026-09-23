import { Prisma } from "@prisma/client";
import { roundHalfUp, sumMoney, type Money } from "@/lib/money";

/**
 * GST receipt presentation (S1-P12-T002, ADR-010 §3, Q-004 C, REQ-TXN-011). Presentation only: it reads the order's
 * snapshotted lines and never changes stored amounts. For each distinct tax rate:
 *
 *   taxable value = Σ line_subtotal,  tax = Σ line_tax
 *   CGST = ROUND_HALF_UP(tax / 2, 2),  SGST = tax − CGST     (so CGST + SGST = tax exactly, odd paise go to SGST)
 *   CGST rate = SGST rate = tax_rate / 2
 *
 * IGST is not supported. Used only when RESTAURANT.gstin is set; otherwise receipts print a single tax line.
 */
export type GstLine = { taxRate: Prisma.Decimal.Value; lineSubtotal: Prisma.Decimal.Value; lineTax: Prisma.Decimal.Value };

export type GstRow = {
  taxRate: Money;
  taxableValue: Money;
  taxAmount: Money;
  cgstRate: Money;
  sgstRate: Money;
  cgstAmount: Money;
  sgstAmount: Money;
};

export function gstBreakup(lines: readonly GstLine[]): GstRow[] {
  const byRate = new Map<string, { rate: Money; subtotals: Prisma.Decimal.Value[]; taxes: Prisma.Decimal.Value[] }>();
  for (const line of lines) {
    const rate = new Prisma.Decimal(line.taxRate);
    const key = rate.toFixed(2);
    const group = byRate.get(key) ?? { rate, subtotals: [], taxes: [] };
    group.subtotals.push(line.lineSubtotal);
    group.taxes.push(line.lineTax);
    byRate.set(key, group);
  }

  return [...byRate.values()]
    .sort((a, b) => a.rate.comparedTo(b.rate))
    .map(({ rate, subtotals, taxes }) => {
      const taxAmount = sumMoney(taxes);
      const cgstAmount = roundHalfUp(taxAmount.div(2), 2);
      const halfRate = rate.div(2);
      return {
        taxRate: rate,
        taxableValue: sumMoney(subtotals),
        taxAmount,
        cgstRate: halfRate,
        sgstRate: halfRate,
        cgstAmount,
        sgstAmount: taxAmount.sub(cgstAmount),
      };
    });
}
