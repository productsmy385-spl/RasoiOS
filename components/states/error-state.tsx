"use client";

import { TriangleAlert } from "lucide-react";
import { IconTile } from "@/components/ui/icon-tile";

/** Error state (design.md §9): danger tile, plain message, retry, and the request id for support. No internals. */
export function ErrorState({ requestId, onRetry, message = "We couldn't load this. Try again in a moment." }: { requestId?: string | null; onRetry?: () => void; message?: string }) {
  return (
    <div role="alert" className="flex flex-col items-center text-center gap-3 py-12 px-4">
      <IconTile icon={TriangleAlert} size="lg" tone="danger" />
      <h2 className="text-heading text-fg-primary">Something went wrong</h2>
      <p className="text-body text-fg-secondary max-w-md">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="inline-flex items-center h-10 px-4 rounded-xl bg-action-primary hover:bg-action-primary-hover text-action-primary-fg text-label">
          Try again
        </button>
      )}
      {requestId && <p className="text-caption text-fg-secondary">Reference: {requestId}</p>}
    </div>
  );
}
