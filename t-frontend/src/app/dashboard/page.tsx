"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardQuickActions from "@/components/dashboard/DashboardQuickActions";
import TodayOverview from "@/components/dashboard/TodayOverview";
import WeeklyProgressPanel from "@/components/dashboard/WeeklyProgressPanel";

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
                  <TodayOverview />
          <WeeklyProgressPanel />
          <DashboardQuickActions />
        
      </DashboardLayout>
    </ProtectedRoute>
  );
}
