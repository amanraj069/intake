import { GeminiResponseSchema, generateStructuredJson } from '../lib/gemini/geminiClient';
import { applyDishSplits, findSplitCandidates } from '../lib/dishSplit';
import { DISH_SPLIT_SYSTEM_INSTRUCTION, aiDishSplitSchema, buildDishSplitPrompt } from '../lib/dishSplitPrompt';
import { AiDiaryRow } from '../lib/foodDiaryImportPrompt';
import { FOOD_ITEM_UNITS } from '../models/FoodEntry';

/** Short on purpose: this pass only improves rows the diary reading already produced. */
const ATTEMPT_TIMEOUT_MS = 20 * 1000;
const TOTAL_BUDGET_MS = 30 * 1000;

const DISH_SCHEMA: GeminiResponseSchema = {
  type: 'OBJECT',
  properties: {
    name: { type: 'STRING' },
    unit: { type: 'STRING', enum: [...FOOD_ITEM_UNITS] },
    quantity: { type: 'NUMBER' },
    calories: { type: 'NUMBER' },
    proteinG: { type: 'NUMBER' },
    carbG: { type: 'NUMBER' },
    fatG: { type: 'NUMBER' },
  },
  required: ['name', 'unit', 'quantity', 'calories', 'proteinG', 'carbG', 'fatG'],
  propertyOrdering: ['name', 'unit', 'quantity', 'calories', 'proteinG', 'carbG', 'fatG'],
};

/** Mirrors `aiDishSplitSchema` in Gemini's schema dialect. */
const RESPONSE_SCHEMA: GeminiResponseSchema = {
  type: 'OBJECT',
  properties: {
    entries: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { id: { type: 'STRING' }, dishes: { type: 'ARRAY', items: DISH_SCHEMA } },
        required: ['id', 'dishes'],
        propertyOrdering: ['id', 'dishes'],
      },
    },
  },
  required: ['entries'],
};

export interface DishSplitOutcome {
  rows: AiDiaryRow[];
  /** Set when combined items were found but could not be split, so the user knows to split them by hand. */
  warning: string | null;
}

/**
 * A second, focused AI pass over rows the diary reading returned as one combined
 * item ("Dal, rice and mixed vegetables"). A long diary reading sometimes skips
 * the per-dish breakdown; asking about just those names is far more reliable.
 * Best effort: on any failure the rows are returned as read, with a warning.
 */
export async function splitCombinedDishes(rows: AiDiaryRow[]): Promise<DishSplitOutcome> {
  const candidates = findSplitCandidates(rows);
  if (candidates.length === 0) return { rows, warning: null };

  try {
    const raw = await generateStructuredJson({
      systemInstruction: DISH_SPLIT_SYSTEM_INSTRUCTION,
      prompt: buildDishSplitPrompt(candidates),
      responseSchema: RESPONSE_SCHEMA,
      attemptTimeoutMs: ATTEMPT_TIMEOUT_MS,
      totalBudgetMs: TOTAL_BUDGET_MS,
    });

    const parsed = aiDishSplitSchema.safeParse(raw);
    if (!parsed.success) throw new Error(`response failed validation: ${parsed.error.message}`);

    return { rows: applyDishSplits(rows, parsed.data), warning: null };
  } catch (cause) {
    console.warn('[DishSplit] Combined dishes were left as read:', cause instanceof Error ? cause.message : cause);
    return {
      rows,
      warning: 'Some entries list several dishes as one item and could not be split automatically: add each dish by hand.',
    };
  }
}
