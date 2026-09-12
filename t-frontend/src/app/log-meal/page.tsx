"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useToast } from "@/components/ui/Toast";
import PageHeader from "@/components/ui/PageHeader";
import CreatedEntrySummary from "@/components/meals/CreatedEntrySummary";
import MealEntryForm from "@/components/meals/MealEntryForm";
import { useCreateFoodEntry } from "@/hooks/useCreateFoodEntry";
import type { FoodEntry, FoodEntryInput } from "@/types/nutrition";

function LogMealContent() {
  const { submitting, createFoodEntry } = useCreateFoodEntry();
  const [lastEntry, setLastEntry] = useState<FoodEntry | null>(null);
  // Bumping the key clears the form after a successful save without the form
  // needing to expose a reset handle.
  const [formInstance, setFormInstance] = useState(0);
  const toast = useToast();

  async function handleSubmit(input: FoodEntryInput) {
    const created = await createFoodEntry(input);
    setLastEntry(created);
    setFormInstance((current) => current + 1);
    toast.success(`${created.foodName} logged.`);
  }

  return (
    <DashboardLayout>
      <div className="w-full max-w-5xl mx-auto space-y-12 pb-24">
        <PageHeader
          title="Log Meal"
          description="Record what you ate, with macros and any micronutrients you track."
          showBackButton
        />

        {lastEntry && <CreatedEntrySummary entry={lastEntry} />}

        <MealEntryForm
          key={formInstance}
          submitting={submitting}
          submitLabel="Log Meal"
          onSubmit={handleSubmit}
        />
      </div>
    </DashboardLayout>
  );
}

export default function LogMealPage() {
  return (
    <ProtectedRoute>
      <LogMealContent />
    </ProtectedRoute>
  );
}
