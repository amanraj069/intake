/**
 * At most one decimal place, thousands-separated: `1048.04` reads as "1,048"
 * and `61.85` as "61.9". Intake amounts are user-entered and summed in floating
 * point, so the raw values are never fit to print.
 */
export function formatAmount(value: number): string {
  return Number(value.toFixed(1)).toLocaleString("en-US");
}

/** An amount with its unit, e.g. "1,048 kcal". */
export function formatWithUnit(value: number, unit: string): string {
  return `${formatAmount(value)} ${unit}`;
}
