import type { DailyNutritionTotals, Goal } from "@/types/nutrition";

/** The four tracked measures, in the order they read across the dashboard. */
export const NUTRITION_METRIC_KEYS = ["calories", "protein", "carbs", "fat"] as const;
export type NutritionMetricKey = (typeof NUTRITION_METRIC_KEYS)[number];

/**
 * How to read one measure out of a day's totals and out of a goal, so every
 * view that plots or lists a measure shares a single definition of it.
 */
export interface NutritionMetric {
  key: NutritionMetricKey;
  label: string;
  unit: string;
  actualOf: (totals: DailyNutritionTotals) => number;
  targetOf: (goal: Goal) => number;
}

export const NUTRITION_METRICS: Record<NutritionMetricKey, NutritionMetric> = {
  calories: {
    key: "calories",
    label: "Calories",
    unit: "kcal",
    actualOf: (totals) => totals.calories,
    targetOf: (goal) => goal.dailyCalorieTarget,
  },
  protein: {
    key: "protein",
    label: "Protein",
    unit: "g",
    actualOf: (totals) => totals.proteinG,
    targetOf: (goal) => goal.proteinTargetG,
  },
  carbs: {
    key: "carbs",
    label: "Carbs",
    unit: "g",
    actualOf: (totals) => totals.carbG,
    targetOf: (goal) => goal.carbTargetG,
  },
  fat: {
    key: "fat",
    label: "Fat",
    unit: "g",
    actualOf: (totals) => totals.fatG,
    targetOf: (goal) => goal.fatTargetG,
  },
};

export const MACRO_METRIC_KEYS: readonly NutritionMetricKey[] = ["protein", "carbs", "fat"];

/** Null target means no goal is set, where a percentage would be meaningless. */
export function toPercentOfTarget(actual: number, target: number | null): number | null {
  if (target === null || target <= 0) return null;
  return Math.round((actual / target) * 100);
}

/** The target amount for a measure, or null while the user has no goal. */
export function targetFor(metric: NutritionMetric, goal: Goal | null): number | null {
  return goal ? metric.targetOf(goal) : null;
}

/** Energy per gram of each macro, the standard Atwater factors. */
const KCAL_PER_GRAM = { protein: 4, carb: 4, fat: 9 } as const;

/** How the day's energy divides between the three macros, in whole percent. */
export interface MacroEnergySplit {
  proteinPercent: number;
  carbPercent: number;
  fatPercent: number;
}

/**
 * The macro split by energy rather than by weight, which is how targets are
 * usually reasoned about. Null when nothing has been logged, where a split
 * would be a division by zero. Rounding each share independently means they
 * can sum to 99 or 101; the exact grams are shown beside them either way.
 */
export function toMacroEnergySplit(totals: DailyNutritionTotals): MacroEnergySplit | null {
  const proteinKcal = totals.proteinG * KCAL_PER_GRAM.protein;
  const carbKcal = totals.carbG * KCAL_PER_GRAM.carb;
  const fatKcal = totals.fatG * KCAL_PER_GRAM.fat;
  const macroKcal = proteinKcal + carbKcal + fatKcal;

  if (macroKcal <= 0) return null;

  return {
    proteinPercent: Math.round((proteinKcal / macroKcal) * 100),
    carbPercent: Math.round((carbKcal / macroKcal) * 100),
    fatPercent: Math.round((fatKcal / macroKcal) * 100),
  };
}
