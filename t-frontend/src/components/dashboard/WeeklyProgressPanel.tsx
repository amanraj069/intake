"use client";

import { useMemo, useState } from "react";
import ErrorState from "@/components/ui/ErrorState";
import OptionPills, { type PillOption } from "@/components/ui/OptionPills";
import SkeletonRows from "@/components/ui/SkeletonRows";
import { useDailyIntakeSeries } from "@/hooks/useDailyIntakeSeries";
import { daysBefore, formatDayAndMonth, formatShortDate, todayAsInputValue } from "@/lib/formatDate";
import { formatAmount } from "@/lib/formatNumber";
import { buildTrendChart, summariseTrend, type TrendBar } from "@/lib/intakeTrend";
import { colourFor } from "@/lib/metricColours";
import {
  NUTRITION_METRICS,
  NUTRITION_METRIC_KEYS,
  targetFor,
  type NutritionMetric,
  type NutritionMetricKey,
} from "@/lib/nutritionMetrics";
import TrendColumns from "./TrendColumns";
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
  selectedBar,
  metric,
  target,
}: {
  rangeLabel: string;
  metricKey: NutritionMetricKey;
  onMetricChange: (key: NutritionMetricKey) => void;
  selectedBar: TrendBar | null;
  metric: NutritionMetric;
  target: number | null;
}) {
  const readoutValue = selectedBar
    ? target !== null && target > 0
      ? `${formatAmount(selectedBar.actual)}/${formatAmount(target)}${metric.unit}`
      : `${formatAmount(selectedBar.actual)}${metric.unit}`
    : null;

  const readoutDate = selectedBar
    ? selectedBar.isToday
      ? "Today"
      : formatShortDate(selectedBar.date)
    : null;

  const isOverTarget = selectedBar?.isOverTarget ?? false;
  const valueColourClass = isOverTarget
    ? `${colourFor(metric.key).text} ${colourFor(metric.key).darkText}`
    : "text-text-primary dark:text-dark-text";

  return (
    <header className="border-b border-border dark:border-dark-border p-4 sm:p-6 sm:px-7">
      <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
        {/* Left / Mobile Title Row */}
        <div className="flex items-start justify-between sm:justify-start w-full sm:w-auto">
          <div>
            <h2 className="text-sm font-extrabold text-text-primary dark:text-dark-text">
              Last {TREND_DAY_COUNT} days
            </h2>
            <p className="mt-0.5 sm:mt-1 text-[11px] font-light text-text-secondary dark:text-dark-text-secondary">
              {rangeLabel}
            </p>
          </div>

          {/* Phone View: Readout at the extreme right of header */}
          {readoutValue && (
            <div className="text-right sm:hidden">
              <p className={`text-sm font-bold ${valueColourClass}`}>
                {readoutValue}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-text-secondary dark:text-dark-text-secondary">
                {readoutDate}
              </p>
            </div>
          )}
        </div>

        {/* Right Controls: Desktop Readout to the left of OptionPills with vertical line divider */}
        <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-5 w-full sm:w-auto">
          {/* Desktop View: Readout to the left of selector */}
          {readoutValue && (
            <div className="hidden sm:block text-right shrink-0">
              <p className={`text-sm font-bold whitespace-nowrap ${valueColourClass}`}>
                {readoutValue}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-text-secondary dark:text-dark-text-secondary whitespace-nowrap">
                {readoutDate}
              </p>
            </div>
          )}

          {/* Small vertical line divider beside the selector in desktop mode */}
          {readoutValue && (
            <div
              className="hidden sm:block h-6 w-px bg-border dark:bg-dark-border shrink-0"
              aria-hidden="true"
            />
          )}

          <OptionPills
            label="Measure to plot"
            options={METRIC_OPTIONS}
            value={metricKey}
            className="w-full sm:w-auto"
            onChange={onMetricChange}
          />
        </div>
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
        selectedBar={selectedBar}
        metric={metric}
        target={target}
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
          <div className="px-2 pt-3 pb-3 sm:px-7 sm:pt-6 sm:pb-8">
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
