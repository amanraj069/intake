"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import PageHeader from "@/components/ui/PageHeader";
import SkeletonRows from "@/components/ui/SkeletonRows";
import ErrorState from "@/components/ui/ErrorState";
import ReportDateRange from "@/components/reports/ReportDateRange";
import CalorieTrendChart from "@/components/reports/CalorieTrendChart";
import MacroBreakdownChart from "@/components/reports/MacroBreakdownChart";
import MicroSummaryChart from "@/components/reports/MicroSummaryChart";
import GoalComparisonChart from "@/components/reports/GoalComparisonChart";
import { useReportData } from "@/hooks/useReportData";
import { todayAsInputValue, daysBefore } from "@/lib/formatDate";

function createDefaultRange() {
  const today = todayAsInputValue();
  return { startDate: daysBefore(today, 6), endDate: today };
}

export default function ReportsPage() {
  const [range, setRange] = useState(createDefaultRange);
  const { data, loading, error, reload } = useReportData(range.startDate, range.endDate);

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="w-full max-w-6xl mx-auto space-y-10 sm:space-y-12 pb-24">
          <PageHeader
            eyebrow="Analytics"
            title="Reports"
            description="Track your nutrition trends and progress over time."
            action={<ReportDateRange value={range} onChange={setRange} />}
          />

          {loading && (
            <div className="bg-bg-card dark:bg-dark-bg-card rounded-2xl shadow-sm p-6 sm:p-8">
              <SkeletonRows count={6} />
            </div>
          )}

          {!loading && error && <ErrorState message={error} onRetry={reload} />}

          {!loading && !error && data && (
            <div className="grid gap-10 sm:gap-12 lg:grid-cols-2">
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
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
