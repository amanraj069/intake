import { CalendarDay } from '../../lib/calendarDay';
import { FOOD_ITEM_UNITS, MEAL_TYPES } from '../../models/FoodEntry';
import { IGoalDocument } from '../../models/Goal';
import { createFoodEntrySchema } from '../../schemas/foodEntry.schema';
import { upsertGoalSchema } from '../../schemas/goal.schema';
import * as goalService from '../goal.service';
import { goalValuesMatch, previewLogMeal, previewSetGoal } from './actionPreview';
import { ChatWriteToolDefinition, describeValidationError } from './chatToolTypes';

/**
 * The exact schemas behind `POST /api/food-entries` and `POST /api/goals`. A
 * pending action is validated against them when proposed and again when
 * confirmed, so the chat can never save something the forms would reject.
 */
export const logMealArgsSchema = createFoodEntrySchema.shape.body;
export const setGoalArgsSchema = upsertGoalSchema.shape.body;

/**
 * The model describes items with flat macro fields, which it fills far more
 * reliably than nested objects. Anything that is not an item-shaped object is
 * passed through untouched for the schema to reject with a readable message.
 */
function toItemInput(rawItem: unknown): unknown {
  if (typeof rawItem !== 'object' || rawItem === null) return rawItem;
  const { proteinG, carbG, fatG, ...rest } = rawItem as Record<string, unknown>;
  return { ...rest, macros: { proteinG, carbG, fatG } };
}

function toLogMealCandidate(rawArgs: Record<string, unknown>, today: CalendarDay) {
  return {
    mealType: rawArgs.mealType,
    name: rawArgs.name,
    date: rawArgs.date ?? today,
    items: Array.isArray(rawArgs.items) ? rawArgs.items.map(toItemInput) : rawArgs.items,
    source: 'ai-chat',
  };
}

const logMeal: ChatWriteToolDefinition = {
  kind: 'write',
  declaration: {
    name: 'logMeal',
    description:
      'Proposes logging one meal. The user reviews and confirms it before anything is saved. Estimate realistic nutrition for each item when the user does not state it.',
    parameters: {
      type: 'OBJECT',
      properties: {
        mealType: { type: 'STRING', enum: [...MEAL_TYPES] },
        name: { type: 'STRING', description: 'Optional short name for the whole meal' },
        date: { type: 'STRING', description: 'Day eaten, YYYY-MM-DD. Defaults to today.' },
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
      required: ['mealType', 'items'],
    },
  },
  async prepare(rawArgs, context) {
    const parsed = logMealArgsSchema.safeParse(toLogMealCandidate(rawArgs, context.today));
    if (!parsed.success) return { ok: false, error: describeValidationError(parsed.error) };

    if (parsed.data.date.slice(0, 10) > context.today) {
      return { ok: false, error: `Invalid arguments. date: cannot be after today (${context.today})` };
    }

    return {
      ok: true,
      value: { tool: 'logMeal', args: parsed.data, preview: previewLogMeal(parsed.data, context.today) },
    };
  },
};

const GOAL_TARGET_KEYS = ['dailyCalorieTarget', 'proteinTargetG', 'carbTargetG', 'fatTargetG', 'weightGoalKg'] as const;

/** A partial change from the model is laid over the saved goal, because saving a goal replaces all of it. */
function mergeWithSavedGoal(rawArgs: Record<string, unknown>, saved: IGoalDocument | null) {
  return Object.fromEntries(GOAL_TARGET_KEYS.map((key) => [key, rawArgs[key] ?? saved?.[key]]));
}

const setGoal: ChatWriteToolDefinition = {
  kind: 'write',
  declaration: {
    name: 'setGoal',
    description:
      "Proposes changing the user's daily targets. Pass only the targets that change; the rest keep their saved values. When no goal exists yet, all four daily targets are required. The user confirms before anything is saved.",
    parameters: {
      type: 'OBJECT',
      properties: {
        dailyCalorieTarget: { type: 'NUMBER', description: 'kcal per day' },
        proteinTargetG: { type: 'NUMBER', description: 'grams per day' },
        carbTargetG: { type: 'NUMBER', description: 'grams per day' },
        fatTargetG: { type: 'NUMBER', description: 'grams per day' },
        weightGoalKg: { type: 'NUMBER', description: 'target body weight in kg' },
      },
    },
  },
  async prepare(rawArgs, context) {
    const saved = await goalService.findGoalByUserId(context.userId);
    const parsed = setGoalArgsSchema.safeParse(mergeWithSavedGoal(rawArgs, saved));

    if (!parsed.success) {
      const hint = saved ? '' : ' No goal exists yet, so all four daily targets must be given.';
      return { ok: false, error: `${describeValidationError(parsed.error)}.${hint}` };
    }

    if (goalValuesMatch(parsed.data, saved)) {
      return { ok: false, error: 'Nothing to change: those values already match the saved goal.' };
    }

    return {
      ok: true,
      value: { tool: 'setGoal', args: parsed.data, preview: previewSetGoal(parsed.data, saved) },
    };
  },
};

export const WRITE_TOOLS: readonly ChatWriteToolDefinition[] = [logMeal, setGoal];
