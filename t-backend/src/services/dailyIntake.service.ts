import { Types } from 'mongoose';

import { FoodEntry } from '../models/FoodEntry';
import { IGoalDocument } from '../models/Goal';
import {
  CalendarDay,
  enumerateCalendarDays,
  startOfDay,
  startOfNextDay,
  today,
} from '../lib/calendarDay';
import { roundToTenth } from '../lib/numbers';
import * as goalService from './goal.service';

/** Everything the user ate on one day, summed across their entries. */
export interface DailyNutritionTotals {
  calories: number;
  proteinG: number;
  carbG: number;
  fatG: number;
  entryCount: number;
  loggedMeals: string[];
}

/** One day's intake next to the target it is measured against. */
export interface DailyIntakeSummary {
  date: CalendarDay;
  totals: DailyNutritionTotals;
  /** Null until the user has set a goal, so the client can prompt for one. */
  goal: IGoalDocument | null;
}

/** One day of a series: the totals for that day and nothing about the goal. */
export interface DailyIntakePoint {
  date: CalendarDay;
  totals: DailyNutritionTotals;
}

/**
 * A run of consecutive days with the goal they are all measured against, for
 * trend views. Days with no entries are present with zeroed totals, so the
 * client can plot the range without reconstructing the missing dates itself.
 */
export interface DailyIntakeSeries {
  startDate: CalendarDay;
  endDate: CalendarDay;
  days: DailyIntakePoint[];
  goal: IGoalDocument | null;
}

const NO_INTAKE: DailyNutritionTotals = {
  calories: 0,
  proteinG: 0,
  carbG: 0,
  fatG: 0,
  entryCount: 0,
  loggedMeals: [],
};

/** The `$group` accumulators that sum a set of entries into nutrition totals. */
const TOTALS_ACCUMULATORS = {
  calories: { $sum: '$calories' },
  proteinG: { $sum: '$macros.proteinG' },
  carbG: { $sum: '$macros.carbG' },
  fatG: { $sum: '$macros.fatG' },
  entryCount: { $sum: 1 },
  loggedMeals: { $addToSet: '$mealType' },
} as const;

/** Groups entries under the UTC day they are stored against, e.g. `2026-09-12`. */
const DAY_KEY_EXPRESSION = {
  $dateToString: { date: '$date', format: '%Y-%m-%d', timezone: 'UTC' },
} as const;

/** One `$group` row, whose `_id` is whatever the stage grouped by. */
type TotalsAggregateRow<TGroupKey> = DailyNutritionTotals & { _id: TGroupKey };

function matchEntriesBetween(userId: string, startDate: CalendarDay, endDate: CalendarDay) {
  return {
    userId: new Types.ObjectId(userId),
    date: { $gte: startOfDay(startDate), $lt: startOfNextDay(endDate) },
  };
}

/** Float addition of user-entered macros drifts, so every sum is rounded once here. */
function toRoundedTotals(totals: DailyNutritionTotals): DailyNutritionTotals {
  return {
    calories: roundToTenth(totals.calories),
    proteinG: roundToTenth(totals.proteinG),
    carbG: roundToTenth(totals.carbG),
    fatG: roundToTenth(totals.fatG),
    entryCount: totals.entryCount,
    loggedMeals: totals.loggedMeals ?? [],
  };
}

async function sumNutritionForDay(
  userId: string,
  day: CalendarDay
): Promise<DailyNutritionTotals> {
  const [totals] = await FoodEntry.aggregate<TotalsAggregateRow<null>>([
    { $match: matchEntriesBetween(userId, day, day) },
    { $group: { _id: null, ...TOTALS_ACCUMULATORS } },
  ]);

  return totals ? toRoundedTotals(totals) : NO_INTAKE;
}

/** Totals per day, keyed by day. Days without entries are simply absent. */
async function sumNutritionByDay(
  userId: string,
  startDate: CalendarDay,
  endDate: CalendarDay
): Promise<Map<CalendarDay, DailyNutritionTotals>> {
  const rows = await FoodEntry.aggregate<TotalsAggregateRow<CalendarDay>>([
    { $match: matchEntriesBetween(userId, startDate, endDate) },
    { $group: { _id: DAY_KEY_EXPRESSION, ...TOTALS_ACCUMULATORS } },
  ]);

  return new Map(rows.map((row) => [row._id, toRoundedTotals(row)]));
}

/**
 * Totals and goal for one day in a single call, so the "actual vs target"
 * widget does not need a second round trip to render.
 */
export async function getDailyIntakeSummary(
  userId: string,
  day?: CalendarDay
): Promise<DailyIntakeSummary> {
  const date = day ?? today();

  const [totals, goal] = await Promise.all([
    sumNutritionForDay(userId, date),
    goalService.findGoalForDate(userId, date),
  ]);

  return { date, totals, goal };
}

/**
 * One row per day across an inclusive range, with the goal alongside it, for
 * the dashboard's trend view. Empty days are filled in rather than omitted so
 * the series always has one point per calendar day. The goal shown is the one
 * active on `endDate`, since every current caller trends a range ending today.
 */
export async function getDailyIntakeSeries(
  userId: string,
  startDate: CalendarDay,
  endDate: CalendarDay
): Promise<DailyIntakeSeries> {
  const [totalsByDay, goal] = await Promise.all([
    sumNutritionByDay(userId, startDate, endDate),
    goalService.findGoalForDate(userId, endDate),
  ]);

  const days = enumerateCalendarDays(startDate, endDate).map((date) => ({
    date,
    totals: totalsByDay.get(date) ?? NO_INTAKE,
  }));

  return { startDate, endDate, days, goal };
}
