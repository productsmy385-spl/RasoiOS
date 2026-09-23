"use client";

import * as React from "react";

/**
 * Behaviour shared by <Dialog> and <Drawer> (S1-P08-T006) on the native `<dialog>` element:
 * - `showModal()` makes the rest of the page inert; Tab/Shift+Tab additionally wrap inside the dialog.
 * - Focus moves in on open (initial-focus target, else the first field, else the first control) and returns to the
 *   element that opened it on close.
 * - Esc and backdrop clicks *request* a close, which the caller may refuse (dirty-form guard).
 * - The page behind does not scroll while the dialog is open.
 */
const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function focusableWithin(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => !el.hasAttribute("inert") && el.getClientRects().length > 0);
}

export function useModal({
  open,
  onRequestClose,
  initialFocusRef,
}: {
  open: boolean;
  onRequestClose: () => void;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
}) {
  const dialogRef = React.useRef<HTMLDialogElement>(null);
  const returnFocusRef = React.useRef<HTMLElement | null>(null);
  const requestCloseRef = React.useRef(onRequestClose);
  React.useEffect(() => {
    requestCloseRef.current = onRequestClose;
  });

  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !open) return;

    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!dialog.open) dialog.showModal();
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = "hidden";

    const target =
      initialFocusRef?.current ??
      dialog.querySelector<HTMLElement>("[autofocus]") ??
      dialog.querySelector<HTMLElement>("[data-modal-body] input:not([type='hidden']), [data-modal-body] select, [data-modal-body] textarea") ??
      focusableWithin(dialog).find((el) => !el.hasAttribute("data-modal-close")) ??
      focusableWithin(dialog)[0];
    target?.focus();

    return () => {
      root.style.overflow = previousOverflow;
      if (dialog.open) dialog.close();
      const returnTo = returnFocusRef.current;
      if (returnTo && returnTo.isConnected) returnTo.focus();
    };
  }, [open, initialFocusRef]);

  const onCancel = React.useCallback((event: React.SyntheticEvent<HTMLDialogElement>) => {
    // Esc: never let the browser close the dialog behind React's back.
    event.preventDefault();
    requestCloseRef.current();
  }, []);

  const onMouseDown = React.useCallback((event: React.MouseEvent<HTMLDialogElement>) => {
    // A press on the <dialog> element itself (not its content) is a press on the backdrop.
    if (event.target === event.currentTarget) requestCloseRef.current();
  }, []);

  const onKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLDialogElement>) => {
    if (event.key !== "Tab") return;
    const items = focusableWithin(event.currentTarget);
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || !event.currentTarget.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || !event.currentTarget.contains(active))) {
      event.preventDefault();
      first.focus();
    }
  }, []);

  return { dialogRef, dialogProps: { onCancel, onMouseDown, onKeyDown } };
}
