"use client";

import { useMemo, useState } from "react";
import ErrorState from "@/components/ui/ErrorState";
import OptionPills, { type PillOption } from "@/components/ui/OptionPills";
import SkeletonRows from "@/components/ui/SkeletonRows";
import { useDailyIntakeSeries } from "@/hooks/useDailyIntakeSeries";
import { daysBefore, formatDayAndMonth, todayAsInputValue } from "@/lib/formatDate";
import { buildTrendChart, summariseTrend } from "@/lib/intakeTrend";
import {
  NUTRITION_METRICS,
  NUTRITION_METRIC_KEYS,
  targetFor,
  type NutritionMetricKey,
} from "@/lib/nutritionMetrics";
import TrendColumns from "./TrendColumns";
import TrendReadout from "./TrendReadout";
import TrendSummaryRow from "./TrendSummaryRow";

const TREND_DAY_COUNT = 7;

const METRIC_OPTIONS: readonly PillOption<NutritionMetricKey>[] = NUTRITION_METRIC_KEYS.map(
  (key) => ({ value: key, label: NUTRITION_METRICS[key].label })
);

/** The trailing week ending today, in the viewer's own timezone. */
function createTrendRange() {
  const endDate = todayAsInputValue();
  return { startDate: daysBefore(endDate, TREND_DAY_COUNT - 1), endDate };
}

function PanelHeader({
  rangeLabel,
  metricKey,
  onMetricChange,
}: {
  rangeLabel: string;
  metricKey: NutritionMetricKey;
  onMetricChange: (key: NutritionMetricKey) => void;
}) {
  return (
    <header className="flex flex-col gap-5 border-b border-border dark:border-dark-border p-6 sm:flex-row sm:items-center sm:justify-between sm:px-7">
      <div>
        <h2 className="text-sm font-extrabold   text-text-primary dark:text-dark-text">
          Last {TREND_DAY_COUNT} days
        </h2>
        <p className="mt-2 text-[11px] font-light   text-text-secondary dark:text-dark-text-secondary">
          {rangeLabel}
        </p>
      </div>

      <div className="sm:flex sm:justify-end">
        <OptionPills
          label="Measure to plot"
          options={METRIC_OPTIONS}
          value={metricKey}
          onChange={onMetricChange}
        />
      </div>
    </header>
  );
}

/**
 * The week in one view: a column per day against the target line, with the
 * selected day's figures called out above it. Switching measure re-plots the
 * same days rather than loading a different range, so the request is made once.
 */
export default function WeeklyProgressPanel() {
  // Lazy initial state: the range depends on the clock, and this panel only
  // ever renders after auth has resolved on the client, never during hydration.
  const [range] = useState(createTrendRange);
  const [metricKey, setMetricKey] = useState<NutritionMetricKey>("calories");
  const [selectedDate, setSelectedDate] = useState(range.endDate);

  const { series, loading, loadError, reload } = useDailyIntakeSeries(
    range.startDate,
    range.endDate
  );

  const metric = NUTRITION_METRICS[metricKey];
  const target = targetFor(metric, series?.goal ?? null);

  const chart = useMemo(
    () => (series ? buildTrendChart(series.days, metric, target, range.endDate) : null),
    [series, metric, target, range.endDate]
  );

  const rangeLabel = `${formatDayAndMonth(range.startDate)} - ${formatDayAndMonth(range.endDate)}`;
  const selectedBar = chart?.bars.find((bar) => bar.date === selectedDate) ?? null;

  return (
    <section
      aria-label={`Last ${TREND_DAY_COUNT} days`}
      className="bg-bg-card dark:bg-dark-bg-card rounded-2xl shadow-sm"
    >
      <PanelHeader
        rangeLabel={rangeLabel}
        metricKey={metricKey}
        onMetricChange={setMetricKey}
      />

      {loading && (
        <div className="p-6 sm:p-7">
          <SkeletonRows count={3} />
        </div>
      )}

      {!loading && loadError && (
        <div className="p-6 sm:p-7">
          <ErrorState message={loadError} onRetry={reload} />
        </div>
      )}

      {!loading && !loadError && chart && (
        <>
          <TrendReadout bar={selectedBar} metric={metric} target={target} />

          <div className="px-4 pb-8 pt-6 sm:px-7">
            <TrendColumns
              bars={chart.bars}
              targetRatio={chart.targetRatio}
              target={target}
              metric={metric}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
          </div>

          <TrendSummaryRow summary={summariseTrend(chart.bars, target !== null)} metric={metric} />
        </>
      )}
    </section>
  );
}
