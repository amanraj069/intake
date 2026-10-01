"use client";

import ErrorState from "@/components/ui/ErrorState";
import Pagination from "@/components/ui/Pagination";
import SkeletonRows from "@/components/ui/SkeletonRows";
import { useSharedMeals } from "@/hooks/useSharedMeals";
import SharedMealCard from "./SharedMealCard";

function PanelBody() {
  const { sharedMeals, pageMeta, loading, loadError, setPage, reload } = useSharedMeals();

  if (loading) return <SkeletonRows count={2} />;
  if (loadError) return <ErrorState message={loadError} onRetry={reload} />;

  if (sharedMeals.length === 0) {
    return (
      <p className="py-6 text-center text-sm font-light text-text-secondary dark:text-dark-text-secondary">
        No one has shared a meal with you yet.
      </p>
    );
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sharedMeals.map((sharedMeal) => (
          <SharedMealCard key={sharedMeal.id} sharedMeal={sharedMeal} />
        ))}
      </div>
      <Pagination
        page={pageMeta.page}
        totalPages={pageMeta.totalPages}
        total={pageMeta.total}
        pageSize={sharedMeals.length}
        onPageChange={setPage}
      />
    </>
  );
}

/** Meals other people have shared with the current user. */
export default function SharedMealsPanel() {
  return (
    <section aria-labelledby="shared-meals-title" className="bg-bg-card dark:bg-dark-bg-card rounded-2xl shadow-sm">
      <header className="border-b border-border dark:border-dark-border p-4 sm:p-6 sm:px-7">
        <h2 id="shared-meals-title" className="text-sm font-extrabold text-text-primary dark:text-dark-text">
          Shared Meals
        </h2>
        <p className="mt-0.5 sm:mt-1 text-[11px] font-light text-text-secondary dark:text-dark-text-secondary">
          Meals others have shared with you
        </p>
      </header>

      <div className="p-4 sm:p-6 sm:px-7 space-y-4">
        <PanelBody />
      </div>
    </section>
  );
}
