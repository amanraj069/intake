"use client";

import { sumItems } from "@/lib/foodItems";
import { colourFor } from "@/lib/metricColours";
import type { NutritionMetricKey } from "@/lib/nutritionMetrics";
import type { FoodItemInput } from "@/types/nutrition";

interface MealTotalsProps {
  items: readonly Pick<FoodItemInput, "calories" | "macros">[];
  /** Shown while editing, where totals follow the fields as they are typed. */
  live?: boolean;
}

/** The whole meal's calories and macros, summed from its items, each in its nutrient colour. */
export default function MealTotals({ items, live = false }: MealTotalsProps) {
  const { calories, macros } = sumItems(items);
  const figures: readonly {
    key: NutritionMetricKey;
    label: string;
    value: string;
    num: number;
    unit: string;
  }[] = [
    { key: "calories", label: "Calories", value: `${calories} kcal`, num: calories, unit: "kcal" },
    { key: "protein", label: "Protein", value: `${macros.proteinG} g`, num: macros.proteinG, unit: "g" },
    { key: "carbs", label: "Carbs", value: `${macros.carbG} g`, num: macros.carbG, unit: "g" },
    { key: "fat", label: "Fat", value: `${macros.fatG} g`, num: macros.fatG, unit: "g" },
  ];

  return (
    <div className="rounded-2xl bg-bg-card dark:bg-dark-bg-card border border-black/5 dark:border-white/10 shadow-sm p-3.5 sm:p-6">
      <p className="text-xs sm:text-sm font-bold text-text-primary dark:text-dark-text">
        Meal total{items.length > 1 ? `: ${items.length} dishes` : ""}
        {live && (
          <span className="ml-2 text-[11px] sm:text-xs font-normal text-text-secondary dark:text-dark-text-secondary">
            updates as you type
          </span>
        )}
      </p>
      <dl className="mt-3 sm:mt-3.5 grid grid-cols-4 gap-1.5 sm:gap-3 lg:gap-4">
        {figures.map(({ key, label, value, num, unit }) => {
          const colour = colourFor(key);
          return (
            <div
              key={key}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-center sm:gap-2 items-center justify-center p-2.5 sm:py-2.5 sm:px-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/5 dark:border-white/10 text-center min-w-0 transition-colors"
            >
              <dt className={`text-xs font-bold sm:font-semibold ${colour.text} truncate w-full sm:w-auto shrink-0`}>
                {label}
              </dt>
              <dd className="mt-1 sm:mt-0 text-sm sm:text-sm font-extrabold sm:font-bold tabular-nums text-text-primary dark:text-dark-text whitespace-nowrap">
                <span className="sm:hidden">
                  {num} <span className="text-[10px] font-medium text-text-secondary dark:text-dark-text-secondary">{unit}</span>
                </span>
                <span className="hidden sm:inline">{value}</span>
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
