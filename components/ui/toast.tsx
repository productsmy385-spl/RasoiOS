"use client";

import * as React from "react";
import { CircleCheck, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/ui/cn";
import { Icon } from "./icon";

/**
 * Toasts (S1-P08-T004, design.md §8): bottom-right (≥md) / top (<md), at most 3, 5 s, paused on hover/focus.
 * Success uses role="status", errors role="alert". Use for confirmations; keep field errors inline.
 */
type Toast = { id: number; tone: "success" | "danger"; message: string };
type ToastApi = { success: (message: string) => void; error: (message: string) => void };

const ToastContext = React.createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const api = React.useContext(ToastContext);
  if (!api) throw new Error("useToast must be used inside <Toaster>");
  return api;
}

export function Toaster({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const counter = React.useRef(0);
  const push = React.useCallback((tone: Toast["tone"], message: string) => {
    counter.current += 1;
    const toast = { id: counter.current, tone, message };
    setToasts((current) => [...current, toast].slice(-3));
  }, []);
  const dismiss = React.useCallback((id: number) => setToasts((current) => current.filter((t) => t.id !== id)), []);
  const api = React.useMemo<ToastApi>(() => ({ success: (m) => push("success", m), error: (m) => push("danger", m) }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed z-50 top-4 inset-x-4 md:inset-x-auto md:top-auto md:bottom-6 md:right-6 flex flex-col gap-2 md:w-96" aria-live="polite">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [paused, setPaused] = React.useState(false);
  React.useEffect(() => {
    if (paused) return;
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [paused, onDismiss]);
  return (
    <div
      role={toast.tone === "danger" ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="flex items-start gap-3 rounded-xl bg-card border border-border-strong shadow-e2 px-4 py-3 text-fg-primary"
    >
      <Icon icon={toast.tone === "danger" ? TriangleAlert : CircleCheck} size={18} className={cn("mt-0.5", toast.tone === "danger" ? "text-status-danger" : "text-status-success")} />
      <p className="flex-1 text-body">{toast.message}</p>
      <button type="button" onClick={onDismiss} aria-label="Dismiss" className="text-fg-secondary hover:text-fg-primary">
        <Icon icon={X} size={16} />
      </button>
    </div>
  );
}
