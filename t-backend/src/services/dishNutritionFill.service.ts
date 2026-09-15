import { GeminiResponseSchema, generateStructuredJson } from '../lib/gemini/geminiClient';
import {
  applyFilledDishNutrition,
  chunkCandidates,
  findMissingNutritionCandidates,
} from '../lib/dishNutritionFill';
import {
  AiFilledDish,
  DISH_NUTRITION_FILL_SYSTEM_INSTRUCTION,
  aiDishNutritionFillResponseSchema,
  buildDishNutritionFillPrompt,
} from '../lib/dishNutritionFillPrompt';
import { AiDiaryRow } from '../lib/foodDiaryImportPrompt';
import { FOOD_ITEM_UNITS } from '../models/FoodEntry';

const ATTEMPT_TIMEOUT_MS = 25 * 1000;
const TOTAL_BUDGET_MS = 40 * 1000;

const FILLED_DISH_SCHEMA: GeminiResponseSchema = {
  type: 'OBJECT',
  properties: {
    id: { type: 'STRING' },
    quantity: { type: 'NUMBER', description: 'amount in the unit' },
    unit: { type: 'STRING', enum: [...FOOD_ITEM_UNITS] },
    calories: { type: 'NUMBER', description: 'kcal for this dish' },
    proteinG: { type: 'NUMBER', description: 'grams of protein' },
    carbG: { type: 'NUMBER', description: 'grams of carbohydrates' },
    fatG: { type: 'NUMBER', description: 'grams of fat' },
  },
  required: ['id', 'quantity', 'unit', 'calories', 'proteinG', 'carbG', 'fatG'],
  propertyOrdering: ['id', 'quantity', 'unit', 'calories', 'proteinG', 'carbG', 'fatG'],
};

const RESPONSE_SCHEMA: GeminiResponseSchema = {
  type: 'OBJECT',
  properties: {
    dishes: {
      type: 'ARRAY',
      items: FILLED_DISH_SCHEMA,
    },
  },
  required: ['dishes'],
};

export interface DishNutritionFillOutcome {
  rows: AiDiaryRow[];
  /** Set when some dishes could not have their nutrition estimated automatically. */
  warning: string | null;
}

/**
 * Fills missing nutrition values (calories, macros) or quantities across diary rows.
 * Batches multiple dishes in single Gemini API calls rather than calling once per dish.
 * Best effort: on failure of any batch, remaining rows are kept as-is with a friendly warning.
 */
export async function fillMissingDishNutrition(rows: AiDiaryRow[]): Promise<DishNutritionFillOutcome> {
  const candidates = findMissingNutritionCandidates(rows);
  if (candidates.length === 0) return { rows, warning: null };

  const batches = chunkCandidates(candidates);

  const batchResults = await Promise.all(
    batches.map(async (batch, batchIndex): Promise<AiFilledDish[]> => {
      try {
        const raw = await generateStructuredJson({
          systemInstruction: DISH_NUTRITION_FILL_SYSTEM_INSTRUCTION,
          prompt: buildDishNutritionFillPrompt(batch),
          responseSchema: RESPONSE_SCHEMA,
          attemptTimeoutMs: ATTEMPT_TIMEOUT_MS,
          totalBudgetMs: TOTAL_BUDGET_MS,
        });

        const parsed = aiDishNutritionFillResponseSchema.safeParse(raw);
        if (!parsed.success) {
          console.warn(
            `[DishNutritionFill] Batch ${batchIndex + 1} failed validation:`,
            parsed.error.message
          );
          return [];
        }

        return parsed.data.dishes;
      } catch (cause) {
        console.warn(
          `[DishNutritionFill] Batch ${batchIndex + 1} call failed:`,
          cause instanceof Error ? cause.message : cause
        );
        return [];
      }
    })
  );

  const filledDishes = batchResults.flat();
  const warning =
    filledDishes.length < candidates.length
      ? 'Some dishes could not have their nutrition estimated automatically: check and enter them by hand.'
      : null;

  return {
    rows: applyFilledDishNutrition(rows, filledDishes),
    warning,
  };
}
