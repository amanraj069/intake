"use client";

import { formatLongDate } from "@/lib/formatDate";
import { formatAmount, formatWithUnit } from "@/lib/formatNumber";
import type { TrendBar } from "@/lib/intakeTrend";
import { colourFor } from "@/lib/metricColours";
import type { NutritionMetric, NutritionMetricKey } from "@/lib/nutritionMetrics";

interface TrendReadoutProps {
  /** The hovered or tapped day, or null before a day resolves. */
  bar: TrendBar | null;
  metric: NutritionMetric;
  target: number | null;
}

function toEntryLabel(entryCount: number): string {
  if (entryCount === 0) return "Nothing logged";
  return `${entryCount} ${entryCount === 1 ? "entry" : "entries"}`;
}

/**
 * The figures for the day under the pointer. A fixed slot rather than a
 * floating tooltip: it cannot be clipped by the panel edge, it survives touch,
 * and the numbers stay in one place as the reader moves across the week.
 */
export default function TrendReadout({ bar, metric, target }: TrendReadoutProps) {
  if (!bar) return null;

  const isOverTarget = bar.isOverTarget;

  return (
    <div className="flex flex-col gap-3 px-6 pt-6 sm:flex-row sm:items-baseline sm:justify-between sm:px-7">
      <div className="flex items-baseline gap-3">
        <p
          className={`text-2xl font-semibold tracking-tight ${
            isOverTarget
              ? colourFor(metric.key as NutritionMetricKey).text +
                " " +
                colourFor(metric.key as NutritionMetricKey).darkText
              : "text-text-primary dark:text-dark-text"
          }`}
        >
          {formatWithUnit(bar.actual, metric.unit)}
        </p>
        <p className="text-[10px] font-bold   text-text-secondary dark:text-dark-text-secondary">
          {bar.isToday ? "Today" : formatLongDate(bar.date)}
        </p>
      </div>

      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 text-[10px] font-bold   text-text-secondary dark:text-dark-text-secondary">
        <span>
          {bar.percentOfTarget === null
            ? "No target set"
            : `${bar.percentOfTarget}% of ${formatAmount(target ?? 0)}`}
        </span>
        <span>{toEntryLabel(bar.entryCount)}</span>
      </div>
    </div>
  );
}
