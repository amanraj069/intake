"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import SkeletonRows from "@/components/ui/SkeletonRows";
import ErrorState from "@/components/ui/ErrorState";
import ReportDateRange, { type DateRange } from "@/components/reports/ReportDateRange";
import CalorieTrendChart from "@/components/reports/CalorieTrendChart";
import MacroBreakdownChart from "@/components/reports/MacroBreakdownChart";
import MicroSummaryChart from "@/components/reports/MicroSummaryChart";
import { ReportsIcon, LogMealIcon } from "@/components/icons";
import { useReportData } from "@/hooks/useReportData";
import { useGoal } from "@/hooks/useGoal";
import { todayAsInputValue, daysBefore } from "@/lib/formatDate";

function createDefaultRange(): DateRange {
  const today = todayAsInputValue();
  return { startDate: daysBefore(today, 6), endDate: today };
}

export default function ReportsPage() {
  const [range, setRange] = useState<DateRange>(createDefaultRange);
  const [isPending, startTransition] = useTransition();
  const { data, loading, error, reload } = useReportData(range.startDate, range.endDate);
  const { goal } = useGoal();

  const handleRangeChange = (newRange: DateRange) => {
    startTransition(() => {
      setRange(newRange);
    });
  };

  const isInitialLoading = loading && !data;
  const isRefreshing = loading && !!data;

  const hasData = Boolean(
    data &&
      (data.calorieTrend.some((p) => (p.actualCalories ?? 0) > 0) ||
        data.macros.some(
          (m) => (m.proteinG ?? 0) > 0 || (m.carbG ?? 0) > 0 || (m.fatG ?? 0) > 0
        ) ||
        data.micros.some((m) => (m.amount ?? 0) > 0))
  );

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

        {data && !hasData && (
          <div
            className={`transition-opacity duration-200 ${
              isRefreshing || isPending ? "opacity-60 pointer-events-none" : "opacity-100"
            }`}
          >
            <EmptyState
              title="No trends yet"
              description="Log a few days to see patterns and track trends"
              action={
                <Link href="/log-meal">
                  <Button className="px-6 py-3 text-sm font-semibold flex items-center gap-2">
                    <LogMealIcon className="w-4 h-4 shrink-0" />
                    <span>Log Meal</span>
                  </Button>
                </Link>
              }
            />
          </div>
        )}

        {data && hasData && (
          <div
            className={`flex flex-col gap-4 sm:gap-6 lg:gap-10 transition-opacity duration-200 ${
              isRefreshing || isPending ? "opacity-60 pointer-events-none" : "opacity-100"
            }`}
          >
            <CalorieTrendChart
              data={data.calorieTrend}
              activeGoal={goal?.dailyCalorieTarget}
            />
            <MacroBreakdownChart data={data.macros} />
            <MicroSummaryChart data={data.micros} />
          </div>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
