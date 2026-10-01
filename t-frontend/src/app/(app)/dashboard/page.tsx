"use client";

import DashboardQuickActions from "@/components/dashboard/DashboardQuickActions";
import TodayOverview from "@/components/dashboard/TodayOverview";
import WeeklyProgressPanel from "@/components/dashboard/WeeklyProgressPanel";

export default function DashboardPage() {
  return (
    <div className="space-y-6 sm:space-y-10">
      <TodayOverview />
      <WeeklyProgressPanel />
      <DashboardQuickActions />
    </div>
  );
}
