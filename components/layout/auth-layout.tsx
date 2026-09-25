import * as React from "react";
import { BrandMark } from "./brand";
import { FoodBackdrop } from "./food-backdrop";

/**
 * Auth page frame (ADR-013 §1, design.md §4.2): the same dark-glass brand impression as the landing page, so signing
 * in does not change worlds. Centred column up to 440 px with 16 px gutters, the brand mark, the page's single h1 and
 * a short description; full width below 640 px.
 */
export function AuthLayout({ title, description, children, footer }: { title: string; description?: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="page-wash isolate flex min-h-screen flex-col bg-canvas text-fg-primary">
      <FoodBackdrop />
      <main id="main-content" className="mx-auto flex w-full max-w-auth flex-1 flex-col justify-center gap-6 px-4 py-10">
        <div className="flex flex-col items-center gap-4 text-center">
          <BrandMark href="/" />
          <div className="flex flex-col gap-2">
            <h1 className="text-display-m text-fg-primary">{title}</h1>
            {description && <p className="text-body-public text-fg-secondary">{description}</p>}
          </div>
        </div>
        {children}
        {footer && <div className="text-center text-caption text-fg-secondary">{footer}</div>}
      </main>
    </div>
  );
}
