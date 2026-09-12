"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toErrorMessage } from "@/lib/errorMessage";
import type { DailyIntakeSummary } from "@/types/nutrition";

interface UseDailyIntakeResult {
  summary: DailyIntakeSummary | null;
  loading: boolean;
  loadError: string | null;
  reload: () => void;
}

/**
 * One day's totals and the goal they are measured against, in a single request.
 * Omitting `date` asks the API for today in its own timezone.
 */
export function useDailyIntake(date?: string): UseDailyIntakeResult {
  const [summary, setSummary] = useState<DailyIntakeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    setLoading(true);

    try {
      const response = await api.getDailyIntakeSummary(date);
      setSummary(response.data ?? null);
      setLoadError(null);
    } catch (cause) {
      setLoadError(toErrorMessage(cause, "Could not load today's totals."));
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchSummary();
  }, [fetchSummary]);

  return { summary, loading, loadError, reload: fetchSummary };
}
