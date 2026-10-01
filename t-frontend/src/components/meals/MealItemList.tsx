"use client";

import { formatItemAmount } from "@/lib/foodItems";
import type { FoodItem } from "@/types/nutrition";

/** A meal's dishes, one per line, each with its amount, calories and macros. */
export default function MealItemList({ items }: { items: readonly FoodItem[] }) {
  return (
    <ul className="divide-y divide-black/5 dark:divide-white/10">
      {items.map((item, index) => (
        <li key={`${item.name}-${index}`} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3 first:pt-0">
          <p className="text-sm font-semibold text-text-primary dark:text-dark-text">
            {item.name}
            <span className="ml-2 font-light text-text-secondary dark:text-dark-text-secondary">
              {formatItemAmount(item)}
            </span>
          </p>
          <p className="text-xs tabular-nums text-text-secondary dark:text-dark-text-secondary">
            {item.calories} kcal · P {item.macros.proteinG} · C {item.macros.carbG} · F {item.macros.fatG} g
          </p>
        </li>
      ))}
    </ul>
  );
}
