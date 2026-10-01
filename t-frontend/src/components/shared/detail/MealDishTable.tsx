"use client";

import { formatItemAmount } from "@/lib/foodItems";
import { formatAmount } from "@/lib/formatNumber";
import { colourFor } from "@/lib/metricColours";
import type { FoodItem } from "@/types/nutrition";
import DetailSection from "./DetailSection";

const DISH_GRID = "sm:grid sm:grid-cols-[minmax(0,1fr)_5.5rem_5.5rem_4.5rem_4.5rem_4.5rem] sm:items-center sm:gap-4";
/** `short` labels the macros on phones, the way the meal form's item list does ("P 11 · C 88 · F 18"). */
const MACRO_COLUMNS = [
  { key: "protein", label: "Protein", short: "P", grams: (item: FoodItem) => item.macros.proteinG },
  { key: "carbs", label: "Carbs", short: "C", grams: (item: FoodItem) => item.macros.carbG },
  { key: "fat", label: "Fat", short: "F", grams: (item: FoodItem) => item.macros.fatG },
] as const;

function Grams({ value }: { value: number }) {
  return (
    <span className="tabular-nums font-semibold">
      {formatAmount(value)}
      <span className="ml-0.5 text-[10px] font-normal text-text-secondary dark:text-dark-text-secondary">g</span>
    </span>
  );
}

function Calories({ value, className }: { value: number; className: string }) {
  return (
    <p className={`font-bold tabular-nums text-text-primary dark:text-dark-text ${className}`}>
      {formatAmount(value)} <span className="text-[10px] font-medium text-text-secondary">kcal</span>
    </p>
  );
}

/**
 * Two lines on phones (name and calories, then amount and macros) and one
 * table row from `sm` up, where `sm:contents` lets the macros join the grid.
 */
function DishRow({ item }: { item: FoodItem }) {
  const amount = formatItemAmount(item);

  return (
    <li className={`py-2.5 sm:py-3.5 ${DISH_GRID}`}>
      <div className="flex items-baseline justify-between gap-3 sm:block min-w-0">
        <p className="truncate text-[13px] sm:text-sm font-semibold text-text-primary dark:text-dark-text">{item.name}</p>
        <Calories value={item.calories} className="shrink-0 text-[13px] sm:hidden" />
      </div>
      <p className="hidden sm:block text-xs font-light text-text-secondary dark:text-dark-text-secondary">{amount}</p>
      <Calories value={item.calories} className="hidden sm:block text-sm" />
      <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-[11px] sm:mt-0 sm:contents sm:text-xs">
        <span className="font-light text-text-secondary dark:text-dark-text-secondary sm:hidden">{amount}</span>
        {MACRO_COLUMNS.map((column) => (
          <p key={column.key} className="text-text-primary dark:text-dark-text">
            <span className={`mr-1 font-semibold sm:hidden ${colourFor(column.key).text}`}>{column.short}</span>
            <Grams value={column.grams(item)} />
          </p>
        ))}
      </div>
    </li>
  );
}

function DishCount({ count }: { count: number }) {
  return (
    <span className="text-[11px] sm:text-xs font-semibold text-text-secondary dark:text-dark-text-secondary">
      {count === 1 ? "1 dish" : `${count} dishes`}
    </span>
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
        {MACRO_COLUMNS.map((column) => (
          <span key={column.key} className={colourFor(column.key).text}>
            {column.label}
          </span>
        ))}
      </div>
      <ul className="divide-y divide-black/5 dark:divide-white/5">
        {items.map((item, index) => (
          <DishRow key={`${item.name}-${index}`} item={item} />
        ))}
      </ul>
    </DetailSection>
  );
}
