/**
 * Money primitives (S1-P02-T010, ADR-010 §1, CLAUDE.md rule 4).
 *
 * - Money is `Prisma.Decimal` in code, `NUMERIC(12,2)` in PostgreSQL and a two-decimal string on the wire (`"480.00"`).
 * - Never `Number`, `parseFloat` or `Decimal#toNumber()` (lint rules in S1-P01-T003).
 * - Rounding is ROUND_HALF_UP, passed explicitly on every call; the global Decimal configuration is never mutated.
 */
import { Prisma } from "@prisma/client";
import { z } from "zod";

export type Money = Prisma.Decimal;

/** Up to 10 integer digits (NUMERIC(12,2) holds 9,999,999,999.99) and at most 2 decimals. No sign, exponent or spaces. */
export const MONEY_PATTERN = /^\d{1,10}(\.\d{1,2})?$/;

export const MONEY_ZERO: Money = new Prisma.Decimal(0);

export class MoneyFormatError extends RangeError {
  constructor(input: unknown) {
    super(`Invalid money amount: ${JSON.stringify(input)}`);
    this.name = "MoneyFormatError";
  }
}

/** Parses a user- or API-supplied amount. Rejects "-1", "1e3", "1.005", " 1", "1,000", "" and non-strings. */
export function parseMoney(input: unknown): Money {
  if (typeof input !== "string" || !MONEY_PATTERN.test(input)) throw new MoneyFormatError(input);
  return new Prisma.Decimal(input);
}

/** ROUND_HALF_UP to `places` decimals (0.005 → 0.01, 0.004 → 0.00). */
export function roundHalfUp(value: Prisma.Decimal.Value, places = 2): Money {
  return new Prisma.Decimal(value).toDecimalPlaces(places, Prisma.Decimal.ROUND_HALF_UP);
}

export function sumMoney(values: Iterable<Prisma.Decimal.Value>): Money {
  let total = MONEY_ZERO;
  for (const value of values) total = total.add(new Prisma.Decimal(value));
  return total;
}

/** Two-decimal string for DTOs and the network (`"480.00"`). Rounds half-up if more decimals are present. */
export function toMoneyString(value: Prisma.Decimal.Value): string {
  return roundHalfUp(value, 2).toFixed(2);
}

/** `percent`% of `amount`, rounded half-up to 2 decimals (per-line tax, ADR-010 §3). */
export function percentOf(amount: Prisma.Decimal.Value, percent: Prisma.Decimal.Value): Money {
  return roundHalfUp(new Prisma.Decimal(amount).mul(new Prisma.Decimal(percent)).div(100), 2);
}

/** Zod schema for a money input: validated string → Decimal. Options add bounds as decimal strings. */
export function zodMoney(options: { min?: string; max?: string; positive?: boolean } = {}) {
  const min = options.min !== undefined ? parseMoney(options.min) : undefined;
  const max = options.max !== undefined ? parseMoney(options.max) : undefined;
  return z
    .string()
    .regex(MONEY_PATTERN, "Enter an amount like 120 or 120.50")
    .transform((value) => new Prisma.Decimal(value))
    .refine((d) => !options.positive || d.gt(0), "Amount must be greater than zero")
    .refine((d) => min === undefined || d.gte(min), `Amount must be at least ${options.min}`)
    .refine((d) => max === undefined || d.lte(max), `Amount must be at most ${options.max}`);
}

/** Tax rate input (percent, 0–100, up to 2 decimals) → Decimal. */
export const zodTaxRate = z
  .string()
  .regex(/^\d{1,3}(\.\d{1,2})?$/, "Enter a rate like 5 or 18.5")
  .transform((value) => new Prisma.Decimal(value))
  .refine((d) => d.lte(100), "Rate must be between 0 and 100");
