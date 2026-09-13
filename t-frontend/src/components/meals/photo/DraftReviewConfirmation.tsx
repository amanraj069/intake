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
        className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 sm:p-5 transition-colors duration-150 ${
          error
            ? "border-error dark:border-error-dark"
            : "border-input-border dark:border-dark-input-border hover:border-text-primary/40 dark:hover:border-white/30"
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
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors duration-150 peer-focus-visible:ring-2 peer-focus-visible:ring-accent ${
            confirmed
              ? "border-accent bg-accent text-white dark:border-accent-dark dark:bg-accent-dark"
              : "border-input-border dark:border-dark-input-border"
          }`}
        >
          {confirmed && <CheckIcon className="h-3.5 w-3.5" />}
        </span>
        <span className="text-sm text-text-primary dark:text-dark-text">
          <span className="font-semibold">I have reviewed the details filled in from my photo.</span>
          <span className="mt-1 block font-light text-text-secondary dark:text-dark-text-secondary">
            Logging as {capitalise(mealType)} on {dayLabel}, with the food name, portion, calories, macros
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
