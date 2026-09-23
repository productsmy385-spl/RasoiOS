"use client";

import { WifiOff } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { formatInZone } from "@/lib/ui/format";

/** Shown when polling has missed 3 updates (ADR-009): "Connection lost — retrying (last updated 14:32:05)". */
export function StaleBanner({ stale, lastSuccessAt, timezone }: { stale: boolean; lastSuccessAt: Date | null; timezone: string }) {
  if (!stale) return null;
  return (
    <div role="status" className="flex items-center gap-2 px-4 py-3 rounded-xl bg-status-warning/10 border border-status-warning/40 text-status-warning text-label">
      <Icon icon={WifiOff} size={18} />
      <span>
        Connection lost — retrying
        {lastSuccessAt ? ` (last updated ${formatInZone(lastSuccessAt, timezone, "time", "en-GB")})` : ""}
      </span>
    </div>
  );
}
