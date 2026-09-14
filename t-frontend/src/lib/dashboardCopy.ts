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
export function toTodayStatusLine(
  summary: DailyIntakeSummary | null,
  options?: { mobile?: boolean }
): string {
  const isMobile = options?.mobile ?? false;

  if (!summary) {
    return isMobile
      ? "Where today stands against your targets."
      : "Where today stands against the targets you set.";
  }

  if (!summary.goal) {
    return isMobile
      ? "Set a daily goal to track progress."
      : "Set a daily goal to measure today against it.";
  }

  if (summary.totals.entryCount === 0) {
    return isMobile
      ? "Nothing logged yet today."
      : "Nothing logged yet today. A clean slate against your targets.";
  }

  const percent = toPercentOfTarget(summary.totals.calories, summary.goal.dailyCalorieTarget);

  if (percent === null) {
    return isMobile
      ? "Today's intake against your targets."
      : "Today's intake, measured against your targets.";
  }

  if (isMobile) {
    return percent > 100
      ? `${percent - 100}% past today's calorie target.`
      : `${percent}% of today's calorie target.`;
  }

  return percent > 100
    ? `You are ${percent - 100}% past today's calorie target.`
    : `You are ${percent}% of the way to today's calorie target.`;
}
