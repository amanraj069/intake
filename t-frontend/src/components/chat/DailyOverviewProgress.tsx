"use client";

import type { DailyIntakeSummary } from "@/types/nutrition";
import MacroRing from "./MacroRing";

interface DailyOverviewProgressProps {
  /** Today's intake summary including totals and goal. */
  summary: DailyIntakeSummary | null;
  loading?: boolean;
  showTitle?: boolean;
}

const CONTAINER_CLASSES = "rounded-xl bg-bg-app dark:bg-dark-bg-app/60 px-3 py-2 sm:px-3.5 sm:py-2.5";

/**
 * Today's overall nutrition progress, shown at the top of a meal log card in
 * place of that meal's own macros: a calorie bar plus protein/carbs/fat rings,
 * each measured against the user's daily targets.
 */
export default function DailyOverviewProgress({ summary, loading, showTitle = true }: DailyOverviewProgressProps) {
  if (loading) {
    return (
      <div className={CONTAINER_CLASSES}>
        <p className="text-[10px] sm:text-xs text-text-secondary dark:text-dark-text-secondary animate-pulse">Loading today&apos;s progress…</p>
      </div>
    );
  }

  if (!summary) return null;

  const { totals, goal } = summary;
  const calorieTarget = goal?.dailyCalorieTarget ?? null;
  const calorieRatio = calorieTarget ? Math.min(1, totals.calories / calorieTarget) : 0;

  return (
    <div className="space-y-2.5 sm:space-y-3">
      {showTitle && (
        <p className="text-[10px] sm:text-[11px] font-bold text-text-secondary dark:text-dark-text-secondary">Today&apos;s progress</p>
      )}

      <div className={`${CONTAINER_CLASSES} space-y-1.5`}>
        <div className="flex items-baseline justify-between gap-1">
          <span className="text-[11px] sm:text-xs font-semibold tracking-wide text-calories dark:text-dark-calories">Calories</span>
          <span className="text-[11px] sm:text-xs text-text-primary dark:text-dark-text tabular-nums whitespace-nowrap">
            {Math.round(totals.calories)}
            {calorieTarget != null && (
              <span className="text-text-secondary dark:text-dark-text-secondary"> / {Math.round(calorieTarget)}</span>
            )}
            <span className="text-text-secondary dark:text-dark-text-secondary"> kcal</span>
          </span>
        </div>
        {calorieTarget != null && (
          <div className="h-1.5 rounded-full bg-black/[0.06] dark:bg-white/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full bg-calories dark:bg-dark-calories transition-all duration-500 ease-out"
              style={{ width: `${calorieRatio * 100}%` }}
            />
          </div>
        )}
      </div>

      <div className="flex items-stretch gap-2 sm:gap-3">
        <MacroRing nutrient="protein" current={totals.proteinG} target={goal?.proteinTargetG ?? null} />
        <MacroRing nutrient="carbs" current={totals.carbG} target={goal?.carbTargetG ?? null} />
        <MacroRing nutrient="fat" current={totals.fatG} target={goal?.fatTargetG ?? null} />
      </div>
    </div>
  );
}
