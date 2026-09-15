"use client";

import DateRangeField from "@/components/ui/DateRangeField";
import FieldLabel from "@/components/ui/FieldLabel";
import OptionPills, { type PillOption } from "@/components/ui/OptionPills";
import type { MealFilterValues } from "@/hooks/useMealFilters";
import { MEAL_TYPES, type MealType } from "@/types/nutrition";

type MealTypeFilter = MealType | "";

const MEAL_TYPE_OPTIONS: readonly PillOption<MealTypeFilter>[] = [
  { value: "", label: "All" },
  ...MEAL_TYPES.map((mealType) => ({
    value: mealType,
    label: mealType.charAt(0).toUpperCase() + mealType.slice(1),
  })),
];

interface MealFiltersProps {
  values: MealFilterValues;
  /** True when nothing has been narrowed, which disables the reset control. */
  isDefault: boolean;
  onStartDateChange: (startDate: string) => void;
  onEndDateChange: (endDate: string) => void;
  onMealTypeChange: (mealType: MealTypeFilter) => void;
  onReset: () => void;
}

/** Date range and meal type controls, drawn as one compact, pixel-aligned toolbar. */
export default function MealFilters({
  values,
  isDefault,
  onStartDateChange,
  onEndDateChange,
  onMealTypeChange,
  onReset,
}: MealFiltersProps) {
  return (
    <section
      aria-label="Filter entries"
      className="bg-bg-card dark:bg-dark-bg-card rounded-2xl shadow-sm p-3 sm:p-4"
    >
      <div className="flex flex-col md:flex-row items-stretch md:items-end gap-2.5 sm:gap-4 w-full">
        <div className="flex-1 min-w-0 w-full">
          <FieldLabel>Meal</FieldLabel>
          <div className="mt-1.5 sm:mt-2 w-full">
            <OptionPills
              label="Meal type"
              options={MEAL_TYPE_OPTIONS}
              value={values.mealType}
              fullWidth
              onChange={onMealTypeChange}
            />
          </div>
        </div>

        <div className="w-full md:w-[280px] lg:w-[320px] shrink-0">
          <DateRangeField
            label="Period"
            startDate={values.startDate}
            endDate={values.endDate}
            onStartDateChange={onStartDateChange}
            onEndDateChange={onEndDateChange}
            rightElement={
              <button
                type="button"
                onClick={onReset}
                disabled={isDefault}
                className="md:hidden h-10 px-3.5 flex items-center justify-center gap-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-white/5 text-red-600 dark:text-red-400 hover:bg-black/[0.04] dark:hover:bg-white/10 border border-input-border dark:border-dark-input-border transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                title="Reset filters"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18"></path>
                  <path d="m6 6 12 12"></path>
                </svg>
                <span>Reset</span>
              </button>
            }
          />
        </div>

        <button
          type="button"
          onClick={onReset}
          disabled={isDefault}
          className="hidden md:flex h-10 px-4 items-center justify-center gap-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-white/5 text-red-600 dark:text-red-400 hover:bg-black/[0.04] dark:hover:bg-white/10 border border-input-border dark:border-dark-input-border transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
          title="Reset filters"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6 6 18"></path>
            <path d="m6 6 12 12"></path>
          </svg>
          <span>Reset</span>
        </button>
      </div>
    </section>
  );
}
