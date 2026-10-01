"use client";

import { formatItemAmount } from "@/lib/foodItems";
import { formatAmount } from "@/lib/formatNumber";
import { colourFor } from "@/lib/metricColours";
import type { FoodItem } from "@/types/nutrition";
import DetailSection from "./DetailSection";

const DISH_GRID = "sm:grid sm:grid-cols-[minmax(0,1fr)_5.5rem_5.5rem_4.5rem_4.5rem_4.5rem] sm:items-center sm:gap-4";
const MACRO_COLUMNS = [
  { key: "protein", label: "Protein", grams: (item: FoodItem) => item.macros.proteinG },
  { key: "carbs", label: "Carbs", grams: (item: FoodItem) => item.macros.carbG },
  { key: "fat", label: "Fat", grams: (item: FoodItem) => item.macros.fatG },
] as const;

function Grams({ value, className = "" }: { value: number; className?: string }) {
  return (
    <span className={`tabular-nums font-semibold ${className}`}>
      {formatAmount(value)}
      <span className="ml-0.5 text-[10px] font-normal text-text-secondary dark:text-dark-text-secondary">g</span>
    </span>
  );
}

function DishRow({ item }: { item: FoodItem }) {
  return (
    <li className={`py-3.5 ${DISH_GRID}`}>
      <div className="flex items-baseline justify-between gap-3 sm:block min-w-0">
        <p className="truncate text-sm font-semibold text-text-primary dark:text-dark-text">{item.name}</p>
        <p className="shrink-0 text-sm font-bold tabular-nums text-text-primary dark:text-dark-text sm:hidden">
          {formatAmount(item.calories)} <span className="text-[10px] font-medium text-text-secondary">kcal</span>
        </p>
      </div>
      <p className="mt-0.5 sm:mt-0 text-xs font-light text-text-secondary dark:text-dark-text-secondary">
        {formatItemAmount(item)}
      </p>
      <p className="hidden sm:block text-sm font-bold tabular-nums text-text-primary dark:text-dark-text">
        {formatAmount(item.calories)} <span className="text-[10px] font-medium text-text-secondary">kcal</span>
      </p>
      <div className="mt-2 flex gap-4 text-xs sm:contents">
        {MACRO_COLUMNS.map((column) => {
          const colour = colourFor(column.key);
          return (
            <p key={column.key} className="text-text-primary dark:text-dark-text">
              <span className={`mr-1 sm:hidden ${colour.text}`}>{column.label}</span>
              <Grams value={column.grams(item)} />
            </p>
          );
        })}
      </div>
    </li>
  );
}

/** Every dish in the meal with its amount, calories and macros, as a table that stacks on phones. */
export default function MealDishTable({ items }: { items: readonly FoodItem[] }) {
  return (
    <DetailSection title="Dishes" description="What the meal is made of" aside={<DishCount count={items.length} />}>
      <div
        className={`hidden ${DISH_GRID} pb-3 border-b border-black/5 dark:border-white/5 text-[11px] font-semibold text-text-secondary dark:text-dark-text-secondary`}
      >
        <span>Dish</span>
        <span>Amount</span>
        <span>Calories</span>
        {MACRO_COLUMNS.map((column) => {
          const colour = colourFor(column.key);
          return (
            <span key={column.key} className={`${colour.text}`}>
              {column.label}
            </span>
          );
        })}
      </div>
      <ul className="divide-y divide-black/5 dark:divide-white/5">
        {items.map((item, index) => (
          <DishRow key={`${item.name}-${index}`} item={item} />
        ))}
      </ul>
    </DetailSection>
  );
}

function DishCount({ count }: { count: number }) {
  return (
    <span className="text-xs font-semibold text-text-secondary dark:text-dark-text-secondary">
      {count === 1 ? "1 dish" : `${count} dishes`}
    </span>
  );
}
