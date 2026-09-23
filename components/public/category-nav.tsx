"use client";

import * as React from "react";
import { cn } from "@/lib/ui/cn";

/**
 * Sticky category navigation for the public menu (S1-P09-T003, design.md §6.2).
 *
 * A horizontally scrolling, scroll-snapping row of in-page links. It is a real `<nav>` of anchors, so it works with
 * JavaScript disabled and with a keyboard; the observer below only *highlights* the section currently in view. The
 * row scrolls inside itself — the page body never scrolls sideways.
 */
export function CategoryNav({ categories, label }: { categories: ReadonlyArray<{ id: string; name: string }>; label: string }) {
  const [active, setActive] = React.useState<string | null>(categories[0]?.id ?? null);
  const listRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (categories.length === 0 || typeof IntersectionObserver === "undefined") return;
    const targets = categories.map((category) => document.getElementById(`menu-${category.id}`)).filter((node): node is HTMLElement => node !== null);
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id.replace(/^menu-/, ""));
      },
      { rootMargin: "-96px 0px -60% 0px", threshold: 0 },
    );
    for (const target of targets) observer.observe(target);
    return () => observer.disconnect();
  }, [categories]);

  // Keep the highlighted chip in view as the reader scrolls the page, without moving the page itself.
  React.useEffect(() => {
    if (!active) return;
    const chip = listRef.current?.querySelector<HTMLElement>(`[data-category="${CSS.escape(active)}"]`);
    chip?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [active]);

  if (categories.length === 0) return null;

  return (
    <nav aria-label={label} className="glass-1 sticky top-0 z-header -mx-4 border-b px-4 py-2">
      <div ref={listRef} className="flex gap-2 overflow-x-auto snap-x scroll-px-4">
        {categories.map((category) => (
          <a
            key={category.id}
            href={`#menu-${category.id}`}
            data-category={category.id}
            aria-current={active === category.id ? "true" : undefined}
            className={cn(
              "inline-flex h-10 shrink-0 snap-start items-center rounded-xl px-4 text-nav transition-colors duration-fast ease-standard",
              active === category.id ? "bg-action-primary text-action-primary-fg" : "text-fg-secondary hover:text-fg-primary",
            )}
          >
            {category.name}
          </a>
        ))}
      </div>
    </nav>
  );
}
