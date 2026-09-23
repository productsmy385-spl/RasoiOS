"use client";

import { ErrorState } from "@/components/states/error-state";

/** Route error boundary for the kitchen board (frontend.md §4). */
export default function KitchenError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorState requestId={error.digest ?? null} onRetry={reset} message="We couldn't load the kitchen board. Try again in a moment." />;
}
