"use client";

import type { DietaryType } from "@prisma/client";
import { EyeOff, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatMoney } from "@/lib/ui/format";
import { DietaryMark } from "./dietary-mark";
import { MenuCover } from "./menu-image";
import { lowestPrice } from "./price";
import type { OptionRow } from "./option-editor";

/**
 * Live public preview (S1-P10-T007, frontend.md §5.3): the item card as the restaurant's own website draws it —
 * picture or icon fallback, dietary mark with its text label, the "from" price when variants exist, and the states a
 * guest would actually see ("Unavailable today", "Not on your website yet"). It renders what is on screen, not what
 * is saved, so the person editing can see the effect before committing to it.
 */
export function PublicItemPreview({
  name,
  description,
  imageUrl,
  iconKey,
  basePrice,
  dietaryType,
  variants,
  addons,
  isAvailable,
  isPublished,
  currencyCode,
}: {
  name: string;
  description: string;
  imageUrl: string | null;
  iconKey: string | null;
  basePrice: string | null;
  dietaryType: DietaryType | null;
  variants: readonly OptionRow[];
  addons: readonly OptionRow[];
  isAvailable: boolean;
  isPublished: boolean;
  currencyCode: string;
}) {
  const money = (amount: string) => formatMoney(amount, currencyCode);
  const available = variants.filter((variant) => variant.isAvailable && variant.price !== null);
  const from = lowestPrice(basePrice ?? "0.00", available.map((variant) => variant.price));
  const showsFrom = available.length > 0;

  return (
    <Card surface="glass" className="gap-4">
      <p className="text-caption text-fg-secondary">Preview — how guests see this item</p>
      <MenuCover imageUrl={imageUrl} iconKey={iconKey} name={name || "New menu item"} />
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 break-words text-heading text-fg-primary">{name.trim() || "Untitled item"}</h3>
          <p className="shrink-0 text-subheading tabular-nums text-fg-primary">
            {showsFrom && <span className="text-caption font-normal text-fg-secondary">from </span>}
            {money(from)}
          </p>
        </div>
        <DietaryMark dietaryType={dietaryType} />
        {description.trim() && <p className="text-body text-fg-secondary">{description.trim()}</p>}

        {available.length > 0 && (
          <dl className="mt-1 flex flex-col gap-1">
            <dt className="text-label text-fg-primary">Choices</dt>
            {available.map((variant) => (
              <dd key={variant.key} className="flex items-baseline justify-between gap-3 text-body text-fg-secondary">
                <span className="min-w-0 break-words">{variant.name.trim() || "Unnamed variant"}</span>
                <span className="shrink-0 tabular-nums">{money(variant.price ?? "0.00")}</span>
              </dd>
            ))}
          </dl>
        )}

        {addons.some((addon) => addon.isAvailable && addon.price !== null) && (
          <dl className="mt-1 flex flex-col gap-1">
            <dt className="text-label text-fg-primary">Add-ons</dt>
            {addons
              .filter((addon) => addon.isAvailable && addon.price !== null)
              .map((addon) => (
                <dd key={addon.key} className="flex items-baseline justify-between gap-3 text-body text-fg-secondary">
                  <span className="min-w-0 break-words">{addon.name.trim() || "Unnamed add-on"}</span>
                  <span className="shrink-0 tabular-nums">+{money(addon.price ?? "0.00")}</span>
                </dd>
              ))}
          </dl>
        )}

        <div className="mt-2 flex flex-wrap gap-2">
          {!isAvailable && <Badge tone="warning">Unavailable today</Badge>}
          <Badge tone={isPublished ? "success" : "neutral"} icon={isPublished ? Globe : EyeOff}>
            {isPublished ? "On your website" : "Not on your website yet"}
          </Badge>
        </div>
      </div>
    </Card>
  );
}
