"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";
import GoalForm from "@/components/goals/GoalForm";
import ErrorState from "@/components/ui/ErrorState";
import PageHeader from "@/components/ui/PageHeader";
import SkeletonRows from "@/components/ui/SkeletonRows";
import { useToast } from "@/components/ui/Toast";
import { useGoal } from "@/hooks/useGoal";
import type { GoalInput } from "@/types/nutrition";

function GoalsContent() {
  const { goal, loading, loadError, saving, saveGoal, reload } = useGoal();
  const toast = useToast();

  async function handleSave(input: GoalInput) {
    await saveGoal(input);
    toast.success("Goal saved successfully.");
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-8">
        <PageHeader
          title="Goals"
          description="Set your daily energy and macronutrient targets."
          hideDescriptionOnMobile
          showBackButton
        />

        {loading && <SkeletonRows count={4} />}
        {!loading && loadError && <ErrorState message={loadError} onRetry={reload} />}
        {!loading && !loadError && <GoalForm goal={goal} saving={saving} onSave={handleSave} />}
      </div>
    </DashboardLayout>
  );
}

export default function GoalsPage() {
  return (
    <ProtectedRoute>
      <GoalsContent />
    </ProtectedRoute>
  );
}
