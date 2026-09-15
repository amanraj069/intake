import { toDateInputValue } from "@/lib/formatDate";
import type {
  FoodEntry,
  FoodEntryInput,
  FoodEntrySource,
  FoodItemInput,
  FoodItemUnit,
  MealType,
} from "@/types/nutrition";
import {
  LIMITS,
  collectAmountErrors,
  hasErrors,
  toAmount,
  type AmountRule,
  type FieldErrors,
} from "./amount";
import {
  microsToRows,
  nextFormRowId,
  validateMicronutrientRows,
  type MicronutrientRow,
} from "./micronutrientRows";

export type { MicronutrientRow } from "./micronutrientRows";

/** The fields that belong to the entry rather than to one item. */
export interface MealDetails {
  mealType: MealType;
  date: string;
  time?: string;
  /** Only edited for a meal of several dishes; a single food is named by the food itself. */
  name: string;
}

/** A single food is one item named by itself; a meal has its own name and any number of dishes. */
export type EntryMode = "single" | "multiple";

export interface MealFormState {
  details: MealDetails;
  items: FoodItemFormValues[];
  mode: EntryMode;
}

/** One item as the form edits it: every number is the raw text of its input. */
export interface FoodItemFormValues {
  id: string;
  name: string;
  quantity: string;
  unit: FoodItemUnit;
  calories: string;
  proteinG: string;
  carbG: string;
  fatG: string;
  microRows: MicronutrientRow[];
}

export type ItemAmountField = "quantity" | "calories" | "proteinG" | "carbG" | "fatG";
export type ItemFieldName = ItemAmountField | "name";

export interface ItemFormErrors {
  fields: FieldErrors<ItemFieldName>;
  /** Keyed by micronutrient row id. */
  micros: Record<string, string>;
  microsSummary?: string;
}

type MealFieldName = "date" | "time" | "items" | "name";

export interface MealFormErrors {
  fields: FieldErrors<MealFieldName>;
  /** Keyed by item id, present only for items with a problem. */
  items: Record<string, ItemFormErrors>;
}

export const NO_MEAL_FORM_ERRORS: MealFormErrors = { fields: {}, items: {} };

/** Keyed by field so the form can look a rule up without a fallible array search. */
export const ITEM_AMOUNT_RULES: Record<ItemAmountField, AmountRule<ItemAmountField>> = {
  quantity: { field: "quantity", label: "Quantity", max: LIMITS.quantity, required: true },
  calories: { field: "calories", label: "Calories", max: LIMITS.calories, required: true },
  proteinG: { field: "proteinG", label: "Protein", max: LIMITS.macroGrams, required: true },
  carbG: { field: "carbG", label: "Carbs", max: LIMITS.macroGrams, required: true },
  fatG: { field: "fatG", label: "Fat", max: LIMITS.macroGrams, required: true },
};

export function createEmptyItem(): FoodItemFormValues {
  return {
    id: nextFormRowId("item"),
    name: "",
    quantity: "",
    unit: "g",
    calories: "",
    proteinG: "",
    carbG: "",
    fatG: "",
    microRows: [],
  };
}

/** Fills an item's fields from a saved or drafted item. */
export function itemToFormValues(item: FoodItemInput): FoodItemFormValues {
  return {
    id: nextFormRowId("item"),
    name: item.name,
    quantity: String(item.quantity),
    unit: item.unit,
    calories: String(item.calories),
    proteinG: String(item.macros.proteinG),
    carbG: String(item.macros.carbG),
    fatG: String(item.macros.fatG),
    microRows: microsToRows(item.micros),
  };
}

/**
 * The mode that shows an entry without hiding anything: several items, or one
 * item whose meal name differs from the item's own, both need the meal view.
 */
export function modeFor(name: string | undefined, items: readonly Pick<FoodItemInput, "name">[]): EntryMode {
  if (items.length > 1) return "multiple";

  const mealName = name?.trim() ?? "";
  return !mealName || mealName === (items[0]?.name.trim() ?? "") ? "single" : "multiple";
}

