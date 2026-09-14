"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toErrorMessage } from "@/lib/errorMessage";
import type {
  WeeklyCaloriePoint,
  MacroBreakdownPoint,
  MicroSummaryPoint,
  GoalComparisonPoint,
} from "@/types/nutrition";

interface ReportData {
  weeklyCalories: WeeklyCaloriePoint[];
  macros: MacroBreakdownPoint[];
  micros: MicroSummaryPoint[];
  goalComparison: GoalComparisonPoint[];
}

interface UseReportDataReturn {
  data: ReportData | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

const reportCache = new Map<string, ReportData>();

/**
 * Fetches all four report datasets in parallel for the given date range.
 * Caches previous ranges in memory so switching back to 7, 14, or 30 days is instant.
 */
export function useReportData(
  startDate: string,
  endDate: string,
  macroGroupBy: "day" | "week" = "day"
): UseReportDataReturn {
  const cacheKey = `${startDate}_${endDate}_${macroGroupBy}`;
  const [data, setData] = useState<ReportData | null>(() => reportCache.get(cacheKey) ?? null);
  const [loading, setLoading] = useState(!reportCache.has(cacheKey));
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(
    async (isBackground = false) => {
      if (!isBackground) {
        setLoading(true);
      }
      setError(null);

      try {
        const [wcRes, macroRes, microRes, goalRes] = await Promise.all([
          api.getWeeklyCalories({ startDate, endDate }),
          api.getMacroBreakdown({ startDate, endDate, groupBy: macroGroupBy }),
          api.getMicroSummary({ startDate, endDate }),
          api.getGoalComparison({ startDate, endDate }),
        ]);

        const result: ReportData = {
          weeklyCalories: wcRes.data ?? [],
          macros: macroRes.data ?? [],
          micros: microRes.data ?? [],
          goalComparison: goalRes.data ?? [],
        };

        reportCache.set(cacheKey, result);
        setData(result);
      } catch (err) {
        if (!isBackground) {
          setError(toErrorMessage(err));
        }
      } finally {
        setLoading(false);
      }
    },
    [startDate, endDate, macroGroupBy, cacheKey]
  );

  useEffect(() => {
    const cached = reportCache.get(cacheKey);
    if (cached) {
      setData(cached);
      setLoading(false);
      void fetchAll(true);
    } else {
      void fetchAll(false);
    }
  }, [cacheKey, fetchAll]);

  return { data, loading, error, reload: () => fetchAll(false) };
}
