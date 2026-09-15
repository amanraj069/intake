import { AiDishSplit, AiSplitDish, DishSplitCandidate, MAX_SPLIT_CANDIDATES } from './dishSplitPrompt';
import { AiDiaryItem, AiDiaryRow } from './foodDiaryImportPrompt';

/**
 * Separators that can join several dishes in one name. A match only nominates
 * the item: the model decides whether "Mac and cheese" is really one dish.
 */
const COMPOUND_NAME_PATTERN = /,|\+|&|\band\b|\bwith\b/i;

/** Calories are whole numbers; grams and macros keep one decimal. */
const CALORIE_STEPS_PER_UNIT = 1;
const TENTH_STEPS_PER_UNIT = 10;

function isCompoundItem(row: AiDiaryRow): boolean {
  const [onlyItem] = row.items;
  return row.items.length === 1 && Boolean(onlyItem.name) && COMPOUND_NAME_PATTERN.test(onlyItem.name ?? '');
}

/** Rows whose single item names several foods, keyed by their index in `rows`. */
export function findSplitCandidates(rows: readonly AiDiaryRow[]): DishSplitCandidate[] {
  return rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => isCompoundItem(row))
    .slice(0, MAX_SPLIT_CANDIDATES)
    .map(({ row, index }) => {
      const [item] = row.items;
      return {
        id: String(index),
        name: item.name ?? '',
        quantity: item.quantity,
        unit: item.unit,
        calories: item.calories,
        proteinG: item.proteinG,
        carbG: item.carbG,
        fatG: item.fatG,
      };
    });
}

/**
 * Divides a printed total in proportion to `weights`, rounded to `stepsPerUnit`
 * and adding up exactly: the rounding remainder goes to the largest share.
 * Equal shares when the weights give no proportion to follow.
 */
export function distributeTotal(total: number, weights: readonly number[], stepsPerUnit: number): number[] {
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
  const proportions = weightSum > 0 ? weights.map((weight) => weight / weightSum) : weights.map(() => 1 / weights.length);
  const totalSteps = Math.round(total * stepsPerUnit);
  const steps = proportions.map((proportion) => Math.round(totalSteps * proportion));

  const largestIndex = proportions.indexOf(Math.max(...proportions));
  steps[largestIndex] += totalSteps - steps.reduce((sum, step) => sum + step, 0);

  return steps.map((step) => step / stepsPerUnit);
}

type ItemNumberField = 'calories' | 'proteinG' | 'carbG' | 'fatG';

/** A printed number stays null when the diary left it blank, rather than being split into invented values. */
function splitField(original: AiDiaryItem, dishes: readonly AiSplitDish[], field: ItemNumberField): (number | null)[] {
  const total = original[field];
  if (total === null) return dishes.map(() => null);

  const stepsPerUnit = field === 'calories' ? CALORIE_STEPS_PER_UNIT : TENTH_STEPS_PER_UNIT;
  return distributeTotal(total, dishes.map((dish) => dish[field]), stepsPerUnit);
}

/** Quantities are rescaled to the printed amount only when every dish shares its unit; mixed units keep the estimate. */
function splitQuantity(original: AiDiaryItem, dishes: readonly AiSplitDish[]): number[] {
  const sameUnit = dishes.every((dish) => dish.unit === original.unit);
  if (original.quantity === null || !sameUnit) return dishes.map((dish) => dish.quantity);

  return distributeTotal(original.quantity, dishes.map((dish) => dish.quantity), TENTH_STEPS_PER_UNIT);
}

function toSplitItems(original: AiDiaryItem, dishes: readonly AiSplitDish[]): AiDiaryItem[] {
  const quantities = splitQuantity(original, dishes);
  const calories = splitField(original, dishes, 'calories');
  const protein = splitField(original, dishes, 'proteinG');
  const carbs = splitField(original, dishes, 'carbG');
  const fat = splitField(original, dishes, 'fatG');

  return dishes.map((dish, index) => ({
    name: dish.name,
    unit: dish.unit,
    quantity: quantities[index],
    quantityEstimated: true,
    calories: calories[index],
    proteinG: protein[index],
    carbG: carbs[index],
    fatG: fat[index],
    nutritionEstimated: original.nutritionEstimated ?? false,
  }));
}

/**
 * Replaces each combined item the model split into several dishes. The printed
 * numbers stay authoritative: the dishes always add up to them, and the row is
 * flagged so the user checks the estimated split.
 */
export function applyDishSplits(rows: readonly AiDiaryRow[], split: AiDishSplit): AiDiaryRow[] {
  const dishesByRow = new Map(split.entries.map((entry) => [entry.id, entry.dishes]));

  return rows.map((row, index) => {
    const dishes = dishesByRow.get(String(index));
    if (!dishes || dishes.length < 2 || !isCompoundItem(row)) return row;

    return { ...row, items: toSplitItems(row.items[0], dishes), nutritionSplitEstimated: true };
  });
}
