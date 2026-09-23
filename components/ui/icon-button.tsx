import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/ui/cn";
import { BUTTON_VARIANTS, type ButtonVariant } from "./button";
import { Icon } from "./icon";

/**
 * Icon-only button (S1-P08-T004, design.md §5): `aria-label` is required by the type, and doubles as the tooltip.
 */
const SIZES = { sm: { box: "h-8 w-8", icon: 16 }, md: { box: "h-10 w-10", icon: 18 }, lg: { box: "h-12 w-12", icon: 20 } } as const;

export type IconButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "aria-label" | "children"> & {
  icon: LucideIcon;
  "aria-label": string;
  variant?: ButtonVariant;
  size?: keyof typeof SIZES;
};

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, variant = "ghost", size = "md", className, type = "button", title, ...props },
  ref,
) {
  const s = SIZES[size];
  return (
    <button
      ref={ref}
      type={type}
      title={title ?? props["aria-label"]}
      className={cn(
        "inline-flex items-center justify-center rounded-xl transition-colors duration-fast ease-standard disabled:opacity-40 disabled:pointer-events-none",
        s.box,
        BUTTON_VARIANTS[variant],
        className,
      )}
      {...props}
    >
      <Icon icon={icon} size={s.icon} />
    </button>
  );
});
