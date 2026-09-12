"use client";

import Input from "@/components/ui/Input";
import Select, { type SelectOption } from "@/components/ui/Select";
import type { MealFilterValues } from "@/hooks/useMealFilters";
import { MEAL_TYPES, type MealType } from "@/types/nutrition";

const MEAL_TYPE_OPTIONS: readonly SelectOption[] = [
  { value: "", label: "All meals" },
  ...MEAL_TYPES.map((mealType) => ({ value: mealType, label: mealType.toUpperCase() })),
];

const RESET_BUTTON_CLASSES = [
  "w-full lg:w-auto px-6 py-3 border border-input-border dark:border-dark-input-border",
  "text-[10px] font-bold uppercase tracking-[0.2em]",
  "text-text-secondary dark:text-dark-text-secondary",
  "transition-colors duration-100 cursor-pointer",
  "hover:bg-text-primary hover:text-bg-primary hover:border-text-primary",
  "dark:hover:bg-dark-text dark:hover:text-dark-bg dark:hover:border-dark-text",
  "disabled:opacity-40 disabled:cursor-not-allowed",
  "disabled:hover:bg-transparent disabled:hover:text-text-secondary",
  "disabled:hover:border-input-border dark:disabled:hover:border-dark-input-border",
].join(" ");

interface MealFiltersProps {
  values: MealFilterValues;
  disabled: boolean;
  /** True when nothing has been narrowed, which disables the reset control. */
  isDefault: boolean;
  onStartDateChange: (startDate: string) => void;
  onEndDateChange: (endDate: string) => void;
  onMealTypeChange: (mealType: MealType | "") => void;
  onReset: () => void;
}

/** Date range and meal type controls for the entries list. */
export default function MealFilters({
  values,
  disabled,
  isDefault,
  onStartDateChange,
  onEndDateChange,
  onMealTypeChange,
  onReset,
}: MealFiltersProps) {
  return (
    <section
      aria-label="Filter entries"
      className="border border-black/10 dark:border-white/10 p-6 sm:p-8"
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
        <Input
          id="startDate"
          label="From"
          type="date"
          max={values.endDate || undefined}
          value={values.startDate}
          disabled={disabled}
          onChange={(event) => onStartDateChange(event.target.value)}
        />
        <Input
          id="endDate"
          label="To"
          type="date"
          min={values.startDate || undefined}
          value={values.endDate}
          disabled={disabled}
          onChange={(event) => onEndDateChange(event.target.value)}
        />
        <Select
          id="mealType"
          label="Meal type"
          options={MEAL_TYPE_OPTIONS}
          value={values.mealType}
          disabled={disabled}
          onChange={(event) => onMealTypeChange(event.target.value as MealType | "")}
        />

        <button
          type="button"
          onClick={onReset}
          disabled={disabled || isDefault}
          className={RESET_BUTTON_CLASSES}
        >
          Reset
        </button>
      </div>
    </section>
  );
}
