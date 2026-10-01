import type { FoodEntry } from "./nutrition";

/** The other person on a share, as much as the current user needs to recognise them. */
export interface SharedUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

/** A meal another user shared with the current user, read live from the owner's log. */
export interface SharedMeal {
  id: string;
  sharedAt: string;
  sharedBy: SharedUser;
  /** False until the current user has seen this share on their Shared page. */
  seen: boolean;
  meal: FoodEntry;
}

/** One of the current user's meals and everyone it is currently shared with. */
export interface SentMeal {
  id: string;
  lastSharedAt: string;
  sharedWith: SharedUser[];
  meal: FoodEntry;
}

/** Who still has access to a meal after some recipients were revoked. */
export interface MealAccess {
  revokedCount: number;
  sharedWith: SharedUser[];
}

export interface ShareMealInput {
  mealId: string;
  email: string;
}
