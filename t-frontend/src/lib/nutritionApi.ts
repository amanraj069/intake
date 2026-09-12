import { request } from "./apiClient";
import type { FoodEntry, FoodEntryInput, Goal, GoalInput } from "@/types/nutrition";

interface GoalData {
  /** Null until the user has set a goal for the first time. */
  goal: Goal | null;
}

interface FoodEntryData {
  foodEntry: FoodEntry;
}

export const nutritionApi = {
  getGoal: () => request<GoalData>("/api/goals"),

  saveGoal: (goal: GoalInput) =>
    request<GoalData>("/api/goals", {
      method: "POST",
      body: JSON.stringify(goal),
    }),

  createFoodEntry: (entry: FoodEntryInput) =>
    request<FoodEntryData>("/api/food-entries", {
      method: "POST",
      body: JSON.stringify(entry),
    }),

  updateFoodEntry: (id: string, changes: Partial<FoodEntryInput>) =>
    request<FoodEntryData>(`/api/food-entries/${id}`, {
      method: "PATCH",
      body: JSON.stringify(changes),
    }),

  deleteFoodEntry: (id: string) =>
    request(`/api/food-entries/${id}`, { method: "DELETE" }),
};
