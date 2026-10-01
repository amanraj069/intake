"use client";

import { formatShortDate } from "@/lib/formatDate";
import { formatAmount } from "@/lib/formatNumber";
import { colourFor } from "@/lib/metricColours";
import type { NutritionMetricKey } from "@/lib/nutritionMetrics";
import { displayName } from "@/lib/userIdentity";
import type { SharedMeal } from "@/types/sharedMeal";

interface MacroFigure {
  key: NutritionMetricKey;
  label: string;
  grams: number;
}

function MacroChip({ figure }: { figure: MacroFigure }) {
  const colour = colourFor(figure.key);
  return (
    <span
      className={`inline-flex items-baseline gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold ${colour.bg} ${colour.darkBg} ${colour.text} ${colour.darkText}`}
    >
      {formatAmount(figure.grams)}g
      <span className="font-light">{figure.label}</span>
    </span>
  );
}

/** One shared meal: what it is, who sent it, and its totals at a glance. */
export default function SharedMealCard({ sharedMeal }: { sharedMeal: SharedMeal }) {
  const { meal, sharedBy } = sharedMeal;
  const calories = colourFor("calories");
  const macros: MacroFigure[] = [
    { key: "protein", label: "Protein", grams: meal.macros.proteinG },
    { key: "carbs", label: "Carbs", grams: meal.macros.carbG },
    { key: "fat", label: "Fat", grams: meal.macros.fatG },
  ];

  return (
    <article className="flex flex-col gap-3 rounded-xl bg-bg-surface dark:bg-dark-surface p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm">
      <div className="flex items-start gap-3">
        {meal.imageUrl && (
          <img
            src={meal.imageUrl}
            alt=""
            className="h-11 w-11 shrink-0 rounded-lg object-cover border border-black/5 dark:border-white/10"
          />
        )}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-bold text-text-primary dark:text-dark-text">{meal.name}</h3>
          <p className="mt-0.5 text-[11px] font-light text-text-secondary dark:text-dark-text-secondary">
            <span className="capitalize">{meal.mealType}</span> · {formatShortDate(meal.date)}
          </p>
        </div>
        <p className={`shrink-0 text-sm font-bold tabular-nums ${calories.text} ${calories.darkText}`}>
          {formatAmount(meal.calories)}
          <span className="ml-0.5 text-[10px] font-medium">kcal</span>
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {macros.map((figure) => (
          <MacroChip key={figure.key} figure={figure} />
        ))}
      </div>

      <p className="truncate text-[11px] font-light text-text-secondary dark:text-dark-text-secondary">
        Shared by <span className="font-semibold">{displayName(sharedBy)}</span>
      </p>
    </article>
  );
}
