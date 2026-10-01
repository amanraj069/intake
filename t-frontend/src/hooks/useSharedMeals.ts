"use client";

import { api } from "@/lib/api";
import type { SentMeal, SharedMeal } from "@/types/sharedMeal";
import { usePaginatedList, type PaginatedList } from "./usePaginatedList";

const PAGE_SIZE = 9;

/** One page of the meals other users have shared with the current user. */
export function useSharedMeals(): PaginatedList<SharedMeal> {
  return usePaginatedList(api.listSharedMeals, PAGE_SIZE, "Could not load meals shared with you.");
}

/** One page of the meals the current user has shared with other users. */
export function useSentMeals(): PaginatedList<SentMeal> {
  return usePaginatedList(api.listSentMeals, PAGE_SIZE, "Could not load meals you have shared.");
}
