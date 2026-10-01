import { request, requestPage } from "./apiClient";
import { toQueryString } from "./queryString";
import type { ShareMealInput, SharedMeal } from "@/types/sharedMeal";

export const sharedMealsApi = {
  listSharedMeals: (page: number, limit: number) =>
    requestPage<SharedMeal>(`/api/shared-meals${toQueryString({ page, limit })}`),

  shareMeal: (input: ShareMealInput) =>
    request("/api/shared-meals", {
      method: "POST",
      body: JSON.stringify(input),
    }),
};
