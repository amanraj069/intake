"use client";

import { use, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import JsonModeToggle from "@/components/meals/JsonModeToggle";
import MealEntryForm from "@/components/meals/MealEntryForm";
import AiLoggedNotice from "@/components/meals/photo/AiLoggedNotice";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import ErrorState from "@/components/ui/ErrorState";
import PageHeader from "@/components/ui/PageHeader";
import SkeletonRows from "@/components/ui/SkeletonRows";
import { useToast } from "@/components/ui/Toast";
import { TrashIcon } from "@/components/icons";
import { useFoodEntry } from "@/hooks/useFoodEntry";
import { api } from "@/lib/api";
import { toErrorMessage } from "@/lib/errorMessage";
import type { FoodEntryInput } from "@/types/nutrition";

function EditMealContent({ entryId }: { entryId: string }) {
  const { entry, loading, loadError, saving, reload, updateEntry } = useFoodEntry(entryId);
  const router = useRouter();
  const toast = useToast();
  const [jsonMode, setJsonMode] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pendingDeletion, setPendingDeletion] = useState(false);

  async function handleConfirmDelete() {
    setDeleting(true);
    try {
      await api.deleteFoodEntry(entryId);
      toast.success(`${entry?.name ?? "Meal"} deleted.`);
      router.push("/meals");
    } catch (error) {
      toast.error(toErrorMessage(error, "Could not delete this meal."));
      setDeleting(false);
      setPendingDeletion(false);
    }
  }

  async function handleSubmit(input: FoodEntryInput) {
    const updated = await updateEntry(input);
    toast.success(`${updated.name} updated.`);
    router.push("/meals");
  }

  /** The date field only exists once the entry has loaded and the form owns it. */
  function renderHeader(dateField?: ReactNode) {
    return (
      <PageHeader
        title="Edit Meal"
        description="Change what was logged, or correct the amounts."
        showBackButton
        hideDescriptionOnMobile
        stackOnMobile
        action={
          <div className="grid grid-cols-[1fr_auto_auto] sm:flex sm:flex-row sm:items-start gap-2 w-full sm:w-auto">
            {dateField}
            <JsonModeToggle
              jsonMode={jsonMode}
              formLabel="Form"
              jsonLabel="JSON"
              onToggle={() => setJsonMode(!jsonMode)}
            />
            <button
              type="button"
              onClick={() => setPendingDeletion(true)}
              aria-label="Delete entry"
              className="inline-flex items-center justify-center gap-2 h-11 px-3 sm:px-5 rounded-xl border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-xs sm:text-sm font-semibold text-red-600 dark:text-red-400 transition-all duration-150 cursor-pointer shadow-sm active:scale-[0.98]"
            >
              <TrashIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Delete</span>
            </button>
          </div>
        }
      />
    );
  }

  return (
    <DashboardLayout>
              {(loading || loadError || !entry) && renderHeader()}

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
            renderHeader={renderHeader}
            banner={entry.source === "ai-image" ? <AiLoggedNotice entry={entry} /> : undefined}
          />
        )}

        <ConfirmDialog
          open={pendingDeletion}
          title="Delete entry"
          description={`"${entry?.name ?? "This meal"}" will be removed from your log. This cannot be undone.`}
          confirmLabel="Delete"
          working={deleting}
          onConfirm={handleConfirmDelete}
          onCancel={() => setPendingDeletion(false)}
        />
      
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
