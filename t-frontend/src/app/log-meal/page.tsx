"use client";

import { useState, useEffect, Suspense } from "react";
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
  const [formInstance, setFormInstance] = useState(0);
  const [jsonMode, setJsonMode] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (lastEntry) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [lastEntry]);

  async function handleSubmit(input: FoodEntryInput, photoFile?: File | null) {
    const created = await createFoodEntry(input, photoFile);
    setLastEntry(created);
    setFormInstance((current) => current + 1);
    setJsonMode(false);
    toast.success(`${created.name} logged.`);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
              hideDescriptionOnMobile
              stackOnMobile
              action={
                <div className="grid grid-cols-2 sm:flex sm:flex-row sm:items-start gap-2 w-full sm:w-auto">
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
