import { request } from "./apiClient";
import { toQueryString } from "./queryString";
import type {
  MacroBreakdownPoint,
  MicroSummaryPoint,
  GoalComparisonPoint,
} from "@/types/nutrition";

interface ReportQuery {
  startDate?: string;
  endDate?: string;
}

interface MacrosQuery extends ReportQuery {
  groupBy?: "day" | "week";
}

export const reportsApi = {
  getMacroBreakdown: (query: MacrosQuery = {}) =>
    request<MacroBreakdownPoint[]>(
      `/api/reports/macros${toQueryString({ ...query })}`
    ),

  getMicroSummary: (query: ReportQuery = {}) =>
    request<MicroSummaryPoint[]>(
      `/api/reports/micros${toQueryString({ ...query })}`
    ),

  getGoalComparison: (query: ReportQuery = {}) =>
    request<GoalComparisonPoint[]>(
      `/api/reports/goal-comparison${toQueryString({ ...query })}`
    ),
};
