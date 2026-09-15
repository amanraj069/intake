"use client";

import { LogMealIcon } from "@/components/icons";
import { parseFoodItems } from "@/lib/chatFoodItems";
import { formatMealLabel, formatMealPhrase, getDefaultMealType } from "@/lib/mealTime";
import type { PendingChatAction } from "@/types/chat";
import FoodItemsTable from "./FoodItemsTable";

interface NutritionEstimateCardProps {
  action: PendingChatAction;
  onLogMeal?: (mealType: string) => void;
}

function getEstimateTitle(items: readonly { name: string }[]): string {
  if (items.length === 0) return "Nutritional value";
  if (items.length === 1) return items[0].name;
  if (items.length <= 3) return items.map((i) => i.name).join(", ");
  return `${items.slice(0, 2).map((i) => i.name).join(", ")} +${items.length - 2} more`;
}

/**
 * The nutritional breakdown of a meal or photo the user asked about, shown as
 * the same food table used when logging a meal. Shows the food item name at the
 * top, and dynamically asks if the user wants it logged based on current time.
 */
export default function NutritionEstimateCard({ action, onLogMeal }: NutritionEstimateCardProps) {
  const items = parseFoodItems(action.args);
  const title = getEstimateTitle(items);
  const defaultMeal = getDefaultMealType();
  const mealPhrase = formatMealPhrase(defaultMeal);
  const mealLabel = formatMealLabel(defaultMeal);

  return (
    <div className="w-full space-y-3 rounded-2xl rounded-bl-md border border-border dark:border-dark-border bg-bg-card dark:bg-dark-bg-card p-3.5 sm:p-5 shadow-xs">
      <span className="block text-[13px] sm:text-sm font-bold text-text-primary dark:text-dark-text pr-7 sm:pr-8 truncate">
        {title}
      </span>
      <FoodItemsTable items={items} />
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1 border-t border-black/5 dark:border-white/5">
        <p className="text-xs sm:text-[13px] font-medium text-text-secondary dark:text-dark-text-secondary">
          Want this logged {mealPhrase}?
        </p>
        {onLogMeal && (
          <button
            type="button"
            onClick={() => onLogMeal(defaultMeal)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-accent/10 hover:bg-accent/20 text-accent dark:text-accent-dark border border-accent/20 transition-all duration-150 active:scale-[0.98] cursor-pointer"
          >
            <LogMealIcon className="w-3.5 h-3.5" />
            <span>Log as {mealLabel}</span>
          </button>
        )}
      </div>
    </div>
  );
}
