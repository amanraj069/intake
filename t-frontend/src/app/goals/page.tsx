"use client";

import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";
import GoalForm from "@/components/goals/GoalForm";
import Button from "@/components/ui/Button";
import ErrorState from "@/components/ui/ErrorState";
import PageHeader from "@/components/ui/PageHeader";
import SkeletonRows from "@/components/ui/SkeletonRows";
import { useToast } from "@/components/ui/Toast";
import { RefreshIcon } from "@/components/icons";
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
          alignActionWithTitle
          action={
            <Link href="/onboarding">
              <Button
                variant="secondary"
                className="px-6 py-3 text-sm font-semibold rounded-xl shadow-2xs inline-flex items-center gap-2 shrink-0"
              >
                <RefreshIcon className="h-4 w-4 shrink-0" />
                <span>Recalculate</span>
              </Button>
            </Link>
          }
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
