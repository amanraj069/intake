"use client";

import { type ReactNode } from "react";
import FieldLabel from "./FieldLabel";

interface DateRangeFieldProps {
  label: string;
  startDate: string;
  endDate: string;
  disabled?: boolean;
  rightElement?: ReactNode;
  onStartDateChange: (startDate: string) => void;
  onEndDateChange: (endDate: string) => void;
}

const DATE_INPUT_CLASSES = [
  "w-full min-w-0 bg-transparent border-0 p-0 text-[11px] sm:text-xs font-medium cursor-pointer outline-none",
  "text-text-primary dark:text-dark-text dark:[color-scheme:dark]",
  "disabled:cursor-not-allowed disabled:opacity-40",
  // The native picker button is decoration here: it only earns full contrast on hover.
  "[&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60 hover:[&::-webkit-calendar-picker-indicator]:opacity-100",
].join(" ");

/**
 * Both bounds of a date range on one line, so a filter that carries two values
 * takes one compact cell rather than two full-width inputs.
 */
export default function DateRangeField({
  label,
  startDate,
  endDate,
  disabled = false,
  rightElement,
  onStartDateChange,
  onEndDateChange,
}: DateRangeFieldProps) {
  return (
    <div className="w-full">
      <FieldLabel>{label}</FieldLabel>

      <div className="mt-1.5 sm:mt-2 flex items-center gap-2">
        <div className="flex-1 min-w-0 flex items-center justify-between gap-1 sm:gap-2 bg-black/5 dark:bg-white/10 px-2.5 sm:px-3 rounded-xl h-10 w-full">
          <input
            type="date"
            aria-label={`${label} start`}
            value={startDate}
            max={endDate || undefined}
            disabled={disabled}
            onChange={(event) => onStartDateChange(event.target.value)}
            className={DATE_INPUT_CLASSES}
          />

          <span
            aria-hidden="true"
            className="text-text-secondary/50 dark:text-dark-text-secondary/50 text-[11px] sm:text-xs font-normal select-none px-0.5 shrink-0"
          >
            –
          </span>

          <input
            type="date"
            aria-label={`${label} end`}
            value={endDate}
            min={startDate || undefined}
            disabled={disabled}
            onChange={(event) => onEndDateChange(event.target.value)}
            className={DATE_INPUT_CLASSES}
          />
        </div>

        {rightElement}
      </div>
    </div>
  );
}
