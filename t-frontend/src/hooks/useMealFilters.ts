"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { daysBefore, todayAsInputValue } from "@/lib/formatDate";
import type { FoodEntryQuery, MealType } from "@/types/nutrition";

/** Matches the API's own fallback, so the list opens on the range it would default to. */
const DEFAULT_RANGE_DAYS = 7;
const PAGE_SIZE = 10;
/**
 * Typing a date with the keyboard produces a valid date after every segment, so
 * date edits wait for a pause before they reach the server.
 */
const DATE_EDIT_DEBOUNCE_MS = 400;

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

/** The filters the list is actually showing, which can trail the inputs during a date edit. */
interface AppliedSelection {
  values: MealFilterValues;
  page: number;
}

interface UseMealFiltersResult {
  /** What the inputs show right now. */
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
 *
 * Date edits are debounced; meal type, reset and paging apply at once, since
 * each is a single deliberate click.
 */
export function useMealFilters(): UseMealFiltersResult {
  // Lazy defaults are safe here despite depending on the clock: every page using
  // this hook sits behind ProtectedRoute, which renders nothing but a spinner
  // until auth resolves on the client, so this never runs during hydration.
  const [values, setValues] = useState<MealFilterValues>(createDefaultFilters);
  const [applied, setApplied] = useState<AppliedSelection>(() => ({ values, page: 1 }));

  useEffect(() => {
    const timer = setTimeout(() => {
      // Any change to what is being filtered invalidates the page the user is on.
      setApplied((current) => (current.values === values ? current : { values, page: 1 }));
    }, DATE_EDIT_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [values]);

  const applyImmediately = useCallback((next: MealFilterValues) => {
    setValues(next);
    setApplied({ values: next, page: 1 });
  }, []);

  const setPage = useCallback((page: number) => {
    setApplied((current) => ({ ...current, page }));
  }, []);

  const setStartDate = useCallback(
    (startDate: string) => {
      setValues({
        ...values,
        startDate,
        endDate: startDate && values.endDate && startDate > values.endDate ? startDate : values.endDate,
      });
    },
    [values]
  );

  const setEndDate = useCallback(
    (endDate: string) => {
      setValues({
        ...values,
        endDate,
        startDate:
          endDate && values.startDate && endDate < values.startDate ? endDate : values.startDate,
      });
    },
    [values]
  );

  const setMealType = useCallback(
    (mealType: MealType | "") => applyImmediately({ ...values, mealType }),
    [applyImmediately, values]
  );

  const reset = useCallback(() => applyImmediately(createDefaultFilters()), [applyImmediately]);

  const query = useMemo<FoodEntryQuery>(
    () => ({
      startDate: applied.values.startDate || undefined,
      endDate: applied.values.endDate || undefined,
      mealType: applied.values.mealType || undefined,
      page: applied.page,
      limit: PAGE_SIZE,
    }),
    [applied]
  );

  const isDefault = useMemo(() => {
    const defaults = createDefaultFilters();
    return (
      values.startDate === defaults.startDate &&
      values.endDate === defaults.endDate &&
      values.mealType === defaults.mealType
    );
  }, [values]);

  return { values, query, page: applied.page, isDefault, setStartDate, setEndDate, setMealType, setPage, reset };
}
