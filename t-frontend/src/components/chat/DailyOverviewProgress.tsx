"use client";

import type { DailyIntakeSummary } from "@/types/nutrition";
import MacroRing from "./MacroRing";

export interface NutritionProgressSummary {
  totals: {
    calories: number;
    proteinG: number;
    carbG: number;
    fatG: number;
  };
  goal?: {
    dailyCalorieTarget?: number | null;
    proteinTargetG?: number | null;
    carbTargetG?: number | null;
    fatTargetG?: number | null;
  } | null;
}

interface DailyOverviewProgressProps {
  /** Today's intake summary including totals and goal. */
  summary: DailyIntakeSummary | NutritionProgressSummary | null;
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
    <div className="space-y-2 sm:space-y-2.5">
      {showTitle && (
        <p className="text-[10px] sm:text-[11px] font-bold text-text-secondary dark:text-dark-text-secondary">Today&apos;s progress</p>
      )}

      {/* Horizontally scrollable track on phone view, evenly distributed row on tablet/desktop */}
      <div className="flex items-stretch gap-2 sm:gap-2.5 overflow-x-auto pb-1 pt-0.5 scrollbar-none snap-x snap-mandatory -mx-0.5 px-0.5">
        <MacroRing
          nutrient="calories"
          current={totals.calories}
          target={calorieTarget}
          className="min-w-[92px] sm:min-w-0 shrink-0 snap-start sm:shrink"
        />
        <MacroRing
          nutrient="protein"
          current={totals.proteinG}
          target={goal?.proteinTargetG ?? null}
          className="min-w-[92px] sm:min-w-0 shrink-0 snap-start sm:shrink"
        />
        <MacroRing
          nutrient="carbs"
          current={totals.carbG}
          target={goal?.carbTargetG ?? null}
          className="min-w-[92px] sm:min-w-0 shrink-0 snap-start sm:shrink"
        />
        <MacroRing
          nutrient="fat"
          current={totals.fatG}
          target={goal?.fatTargetG ?? null}
          className="min-w-[92px] sm:min-w-0 shrink-0 snap-start sm:shrink"
        />
      </div>
    </div>
  );
}
