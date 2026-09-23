"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/ui/cn";
import { IconButton } from "./icon-button";
import { useModal } from "./use-modal";

/**
 * Drawer (design.md §4.6 glass-3): a sheet on the native `<dialog>` element — the mobile "More" sheet and pickers.
 * Same focus, Esc and backdrop behaviour as <Dialog>. `left`/`right` are full-height side sheets up to 320 px wide;
 * `bottom` is the phone sheet that rises from the bottom bar, capped at 80 % of the viewport.
 */
export type DrawerProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Visually hide the title (it still names the drawer for screen readers). */
  hideTitle?: boolean;
  side?: "left" | "right" | "bottom";
  children: React.ReactNode;
  className?: string;
};

const SIDE: Record<NonNullable<DrawerProps["side"]>, string> = {
  left: "inset-y-0 left-0 right-auto h-screen max-h-none w-full max-w-xs rounded-r-3xl",
  right: "inset-y-0 left-auto right-0 h-screen max-h-none w-full max-w-xs rounded-l-3xl",
  bottom: "inset-x-0 bottom-0 top-auto h-auto max-h-[80vh] w-full max-w-none rounded-t-3xl",
};

export function Drawer({ open, onClose, title, hideTitle = false, side = "left", children, className }: DrawerProps) {
  const titleId = React.useId();
  const { dialogRef, dialogProps } = useModal({ open, onRequestClose: onClose });
  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className={cn(
        // `glass-3` (design.md §4.6) with its ::backdrop scrim and opaque fallbacks.
        "glass-3 fixed m-0 overflow-hidden p-0 text-fg-primary open:flex open:flex-col",
        SIDE[side],
        className,
      )}
      {...dialogProps}
    >
      {open && (
        <>
          <div className="flex h-16 shrink-0 items-center justify-between gap-4 px-4">
            <h2 id={titleId} className={cn("text-subheading font-sans text-fg-primary", hideTitle && "sr-only")}>
              {title}
            </h2>
            <IconButton icon={X} aria-label="Close" data-modal-close="" onClick={onClose} className="ml-auto" />
          </div>
          <div data-modal-body="" className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
            {children}
          </div>
        </>
      )}
    </dialog>
  );
}
