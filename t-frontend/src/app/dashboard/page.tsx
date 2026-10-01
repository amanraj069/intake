"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardQuickActions from "@/components/dashboard/DashboardQuickActions";
import TodayOverview from "@/components/dashboard/TodayOverview";
import WeeklyProgressPanel from "@/components/dashboard/WeeklyProgressPanel";
import SharedMealsPanel from "@/components/dashboard/SharedMealsPanel";

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6 sm:space-y-10">
          <TodayOverview />
          <WeeklyProgressPanel />
          <SharedMealsPanel />
          <DashboardQuickActions />
        </div>
        
      </DashboardLayout>
    </ProtectedRoute>
  );
}
