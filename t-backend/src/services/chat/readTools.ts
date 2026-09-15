import { z } from 'zod';

import { CalendarDay, countCalendarDays } from '../../lib/calendarDay';
import { IFoodEntryDocument, MEAL_TYPES } from '../../models/FoodEntry';
import { IGoalDocument } from '../../models/Goal';
import { listFoodEntriesSchema, foodEntrySummarySchema } from '../../schemas/foodEntry.schema';
import { goalComparisonSchema, macrosSchema, weeklyCaloriesSchema } from '../../schemas/report.schema';
import * as dailyIntakeService from '../dailyIntake.service';
import * as foodEntryService from '../foodEntry.service';
import * as goalService from '../goal.service';
import * as reportService from '../report.service';
import { ChatReadTool, ChatToolContext, ToolOutcome, describeValidationError } from './chatToolTypes';

/** Keeps a single tool result small enough to leave room for the conversation itself. */
const MAX_LISTED_MEALS = 20;
/** Matches the longest range the dashboard series allows. */
const MAX_REPORT_RANGE_DAYS = 92;

const DAY_PARAMETER = { type: 'STRING', description: 'Calendar day in YYYY-MM-DD format' };

const DATE_RANGE_PARAMETERS = {
  startDate: { ...DAY_PARAMETER, description: 'First day of the range, YYYY-MM-DD. Defaults to 7 days before endDate.' },
  endDate: { ...DAY_PARAMETER, description: 'Last day of the range, YYYY-MM-DD. Defaults to today.' },
};

type DateRange = { startDate?: CalendarDay; endDate?: CalendarDay };

/** Fills in the user's own "today", since the services would otherwise default to the server's UTC day. */
function withClientEndDate(rawArgs: Record<string, unknown>, context: ChatToolContext): Record<string, unknown> {
  return { ...rawArgs, endDate: rawArgs.endDate ?? context.today };
}

function rangeTooLong({ startDate, endDate }: DateRange): string | null {
  if (!startDate || !endDate) return null;
  return countCalendarDays(startDate, endDate) > MAX_REPORT_RANGE_DAYS
    ? `Invalid arguments. A range may span at most ${MAX_REPORT_RANGE_DAYS} days`
    : null;
}

/** Validates with the endpoint's own schema, then runs the tool body on the parsed result. */
async function runValidated<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  rawArgs: Record<string, unknown>,
  body: (args: z.infer<TSchema>) => Promise<unknown>
): Promise<ToolOutcome<unknown>> {
  const parsed = schema.safeParse(rawArgs);
  if (!parsed.success) return { ok: false, error: describeValidationError(parsed.error) };

  const rangeError = rangeTooLong(parsed.data as DateRange);
  if (rangeError) return { ok: false, error: rangeError };

  return { ok: true, value: await body(parsed.data) };
}

function summariseGoal(goal: IGoalDocument | null) {
  if (!goal) return null;
  return {
    dailyCalorieTarget: goal.dailyCalorieTarget,
    proteinTargetG: goal.proteinTargetG,
    carbTargetG: goal.carbTargetG,
    fatTargetG: goal.fatTargetG,
    weightGoalKg: goal.weightGoalKg ?? null,
  };
}

function summariseEntry(entry: IFoodEntryDocument) {
  return {
    date: entry.date.toISOString().slice(0, 10),
    mealType: entry.mealType,
    name: entry.name,
    calories: entry.calories,
    proteinG: entry.macros.proteinG,
    carbG: entry.macros.carbG,
    fatG: entry.macros.fatG,
    items: entry.items.map((item) => ({ name: item.name, quantity: item.quantity, unit: item.unit })),
  };
}

const getGoal: ChatReadTool = {
  kind: 'read',
  statusMessage: 'Checking your goals...',
  declaration: {
    name: 'getGoal',
    description: "Returns the user's current daily calorie and macro targets, or null when no goal is set.",
  },
  async run(_rawArgs, context) {
    const goal = await goalService.findGoalByUserId(context.userId);
    return { ok: true, value: { goal: summariseGoal(goal) } };
  },
};

