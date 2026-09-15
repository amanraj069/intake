import { FOOD_ITEM_UNITS } from '../../models/FoodEntry';
import { foodEntryDraftSchema } from '../../schemas/foodEntry.schema';
import { previewNutritionEstimate } from './actionPreview';
import { ChatEstimateToolDefinition, describeValidationError } from './chatToolTypes';
import { toItemsInput } from './itemArgs';

/** The same item shape `logMeal` takes, without a meal or a day: nothing here is saved. */
const estimateNutrition: ChatEstimateToolDefinition = {
  kind: 'estimate',
  statusMessage: 'Calculating nutrition estimate...',
  declaration: {
    name: 'estimateNutrition',
    description:
      'Estimates the nutritional breakdown of a meal or food photo the user asked about, without logging it. Call this to answer a nutrition question; never to log food, and never together with logMeal in the same reply.',
    parameters: {
      type: 'OBJECT',
      properties: {
        items: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              name: { type: 'STRING', description: 'Singular food name, e.g. "Egg" or "Brown rice"' },
              unit: { type: 'STRING', enum: [...FOOD_ITEM_UNITS], description: 'count for pieces, g for solids, ml for liquids' },
              quantity: { type: 'NUMBER', description: 'Amount in the unit' },
              calories: { type: 'NUMBER', description: 'kcal for this quantity' },
              proteinG: { type: 'NUMBER' },
              carbG: { type: 'NUMBER' },
              fatG: { type: 'NUMBER' },
            },
            required: ['name', 'unit', 'quantity', 'calories', 'proteinG', 'carbG', 'fatG'],
          },
        },
      },
      required: ['items'],
    },
  },
  async prepare(rawArgs) {
    const parsed = foodEntryDraftSchema.safeParse({ items: toItemsInput(rawArgs.items) });
    if (!parsed.success) return { ok: false, error: describeValidationError(parsed.error) };

    return {
      ok: true,
      value: { tool: 'estimateNutrition', args: parsed.data, preview: previewNutritionEstimate(parsed.data.items) },
    };
  },
};

export const ESTIMATE_TOOLS: readonly ChatEstimateToolDefinition[] = [estimateNutrition];
