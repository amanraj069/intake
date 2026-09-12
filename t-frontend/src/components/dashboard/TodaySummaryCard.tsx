"use client";

import Link from "next/link";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import ErrorState from "@/components/ui/ErrorState";
import SkeletonRows from "@/components/ui/SkeletonRows";
import { useDailyIntake } from "@/hooks/useDailyIntake";
import { formatLongDate } from "@/lib/formatDate";
import type { DailyIntakeSummary } from "@/types/nutrition";
import NutrientProgress from "./NutrientProgress";

/** Builds the four meters from one day's summary, pairing each total with its target. */
function toNutrientRows({ totals, goal }: DailyIntakeSummary) {
  return [
    { label: "Calories", unit: "kcal", actual: totals.calories, target: goal?.dailyCalorieTarget ?? null },
    { label: "Protein", unit: "g", actual: totals.proteinG, target: goal?.proteinTargetG ?? null },
    { label: "Carbs", unit: "g", actual: totals.carbG, target: goal?.carbTargetG ?? null },
    { label: "Fat", unit: "g", actual: totals.fatG, target: goal?.fatTargetG ?? null },
  ];
}

function SummaryHeader({ summary }: { summary: DailyIntakeSummary }) {
  const { entryCount } = summary.totals;

  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-primary dark:text-dark-text">
        Today: actual vs target
      </p>
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-secondary dark:text-dark-text-secondary">
        {formatLongDate(summary.date)} - {entryCount} {entryCount === 1 ? "entry" : "entries"}
      </p>
    </div>
  );
}

function SetGoalPrompt() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-black/10 dark:border-white/10 pt-6">
      <p className="text-sm font-light text-text-secondary dark:text-dark-text-secondary">
        Set a daily goal to see how today measures up against it.
      </p>
      <Link href="/goals">
        <Button variant="secondary" size="sm" className="w-full sm:w-auto">
          Set Goal
        </Button>
      </Link>
    </div>
  );
}

/** Today's intake against the user's goal, in a single request. */
export default function TodaySummaryCard() {
  const { summary, loading, loadError, reload } = useDailyIntake();

  if (loading) {
    return (
      <Card className="sm:p-8">
        <SkeletonRows count={3} />
      </Card>
    );
  }

  if (loadError) return <ErrorState message={loadError} onRetry={reload} />;
  if (!summary) return null;

  return (
    <Card className="space-y-8 sm:p-8">
      <SummaryHeader summary={summary} />

      <div className="grid gap-8 grid-cols-2 lg:grid-cols-4">
        {toNutrientRows(summary).map((row) => (
          <NutrientProgress key={row.label} {...row} />
        ))}
      </div>

      {!summary.goal && <SetGoalPrompt />}
    </Card>
  );
}
