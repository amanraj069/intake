"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toErrorMessage } from "@/lib/errorMessage";
import type { DailyIntakeSeries } from "@/types/nutrition";

interface UseDailyIntakeSeriesResult {
  series: DailyIntakeSeries | null;
  loading: boolean;
  loadError: string | null;
  reload: () => void;
}

/**
 * Day-by-day totals across an inclusive range, with the goal they are measured
 * against. The API fills in days with no entries, so the result always has one
 * point per calendar day in the range.
 */
export function useDailyIntakeSeries(
  startDate: string,
  endDate: string
): UseDailyIntakeSeriesResult {
  const [series, setSeries] = useState<DailyIntakeSeries | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchSeries = useCallback(async () => {
    setLoading(true);

    try {
      const response = await api.getDailyIntakeSeries(startDate, endDate);
      setSeries(response.data ?? null);
      setLoadError(null);
    } catch (cause) {
      setLoadError(toErrorMessage(cause, "Could not load your recent days."));
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    // Fetching whenever the range changes is the point of this hook, and every
    // state write happens after an await. The lint rule cannot see past the call.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchSeries();
  }, [fetchSeries]);

  return { series, loading, loadError, reload: fetchSeries };
}
