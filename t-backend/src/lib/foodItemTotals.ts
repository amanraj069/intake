import { roundToDecimals, roundToTenth } from './numbers';

/** Micronutrient amounts keep enough precision that microgram-scale values do not round away. */
const MICRO_AMOUNT_DECIMALS = 3;

/** Mass units that convert to milligrams, so the same nutrient in mg and mcg can still be summed. */
const MILLIGRAMS_PER_MASS_UNIT: Record<string, number> = { g: 1000, mg: 1, mcg: 0.001, µg: 0.001 };

export interface MicronutrientAmount {
  amount: number;
  unit: string;
}

export interface NutritionTotals {
  calories: number;
  macros: { proteinG: number; carbG: number; fatG: number };
  micros: Record<string, MicronutrientAmount>;
}

/** The nutrition an item carries: exactly what a stored or submitted item has. */
export interface ItemNutrition {
  calories: number;
  macros: { proteinG: number; carbG: number; fatG: number };
  micros?: Record<string, MicronutrientAmount>;
}

function addMicronutrient(totals: Record<string, MicronutrientAmount>, name: string, value: MicronutrientAmount): void {
  const unit = value.unit.trim().toLowerCase();
  const milligramsPerUnit = MILLIGRAMS_PER_MASS_UNIT[unit];

  if (milligramsPerUnit !== undefined) {
    const existing = totals[name];
    const amountMg = value.amount * milligramsPerUnit;
    if (!existing || existing.unit === 'mg') {
      totals[name] = { amount: (existing?.amount ?? 0) + amountMg, unit: 'mg' };
      return;
    }
  }

  // A unit that is not a mass (IU, for example) only sums with the same unit.
  // Anything else is kept apart under its unit rather than added incorrectly.
  const key = totals[name] && totals[name].unit !== value.unit ? `${name} (${value.unit})` : name;
  totals[key] = { amount: (totals[key]?.amount ?? 0) + value.amount, unit: value.unit };
}

/** Sums items into the entry-level totals that every summary and report reads. */
export function sumItemNutrition(items: readonly ItemNutrition[]): NutritionTotals {
  const micros: Record<string, MicronutrientAmount> = {};
  let calories = 0;
  let proteinG = 0;
  let carbG = 0;
  let fatG = 0;

  for (const item of items) {
    calories += item.calories;
    proteinG += item.macros.proteinG;
    carbG += item.macros.carbG;
    fatG += item.macros.fatG;
    for (const [name, value] of Object.entries(item.micros ?? {})) addMicronutrient(micros, name, value);
  }

  for (const value of Object.values(micros)) value.amount = roundToDecimals(value.amount, MICRO_AMOUNT_DECIMALS);

  return {
    calories: roundToTenth(calories),
    macros: { proteinG: roundToTenth(proteinG), carbG: roundToTenth(carbG), fatG: roundToTenth(fatG) },
    micros,
  };
}
