"use client";

import * as React from "react";
import { Clock } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/ui/cn";
import { zoneAbbreviation } from "@/lib/ui/format";

/**
 * LiveClock (S1-P08-T008, frontend.md §3.2, BA-32): the restaurant's wall-clock time — never the browser's — updated
 * every second with the zone abbreviation. `aria-live="off"`: it is information on demand, not an announcement.
 * Renders a placeholder until mounted so server and client markup agree.
 */
export function LiveClock({ timezone, locale = "en", className }: { timezone: string; locale?: string; className?: string }) {
  const [now, setNow] = React.useState<Date | null>(null);

  React.useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const time = now ? new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: timezone }).format(now) : "--:--:--";
  return (
    <p aria-live="off" className={cn("items-center gap-2 rounded-xl border border-border-subtle bg-canvas px-3 h-10 text-label text-fg-primary", className ?? "flex")}>
      <Icon icon={Clock} size={16} className="text-fg-accent" />
      <span className="sr-only">Restaurant time</span>
      <time dateTime={now?.toISOString()} className="tabular-nums">
        {time}
      </time>
      <span className="text-caption text-fg-secondary">{now ? zoneAbbreviation(now, timezone, locale) : ""}</span>
    </p>
  );
}
