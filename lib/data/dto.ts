import { Prisma } from "@prisma/client";

/**
 * DTO helpers (S1-P02-T005). Data-access functions return plain projections, never raw Prisma rows:
 * money as fixed two-decimal strings (ADR-010 §1), instants as ISO-8601 UTC strings, business dates as `YYYY-MM-DD`.
 */

export type MoneyString = string;

export function moneyDto(value: Prisma.Decimal): MoneyString {
  return value.toFixed(2);
}

export function nullableMoneyDto(value: Prisma.Decimal | null): MoneyString | null {
  return value === null ? null : moneyDto(value);
}

export function rateDto(value: Prisma.Decimal): string {
  return value.toFixed(2);
}

export function instantDto(value: Date): string {
  return value.toISOString();
}

export function nullableInstantDto(value: Date | null): string | null {
  return value === null ? null : value.toISOString();
}

/** A PostgreSQL DATE column (read by Prisma as UTC midnight) as `YYYY-MM-DD`. */
export function businessDateDto(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/** `YYYY-MM-DD` to the Date Prisma expects for a DATE column. Throws on anything else. */
export function businessDateValue(date: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new RangeError(`Invalid business date: ${date}`);
  const value = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(value.getTime()) || businessDateDto(value) !== date) throw new RangeError(`Invalid business date: ${date}`);
  return value;
}
