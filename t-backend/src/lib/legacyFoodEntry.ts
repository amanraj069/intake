import { FoodItemUnit } from '../models/FoodEntry';
import { MicronutrientAmount } from './foodItemTotals';
import { roundToTenth } from './numbers';

/** An entry as stored before entries held items: one food with a free-text unit. */
export interface LegacyFoodEntryFields {
  foodName: string;
  quantity: number;
  quantityUnit?: string;
  calories: number;
  macros: { proteinG: number; carbG: number; fatG: number };
  micros?: Record<string, MicronutrientAmount | number>;
}

export interface MigratedFoodItem {
  name: string;
  quantity: number;
  unit: FoodItemUnit;
  calories: number;
  macros: { proteinG: number; carbG: number; fatG: number };
  micros: Record<string, MicronutrientAmount>;
}

/** Units the old free-text field used that convert exactly to grams or millilitres. */
const MEASURED_UNITS: Record<string, { unit: FoodItemUnit; factor: number }> = {
  g: { unit: 'g', factor: 1 },
  gram: { unit: 'g', factor: 1 },
  grams: { unit: 'g', factor: 1 },
  kg: { unit: 'g', factor: 1000 },
  mg: { unit: 'g', factor: 0.001 },
  oz: { unit: 'g', factor: 28.3495 },
  lb: { unit: 'g', factor: 453.592 },
  ml: { unit: 'ml', factor: 1 },
  l: { unit: 'ml', factor: 1000 },
};

/** Words that mean "one of whatever the food is", so they add nothing to the item's name. */
const GENERIC_COUNT_UNITS = new Set(['', 'serving', 'servings', 'piece', 'pieces', 'pc', 'pcs', 'count', 'unit', 'units']);

/**
 * Reads the old quantity and unit as a measured amount. `"250g"` with quantity 2
 * meant two 250 g servings, so it becomes 500 g; a bare `"g"` meant the quantity
 * was already in grams.
 */
function readMeasuredAmount(quantity: number, rawUnit: string): { quantity: number; unit: FoodItemUnit } | null {
  const match = rawUnit.match(/^(\d+(?:\.\d+)?)?\s*([a-z]+)$/);
  if (!match) return null;

  const measured = MEASURED_UNITS[match[2]];
  if (!measured) return null;

  const perServing = match[1] === undefined ? 1 : Number(match[1]);
  return { quantity: roundToTenth(quantity * perServing * measured.factor), unit: measured.unit };
}

function normaliseMicros(micros: LegacyFoodEntryFields['micros']): Record<string, MicronutrientAmount> {
  return Object.fromEntries(
    Object.entries(micros ?? {}).map(([name, value]) => [
      name,
      typeof value === 'number' ? { amount: value, unit: 'mg' } : value,
    ])
  );
}

/**
 * Turns a single-food entry into its one item. Nothing is lost: a counted unit
 * the new model has no field for ("bowl", "slice") is kept in the item's name.
 */
export function toItemFromLegacyEntry(entry: LegacyFoodEntryFields): MigratedFoodItem {
  const rawUnit = (entry.quantityUnit ?? '').trim().toLowerCase();
  const measured = readMeasuredAmount(entry.quantity, rawUnit);
  const keepsUnitInName = !measured && !GENERIC_COUNT_UNITS.has(rawUnit);

  return {
    name: keepsUnitInName ? `${entry.foodName} (${entry.quantityUnit?.trim()})` : entry.foodName,
    quantity: measured?.quantity ?? entry.quantity,
    unit: measured?.unit ?? 'count',
    calories: entry.calories,
    macros: entry.macros,
    micros: normaliseMicros(entry.micros),
  };
}
