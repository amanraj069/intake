import type { FoodEntry } from "./nutrition";

/** The person who shared a meal, as much as the recipient needs to recognise them. */
export interface SharedBy {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

/** A meal another user shared with the current user, read live from the owner's log. */
export interface SharedMeal {
  id: string;
  sharedAt: string;
  sharedBy: SharedBy;
  meal: FoodEntry;
}

export interface ShareMealInput {
  mealId: string;
  email: string;
}
