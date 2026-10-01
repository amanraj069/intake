"use client";

import { displayName } from "@/lib/userIdentity";
import type { SharedMeal } from "@/types/sharedMeal";
import MealDishTable from "./detail/MealDishTable";
import MealNutritionBreakdown from "./detail/MealNutritionBreakdown";
import MicronutrientGrid from "./detail/MicronutrientGrid";
import SharedMealOverview from "./detail/SharedMealOverview";

/** Everything about a meal someone shared, in sections: overview, nutrition, dishes and micronutrients. Read-only. */
export default function SharedMealDetail({ sharedMeal }: { sharedMeal: SharedMeal }) {
  const { meal, sharedBy } = sharedMeal;

  return (
    <div className="space-y-4 sm:space-y-6">
      <SharedMealOverview sharedMeal={sharedMeal} />
      <MealNutritionBreakdown meal={meal} />
      <MealDishTable items={meal.items} />
      <MicronutrientGrid micros={meal.micros} />
      <p className="text-center text-xs font-light text-text-secondary dark:text-dark-text-secondary">
        Only {displayName(sharedBy)} can edit this meal. Changes they make show up here.
      </p>
    </div>
  );
}
