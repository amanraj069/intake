import { Types } from 'mongoose';

import { FoodEntry } from '../models/FoodEntry';
import { IGoalDocument } from '../models/Goal';
import {
  CalendarDay,
  daysBefore,
  enumerateCalendarDays,
  startOfDay,
  startOfNextDay,
  today,
} from '../lib/calendarDay';
import { roundToDecimals, roundToTenth } from '../lib/numbers';
import * as goalService from './goal.service';

/** Resolve optional start/end to concrete days, defaulting to the last N days. */
function resolveRange(
  startDate: CalendarDay | undefined,
  endDate: CalendarDay | undefined,
  defaultDays: number
): { start: CalendarDay; end: CalendarDay } {
  const end = endDate ?? today();
  const start = startDate ?? daysBefore(end, defaultDays - 1);
  return { start, end };
}

function matchBetween(userId: string, start: CalendarDay, end: CalendarDay) {
  return {
    userId: new Types.ObjectId(userId),
    date: { $gte: startOfDay(start), $lt: startOfNextDay(end) },
  };
}

const DAY_KEY = {
  $dateToString: { date: '$date', format: '%Y-%m-%d', timezone: 'UTC' },
} as const;

// ---------------------------------------------------------------------------
// Weekly Calories
// ---------------------------------------------------------------------------

export interface WeeklyCaloriePoint {
  date: CalendarDay;
  totalCalories: number;
}

export async function getWeeklyCalories(
  userId: string,
  startDate?: CalendarDay,
  endDate?: CalendarDay
): Promise<WeeklyCaloriePoint[]> {
  const { start, end } = resolveRange(startDate, endDate, 7);

  const rows = await FoodEntry.aggregate<{ _id: CalendarDay; totalCalories: number }>([
    { $match: matchBetween(userId, start, end) },
    { $group: { _id: DAY_KEY, totalCalories: { $sum: '$calories' } } },
  ]);

  const rowMap = new Map(rows.map((r) => [r._id, roundToTenth(r.totalCalories)]));

  return enumerateCalendarDays(start, end).map((date) => ({
    date,
    totalCalories: rowMap.get(date) ?? 0,
  }));
}

// ---------------------------------------------------------------------------
// Macro Breakdown
// ---------------------------------------------------------------------------

export interface MacroBreakdownPoint {
  period: string;
  proteinG: number;
  carbG: number;
  fatG: number;
}

/** ISO week key for grouping by week. */
const WEEK_KEY = {
  $concat: [
    { $toString: { $isoWeekYear: '$date' } },
    '-W',
    {
      $cond: {
        if: { $lt: [{ $isoWeek: '$date' }, 10] },
        then: { $concat: ['0', { $toString: { $isoWeek: '$date' } }] },
        else: { $toString: { $isoWeek: '$date' } },
      },
    },
  ],
} as const;

export async function getMacroBreakdown(
  userId: string,
  startDate?: CalendarDay,
  endDate?: CalendarDay,
  groupBy: 'day' | 'week' = 'day'
): Promise<MacroBreakdownPoint[]> {
  const defaultDays = groupBy === 'week' ? 28 : 7;
  const { start, end } = resolveRange(startDate, endDate, defaultDays);

  const groupKey = groupBy === 'week' ? WEEK_KEY : DAY_KEY;

  const rows = await FoodEntry.aggregate<{
    _id: string;
    proteinG: number;
    carbG: number;
    fatG: number;
  }>([
    { $match: matchBetween(userId, start, end) },
    {
      $group: {
        _id: groupKey,
        proteinG: { $sum: '$macros.proteinG' },
        carbG: { $sum: '$macros.carbG' },
        fatG: { $sum: '$macros.fatG' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  if (groupBy === 'week') {
    return rows.map((r) => ({
      period: r._id,
      proteinG: roundToTenth(r.proteinG),
      carbG: roundToTenth(r.carbG),
      fatG: roundToTenth(r.fatG),
    }));
  }

  // For daily grouping, fill in empty days with zeros.
  const rowMap = new Map(rows.map((r) => [r._id, r]));

  return enumerateCalendarDays(start, end).map((date) => {
    const row = rowMap.get(date);
    return {
      period: date,
      proteinG: row ? roundToTenth(row.proteinG) : 0,
      carbG: row ? roundToTenth(row.carbG) : 0,
      fatG: row ? roundToTenth(row.fatG) : 0,
    };
  });
}

// ---------------------------------------------------------------------------
// Micro Summary
// ---------------------------------------------------------------------------

/** Matches the precision micronutrients are stored with, so microgram amounts do not round to zero. */
const MICRO_AMOUNT_DECIMALS = 3;

export interface MicroSummaryPoint {
  nutrient: string;
  amount: number;
  unit: string;
}

export async function getMicroSummary(
  userId: string,
  startDate?: CalendarDay,
  endDate?: CalendarDay
): Promise<MicroSummaryPoint[]> {
  const { start, end } = resolveRange(startDate, endDate, 7);

  // The micros field is a Map, so we convert it to an array, unwind, and group.
  const rows = await FoodEntry.aggregate<{
    _id: string;
    amount: number;
    unit: string;
  }>([
    { $match: matchBetween(userId, start, end) },
    { $project: { microsArray: { $objectToArray: '$micros' } } },
    { $unwind: '$microsArray' },
    {
      $group: {
        _id: '$microsArray.k',
        amount: { $sum: '$microsArray.v.amount' },
        // Take the first unit seen; all entries for the same nutrient share a unit.
        unit: { $first: '$microsArray.v.unit' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return rows.map((r) => ({
    nutrient: r._id,
    amount: roundToDecimals(r.amount, MICRO_AMOUNT_DECIMALS),
    unit: r.unit,
  }));
}

// ---------------------------------------------------------------------------
// Goal Comparison
// ---------------------------------------------------------------------------

export interface GoalComparisonPoint {
  date: CalendarDay;
  actualCalories: number;
  targetCalories: number | null;
}

/**
 * The target active on `date`, from whichever goal version's range covers it.
 * Null before the user's first goal existed, so old days show no target
 * rather than one that did not apply yet.
 */
function targetCaloriesOn(
  date: CalendarDay,
  goalVersions: readonly Pick<IGoalDocument, 'startDate' | 'endDate' | 'dailyCalorieTarget'>[]
): number | null {
  const active = goalVersions.find(
    (goal) => goal.startDate <= date && (goal.endDate === null || date < goal.endDate)
  );
  return active ? active.dailyCalorieTarget : null;
}

export async function getGoalComparison(
  userId: string,
  startDate?: CalendarDay,
  endDate?: CalendarDay
): Promise<GoalComparisonPoint[]> {
  const { start, end } = resolveRange(startDate, endDate, 7);

  const [rows, goalVersions] = await Promise.all([
    FoodEntry.aggregate<{ _id: CalendarDay; actualCalories: number }>([
      { $match: matchBetween(userId, start, end) },
      { $group: { _id: DAY_KEY, actualCalories: { $sum: '$calories' } } },
    ]),
    goalService.findGoalsOverlappingRange(userId, start, end),
  ]);

  const rowMap = new Map(rows.map((r) => [r._id, roundToTenth(r.actualCalories)]));

  return enumerateCalendarDays(start, end).map((date) => ({
    date,
    actualCalories: rowMap.get(date) ?? 0,
    targetCalories: targetCaloriesOn(date, goalVersions),
  }));
}
