"use client";

import { CheckIcon } from "@/components/icons";
import { formatLongDate } from "@/lib/formatDate";
import type { MealType } from "@/types/nutrition";

interface DraftReviewConfirmationProps {
  mealType: MealType;
  date: string;
  confirmed: boolean;
  error?: string;
  disabled: boolean;
  onChange: (confirmed: boolean) => void;
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * The last step before an AI draft is saved. It restates the two choices the
 * photo could not make (meal and date), so a wrong default is caught here.
 */
export default function DraftReviewConfirmation({
  mealType,
  date,
  confirmed,
  error,
  disabled,
  onChange,
}: DraftReviewConfirmationProps) {
  const dayLabel = date && !Number.isNaN(Date.parse(date)) ? formatLongDate(date) : "the selected date";

  return (
    <div className="space-y-2">
      <label
        className={`flex cursor-pointer items-start gap-3 sm:gap-3.5 rounded-2xl border p-4 sm:p-5 shadow-xs transition-all duration-150 ${
          error
            ? "border-error dark:border-error-dark bg-white dark:bg-dark-bg-card"
            : confirmed
            ? "border-accent/30 dark:border-accent-dark/40 bg-white dark:bg-dark-bg-card hover:border-accent/50"
            : "border-black/5 dark:border-white/10 bg-white dark:bg-dark-bg-card hover:border-black/15 dark:hover:border-white/20"
        }`}
      >
        <input
          type="checkbox"
          checked={confirmed}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border transition-all duration-150 peer-focus-visible:ring-2 peer-focus-visible:ring-accent ${
            confirmed
              ? "border-accent bg-accent text-white dark:border-accent-dark dark:bg-accent-dark shadow-xs"
              : "border-black/20 dark:border-white/20 bg-black/[0.03] dark:bg-white/[0.05]"
          }`}
        >
          {confirmed && <CheckIcon className="h-3.5 w-3.5" />}
        </span>
        <span className="text-sm text-text-primary dark:text-dark-text">
          <span className="font-semibold text-text-primary dark:text-dark-text">
            I have reviewed the details filled in from my photo.
          </span>
          <span className="mt-1 block text-xs sm:text-[13px] font-light text-text-secondary dark:text-dark-text-secondary leading-relaxed">
            Logging as {capitalise(mealType)} on {dayLabel}, with the items, amounts, calories, macros
            and micronutrients above.
          </span>
        </span>
      </label>
      {error && (
        <p role="alert" className="text-xs text-error dark:text-error-dark">
          {error}
        </p>
      )}
    </div>
  );
}
