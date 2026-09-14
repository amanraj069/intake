"use client";

import { parseFoodItems } from "@/lib/chatFoodItems";
import type { PendingChatAction } from "@/types/chat";
import FoodItemsTable from "./FoodItemsTable";

interface NutritionEstimateCardProps {
  action: PendingChatAction;
}

/**
 * The nutritional breakdown of a meal or photo the user asked about, shown as
 * the same food table used when logging a meal. Nothing here was saved, so it
 * skips the meal-type header and the daily progress a real log shows.
 */
export default function NutritionEstimateCard({ action }: NutritionEstimateCardProps) {
  const items = parseFoodItems(action.args);

  return (
    <div className="w-full space-y-2.5 sm:space-y-3 rounded-2xl rounded-bl-md border border-border dark:border-dark-border bg-bg-card dark:bg-dark-bg-card p-3 sm:p-5 shadow-sm">
      <FoodItemsTable items={items} />
      <p className="text-[13px] sm:text-sm text-text-secondary dark:text-dark-text-secondary">
        Want this logged? Just tell me the meal.
      </p>
    </div>
  );
}
