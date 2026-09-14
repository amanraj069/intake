"use client";

import { useState, useTransition } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import PageHeader from "@/components/ui/PageHeader";
import SkeletonRows from "@/components/ui/SkeletonRows";
import ErrorState from "@/components/ui/ErrorState";
import ReportDateRange, { type DateRange } from "@/components/reports/ReportDateRange";
import CalorieTrendChart from "@/components/reports/CalorieTrendChart";
import MacroBreakdownChart from "@/components/reports/MacroBreakdownChart";
import MicroSummaryChart from "@/components/reports/MicroSummaryChart";
import GoalComparisonChart from "@/components/reports/GoalComparisonChart";
import { useReportData } from "@/hooks/useReportData";
import { todayAsInputValue, daysBefore } from "@/lib/formatDate";

function createDefaultRange(): DateRange {
  const today = todayAsInputValue();
  return { startDate: daysBefore(today, 6), endDate: today };
}

export default function ReportsPage() {
  const [range, setRange] = useState<DateRange>(createDefaultRange);
  const [isPending, startTransition] = useTransition();
  const { data, loading, error, reload } = useReportData(range.startDate, range.endDate);

  const handleRangeChange = (newRange: DateRange) => {
    startTransition(() => {
      setRange(newRange);
    });
  };

  const isInitialLoading = loading && !data;
  const isRefreshing = loading && !!data;

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <PageHeader
          eyebrow="Analytics"
          title="Reports"
          description="Track your nutrition trends and progress over time."
          hideDescriptionOnMobile
          stackOnMobile
          action={<ReportDateRange value={range} onChange={handleRangeChange} />}
        />

        {isInitialLoading && (
          <div className="bg-bg-card dark:bg-dark-bg-card rounded-2xl shadow-sm p-4 sm:p-8">
            <SkeletonRows count={6} />
          </div>
        )}

        {!loading && error && !data && <ErrorState message={error} onRetry={reload} />}

        {data && (
          <div
            className={`grid gap-4 sm:gap-6 lg:gap-10 lg:grid-cols-2 transition-opacity duration-200 ${
              isRefreshing || isPending ? "opacity-60 pointer-events-none" : "opacity-100"
            }`}
          >
            <div className="lg:col-span-2">
              <CalorieTrendChart data={data.weeklyCalories} />
            </div>
            <div className="lg:col-span-2">
              <MacroBreakdownChart data={data.macros} />
            </div>
            <GoalComparisonChart data={data.goalComparison} />
            <MicroSummaryChart data={data.micros} />
          </div>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
