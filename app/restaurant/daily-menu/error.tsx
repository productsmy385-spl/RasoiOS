"use client";

import { ErrorState } from "@/components/states/error-state";

/** Error boundary for `/restaurant/daily-menu` (frontend.md §4). No internals reach the screen. */
export default function DailyMenuError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorState requestId={error.digest} onRetry={reset} message="We couldn't load the daily menu. Try again in a moment." />;
}
