"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toErrorMessage } from "@/lib/errorMessage";
import type { SharedMeal } from "@/types/sharedMeal";

interface UseSharedMealResult {
  sharedMeal: SharedMeal | null;
  loading: boolean;
  loadError: string | null;
  reload: () => void;
}

/** Loads one meal someone shared with the current user, for its read-only detail page. */
export function useSharedMeal(shareId: string): UseSharedMealResult {
  const [sharedMeal, setSharedMeal] = useState<SharedMeal | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchSharedMeal = useCallback(async () => {
    setLoading(true);

    try {
      const response = await api.getSharedMeal(shareId);
      setSharedMeal(response.data ?? null);
      setLoadError(null);
    } catch (cause) {
      setLoadError(toErrorMessage(cause, "Could not load this shared meal."));
    } finally {
      setLoading(false);
    }
  }, [shareId]);

  useEffect(() => {
    // Every state write happens after an await; the lint rule cannot see past the call.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchSharedMeal();
  }, [fetchSharedMeal]);

  return { sharedMeal, loading, loadError, reload: fetchSharedMeal };
}
