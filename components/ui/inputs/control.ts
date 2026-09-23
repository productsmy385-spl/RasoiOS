"use client";

import type * as React from "react";
import { cn } from "@/lib/ui/cn";
import { useFieldControl } from "../form/form-context";

/**
 * Shared control styling and wiring (S1-P08-T005, design.md §4.3): md 40 px, touch 48 px; rounded-xl; border-strong
 * for the control boundary; danger border when invalid; the global focus-visible ring (app/globals.css).
 */
export type ControlSize = "md" | "touch";

export const CONTROL_HEIGHT: Record<ControlSize, string> = { md: "h-10", touch: "h-12" };
/** 16 px text at touch size so mobile browsers do not zoom on focus. */
export const CONTROL_TEXT: Record<ControlSize, string> = { md: "text-body", touch: "text-body-public" };

export function controlClasses({ size = "md", invalid = false, className }: { size?: ControlSize; invalid?: boolean; className?: string }): string {
  return cn(
    "w-full min-w-0 rounded-xl border bg-canvas px-3 text-fg-primary placeholder:text-fg-secondary",
    "transition-colors duration-fast ease-standard disabled:cursor-not-allowed disabled:opacity-40",
    invalid ? "border-status-danger" : "border-border-strong hover:border-fg-secondary",
    CONTROL_HEIGHT[size],
    CONTROL_TEXT[size],
    className,
  );
}

type WiringInput = {
  id?: string;
  name?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: React.AriaAttributes["aria-invalid"];
  "aria-required"?: React.AriaAttributes["aria-required"];
};

type Wiring = {
  id?: string;
  name?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
  "aria-required"?: true;
  invalid: boolean;
};

const truthy = (value: React.AriaAttributes["aria-invalid"] | React.AriaAttributes["aria-required"]) => value !== undefined && value !== false && value !== "false";

/** Merges the surrounding <FormField>'s id, name and ARIA wiring into a control's props (explicit props win). */
export function useControlWiring(props: WiringInput): Wiring {
  const field = useFieldControl();
  const describedBy = [field?.describedBy, props["aria-describedby"]].filter(Boolean).join(" ") || undefined;
  const invalid = props["aria-invalid"] !== undefined ? truthy(props["aria-invalid"]) : Boolean(field?.invalid);
  const required = props["aria-required"] !== undefined ? truthy(props["aria-required"]) : Boolean(field?.required);
  return {
    id: props.id ?? field?.id,
    name: props.name ?? field?.name,
    "aria-describedby": describedBy,
    "aria-invalid": invalid || undefined,
    "aria-required": required || undefined,
    invalid,
  };
}
