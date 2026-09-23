"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/ui/cn";
import { Button } from "./button";
import { IconButton } from "./icon-button";
import { useModal } from "./use-modal";

/**
 * Dialog and ConfirmDialog (S1-P08-T006, design.md §8 Dialogs) on the native `<dialog>` element: e3, rounded-3xl,
 * width 480 (confirm) / 640 (form) / 800 (options), title + description, primary action on the right.
 * Esc, the close button and a backdrop click close it — unless the user has typed into it, in which case they are
 * asked to discard their changes first (dirty-form guard). Focus returns to the control that opened it.
 */
export type DialogSize = "confirm" | "form" | "options";

const WIDTH: Record<DialogSize, string> = { confirm: "max-w-dialog-confirm", form: "max-w-dialog-form", options: "max-w-dialog-options" };

export type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  size?: DialogSize;
  children?: React.ReactNode;
  /** Actions row, pinned below the scrolling body (primary action last, on the right). */
  footer?: React.ReactNode;
  /** Ask before closing when the user has typed into the dialog. Default true. */
  guardDirty?: boolean;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  className?: string;
};

export function Dialog({ open, onClose, title, description, size = "form", children, footer, guardDirty = true, initialFocusRef, className }: DialogProps) {
  const titleId = React.useId();
  const descriptionId = React.useId();
  const [dirty, setDirty] = React.useState(false);
  const [confirmingDiscard, setConfirmingDiscard] = React.useState(false);
  const keepEditingRef = React.useRef<HTMLButtonElement>(null);

  // A fresh dialog starts clean.
  React.useEffect(() => {
    if (open) {
      setDirty(false);
      setConfirmingDiscard(false);
    }
  }, [open]);

  const requestClose = React.useCallback(() => {
    if (guardDirty && dirty) setConfirmingDiscard(true);
    else onClose();
  }, [guardDirty, dirty, onClose]);

  React.useEffect(() => {
    if (confirmingDiscard) keepEditingRef.current?.focus();
  }, [confirmingDiscard]);

  const { dialogRef, dialogProps } = useModal({ open, onRequestClose: requestClose, initialFocusRef });

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onInputCapture={() => setDirty(true)}
      className={cn(
        // Closed dialogs stay display:none (UA style); `open:flex` only applies while shown.
        // `glass-3` (design.md §4.6) carries the panel fill, blur, border, e3 shadow and the ::backdrop scrim,
        // together with the opaque fallbacks for prefers-reduced-transparency and no backdrop-filter support.
        "glass-3 w-full overflow-hidden rounded-3xl p-0 text-fg-primary open:flex open:flex-col",
        WIDTH[size],
        className,
      )}
      {...dialogProps}
    >
      {open && (
        <>
          <div className="flex shrink-0 items-start justify-between gap-4 px-6 pt-6 pb-4">
            <div className="flex min-w-0 flex-col gap-1">
              <h2 id={titleId} className="text-heading font-sans text-fg-primary">
                {title}
              </h2>
              {description && (
                <div id={descriptionId} className="text-body text-fg-secondary">
                  {description}
                </div>
              )}
            </div>
            <IconButton icon={X} aria-label="Close" data-modal-close="" onClick={requestClose} className="-mr-2 -mt-2 shrink-0" />
          </div>
          <div data-modal-body="" className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
            {children}
          </div>
          {confirmingDiscard ? (
            <div role="group" aria-labelledby={`${titleId}-discard`} className="flex shrink-0 flex-col gap-3 border-t border-border-subtle bg-raised px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p id={`${titleId}-discard`} role="alert" className="text-label">
                Discard your changes?
              </p>
              <div className="flex justify-end gap-2">
                <Button ref={keepEditingRef} variant="secondary" onClick={() => setConfirmingDiscard(false)}>
                  Keep editing
                </Button>
                <Button variant="destructive" onClick={onClose}>
                  Discard
                </Button>
              </div>
            </div>
          ) : (
            footer && <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border-subtle px-6 py-4 sm:flex-row sm:justify-end">{footer}</div>
          )}
        </>
      )}
    </dialog>
  );
}

export type ConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Name the object: "Archive 'Starters'?" (design.md §8). */
  title: string;
  description?: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "primary" | "destructive";
  /** Runs the action; the dialog shows a pending state until it settles and the caller closes it. */
  onConfirm: () => void | Promise<unknown>;
  /** Type-to-confirm for irreversible actions, e.g. "ANONYMISE". */
  confirmText?: string;
  pending?: boolean;
  children?: React.ReactNode;
};

export function ConfirmDialog({ open, onClose, title, description, confirmLabel, cancelLabel = "Cancel", tone = "primary", onConfirm, confirmText, pending: pendingProp, children }: ConfirmDialogProps) {
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  const [typed, setTyped] = React.useState("");
  const [running, setRunning] = React.useState(false);
  const pending = pendingProp ?? running;
  const inputId = React.useId();

  React.useEffect(() => {
    if (open) setTyped("");
  }, [open]);

  async function confirm() {
    setRunning(true);
    try {
      await onConfirm();
    } finally {
      setRunning(false);
    }
  }

  const blocked = confirmText !== undefined && typed !== confirmText;
  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!pending) onClose();
      }}
      title={title}
      description={description}
      size="confirm"
      guardDirty={false}
      // Destructive: start on the safe choice.
      initialFocusRef={tone === "destructive" && !confirmText ? cancelRef : undefined}
      footer={
        <>
          <Button ref={cancelRef} variant="secondary" onClick={onClose} disabled={pending}>
            {cancelLabel}
          </Button>
          <Button variant={tone === "destructive" ? "destructive" : "primary"} onClick={confirm} loading={pending} loadingLabel="Working…" disabled={blocked}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
      {confirmText !== undefined && (
        <div className="flex flex-col gap-1.5 pt-2">
          <label htmlFor={inputId} className="text-label text-fg-primary">
            Type {confirmText} to confirm
          </label>
          <input
            id={inputId}
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            autoComplete="off"
            spellCheck={false}
            className="h-10 w-full rounded-xl border border-border-strong bg-canvas px-3 text-body text-fg-primary"
          />
        </div>
      )}
    </Dialog>
  );
}
