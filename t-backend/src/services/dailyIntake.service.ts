import { Types } from 'mongoose';

import { FoodEntry } from '../models/FoodEntry';
import { IGoalDocument } from '../models/Goal';
import { CalendarDay, startOfDay, startOfNextDay, today } from '../lib/calendarDay';
import { roundToTenth } from '../lib/numbers';
import * as goalService from './goal.service';

/** Everything the user ate on one day, summed across their entries. */
export interface DailyNutritionTotals {
  calories: number;
  proteinG: number;
  carbG: number;
  fatG: number;
  entryCount: number;
}

/** One day's intake next to the target it is measured against. */
export interface DailyIntakeSummary {
  date: CalendarDay;
  totals: DailyNutritionTotals;
  /** Null until the user has set a goal, so the client can prompt for one. */
  goal: IGoalDocument | null;
}

const NO_INTAKE: DailyNutritionTotals = {
  calories: 0,
  proteinG: 0,
  carbG: 0,
  fatG: 0,
  entryCount: 0,
};

/** Shape of the single `$group` row the totals aggregation produces. */
type TotalsAggregateRow = DailyNutritionTotals & { _id: null };

async function sumNutritionForDay(
  userId: string,
  day: CalendarDay
): Promise<DailyNutritionTotals> {
  const [totals] = await FoodEntry.aggregate<TotalsAggregateRow>([
    {
      $match: {
        userId: new Types.ObjectId(userId),
        date: { $gte: startOfDay(day), $lt: startOfNextDay(day) },
      },
    },
    {
      $group: {
        _id: null,
        calories: { $sum: '$calories' },
        proteinG: { $sum: '$macros.proteinG' },
        carbG: { $sum: '$macros.carbG' },
        fatG: { $sum: '$macros.fatG' },
        entryCount: { $sum: 1 },
      },
    },
  ]);

  if (!totals) return NO_INTAKE;

  return {
    calories: roundToTenth(totals.calories),
    proteinG: roundToTenth(totals.proteinG),
    carbG: roundToTenth(totals.carbG),
    fatG: roundToTenth(totals.fatG),
    entryCount: totals.entryCount,
  };
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
    goalService.findGoalByUserId(userId),
  ]);

  return { date, totals, goal };
}
