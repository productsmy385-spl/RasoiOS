import * as React from "react";
import { cn } from "@/lib/ui/cn";

/**
 * Card (design.md §8): surface-2, e1, rounded-2xl, p-5; header row with an action slot, footer pinned to the bottom so
 * cards in a row line up.
 *
 * `surface="glass"` opts into the `glass-2` recipe (design.md §4.6) and is for metric tiles, quick-action blocks and
 * contextual panels only. Long text, data tables, forms and the kitchen board stay on the opaque default, and a glass
 * card is never placed inside another glass surface.
 */
export const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { padding?: "compact" | "standard" | "feature"; surface?: "solid" | "glass" }
>(function Card({ className, padding = "standard", surface = "solid", ...props }, ref) {
  const pad = padding === "compact" ? "p-4" : padding === "feature" ? "p-6" : "p-5";
  const skin = surface === "glass" ? "glass-2" : "bg-card border border-border-subtle shadow-e1";
  return <div ref={ref} className={cn("flex flex-col rounded-2xl text-fg-primary", pad, skin, className)} {...props} />;
});

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { action?: React.ReactNode }>(function CardHeader(
  { className, action, children, ...props },
  ref,
) {
  return (
    <div ref={ref} className={cn("flex items-start justify-between gap-4 mb-4", className)} {...props}>
      <div className="flex flex-col gap-1 min-w-0">{children}</div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
});

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(function CardTitle({ className, ...props }, ref) {
  return <h2 ref={ref} className={cn("text-heading font-sans text-fg-primary", className)} {...props} />;
});

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(function CardDescription(
  { className, ...props },
  ref,
) {
  return <p ref={ref} className={cn("text-body text-fg-secondary", className)} {...props} />;
});

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(function CardContent({ className, ...props }, ref) {
  return <div ref={ref} className={cn("flex flex-col gap-4", className)} {...props} />;
});

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(function CardFooter({ className, ...props }, ref) {
  return <div ref={ref} className={cn("mt-auto pt-4 flex items-center justify-end gap-2", className)} {...props} />;
});
