"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import Pagination from "@/components/ui/Pagination";
import SkeletonRows from "@/components/ui/SkeletonRows";
import { useToast } from "@/components/ui/Toast";
import { useFoodEntries } from "@/hooks/useFoodEntries";
import { useMealFilters } from "@/hooks/useMealFilters";
import { toErrorMessage } from "@/lib/errorMessage";
import type { FoodEntry } from "@/types/nutrition";
import { EmptyPlateIcon } from "@/components/icons";
import FoodEntryList from "./FoodEntryList";
import MealFilters from "./MealFilters";

/** Filters, pages through and edits the current user's logged entries. */
export default function MealsBrowser() {
  const { values, query, isDefault, setStartDate, setEndDate, setMealType, setPage, reset } =
    useMealFilters();
  const { entries, pageMeta, loading, loadError, deletingId, reload, deleteEntry } =
    useFoodEntries(query);
  const [pendingDeletion, setPendingDeletion] = useState<FoodEntry | null>(null);
  const router = useRouter();
  const toast = useToast();

  async function confirmDeletion() {
    if (!pendingDeletion) return;

    const { _id, name } = pendingDeletion;
    // Removing the only row on a trailing page would otherwise strand the user
    // on a page that no longer exists.
    const wasLastOnPage = entries.length === 1 && pageMeta.page > 1;

    try {
      await deleteEntry(_id);
      if (wasLastOnPage) setPage(pageMeta.page - 1);
      toast.success(`${name} deleted.`);
    } catch (cause) {
      toast.error(toErrorMessage(cause, "Could not delete this meal."));
    } finally {
      setPendingDeletion(null);
    }
  }

  return (
    <div className="space-y-4 sm:space-y-8">
      <MealFilters
        values={values}
        isDefault={isDefault}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onMealTypeChange={setMealType}
        onReset={reset}
      />

      {loading && <SkeletonRows count={6} />}

      {!loading && loadError && <ErrorState message={loadError} onRetry={reload} />}

      {!loading && !loadError && entries.length === 0 && (
        <EmptyState
          icon={
            <EmptyPlateIcon className="w-24 h-24 sm:w-44 sm:h-44 lg:w-52 lg:h-52 text-text-secondary/40 dark:text-dark-text-secondary/40" />
          }
          description="No entries match this date range and meal type. Widen the range, or log what you ate."
          action={
            <Link href="/log-meal">
              <Button size="sm" className="sm:px-6 sm:py-3 sm:text-sm">
                Log a meal
              </Button>
            </Link>
          }
        />
      )}

      {!loading && !loadError && entries.length > 0 && (
        <>
          <FoodEntryList
            entries={entries}
            deletingId={deletingId}
            onDelete={setPendingDeletion}
            onRowClick={(entry) => router.push(`/meals/${entry._id}/edit`)}
          />
          <Pagination
            page={pageMeta.page}
            totalPages={pageMeta.totalPages}
            total={pageMeta.total}
            pageSize={entries.length}
            disabled={deletingId !== null}
            onPageChange={setPage}
          />
        </>
      )}

      <ConfirmDialog
        open={pendingDeletion !== null}
        title="Delete entry"
        description={`"${pendingDeletion?.name ?? ""}" will be removed from your log. This cannot be undone.`}
        confirmLabel="Delete"
        working={deletingId !== null}
        onConfirm={confirmDeletion}
        onCancel={() => setPendingDeletion(null)}
      />
    </div>
  );
}
