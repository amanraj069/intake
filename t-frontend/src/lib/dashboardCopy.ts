import { toPercentOfTarget } from "./nutritionMetrics";
import type { DailyIntakeSummary } from "@/types/nutrition";

/** The greeting for a time of day, read from the viewer's own clock. */
export function greetingForHour(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * The one line under the greeting. It states the single most useful thing about
 * today, which depends on what the user has: a goal, entries, or neither.
 */
export function toTodayStatusLine(summary: DailyIntakeSummary | null): string {
  if (!summary) return "Where today stands against the targets you set.";

  if (!summary.goal) {
    return "Set a daily goal to measure today against it.";
  }

  if (summary.totals.entryCount === 0) {
    return "Nothing logged yet today. A clean slate against your targets.";
  }

  const percent = toPercentOfTarget(summary.totals.calories, summary.goal.dailyCalorieTarget);

  if (percent === null) return "Today's intake, measured against your targets.";

  return percent > 100
    ? `You are ${percent - 100}% past today's calorie target.`
    : `You are ${percent}% of the way to today's calorie target.`;
}
