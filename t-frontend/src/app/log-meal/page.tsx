"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useToast } from "@/components/ui/Toast";
import PageHeader from "@/components/ui/PageHeader";
import CreatedEntrySummary from "@/components/meals/CreatedEntrySummary";
import JsonModeToggle from "@/components/meals/JsonModeToggle";
import MealEntryForm from "@/components/meals/MealEntryForm";
import { useCreateFoodEntry } from "@/hooks/useCreateFoodEntry";
import { MEAL_TYPES, type FoodEntry, type FoodEntryInput, type MealType } from "@/types/nutrition";

function LogMealContent() {
  const searchParams = useSearchParams();
  const paramMealType = searchParams.get("mealType") as MealType | null;
  const initialMealType = paramMealType && MEAL_TYPES.includes(paramMealType) ? paramMealType : undefined;

  const { submitting, createFoodEntry } = useCreateFoodEntry();
  const [lastEntry, setLastEntry] = useState<FoodEntry | null>(null);
  // Bumping the key clears the form after a successful save without the form
  // needing to expose a reset handle.
  const [formInstance, setFormInstance] = useState(0);
  const [jsonMode, setJsonMode] = useState(false);
  const toast = useToast();

  async function handleSubmit(input: FoodEntryInput) {
    const created = await createFoodEntry(input);
    setLastEntry(created);
    setFormInstance((current) => current + 1);
    setJsonMode(false);
    toast.success(`${created.name} logged.`);
  }

  return (
    <DashboardLayout>
              <MealEntryForm
          key={formInstance}
          submitting={submitting}
          submitLabel="Log Meal"
          defaultMealType={initialMealType}
          jsonMode={jsonMode}
          onCloseJsonMode={() => setJsonMode(false)}
          onSubmit={handleSubmit}
          banner={lastEntry && <CreatedEntrySummary entry={lastEntry} />}
          renderHeader={(dateField) => (
            <PageHeader
              title="Log Meal"
              description="Record what you ate, with macros and any micronutrients you track."
              showBackButton
              action={
                <div className="flex flex-col sm:flex-row sm:items-start gap-2">
                  {dateField}
                  <JsonModeToggle
                    jsonMode={jsonMode}
                    formLabel="Fill the form"
                    jsonLabel="Fill with JSON"
                    onToggle={() => setJsonMode(!jsonMode)}
                  />
                </div>
              }
            />
          )}
        />
      
    </DashboardLayout>
  );
}

export default function LogMealPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<div className="min-h-screen bg-bg-app dark:bg-dark-bg-app" />}>
        <LogMealContent />
      </Suspense>
    </ProtectedRoute>
  );
}
