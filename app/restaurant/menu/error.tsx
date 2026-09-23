"use client";

import { ErrorState } from "@/components/states/error-state";

/**
 * Error boundary for the menu area (frontend.md §4). Shows no stack, SQL or provider text — only Next's opaque
 * digest, which the server logged next to the real error.
 */
export default function MenuError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorState requestId={error.digest} onRetry={reset} message="We couldn't load your menu. Try again in a moment." />;
}
