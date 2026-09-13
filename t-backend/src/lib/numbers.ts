/**
 * Rounds to one decimal place. Summing user-entered macros in floating point
 * produces values like `61.800000000000004`, which must not reach the UI.
 */
export function roundToTenth(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Rounds to a fixed number of decimal places. Micronutrients are stored in mg,
 * so a microgram-scale nutrient such as vitamin D (0.002 mg) needs more
 * precision than `roundToTenth` keeps.
 */
export function roundToDecimals(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
