"use client";

import FieldLabel from "@/components/ui/FieldLabel";
import Meter from "@/components/ui/Meter";
import { formatAmount } from "@/lib/formatNumber";
import { colourFor } from "@/lib/metricColours";
import { toPercentOfTarget, type NutritionMetric, type NutritionMetricKey } from "@/lib/nutritionMetrics";

interface MacroTileProps {
  metric: NutritionMetric;
  actual: number;
  /** Null when no goal has been set, so only the actual amount is meaningful. */
  target: number | null;
}

/** One macro as a label-value pair with its rail, sized for a panel cell. */
export default function MacroTile({ metric, actual, target }: MacroTileProps) {
  const percent = toPercentOfTarget(actual, target);
  const colour = colourFor(metric.key as NutritionMetricKey);

  return (
    <div className={`p-4 sm:p-5 rounded-2xl shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1 cursor-default text-white ${colour.solidBg} dark:${colour.darkSolidBg}`}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 bg-white/70 rounded-full"
            aria-hidden="true"
          />
          <span className="text-[10px] font-bold   text-white/90">
            {metric.label}
          </span>
        </span>
        <p className="mt-1 flex items-baseline gap-1.5">
          <span className="text-xl sm:text-2xl font-semibold tracking-tight text-white">
            {formatAmount(actual)}
          </span>
          <span className="text-xs font-light text-white/70">
            {target === null ? metric.unit : `/ ${formatAmount(target)} ${metric.unit}`}
          </span>
        </p>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <div className="flex-1">
          <Meter
            percent={percent}
            colourClass="bg-white dark:bg-white"
            ariaLabel={
              percent === null
                ? `${metric.label}: ${formatAmount(actual)} ${metric.unit}, no target set`
                : `${metric.label}: ${percent}% of target`
            }
          />
        </div>
        <span className="text-[10px] font-bold w-10 text-right   text-white/90">
          {percent === null ? "—" : `${percent}%`}
        </span>
      </div>
    </div>
  );
}

