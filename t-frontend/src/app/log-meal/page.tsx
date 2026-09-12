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
  const [jsonMode, setJsonMode] = useState(false);
  const toast = useToast();

  async function handleSubmit(input: FoodEntryInput) {
    const created = await createFoodEntry(input);
    setLastEntry(created);
    setFormInstance((current) => current + 1);
    setJsonMode(false);
    toast.success(`${created.foodName} logged.`);
  }

  return (
    <DashboardLayout>
      <div className="w-full max-w-5xl mx-auto space-y-12 pb-24">
        <PageHeader
          title="Log Meal"
          description="Record what you ate, with macros and any micronutrients you track."
          showBackButton
          action={
            <button
              type="button"
              onClick={() => setJsonMode(!jsonMode)}
              className="inline-flex items-center gap-2.5 h-11 px-4 sm:px-5 rounded-xl border border-input-border dark:border-dark-input-border bg-black/[0.03] dark:bg-[#11141D] hover:bg-black/[0.06] dark:hover:bg-[#1A1F2C] text-xs sm:text-sm font-semibold text-text-primary dark:text-dark-text transition-all duration-150 cursor-pointer shadow-sm active:scale-[0.98]"
            >
              {jsonMode ? (
                <>
                  <svg
                    className="w-4 h-4 text-text-secondary dark:text-dark-text-secondary"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                    <path d="M9 12h6" />
                    <path d="M9 16h6" />
                  </svg>
                  <span>Fill the form</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4 text-text-secondary dark:text-dark-text-secondary"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5a2 2 0 0 0 2 2h1" />
                    <path d="M16 21h1a2 2 0 0 0 2-2v-5a2 2 0 0 1 2-2 2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1" />
                  </svg>
                  <span>Fill with JSON</span>
                </>
              )}
            </button>
          }
        />

        {lastEntry && <CreatedEntrySummary entry={lastEntry} />}

        <MealEntryForm
          key={formInstance}
          submitting={submitting}
          submitLabel="Log Meal"
          jsonMode={jsonMode}
          onCloseJsonMode={() => setJsonMode(false)}
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
