import type { Config } from "tailwindcss";
import { motion, palette, radius } from "./lib/ui/tokens";

/**
 * Tailwind theme = design.md tokens only (RASOIOS-ADR-013). `colors`, `borderRadius` and `boxShadow` REPLACE
 * Tailwind's defaults, so no colour outside design.md §2.1 exists. The Brand v1 aliases (`gray`, `amber`, `emerald`,
 * `red`) are gone: every page now names a semantic token or a v2 scale step.
 */
const semantic = (name: string) => `rgb(var(${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}", "./lib/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    colors: {
      transparent: "transparent",
      current: "currentColor",
      white: "#FFFFFF",
      // design.md §2.1 tonal scales.
      primary: palette.primary,
      secondary: palette.secondary,
      tertiary: palette.tertiary,
      accent: palette.accent,
      surface: palette.surface,
      warning: palette.warning,
      /** `danger` is the tertiary scale under its semantic name (ADR-013 §1). */
      danger: palette.tertiary,
      // Semantic tokens (design.md §2.2) — switch with [data-theme] and can be re-pointed by a tenant theme.
      canvas: semantic("--surface"),
      card: semantic("--surface-2"),
      raised: semantic("--surface-3"),
      scrim: semantic("--surface-950"),
      "border-subtle": semantic("--border"),
      "border-strong": semantic("--border-strong"),
      "fg-primary": semantic("--text"),
      "fg-secondary": semantic("--text-muted"),
      "fg-accent": semantic("--text-accent"),
      "action-primary": semantic("--primary"),
      "action-primary-fg": semantic("--on-primary"),
      "action-primary-hover": semantic("--primary-hover"),
      "action-secondary": semantic("--secondary"),
      "action-secondary-fg": semantic("--on-secondary"),
      "action-secondary-hover": semantic("--secondary-hover"),
      "action-danger": semantic("--danger"),
      "action-danger-fg": semantic("--on-danger"),
      "action-danger-hover": semantic("--danger-hover"),
      "action-success": semantic("--accent"),
      "action-success-fg": semantic("--on-accent"),
      "action-success-hover": semantic("--accent-hover"),
      "status-success": semantic("--text-success"),
      "status-warning": semantic("--text-warning"),
      "status-danger": semantic("--text-danger"),
      "status-info": semantic("--text-info"),
      "focus-ring": semantic("--focus-ring"),
    },
    borderRadius: radius,
    boxShadow: {
      none: "none",
      e1: "var(--shadow-e1)",
      e2: "var(--shadow-e2)",
      e3: "var(--shadow-e3)",
      /** design.md §2.4 — one hue glow at ≤ 24 %, on primary controls and live indicators only. */
      glow: "0 0 0 1px rgb(var(--primary) / 0.24), 0 8px 28px -8px rgb(var(--primary) / 0.24)",
    },
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      /** design.md §4.6/§5: the tonal tints glass and icon tiles are drawn with. */
      opacity: { 12: "0.12", 18: "0.18", 72: "0.72", 78: "0.78", 86: "0.86" },
      transitionDuration: { fast: motion.duration.fast, base: motion.duration.base, slow: motion.duration.slow },
      transitionTimingFunction: { standard: motion.easing.standard, exit: motion.easing.exit },
      // Shell containers (design.md §4.2) and dialog widths (design.md §8: confirm 480 / form 640 / options 800).
      maxWidth: { console: "1440px", admin: "1280px", public: "1200px", auth: "440px", "dialog-confirm": "480px", "dialog-form": "640px", "dialog-options": "800px" },
      // design.md §6.1: the console header is 64 px and the mobile bottom bar 64 px + safe area.
      height: { header: "64px", "bottom-bar": "64px" },
      zIndex: { header: "40", "bottom-bar": "40" },
    },
  },
  plugins: [],
};

export default config;
