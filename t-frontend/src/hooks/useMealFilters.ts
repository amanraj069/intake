"use client";

import { useCallback, useMemo, useState } from "react";
import { daysBefore, todayAsInputValue } from "@/lib/formatDate";
import type { FoodEntryQuery, MealType } from "@/types/nutrition";

/** Matches the API's own fallback, so the list opens on the range it would default to. */
const DEFAULT_RANGE_DAYS = 7;
const PAGE_SIZE = 10;

export interface MealFilterValues {
  startDate: string;
  endDate: string;
  /** Empty string means "any meal type", the value a native select needs for its blank option. */
  mealType: MealType | "";
}

function createDefaultFilters(): MealFilterValues {
  const endDate = todayAsInputValue();
  return {
    startDate: daysBefore(endDate, DEFAULT_RANGE_DAYS - 1),
    endDate,
    mealType: "",
  };
}

interface UseMealFiltersResult {
  values: MealFilterValues;
  /** The filters plus the current page, ready to hand to the list endpoint. */
  query: FoodEntryQuery;
  page: number;
  isDefault: boolean;
  setStartDate: (startDate: string) => void;
  setEndDate: (endDate: string) => void;
  setMealType: (mealType: MealType | "") => void;
  setPage: (page: number) => void;
  reset: () => void;
}

/**
 * Owns the meals list's filter and page state.
 *
 * The two date bounds clamp each other: picking a start after the current end
 * drags the end along with it, so an impossible range is never requested and the
 * user never has to read an error to fix it.
 */
export function useMealFilters(): UseMealFiltersResult {
  // Lazy defaults are safe here despite depending on the clock: every page using
  // this hook sits behind ProtectedRoute, which renders nothing but a spinner
  // until auth resolves on the client, so this never runs during hydration.
  const [values, setValues] = useState<MealFilterValues>(createDefaultFilters);
  const [page, setPage] = useState(1);

  // Any change to what is being filtered invalidates the page the user is on.
  const applyFilters = useCallback((next: MealFilterValues) => {
    setValues(next);
    setPage(1);
  }, []);

  const setStartDate = useCallback(
    (startDate: string) => {
      applyFilters({
        ...values,
        startDate,
        endDate: startDate && values.endDate && startDate > values.endDate ? startDate : values.endDate,
      });
    },
    [applyFilters, values]
  );

  const setEndDate = useCallback(
    (endDate: string) => {
      applyFilters({
        ...values,
        endDate,
        startDate:
          endDate && values.startDate && endDate < values.startDate ? endDate : values.startDate,
      });
    },
    [applyFilters, values]
  );

  const setMealType = useCallback(
    (mealType: MealType | "") => applyFilters({ ...values, mealType }),
    [applyFilters, values]
  );

  const reset = useCallback(() => applyFilters(createDefaultFilters()), [applyFilters]);

  const query = useMemo<FoodEntryQuery>(
    () => ({
      startDate: values.startDate || undefined,
      endDate: values.endDate || undefined,
      mealType: values.mealType || undefined,
      page,
      limit: PAGE_SIZE,
    }),
    [values, page]
  );

  const isDefault = useMemo(() => {
    const defaults = createDefaultFilters();
    return (
      values.startDate === defaults.startDate &&
      values.endDate === defaults.endDate &&
      values.mealType === defaults.mealType
    );
  }, [values]);

  return { values, query, page, isDefault, setStartDate, setEndDate, setMealType, setPage, reset };
}
