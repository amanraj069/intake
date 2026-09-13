/**
 * Numeric bounds mirroring the zod schemas in `t-backend/src/schemas`.
 * They exist so the user sees a field-level message before a round trip;
 * the backend remains the authority. Keep the two in sync.
 */
export const LIMITS = {
  calories: 20000,
  macroGrams: 2000,
  weightKg: 1000,
  quantity: 100000,
  microAmount: 100000,
  micronutrientRows: 50,
  itemsPerEntry: 30,
  itemNameLength: 200,
  unitLength: 20,
  nutrientNameLength: 60,
} as const;

export interface AmountRule<TField extends string> {
  field: TField;
  label: string;
  max: number;
  required: boolean;
}

export type FieldErrors<TField extends string> = Partial<Record<TField, string>>;

/** Returns a human-readable problem with a numeric text input, or undefined if it is valid. */
export function findAmountError(
  raw: string,
  rule: { label: string; max: number; required: boolean }
): string | undefined {
  const trimmed = raw.trim();

  if (!trimmed) {
    return rule.required ? `${rule.label} is required` : undefined;
  }

  const value = Number(trimmed);

  if (!Number.isFinite(value)) return `${rule.label} must be a number`;
  if (value < 0) return `${rule.label} cannot be negative`;
  if (value > rule.max) return `${rule.label} must be at most ${rule.max.toLocaleString()}`;

  return undefined;
}

export function collectAmountErrors<TField extends string>(
  rules: readonly AmountRule<TField>[],
  values: Record<TField, string>
): FieldErrors<TField> {
  const errors: FieldErrors<TField> = {};

  for (const rule of rules) {
    const error = findAmountError(values[rule.field], rule);
    if (error) errors[rule.field] = error;
  }

  return errors;
}

export function hasErrors(errors: object): boolean {
  return Object.keys(errors).length > 0;
}

/** Safe only after findAmountError has cleared the same string. */
export function toAmount(raw: string): number {
  return Number(raw.trim());
}
