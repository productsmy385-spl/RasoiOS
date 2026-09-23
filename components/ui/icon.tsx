import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/ui/cn";

/**
 * Icon wrapper (S1-P08-T003, design.md §5). Sizes are fixed to the design scale; stroke is 1.75 (2 at 16 px);
 * colour is always `currentColor`. Decorative by default (`aria-hidden`); pass `label` for a meaningful icon.
 */
export type IconSize = 16 | 18 | 20 | 24 | 32;

export function Icon({ icon: Glyph, size = 18, label, className }: { icon: LucideIcon; size?: IconSize; label?: string; className?: string }) {
  return (
    <Glyph
      width={size}
      height={size}
      strokeWidth={size === 16 ? 2 : 1.75}
      className={cn("shrink-0", className)}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
      focusable="false"
    />
  );
}
