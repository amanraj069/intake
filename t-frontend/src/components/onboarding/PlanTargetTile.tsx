"use client";

import { formatAmount } from "@/lib/formatNumber";
import type { NutritionMetric, NutritionMetricKey } from "@/lib/nutritionMetrics";

import { colourFor } from "@/lib/metricColours";

interface PlanTargetTileProps {
  metric: NutritionMetric;
  value: number;
}

/** One recommended daily target on its nutrient's tinted surface. */
export default function PlanTargetTile({ metric, value }: PlanTargetTileProps) {
  const colour = colourFor(metric.key as NutritionMetricKey);

  return (
    <div
      className={`rounded-2xl p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md border border-black/10 dark:border-white/10 text-white ${colour.solidBg} dark:${colour.darkSolidBg}`}
    >
      <p className="text-xs font-semibold text-white/90">{metric.label}</p>
      <p className="mt-2 flex items-baseline gap-1">
        <span className="text-2xl font-bold tracking-tight text-white">
          {formatAmount(value)}
        </span>
        <span className="text-xs font-light text-white/70">
          {metric.unit}
        </span>
      </p>
    </div>
  );
}
