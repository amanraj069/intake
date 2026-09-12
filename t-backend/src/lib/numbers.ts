/**
 * Rounds to one decimal place. Summing user-entered macros in floating point
 * produces values like `61.800000000000004`, which must not reach the UI.
 */
export function roundToTenth(value: number): number {
  return Math.round(value * 10) / 10;
}
