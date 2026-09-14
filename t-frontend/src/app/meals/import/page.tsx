"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import FoodDiaryImport from "@/components/meals/import/FoodDiaryImport";
import PageHeader from "@/components/ui/PageHeader";

export default function ImportMealsPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-4 sm:space-y-6">
          <PageHeader
            title="Import Meals"
            description="Bulk log entries from a food diary PDF. Review and edit every row before it is saved."
            hideDescriptionOnMobile
            showBackButton
          />
          <FoodDiaryImport />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
