import type { MealType } from "@/types/nutrition";

/**
 * Determines the default meal type based on the local time of day.
 * - 05:00 to 10:59: breakfast
 * - 11:00 to 15:59: lunch
 * - 16:00 to 18:59: snack
 * - 19:00 to 04:59: dinner
 */
export function getDefaultMealType(): MealType {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return "breakfast";
  if (hour >= 11 && hour < 16) return "lunch";
  if (hour >= 16 && hour < 19) return "snack";
  return "dinner";
}

/**
 * Returns a natural-sounding phrase like "as breakfast", "as lunch", "as a snack", "as dinner".
 */
export function formatMealPhrase(mealType: MealType): string {
  return mealType === "snack" ? "as a snack" : `as ${mealType}`;
}

/**
 * Returns a capitalized label like "Breakfast", "Lunch", "Snack", "Dinner".
 */
export function formatMealLabel(mealType: MealType): string {
  return mealType.charAt(0).toUpperCase() + mealType.slice(1);
}
