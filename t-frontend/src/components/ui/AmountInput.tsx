"use client";

import Input from "./Input";
import type { AmountRule } from "@/lib/validation/amount";

interface AmountInputProps<TField extends string> {
  rule: AmountRule<TField>;
  /** Defaults to the rule's field; set it when the same field repeats on one page, as in a list of items. */
  id?: string;
  /** Unit shown alongside the label, e.g. "kcal" or "g". */
  unit?: string;
  value: string;
  error?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}

function buildLabel<TField extends string>(rule: AmountRule<TField>, unit?: string): string {
  const unitPart = unit ? ` (${unit})` : "";
  const optionalPart = rule.required ? "" : " - optional";
  return `${rule.label}${unitPart}${optionalPart}`;
}

/** A numeric text field wired to one validation rule, so label and limits cannot drift. */
export default function AmountInput<TField extends string>({
  rule,
  id,
  unit,
  value,
  error,
  disabled = false,
  onChange,
}: AmountInputProps<TField>) {
  return (
    <Input
      id={id ?? rule.field}
      label={buildLabel(rule, unit)}
      type="number"
      inputMode="decimal"
      min={0}
      max={rule.max}
      step="any"
      placeholder="0"
      value={value}
      error={error}
      disabled={disabled}
      required={rule.required}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
