"use client";

import DataPair from "@/components/ui/DataPair";
import { formatAmount } from "@/lib/formatNumber";
import type { TrendSummary } from "@/lib/intakeTrend";
import type { NutritionMetric } from "@/lib/nutritionMetrics";

interface TrendSummaryRowProps {
  summary: TrendSummary;
  metric: NutritionMetric;
}

export default function TrendSummaryRow({ summary, metric }: TrendSummaryRowProps) {
  const { dailyAverage, total, loggedDayCount, dayCount, onTargetDayCount } = summary;

  const figures = [
    { label: "Average / day", value: `${formatAmount(dailyAverage)} ${metric.unit}` },
    {
      label: "Days on target",
      value: onTargetDayCount === null ? "No goal" : `${onTargetDayCount} / ${dayCount}`,
    },
    { label: "Days logged", value: `${loggedDayCount} / ${dayCount}` },
    { label: `Total ${metric.label}`, value: `${formatAmount(total)} ${metric.unit}` },
  ];

  return (
    <div className="grid grid-cols-2 gap-2.5 px-4 pb-4 sm:gap-4 sm:grid-cols-4 sm:px-7 sm:pb-7">
      {figures.map((figure) => (
        <div
          key={figure.label}
          className="bg-black/[0.03] dark:bg-white/[0.04] border border-black/5 dark:border-white/5 rounded-xl sm:rounded-2xl p-2.5 sm:p-4"
        >
          <DataPair label={figure.label} value={figure.value} />
        </div>
      ))}
    </div>
  );
}
