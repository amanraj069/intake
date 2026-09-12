import { formatWeekday } from "./formatDate";
import { toPercentOfTarget, type NutritionMetric } from "./nutritionMetrics";
import type { DailyIntakePoint } from "@/types/nutrition";

/**
 * How far either side of the target still counts as hitting it. Landing exactly
 * on a calorie target is not realistic, so "on target" is a band rather than a
 * point: anything from 90% to 110% of the day's target.
 */
const ON_TARGET_MIN_PERCENT = 90;
const ON_TARGET_MAX_PERCENT = 110;

/** Headroom above the tallest mark, so the top bar never touches the frame. */
const SCALE_HEADROOM = 1.1;

/** One day of the trend chart, already reduced to what the column needs to draw. */
export interface TrendBar {
  date: string;
  weekdayLabel: string;
  actual: number;
  percentOfTarget: number | null;
  isOverTarget: boolean;
  isOnTarget: boolean;
  isToday: boolean;
  entryCount: number;
  /** Share of the plot height this column fills, from 0 to 1. */
  fillRatio: number;
}

/** The figures printed beneath the trend chart. */
export interface TrendSummary {
  dailyAverage: number;
  total: number;
  loggedDayCount: number;
  dayCount: number;
  /** Null while no goal is set, where "on target" has no meaning. */
  onTargetDayCount: number | null;
}

function isWithinTargetBand(percentOfTarget: number | null): boolean {
  if (percentOfTarget === null) return false;
  return percentOfTarget >= ON_TARGET_MIN_PERCENT && percentOfTarget <= ON_TARGET_MAX_PERCENT;
}

/**
 * The value the plot's full height represents. Both the tallest bar and the
 * target line have to fit, so the scale covers whichever is larger.
 */
function toScaleMax(actuals: number[], target: number | null): number {
  const largest = Math.max(...actuals, target ?? 0);
  return largest > 0 ? largest * SCALE_HEADROOM : 1;
}

/** Everything the trend chart draws: one column per day plus the target line. */
export interface TrendChart {
  bars: TrendBar[];
  /** Where the target line sits as a share of plot height, null with no goal. */
  targetRatio: number | null;
}

/**
 * Reduces a series to drawable columns. Bars and the target line share one
 * scale, computed here once, so the line always lands where the bars imply.
 */
export function buildTrendChart(
  days: DailyIntakePoint[],
  metric: NutritionMetric,
  target: number | null,
  todayDate: string
): TrendChart {
  const actuals = days.map((day) => metric.actualOf(day.totals));
  const scaleMax = toScaleMax(actuals, target);

  const bars = days.map((day, index) => {
    const actual = actuals[index];
    const percentOfTarget = toPercentOfTarget(actual, target);

    return {
      date: day.date,
      weekdayLabel: formatWeekday(day.date),
      actual,
      percentOfTarget,
      isOverTarget: percentOfTarget !== null && percentOfTarget > ON_TARGET_MAX_PERCENT,
      isOnTarget: isWithinTargetBand(percentOfTarget),
      isToday: day.date === todayDate,
      entryCount: day.totals.entryCount,
      fillRatio: Math.min(1, actual / scaleMax),
    };
  });

  return {
    bars,
    targetRatio: target !== null && target > 0 ? Math.min(1, target / scaleMax) : null,
  };
}

/** Range-wide figures for one measure: averaged over every day, not only logged ones. */
export function summariseTrend(bars: TrendBar[], hasTarget: boolean): TrendSummary {
  const total = bars.reduce((sum, bar) => sum + bar.actual, 0);
  const dayCount = bars.length;

  return {
    total: Math.round(total),
    dayCount,
    dailyAverage: dayCount === 0 ? 0 : Math.round(total / dayCount),
    loggedDayCount: bars.filter((bar) => bar.entryCount > 0).length,
    onTargetDayCount: hasTarget ? bars.filter((bar) => bar.isOnTarget).length : null,
  };
}
