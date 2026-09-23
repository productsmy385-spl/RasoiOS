"use client";

// Global error boundary (S1-P04-T005). Shows no stack, SQL or provider message — only Next's opaque digest, which
// the server logs next to the real error.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="min-h-screen bg-canvas flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-4">
        <h1 className="font-display text-2xl font-bold text-fg-primary">Something went wrong</h1>
        <p className="text-sm text-fg-secondary">We couldn&apos;t load this page. Try again in a moment.</p>
        {error.digest && <p className="text-xs text-fg-secondary">Reference: {error.digest}</p>}
        <button type="button" onClick={reset} className="px-4 py-2 rounded-xl bg-action-primary hover:bg-action-primary-hover text-action-primary-fg text-sm font-semibold">
          Try again
        </button>
      </div>
    </main>
  );
}
