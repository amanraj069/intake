import { request, requestPage } from "./apiClient";
import { toQueryString } from "./queryString";
import type { MealAccess, SentMeal, ShareMealInput, SharedMeal } from "@/types/sharedMeal";

export const sharedMealsApi = {
  listSharedMeals: (page: number, limit: number) =>
    requestPage<SharedMeal>(`/api/shared-meals${toQueryString({ page, limit })}`),

  listSentMeals: (page: number, limit: number) =>
    requestPage<SentMeal>(`/api/shared-meals/sent${toQueryString({ page, limit })}`),

  getSharedMeal: (shareId: string) => request<SharedMeal>(`/api/shared-meals/received/${shareId}`),

  getUnseenShareCount: () => request<{ count: number }>("/api/shared-meals/unseen-count"),

  markSharesSeen: (shareIds: string[]) =>
    request<{ markedCount: number }>("/api/shared-meals/seen", {
      method: "PATCH",
      body: JSON.stringify({ shareIds }),
    }),

  revokeMealAccess: (mealId: string, revokeUserIds: string[]) =>
    request<MealAccess>(`/api/shared-meals/${mealId}/access`, {
      method: "PATCH",
      body: JSON.stringify({ revokeUserIds }),
    }),

  shareMeal: (input: ShareMealInput) =>
    request("/api/shared-meals", {
      method: "POST",
      body: JSON.stringify(input),
    }),
};
