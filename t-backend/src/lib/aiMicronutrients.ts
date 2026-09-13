import { MICRONUTRIENT_CATALOG, toMilligrams } from './micronutrientCatalog';
import { roundToDecimals } from './numbers';
import type { FoodItemInput } from '../schemas/foodEntry.schema';

const MICRONUTRIENT_DECIMALS = 3;

/** One micronutrient as an AI model reports it, before the app's rules are applied. */
export interface AiMicronutrientReading {
  name: string;
  amount: number;
  unit: 'mg' | 'mcg';
}

/**
 * Keeps catalog nutrients only, converted to milligrams, and at most `maxCount`.
 * Models list the most significant first, so the cap trims the least important.
 * Response schemas already restrict names and length, so anything dropped here
 * is logged as a sign the model ignored them.
 */
export function normaliseAiMicronutrients(
  items: readonly AiMicronutrientReading[],
  maxCount: number
): NonNullable<FoodItemInput['micros']> {
  const micros: NonNullable<FoodItemInput['micros']> = {};
  const knownNames = new Set(MICRONUTRIENT_CATALOG.map((nutrient) => nutrient.name));

  for (const item of items) {
    if (!knownNames.has(item.name)) {
      console.warn(`[AiMicronutrients] Ignoring unknown micronutrient "${item.name}"`);
      continue;
    }

    const amountMg = roundToDecimals(toMilligrams(item.amount, item.unit), MICRONUTRIENT_DECIMALS);
    if (amountMg <= 0 || micros[item.name]) continue;

    micros[item.name] = { amount: amountMg, unit: 'mg' };
    if (Object.keys(micros).length === maxCount) break;
  }

  return micros;
}
