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
  const figures: readonly { key: NutritionMetricKey; label: string; value: string }[] = [
    { key: "calories", label: "Calories", value: `${calories} kcal` },
    { key: "protein", label: "Protein", value: `${macros.proteinG} g` },
    { key: "carbs", label: "Carbs", value: `${macros.carbG} g` },
    { key: "fat", label: "Fat", value: `${macros.fatG} g` },
  ];

  return (
    <div className="rounded-2xl bg-bg-card dark:bg-dark-bg-card border border-black/5 dark:border-white/10 shadow-sm p-5 sm:p-6">
      <p className="text-xs font-bold text-text-secondary dark:text-dark-text-secondary">
        Meal total{items.length > 1 ? `: ${items.length} dishes` : ""}
        {live && <span className="ml-2 font-light">updates as you type</span>}
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-6 sm:grid-cols-4">
        {figures.map(({ key, label, value }) => {
          const colour = colourFor(key);
          return (
            <div key={key}>
              <dt className={`text-xs font-semibold ${colour.text}`}>{label}</dt>
              <dd className="mt-1 text-xl font-bold tabular-nums text-text-primary dark:text-dark-text">{value}</dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
