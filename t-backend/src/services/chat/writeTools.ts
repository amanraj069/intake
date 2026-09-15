import { CalendarDay } from '../../lib/calendarDay';
import { FOOD_ITEM_UNITS, MEAL_TYPES } from '../../models/FoodEntry';
import { createFoodEntrySchema } from '../../schemas/foodEntry.schema';
import { upsertGoalSchema } from '../../schemas/goal.schema';
import * as goalService from '../goal.service';
import { goalValuesMatch, previewLogMeal, previewSetGoal } from './actionPreview';
import { ChatWriteToolDefinition, describeValidationError } from './chatToolTypes';
import { applyGoalChanges, changedGoalTargets } from './goalChanges';
import { MICRONUTRIENTS_PARAMETER, toItemsInput } from './itemArgs';
import { PHOTO_ASSESSMENT_PARAMETER, assessLoggedPhoto } from './photoAssessment';

/**
 * The exact schemas behind `POST /api/food-entries` and `POST /api/goals`. A
 * pending action is validated against them when proposed and again when
 * confirmed, so the chat can never save something the forms would reject.
 */
export const logMealArgsSchema = createFoodEntrySchema.shape.body;
export const setGoalArgsSchema = upsertGoalSchema.shape.body;
/** A goal proposal's `args`: only the targets it changes. */
export const setGoalChangesSchema = setGoalArgsSchema.partial();

function toLogMealCandidate(rawArgs: Record<string, unknown>, today: CalendarDay) {
  return {
    mealType: rawArgs.mealType,
    name: rawArgs.name,
    date: rawArgs.date ?? today,
    items: toItemsInput(rawArgs.items),
    source: 'ai-chat',
  };
}

const logMeal: ChatWriteToolDefinition = {
  kind: 'write',
  statusMessage: 'Preparing your meal entry...',
  declaration: {
    name: 'logMeal',
    description:
      'Proposes logging one meal; the user confirms before it is saved. Call it only when the user asked to log food or said what they ate at a meal, never just to answer a question about nutrition. Estimate realistic nutrition for each item when the user does not state it.',
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
              micronutrients: MICRONUTRIENTS_PARAMETER,
            },
            required: ['name', 'unit', 'quantity', 'calories', 'proteinG', 'carbG', 'fatG'],
          },
        },
        photoAssessment: PHOTO_ASSESSMENT_PARAMETER,
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

    const proposal = { tool: 'logMeal' as const, args: parsed.data, preview: previewLogMeal(parsed.data, context.today) };
    if (!context.attachedPhoto) return { ok: true, value: proposal };

    const photoAnalysis = assessLoggedPhoto(parsed.data.items, rawArgs.photoAssessment, context.attachedPhoto);
    if (!photoAnalysis.ok) return photoAnalysis;
    return { ok: true, value: { ...proposal, photoAnalysis: photoAnalysis.value } };
  },
};

/**
 * The proposal is validated as the complete goal it would produce now, but
 * carries only the targets that change. Confirming lays those over the goal as
 * it is then, so an edit made on the Goals page in between is not reverted.
 */
const setGoal: ChatWriteToolDefinition = {
  kind: 'write',
  statusMessage: 'Preparing your goal update...',
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
    const parsed = setGoalArgsSchema.safeParse(applyGoalChanges(rawArgs, saved));

    if (!parsed.success) {
      const hint = saved ? '' : ' No goal exists yet, so all four daily targets must be given.';
      return { ok: false, error: `${describeValidationError(parsed.error)}.${hint}` };
    }

    if (goalValuesMatch(parsed.data, saved)) {
      return { ok: false, error: 'Nothing to change: those values already match the saved goal.' };
    }

    return {
      ok: true,
      value: {
        tool: 'setGoal',
        args: changedGoalTargets(parsed.data, saved),
        preview: previewSetGoal(parsed.data, saved),
      },
    };
  },
};

export const WRITE_TOOLS: readonly ChatWriteToolDefinition[] = [logMeal, setGoal];
