"use client";

import { use, useState } from "react";
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
  const [jsonMode, setJsonMode] = useState(false);

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

        {loading && <SkeletonRows count={5} />}

        {!loading && loadError && <ErrorState message={loadError} onRetry={reload} />}

        {!loading && !loadError && entry && (
          <MealEntryForm
            entry={entry}
            submitting={saving}
            submitLabel="Save Changes"
            jsonMode={jsonMode}
            onCloseJsonMode={() => setJsonMode(false)}
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