const listMeals: ChatReadTool = {
  kind: 'read',
  statusMessage: 'Looking up your meals...',
  declaration: {
    name: 'listMeals',
    description: 'Lists logged meals, newest day first, optionally filtered by date range and meal type.',
    parameters: {
      type: 'OBJECT',
      properties: {
        ...DATE_RANGE_PARAMETERS,
        mealType: { type: 'STRING', enum: [...MEAL_TYPES] },
        page: { type: 'INTEGER', description: 'Page number, starting at 1' },
      },
    },
  },
  run(rawArgs, context) {
    const args = { ...withClientEndDate(rawArgs, context), limit: MAX_LISTED_MEALS };
    return runValidated(listFoodEntriesSchema.shape.query, args, async (query) => {
      const page = await foodEntryService.listFoodEntries(context.userId, query);
      return {
        page: page.page,
        totalPages: page.totalPages,
        totalMeals: page.total,
        meals: page.data.map(summariseEntry),
      };
    });
  },
};

const getTodaySummary: ChatReadTool = {
  kind: 'read',
  statusMessage: "Looking up today's intake...",
  declaration: {
    name: 'getTodaySummary',
    description:
      "Returns one day's total calories, protein, carbs and fat with the user's goal alongside. Defaults to today.",
    parameters: { type: 'OBJECT', properties: { date: DAY_PARAMETER } },
  },
  run(rawArgs, context) {
    const args = { date: rawArgs.date ?? context.today };
    return runValidated(foodEntrySummarySchema.shape.query, args, async (query) => {
      const summary = await dailyIntakeService.getDailyIntakeSummary(context.userId, query.date);
      return { date: summary.date, totals: summary.totals, goal: summariseGoal(summary.goal) };
    });
  },
};

const getWeeklySummary: ChatReadTool = {
  kind: 'read',
  statusMessage: 'Adding up your week...',
  declaration: {
    name: 'getWeeklySummary',
    description: 'Returns total calories per day across a date range (the last 7 days by default).',
    parameters: { type: 'OBJECT', properties: DATE_RANGE_PARAMETERS },
  },
  run(rawArgs, context) {
    return runValidated(weeklyCaloriesSchema.shape.query, withClientEndDate(rawArgs, context), async (query) => {
      const days = await reportService.getWeeklyCalories(context.userId, query.startDate, query.endDate);
      const loggedDays = days.filter((day) => day.totalCalories > 0);
      const total = loggedDays.reduce((sum, day) => sum + day.totalCalories, 0);
      return {
        days,
        daysWithEntries: loggedDays.length,
        averageCaloriesOnLoggedDays: loggedDays.length ? Math.round(total / loggedDays.length) : 0,
      };
    });
  },
};

const getMacroBreakdown: ChatReadTool = {
  kind: 'read',
  statusMessage: 'Breaking down your macros...',
  declaration: {
    name: 'getMacroBreakdown',
    description: 'Returns protein, carb and fat totals grouped by day or ISO week across a date range.',
    parameters: {
      type: 'OBJECT',
      properties: { ...DATE_RANGE_PARAMETERS, groupBy: { type: 'STRING', enum: ['day', 'week'] } },
    },
  },
  run(rawArgs, context) {
    return runValidated(macrosSchema.shape.query, withClientEndDate(rawArgs, context), async (query) => ({
      periods: await reportService.getMacroBreakdown(context.userId, query.startDate, query.endDate, query.groupBy),
    }));
  },
};

const getGoalComparison: ChatReadTool = {
  kind: 'read',
  statusMessage: 'Comparing your intake with your goal...',
  declaration: {
    name: 'getGoalComparison',
    description: "Returns each day's actual calories next to the goal's calorie target across a date range.",
    parameters: { type: 'OBJECT', properties: DATE_RANGE_PARAMETERS },
  },
  run(rawArgs, context) {
    return runValidated(goalComparisonSchema.shape.query, withClientEndDate(rawArgs, context), async (query) => ({
      days: await reportService.getGoalComparison(context.userId, query.startDate, query.endDate),
    }));
  },
};

export const READ_TOOLS: readonly ChatReadTool[] = [
  getGoal,
  listMeals,
  getTodaySummary,
  getWeeklySummary,
  getMacroBreakdown,
  getGoalComparison,
];
