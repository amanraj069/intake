"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import MealEntryForm from "@/components/meals/MealEntryForm";
import ErrorState from "@/components/ui/ErrorState";
import PageHeader from "@/components/ui/PageHeader";
import SkeletonRows from "@/components/ui/SkeletonRows";
import { useToast } from "@/components/ui/Toast";
import { useFoodEntry } from "@/hooks/useFoodEntry";
import type { FoodEntryInput } from "@/types/nutrition";

function EditMealContent({ entryId }: { entryId: string }) {
  const { entry, loading, loadError, saving, reload, updateEntry } = useFoodEntry(entryId);
  const router = useRouter();
  const toast = useToast();

  async function handleSubmit(input: FoodEntryInput) {
    const updated = await updateEntry(input);
    toast.success(`${updated.foodName} updated.`);
    router.push("/meals");
  }

  return (
    <DashboardLayout>
      <div className="w-full max-w-5xl mx-auto space-y-12 pb-24">
        <PageHeader
          title="Edit Meal"
          description="Change what was logged, or correct the amounts."
          showBackButton
        />

        {loading && <SkeletonRows count={5} />}

        {!loading && loadError && <ErrorState message={loadError} onRetry={reload} />}

        {!loading && !loadError && entry && (
          <MealEntryForm
            entry={entry}
            submitting={saving}
            submitLabel="Save Changes"
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

export default function EditMealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <ProtectedRoute>
      <EditMealContent entryId={id} />
    </ProtectedRoute>
  );
}
