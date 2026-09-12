"use client";

import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useToast } from "@/components/ui/Toast";
import CreatedEntrySummary from "@/components/meals/CreatedEntrySummary";
import MealEntryForm from "@/components/meals/MealEntryForm";
import { useCreateFoodEntry } from "@/hooks/useCreateFoodEntry";
import type { FoodEntry, FoodEntryInput } from "@/types/nutrition";
import BackButton from "@/components/ui/BackButton";

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
      <div className="w-full max-w-4xl mx-auto space-y-12 pb-24">
        <div className="flex flex-col gap-6">
          <div>
            <div className="flex items-center gap-4">
              <BackButton size="md" className="-ml-2" />
              <h1 className="text-4xl font-extrabold tracking-tighter uppercase text-text-primary dark:text-dark-text">
                Log Meal
              </h1>
            </div>
            <p className="mt-3 text-sm font-light text-text-secondary dark:text-dark-text-secondary">
              Record what you ate, with macros and any micronutrients you track.
            </p>
          </div>
        </div>

        {lastEntry && <CreatedEntrySummary entry={lastEntry} />}

        <MealEntryForm key={formInstance} submitting={submitting} onSubmit={handleSubmit} />
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
