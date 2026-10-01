"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { toErrorMessage } from "@/lib/errorMessage";
import type { PageMeta } from "@/types/nutrition";
import type { SharedMeal } from "@/types/sharedMeal";

const PAGE_SIZE = 6;
const EMPTY_PAGE: PageMeta = { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 };

interface UseSharedMealsResult {
  sharedMeals: SharedMeal[];
  pageMeta: PageMeta;
  loading: boolean;
  loadError: string | null;
  setPage: (page: number) => void;
  reload: () => void;
}

/** One page of the meals other users have shared with the current user. */
export function useSharedMeals(): UseSharedMealsResult {
  const [page, setPage] = useState(1);
  const [sharedMeals, setSharedMeals] = useState<SharedMeal[]>([]);
  const [pageMeta, setPageMeta] = useState<PageMeta>(EMPTY_PAGE);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Paging quickly can resolve requests out of order; only the newest may write state.
  const latestRequestId = useRef(0);

  const fetchSharedMeals = useCallback(async () => {
    const requestId = ++latestRequestId.current;
    const isSuperseded = () => requestId !== latestRequestId.current;
    setLoading(true);

    try {
      const response = await api.listSharedMeals(page, PAGE_SIZE);
      if (isSuperseded()) return;
      setSharedMeals(response.data ?? []);
      setPageMeta({
        page: response.page,
        limit: response.limit,
        total: response.total,
        totalPages: response.totalPages,
      });
      setLoadError(null);
    } catch (cause) {
      if (isSuperseded()) return;
      setLoadError(toErrorMessage(cause, "Could not load meals shared with you."));
    } finally {
      if (!isSuperseded()) setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    // Every state write happens after an await; the lint rule cannot see past the call.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchSharedMeals();
  }, [fetchSharedMeals]);

  return { sharedMeals, pageMeta, loading, loadError, setPage, reload: fetchSharedMeals };
}
