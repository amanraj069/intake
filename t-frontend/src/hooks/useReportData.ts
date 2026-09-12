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

/**
 * Fetches all four report datasets in parallel for the given date range.
 * Re-fetches when the range changes.
 */
export function useReportData(
  startDate: string,
  endDate: string,
  macroGroupBy: "day" | "week" = "day"
): UseReportDataReturn {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [wcRes, macroRes, microRes, goalRes] = await Promise.all([
        api.getWeeklyCalories({ startDate, endDate }),
        api.getMacroBreakdown({ startDate, endDate, groupBy: macroGroupBy }),
        api.getMicroSummary({ startDate, endDate }),
        api.getGoalComparison({ startDate, endDate }),
      ]);

      setData({
        weeklyCalories: wcRes.data ?? [],
        macros: macroRes.data ?? [],
        micros: microRes.data ?? [],
        goalComparison: goalRes.data ?? [],
      });
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, macroGroupBy]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { data, loading, error, reload: fetchAll };
}
