"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toErrorMessage } from "@/lib/errorMessage";
import type { FoodEntry, FoodEntryQuery, PageMeta } from "@/types/nutrition";

const EMPTY_PAGE: PageMeta = { page: 1, limit: 20, total: 0, totalPages: 1 };

interface UseFoodEntriesResult {
  entries: FoodEntry[];
  pageMeta: PageMeta;
  loading: boolean;
  loadError: string | null;
  deletingId: string | null;
  reload: () => void;
  deleteEntry: (id: string) => Promise<void>;
}

/**
 * Loads one page of food entries for the given query and keeps it in step with
 * it: any change to the filters or page refetches. Deleting reloads the page so
 * the totals and page count stay truthful rather than drifting locally.
 */
export function useFoodEntries(query: FoodEntryQuery): UseFoodEntriesResult {
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [pageMeta, setPageMeta] = useState<PageMeta>(EMPTY_PAGE);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { startDate, endDate, mealType, page, limit } = query;

  const fetchEntries = useCallback(async () => {
    setLoading(true);

    try {
      const response = await api.listFoodEntries({ startDate, endDate, mealType, page, limit });
      setEntries(response.data ?? []);
      setPageMeta({
        page: response.page,
        limit: response.limit,
        total: response.total,
        totalPages: response.totalPages,
      });
      setLoadError(null);
    } catch (cause) {
      setLoadError(toErrorMessage(cause, "Could not load your meals."));
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, mealType, page, limit]);

  useEffect(() => {
    // Fetching whenever the query changes is the point of this hook, and every
    // state write happens after an await. The lint rule cannot see past the call.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchEntries();
  }, [fetchEntries]);

  const deleteEntry = useCallback(
    async (id: string) => {
      setDeletingId(id);

      try {
        await api.deleteFoodEntry(id);
        await fetchEntries();
      } finally {
        setDeletingId(null);
      }
    },
    [fetchEntries]
  );

  return { entries, pageMeta, loading, loadError, deletingId, reload: fetchEntries, deleteEntry };
}
