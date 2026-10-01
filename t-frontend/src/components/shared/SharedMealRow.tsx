"use client";

import type { ReactNode } from "react";
import { describeItem, servingLabel } from "@/lib/foodItems";
import { formatNumericDate } from "@/lib/formatDate";
import type { FoodEntry } from "@/types/nutrition";

/** Column track shared by header and every row, mirroring the Meals table with a person column added. */
export const SHARED_GRID_CLASSES =
  "grid grid-cols-[4.5rem_4.5rem_minmax(160px,1fr)_minmax(9rem,12rem)_4.75rem_3.5rem_3.5rem_3.25rem_4.5rem_2.25rem] items-center gap-x-3 sm:gap-x-4";

interface SharedMealRowProps {
  meal: FoodEntry;
  /** The person column: who shared it, or who it is shared with. */
  person: ReactNode;
  /** The row's three-dot menu, if it has one. */
  actions?: ReactNode;
  /** Opens the meal: the edit form for the owner, the read-only detail page for a recipient. */
  onClick?: () => void;
}

function GramsCell({ grams }: { grams: number }) {
  return (
    <p className="text-xs font-semibold tabular-nums text-text-primary dark:text-dark-text">
      {grams}
      <span className="text-[10px] font-normal text-text-secondary dark:text-dark-text-secondary ml-0.5">g</span>
    </p>
  );
}

export default function SharedMealRow({ meal, person, actions, onClick }: SharedMealRowProps) {
  const { proteinG, carbG, fatG } = meal.macros;
  const interactiveClasses = onClick ? "cursor-pointer hover:bg-black/[0.04] dark:hover:bg-white/[0.04]" : "";

  return (
    <article
      onClick={onClick}
      className={`${SHARED_GRID_CLASSES} border-b border-black/5 dark:border-white/5 last:border-b-0 px-5 sm:px-6 py-3.5 transition-colors ${interactiveClasses}`}
    >
      <p className="text-xs font-medium text-text-secondary dark:text-dark-text-secondary whitespace-nowrap">
        {formatNumericDate(meal.date)}
      </p>

      <p className="text-xs font-semibold text-text-primary dark:text-dark-text capitalize">{meal.mealType}</p>

      <div className="min-w-0 pr-2 flex items-center gap-2">
        {meal.imageUrl && (
          <img
            src={meal.imageUrl}
            alt=""
            className="w-6 h-6 rounded-md object-cover shrink-0 border border-black/5 dark:border-white/10"
          />
        )}
        <p
          className="text-sm font-semibold text-text-primary dark:text-dark-text truncate"
          title={meal.items.map(describeItem).join(", ")}
        >
          {meal.name}
        </p>
      </div>

      <div className="min-w-0">{person}</div>

      <p className="text-xs font-medium text-text-secondary dark:text-dark-text-secondary whitespace-nowrap">
        {servingLabel(meal.items)}
      </p>

      <GramsCell grams={proteinG} />
      <GramsCell grams={carbG} />
      <GramsCell grams={fatG} />

      <div className="text-right flex items-baseline justify-end gap-1">
        <span className="text-sm font-semibold tabular-nums text-text-primary dark:text-dark-text">{meal.calories}</span>
        <span className="text-[10px] font-medium text-text-secondary dark:text-dark-text-secondary">kcal</span>
      </div>

      <div>{actions}</div>
    </article>
  );
}
