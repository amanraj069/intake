"use client";

import FieldLabel from "@/components/ui/FieldLabel";
import { formatWithUnit } from "@/lib/formatNumber";
import { NUTRITION_METRICS, toPercentOfTarget } from "@/lib/nutritionMetrics";
import type { DailyIntakeSummary } from "@/types/nutrition";
import CalorieDial from "./CalorieDial";

const CALORIES = NUTRITION_METRICS.calories;

/** The headline under the dial: what is left, or by how much the target is past. */
function toRemainderLabel(calories: number, target: number | null): string {
  if (target === null) return "Set a target to track what is left";

  const remaining = target - calories;

  return remaining >= 0
    ? `${formatWithUnit(remaining, CALORIES.unit)} remaining`
    : `${formatWithUnit(Math.abs(remaining), CALORIES.unit)} over`;
}

interface CalorieFocusProps {
  summary: DailyIntakeSummary;
}

/** Today's calories as the panel's single focal figure. */
export default function CalorieFocus({ summary }: CalorieFocusProps) {
  const calories = summary.totals.calories;
  const target = summary.goal ? summary.goal.dailyCalorieTarget : null;
  const percentOfTarget = toPercentOfTarget(calories, target);
  const isOverTarget = percentOfTarget !== null && percentOfTarget > 100;

  return (
    <div className="flex flex-col items-center gap-6 p-8 sm:p-10">
      <FieldLabel>Calories today</FieldLabel>

      <CalorieDial calories={calories} target={target} percentOfTarget={percentOfTarget} />

      <div className="w-full border-t border-border dark:border-dark-border pt-5 text-center">
        <p
          className={`inline-block px-3 py-1 text-xs font-bold   rounded-full ${
            isOverTarget
              ? "bg-error/10 text-error dark:bg-error-dark/15 dark:text-error-dark"
              : "bg-calories-bg text-calories dark:bg-dark-calories-bg dark:text-dark-calories"
          }`}
        >
          {toRemainderLabel(calories, target)}
        </p>
        {percentOfTarget !== null && (
          <p className="mt-2 text-[11px] font-light text-text-secondary dark:text-dark-text-secondary">
            {percentOfTarget}% of target
          </p>
        )}
      </div>
    </div>
  );
}
