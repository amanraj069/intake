"use client";

import Button from "@/components/ui/Button";
import { useDailyIntake } from "@/hooks/useDailyIntake";
import { parseFoodItems } from "@/lib/chatFoodItems";
import type { PendingChatAction } from "@/types/chat";
import DailyOverviewProgress from "./DailyOverviewProgress";
import FoodItemsTable from "./FoodItemsTable";

interface MealLogCardProps {
  action: PendingChatAction;
  /** Called when "Log Another Meal" is clicked: focuses the composer. */
  onLogAnother?: () => void;
}

type MealType = "breakfast" | "lunch" | "dinner" | "snack";

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

function isMealType(value: unknown): value is MealType {
  return typeof value === "string" && value in MEAL_LABELS;
}

/**
 * Structured meal log receipt card, shown after a logMeal action is confirmed.
 * Displays meal type, today's overall nutrition progress, the food table, and
 * a button to log another meal.
 */
export default function MealLogCard({ action, onLogAnother }: MealLogCardProps) {
  const mealType = isMealType(action.args.mealType) ? action.args.mealType : null;
  const mealLabel = mealType ? MEAL_LABELS[mealType] : "Meal";
  const items = parseFoodItems(action.args);
  const { summary, loading: dailyLoading } = useDailyIntake();

  return (
    <div className="w-full space-y-3 sm:space-y-4 rounded-2xl rounded-bl-md border border-border dark:border-dark-border bg-bg-card dark:bg-dark-bg-card p-3 sm:p-5 shadow-sm">
      <span className="block text-[13px] sm:text-sm font-bold text-text-primary dark:text-dark-text pr-7 sm:pr-8 truncate">Logged as {mealLabel}</span>

      <DailyOverviewProgress summary={summary} loading={dailyLoading} />

      <FoodItemsTable items={items} />

      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] sm:text-sm font-bold text-accent dark:text-accent-dark">
          <span className="sm:hidden">Logged successfully!</span>
          <span className="hidden sm:inline">Meal logged successfully!</span>
        </span>
        {onLogAnother && (
          <Button type="button" variant="secondary" size="sm" onClick={onLogAnother}>
            <span className="sm:hidden">Log Another</span>
            <span className="hidden sm:inline">Log Another Meal</span>
          </Button>
        )}
      </div>
    </div>
  );
}
