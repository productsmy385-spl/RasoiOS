"use client";

import { ErrorState } from "@/components/states/error-state";

/** Route error boundary for the order screens (frontend.md §4): plain message, retry, request id — no internals. */
export default function OrdersError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorState requestId={error.digest ?? null} onRetry={reset} message="We couldn't load your orders. Try again in a moment." />;
}
