import type { ComponentProps } from "react";
import type { SignIn } from "@clerk/nextjs";
import { palette, semanticTokens } from "./tokens";

/**
 * Clerk <SignIn>/<SignUp> on the Brand v2 dark console theme (ADR-013 §1, design.md §1–§3). Every value comes from
 * the design scales: the primary fill is primary-400 with `#070B0A` text (8.01:1), body text is surface-100 on the
 * near-black card (14.26:1) and the focus ring is accent-300. Clerk's own card header is hidden because the page
 * provides the h1 and description.
 */
type Appearance = NonNullable<ComponentProps<typeof SignIn>["appearance"]>;

const dark = semanticTokens.dark;

const variables: Appearance["variables"] = {
  colorPrimary: dark.primary,
  colorPrimaryForeground: dark["on-primary"],
  colorBackground: dark["surface-2"],
  colorForeground: dark.text,
  colorMutedForeground: dark["text-muted"],
  colorNeutral: dark.text,
  colorInput: palette.surface[900],
  colorInputForeground: dark.text,
  colorDanger: dark["text-danger"],
  colorSuccess: dark["text-success"],
  colorWarning: dark.warning,
  colorRing: dark["focus-ring"],
  borderRadius: "12px",
  fontFamily: "var(--font-sans), system-ui, sans-serif",
};

const elements = {
  rootBox: "w-full",
  cardBox: "w-full max-w-none rounded-2xl border border-border-subtle shadow-e2",
  card: "bg-card shadow-none",
  header: "hidden",
  formFieldLabel: "text-label text-fg-primary",
  formFieldInput: "h-10 rounded-xl border-border-strong text-fg-primary",
  otpCodeFieldInput: "border-border-strong text-fg-primary",
  formButtonPrimary: "h-10 rounded-xl bg-action-primary text-label text-action-primary-fg shadow-none hover:bg-action-primary-hover",
  footerActionLink: "text-fg-accent hover:text-fg-primary",
  formResendCodeLink: "text-fg-accent hover:text-fg-primary",
  identityPreviewEditButton: "text-fg-accent",
};

/** Sign-in: no "Sign up" link — accounts come only from invitations (ADR-006, SC-AUTH-05). */
export const signInAppearance: Appearance = { variables, elements: { ...elements, footerAction: "hidden" } };

/** Invitation sign-up: keeps "Already have an account? Sign in". */
export const signUpAppearance: Appearance = { variables, elements };
