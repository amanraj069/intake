"use client";

import type { DailyIntakeSummary } from "@/types/nutrition";

interface DailyProgressStripProps {
  /** Today's intake summary including totals and goal. */
  summary: DailyIntakeSummary | null;
  loading?: boolean;
}

interface ProgressItem {
  label: string;
  current: number;
  target: number | null;
  unit: string;
  color: string;
}

function ProgressCell({ item }: { item: ProgressItem }) {
  const ratio = item.target ? Math.min(1, item.current / item.target) : 0;
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <div className="flex items-baseline justify-between gap-1">
        <span className="text-[10px] font-semibold tracking-wide" style={{ color: item.color }}>
          {item.label}
        </span>
        <span className="text-[10px] text-dark-text-secondary tabular-nums whitespace-nowrap">
          {Math.round(item.current)}{item.unit}
          {item.target != null && (
            <span className="text-dark-text-secondary/60"> / {Math.round(item.target)}{item.unit}</span>
          )}
        </span>
      </div>
      {item.target != null && (
        <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${ratio * 100}%`, backgroundColor: item.color }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Compact strip showing today's calorie + macro progress vs daily goals.
 * Shown inside the MealLogCard so the user sees how a meal moves their totals.
 */
export default function DailyProgressStrip({ summary, loading }: DailyProgressStripProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-dark-border bg-dark-bg-app/60 px-3 py-2.5">
        <p className="text-[10px] text-dark-text-secondary animate-pulse">Loading today's progress…</p>
      </div>
    );
  }

  if (!summary) return null;

  const { totals, goal } = summary;

  const items: ProgressItem[] = [
    {
      label: "Calories",
      current: totals.calories,
      target: goal?.dailyCalorieTarget ?? null,
      unit: " kcal",
      color: "var(--color-dark-calories)",
    },
    {
      label: "Protein",
      current: totals.proteinG,
      target: goal?.proteinTargetG ?? null,
      unit: "g",
      color: "var(--color-dark-protein)",
    },
    {
      label: "Carbs",
      current: totals.carbG,
      target: goal?.carbTargetG ?? null,
      unit: "g",
      color: "var(--color-dark-carbs)",
    },
    {
      label: "Fat",
      current: totals.fatG,
      target: goal?.fatTargetG ?? null,
      unit: "g",
      color: "var(--color-dark-fat)",
    },
  ];

  return (
    <div className="rounded-lg border border-dark-border bg-dark-bg-app/60 px-3 py-2.5 space-y-2">
      <p className="text-[10px] font-bold text-dark-text-secondary tracking-wider uppercase">
        Today&apos;s Progress
      </p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
        {items.map((item) => (
          <ProgressCell key={item.label} item={item} />
        ))}
      </div>
    </div>
  );
}
