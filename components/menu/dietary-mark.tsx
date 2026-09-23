import type { DietaryType } from "@prisma/client";
import { cn } from "@/lib/ui/cn";

/**
 * Food marking (design.md §5 "Exception"): the regulated veg / non-veg / egg symbol — a square outline with a filled
 * dot (veg, egg) or triangle (non-veg) — drawn here rather than taken from the icon set, and always accompanied by a
 * text label so the meaning never rests on colour alone.
 */
const MARKS: Record<DietaryType, { label: string; colour: string; shape: "dot" | "triangle" }> = {
  VEG: { label: "Veg", colour: "text-status-success", shape: "dot" },
  NON_VEG: { label: "Non-veg", colour: "text-status-danger", shape: "triangle" },
  EGG: { label: "Egg", colour: "text-status-warning", shape: "dot" },
};

export function DietaryMark({ dietaryType, showLabel = true, className }: { dietaryType: DietaryType | null; showLabel?: boolean; className?: string }) {
  if (!dietaryType) return null;
  const mark = MARKS[dietaryType];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-caption text-fg-secondary", className)}>
      <span aria-hidden="true" className={cn("inline-flex h-4 w-4 items-center justify-center rounded-md border-2 border-current", mark.colour)}>
        {mark.shape === "dot" ? (
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
        ) : (
          <svg viewBox="0 0 10 9" className="h-2 w-2 fill-current" role="presentation" focusable="false">
            <polygon points="5,0 10,9 0,9" />
          </svg>
        )}
      </span>
      <span className={cn(!showLabel && "sr-only")}>{mark.label}</span>
    </span>
  );
}

export function dietaryLabel(dietaryType: DietaryType | null): string {
  return dietaryType ? MARKS[dietaryType].label : "Not marked";
}
