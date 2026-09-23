import { ValidationError } from "@/lib/errors";
import { MONEY_ZERO, percentOf, sumMoney, type Money } from "@/lib/money";

/**
 * Pricing engine (S1-P12-T002, ADR-010 §2–3). Pure: no database, no clock. The server prices every order line from the
 * tenant's own catalogue rows — the client never sends a price, total, tax or discount (SC-VAL-02).
 *
 *   unit_total    = unit_price + Σ addon_price     (unit_price = variant price if the item has active variants, else base price)
 *   line_subtotal = unit_total × quantity
 *   line_tax      = ROUND_HALF_UP(line_subtotal × tax_rate / 100, 2)
 *   line_total    = line_subtotal + line_tax
 *   order: subtotal = Σ line_subtotal, tax = Σ line_tax, discount = 0 (Q-006 A), total = subtotal + tax − discount
 */

export type CatalogueOption = { id: string; name: string; price: Money; isAvailable: boolean };

export type CatalogueItem = {
  id: string;
  name: string;
  basePrice: Money;
  taxRate: Money;
  kitchenSectionId: string | null;
  isAvailable: boolean;
  isPublished: boolean;
  isArchived: boolean;
  /** Active (non-archived) variants of this item. */
  variants: readonly CatalogueOption[];
  /** Active (non-archived) add-ons of this item. */
  addons: readonly CatalogueOption[];
};

export type CartLine = {
  menuItemId: string;
  variantId?: string | null;
  addonIds?: readonly string[];
  quantity: number;
  specialInstructions?: string | null;
};

export type PricedAddon = { id: string; name: string; price: Money };

export type PricedLine = {
  menuItemId: string;
  variantId: string | null;
  itemName: string;
  variantName: string | null;
  kitchenSectionId: string | null;
  unitPrice: Money;
  addons: PricedAddon[];
  addonsTotal: Money;
  quantity: number;
  taxRate: Money;
  lineSubtotal: Money;
  lineTax: Money;
  lineTotal: Money;
  specialInstructions: string | null;
};

export type PricedOrder = {
  lines: PricedLine[];
  subtotalAmount: Money;
  taxAmount: Money;
  discountAmount: Money;
  totalAmount: Money;
};

export const PRICING_ERROR_CODES = ["ITEM_UNAVAILABLE", "VARIANT_REQUIRED", "INVALID_ADDON"] as const;
export type PricingErrorCode = (typeof PRICING_ERROR_CODES)[number];

const MESSAGES: Record<PricingErrorCode, string> = {
  ITEM_UNAVAILABLE: "Some items are not available.",
  VARIANT_REQUIRED: "Choose a size or variant for the highlighted items.",
  INVALID_ADDON: "Some add-ons can't be used with the selected items.",
};

/** 422 with the contract code and `items.<index>.<field>` references (api.md SA-ORD-01). */
export class PricingError extends ValidationError {
  constructor(
    public readonly pricingCode: PricingErrorCode,
    fieldErrors: Record<string, string[]>,
  ) {
    super(MESSAGES[pricingCode], fieldErrors, pricingCode);
  }
}

/**
 * Prices `lines` against `catalogue` (the tenant's rows, loaded by id). Callers answer NOT_FOUND for ids that are not
 * the tenant's before pricing (404 parity); an item still missing here is reported as ITEM_UNAVAILABLE.
 *
 * Errors are collected across all lines and thrown once, by precedence ITEM_UNAVAILABLE → VARIANT_REQUIRED →
 * INVALID_ADDON, so the client can highlight every offending line.
 */
export function priceLines(lines: readonly CartLine[], catalogue: ReadonlyMap<string, CatalogueItem>): PricedOrder {
  const problems: Record<PricingErrorCode, Record<string, string[]>> = { ITEM_UNAVAILABLE: {}, VARIANT_REQUIRED: {}, INVALID_ADDON: {} };
  const priced: PricedLine[] = [];

  lines.forEach((line, index) => {
    const at = (field: string) => `items.${index}.${field}`;
    const item = catalogue.get(line.menuItemId);
    if (!item || item.isArchived || !item.isPublished || !item.isAvailable) {
      problems.ITEM_UNAVAILABLE[at("menuItemId")] = [`${item?.name ?? "This item"} is not available.`];
      return;
    }

    let unitPrice = item.basePrice;
    let variant: CatalogueOption | null = null;
    if (item.variants.length > 0) {
      variant = line.variantId ? (item.variants.find((v) => v.id === line.variantId) ?? null) : null;
      if (!line.variantId) {
        problems.VARIANT_REQUIRED[at("variantId")] = [`Choose a variant for ${item.name}.`];
        return;
      }
      if (!variant) {
        problems.VARIANT_REQUIRED[at("variantId")] = [`That variant does not belong to ${item.name}.`];
        return;
      }
      if (!variant.isAvailable) {
        problems.ITEM_UNAVAILABLE[at("variantId")] = [`${item.name} (${variant.name}) is not available.`];
        return;
      }
      unitPrice = variant.price;
    } else if (line.variantId) {
      problems.VARIANT_REQUIRED[at("variantId")] = [`${item.name} has no variants.`];
      return;
    }

    const addonIds = line.addonIds ?? [];
    const addons: PricedAddon[] = [];
    const seen = new Set<string>();
    for (const addonId of addonIds) {
      const addon = item.addons.find((a) => a.id === addonId);
      if (!addon || seen.has(addonId)) {
        problems.INVALID_ADDON[at("addonIds")] = [seen.has(addonId) ? "Each add-on can be chosen once." : `That add-on does not belong to ${item.name}.`];
        return;
      }
      if (!addon.isAvailable) {
        problems.INVALID_ADDON[at("addonIds")] = [`${addon.name} is not available.`];
        return;
      }
      seen.add(addonId);
      addons.push({ id: addon.id, name: addon.name, price: addon.price });
    }

    const addonsTotal = sumMoney(addons.map((a) => a.price));
    const lineSubtotal = unitPrice.add(addonsTotal).mul(line.quantity);
    const lineTax = percentOf(lineSubtotal, item.taxRate);
    priced.push({
      menuItemId: item.id,
      variantId: variant?.id ?? null,
      itemName: item.name,
      variantName: variant?.name ?? null,
      kitchenSectionId: item.kitchenSectionId,
      unitPrice,
      addons,
      addonsTotal,
      quantity: line.quantity,
      taxRate: item.taxRate,
      lineSubtotal,
      lineTax,
      lineTotal: lineSubtotal.add(lineTax),
      specialInstructions: line.specialInstructions ?? null,
    });
  });

  for (const code of PRICING_ERROR_CODES) {
    if (Object.keys(problems[code]).length > 0) throw new PricingError(code, problems[code]);
  }

  const subtotalAmount = sumMoney(priced.map((l) => l.lineSubtotal));
  const taxAmount = sumMoney(priced.map((l) => l.lineTax));
  const discountAmount = MONEY_ZERO;
  return { lines: priced, subtotalAmount, taxAmount, discountAmount, totalAmount: subtotalAmount.add(taxAmount).sub(discountAmount) };
}