/** Opens the form on exactly what was stored. */
export function entryToFormState(entry: FoodEntry): MealFormState {
  return {
    details: {
      mealType: entry.mealType,
      date: toDateInputValue(entry.date),
      time: entry.time ?? "",
      name: entry.name,
    },
    items: entry.items.map(itemToFormValues),
    mode: modeFor(entry.name, entry.items),
  };
}

/** A number while typing, for live totals: anything not yet a valid amount counts as zero. */
function readTypedAmount(raw: string): number {
  const value = Number(raw.trim());
  return raw.trim() && Number.isFinite(value) && value >= 0 ? value : 0;
}

/** Items as the totals summary needs them, before the form has been validated. */
export function typedItemNutrition(items: readonly FoodItemFormValues[]) {
  return items.map((item) => ({
    calories: readTypedAmount(item.calories),
    macros: {
      proteinG: readTypedAmount(item.proteinG),
      carbG: readTypedAmount(item.carbG),
      fatG: readTypedAmount(item.fatG),
    },
  }));
}

function validateItem(item: FoodItemFormValues): { errors?: ItemFormErrors; payload?: FoodItemInput } {
  const fields: FieldErrors<ItemFieldName> = collectAmountErrors(Object.values(ITEM_AMOUNT_RULES), item);
  const name = item.name.trim();

  if (!name) fields.name = "Item name is required";
  else if (name.length > LIMITS.itemNameLength) fields.name = "Item name is too long";

  const micros = validateMicronutrientRows(item.microRows);
  if (hasErrors(fields) || hasErrors(micros.errors) || micros.summary) {
    return { errors: { fields, micros: micros.errors, microsSummary: micros.summary } };
  }

  return {
    payload: {
      name,
      quantity: toAmount(item.quantity),
      unit: item.unit,
      calories: toAmount(item.calories),
      macros: {
        proteinG: toAmount(item.proteinG),
        carbG: toAmount(item.carbG),
        fatG: toAmount(item.fatG),
      },
      micros: micros.micros,
    },
  };
}

function findDetailErrors(details: MealDetails, itemCount: number, mode: EntryMode): FieldErrors<MealFieldName> {
  const errors: FieldErrors<MealFieldName> = {};

  if (!details.date.trim()) errors.date = "Date is required";
  else if (Number.isNaN(Date.parse(details.date))) errors.date = "Enter a valid date";

  if (details.time && details.time.trim()) {
    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!timeRegex.test(details.time.trim())) {
      errors.time = "Enter time in HH:mm format";
    }
  }

  if (mode === "multiple" && details.name.trim().length > LIMITS.itemNameLength) errors.name = "Meal name is too long";

  if (itemCount === 0) errors.items = "Add at least one item";
  else if (mode === "single" && itemCount > 1) errors.items = "A single food has one item. Switch to a meal with dishes.";
  else if (itemCount > LIMITS.itemsPerEntry) errors.items = `At most ${LIMITS.itemsPerEntry} items are allowed`;

  return errors;
}

export interface MealValidationResult {
  errors: MealFormErrors;
  payload?: FoodEntryInput;
}

export function validateMealForm(
  { details, items, mode }: MealFormState,
  source: FoodEntrySource = "manual"
): MealValidationResult {
  const errors: MealFormErrors = { fields: findDetailErrors(details, items.length, mode), items: {} };
  const payloadItems: FoodItemInput[] = [];

  for (const item of items) {
    const result = validateItem(item);
    if (result.errors) errors.items[item.id] = result.errors;
    if (result.payload) payloadItems.push(result.payload);
  }

  if (hasErrors(errors.fields) || hasErrors(errors.items)) return { errors };

  return {
    errors,
    payload: {
      mealType: details.mealType,
      date: details.date,
      time: details.time?.trim() || undefined,
      // A single food is named by itself; a blank meal name lets the server name it after its dishes.
      name: mode === "single" ? payloadItems[0].name : details.name.trim() || undefined,
      items: payloadItems,
      source,
    },
  };
}
