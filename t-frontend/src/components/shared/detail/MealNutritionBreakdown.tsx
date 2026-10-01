"use client";

import { formatAmount } from "@/lib/formatNumber";
import { colourFor } from "@/lib/metricColours";
import { toMacroEnergySplit, type NutritionMetricKey } from "@/lib/nutritionMetrics";
import type { FoodEntry } from "@/types/nutrition";
import DetailSection from "./DetailSection";

interface NutrientFigure {
  key: NutritionMetricKey;
  label: string;
  amount: number;
  unit: string;
  /** Share of the meal's calories, for the three macros only. */
  energyPercent: number | null;
}

/** Same surface, dot and label treatment as the Overview's nutrient tiles, so the two pages read alike. */
function NutrientTile({ figure }: { figure: NutrientFigure }) {
  const colour = colourFor(figure.key);
  return (
    <div className="min-w-0 rounded-xl bg-bg-surface dark:bg-dark-surface p-3 sm:p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm">
      <div className="flex items-center gap-1.5">
        <span className={`h-2 w-2 rounded-full shrink-0 ${colour.solidBg}`} aria-hidden="true" />
        <span className={`text-[11px] sm:text-xs font-semibold ${colour.text}`}>{figure.label}</span>
      </div>
      <p className="mt-1.5 sm:mt-2 text-lg sm:text-2xl font-extrabold tabular-nums text-text-primary dark:text-dark-text">
        {formatAmount(figure.amount)}
        <span className="ml-1 text-[10px] sm:text-xs font-medium text-text-secondary dark:text-dark-text-secondary">{figure.unit}</span>
      </p>
      <p className="mt-0.5 text-[10px] sm:text-[11px] font-light text-text-secondary dark:text-dark-text-secondary">
        {figure.energyPercent === null ? "Whole meal" : `${figure.energyPercent}% of calories`}
      </p>
    </div>
  );
}

function EnergySplitBar({ figures }: { figures: NutrientFigure[] }) {
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-bg-surface dark:bg-dark-surface" aria-hidden="true">
      {figures.map((figure) => (
        <div
          key={figure.key}
          className={colourFor(figure.key).solidBg}
          style={{ width: `${figure.energyPercent ?? 0}%` }}
        />
      ))}
    </div>
  );
}

/** The meal's calories and macros, with how the calories divide between protein, carbs and fat. */
export default function MealNutritionBreakdown({ meal }: { meal: FoodEntry }) {
  const split = toMacroEnergySplit(meal.macros);
  const macros: NutrientFigure[] = [
    { key: "protein", label: "Protein", amount: meal.macros.proteinG, unit: "g", energyPercent: split?.proteinPercent ?? null },
    { key: "carbs", label: "Carbs", amount: meal.macros.carbG, unit: "g", energyPercent: split?.carbPercent ?? null },
    { key: "fat", label: "Fat", amount: meal.macros.fatG, unit: "g", energyPercent: split?.fatPercent ?? null },
  ];
  const calories: NutrientFigure = {
    key: "calories",
    label: "Calories",
    amount: meal.calories,
    unit: "kcal",
    energyPercent: null,
  };

  return (
    <DetailSection title="Nutrition" description="Totals for the whole meal">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {[calories, ...macros].map((figure) => (
          <NutrientTile key={figure.key} figure={figure} />
        ))}
      </div>

      {split && (
        <div className="mt-4 sm:mt-5 space-y-2">
          <p className="text-[11px] font-light text-text-secondary dark:text-dark-text-secondary">Where the calories come from</p>
          <EnergySplitBar figures={macros} />
        </div>
      )}
    </DetailSection>
  );
}
