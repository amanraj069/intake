import { request, requestPage } from "./apiClient";
import { idempotencyHeaders } from "./idempotency";
import { toQueryString } from "./queryString";
import type {
  DailyIntakeSeries,
  DailyIntakeSummary,
  FoodEntry,
  FoodEntryInput,
  FoodEntryQuery,
  Goal,
  GoalInput,
} from "@/types/nutrition";

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

  listFoodEntries: (query: FoodEntryQuery) =>
    requestPage<FoodEntry>(`/api/food-entries${toQueryString({ ...query })}`),

  getDailyIntakeSummary: (date?: string) =>
    request<DailyIntakeSummary>(`/api/food-entries/summary${toQueryString({ date })}`),

  getDailyIntakeSeries: (startDate: string, endDate: string) =>
    request<DailyIntakeSeries>(
      `/api/food-entries/series${toQueryString({ startDate, endDate })}`
    ),

  getFoodEntry: (id: string) => request<FoodEntryData>(`/api/food-entries/${id}`),

  /** Pass the same `idempotencyKey` when retrying one submission, so it can only be saved once. */
  createFoodEntry: (entry: FoodEntryInput, photoFile?: File | Blob | null, idempotencyKey?: string) => {
    const headers = idempotencyHeaders(idempotencyKey);
    if (photoFile) {
      const form = new FormData();
      form.append("data", JSON.stringify(entry));
      form.append("image", photoFile);
      return request<FoodEntryData>("/api/food-entries", {
        method: "POST",
        body: form,
        headers,
      });
    }
    return request<FoodEntryData>("/api/food-entries", {
      method: "POST",
      body: JSON.stringify(entry),
      headers,
    });
  },

  uploadMealImage: (image: File | Blob) => {
    const form = new FormData();
    form.append("image", image);
    return request<{ imageUrl: string; imagePublicId: string }>("/api/food-entries/upload-image", {
      method: "POST",
      body: form,
    });
  },

  updateFoodEntry: (id: string, changes: Partial<FoodEntryInput>) =>
    request<FoodEntryData>(`/api/food-entries/${id}`, {
      method: "PATCH",
      body: JSON.stringify(changes),
    }),

  deleteFoodEntry: (id: string) =>
    request(`/api/food-entries/${id}`, { method: "DELETE" }),
};
