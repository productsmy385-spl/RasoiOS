import * as React from "react";
import { CircleCheck, Info, TriangleAlert, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/ui/cn";
import type { Tone } from "@/lib/ui/icons";
import { Icon } from "./icon";

/**
 * Alert (inline, inside content) and Banner (full-width, top of a page) — S1-P08-T004. Icon + text, tone never alone.
 * Danger alerts use role="alert"; others role="status".
 */
const TONE: Record<Tone, { box: string; icon: LucideIcon }> = {
  neutral: { box: "bg-raised border-border-strong text-fg-primary", icon: Info },
  primary: { box: "bg-action-primary/12 border-action-primary/40 text-fg-primary", icon: Info },
  success: { box: "bg-status-success/12 border-status-success/40 text-fg-primary", icon: CircleCheck },
  warning: { box: "bg-status-warning/12 border-status-warning/40 text-fg-primary", icon: TriangleAlert },
  danger: { box: "bg-status-danger/12 border-status-danger/40 text-fg-primary", icon: TriangleAlert },
};

const ICON_COLOUR: Record<Tone, string> = {
  neutral: "text-fg-secondary",
  primary: "text-fg-accent",
  success: "text-status-success",
  warning: "text-status-warning",
  danger: "text-status-danger",
};

export function Alert({ tone = "neutral", title, children, className, action }: { tone?: Tone; title?: string; children?: React.ReactNode; className?: string; action?: React.ReactNode }) {
  const t = TONE[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex items-start gap-3 rounded-xl border px-4 py-3", t.box, className)}>
      <Icon icon={t.icon} size={18} className={cn("mt-0.5", ICON_COLOUR[tone])} />
      <div className="flex-1 min-w-0 space-y-1">
        {title && <p className="text-label">{title}</p>}
        {children && <div className="text-body text-fg-secondary">{children}</div>}
      </div>
      {action}
    </div>
  );
}

export function Banner({ tone = "warning", children, className }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  const t = TONE[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex items-center gap-3 border-b px-4 sm:px-6 lg:px-8 py-3", t.box, className)}>
      <Icon icon={t.icon} size={18} className={ICON_COLOUR[tone]} />
      <div className="text-label">{children}</div>
    </div>
  );
}
