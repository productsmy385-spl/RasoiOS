"use client";

import * as React from "react";
import { cn } from "@/lib/ui/cn";
import { acceptKeystroke, normalizeMoney, normalizePercent } from "@/lib/ui/decimal-input";
import { currencySymbol } from "@/lib/ui/format";
import { FormField, type FieldProps } from "../form/form-field";
import { CONTROL_HEIGHT, CONTROL_TEXT, useControlWiring, type ControlSize } from "./control";

/**
 * MoneyField and PercentField (S1-P08-T005, SC-VAL-02, ADR-010). The value is a decimal *string* from keystroke to
 * server: keystrokes that cannot become an amount (e.g. "1e3", "-", ",") are ignored, the display is normalised on
 * blur ("480.5" → "480.50"), and the form submits the canonical string through a hidden input. No Number() anywhere.
 */
type DecimalKind = "money" | "percent";

const NORMALIZE: Record<DecimalKind, (text: string) => string | null> = { money: normalizeMoney, percent: normalizePercent };
const FORMAT_HINT: Record<DecimalKind, string> = { money: "Enter an amount like 480.50", percent: "Enter a rate from 0 to 100, like 5 or 18.5" };

type DecimalFieldBaseProps = FieldProps & {
  name: string;
  defaultValue?: string;
  /** Called with the canonical string ("480.50"), or null while the entry is empty or incomplete. */
  onValueChange?: (value: string | null) => void;
  size?: ControlSize;
  disabled?: boolean;
  readOnly?: boolean;
  autoFocus?: boolean;
  inputClassName?: string;
};

function DecimalInput({
  kind,
  prefix,
  suffix,
  srUnit,
  defaultValue = "",
  onValueChange,
  size = "md",
  disabled,
  readOnly,
  autoFocus,
  inputClassName,
  name,
}: Omit<DecimalFieldBaseProps, "label"> & { kind: DecimalKind; prefix?: string; suffix?: string; srUnit: string }) {
  const [text, setText] = React.useState(defaultValue);
  const [touched, setTouched] = React.useState(false);
  const { invalid, id, "aria-describedby": describedBy, "aria-required": ariaRequired } = useControlWiring({});
  const normalized = NORMALIZE[kind](text);
  const unitId = id ? `${id}-unit` : undefined;
  const formatProblem = touched && text.trim() !== "" && normalized === null;

  return (
    <>
      <div
        className={cn(
          "flex w-full items-center gap-2 rounded-xl border bg-canvas px-3 text-fg-primary transition-colors duration-fast ease-standard",
          "focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus-ring",
          invalid || formatProblem ? "border-status-danger" : "border-border-strong hover:border-fg-secondary",
          disabled && "opacity-40",
          CONTROL_HEIGHT[size],
          CONTROL_TEXT[size],
        )}
      >
        {prefix && (
          <span aria-hidden="true" className="shrink-0 text-fg-secondary">
            {prefix}
          </span>
        )}
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          value={text}
          disabled={disabled}
          readOnly={readOnly}
          autoFocus={autoFocus}
          aria-describedby={[unitId, describedBy, formatProblem && id ? `${id}-format` : undefined].filter(Boolean).join(" ") || undefined}
          aria-invalid={invalid || formatProblem || undefined}
          aria-required={ariaRequired}
          onChange={(event) => {
            const next = acceptKeystroke(text, event.target.value, kind);
            if (next === text) return;
            setText(next);
            onValueChange?.(NORMALIZE[kind](next));
          }}
          onBlur={() => {
            setTouched(true);
            if (normalized !== null && normalized !== text) setText(normalized);
          }}
          className={cn("h-full w-full min-w-0 bg-transparent text-right tabular-nums outline-none focus-visible:outline-none disabled:cursor-not-allowed", inputClassName)}
        />
        {suffix && (
          <span aria-hidden="true" className="shrink-0 text-fg-secondary">
            {suffix}
          </span>
        )}
        <span id={unitId} className="sr-only">
          {srUnit}
        </span>
      </div>
      {/* The submitted value: canonical when valid, otherwise the raw text so the server reports the problem. */}
      <input type="hidden" name={name} value={normalized ?? text.trim()} />
      {formatProblem && id && (
        <p id={`${id}-format`} className="text-caption text-status-danger">
          {FORMAT_HINT[kind]}
        </p>
      )}
    </>
  );
}

export type MoneyFieldProps = DecimalFieldBaseProps & {
  /** ISO 4217 code of the restaurant (e.g. "INR"); shown as the symbol prefix. */
  currencyCode: string;
  locale?: string;
};

export function MoneyField({ name, label, required, help, error, id, className, currencyCode, locale = "en", ...rest }: MoneyFieldProps) {
  return (
    <FormField name={name} label={label} required={required} help={help} error={error} id={id} className={className}>
      <DecimalInput kind="money" name={name} prefix={currencySymbol(currencyCode, locale)} srUnit={`Amount in ${currencyCode}`} {...rest} />
    </FormField>
  );
}

export type PercentFieldProps = DecimalFieldBaseProps;

export function PercentField({ name, label, required, help, error, id, className, ...rest }: PercentFieldProps) {
  return (
    <FormField name={name} label={label} required={required} help={help} error={error} id={id} className={className}>
      <DecimalInput kind="percent" name={name} suffix="%" srUnit="Percent" {...rest} />
    </FormField>
  );
}
