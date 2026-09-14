"use client";

import { useState } from "react";
import OptionPills, { type PillOption } from "@/components/ui/OptionPills";
import { todayAsInputValue, daysBefore } from "@/lib/formatDate";

export interface DateRange {
  startDate: string;
  endDate: string;
}

interface ReportDateRangeProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

type RangePreset = "7" | "14" | "30" | "custom";

const RANGE_OPTIONS: readonly PillOption<RangePreset>[] = [
  { value: "7", label: "7 days" },
  { value: "14", label: "14 days" },
  { value: "30", label: "30 days" },
  { value: "custom", label: "Custom" },
];

function detectPreset(range: DateRange): RangePreset {
  const today = todayAsInputValue();
  if (range.endDate === today) {
    if (range.startDate === daysBefore(today, 6)) return "7";
    if (range.startDate === daysBefore(today, 13)) return "14";
    if (range.startDate === daysBefore(today, 29)) return "30";
  }
  return "custom";
}

const DATE_INPUT_CLASSES =
  "calendar-icon-white bg-accent-muted dark:bg-accent-dark-muted border border-black/5 dark:border-white/10 rounded-lg px-2.5 py-1 text-xs font-bold text-white shadow-sm transition-colors [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/20 cursor-pointer hover:brightness-110";

/** Date range selector with sliding OptionPills and collapsible custom date inputs. */
export default function ReportDateRange({ value, onChange }: ReportDateRangeProps) {
  const [isCustomMode, setIsCustomMode] = useState(false);

  const detected = detectPreset(value);
  const activeTab: RangePreset = isCustomMode ? "custom" : detected;

  function handleTabChange(nextTab: RangePreset) {
    const today = todayAsInputValue();

    if (nextTab === "custom") {
      setIsCustomMode(true);
      return;
    }

    setIsCustomMode(false);
    if (nextTab === "7") {
      onChange({ startDate: daysBefore(today, 6), endDate: today });
    } else if (nextTab === "14") {
      onChange({ startDate: daysBefore(today, 13), endDate: today });
    } else if (nextTab === "30") {
      onChange({ startDate: daysBefore(today, 29), endDate: today });
    }
  }

  return (
    <div className="flex flex-col sm:flex-col-reverse items-start sm:items-end gap-2 w-full sm:w-auto">
      <OptionPills
        label="Date range"
        options={RANGE_OPTIONS}
        value={activeTab}
        className="w-full sm:w-auto"
        onChange={handleTabChange}
      />

      {activeTab === "custom" && (
        <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl border border-border dark:border-dark-border bg-bg-card dark:bg-dark-bg-card shadow-2xs animate-in fade-in slide-in-from-top-2 sm:slide-in-from-bottom-2 duration-200 w-full sm:w-auto">
          <input
            type="date"
            aria-label="Start date"
            value={value.startDate}
            max={value.endDate || undefined}
            onChange={(e) => onChange({ ...value, startDate: e.target.value })}
            className={`${DATE_INPUT_CLASSES} flex-1 sm:flex-initial text-center`}
          />
          <span className="text-xs text-text-secondary dark:text-dark-text-secondary font-medium select-none px-0.5">
            to
          </span>
          <input
            type="date"
            aria-label="End date"
            value={value.endDate}
            min={value.startDate || undefined}
            max={todayAsInputValue()}
            onChange={(e) => onChange({ ...value, endDate: e.target.value })}
            className={`${DATE_INPUT_CLASSES} flex-1 sm:flex-initial text-center`}
          />
        </div>
      )}
    </div>
  );
}
