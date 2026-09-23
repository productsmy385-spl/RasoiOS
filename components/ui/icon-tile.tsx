import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/ui/cn";
import type { DomainHue, Tone } from "@/lib/ui/icons";
import { Icon } from "./icon";

/**
 * Icon container (design.md §5, §5.2): sm 32/16 · md 40/20 · lg 56/32, rounded-xl, tonal wash at 12 % with the icon
 * in the readable step of its hue. One tile style across navigation, dashboards, empty states and feature sections —
 * it is the *only* place a domain hue is painted, so colour never leaks into body text, table rows or large fills.
 */
const SIZES = { sm: { box: "w-8 h-8", icon: 16 }, md: { box: "w-10 h-10", icon: 20 }, lg: { box: "w-14 h-14", icon: 32 } } as const;

/** Status tones (design.md §7) stay theme-aware so they also read correctly on light public surfaces. */
export const TONE_TILE: Record<Tone, string> = {
  neutral: "bg-fg-secondary/12 text-fg-secondary",
  primary: "bg-action-primary/12 text-fg-accent",
  success: "bg-status-success/12 text-status-success",
  warning: "bg-status-warning/12 text-status-warning",
  danger: "bg-status-danger/12 text-status-danger",
};

/**
 * Domain hues (design.md §5.2). The console is always dark, so these name scale steps directly; each text step is
 * checked against the near-black canvas (secondary-300 9.43:1, tertiary-300 9.06:1, accent-300 10.12:1, warning 10.28:1).
 */
export const HUE_TILE: Record<DomainHue, string> = {
  ...TONE_TILE,
  secondary: "bg-secondary-500/12 text-secondary-300",
  "secondary-soft": "bg-secondary-300/12 text-secondary-200",
  "tertiary-soft": "bg-tertiary-300/12 text-tertiary-300",
  accent: "bg-accent-400/12 text-accent-300",
  "accent-soft": "bg-accent-300/12 text-accent-200",
};

export function IconTile({
  icon,
  size = "md",
  tone = "primary",
  label,
  className,
}: {
  icon: LucideIcon;
  size?: keyof typeof SIZES;
  /** A status tone (design.md §7) or a domain hue (design.md §5.2). */
  tone?: DomainHue;
  label?: string;
  className?: string;
}) {
  const s = SIZES[size];
  return (
    <span className={cn("inline-flex items-center justify-center rounded-xl shrink-0", s.box, HUE_TILE[tone], className)}>
      <Icon icon={icon} size={s.icon} label={label} />
    </span>
  );
}
