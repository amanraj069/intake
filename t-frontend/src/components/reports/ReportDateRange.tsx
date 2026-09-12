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
  "bg-white dark:bg-[#252A36] border border-black/10 dark:border-white/15 rounded-lg px-2.5 py-1 text-xs font-semibold text-text-primary dark:text-white shadow-sm dark:shadow-[0_2px_8px_rgba(0,0,0,0.5)] focus:outline-none focus:ring-1 focus:ring-accent [color-scheme:light] dark:[color-scheme:dark] cursor-pointer hover:border-black/20 dark:hover:border-white/30 transition-colors [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60 hover:[&::-webkit-calendar-picker-indicator]:opacity-100";

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
    <div className="flex flex-col items-start sm:items-end gap-2.5">
      {activeTab === "custom" && (
        <div className="flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-xl border border-input-border dark:border-dark-input-border bg-black/[0.03] dark:bg-[#11141D] shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)] dark:shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)] animate-in fade-in slide-in-from-bottom-1 duration-200">
          <input
            type="date"
            aria-label="Start date"
            value={value.startDate}
            max={value.endDate || undefined}
            onChange={(e) => onChange({ ...value, startDate: e.target.value })}
            className={DATE_INPUT_CLASSES}
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
            className={DATE_INPUT_CLASSES}
          />
        </div>
      )}

      <OptionPills
        label="Date range"
        options={RANGE_OPTIONS}
        value={activeTab}
        onChange={handleTabChange}
      />
    </div>
  );
}
