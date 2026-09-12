"use client";

import { useToast } from "@/components/ui/Toast";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import GoalForm from "@/components/goals/GoalForm";
import { useGoal } from "@/hooks/useGoal";
import type { GoalInput } from "@/types/nutrition";
import ErrorState from "@/components/ui/ErrorState";
import BackButton from "@/components/ui/BackButton";

function GoalsContent() {
  const { goal, loading, loadError, saving, saveGoal, reload } = useGoal();
  const toast = useToast();

  async function handleSave(input: GoalInput) {
    try {
      await saveGoal(input);
      toast.success("Goal saved successfully.");
    } catch (e: any) {
      // The hook already throws formatted errors
      throw e;
    }
  }

  return (
    <DashboardLayout>
      <div className="w-full max-w-4xl mx-auto space-y-12 pb-24">
        <div className="flex flex-col gap-6">
          <div>
            <div className="flex items-center gap-4">
              <BackButton size="md" className="-ml-2" />
              <h1 className="text-4xl font-extrabold tracking-tighter uppercase text-text-primary dark:text-dark-text">
                Goals
              </h1>
            </div>
            <p className="mt-3 text-sm font-light text-text-secondary dark:text-dark-text-secondary">
              Set your daily energy and macronutrient targets.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="animate-pulse flex space-x-4">
            <div className="flex-1 space-y-6 py-1">
              <div className="h-2 bg-text-secondary/20 rounded"></div>
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-4">
                  <div className="h-2 bg-text-secondary/20 rounded col-span-2"></div>
                  <div className="h-2 bg-text-secondary/20 rounded col-span-1"></div>
                </div>
                <div className="h-2 bg-text-secondary/20 rounded"></div>
              </div>
            </div>
          </div>
        ) : loadError ? (
          <ErrorState message={loadError} onRetry={reload} />
        ) : (
          <GoalForm goal={goal} saving={saving} onSave={handleSave} />
        )}
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
