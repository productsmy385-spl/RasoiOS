import * as React from "react";
import { LoaderCircle, type LucideIcon } from "lucide-react";
import { cn as mergeClasses } from "@/lib/ui/cn";
import { Icon } from "./icon";

/** @deprecated import `cn` from "@/lib/ui/cn". Kept for baseline imports. */
export const cn = mergeClasses;

/**
 * Button (design.md §8, Brand v2). Every fill is a semantic pair, so the console (dark) and public (light) themes
 * each get a checked foreground: primary `#070B0A` on primary-400 (8.01:1) / white on primary-600 (4.72:1);
 * destructive `#070B0A` on tertiary-500 (4.79:1) / white on tertiary-600 (5.65:1); success `#070B0A` on accent-400
 * (7.87:1) / white on accent-700 (7.07:1). Hover moves one tone step, which never lowers the pair below AA.
 * Loading keeps the label in place (invisible) so the width never jumps, shows a spinner and sets aria-busy.
 */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive" | "success";
export type ButtonSize = "sm" | "md" | "lg" | "touch";

export const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-action-primary text-action-primary-fg hover:bg-action-primary-hover motion-safe:hover:shadow-glow",
  secondary: "bg-raised text-fg-primary border border-border-strong hover:bg-border-subtle",
  ghost: "bg-transparent text-fg-primary hover:bg-raised",
  destructive: "bg-action-danger text-action-danger-fg hover:bg-action-danger-hover",
  success: "bg-action-success text-action-success-fg hover:bg-action-success-hover",
};

export const BUTTON_SIZES: Record<ButtonSize, { box: string; icon: 16 | 18 | 20 | 24 }> = {
  sm: { box: "h-8 px-3 gap-2 text-label", icon: 16 },
  md: { box: "h-10 px-4 gap-2 text-label", icon: 18 },
  lg: { box: "h-12 px-5 gap-2 text-subheading", icon: 20 },
  touch: { box: "min-h-14 px-5 gap-3 text-subheading", icon: 24 },
};

/** Baseline names mapped to design variants (removed as pages are rebuilt). */
const LEGACY_VARIANT: Record<string, ButtonVariant> = { outline: "secondary", glass: "secondary" };

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  variant?: ButtonVariant | "outline" | "glass";
  /** `icon` is deprecated: use <IconButton>. */
  size?: ButtonSize | "icon";
  icon?: LucideIcon;
  loading?: boolean;
  loadingLabel?: string;
  children?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", icon, loading = false, loadingLabel = "Saving…", disabled, children, type = "button", ...props },
  ref,
) {
  const resolvedVariant = (LEGACY_VARIANT[variant] ?? variant) as ButtonVariant;
  const resolvedSize = size === "icon" ? "md" : size;
  const s = BUTTON_SIZES[resolvedSize];
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-disabled={isDisabled || undefined}
      aria-busy={loading || undefined}
      className={mergeClasses(
        "relative inline-flex items-center justify-center rounded-xl font-semibold select-none",
        "transition-colors duration-fast ease-standard motion-safe:active:scale-[0.98]",
        "disabled:opacity-40 disabled:pointer-events-none",
        size === "icon" ? "h-10 w-10 p-0" : s.box,
        BUTTON_VARIANTS[resolvedVariant],
        className,
      )}
      {...props}
    >
      <span className={mergeClasses("inline-flex items-center justify-center gap-[inherit]", loading && "invisible")}>
        {icon && <Icon icon={icon} size={s.icon} />}
        {children}
      </span>
      {loading && (
        <span className="absolute inset-0 inline-flex items-center justify-center gap-2">
          <Icon icon={LoaderCircle} size={s.icon} className="motion-safe:animate-spin" />
          <span>{loadingLabel}</span>
        </span>
      )}
    </button>
  );
});
