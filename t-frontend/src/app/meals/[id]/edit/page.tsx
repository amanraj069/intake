"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import MealEntryForm from "@/components/meals/MealEntryForm";
import ErrorState from "@/components/ui/ErrorState";
import PageHeader from "@/components/ui/PageHeader";
import SkeletonRows from "@/components/ui/SkeletonRows";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { useFoodEntry } from "@/hooks/useFoodEntry";
import { api } from "@/lib/api";
import { toErrorMessage } from "@/lib/errorMessage";
import type { FoodEntryInput, ConfidenceLevel } from "@/types/nutrition";
import { TrashIcon } from "@/components/icons";
import { ConfidenceTrigger, ConfidenceDetails } from "@/components/meals/photo/ConfidenceBreakdown";

const LEVEL_LABELS: Record<ConfidenceLevel, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

function EditMealContent({ entryId }: { entryId: string }) {
  const { entry, loading, loadError, saving, reload, updateEntry } = useFoodEntry(entryId);
  const router = useRouter();
  const toast = useToast();
  const [jsonMode, setJsonMode] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pendingDeletion, setPendingDeletion] = useState(false);
  const [showConfidenceBreakdown, setShowConfidenceBreakdown] = useState(false);

  async function handleConfirmDelete() {
    setDeleting(true);
    try {
      await api.deleteFoodEntry(entryId);
      toast.success(`${entry?.foodName ?? "Meal"} deleted.`);
      router.push("/meals");
    } catch (error) {
      toast.error(toErrorMessage(error, "Could not delete this meal."));
      setDeleting(false);
      setPendingDeletion(false);
    }
  }

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
            <div className="flex items-center gap-2">
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
                    <span>Update with form</span>
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
                    <span>Update with JSON</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setPendingDeletion(true)}
                className="inline-flex items-center gap-2.5 h-11 px-4 sm:px-5 rounded-xl border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-xs sm:text-sm font-semibold text-red-600 dark:text-red-400 transition-all duration-150 cursor-pointer shadow-sm active:scale-[0.98]"
              >
                <TrashIcon className="w-4 h-4" />
                <span>Delete</span>
              </button>
            </div>
          }
        />

        {loading && <SkeletonRows count={5} />}

        {!loading && loadError && <ErrorState message={loadError} onRetry={reload} />}

        {!loading && !loadError && entry && (
          <>
            {entry.source === "ai-image" && (
              <div className="bg-bg-app dark:bg-dark-bg-app rounded-xl p-4 sm:p-5 space-y-1 border border-border dark:border-dark-border">
                <p className="text-xs font-bold tracking-wider text-text-secondary dark:text-dark-text-secondary uppercase mb-2">
                  Logged via AI
                </p>
                {entry.extractionAnalysis ? (
                  <div>
                    <ConfidenceTrigger
                      confidence={entry.extractionAnalysis.confidence}
                      open={showConfidenceBreakdown}
                      onToggle={() => setShowConfidenceBreakdown(!showConfidenceBreakdown)}
                    />
                    {showConfidenceBreakdown && (
                      <div className="mt-4">
                        <ConfidenceDetails confidence={entry.extractionAnalysis.confidence} />
                      </div>
                    )}
                    {entry.extractionAnalysis.notes && (
                      <p className="mt-4 text-sm font-light leading-relaxed text-text-secondary dark:text-dark-text-secondary border-t border-black/5 dark:border-white/10 pt-4">
                        <span className="font-semibold text-text-primary dark:text-dark-text mr-1">Note:</span>
                        {entry.extractionAnalysis.notes}
                      </p>
                    )}
                  </div>
                ) : entry.confidenceLevel && entry.confidenceScore !== undefined ? (
                  <p className="text-sm text-text-primary dark:text-dark-text">
                    <span className="font-bold">{entry.confidenceScore}%</span>
                    <span className="font-light text-text-secondary dark:text-dark-text-secondary">
                      {" "}
                      confidence · {LEVEL_LABELS[entry.confidenceLevel]}
                    </span>
                  </p>
                ) : (
                  <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
                    Confidence details unavailable.
                  </p>
                )}
              </div>
            )}
            <MealEntryForm
              entry={entry}
              submitting={saving}
              submitLabel="Save Changes"
              jsonMode={jsonMode}
              onCloseJsonMode={() => setJsonMode(false)}
              onSubmit={handleSubmit}
            />
          </>
        )}

        <ConfirmDialog
          open={pendingDeletion}
          title="Delete entry"
          description={`"${entry?.foodName ?? "This meal"}" will be removed from your log. This cannot be undone.`}
          confirmLabel="Delete"
          working={deleting}
          onConfirm={handleConfirmDelete}
          onCancel={() => setPendingDeletion(false)}
        />
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
