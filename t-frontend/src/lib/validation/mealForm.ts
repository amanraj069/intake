import { toDateInputValue } from "@/lib/formatDate";
import type { FoodEntry, FoodEntryInput, MealType, Micronutrients } from "@/types/nutrition";
import {
  LIMITS,
  collectAmountErrors,
  findAmountError,
  hasErrors,
  toAmount,
  type AmountRule,
  type FieldErrors,
} from "./amount";

export interface MicronutrientRow {
  id: string;
  name: string;
  amount: string;
  unit: string;
}

export interface MealFormValues {
  mealType: MealType;
  foodName: string;
  quantity: string;
  servingSize: string;
  calories: string;
  proteinG: string;
  carbG: string;
  fatG: string;
  date: string;
}

export type MealFieldName = keyof MealFormValues;
export type MealAmountField = "quantity" | "servingSize" | "calories" | "proteinG" | "carbG" | "fatG";

export interface MealFormErrors {
  fields: FieldErrors<MealFieldName>;
  /** Keyed by micronutrient row id so each row can show its own message. */
  micros: Record<string, string>;
  /** A problem with the micronutrient list as a whole, not with one row. */
  microsSummary?: string;
}

/** Keyed by field so the form can look a rule up without a fallible array search. */
export const MEAL_AMOUNT_RULES: Record<MealAmountField, AmountRule<MealAmountField>> = {
  quantity: { field: "quantity", label: "Quantity", max: LIMITS.quantity, required: true },
  servingSize: { field: "servingSize", label: "Amount (in grams)", max: LIMITS.quantity, required: true },
  calories: { field: "calories", label: "Calories", max: LIMITS.calories, required: true },
  proteinG: { field: "proteinG", label: "Protein", max: LIMITS.macroGrams, required: true },
  carbG: { field: "carbG", label: "Carbs", max: LIMITS.macroGrams, required: true },
  fatG: { field: "fatG", label: "Fat", max: LIMITS.macroGrams, required: true },
};

/** Fills the form from a saved entry, so editing opens on exactly what was stored. */
export function entryToFormValues(entry: FoodEntry): MealFormValues {
  let quantity = String(entry.quantity);
  let servingSize = "";

  const unitStr = (entry.quantityUnit || "").trim();
  const numericMatch = unitStr.match(/^(\d+(?:\.\d+)?)/);

  if (numericMatch) {
    servingSize = numericMatch[1];
  } else if (unitStr.toLowerCase() === "g" && entry.quantity > 5) {
    servingSize = String(entry.quantity);
    quantity = "1";
  } else {
    servingSize = "100";
  }

  return {
    mealType: entry.mealType,
    foodName: entry.foodName,
    quantity,
    servingSize,
    calories: String(entry.calories),
    proteinG: String(entry.macros.proteinG),
    carbG: String(entry.macros.carbG),
    fatG: String(entry.macros.fatG),
    date: toDateInputValue(entry.date),
  };
}

/** A row left completely blank is treated as "not filled in yet", not as an error. */
function isBlankRow(row: MicronutrientRow): boolean {
  return !row.name.trim() && !row.amount.trim();
}

function findMicronutrientRowError(
  row: MicronutrientRow,
  seenNames: Set<string>
): string | undefined {
  const name = row.name.trim();

  if (!name) return "Nutrient name is required";
  if (name.length > LIMITS.nutrientNameLength) return "Nutrient name is too long";
  if (seenNames.has(name.toLowerCase())) return "Duplicate nutrient name";

  return findAmountError(row.amount, {
    label: "Amount (in mg)",
    max: LIMITS.microAmount,
    required: true,
  });
}

function validateMicronutrients(rows: readonly MicronutrientRow[]): {
  errors: Record<string, string>;
  micros: Micronutrients;
} {
  const errors: Record<string, string> = {};
  const micros: Micronutrients = {};
  const seenNames = new Set<string>();

  for (const row of rows) {
    if (isBlankRow(row)) continue;

    const error = findMicronutrientRowError(row, seenNames);
    if (error) {
      errors[row.id] = error;
      continue;
    }

    const name = row.name.trim();
    seenNames.add(name.toLowerCase());
    micros[name] = { amount: toAmount(row.amount), unit: row.unit || "mg" };
  }

  return { errors, micros };
}

function findTextFieldErrors(values: MealFormValues): FieldErrors<MealFieldName> {
  const errors: FieldErrors<MealFieldName> = {};
  const foodName = values.foodName.trim();

  if (!foodName) errors.foodName = "Food name is required";
  else if (foodName.length > LIMITS.foodNameLength) errors.foodName = "Food name is too long";

  if (!values.date.trim()) errors.date = "Date is required";
  else if (Number.isNaN(Date.parse(values.date))) errors.date = "Enter a valid date";

  return errors;
}

export interface MealValidationResult {
  errors: MealFormErrors;
  payload?: FoodEntryInput;
}

export function validateMealForm(
  values: MealFormValues,
  rows: readonly MicronutrientRow[]
): MealValidationResult {
  const fields = {
    ...collectAmountErrors(Object.values(MEAL_AMOUNT_RULES), values),
    ...findTextFieldErrors(values),
  };
  const { errors: microErrors, micros } = validateMicronutrients(rows);

  const filledRowCount = rows.filter((row) => !isBlankRow(row)).length;
  const microsSummary =
    filledRowCount > LIMITS.micronutrientRows
      ? `At most ${LIMITS.micronutrientRows} micronutrients are allowed`
      : undefined;

  const errors: MealFormErrors = { fields, micros: microErrors, microsSummary };

  if (hasErrors(fields) || hasErrors(microErrors) || microsSummary) {
    return { errors };
  }

  const servingAmount = toAmount(values.servingSize);
  const quantityUnit = `${servingAmount}g`;

  return {
    errors,
    payload: {
      mealType: values.mealType,
      foodName: values.foodName.trim(),
      quantity: toAmount(values.quantity),
      quantityUnit,
      calories: toAmount(values.calories),
      macros: {
        proteinG: toAmount(values.proteinG),
        carbG: toAmount(values.carbG),
        fatG: toAmount(values.fatG),
      },
      micros,
      date: values.date,
      source: "manual",
    },
  };
}
