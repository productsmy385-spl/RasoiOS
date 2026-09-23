/**
 * Loading skeletons that mirror the final layout (design.md §9). The shimmer is a CSS animation, so the global
 * reduced-motion rule makes it static (TC-DS-006). Announced once as "Loading…" for screen readers.
 */
function Bar({ className }: { className: string }) {
  return <div className={`rounded-md bg-raised motion-safe:animate-pulse ${className}`} />;
}

export function PageSkeleton({ variant = "list", rows = 6 }: { variant?: "list" | "cards" | "detail"; rows?: number }) {
  return (
    <div role="status" aria-live="polite" className="space-y-6">
      <span className="sr-only">Loading…</span>
      <Bar className="h-8 w-56" />
      {variant === "cards" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="rounded-2xl bg-card border border-border-subtle p-5 space-y-3">
              <Bar className="h-4 w-24" />
              <Bar className="h-8 w-32" />
            </div>
          ))}
        </div>
      )}
      {variant === "list" && (
        <div className="rounded-2xl bg-card border border-border-subtle divide-y divide-border-subtle">
          {Array.from({ length: rows }, (_, i) => (
            <div key={i} className="flex items-center gap-4 h-12 px-4">
              <Bar className="h-4 w-32" />
              <Bar className="h-4 flex-1" />
              <Bar className="h-4 w-20" />
            </div>
          ))}
        </div>
      )}
      {variant === "detail" && (
        <div className="rounded-2xl bg-card border border-border-subtle p-5 space-y-4">
          {Array.from({ length: rows }, (_, i) => (
            <Bar key={i} className={i % 2 === 0 ? "h-4 w-2/3" : "h-4 w-1/2"} />
          ))}
        </div>
      )}
    </div>
  );
}
