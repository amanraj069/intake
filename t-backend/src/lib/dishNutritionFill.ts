import { AiDiaryItem, AiDiaryRow } from './foodDiaryImportPrompt';
import { AiFilledDish, DishNutritionCandidate, MAX_FILL_BATCH_SIZE } from './dishNutritionFillPrompt';
import { roundToTenth } from './numbers';

/**
 * Determines whether a food item is missing required nutrition numbers (calories, macros) or quantity.
 */
export function itemNeedsNutritionFill(item: AiDiaryItem): boolean {
  if (!item.name || !item.name.trim()) return false;
  return (
    item.calories === null ||
    item.proteinG === null ||
    item.carbG === null ||
    item.fatG === null ||
    item.quantity === null ||
    item.quantity <= 0
  );
}

/**
 * Collects all dishes across all rows that have missing values,
 * tagged with an id `${rowIndex}_${itemIndex}` for direct matching.
 */
export function findMissingNutritionCandidates(rows: readonly AiDiaryRow[]): DishNutritionCandidate[] {
  const candidates: DishNutritionCandidate[] = [];

  rows.forEach((row, rowIndex) => {
    row.items.forEach((item, itemIndex) => {
      if (itemNeedsNutritionFill(item)) {
        candidates.push({
          id: `${rowIndex}_${itemIndex}`,
          name: item.name ?? '',
          quantity: item.quantity,
          unit: item.unit,
          calories: item.calories,
          proteinG: item.proteinG,
          carbG: item.carbG,
          fatG: item.fatG,
        });
      }
    });
  });

  return candidates;
}

/**
 * Splits candidates into batches of `batchSize` to send multiple dishes per Gemini call.
 */
export function chunkCandidates(
  candidates: readonly DishNutritionCandidate[],
  batchSize: number = MAX_FILL_BATCH_SIZE
): DishNutritionCandidate[][] {
  if (candidates.length === 0) return [];
  const batches: DishNutritionCandidate[][] = [];
  for (let i = 0; i < candidates.length; i += batchSize) {
    batches.push(candidates.slice(i, i + batchSize));
  }
  return batches;
}

/**
 * Applies filled nutrition and quantities back onto the matching items in each row.
 * Preserves values that were already present in the original items.
 */
export function applyFilledDishNutrition(
  rows: readonly AiDiaryRow[],
  filledDishes: readonly AiFilledDish[]
): AiDiaryRow[] {
  if (filledDishes.length === 0) return [...rows];

  const filledMap = new Map(filledDishes.map((dish) => [dish.id, dish]));

  return rows.map((row, rowIndex) => {
    let rowChanged = false;

    const items = row.items.map((item, itemIndex) => {
      const filled = filledMap.get(`${rowIndex}_${itemIndex}`);
      if (!filled) return item;

      rowChanged = true;
      const quantityMissing = item.quantity === null || item.quantity <= 0;
      const nutritionMissing =
        item.calories === null || item.proteinG === null || item.carbG === null || item.fatG === null;

      return {
        ...item,
        quantity: quantityMissing ? filled.quantity : item.quantity,
        quantityEstimated: quantityMissing ? true : item.quantityEstimated,
        unit: quantityMissing ? filled.unit : item.unit,
        calories: item.calories !== null ? item.calories : Math.round(filled.calories),
        proteinG: item.proteinG !== null ? item.proteinG : roundToTenth(filled.proteinG),
        carbG: item.carbG !== null ? item.carbG : roundToTenth(filled.carbG),
        fatG: item.fatG !== null ? item.fatG : roundToTenth(filled.fatG),
        nutritionEstimated: item.nutritionEstimated || nutritionMissing,
      };
    });

    return rowChanged ? { ...row, items } : row;
  });
}
