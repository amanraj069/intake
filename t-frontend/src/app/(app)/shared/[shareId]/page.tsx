"use client";

import { use, useEffect } from "react";
import SharedMealDetail from "@/components/shared/SharedMealDetail";
import ErrorState from "@/components/ui/ErrorState";
import PageHeader from "@/components/ui/PageHeader";
import SkeletonRows from "@/components/ui/SkeletonRows";
import { useUnseenShares } from "@/contexts/UnseenSharesContext";
import { useSharedMeal } from "@/hooks/useSharedMeal";

export default function SharedMealPage({ params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = use(params);
  const { sharedMeal, loading, loadError, reload } = useSharedMeal(shareId);
  const { markSeen } = useUnseenShares();

  // Opening a share straight from a link counts as seeing it, as the list does.
  useEffect(() => {
    if (sharedMeal && !sharedMeal.seen) void markSeen([sharedMeal.id]);
  }, [sharedMeal, markSeen]);

  return (
    <div className="space-y-3 sm:space-y-6">
      <PageHeader
        title={sharedMeal?.meal.name ?? "Shared meal"}
        showBackButton
        wrapTitle
      />
      {loading && <SkeletonRows count={5} />}
      {!loading && loadError && <ErrorState message={loadError} onRetry={reload} />}
      {!loading && !loadError && sharedMeal && <SharedMealDetail sharedMeal={sharedMeal} />}
    </div>
  );
}
